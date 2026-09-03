import type { TalkingHeadAvatar } from "@t3tools/contracts/settings";
import { useEffect, useRef } from "react";

const TALKING_HEAD_BOOP_POLL_MS = 50;
const TALKING_HEAD_BOOP_WITHIN_WORD_MS = 65;
const TALKING_HEAD_BOOP_WORD_GAP_MS = 130;
const TALKING_HEAD_BOOP_CLAUSE_GAP_MS = 180;
const TALKING_HEAD_BOOP_SENTENCE_GAP_MS = 260;

export interface TalkingHeadBoopCadenceStep {
  readonly delayMs: number;
}

export interface TalkingHeadBoopProfile {
  readonly frequencyHz: number;
  readonly waveform: OscillatorType;
  readonly endFrequencyRatio: number;
  readonly durationSeconds: number;
  readonly gain: number;
  readonly harmonic?: {
    readonly frequencyRatio: number;
    readonly gainRatio: number;
    readonly detuneCents?: number;
    readonly waveform: OscillatorType;
  };
}

const BOOP_PROFILES: Record<TalkingHeadAvatar, TalkingHeadBoopProfile> = {
  robot: {
    frequencyHz: 430,
    waveform: "square",
    endFrequencyRatio: 0.76,
    durationSeconds: 0.045,
    gain: 0.014,
    harmonic: {
      frequencyRatio: 1.99,
      gainRatio: 0.28,
      detuneCents: 7,
      waveform: "square",
    },
  },
  wizard: {
    frequencyHz: 180,
    waveform: "triangle",
    endFrequencyRatio: 0.7,
    durationSeconds: 0.085,
    gain: 0.025,
    harmonic: {
      frequencyRatio: 0.5,
      gainRatio: 0.32,
      waveform: "sine",
    },
  },
  knight: {
    frequencyHz: 240,
    waveform: "square",
    endFrequencyRatio: 0.84,
    durationSeconds: 0.055,
    gain: 0.019,
  },
  rogue: {
    frequencyHz: 300,
    waveform: "triangle",
    endFrequencyRatio: 0.88,
    durationSeconds: 0.045,
    gain: 0.023,
  },
  slime: {
    frequencyHz: 520,
    waveform: "sine",
    endFrequencyRatio: 1.35,
    durationSeconds: 0.065,
    gain: 0.025,
  },
  archer: {
    frequencyHz: 720,
    waveform: "square",
    endFrequencyRatio: 0.92,
    durationSeconds: 0.038,
    gain: 0.014,
  },
  healer: {
    frequencyHz: 640,
    waveform: "sine",
    endFrequencyRatio: 1.08,
    durationSeconds: 0.065,
    gain: 0.024,
    harmonic: {
      frequencyRatio: 2,
      gainRatio: 0.16,
      waveform: "sine",
    },
  },
};

let audioContext: AudioContext | null = null;

export function talkingHeadBoopFrequency(avatar: TalkingHeadAvatar): number {
  return BOOP_PROFILES[avatar].frequencyHz;
}

export function talkingHeadBoopProfile(avatar: TalkingHeadAvatar): TalkingHeadBoopProfile {
  return BOOP_PROFILES[avatar];
}

