import { describe, expect, it } from "vite-plus/test";

import {
  chooseTalkingHeadSpellCue,
  observeTalkingHeadSpellCue,
  talkingHeadSpellCueForActivity,
  talkingHeadSpellCueForTurnTransition,
  type TalkingHeadSpellActivityLike,
} from "./TalkingHeadSpell.logic";

function activity(
  overrides: Partial<TalkingHeadSpellActivityLike> = {},
): TalkingHeadSpellActivityLike {
  return {
    id: "activity-1",
    tone: "tool",
    kind: "tool.started",
    summary: "Tool started",
    payload: {},
    ...overrides,
  };
}

describe("talking-head spell cues", () => {
  it("translates reads and searches into divination", () => {
    expect(
      talkingHeadSpellCueForActivity(
        activity({
          payload: { itemType: "dynamic_tool_call", title: "Read File", toolCallId: "read-1" },
        }),
      ),
    ).toMatchObject({ id: "tool:read-1", kind: "divination" });
    expect(
      talkingHeadSpellCueForActivity(
        activity({ payload: { itemType: "web_search", toolCallId: "search-1" } }),
      ),
    ).toMatchObject({ id: "tool:search-1", kind: "divination" });
  });

  it("translates edits and commands into casts", () => {
    expect(
      talkingHeadSpellCueForActivity(
        activity({ payload: { itemType: "file_change", toolCallId: "edit-1" } }),
      ),
    ).toMatchObject({ id: "tool:edit-1", kind: "cast" });
    expect(
      talkingHeadSpellCueForActivity(
        activity({ payload: { itemType: "command_execution", toolCallId: "command-1" } }),
      ),
    ).toMatchObject({ id: "tool:command-1", kind: "cast" });
  });

  it("fizzles on activity errors and failed tool outcomes", () => {
    expect(talkingHeadSpellCueForActivity(activity({ tone: "error" }))?.kind).toBe("fizzle");
    expect(talkingHeadSpellCueForActivity(activity({ payload: { status: "failed" } }))?.kind).toBe(
      "fizzle",
    );
  });

  it("does not cast again for successful tool completion events", () => {
    expect(
      talkingHeadSpellCueForActivity(
        activity({ kind: "tool.completed", payload: { status: "completed" } }),
      ),
    ).toBeNull();
  });

  it("celebrates only a newly completed turn and fizzles on turn errors", () => {
    expect(
      talkingHeadSpellCueForTurnTransition(
        { turnId: "turn-1", state: "running" },
        { turnId: "turn-1", state: "completed" },
      ),
    ).toMatchObject({ id: "turn:turn-1:completed", kind: "victory" });
    expect(
      talkingHeadSpellCueForTurnTransition(
        { turnId: "turn-1", state: "completed" },
        { turnId: "turn-1", state: "completed" },
      ),
    ).toBeNull();
    expect(
      talkingHeadSpellCueForTurnTransition(
        { turnId: "turn-2", state: "running" },
        { turnId: "turn-2", state: "error" },
      )?.kind,
    ).toBe("fizzle");
  });

  it("prioritizes failures over victory and routine tool cues", () => {
    const cast = talkingHeadSpellCueForActivity(
      activity({ id: "cast", payload: { itemType: "file_change" } }),
    );
    const victory = talkingHeadSpellCueForTurnTransition(
      { turnId: "turn-1", state: "running" },
      { turnId: "turn-1", state: "completed" },
    );
    const fizzle = talkingHeadSpellCueForActivity(activity({ id: "error", tone: "error" }));

    expect(chooseTalkingHeadSpellCue([cast!, fizzle!, victory!])?.kind).toBe("fizzle");
  });

  it("silently baselines saved history and only reacts to a new activity", () => {
    const savedRead = activity({
      id: "saved-read",
      payload: { itemType: "web_search", toolCallId: "read-1" },
    });
    const baseline = observeTalkingHeadSpellCue(null, {
      enabled: true,
      ready: true,
      threadKey: "thread-1",
      activities: [savedRead],
      turn: { turnId: "turn-1", state: "completed" },
    });
    expect(baseline.cue).toBeNull();

    const liveEdit = activity({
      id: "live-edit",
      payload: { itemType: "file_change", toolCallId: "edit-1" },
    });
    const update = observeTalkingHeadSpellCue(baseline.observation, {
      enabled: true,
      ready: true,
      threadKey: "thread-1",
      activities: [savedRead, liveEdit],
      turn: { turnId: "turn-2", state: "running" },
    });
    expect(update.cue).toMatchObject({ id: "tool:edit-1", kind: "cast" });
  });

  it("deduplicates lifecycle updates and resets silently across threads", () => {
    const baseline = observeTalkingHeadSpellCue(null, {
      enabled: true,
      ready: true,
      threadKey: "thread-1",
      activities: [],
      turn: null,
    });
    const started = activity({
      id: "started",
      payload: { title: "Read File", toolCallId: "read-1" },
    });
    const firstUpdate = observeTalkingHeadSpellCue(baseline.observation, {
      enabled: true,
      ready: true,
      threadKey: "thread-1",
      activities: [started],
      turn: null,
    });
    expect(firstUpdate.cue?.kind).toBe("divination");

    const progress = activity({
      id: "progress",
      kind: "tool.updated",
      payload: { title: "Read File", toolCallId: "read-1" },
    });
    const duplicate = observeTalkingHeadSpellCue(firstUpdate.observation, {
      enabled: true,
      ready: true,
      threadKey: "thread-1",
      activities: [started, progress],
      turn: null,
    });
    expect(duplicate.cue).toBeNull();

    const switched = observeTalkingHeadSpellCue(duplicate.observation, {
      enabled: true,
      ready: true,
      threadKey: "thread-2",
      activities: [progress],
      turn: null,
    });
    expect(switched.cue).toBeNull();
  });
});
