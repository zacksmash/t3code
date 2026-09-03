import { describe, expect, it } from "vite-plus/test";

import {
  didTalkingHeadLiveStreamAdvance,
  didTalkingHeadReceiveBufferedText,
  didTalkingHeadReceiveText,
  didTalkingHeadReceiveUserQuestion,
  didTalkingHeadStreamingAdvance,
  isTalkingHeadSpeaking,
  isTalkingHeadThreadReady,
  latestTalkingHeadSpeechSnapshot,
  TALKING_HEAD_TEXT_PULSE_MAX_MS,
  TALKING_HEAD_TEXT_PULSE_MIN_MS,
  talkingHeadTextPulseDurationMs,
} from "./TalkingHead.logic";

describe("isTalkingHeadSpeaking", () => {
  it("speaks when the latest assistant message is streaming", () => {
    expect(
      isTalkingHeadSpeaking([
        { role: "assistant", streaming: false },
        { role: "user" },
        { role: "assistant", streaming: true },
      ]),
    ).toBe(true);
  });

  it("stays idle for completed assistant text", () => {
    expect(isTalkingHeadSpeaking([{ role: "assistant", streaming: false }])).toBe(false);
  });

  it("stays idle before any assistant message exists", () => {
    expect(isTalkingHeadSpeaking([{ role: "system" }, { role: "user" }])).toBe(false);
    expect(isTalkingHeadSpeaking([])).toBe(false);
  });

  it("uses the latest assistant state when the thread changes", () => {
    const oldThread = [{ role: "assistant", streaming: true }] as const;
    const nextThread = [{ role: "assistant", streaming: false }] as const;

    expect(isTalkingHeadSpeaking(oldThread)).toBe(true);
    expect(isTalkingHeadSpeaking(nextThread)).toBe(false);
  });

  it("waits for the routed thread before using its talking-head state", () => {
    expect(isTalkingHeadThreadReady("thread-b", "thread-a", false)).toBe(false);
    expect(isTalkingHeadThreadReady("thread-b", "thread-b", true)).toBe(false);
    expect(isTalkingHeadThreadReady("thread-b", "thread-b", false)).toBe(true);
  });

  it("does not animate a stale streaming flag on startup", () => {
    const restored = latestTalkingHeadSpeechSnapshot([
      { id: "assistant-stale", role: "assistant", streaming: true, text: "Persisted text" },
    ]);

    expect(didTalkingHeadStreamingAdvance(null, restored)).toBe(false);
    expect(didTalkingHeadStreamingAdvance(restored, restored)).toBe(false);
  });

  it("starts streaming animation only when a live assistant message advances", () => {
    const idle = latestTalkingHeadSpeechSnapshot([
      { id: "assistant-old", role: "assistant", streaming: false, text: "Earlier" },
    ]);
    const streaming = latestTalkingHeadSpeechSnapshot([
      { id: "assistant-new", role: "assistant", streaming: true, text: "Incoming" },
    ]);

    expect(didTalkingHeadStreamingAdvance(idle, streaming)).toBe(true);
  });

  it("detects Claude text that is completed in the same client batch", () => {
    const previous = latestTalkingHeadSpeechSnapshot([
      { id: "assistant-before", role: "assistant", streaming: false, text: "Earlier reply" },
    ]);
    const current = latestTalkingHeadSpeechSnapshot([
      { id: "assistant-before", role: "assistant", streaming: false, text: "Earlier reply" },
      { id: "assistant-claude", role: "assistant", streaming: false, text: "Batched reply" },
    ]);

    expect(didTalkingHeadReceiveText(previous, current)).toBe(true);
  });

  it("pulses when a full text block completes before its streaming frame can paint", () => {
    const streaming = latestTalkingHeadSpeechSnapshot([
      {
        id: "assistant-claude",
        role: "assistant",
        streaming: true,
        text: "Complete response delivered in one event",
      },
    ]);
    const completed = latestTalkingHeadSpeechSnapshot([
      {
        id: "assistant-claude",
        role: "assistant",
        streaming: false,
        text: "Complete response delivered in one event",
      },
    ]);

    expect(didTalkingHeadReceiveText(streaming, completed)).toBe(true);
  });

  it("uses the intelligent pulse only when token streaming is disabled", () => {
    const previous = latestTalkingHeadSpeechSnapshot([
      { id: "assistant-before", role: "assistant", streaming: false, text: "Earlier reply" },
    ]);
    const buffered = latestTalkingHeadSpeechSnapshot([
      { id: "assistant-buffered", role: "assistant", streaming: false, text: "Full response" },
    ]);

    expect(didTalkingHeadReceiveBufferedText(false, previous, buffered)).toBe(true);
    expect(didTalkingHeadReceiveBufferedText(true, previous, buffered)).toBe(false);
  });

  it("does not add a completed-text pulse after a token stream finishes", () => {
    const streaming = latestTalkingHeadSpeechSnapshot([
      { id: "assistant-live", role: "assistant", streaming: true, text: "Live response" },
    ]);
    const completed = latestTalkingHeadSpeechSnapshot([
      { id: "assistant-live", role: "assistant", streaming: false, text: "Live response" },
    ]);

    expect(didTalkingHeadReceiveBufferedText(true, streaming, completed)).toBe(false);
    expect(didTalkingHeadLiveStreamAdvance(true, streaming, completed)).toBe(false);
  });

  it("ignores streaming flags in buffered mode and waits for completion", () => {
    const previous = latestTalkingHeadSpeechSnapshot([
      { id: "assistant-before", role: "assistant", streaming: false, text: "Earlier reply" },
    ]);
    const streaming = latestTalkingHeadSpeechSnapshot([
      { id: "assistant-buffered", role: "assistant", streaming: true, text: "Full response" },
    ]);
    const completed = latestTalkingHeadSpeechSnapshot([
      { id: "assistant-buffered", role: "assistant", streaming: false, text: "Full response" },
    ]);

    expect(didTalkingHeadLiveStreamAdvance(false, previous, streaming)).toBe(false);
    expect(didTalkingHeadReceiveBufferedText(false, previous, streaming)).toBe(false);
    expect(didTalkingHeadReceiveBufferedText(false, streaming, completed)).toBe(true);
  });

  it("does not treat an unchanged transcript as speech during tool work", () => {
    const snapshot = latestTalkingHeadSpeechSnapshot([
      { id: "assistant", role: "assistant", streaming: false, text: "I will inspect that." },
    ]);

    expect(didTalkingHeadReceiveText(snapshot, snapshot)).toBe(false);
  });

  it("speaks when a new User Question prompt opens", () => {
    expect(didTalkingHeadReceiveUserQuestion(null, "question-1")).toBe(true);
    expect(didTalkingHeadReceiveUserQuestion("question-1", "question-1")).toBe(false);
    expect(didTalkingHeadReceiveUserQuestion("question-1", null)).toBe(false);
  });

  it("scales completed-text speech time with reply length", () => {
    const shortDuration = talkingHeadTextPulseDurationMs("Done.");
    const mediumDuration = talkingHeadTextPulseDurationMs("A".repeat(200));
    const longDuration = talkingHeadTextPulseDurationMs("A".repeat(2_000));

    expect(shortDuration).toBe(TALKING_HEAD_TEXT_PULSE_MIN_MS);
    expect(mediumDuration).toBeGreaterThan(shortDuration);
    expect(longDuration).toBe(TALKING_HEAD_TEXT_PULSE_MAX_MS);
  });
});
