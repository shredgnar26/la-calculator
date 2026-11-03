# Separate EXPAREL calculator — review candidate

Branch: feature/separate-exparel. Base: origin/main 6a2a61d (fetched November 3, 2026).
No merge or production deployment authorized or performed. Software verification is not clinical validation.

## Changed files and functions
- index.html: separate navigation/panel; assessExparel pure calculation, addExparelEntry and updateExparel UI. DRUGS and renderAgents exclude EXPAREL and its embedded HCl inputs. calculate removes universal 3 mg/kg pool and combined additional-dose suggestions, aggregates repeated same-drug entries, requires review for mixtures and blocks incomplete/invalid entries. getPatientData rejects nonfinite/nonpositive weight. No new runtime dependencies, backend or framework. Inline implementation preserves the existing offline asset footprint.
- tests/exparel.test.cjs: eight automated test groups covering the required references, multiple entries, input boundaries, partial doses, indications, adult/pediatric scope and conventional separation.
- tests/browser.cjs: Chromium browser checks, responsive widths, reactive results, invalid handling, indication blocking and conventional multi-entry checks; browser/server closed in finally.
- review/calculation-results.txt, browser-results.txt, preservation-results.txt: verification output.
- review/mobile-within.png and mobile-exceeded.png: 390 × 844 viewport, full-page captures inspected visually.
- review/REVIEW.md: this report.

## Verified examples
- 266 mg / 20 mL: 150 mg HCl reference.
- 133 mg / 10 mL: 75 mg HCl reference.
- 133 mg plus 25 mg HCl: 50 mg remaining; alternative equivalents 20.0 mL at 0.25%, 10.0 mL at 0.5%, 6.6 mL at 0.75%.
- 266 mg plus 151 mg HCl: red ADMIXTURE LIMIT EXCEEDED; remaining clamped to zero.
- Volumes round DOWN to 0.1 mL. The requested 6.7 mL approximation would correspond to 50.25 mg; this candidate displays 6.6 mL to avoid overstating the remainder.

## Clinical source verification and interpretation
- FDA labeling via DailyMed: https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=bb5a9e59-0f51-11df-8a39-0800200c9a66 — revised 11/2023; listing updated December 12, 2025; accessed November 3, 2026. Sections 1, 2.1–2.5, 4, 5.2 and 7.
- Current manufacturer administration guidance: https://www.exparelpro.com/dosing-and-administration — undated page, accessed November 3, 2026. Explicit 266→150 and 133→75 mg HCl examples. The nominal free-base milligrams and manufacturer HCl equivalence differ: 266→300 mg HCl equivalent, then half gives 150 mg. Partial infiltration uses proportional 7.5 mg HCl/mL undiluted EXPAREL, explicitly marked an interpretation, not an independently studied partial regimen or interchangeable dose.
- Archived manufacturer guide PP-EX-US-3217, 12/2017, page 5 explicitly describes molar equivalence: https://d2goghuftqbk1u.cloudfront.net/sites/default/files/EXPAREL_Pocket_Dosing_Guide_PP-EX-US-3217.pdf . Historical explanation only; its old indications/pediatric restrictions were NOT used as current guidance.
- Nerve-block results require the labeled 133 mg; adductor canal additionally requires 50 mg HCl at 0.5%, admixed (immediate-before entries do not satisfy that regimen). Generic 75 mg compatibility reference does not override the specific 50 mg regimen.
- Adult-only application scope retained; pediatric ages blocked, including labeled pediatric infiltration. Other/unsupported and contraindicated selections do not receive remainder results.
- Lidocaine-only ≥20-minute sequential guidance; no extension to other agents. The 96-hour precaution covers additional local anesthetics. Other-time/site HCl remains separate for cumulative review.

## Conventional audit and preserved scope
The old fraction-sum remainder table treated different local anesthetics as an interchangeable shared capacity and presented additional-dose allowances without validated mixture evidence. That table and the unsupported 3 mg/kg amide pool are removed. Repeated entries of the SAME drug now count toward one calculated drug maximum; mixtures receive clinical-review messaging even below individual limits. No calculated state says SAFE. Individual drug constants, concentration choices, patient risk multipliers, cards and dose breakdowns remain; those existing constants/multipliers were not independently clinically revalidated by this refactor.
Profile, 4-2-1, Parkland, ABL and LAST content/calculations unchanged (automated protected-panel/function comparison plus diff inspection). Existing unrelated production limitations are not cleared by this work.

## Checks and limits
Commands:
```
node --test tests/exparel.test.cjs
PLAYWRIGHT_MODULE=/path/to/installed/playwright node tests/browser.cjs
git diff --check
```
8/8 calculation groups pass. Chromium browser checks pass with zero page errors. No horizontal overflow at 390, 768 and 1440 px. Within and exceeded mobile screenshots visually inspected.
No physical mobile device, Safari/WebKit, offline/update acceptance or clinician/pharmacist sign-off performed. No new dependency installed. Temporary test browser and HTTP server closed. No worker resources launched. Main and the earlier clinical-validation worktree remain unchanged.
