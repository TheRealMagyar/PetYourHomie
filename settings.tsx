/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { defineDefault, OptionType } from "@utils/types";
import { Forms, TextInput, UserStore, useState } from "@webpack/common";

import { createHomie, Homie, INTERACTION_KINDS, INTERACTION_LABELS, InteractionKind, normalizeHomie, WEEKDAYS } from "./types";

const USER_ID_RE = /^\d{17,20}$/;

function displayName(homie: Homie) {
    const user = UserStore.getUser(homie.id);
    return homie.nickname.trim() || user?.globalName || user?.username || homie.id;
}

function HomieManager({ setValue }: { setValue(value: Homie[]): void; }) {
    const { homies = [] } = settings.use(["homies"]);
    const normalized = homies.map(normalizeHomie);
    const [userId, setUserId] = useState("");
    const [nickname, setNickname] = useState("");
    const cleanId = userId.trim();
    const duplicate = normalized.some(homie => homie.id === cleanId);
    const idIsValid = USER_ID_RE.test(cleanId);

    const updateHomie = (id: string, transform: (homie: Homie) => Homie) => {
        setValue(normalized.map(homie => homie.id === id ? transform(homie) : homie));
    };

    const updateSchedule = (id: string, kind: InteractionKind, patch: Partial<Homie["schedules"][InteractionKind]>) => {
        updateHomie(id, homie => ({
            ...homie,
            schedules: {
                ...homie.schedules,
                [kind]: { ...homie.schedules[kind], ...patch }
            }
        }));
    };

    const addHomie = () => {
        if (!idIsValid || duplicate) return;
        setValue([...normalized, createHomie(cleanId, nickname.trim())]);
        setUserId("");
        setNickname("");
    };

    return (
        <div className="pyh-settings">
            <Forms.FormTitle tag="h3">Your homies</Forms.FormTitle>
            <Forms.FormText className="pyh-help">
                You can also add someone by right-clicking them and opening Pet Your Homie. To get an ID, enable Discord Developer Mode and choose “Copy User ID”.
            </Forms.FormText>

            <div className="pyh-add-row">
                <TextInput
                    value={userId}
                    onChange={setUserId}
                    placeholder="Discord user ID"
                />
                <TextInput
                    value={nickname}
                    onChange={setNickname}
                    placeholder="Nickname (optional)"
                />
                <button
                    className="pyh-button pyh-button-primary"
                    disabled={!idIsValid || duplicate}
                    onClick={addHomie}
                    type="button"
                >
                    Add homie
                </button>
            </div>
            {cleanId && !idIsValid && <div className="pyh-error">A Discord ID must contain 17–20 digits.</div>}
            {duplicate && <div className="pyh-error">This person is already one of your homies.</div>}

            {normalized.length === 0 && (
                <div className="pyh-empty">No homies yet. Add someone here or from their right-click menu.</div>
            )}

            {normalized.map(homie => (
                <section className="pyh-card" key={homie.id}>
                    <div className="pyh-card-header">
                        <div>
                            <strong>{displayName(homie)}</strong>
                            <div className="pyh-id">{homie.id}</div>
                        </div>
                        <button
                            className="pyh-button pyh-button-danger"
                            onClick={() => setValue(normalized.filter(item => item.id !== homie.id))}
                            type="button"
                        >
                            Remove
                        </button>
                    </div>

                    <label className="pyh-field">
                        <span>Nickname / greeting name</span>
                        <TextInput
                            value={homie.nickname}
                            onChange={value => updateHomie(homie.id, current => ({ ...current, nickname: value }))}
                            placeholder={UserStore.getUser(homie.id)?.globalName ?? "Optional"}
                        />
                    </label>

                    {INTERACTION_KINDS.map(kind => {
                        const schedule = homie.schedules[kind];
                        return (
                            <div className="pyh-schedule" key={kind}>
                                <label className="pyh-toggle">
                                    <input
                                        checked={schedule.enabled}
                                        onChange={event => updateSchedule(homie.id, kind, { enabled: event.currentTarget.checked })}
                                        type="checkbox"
                                    />
                                    <span>{INTERACTION_LABELS[kind]}</span>
                                </label>

                                <input
                                    aria-label={`${INTERACTION_LABELS[kind]} time`}
                                    className="pyh-time"
                                    disabled={!schedule.enabled}
                                    onChange={event => updateSchedule(homie.id, kind, { time: event.currentTarget.value })}
                                    type="time"
                                    value={schedule.time}
                                />

                                <div className="pyh-days" aria-label={`${INTERACTION_LABELS[kind]} days`}>
                                    {WEEKDAYS.map((day, dayIndex) => {
                                        const active = schedule.weekdays.includes(dayIndex);
                                        return (
                                            <button
                                                aria-pressed={active}
                                                className={`pyh-day${active ? " pyh-day-active" : ""}`}
                                                disabled={!schedule.enabled || kind === "friday"}
                                                key={day}
                                                onClick={() => updateSchedule(homie.id, kind, {
                                                    weekdays: active
                                                        ? schedule.weekdays.filter(value => value !== dayIndex)
                                                        : [...schedule.weekdays, dayIndex].sort()
                                                })}
                                                title={kind === "friday" ? "This interaction is always scheduled for Friday" : undefined}
                                                type="button"
                                            >
                                                {day}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </section>
            ))}
        </div>
    );
}

export const settings = definePluginSettings({
    remindersEnabled: {
        type: OptionType.BOOLEAN,
        description: "Show scheduled Pet Your Homie suggestions",
        default: true
    },
    reminderWindow: {
        type: OptionType.SELECT,
        description: "How long a suggestion remains due after its scheduled time",
        options: [
            { label: "15 minutes", value: 15 },
            { label: "30 minutes", value: 30, default: true },
            { label: "60 minutes", value: 60 },
            { label: "2 hours", value: 120 }
        ]
    },
    fridayMessages: {
        type: OptionType.STRING,
        description: "Happy Femboy Friday templates — one per line; {name} becomes the homie's nickname",
        default: "Happy Femboy Friday, {name}! 💖\nWishing you the happiest Femboy Friday, {name}! ✨",
        multiline: true
    },
    kindMessages: {
        type: OptionType.STRING,
        description: "Kind message templates — one per line; {name} becomes the homie's nickname",
        default: "Just a reminder that you're awesome, {name}. 💛\nI hope you're having a lovely day, {name}! 🫶\nYou crossed my mind, so here's a virtual hug, {name}. 🤗",
        multiline: true
    },
    flirtyMessages: {
        type: OptionType.STRING,
        description: "Flirty / spicy templates — use only with a consenting adult; one per line",
        default: "I miss you, {name}. Come a little closer 😏\nYou're looking dangerously good today, {name}. 🔥",
        multiline: true
    },
    homies: {
        type: OptionType.COMPONENT,
        component: HomieManager,
        default: defineDefault<Homie[]>([])
    },
    suggestionLedger: {
        type: OptionType.STRING,
        description: "Internal duplicate-reminder protection",
        default: "{}",
        hidden: true
    }
});
