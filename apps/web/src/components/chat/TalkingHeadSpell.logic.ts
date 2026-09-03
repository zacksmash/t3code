export type TalkingHeadSpellCueKind = "divination" | "cast" | "fizzle" | "victory";

export interface TalkingHeadSpellCue {
  readonly id: string;
  readonly kind: TalkingHeadSpellCueKind;
}

export interface TalkingHeadSpellActivityLike {
  readonly id: string;
  readonly tone: "info" | "tool" | "approval" | "error";
  readonly kind: string;
  readonly summary: string;
  readonly payload: unknown;
}

export interface TalkingHeadSpellTurnLike {
  readonly turnId: string;
  readonly state: "running" | "interrupted" | "completed" | "error";
}

export interface TalkingHeadSpellCueCandidate extends TalkingHeadSpellCue {
  readonly durationMs: number;
}

export interface TalkingHeadSpellObservation {
  readonly active: boolean;
  readonly threadKey: string | null;
  readonly activityIds: ReadonlySet<string>;
  readonly playedCueIds: ReadonlySet<string>;
  readonly turn: TalkingHeadSpellTurnLike | null;
}

export interface TalkingHeadSpellObservationInput {
  readonly enabled: boolean;
  readonly ready: boolean;
  readonly threadKey: string | null;
  readonly activities: ReadonlyArray<TalkingHeadSpellActivityLike>;
  readonly turn: TalkingHeadSpellTurnLike | null;
}

const SPELL_DURATION_MS: Record<TalkingHeadSpellCueKind, number> = {
  divination: 850,
  cast: 700,
  fizzle: 900,
  victory: 1_200,
};

