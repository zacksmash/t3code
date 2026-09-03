import { useEffect, useRef, useState } from "react";

import {
  observeTalkingHeadSpellCue,
  type TalkingHeadSpellActivityLike,
  type TalkingHeadSpellCue,
  type TalkingHeadSpellObservation,
  type TalkingHeadSpellTurnLike,
} from "./TalkingHeadSpell.logic";

interface ActiveTalkingHeadSpellCue {
  readonly threadKey: string | null;
  readonly cue: TalkingHeadSpellCue;
}

/** Plays only newly observed cues in the selected thread; persisted history is a silent baseline. */
export function useTalkingHeadSpellCue(
  enabled: boolean,
  ready: boolean,
  threadKey: string | null,
  activities: ReadonlyArray<TalkingHeadSpellActivityLike>,
  turn: TalkingHeadSpellTurnLike | null,
): TalkingHeadSpellCue | null {
  const previousRef = useRef<TalkingHeadSpellObservation | null>(null);
  const timeoutRef = useRef<number | undefined>(undefined);
  const [activeCue, setActiveCue] = useState<ActiveTalkingHeadSpellCue | null>(null);
  const turnId = turn?.turnId ?? null;
  const turnState = turn?.state ?? null;

  useEffect(() => {
    const currentTurn = turnId === null || turnState === null ? null : { turnId, state: turnState };
    const result = observeTalkingHeadSpellCue(previousRef.current, {
      enabled,
      ready,
      threadKey,
      activities,
      turn: currentTurn,
    });
    previousRef.current = result.observation;

    if (!enabled || !ready) return;

    const nextCue = result.cue;
    if (nextCue === null) return;

    if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current);
    const cue = { id: nextCue.id, kind: nextCue.kind };
    setActiveCue({ threadKey, cue });
    timeoutRef.current = window.setTimeout(() => {
      setActiveCue((current) => (current?.cue.id === cue.id ? null : current));
      timeoutRef.current = undefined;
    }, nextCue.durationMs);
  }, [activities, enabled, ready, threadKey, turnId, turnState]);

  useEffect(
    () => () => {
      if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  return enabled && ready && activeCue?.threadKey === threadKey ? activeCue.cue : null;
}
