import { renderToStaticMarkup } from "react-dom/server";
import type { TalkingHeadAvatar } from "@t3tools/contracts/settings";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

const state = vi.hoisted(() => ({
  settings: {
    talkingHeadEnabled: true,
    talkingHeadAvatar: "wizard" as TalkingHeadAvatar,
    talkingHeadSoundEnabled: true,
  },
  updateSettings: vi.fn(),
}));

vi.mock("~/hooks/useSettings", () => ({
  useClientSettings: (selector: (settings: typeof state.settings) => unknown) =>
    selector(state.settings),
  usePrimarySettingsAvailable: () => true,
  useUpdateClientSettings: () => state.updateSettings,
}));

import { TalkingHeadSettings } from "./TalkingHeadSettings";

describe("TalkingHeadSettings", () => {
  beforeEach(() => {
    state.updateSettings.mockClear();
    state.settings.talkingHeadEnabled = true;
    state.settings.talkingHeadAvatar = "wizard";
    state.settings.talkingHeadSoundEnabled = true;
  });

  it("shows the persisted enable state and every avatar choice in a responsive grid", () => {
    const markup = renderToStaticMarkup(<TalkingHeadSettings />);

    expect(markup).toContain('aria-label="Show talking head"');
    expect(markup).toContain('aria-checked="true"');
    expect(markup).toContain('aria-label="Play talking head sounds"');
    for (const avatar of ["robot", "wizard", "knight", "rogue", "slime", "archer", "healer"]) {
      expect(markup).toContain(`value="${avatar}"`);
      expect(markup).toContain(`/talking-heads/${avatar}/closed.png`);
    }
    expect(markup).toContain("grid-cols-4");
  });

  it("marks the selected avatar's native radio", () => {
    const markup = renderToStaticMarkup(<TalkingHeadSettings />);

    expect(markup).toMatch(/checked=""[^>]*value="wizard"|value="wizard"[^>]*checked=""/);
  });
});
