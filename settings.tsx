/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { classes } from "@utils/misc";
import { defineDefault, OptionType } from "@utils/types";
import { Checkbox, Forms, TextArea, TextInput, UserStore, useState } from "@webpack/common";

import { createEvent, createHomie, DEFAULT_EVENTS, Homie, HomieEvent, HomieSchedule, normalizeEvent, normalizeHomie, WEEKDAYS } from "./types";

const USER_ID_RE = /^\d{17,20}$/;
const EVENT_SETTING_KEYS: Array<"events" | "homies"> = ["events", "homies"];
const HOMIE_SETTING_KEYS: Array<"homies" | "events"> = ["homies", "events"];

interface ScheduleEditorProps {
    label: string;
    schedule: HomieSchedule;
    onChange(patch: Partial<HomieSchedule>): void;
}

function ScheduleEditor({ label, schedule, onChange }: ScheduleEditorProps) {
    return (
        <div className="pyh-schedule">
            <Checkbox
                size={20}
                value={schedule.enabled}
                onChange={(_, enabled: boolean) => onChange({ enabled })}
            >
                {label}
            </Checkbox>

            <input
                aria-label={`${label} time`}
                className="pyh-time"
                disabled={!schedule.enabled}
                onChange={event => onChange({ time: event.currentTarget.value })}
                type="time"
                value={schedule.time}
            />

            <div className="pyh-days" aria-label={`${label} days`}>
                {WEEKDAYS.map((day, dayIndex) => {
                    const active = schedule.weekdays.includes(dayIndex);
                    return (
                        <button
                            aria-pressed={active}
                            className={classes("pyh-day", active && "pyh-day-active")}
                            disabled={!schedule.enabled}
                            key={day}
                            onClick={() => onChange({
                                weekdays: active
                                    ? schedule.weekdays.filter(value => value !== dayIndex)
                                    : [...schedule.weekdays, dayIndex].sort()
                            })}
                            type="button"
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

interface EventManagerProps {
    setValue(value: HomieEvent[]): void;
}

function EventManager({ setValue }: EventManagerProps) {
    const { events = [], homies = [] } = settings.use(EVENT_SETTING_KEYS);
    const normalizedEvents = events.map(normalizeEvent);
    const [name, setName] = useState("");
    const [templates, setTemplates] = useState("");
    const [tenorGifs, setTenorGifs] = useState("");

    const updateEvent = (id: string, transform: (event: HomieEvent) => HomieEvent) => {
        setValue(normalizedEvents.map(event => event.id === id ? transform(event) : event));
    };

    const removeEvent = (id: string) => {
        const remainingEvents = normalizedEvents.filter(event => event.id !== id);

        // Keep homie schedules in sync before the debounced component setting is saved.
        settings.store.homies = homies.map(homie => normalizeHomie(homie, remainingEvents));
        setValue(remainingEvents);
    };

    const addEvent = () => {
        if (!name.trim()) return;
        setValue([...normalizedEvents, { ...createEvent(name, templates), tenorGifs: tenorGifs.trim() }]);
        setName("");
        setTemplates("");
        setTenorGifs("");
    };

    return (
        <div className="pyh-settings">
            <Forms.FormTitle tag="h3">Custom events</Forms.FormTitle>
            <Forms.FormText className="pyh-help">
                Events control the actions shown in the user menu and the reminders available for each homie. Every event, including the defaults, can be edited or removed.
            </Forms.FormText>

            {normalizedEvents.length === 0 && (
                <div className="pyh-empty">No events configured. Create one below whenever you are ready.</div>
            )}

            {normalizedEvents.map(event => (
                <section className="pyh-card pyh-event-card" key={event.id}>
                    <div className="pyh-card-header">
                        <TextInput
                            value={event.name}
                            onChange={value => updateEvent(event.id, current => ({ ...current, name: value }))}
                            placeholder="Event name"
                        />
                        <Button
                            size="small"
                            variant="dangerPrimary"
                            onClick={() => removeEvent(event.id)}
                        >
                            Delete event
                        </Button>
                    </div>

                    <label className="pyh-template-field">
                        <span>Message templates</span>
                        <TextArea
                            autosize
                            value={event.templates}
                            onChange={value => updateEvent(event.id, current => ({ ...current, templates: value }))}
                            placeholder="One message per line. Use {name} for the homie's name."
                        />
                    </label>

                    <label className="pyh-template-field">
                        <span>Tenor GIF URLs</span>
                        <TextArea
                            autosize
                            value={event.tenorGifs}
                            onChange={value => updateEvent(event.id, current => ({ ...current, tenorGifs: value }))}
                            placeholder="One https://tenor.com GIF link per line (optional)"
                        />
                        <small className="pyh-help">One valid Tenor GIF is selected randomly and appended to the draft.</small>
                    </label>

                    <div className="pyh-default-label">Default schedule</div>
                    <ScheduleEditor
                        label="Enable for homies by default"
                        schedule={event.defaultSchedule}
                        onChange={patch => updateEvent(event.id, current => ({
                            ...current,
                            defaultSchedule: { ...current.defaultSchedule, ...patch }
                        }))}
                    />
                </section>
            ))}

            <section className="pyh-card pyh-create-event">
                <Forms.FormTitle tag="h4">Create an event</Forms.FormTitle>
                <TextInput value={name} onChange={setName} placeholder="Event name" />
                <TextArea
                    autosize
                    value={templates}
                    onChange={setTemplates}
                    placeholder="Message templates, one per line (optional)"
                />
                <TextArea
                    autosize
                    value={tenorGifs}
                    onChange={setTenorGifs}
                    placeholder="Tenor GIF URLs, one per line (optional)"
                />
                <Button disabled={!name.trim()} onClick={addEvent}>Create event</Button>
            </section>
        </div>
    );
}

function displayName(homie: Homie) {
    const user = UserStore.getUser(homie.id);
    return homie.nickname.trim() || user?.globalName || user?.username || homie.id;
}

interface HomieManagerProps {
    setValue(value: Homie[]): void;
}

function HomieManager({ setValue }: HomieManagerProps) {
    const { homies = [], events = [] } = settings.use(HOMIE_SETTING_KEYS);
    const normalizedEvents = events.map(normalizeEvent);
    const normalizedHomies = homies.map(homie => normalizeHomie(homie, normalizedEvents));
    const [userId, setUserId] = useState("");
    const [nickname, setNickname] = useState("");
    const cleanId = userId.trim();
    const duplicate = normalizedHomies.some(homie => homie.id === cleanId);
    const idIsValid = USER_ID_RE.test(cleanId);

    const updateHomie = (id: string, transform: (homie: Homie) => Homie) => {
        setValue(normalizedHomies.map(homie => homie.id === id ? transform(homie) : homie));
    };

    const updateSchedule = (homieId: string, eventId: string, patch: Partial<HomieSchedule>) => {
        updateHomie(homieId, homie => ({
            ...homie,
            schedules: {
                ...homie.schedules,
                [eventId]: { ...homie.schedules[eventId], ...patch }
            }
        }));
    };

    const addHomie = () => {
        if (!idIsValid || duplicate) return;
        setValue([...normalizedHomies, createHomie(cleanId, normalizedEvents, nickname.trim())]);
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
                <TextInput value={userId} onChange={setUserId} placeholder="Discord user ID" />
                <TextInput value={nickname} onChange={setNickname} placeholder="Nickname (optional)" />
                <Button disabled={!idIsValid || duplicate} onClick={addHomie}>Add homie</Button>
            </div>
            {cleanId && !idIsValid && <div className="pyh-error">A Discord ID must contain 17–20 digits.</div>}
            {duplicate && <div className="pyh-error">This person is already one of your homies.</div>}

            {normalizedHomies.length === 0 && (
                <div className="pyh-empty">No homies yet. Add someone here or from their right-click menu.</div>
            )}

            {normalizedHomies.map(homie => (
                <section className="pyh-card" key={homie.id}>
                    <div className="pyh-card-header">
                        <div>
                            <strong>{displayName(homie)}</strong>
                            <div className="pyh-id">{homie.id}</div>
                        </div>
                        <Button
                            size="small"
                            variant="dangerPrimary"
                            onClick={() => setValue(normalizedHomies.filter(item => item.id !== homie.id))}
                        >
                            Remove
                        </Button>
                    </div>

                    <label className="pyh-field">
                        <span>Nickname / greeting name</span>
                        <TextInput
                            value={homie.nickname}
                            onChange={value => updateHomie(homie.id, current => ({ ...current, nickname: value }))}
                            placeholder={UserStore.getUser(homie.id)?.globalName ?? "Optional"}
                        />
                    </label>

                    {normalizedEvents.length === 0 && (
                        <div className="pyh-empty">Create an event above to schedule interactions for this homie.</div>
                    )}

                    {normalizedEvents.map(event => (
                        <ScheduleEditor
                            key={event.id}
                            label={event.name}
                            schedule={homie.schedules[event.id]}
                            onChange={patch => updateSchedule(homie.id, event.id, patch)}
                        />
                    ))}
                </section>
            ))}
        </div>
    );
}

export const settings = definePluginSettings({
    remindersEnabled: {
        type: OptionType.BOOLEAN,
        description: "Show scheduled Pet Your Homie suggestions.",
        default: true
    },
    reminderWindow: {
        type: OptionType.SELECT,
        description: "How long a suggestion remains due after its scheduled time.",
        options: [
            { label: "15 minutes", value: 15 },
            { label: "30 minutes", value: 30, default: true },
            { label: "60 minutes", value: 60 },
            { label: "2 hours", value: 120 }
        ]
    },
    events: {
        type: OptionType.COMPONENT,
        component: EventManager,
        default: defineDefault<HomieEvent[]>(DEFAULT_EVENTS.map(normalizeEvent))
    },
    homies: {
        type: OptionType.COMPONENT,
        component: HomieManager,
        default: defineDefault<Homie[]>([])
    },
    suggestionLedger: {
        type: OptionType.STRING,
        description: "Internal duplicate-reminder protection.",
        default: "{}",
        hidden: true
    },
    schemaVersion: {
        type: OptionType.NUMBER,
        description: "Internal settings schema version.",
        default: 0,
        hidden: true
    },
    fridayMessages: {
        type: OptionType.STRING,
        description: "Legacy Friday templates.",
        default: DEFAULT_EVENTS[0].templates,
        hidden: true
    },
    kindMessages: {
        type: OptionType.STRING,
        description: "Legacy kind templates.",
        default: DEFAULT_EVENTS[1].templates,
        hidden: true
    },
    flirtyMessages: {
        type: OptionType.STRING,
        description: "Legacy flirty templates.",
        default: DEFAULT_EVENTS[2].templates,
        hidden: true
    }
});
