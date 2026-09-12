/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { showNotification } from "@api/Notifications";
import { insertTextIntoChatInputBox, openPrivateChannel } from "@utils/discord";
import definePlugin from "@utils/types";
import type { User } from "@vencord/discord-types";
import { Menu, UserStore } from "@webpack/common";

import { settings } from "./settings";
import style from "./styles.css?managed";
import { createHomie, Homie, INTERACTION_KINDS, INTERACTION_LABELS, InteractionKind, normalizeHomie } from "./types";

let reminderTimer: number | undefined;

function getHomies(): Homie[] {
    return (settings.store.homies ?? []).map(normalizeHomie);
}

function saveHomies(homies: Homie[]) {
    settings.store.homies = homies;
}

function getHomieName(homie: Homie) {
    const user = UserStore.getUser(homie.id);
    return homie.nickname.trim() || user?.globalName || user?.username || "homie";
}

function getTemplateSource(kind: InteractionKind) {
    switch (kind) {
        case "friday": return settings.store.fridayMessages;
        case "kind": return settings.store.kindMessages;
        case "flirty": return settings.store.flirtyMessages;
    }
}

function makeMessage(homie: Homie, kind: InteractionKind) {
    const templates = getTemplateSource(kind)
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean);
    const template = templates[Math.floor(Math.random() * templates.length)] ?? "Hi, {name}! 💛";
    const name = getHomieName(homie);
    return template.replaceAll("{name}", name).replaceAll("{id}", homie.id);
}

function prepareDraft(homie: Homie, kind: InteractionKind, message = makeMessage(homie, kind)) {
    window.focus();
    openPrivateChannel(homie.id);

    // The channel transition happens asynchronously; wait for Discord's composer to mount.
    window.setTimeout(() => insertTextIntoChatInputBox(message), 500);
}

function showSuggestion(homie: Homie, kind: InteractionKind) {
    const user = UserStore.getUser(homie.id);
    const message = makeMessage(homie, kind);

    void showNotification({
        title: `Pet Your Homie · ${getHomieName(homie)}`,
        body: `${INTERACTION_LABELS[kind]} — click to open the DM.\n${message}`,
        icon: user?.getAvatarURL?.(),
        color: "var(--brand-500)",
        onClick: () => prepareDraft(homie, kind, message)
    });
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

    const now = new Date();
    const today = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const windowMinutes = Number(settings.store.reminderWindow) || 30;
    const dateKey = localDateKey(now);
    const ledger = readLedger();
    let changed = false;

    for (const homie of getHomies()) {
        for (const kind of INTERACTION_KINDS) {
            const schedule = homie.schedules[kind];
            if (!schedule.enabled || !schedule.weekdays.includes(today)) continue;

            const [hour, minute] = schedule.time.split(":").map(Number);
            const targetMinutes = hour * 60 + minute;
            const deliveryKey = `${dateKey}:${homie.id}:${kind}`;
            const isDue = currentMinutes >= targetMinutes && currentMinutes <= targetMinutes + windowMinutes;

            if (!isDue || ledger[deliveryKey]) continue;

            ledger[deliveryKey] = Date.now();
            changed = true;
            showSuggestion(homie, kind);
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

    const homie = getHomies().find(item => item.id === user.id);

    children.push(
        <Menu.MenuItem id="vc-pet-your-homie" label="Pet Your Homie 💛">
            {homie ? (
                <>
                    {INTERACTION_KINDS.map(kind => (
                        <Menu.MenuItem
                            action={() => prepareDraft(homie, kind)}
                            id={`vc-pyh-${kind}`}
                            key={kind}
                            label={INTERACTION_LABELS[kind]}
                        />
                    ))}
                    <Menu.MenuSeparator />
                    <Menu.MenuItem
                        action={() => saveHomies(getHomies().filter(item => item.id !== user.id))}
                        color="danger"
                        id="vc-pyh-remove"
                        label="Remove from homies"
                    />
                </>
            ) : (
                <Menu.MenuItem
                    action={() => saveHomies([...getHomies(), createHomie(user.id)])}
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
    description: "A homie list with kind or flirty interaction drafts and individually scheduled suggestions.",
    authors: [{ name: "TheRealMagyar", id: 462651633709613056n }],
    tags: ["Friends", "Fun", "Chat"],
    settings,
    managedStyle: style,
    contextMenus: {
        "user-context": UserContextMenuPatch
    },

    start() {
        window.setTimeout(checkReminders, 2_000);
        reminderTimer = window.setInterval(checkReminders, 30_000);
    },

    stop() {
        if (reminderTimer !== undefined) window.clearInterval(reminderTimer);
        reminderTimer = undefined;
    }
});
