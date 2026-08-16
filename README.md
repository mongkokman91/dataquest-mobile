# Dataquest Mobile

Dataquest Mobile is an Android usability layer for `https://app.dataquest.io/*`. It runs in Violentmonkey on Chromium-based mobile browsers and leaves Dataquest responsible for lessons, execution, submission, progress, and results.

## Architecture

The hosted userscript injects three views:

- **READ** presents the detected instruction region at full mobile width.
- **CODE** presents a native `<textarea>`, avoiding Android's unreliable interaction with Dataquest's CodeMirror editing surface.
- **DQ** exposes Dataquest's own workspace and result UI.

Editor integration is isolated in a capability-based adapter. It discovers CodeMirror 5 or CodeMirror 6 APIs by behavior, synchronizes the native draft before every action, and then clicks Dataquest's visible Run or Submit control. A mutation observer re-detects regions and editor instances after React rerenders or lesson navigation. Drafts contain code only and are scoped to `location.pathname`.

Before applying page-region transformations, the script verifies that instruction and workspace regions both exist and are disjoint. If the layout is missing, shared, nested, or otherwise uncertain, Dataquest's page remains untouched and visible.

RUN and SUBMIT synchronize the native draft first, expose DQ view, then select an exact, rendered, enabled control from the detected execution workspace. This avoids hidden duplicate controls and waits briefly for Dataquest to update disabled state after an editor change.

Runtime status is shown at the top of CODE view. A missing editor or action control produces a visible error instead of silently losing code.

## Install and updates

Install [`dataquest-mobile.user.js`](dataquest-mobile.user.js) once in Violentmonkey. Its `@updateURL` and `@downloadURL` point to GitHub Pages, so normal releases arrive through Violentmonkey's update flow without manual script replacement.

## Automated mobile validation

The Playwright fixture reproduces Dataquest's outer vertical split, inner horizontal split, instructions, CodeMirror API, results, and action controls. It also exercises a structurally different rerendered workspace.

```sh
npm install
npx playwright install chromium
npm test
```

Tests run in Android Chromium at 360×604 with DPR 3 and desktop Edge-compatible Chromium at 1900×1120. They cover repeated READ/CODE/DQ switching, native typing, route-specific draft restoration, Run/Submit synchronization, results access, React-style rerenders and SPA navigation, keyboard-sized viewport contraction, duplicate prevention, shared-container blank-page prevention, unknown-layout fallback, and storage safety.

## Final Android acceptance test

After Violentmonkey updates the script, open one Dataquest lesson and complete this single flow: **READ → CODE → type normally → RUN → inspect the result in DQ → CODE → edit → SUBMIT**. Confirm the instructions, typed text, result, and submitted answer all correspond to the current lesson.

## Security

The project stores only pathname-scoped code drafts in same-origin local storage. It does not read, copy, or persist passwords, cookies, session IDs, CSRF values, bearer tokens, or other credentials.
