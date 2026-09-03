import type { TalkingHeadAvatar } from "@t3tools/contracts/settings";

import { useClientSettings, useUpdateClientSettings } from "~/hooks/useSettings";
import { TALKING_HEAD_AVATARS, talkingHeadFrameUrl } from "~/components/chat/TalkingHead";
import { prepareTalkingHeadSound } from "~/components/chat/useTalkingHeadSound";
import { Switch } from "~/components/ui/switch";
import { searchableSetting } from "./settingsSearch";
import { SettingsRow, SettingsSection } from "./settingsLayout";

export function TalkingHeadSettings() {
  const enabled = useClientSettings((settings) => settings.talkingHeadEnabled);
  const avatar = useClientSettings((settings) => settings.talkingHeadAvatar);
  const soundEnabled = useClientSettings((settings) => settings.talkingHeadSoundEnabled);
  const updateSettings = useUpdateClientSettings();

  const selectAvatar = (talkingHeadAvatar: TalkingHeadAvatar) => {
    updateSettings({ talkingHeadAvatar });
  };

  const setEnabled = (talkingHeadEnabled: boolean) => {
    if (talkingHeadEnabled && soundEnabled) prepareTalkingHeadSound();
    updateSettings({ talkingHeadEnabled });
  };

  const setSoundEnabled = (talkingHeadSoundEnabled: boolean) => {
    if (talkingHeadSoundEnabled) prepareTalkingHeadSound();
    updateSettings({ talkingHeadSoundEnabled });
  };

  return (
    <SettingsSection id="talking-head" title="Talking head">
      <SettingsRow
        {...searchableSetting("talking-head-enabled")}
        description="Show a pixel-art portrait in the conversation while you work with an agent."
        control={
          <Switch
            aria-label="Show talking head"
            checked={enabled}
            onCheckedChange={(checked) => setEnabled(Boolean(checked))}
          />
        }
      />
      <SettingsRow
        {...searchableSetting("talking-head-avatar")}
        description="Choose the character shown on this client."
        control={
          <fieldset className="w-full sm:w-72">
            <legend className="sr-only">Talking head avatar</legend>
            <div className="grid grid-cols-4 gap-2">
              {TALKING_HEAD_AVATARS.map((option) => (
                <label key={option.value} className="min-w-0 cursor-pointer">
                  <input
                    checked={avatar === option.value}
                    className="peer sr-only"
                    name="talking-head-avatar"
                    onChange={() => selectAvatar(option.value)}
                    type="radio"
                    value={option.value}
                  />
                  <span className="flex w-full flex-col items-center gap-1.5 rounded-lg border border-border bg-muted/35 px-2 py-2 text-xs font-medium text-muted-foreground transition-colors peer-checked:border-primary peer-checked:bg-primary/8 peer-checked:text-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                    <img
                      alt=""
                      aria-hidden="true"
                      className="size-10 object-contain [image-rendering:pixelated] sm:size-12"
                      draggable={false}
                      src={talkingHeadFrameUrl(option.value, "closed")}
                    />
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        }
      />
      <SettingsRow
        {...searchableSetting("talking-head-sound")}
        description="Play a quiet retro dialogue blip while the portrait is talking."
        control={
          <Switch
            aria-label="Play talking head sounds"
            checked={soundEnabled}
            onCheckedChange={(checked) => setSoundEnabled(Boolean(checked))}
          />
        }
      />
    </SettingsSection>
  );
}
