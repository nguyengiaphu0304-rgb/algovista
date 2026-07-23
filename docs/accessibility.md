# Accessibility contract

AlgoVista uses the verified trace as the only source for visual values, status text and live-region
announcements. The presentation does not recompute an algorithm result.

## Automated evidence

- Native labels, headings, buttons, progress and an ordered-list fallback remain available without
  relying on color.
- Active values include both a border treatment and explicit accessible names.
- Graph nodes, edges, visited order and frontier use native lists. Each node exposes a textual state,
  while current, visited and frontier states also use distinct border styles.
- Arrow keys move one step, Space toggles playback and Home/End navigate boundaries when focus is
  outside an editable control.
- Keyboard shortcuts are ignored inside inputs and selects.
- The layout switches to one column below 48rem and is checked at a 640 CSS-pixel viewport as an
  equivalent 200% reflow test for a 1280-pixel desktop viewport.
- Chromium tests exercise validation, disabled controls, focus, keyboard operation, reduced-motion
  media, numeric/graph mode switching and serious/critical axe-core rules.

## Manual checks not yet claimed

Automated checks do not prove usability with every assistive technology. A v1.0 release still requires
manual sessions with current NVDA/Firefox and VoiceOver/Safari, browser zoom at 200% and 400%, forced
colors, high contrast, and multiple viewport/input combinations. Results must record browser,
assistive-technology version, date and any residual issue.
