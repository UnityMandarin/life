# Life / Return

Return is the homepage: one task, a concrete finish condition, a focus block, a fast recovery path, and real rest. There are no accounts, runtime dependencies, remote fonts, analytics, or external requests in the primary experience.

## The loop

1. Name one task and an observable finish condition. Choose focus and rest minutes.
2. During focus, the task, finish condition, and remaining time stay visible.
3. **I'm stuck** pauses the focus clock. Choose a reason, do one small recovery action, and return directly. Recovery time does not count as focus time.
4. A completed focus block leaves the task unfinished. **Start rest** starts the full earned break when you choose it; an app suspension does not consume a break you never started.
5. Rest is a separate screen. When it ends, the same unfinished task and finish condition return. The next focus block requires your click.
6. **Task finished** asks you to confirm the finish condition. Only that confirmation closes the task. Completing early grants rest but does not count an uncompleted focus block.

A real interruption can pause the block and save where to pick up. There is no new-task button while an unfinished task is active.

## Timer and persistence

The primary source is `index.html`, `return.css`, and `return.js`. `return.html` forwards to the same homepage, so both entry points share one state, stored under `life-return-v2` on the current browser origin.

The countdown uses a timestamp deadline, not accumulated interval ticks. Returning from a hidden tab, reload, or ordinary suspension reconciles the actual remaining time. Only one visible focus/rest countdown is scheduled. Recovery and interruption time are excluded. Rest does not automatically start a new focus block. Timer updates do not write storage or render the entire view.

Switching to another tab or app may be legitimate work. Return keeps the allotted focus clock running and offers a short return cue; it cannot tell which external app or website you used, verify attention, or block external software. Its completed-block records mean elapsed self-tracked blocks, not proof of focused attention.

State changes and drafts are saved locally; another open Return tab receives changes. Storage failures show a persistent warning. Tools provides backup export and conservative import. Imported backups never replace a current active task or silently start an imported timer. Browser data is not synced across devices. Export before clearing browser data or switching devices.

Existing unfinished Return and daily-planner sessions are migrated conservatively. Missing finish conditions must be supplied before work resumes. Original storage keys and older records remain intact. A legacy session summary is not treated as proof of task completion.

## Other pages

- `menu.html`: the existing 27 bookmarks, search, and saved favorites with a lightweight layout. Favorite/recents storage keys are retained; third-party favicon requests and 3D rendering are removed.
- `stoplook.html`: a quiet reminder to return to physical work.
- `daily.html`: the previous daily planner, using the unchanged `life.js` and `life.css`.
- `classic.html`: earlier morning/night rituals and their saved state.
- `security.html`: the legacy optional puzzle. It does not protect or encrypt local data. Its automatic 3D startup is removed.

Archived daily/ritual tools retain their earlier behavior and can be opened deliberately from Tools.

## Preview and deployment

This is a buildless static site. Serve the directory with `python3 -m http.server 8765 --bind 127.0.0.1`, then open `http://127.0.0.1:8765/`.

GitHub Pages uses `main` at the repository root. Keep all source and assets beside `index.html`.

## Verification

Run `node tests/life.spec.cjs` with Playwright available via `NODE_PATH` or `PLAYWRIGHT_MODULE`, and the local server running. `LIFE_URL` can point the Return suite at a different served root. `tests/daily.spec.cjs` separately checks the preserved daily planner.

The main suite covers focus accuracy, recovery/reload, focus-versus-task completion, full rest, same-task return, navigation/suspension, completion at a deadline, migration, multiple tabs, narrow layouts, secondary tools, and unavailable storage. Human use is still needed to judge how well this interrupts the user's real abandonment pattern.
