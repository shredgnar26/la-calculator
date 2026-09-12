# Review branch — BlockCalc 2.0.0-review.1

This branch implements the approved clarity and calculation changes while preserving the original navy/blue/white appearance. It is not merged or approved for routine clinical deployment.

## Included

- ABL offers hemoglobin (g/dL) and hematocrit (%) with separately preserved inputs. Both use EBV × (initial − minimum) / initial. Equal values return zero; invalid or mixed-unit-like values are rejected. No automatic 3× conversion or blood-unit estimate.
- Four comparable hourly fluid rows, maintenance and deficit separately labeled, duration-specific totals including partial hours, and the agreed blood-loss side note.
- Missing lidocaine/chloroprocaine label ceilings enforced. Bupivacaine, mepivacaine and ropivacaine require a clinician-selected limit within the selected product/route ceiling. No unsupported fixed age/risk reduction or universal long-acting amide pool.
- Exparel uses 13.3 mg/mL, indication-specific references and a separate compatibility review. Bupivacaine HCl is entered as its own row and included in the full record and ratio check. No generic Exparel remaining-dose budget.
- Medication rows distinguish administered from proposed doses. Incomplete inputs block results; repeated drugs are aggregated with the lower selected limit. Copy includes doses, reference limits, procedure, warnings and sources.
- Adult body-size formulas have explicit age/height scope. Abbreviations are expanded, and predicted body weight is separate from ideal body weight. The universal 7 mL/kg tidal-volume target is removed.
- Burn protocols are explicit; injury elapsed time and previous resuscitation are accounted for. No automatic catch-up rate or arbitrary prehospital volume. Pediatric protocol input is clinician-prescribed, with no static age-independent body chart or adult timing default.
- LAST has visible initial actions, a directly linked ASRA checklist, weight-based/fixed lipid arithmetic, consistent pump-unit equivalents, persistent-instability instructions and event-specific observation wording.
- Shared measured patient weight, lossless unit switching until the user edits a value, clear invalid states, semantic controls, scoped offline caching and deliberate update activation.

## Clinical scope and decisions to verify before release

- Confirm local policy for dosing weight, supported procedures, patient-specific limits and combined-drug fraction comparisons. This version intentionally requires selected limits where a universal mg/kg default was not defensible.
- Conventional local-anesthetic references are adult infiltration/peripheral-block comparisons only. Other routes and pediatric conventional-agent protocols are not supplied. Exparel pediatric infiltration is scoped to 6–<17 years; adult references begin at 18. Age 17 remains a documented unsupported boundary pending protocol clarification rather than an inferred dose.
- Exparel compatibility still requires clinical review of timing, sites and label-specific concomitant-use instructions. Aggregate 1:2 checking is conservative and does not infer sites from a medication list.
- Confirm the traditional fasting-deficit method is appropriate locally. Blood-loss replacement is not an automatic ratio calculation.
- Verify ABL blood-volume factors for the actual population. No minimum Hb or HCT is preselected. The linear formula is an approximation, not a transfusion threshold.
- Confirm burn protocol population, coefficient and bedside titration process. Pediatric timing and maintenance/glucose support remain clinician-directed.
- Adult measurements support height ≥152.4 cm; shorter adults require an alternative method. Adjusted-weight values have no automatic medication indication.
- ASRA 2020 v1.1 is the published checklist checked on 2026-09-12; the ASRA page expects an update in early 2027. The 70 kg boundary uses weight-based arithmetic and is labeled explicitly. Verify the complete rescue workflow with local clinicians.

## Sources

Product labels are linked on each medication card and in Settings. The app also links the ABL method, NICE fluid principles, ABA adult burn guideline and ASRA checklist beside the relevant calculation. Formula/reference review date: 2026-09-12. External references are not bundled offline; keep an institutional emergency checklist separately.

## Review workflow

Run `npm test` for pure calculation checks and `npm run test:browser` with Playwright available (see README). Review this branch in a local preview before merging. Keep production on `main`. Clinical sign-off and broader device testing remain separate from software test results.
