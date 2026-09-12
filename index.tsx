/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { showNotification } from "@api/Notifications";
import { insertTextIntoChatInputBox, openPrivateChannel } from "@utils/discord";
import { parseUrl } from "@utils/misc";
import definePlugin from "@utils/types";
import type { Channel, User } from "@vencord/discord-types";
import { ContextMenuApi, Menu, Tooltip, UserStore } from "@webpack/common";
import type { MouseEvent as ReactMouseEvent } from "react";

import { settings } from "./settings";
import style from "./styles.css?managed";
import { createHomie, DEFAULT_EVENTS, Homie, HomieEvent, normalizeEvent, normalizeHomie } from "./types";

let reminderTimer: number | undefined;
const DM_BUTTON_SETTING_KEYS: Array<"events" | "homies"> = ["events", "homies"];

function getEvents(): HomieEvent[] {
    return (settings.store.events ?? []).map(normalizeEvent);
}

function getHomies(events = getEvents()): Homie[] {
    return (settings.store.homies ?? []).map(homie => normalizeHomie(homie, events));
}

function saveHomies(homies: Homie[]) {
    settings.store.homies = homies;
}

function migrateLegacySettings() {
    if (settings.store.schemaVersion >= 1) return;

    const legacyTemplates: Record<string, string> = {
        friday: settings.store.fridayMessages,
        kind: settings.store.kindMessages,
        flirty: settings.store.flirtyMessages
    };
    const events = DEFAULT_EVENTS.map(event => ({
        ...normalizeEvent(event),
        templates: legacyTemplates[event.id] ?? event.templates
    }));

    settings.store.events = events;
    settings.store.homies = getHomies(events);
    settings.store.schemaVersion = 1;
}

function getHomieName(homie: Homie) {
    const user = UserStore.getUser(homie.id);
    return homie.nickname.trim() || user?.globalName || user?.username || "homie";
}

function makeMessage(homie: Homie, event: HomieEvent) {
    const templates = event.templates
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    const template = templates[Math.floor(Math.random() * templates.length)] ?? "Hi, {name}! 💛";
    const name = getHomieName(homie);
    const message = template.replaceAll("{name}", name).replaceAll("{id}", homie.id);
    const tenorGifs = event.tenorGifs
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => {
            const url = parseUrl(line);
            return url?.protocol === "https:"
                && (url.hostname === "tenor.com" || url.hostname.endsWith(".tenor.com"));
        });
    const tenorGif = tenorGifs[Math.floor(Math.random() * tenorGifs.length)];

    return tenorGif ? `${message}\n${tenorGif}` : message;
}

function prepareDraft(homie: Homie, event: HomieEvent, message = makeMessage(homie, event)) {
    window.focus();
    openPrivateChannel(homie.id);

    // The channel transition happens asynchronously; wait for Discord's composer to mount.
    window.setTimeout(() => insertTextIntoChatInputBox(message), 500);
}

function showSuggestion(homie: Homie, event: HomieEvent) {
    const user = UserStore.getUser(homie.id);
    const message = makeMessage(homie, event);

    void showNotification({
        title: `Pet Your Homie · ${getHomieName(homie)}`,
        body: `${event.name} — click to open the DM.\n${message}`,
        icon: user?.getAvatarURL?.(),
        color: "var(--brand-500)",
        onClick: () => prepareDraft(homie, event, message)
    });
}

function HomieEventMenu({ homie, events }: { homie: Homie; events: HomieEvent[]; }) {
    return (
        <Menu.Menu
            aria-label="Pet Your Homie events"
            navId="vc-pyh-dm-events"
            onClose={ContextMenuApi.closeContextMenu}
        >
            {events.map(event => (
                <Menu.MenuItem
                    action={() => prepareDraft(homie, event)}
                    id={`vc-pyh-dm-${event.id}`}
                    key={event.id}
                    label={event.name}
                />
            ))}
        </Menu.Menu>
    );
}

function HeartIcon() {
    return (
        <svg aria-hidden="true" height="16" viewBox="0 0 24 24" width="16">
            <path
                d="M12 21s-7.2-4.35-9.44-8.34C.87 9.65 2.12 5.8 5.64 4.54 8.06 3.67 10.3 4.7 12 6.7c1.7-2 3.94-3.03 6.36-2.16 3.52 1.26 4.77 5.11 3.08 8.12C19.2 16.65 12 21 12 21Z"
                fill="currentColor"
            />
        </svg>
    );
}

