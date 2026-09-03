import type { TalkingHeadAvatar } from "@t3tools/contracts/settings";
import { memo } from "react";

import type { TalkingHeadSpellCue } from "./TalkingHeadSpell.logic";

const SPELL_LABELS = {
  divination: "Divination!",
  cast: "Cast!",
  fizzle: "Fizzle!",
  victory: "Victory!",
} as const;

export const TalkingHeadSpellEffect = memo(function TalkingHeadSpellEffect({
  avatar,
  cue,
}: {
  readonly avatar: TalkingHeadAvatar;
  readonly cue: TalkingHeadSpellCue | null;
}) {
  if (cue === null) return null;

  return (
    <div
      aria-hidden="true"
      className="talking-head-spell"
      data-spell-avatar={avatar}
      data-spell-kind={cue.kind}
      key={cue.id}
    >
      <span className="talking-head-spell-flash" />
      <span className="talking-head-spell-rays" />
      <span className="talking-head-spell-ring" />
      <span className="talking-head-spell-core">
        <span className="talking-head-spell-glyph" />
      </span>
      <span className="talking-head-spell-particle" />
      <span className="talking-head-spell-particle" />
      <span className="talking-head-spell-particle" />
      <span className="talking-head-spell-particle" />
      <span className="talking-head-spell-particle" />
      <span className="talking-head-spell-particle" />
      <span className="talking-head-spell-particle" />
      <span className="talking-head-spell-particle" />
      <span className="talking-head-spell-label">{SPELL_LABELS[cue.kind]}</span>
    </div>
  );
});
