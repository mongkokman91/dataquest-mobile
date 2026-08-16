# Dataquest Mobile

Dataquest Mobile is an Android usability layer for `https://app.dataquest.io/*`. It runs in Violentmonkey on Chromium-based mobile browsers and leaves Dataquest responsible for lessons, execution, submission, progress, and results.

## Architecture

The hosted userscript injects three views:

- **READ** presents the detected instruction region at full mobile width.
- **CODE** presents a native `<textarea>`, avoiding Android's unreliable interaction with Dataquest's CodeMirror editing surface.
- **DQ** exposes Dataquest's own workspace and result UI.

Editor integration is isolated in a capability-based adapter. It discovers CodeMirror 5 or CodeMirror 6 APIs by behavior, synchronizes the native draft before every action, and then clicks Dataquest's visible Run or Submit control. A mutation observer re-detects regions and editor instances after React rerenders or lesson navigation. Drafts contain code only and are scoped to `location.pathname`.

Before applying page-region transformations, the script verifies that instruction and workspace regions both exist and are disjoint. If the layout is missing, shared, nested, or otherwise uncertain, Dataquest's page remains untouched and visible.

RUN and SUBMIT synchronize the native draft first, expose DQ view, then select an exact, rendered, enabled control from the detected execution workspace, excluding anything inside the instructions region even if it carries the same label. This avoids hidden duplicate/decoy controls and waits briefly for Dataquest to update disabled state after an editor change.

Activating a control does not rely on a bare `target.click()`: a dispatched click always bubbles to a document listener whether or not Dataquest's own handler ran, so that check alone can never distinguish success from a silently ignored tap. RUN/SUBMIT instead dispatch a realistic pointerdown/mousedown/pointerup/mouseup/click sequence (covering controls that only listen for pointer or mouse events) and then require an observed DOM mutation inside the execution workspace before reporting success. If no such postcondition occurs, the status explicitly says the action may not have reached Dataquest.

Runtime status is shown as a floating toast that stays visible in every view, including DQ, so an error is never hidden by switching away from CODE. A missing editor or action control, or an action that produced no observable state change, produces a visible error instead of a false "activated" message.

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

### Why the previous suite reported green while RUN/SUBMIT were unresponsive on real Android

v0.6.0 judged Run/Submit success by adding a document-level capture `click` listener and calling `target.click()`: that listener always fires once a dispatched click bubbles, regardless of whether Dataquest's own handler ever ran, so it could never detect a silently-ignored tap. Its status output also lived inside the CODE shell, which v0.6.0 hides the instant an action switches the view to DQ — so even a legitimate error message was invisible on the device. Neither defect was reachable from the old fixtures, because every simulated control listened for `click` and always mutated fixture state when clicked.

The suite now includes fixtures that reproduce the real-device failure shape directly: a control that receives and bubbles a genuine click yet changes no application state (`interaction: 'silent'`), and a control that only listens for `pointerup` and never fires from a bare click at all (`interaction: 'pointerup'`). Against v0.6.0 these fail (no true success/failure signal, and no delivery path for pointer-only controls); the current implementation passes both, plus a test asserting the status toast stays visible after RUN switches the view to DQ.

## Final Android acceptance test

After Violentmonkey updates the script, open one Dataquest lesson and complete this single flow: **READ → CODE → type normally → RUN → inspect the result in DQ → CODE → edit → SUBMIT**. Confirm the instructions, typed text, result, and submitted answer all correspond to the current lesson, and that the status toast (visible at the top of the screen in every view) reports "Run Code activated" / "Submit Answer activated" rather than an error.

## Security

The project stores only pathname-scoped code drafts in same-origin local storage. It does not read, copy, or persist passwords, cookies, session IDs, CSRF values, bearer tokens, or other credentials.
