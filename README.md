# BlockCalc — review version

Anesthesia calculation tools with the original navy, blue and white appearance. This branch is for review before merging into `main`; see [REVIEW.md](REVIEW.md) for clinical scope and outstanding verification decisions.

## Included tools

- Local-anesthetic reference comparisons with complete-input validation and product-specific ceilings.
- Four-hour maintenance/fasting-deficit breakdown, including partial-duration totals.
- Allowable blood loss using either hemoglobin (g/dL) or hematocrit (%), with independent inputs and equivalent proportional calculations.
- Adult body measurements, explicitly selected burn-fluid protocols and a LAST emergency reference linked to ASRA.

No patient information is saved to local storage. Clearing the patient or activating an app update resets the session. Calculation outputs support review and do not supply patient-specific treatment decisions.

## Files

- `index.html`: page structure, labels and reference links.
- `styles.css`: responsive presentation.
- `calculations.js`: independently testable validation and arithmetic.
- `app.js`: patient state, input handling, results and navigation.
- `service-worker.js`: scoped offline app cache and explicit update activation.
- `manifest.json`: installable-app metadata.
- `tests/`: calculation and browser checks.

## Preview locally

Serve the repository with a local web server, for example:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. No build step is required. Production PWA features require HTTPS. Do not change the production deployment branch to review this version.

## Verification

Node.js 18 or newer is required for calculation tests:

```sh
npm test
```

Browser checks use Playwright and its Chromium browser:

```sh
npm install --no-save playwright
npx playwright install chromium
npm run test:browser
```

Alternatively set `PLAYWRIGHT_MODULE` to an installed Playwright module path. The browser test starts its own server at a project subpath, exercises input validation, Hb/HCT comparisons, unit switching, medication copying, responsive screens, offline reload and explicit cache updates. Screenshots go to ignored `test-artifacts/`.

## Offline updates

The application becomes available offline after a successful service-worker install. External clinical references are not cached. Keep an institutional emergency checklist separately.

For a release, update the service-worker cache version with the application assets. A waiting update is presented to the user and activates only after selection; activation reloads the page and clears current patient entries. Update timing depends on browser behavior and network access. Cache cleanup is limited to this app scope.

## Clinical review

Read `REVIEW.md` before release. Supported populations, route-specific limits, burn protocols, blood-volume factors, combined-agent comparisons and emergency workflows require local verification. Software tests do not establish clinical suitability. Main remains the production branch until the review is approved and merged.
