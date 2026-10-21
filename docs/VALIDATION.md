# Software validation and independent safety review

Verification date: 2026-10-21. Candidate version: 2.1.0-review.1.

**Not clinically validated.** The independent reviewer was an AI/software reviewer, not a licensed clinician. No real patients, clinical outcome study, or provider timing study were used.

## Baseline and isolation

Original checkout at `9886d74` on `review/clear-calculators-hb-abl` was clean and passed 19 unit tests. Baseline browser checks passed, including 21 responsive views, offline reload, deliberate update activation and unrelated-cache preservation. The dedicated branch/worktree is `feature/blockcalc-clinical-validation`; it retains the existing PR5 foundation. Main and the original working checkout remain preserved.

## Final automated evidence

- Pure-function, safety-regression, offline-source/privacy/configuration and scan-first copy tests: **42 passed, 0 failed, 0 skipped**.
- Chromium 151.0.7922.34 / Playwright 1.62.1: **89 checks passed**.
- WebKit 26.6 / Playwright 1.63.0: **89 checks passed**.
- Browser checks cover 7 panels at 320/375/390/430/768 pixels, 44 px minimum controls, immediate recalculation, dose/route/unit display, one-tap result access, invalid/excessive/unsupported inputs, copy content, reset and no patient persistence.
- Offline checks stop the actual loopback origin and verify it is unreachable. Chromium also enables browser offline emulation. Both engines then open a new page and verify: calculator, dated clinical notes and complete ASRA PDF. Update waits for the user, activates the new version, clears entries and preserves an unrelated cache.
- No external application requests or JavaScript page errors are allowed by the browser assertions. Clipboard content is checked with a mock; native clipboard permission behavior is not claimed.

Application code commit: `30a6ff4`; no runtime dependency additions.

Machine-readable browser results and selected screenshots are retained in `docs/test-results/` and `docs/screenshots/`. Full logs and resource receipts are retained in the workspace checkpoint. No new runtime dependencies were installed.

## Independent findings and resolution

| Finding | Resolution and regression evidence |
|---|---|
| EXPAREL missing row/total limit displayed as 0 mg | Route limit propagates through engine, UI and copy; missing values display unavailable. |
| Missing HCl timing could pass without an HCl row | All timing choices required; presence and timing must agree. |
| Already-given EXPAREL plus planned HCl could pass | Planned anesthetic after given EXPAREL stops. Same-syringe doses require matching status. |
| HCl route could disagree with EXPAREL | Route context must match. |
| Unsupported conventional-drug pairs could pass separate limits | All distinct conventional combinations stop; only EXPAREL/HCl has a separate compatibility path. No shared toxicity fraction. |
| Prior lidocaine interval implied broader review | Visible warning states the earlier dose and total toxicity risk were not checked. |
| Drug changes retained stale volume/status | Drug changes clear dependent entries and EXPAREL checks. |
| Critical warnings hidden in details | Cautions remain visible after the result; one-tap STOP/result access. |
| Height conversion bypassed strict decimal parsing | UI validates before unit conversion; browser malformed-height case. |
| Undersized menu and WebKit select targets | Explicit minimum button and native-control dimensions; cross-engine checks. |

After corrections, the independent static reviewer reported no remaining blocking code defect in the reviewed paths. This is bounded source review, not proof that every possible input or clinical circumstance is safe.

## Clinical and device gates

- Clinician/pharmacist must resolve EXPAREL salt-equivalence ratio and rounded-dilution interpretation; candidate checks are intentionally stricter.
- Confirm supported formulations/routes, dosing weight, patient exclusions, retained formula assumptions and exactly 70 kg LAST convention.
- Full-text access limitations for some historical primary equations and NICE direct pages remain documented in the evidence matrix.
- Real iPhone Safari/Home Screen behavior, rotation, text zoom, native clipboard permissions, one-handed use and timed provider teach-back remain unverified.
- The six-message readability sample is approximately grade 4; it does not establish reading grade or comprehension for every medical term. See [plain-language review](PLAIN-LANGUAGE.md).
- No merge or deployment is authorized. Vercel Git deployment is disabled for this candidate branch; GitHub Pages uses main. Recheck release triggers before any later approved merge.

Use [the clinician worksheet](CLINICIAN-REVIEW.md) and [deployment checklist](DEPLOYMENT-CHECKLIST.md) to record acceptance.

## Browser-harness limits and resolved diagnostics

WebKit `setOffline(true)` failed with an internal error matching [Playwright issue42775](https://github.com/microsoft/playwright/issues/42775). The origin-stopped test verifies server unavailability; it is not a claim that all network-offline modes are identical. Real-device offline acceptance remains open.

In the longer WebKit lifecycle, a synthetic `new Response` fixture resolved its cache write but left no request entries. A clean minimal fixture did not reproduce that behavior. The final test caches a real manifest response in a distinct named cache, asserts its exact payload before update, then verifies the same cache and payload afterward. Both engines pass this stronger, specific preservation check. No application service-worker change was made to hide these test-environment failures. Earlier logs and the corrected diagnostic note remain in the local checkpoint.
