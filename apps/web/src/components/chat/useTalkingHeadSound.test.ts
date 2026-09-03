import { describe, expect, it } from "vite-plus/test";

import {
  buildTalkingHeadBoopCadence,
  talkingHeadBoopFrequency,
  talkingHeadBoopProfile,
} from "./useTalkingHeadSound";

describe("talking head dialogue sound", () => {
  it("groups blips within words and pauses at spaces", () => {
    const cadence = buildTalkingHeadBoopCadence("wizard speaks");

    expect(cadence.map((step) => step.delayMs)).toEqual([65, 130, 65, 130]);
  });

  it("rests longer after clauses and sentences", () => {
    const clause = buildTalkingHeadBoopCadence("yes,");
    const sentence = buildTalkingHeadBoopCadence("done!");

    expect(clause.at(-1)?.delayMs).toBe(180);
    expect(sentence.at(-1)?.delayMs).toBe(260);
  });

  it("gives the female classes a higher register than the male classes", () => {
    const femaleFrequencies = [
      talkingHeadBoopFrequency("archer"),
      talkingHeadBoopFrequency("healer"),
    ];
    const maleFrequencies = [talkingHeadBoopFrequency("knight"), talkingHeadBoopFrequency("rogue")];

    expect(Math.min(...femaleFrequencies)).toBeGreaterThan(Math.max(...maleFrequencies) * 2);
  });

  it("makes the wizard the deepest, longest class voice", () => {
    const wizard = talkingHeadBoopProfile("wizard");
    const otherAvatars = ["robot", "knight", "rogue", "slime", "archer", "healer"] as const;
    const otherProfiles = otherAvatars.map(talkingHeadBoopProfile);

    expect(wizard.frequencyHz).toBeLessThan(Math.min(...otherProfiles.map((p) => p.frequencyHz)));
    expect(wizard.durationSeconds).toBeGreaterThan(
      Math.max(...otherProfiles.map((p) => p.durationSeconds)),
    );
    expect(wizard.endFrequencyRatio).toBeLessThan(1);
  });

  it("uses distinct timbres for robotic, bubbly, and healing voices", () => {
    const robot = talkingHeadBoopProfile("robot");
    const slime = talkingHeadBoopProfile("slime");
    const healer = talkingHeadBoopProfile("healer");

    expect(robot.waveform).toBe("square");
    expect(robot.harmonic?.frequencyRatio).toBeCloseTo(2, 1);
    expect(slime.waveform).toBe("sine");
    expect(slime.endFrequencyRatio).toBeGreaterThan(1);
    expect(healer.waveform).toBe("sine");
    expect(healer.harmonic?.frequencyRatio).toBe(2);
  });
});