/** Groups same-pitch blips into words, leaving longer rests at spaces and punctuation. */
export function buildTalkingHeadBoopCadence(
  text: string,
): ReadonlyArray<TalkingHeadBoopCadenceStep> {
  const words = text.trim().match(/\S+/g) ?? [];
  return words.flatMap((word) => {
    const speakableLength = word.replace(/[^\p{L}\p{N}]/gu, "").length;
    const boopCount = Math.max(1, Math.min(3, Math.ceil(speakableLength / 3)));
    const wordGap = /[.!?]["')\]]*$/.test(word)
      ? TALKING_HEAD_BOOP_SENTENCE_GAP_MS
      : /[,;:]["')\]]*$/.test(word)
        ? TALKING_HEAD_BOOP_CLAUSE_GAP_MS
        : TALKING_HEAD_BOOP_WORD_GAP_MS;

    return Array.from({ length: boopCount }, (_, index) => ({
      delayMs: index === boopCount - 1 ? wordGap : TALKING_HEAD_BOOP_WITHIN_WORD_MS,
    }));
  });
}

function getTalkingHeadAudioContext(): AudioContext | null {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") {
    return null;
  }
  if (audioContext === null || audioContext.state === "closed") {
    try {
      audioContext = new window.AudioContext();
    } catch {
      return null;
    }
  }
  return audioContext;
}

/** Call from a user gesture so browser autoplay policies permit later dialogue blips. */
export function prepareTalkingHeadSound(): void {
  const context = getTalkingHeadAudioContext();
  if (context?.state === "suspended") {
    void context.resume().catch(() => undefined);
  }
}

function playTalkingHeadBoop(avatar: TalkingHeadAvatar): void {
  const context = getTalkingHeadAudioContext();
  if (context === null || context.state !== "running") {
    return;
  }

  const now = context.currentTime;
  const profile = talkingHeadBoopProfile(avatar);
  const end = now + profile.durationSeconds;
  const envelope = context.createGain();
  const oscillators: OscillatorNode[] = [];
  const voiceGains: GainNode[] = [];

  const addVoice = (
    waveform: OscillatorType,
    frequencyRatio: number,
    gainRatio: number,
    detuneCents = 0,
  ) => {
    const oscillator = context.createOscillator();
    const voiceGain = context.createGain();
    const frequency = profile.frequencyHz * frequencyRatio;

    oscillator.type = waveform;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * profile.endFrequencyRatio, end);
    oscillator.detune.setValueAtTime(detuneCents, now);
    voiceGain.gain.setValueAtTime(gainRatio, now);
    oscillator.connect(voiceGain);
    voiceGain.connect(envelope);
    oscillators.push(oscillator);
    voiceGains.push(voiceGain);
  };

  addVoice(profile.waveform, 1, 1);
  if (profile.harmonic) {
    addVoice(
      profile.harmonic.waveform,
      profile.harmonic.frequencyRatio,
      profile.harmonic.gainRatio,
      profile.harmonic.detuneCents,
    );
  }

  envelope.gain.setValueAtTime(0.0001, now);
  envelope.gain.exponentialRampToValueAtTime(profile.gain, now + 0.004);
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);
  envelope.connect(context.destination);

  oscillators[0]?.addEventListener(
    "ended",
    () => {
      oscillators.forEach((oscillator) => oscillator.disconnect());
      voiceGains.forEach((voiceGain) => voiceGain.disconnect());
      envelope.disconnect();
    },
    { once: true },
  );
  oscillators.forEach((oscillator) => {
    oscillator.start(now);
    oscillator.stop(end + 0.005);
  });
}

export function useTalkingHeadSound(
  enabled: boolean,
  speaking: boolean,
  avatar: TalkingHeadAvatar,
  text: string,
): void {
  const cadenceRef = useRef<ReadonlyArray<TalkingHeadBoopCadenceStep>>([]);

  useEffect(() => {
    cadenceRef.current = buildTalkingHeadBoopCadence(text);
  }, [text]);

  useEffect(() => {
    if (!enabled) return;

    const prepare = () => prepareTalkingHeadSound();
    window.addEventListener("pointerdown", prepare, true);
    window.addEventListener("keydown", prepare, true);
    return () => {
      window.removeEventListener("pointerdown", prepare, true);
      window.removeEventListener("keydown", prepare, true);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !speaking) return;

    let cadenceIndex = 0;
    let timeoutId: number | undefined;

    const boop = () => {
      const step = cadenceRef.current[cadenceIndex];
      if (!step) {
        timeoutId = window.setTimeout(boop, TALKING_HEAD_BOOP_POLL_MS);
        return;
      }
      cadenceIndex += 1;
      if (document.visibilityState === "visible") {
        playTalkingHeadBoop(avatar);
      }
      timeoutId = window.setTimeout(boop, step.delayMs);
    };

    boop();
    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [avatar, enabled, speaking]);
}
