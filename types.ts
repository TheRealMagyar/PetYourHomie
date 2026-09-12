/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface HomieSchedule {
    enabled: boolean;
    time: string;
    weekdays: number[];
}

export interface HomieEvent {
    id: string;
    name: string;
    templates: string;
    defaultSchedule: HomieSchedule;
}

export interface Homie {
    id: string;
    nickname: string;
    schedules: Record<string, HomieSchedule>;
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const DEFAULT_EVENTS: HomieEvent[] = [
    {
        id: "friday",
        name: "Happy Femboy Friday",
        templates: "Happy Femboy Friday, {name}! 💖\nWishing you the happiest Femboy Friday, {name}! ✨",
        defaultSchedule: { enabled: true, time: "10:00", weekdays: [5] }
    },
    {
        id: "kind",
        name: "Kind message",
        templates: "Just a reminder that you're awesome, {name}. 💛\nI hope you're having a lovely day, {name}! 🫶\nYou crossed my mind, so here's a virtual hug, {name}. 🤗",
        defaultSchedule: { enabled: false, time: "18:00", weekdays: [1, 3] }
    },
    {
        id: "flirty",
        name: "Flirty message",
        templates: "I miss you, {name}. Come a little closer 😏\nYou're looking dangerously good today, {name}. 🔥",
        defaultSchedule: { enabled: false, time: "21:00", weekdays: [5, 6] }
    }
];

function normalizeSchedule(value: Partial<HomieSchedule> | undefined, fallback: HomieSchedule): HomieSchedule {
    return {
        enabled: value?.enabled === true,
        time: value?.time && /^([01]\d|2[0-3]):[0-5]\d$/.test(value.time) ? value.time : fallback.time,
        weekdays: Array.isArray(value?.weekdays)
            ? value.weekdays.filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
            : [...fallback.weekdays]
    };
}

export function normalizeEvent(event: HomieEvent): HomieEvent {
    return {
        id: event.id,
        name: event.name.trim() || "Untitled event",
        templates: event.templates ?? "",
        defaultSchedule: normalizeSchedule(event.defaultSchedule, {
            enabled: false,
            time: "18:00",
            weekdays: [5]
        })
    };
}

export function createEvent(name: string, templates: string): HomieEvent {
    return {
        id: `custom-${crypto.randomUUID()}`,
        name: name.trim(),
        templates: templates.trim(),
        defaultSchedule: { enabled: false, time: "18:00", weekdays: [5] }
    };
}

export function createHomie(id: string, events: HomieEvent[], nickname = ""): Homie {
    return {
        id,
        nickname,
        schedules: Object.fromEntries(events.map(event => [
            event.id,
            normalizeSchedule(undefined, event.defaultSchedule)
        ]))
    };
}

export function normalizeHomie(value: Partial<Homie> & Pick<Homie, "id">, events: HomieEvent[]): Homie {
    return {
        id: value.id,
        nickname: value.nickname ?? "",
        schedules: Object.fromEntries(events.map(event => [
            event.id,
            normalizeSchedule(value.schedules?.[event.id], event.defaultSchedule)
        ]))
    };
}
