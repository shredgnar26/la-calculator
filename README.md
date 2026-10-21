# BlockCalc — adult review candidate

A lightweight, offline-first anesthesia reference for adults 18+. No backend, patient storage, analytics, or runtime dependencies. This candidate is **not clinically validated** and must not be deployed until independent clinician/pharmacist review and owner approval.

The isolated branch `feature/blockcalc-clinical-validation` builds on existing review commit 9886d74 (PR 5). Main and the original checkout are preserved. No merge or deployment is part of this work.

## Tools

- Historical 4-2-1 hourly estimate and 24-hour arithmetic; separate NICE adult maintenance reference and weight choice. No NPO deficit replacement.
- Local-anesthetic dose checks by drug, concentration and route; same-drug cumulative totals. No shared toxicity-equivalence budget.
- EXPAREL route, timing, compatibility and conservative mixing/dilution checks. Unsupported regimens stop.
- Retained adult simple blood-loss, body-size, burn-fluid and LAST reference tools, with limitations.

## Review and evidence

- [Clinical evidence matrix](docs/CLINICAL-EVIDENCE.md)
- [Offline adult clinical notes](references.html)
- [Safety findings and release gates](REVIEW.md)
- [Deployment checklist](docs/DEPLOYMENT-CHECKLIST.md)
- [Clinician/usability review worksheet](docs/CLINICIAN-REVIEW.md)
- [Validation results](docs/VALIDATION.md)
- [Plain-language review](docs/PLAIN-LANGUAGE.md)

`calculations.js` holds pure arithmetic and validation; `app.js` renders inputs/results. `index.html`/`styles.css` provide accessible mobile screens. The service worker caches app files and dated clinical notes at the current path. Updates activate only when the user selects them, then clear entries. No patient-identifying fields are provided. All data stay in memory; the copy button writes only at the user's request.

## Local checks

Node 18+:

```sh
npm test
```

Browser tests require an existing Playwright installation with Chromium and WebKit. They start and close their own loopback server and browsers. No package is required by the app.

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright npm run test:browser
```

Use `BROWSER_ENGINES=chromium` to run only that engine. Screenshots and machine-readable results are saved in ignored `test-artifacts/`; review copies are in `docs/screenshots/`.

For manual local review, serve the directory using a loopback-only static server. Stop that server after review. Production PWA installation requires HTTPS. Real iPhone Home Screen installation and provider timing/comprehension testing remain clinician/device acceptance gates.
