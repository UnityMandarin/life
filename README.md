# Life

A small daily workspace combining Life's opening/closing rituals with Signal's focus, recovery, and reflection.

## Use

Open the site, choose one task, and begin. Prepare and Close are optional two-minute checklists. One completed action is enough to save a routine. Focus supports pause, recovery, finishing early, and five-minute extensions. Energy is subjective; low energy suggests five minutes. Challenge suggestions adjust after your reflection and always remain editable.

## Deployment

Static HTML, CSS, JavaScript, and original SVG artwork. No install, API key, build, analytics, remote fonts, or runtime dependencies. On GitHub: Settings → Pages → deploy from branch → main → / (root). The entry point is index.html. Keep life.css, life.js, and assets/ beside it.

For a local preview, run a static server from this folder, such as `python3 -m http.server 8765`, then open http://localhost:8765.

## Data

Stored in `life-daily-v1` in this browser. Existing Life routine completions and next action are read on first use. Original storage keys are never deleted. Signal v3 history on the same origin is read automatically; for the original file-based Signal website, export there, then import the JSON in Life Settings.

Settings exports a JSON backup. Import merges completed sessions by ID, routine history, and missing plans without replacing current work. An in-progress timer is kept in the current browser and is deliberately not activated from imported files. Site data is origin-specific, not synced across devices. Export regularly; clearing browser storage removes local records. Storage failures show an explicit warning.

The main page keeps no decorative animation loop, WebGL, or wall clock. The session timer refreshes once per second only while running and visible; elapsed time uses timestamps, so a hidden tab or reload does not reset it. Pauses and recovery time do not count as focus; a session stops at its planned duration until explicitly extended. Time is self-tracked, not proof of attention.

Previous tools remain in Settings, including the original homepage at classic.html. Those legacy pages retain their original behavior and heavier rendering.

## Design decisions and sources

- [Duolingo: improving the streak](https://blog.duolingo.com/improving-the-streak/): a small daily completion can reduce the barrier to returning. Life adapts this into a weekly trail, without penalties for missed days. This does not prove Life's effectiveness.
- [Duolingo design](https://design.duolingo.com/illustration/duo): simple recognizable illustration inspired the original geometric plant, sunrise, and moon. No Duolingo characters or assets are reused.
- [Apple layout guidance](https://developer.apple.com/design/human-interface-guidelines/layout): a clear hierarchy and familiar controls informed the restrained interface.
- [The Learning Scientists: retrieval practice](https://www.learningscientists.org/blog/2016/6/23-1): recall prompts in the routines encourage remembering before rereading.

Energy is a self-report, not a dopamine baseline. The app cannot measure neurotransmitters, diagnose attention problems, or guarantee motivation. Progress means recorded activity, not a medical or learning-outcome score.

## Verification

Behavioral browser checks are in tests/life.spec.cjs. They use Playwright and an existing local static server; set NODE_PATH to your Playwright installation if needed. No test dependencies ship to visitors. Layout checked at desktop and mobile widths; no external requests are needed for the new homepage.