const SPELL_PRIORITY: Record<TalkingHeadSpellCueKind, number> = {
  divination: 1,
  cast: 1,
  victory: 2,
  fizzle: 3,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function makeCue(id: string, kind: TalkingHeadSpellCueKind): TalkingHeadSpellCueCandidate {
  return { id, kind, durationMs: SPELL_DURATION_MS[kind] };
}

function toolCallId(payload: Record<string, unknown> | null): string | null {
  const data = asRecord(payload?.data);
  const item = asRecord(data?.item);
  return (
    nonEmptyString(payload?.toolCallId) ??
    nonEmptyString(data?.toolCallId) ??
    nonEmptyString(item?.toolCallId)
  );
}

function failedToolStatus(payload: Record<string, unknown> | null): boolean {
  const status = nonEmptyString(payload?.status);
  return status === "failed" || status === "declined" || status === "stopped";
}

function activitySearchText(
  activity: TalkingHeadSpellActivityLike,
  payload: Record<string, unknown> | null,
): string {
  const data = asRecord(payload?.data);
  return [
    activity.kind,
    activity.summary,
    nonEmptyString(payload?.title),
    nonEmptyString(payload?.detail),
    nonEmptyString(payload?.requestKind),
    nonEmptyString(data?.kind),
  ]
    .filter((value): value is string => value !== null)
    .join(" ")
    .toLowerCase();
}

export function talkingHeadSpellCueForActivity(
  activity: TalkingHeadSpellActivityLike,
): TalkingHeadSpellCueCandidate | null {
  const payload = asRecord(activity.payload);
  if (activity.tone === "error" || failedToolStatus(payload)) {
    return makeCue(`error:${activity.id}`, "fizzle");
  }

  if (activity.kind === "tool.completed") return null;

  const lifecycleActivity = activity.kind === "tool.started" || activity.kind === "tool.updated";
  const legacyToolActivity =
    activity.tone === "tool" &&
    (activity.kind === "command" ||
      activity.kind === "file-edit" ||
      activity.kind === "search" ||
      activity.kind === "read");
  if (!lifecycleActivity && !legacyToolActivity) return null;

  const id = toolCallId(payload);
  const cueId = id === null ? `activity:${activity.id}` : `tool:${id}`;
  const itemType = nonEmptyString(payload?.itemType);
  const requestKind = nonEmptyString(payload?.requestKind);

  if (
    itemType === "file_change" ||
    itemType === "command_execution" ||
    requestKind === "file-change" ||
    requestKind === "command" ||
    activity.kind === "file-edit" ||
    activity.kind === "command"
  ) {
    return makeCue(cueId, "cast");
  }

  if (
    itemType === "web_search" ||
    itemType === "image_view" ||
    requestKind === "file-read" ||
    activity.kind === "search" ||
    activity.kind === "read" ||
    /\b(read|search|find|grep|glob|inspect|browse|view)\b/.test(
      activitySearchText(activity, payload),
    )
  ) {
    return makeCue(cueId, "divination");
  }

  return makeCue(cueId, "cast");
}

export function talkingHeadSpellCueForTurnTransition(
  previous: TalkingHeadSpellTurnLike | null,
  current: TalkingHeadSpellTurnLike | null,
): TalkingHeadSpellCueCandidate | null {
  if (
    current === null ||
    (previous?.turnId === current.turnId && previous.state === current.state)
  ) {
    return null;
  }
  if (current.state === "error") return makeCue(`turn:${current.turnId}:error`, "fizzle");
  if (current.state === "completed") {
    return makeCue(`turn:${current.turnId}:completed`, "victory");
  }
  return null;
}

export function chooseTalkingHeadSpellCue(
  candidates: ReadonlyArray<TalkingHeadSpellCueCandidate>,
): TalkingHeadSpellCueCandidate | null {
  return candidates.reduce<TalkingHeadSpellCueCandidate | null>((selected, candidate) => {
    if (selected === null || SPELL_PRIORITY[candidate.kind] >= SPELL_PRIORITY[selected.kind]) {
      return candidate;
    }
    return selected;
  }, null);
}

function baselineObservation(input: TalkingHeadSpellObservationInput): TalkingHeadSpellObservation {
  const candidates = input.activities
    .map(talkingHeadSpellCueForActivity)
    .filter((candidate) => candidate !== null);
  return {
    active: input.enabled && input.ready,
    threadKey: input.threadKey,
    activityIds: new Set(input.activities.map((activity) => activity.id)),
    playedCueIds: new Set(candidates.map((candidate) => candidate.id)),
    turn: input.turn,
  };
}

/** Advances from a silent history baseline and returns at most one new, deduplicated cue. */
export function observeTalkingHeadSpellCue(
  previous: TalkingHeadSpellObservation | null,
  input: TalkingHeadSpellObservationInput,
): {
  readonly observation: TalkingHeadSpellObservation;
  readonly cue: TalkingHeadSpellCueCandidate | null;
} {
  const active = input.enabled && input.ready;
  if (!active || previous === null || !previous.active || previous.threadKey !== input.threadKey) {
    return { observation: baselineObservation(input), cue: null };
  }

  const activityIds = new Set(input.activities.map((activity) => activity.id));
  const playedCueIds = new Set(previous.playedCueIds);
  const candidates = input.activities.flatMap((activity) => {
    if (previous.activityIds.has(activity.id)) return [];
    const candidate = talkingHeadSpellCueForActivity(activity);
    if (candidate === null || playedCueIds.has(candidate.id)) return [];
    playedCueIds.add(candidate.id);
    return [candidate];
  });
  const turnCandidate = talkingHeadSpellCueForTurnTransition(previous.turn, input.turn);
  if (turnCandidate !== null && !playedCueIds.has(turnCandidate.id)) {
    playedCueIds.add(turnCandidate.id);
    candidates.push(turnCandidate);
  }

  return {
    observation: {
      active,
      threadKey: input.threadKey,
      activityIds,
      playedCueIds,
      turn: input.turn,
    },
    cue: chooseTalkingHeadSpellCue(candidates),
  };
}
