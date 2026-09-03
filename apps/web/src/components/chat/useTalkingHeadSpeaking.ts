import { useEffect, useRef, useState } from "react";

import {
  didTalkingHeadLiveStreamAdvance,
  didTalkingHeadReceiveBufferedText,
  didTalkingHeadReceiveUserQuestion,
  latestTalkingHeadSpeechSnapshot,
  talkingHeadTextPulseDurationMs,
  type TalkingHeadMessageLike,
  type TalkingHeadSpeechSnapshot,
} from "./TalkingHead.logic";

export const TALKING_HEAD_USER_QUESTION_PULSE_MS = 3_000;

interface PreviousSpeechState {
  readonly ready: boolean;
  readonly threadKey: string | null;
  readonly snapshot: TalkingHeadSpeechSnapshot | null;
  readonly userQuestionKey: string | null;
}

/**
 * Uses the durable streaming flag when available and briefly pulses for
 * providers that coalesce a text block and its completion into one render.
 */
export function useTalkingHeadSpeaking(
  enabled: boolean,
  enableLegacyTokenStreaming: boolean,
  ready: boolean,
  threadKey: string | null,
  messages: ReadonlyArray<TalkingHeadMessageLike>,
  userQuestionKey: string | null,
): boolean {
  const snapshot = latestTalkingHeadSpeechSnapshot(messages);
  const snapshotKey = snapshot?.key ?? null;
  const snapshotStreaming = snapshot?.streaming ?? false;
  const snapshotText = snapshot?.text ?? "";
  const previousRef = useRef<PreviousSpeechState | null>(null);
  const [liveStreamingThreadKey, setLiveStreamingThreadKey] = useState<string | null | undefined>(
    undefined,
  );
  const [completedTextPulseThreadKey, setCompletedTextPulseThreadKey] = useState<
    string | null | undefined
  >(undefined);

  useEffect(() => {
    const currentSnapshot =
      snapshotKey === null
        ? null
        : { key: snapshotKey, streaming: snapshotStreaming, text: snapshotText };
    const previous = previousRef.current;
    previousRef.current = { ready, threadKey, snapshot: currentSnapshot, userQuestionKey };

    if (
      !enabled ||
      !ready ||
      previous === null ||
      !previous.ready ||
      previous.threadKey !== threadKey
    ) {
      setLiveStreamingThreadKey(undefined);
      setCompletedTextPulseThreadKey(undefined);
      return;
    }

    const receivedUserQuestion = didTalkingHeadReceiveUserQuestion(
      previous.userQuestionKey,
      userQuestionKey,
    );
    const streamingAdvanced = didTalkingHeadLiveStreamAdvance(
      enableLegacyTokenStreaming,
      previous.snapshot,
      currentSnapshot,
    );
    setLiveStreamingThreadKey((currentThreadKey) =>
      enableLegacyTokenStreaming &&
      snapshotStreaming &&
      (currentThreadKey === threadKey || streamingAdvanced)
        ? threadKey
        : undefined,
    );
    const receivedText = didTalkingHeadReceiveBufferedText(
      enableLegacyTokenStreaming,
      previous.snapshot,
      currentSnapshot,
    );
    if (!receivedUserQuestion && !receivedText) {
      setCompletedTextPulseThreadKey(undefined);
      return;
    }

    setCompletedTextPulseThreadKey(threadKey);
    const pulseDurationMs = Math.max(
      receivedUserQuestion ? TALKING_HEAD_USER_QUESTION_PULSE_MS : 0,
      receivedText ? talkingHeadTextPulseDurationMs(currentSnapshot?.text ?? "") : 0,
    );
    const timeoutId = window.setTimeout(
      () => setCompletedTextPulseThreadKey(undefined),
      pulseDurationMs,
    );
    return () => window.clearTimeout(timeoutId);
  }, [
    enableLegacyTokenStreaming,
    enabled,
    ready,
    snapshotKey,
    snapshotStreaming,
    snapshotText,
    threadKey,
    userQuestionKey,
  ]);

  return (
    enabled &&
    ready &&
    (liveStreamingThreadKey === threadKey || completedTextPulseThreadKey === threadKey)
  );
}
