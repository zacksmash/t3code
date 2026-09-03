import type { TalkingHeadAvatar } from "@t3tools/contracts/settings";
import { memo } from "react";

import { cn } from "~/lib/utils";
import type { TalkingHeadSpellCue } from "./TalkingHeadSpell.logic";
import { TalkingHeadSpellEffect } from "./TalkingHeadSpellEffect";

export const TALKING_HEAD_AVATARS = [
  { value: "robot", label: "Robot" },
  { value: "wizard", label: "Wizard" },
  { value: "knight", label: "Knight" },
  { value: "rogue", label: "Rogue" },
  { value: "slime", label: "Slime" },
  { value: "archer", label: "Archer" },
  { value: "healer", label: "Healer" },
] as const satisfies ReadonlyArray<{ value: TalkingHeadAvatar; label: string }>;

const TALKING_HEAD_EDGE_CLASSES: Record<TalkingHeadAvatar, string> = {
  robot: "scale-[1.18]",
  wizard: "translate-y-1 scale-[1.13]",
  knight: "scale-[1.04]",
  rogue: "scale-[1.04]",
  slime: "scale-[1.04]",
  archer: "scale-[1.04]",
  healer: "scale-[1.04]",
};

export type TalkingHeadFrame = "closed" | "half-open" | "open";

export function talkingHeadFrameUrl(avatar: TalkingHeadAvatar, frame: TalkingHeadFrame): string {
  return `/talking-heads/${avatar}/${frame}.png`;
}

export const TalkingHeadPortrait = memo(function TalkingHeadPortrait({
  avatar,
  speaking,
  className,
}: {
  readonly avatar: TalkingHeadAvatar;
  readonly speaking: boolean;
  readonly className?: string;
}) {
  const imageClassName = "absolute inset-0 size-full object-contain [image-rendering:pixelated]";

  return (
    <div
      aria-hidden="true"
      className={cn("relative overflow-hidden", className)}
      data-speaking={speaking ? "true" : "false"}
      data-talking-head-portrait
    >
      <img
        alt=""
        aria-hidden="true"
        className={imageClassName}
        draggable={false}
        src={talkingHeadFrameUrl(avatar, "closed")}
      />
      <img
        alt=""
        aria-hidden="true"
        className={cn(imageClassName, "opacity-0")}
        data-talking-head-frame="half-open"
        draggable={false}
        src={talkingHeadFrameUrl(avatar, "half-open")}
      />
      <img
        alt=""
        aria-hidden="true"
        className={cn(imageClassName, "opacity-0")}
        data-talking-head-frame="open"
        draggable={false}
        src={talkingHeadFrameUrl(avatar, "open")}
      />
    </div>
  );
});

export const TalkingHead = memo(function TalkingHead({
  avatar,
  speaking,
  spellCue = null,
}: {
  readonly avatar: TalkingHeadAvatar;
  readonly speaking: boolean;
  readonly spellCue?: TalkingHeadSpellCue | null;
}) {
  const edgeToEdgeClassName = TALKING_HEAD_EDGE_CLASSES[avatar];

  return (
    <div
      aria-hidden="true"
      className="talking-head-shell pointer-events-none absolute top-3 right-3 z-10 size-48 overflow-hidden rounded-sm border-2 border-border bg-card/95 shadow-lg sm:size-64"
      data-spell-active={spellCue === null ? "false" : "true"}
      data-spell-avatar={avatar}
      data-spell-kind={spellCue?.kind}
      data-talking-head
    >
      <div className="relative size-full overflow-hidden bg-muted/50">
        <TalkingHeadPortrait
          avatar={avatar}
          speaking={speaking}
          className={cn("size-full", edgeToEdgeClassName)}
        />
        <TalkingHeadSpellEffect avatar={avatar} cue={spellCue} />
        <div className="absolute inset-0 z-20 border border-foreground/20 shadow-[inset_0_0_0_2px_var(--color-background)]" />
      </div>
    </div>
  );
});
