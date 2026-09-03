import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { TalkingHead, TalkingHeadPortrait, talkingHeadFrameUrl } from "./TalkingHead";

describe("TalkingHead", () => {
  it("renders the selected avatar's three animation frames", () => {
    const markup = renderToStaticMarkup(<TalkingHead avatar="wizard" speaking />);

    expect(markup).toContain('data-talking-head="true"');
    expect(markup).toContain('data-speaking="true"');
    expect(markup).toContain("/talking-heads/wizard/closed.png");
    expect(markup).toContain("/talking-heads/wizard/half-open.png");
    expect(markup).toContain("/talking-heads/wizard/open.png");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("size-48");
    expect(markup).toContain("sm:size-64");
    expect(markup).toContain("translate-y-1");
    expect(markup).toContain("scale-[1.13]");
  });

  it("keeps the mouth frames inactive while idle", () => {
    const markup = renderToStaticMarkup(<TalkingHeadPortrait avatar="robot" speaking={false} />);

    expect(markup).toContain('data-speaking="false"');
    expect(markup).toContain('data-talking-head-frame="half-open"');
    expect(markup).toContain("opacity-0");
  });

  it("builds stable public asset URLs", () => {
    expect(talkingHeadFrameUrl("robot", "closed")).toBe("/talking-heads/robot/closed.png");
  });

  it("crops the robot portrait to the panel edges", () => {
    const markup = renderToStaticMarkup(<TalkingHead avatar="robot" speaking={false} />);

    expect(markup).toContain("scale-[1.18]");
    expect(markup).not.toContain(" p-1 ");
  });
});
