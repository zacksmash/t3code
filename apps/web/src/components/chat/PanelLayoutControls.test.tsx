import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vite-plus/test";

import { PanelLayoutControls } from "./PanelLayoutControls";

function renderControls(talkingHeadOpen: boolean) {
  return renderToStaticMarkup(
    <PanelLayoutControls
      liveAgentCount={0}
      onTalkingHeadOpenChange={vi.fn()}
      onToggleRightPanel={vi.fn()}
      onToggleTerminal={vi.fn()}
      rightPanelAvailable
      rightPanelOpen={false}
      rightPanelShortcutLabel={null}
      showTalkingHeadControl
      talkingHeadOpen={talkingHeadOpen}
      terminalAvailable
      terminalOpen={false}
      terminalShortcutLabel={null}
    />,
  );
}

describe("PanelLayoutControls", () => {
  it("offers a pressed talking-head toggle when the portrait is open", () => {
    const markup = renderControls(true);

    expect(markup).toContain('aria-label="Hide talking head"');
    expect(markup).toContain('aria-pressed="true"');
  });

  it("offers an unpressed talking-head toggle when the portrait is hidden", () => {
    const markup = renderControls(false);

    expect(markup).toContain('aria-label="Show talking head"');
    expect(markup).toContain('aria-pressed="false"');
  });
});
