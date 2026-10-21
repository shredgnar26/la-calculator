# BlockCalc 2.1.0-review.1 — medication-safety review

Verified 2026-10-21. **Not clinically validated. Not approved for routine use.** Software tests check implementation; independent clinician/pharmacist review must validate the rule set, representative cases and intended workflow.

## Changes from the working baseline

The clean existing review branch at 9886d74 passed 19 unit tests, yet retained unsafe assumptions: an automatic fasting-deficit schedule, under 18 paths, cross-drug dose fractions, permissive route/concentration combinations, and warning-only exceeded limits. This candidate removes those assumptions while retaining the existing adult tools and offline architecture.

Age is required for every clinical calculation. No child protocols or dose paths remain. Invalid or incomplete entries clear results. Exceeded checked limits and unsupported combinations show STOP and disable copying. A completed check says “Within the checked limits”; it never establishes safety.

## Clinical restrictions that require sign-off

- **EXPAREL ratio:** conservative literal HCl mg ≤ EXPAREL mg/2. Manufacturer salt-equivalence examples 150/266 and 75/133 differ. The app labels its stricter limit; clinician/pharmacist must resolve the interpretation before release.
- **EXPAREL dilution:** exact 0.89 mg/mL floor is stricter than rounded 1:14 examples. All admixture volume counts; HCl injected separately does not. This can reject the manufacturer 300 mL example. No automatic override exists.
- **EXPAREL scope:** one administration/site, exact approved perineural regimen, adductor 133 mg+50 mg 0.5% HCl 20 mL. Pregnancy/unknown pregnancy, prior EXPAREL within 96 hours/unknown history, unsupported routes, unknown timing, and nonbupivacaine mixtures stop. These are conservative app limits, not assertions that every excluded regimen is contraindicated. Label-specific companion analgesia needs independent assessment.
- **Conventional drugs:** guide ceilings are not universally tolerated doses. Clinician-selected limits are required for bupivacaine, mepivacaine and ropivacaine. Lidocaine/chloroprocaine references assume the specified adult population and product. The app does not validate allergies, technique, organ function, site absorption, all unentered doses, or an appropriate dosing weight.
- **Different drugs:** conventional combinations are outside this app’s checked scope. Positive doses of different drugs stop, except EXPAREL/HCl under its separate rules. Lidocaine, bupivacaine and mepivacaine labels warn against other local-anesthetic combinations.
- **Cumulative doses:** all entered same-drug rows are summed against the lowest selected per-procedure limit. This is conservative across separate procedures. It does not manage repeat-dose intervals, 24-hour ledgers, continuous infusions, or clinical recovery between doses. Never interpret missing entries as no prior dose.
- **Fluids:** 4-2-1 is historical arithmetic. NICE is a separate general hospital maintenance reference, not an automatic perioperative order; pregnancy, severe organ disease, burns, diabetes and other specialist populations need their own plans. No bolus or deficit replacement is inferred.
- **Simple blood-loss model:** starting-denominator linear approximation, not a transfusion trigger or dilution-corrected measurement. Hb/Hct equal proportional changes yield equal arithmetic; that does not validate converting one lab to the other. The selected factor and minimum are clinician choices.
- **Body size:** not a drug dosing decision. Devine below 152.4 cm is outside app scope. LBW study-range warnings limit extrapolation. Unsupported universal adjusted-weight and category interpretations are removed.
- **Adult burns:** initial estimates only; current ABA 2 mL/kg/% supports adults with ≥ 20% TBSA. Historical Parkland 4 is explicit. Titrate clinically; no automatic catch-up rate.
- **LAST:** full institutional emergency process remains required. ASRA 2020 v1.1 has under/over 70 groups; exactly 70 kg uses a disclosed weight-based app convention requiring clinician acceptance. This app cannot replace rescue readiness or the full checklist.

## Human acceptance is still open

An independent licensed anesthesia clinician and pharmacist must sign `docs/CLINICIAN-REVIEW.md`. A second AI/software review is independent of the implementation author but is not a clinician review. Provider 3–5 second comprehension and real iPhone testing have not been demonstrated by automated browser checks.

Full source links need network access; dated adult rule summaries and the unmodified ASRA checklist work offline after installation. Clinical rules do not automatically update while offline. Verify the reference date and current product label before use. No patient entries persist after reload, reset or update.

See [the evidence matrix](docs/CLINICAL-EVIDENCE.md) for source/section mapping and [validation results](docs/VALIDATION.md) for actual checks.
