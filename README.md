# Dataquest Mobile

Mobile usability layer for Dataquest on Android, designed to run through Violentmonkey in Chromium-based browsers such as Microsoft Edge and Lemur.

## Current phase

The project starts with a diagnostic userscript that identifies Dataquest's instruction pane, code editor, viewport behavior, and keyboard-induced layout changes. After those selectors and measurements are confirmed, the same hosted script will evolve into the mobile READ/CODE layout.

## Install once

Install `dataquest-mobile.user.js` in Violentmonkey. It is a tiny loader that fetches the latest implementation from this repository on each Dataquest page load, so normal updates only require reloading Dataquest.

## Safety

- No Dataquest passwords, cookies, session IDs, CSRF tokens, or bearer tokens are stored here.
- The script only runs on `https://app.dataquest.io/*`.
- The first diagnostic version does not modify answer submission or Dataquest backend requests.