interface DmDecoratorProps {
    type: "guild" | "dm";
    user?: User;
    channel?: Channel;
    isOwner: boolean;
}

function HomieDmButton({ type, user }: DmDecoratorProps) {
    const { events: storedEvents = [], homies = [] } = settings.use(DM_BUTTON_SETTING_KEYS);
    if (type !== "dm" || !user) return null;

    const events = storedEvents.map(normalizeEvent);
    const homie = homies.map(item => normalizeHomie(item, events)).find(item => item.id === user.id);
    if (!homie || events.length === 0) return null;

    const openMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        ContextMenuApi.openContextMenu(event, () => <HomieEventMenu events={events} homie={homie} />);
    };

    return (
        <Tooltip text="Pet Your Homie">
            {tooltipProps => (
                <button
                    {...tooltipProps}
                    aria-label={`Pet ${getHomieName(homie)}`}
                    className="pyh-dm-button"
                    onClick={openMenu}
                    type="button"
                >
                    <HeartIcon />
                </button>
            )}
        </Tooltip>
    );
}

function localDateKey(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function readLedger(): Record<string, number> {
    try {
        const value = JSON.parse(settings.store.suggestionLedger);
        return value && typeof value === "object" ? value : {};
    } catch {
        return {};
    }
}

function checkReminders() {
    if (!settings.store.remindersEnabled) return;

    const events = getEvents();
    const now = new Date();
    const today = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const windowMinutes = Number(settings.store.reminderWindow) || 30;
    const dateKey = localDateKey(now);
    const ledger = readLedger();
    let changed = false;

    for (const homie of getHomies(events)) {
        for (const event of events) {
            const schedule = homie.schedules[event.id];
            if (!schedule.enabled || !schedule.weekdays.includes(today)) continue;

            const [hour, minute] = schedule.time.split(":").map(Number);
            const targetMinutes = hour * 60 + minute;
            const deliveryKey = `${dateKey}:${homie.id}:${event.id}`;
            const isDue = currentMinutes >= targetMinutes && currentMinutes <= targetMinutes + windowMinutes;

            if (!isDue || ledger[deliveryKey]) continue;

            ledger[deliveryKey] = Date.now();
            changed = true;
            showSuggestion(homie, event);
        }
    }

    if (changed) {
        const oldestKept = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const pruned = Object.fromEntries(Object.entries(ledger).filter(([, timestamp]) => timestamp >= oldestKept));
        settings.store.suggestionLedger = JSON.stringify(pruned);
    }
}

interface UserContextProps {
    user?: User;
}

const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: UserContextProps) => {
    if (!user || user.id === UserStore.getCurrentUser()?.id || user.bot) return;

    const events = getEvents();
    const homie = getHomies(events).find(item => item.id === user.id);

    children.push(
        <Menu.MenuItem id="vc-pet-your-homie" label="Pet Your Homie 💛">
            {homie ? (
                <>
                    {events.length === 0 ? (
                        <Menu.MenuItem disabled id="vc-pyh-no-events" label="No events configured" />
                    ) : events.map(event => (
                        <Menu.MenuItem
                            action={() => prepareDraft(homie, event)}
                            id={`vc-pyh-${event.id}`}
                            key={event.id}
                            label={event.name}
                        />
                    ))}
                    <Menu.MenuSeparator />
                    <Menu.MenuItem
                        action={() => saveHomies(getHomies(events).filter(item => item.id !== user.id))}
                        color="danger"
                        id="vc-pyh-remove"
                        label="Remove from homies"
                    />
                </>
            ) : (
                <Menu.MenuItem
                    action={() => saveHomies([...getHomies(events), createHomie(user.id, events)])}
                    color="brand"
                    id="vc-pyh-add"
                    label="Make this person a homie"
                />
            )}
        </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "PetYourHomie",
    description: "Create custom homie interactions with editable message templates and individually scheduled suggestions.",
    authors: [{ name: "TheRealMagyar", id: 462651633709613056n }],
    tags: ["Friends", "Fun", "Chat"],
    settings,
    managedStyle: style,
    contextMenus: {
        "user-context": UserContextMenuPatch
    },
    renderMemberListDecorator: HomieDmButton,

    start() {
        migrateLegacySettings();
        window.setTimeout(checkReminders, 2_000);
        reminderTimer = window.setInterval(checkReminders, 30_000);
    },

    stop() {
        if (reminderTimer !== undefined) window.clearInterval(reminderTimer);
        reminderTimer = undefined;
    }
});
