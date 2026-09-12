/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type InteractionKind = "friday" | "kind" | "flirty";

export interface HomieSchedule {
    enabled: boolean;
    time: string;
    weekdays: number[];
}

export interface Homie {
    id: string;
    nickname: string;
    schedules: Record<InteractionKind, HomieSchedule>;
}

export const INTERACTION_LABELS: Record<InteractionKind, string> = {
    friday: "Happy Femboy Friday",
    kind: "Kind message",
    flirty: "Flirty message"
};

export const INTERACTION_KINDS: InteractionKind[] = ["friday", "kind", "flirty"];

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function createHomie(id: string, nickname = ""): Homie {
    return {
        id,
        nickname,
        schedules: {
            friday: { enabled: true, time: "10:00", weekdays: [5] },
            kind: { enabled: false, time: "18:00", weekdays: [1, 3] },
            flirty: { enabled: false, time: "21:00", weekdays: [5, 6] }
        }
    };
}

export function normalizeHomie(value: Partial<Homie> & Pick<Homie, "id">): Homie {
    const fallback = createHomie(value.id, value.nickname ?? "");

    for (const kind of INTERACTION_KINDS) {
        const schedule = value.schedules?.[kind];
        if (!schedule) continue;

        fallback.schedules[kind] = {
            enabled: schedule.enabled === true,
            time: /^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.time) ? schedule.time : fallback.schedules[kind].time,
            weekdays: kind === "friday"
                ? [5]
                : Array.isArray(schedule.weekdays)
                ? schedule.weekdays.filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
                : fallback.schedules[kind].weekdays
        };
    }

    return fallback;
}
