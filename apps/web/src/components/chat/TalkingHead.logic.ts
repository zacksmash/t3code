export interface TalkingHeadMessageLike {
  readonly id?: string;
  readonly role: "user" | "assistant" | "system";
  readonly streaming?: boolean;
  readonly text?: string;
}

export interface TalkingHeadSpeechSnapshot {
  readonly key: string;
  readonly streaming: boolean;
  readonly text: string;
}

export const TALKING_HEAD_TEXT_PULSE_MIN_MS = 2_000;
export const TALKING_HEAD_TEXT_PULSE_MAX_MS = 10_000;

/**
 * Approximates how long a completed block should keep talking without trying
 * to mimic a full read-aloud. Short replies get a quick cue, while longer
 * replies are capped so the decorative animation cannot run indefinitely.
 */
export function talkingHeadTextPulseDurationMs(text: string): number {
  const durationMs = 1_500 + text.trim().length * 13;
  return Math.min(
    TALKING_HEAD_TEXT_PULSE_MAX_MS,
    Math.max(TALKING_HEAD_TEXT_PULSE_MIN_MS, durationMs),
  );
}

export function latestTalkingHeadSpeechSnapshot(
  messages: ReadonlyArray<TalkingHeadMessageLike>,
): TalkingHeadSpeechSnapshot | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role === "assistant") {
      return {
        key: message.id ?? `assistant:${index}`,
        streaming: message.streaming === true,
        text: message.text ?? "",
      };
    }
  }
  return null;
}

/**
 * Claude can deliver a full text block and its completion back-to-back. React
 * may observe `streaming: true` without the browser painting that frame, so a
 * changed block or its streaming-to-complete transition needs a short pulse.
 */
export function didTalkingHeadReceiveText(
  previous: TalkingHeadSpeechSnapshot | null,
  current: TalkingHeadSpeechSnapshot | null,
): boolean {
  if (!current || current.text.length === 0) {
    return false;
  }
  return (
    previous?.key !== current.key ||
    previous.text !== current.text ||
    (previous.streaming && !current.streaming)
  );
}

/** Buffered mode talks after the completed block lands; live mode stops at completion. */
export function didTalkingHeadReceiveBufferedText(
  enableLegacyTokenStreaming: boolean,
  previous: TalkingHeadSpeechSnapshot | null,
  current: TalkingHeadSpeechSnapshot | null,
): boolean {
  return (
    !enableLegacyTokenStreaming &&
    current?.streaming === false &&
    didTalkingHeadReceiveText(previous, current)
  );
}

/** A persisted streaming flag is not enough; animation starts on a live update. */
export function didTalkingHeadStreamingAdvance(
  previous: TalkingHeadSpeechSnapshot | null,
  current: TalkingHeadSpeechSnapshot | null,
): boolean {
  if (!previous || !current?.streaming) return false;
  return !previous.streaming || previous.key !== current.key || previous.text !== current.text;
}

export function didTalkingHeadLiveStreamAdvance(
  enableLegacyTokenStreaming: boolean,
  previous: TalkingHeadSpeechSnapshot | null,
  current: TalkingHeadSpeechSnapshot | null,
): boolean {
  return enableLegacyTokenStreaming && didTalkingHeadStreamingAdvance(previous, current);
}

export function isTalkingHeadThreadReady(
  routeThreadKey: string | null,
  renderedThreadKey: string | null,
  loading: boolean,
): boolean {
  return !loading && routeThreadKey !== null && routeThreadKey === renderedThreadKey;
}

export function didTalkingHeadReceiveUserQuestion(
  previousQuestionKey: string | null,
  currentQuestionKey: string | null,
): boolean {
  return currentQuestionKey !== null && currentQuestionKey !== previousQuestionKey;
}

/** Only assistant text streaming moves the mouth; provider work alone stays idle. */
export function isTalkingHeadSpeaking(messages: ReadonlyArray<TalkingHeadMessageLike>): boolean {
  return latestTalkingHeadSpeechSnapshot(messages)?.streaming === true;
}
