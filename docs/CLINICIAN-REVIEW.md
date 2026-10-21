# Independent clinical and usability acceptance — unsigned

Review date: ______ Reviewer/license/role: ______ Institution: ______ Candidate commit: ______

This worksheet is not a sign-off. An anesthesia clinician and pharmacist must review the primary sources and explain each accepted interpretation. No real patient information is needed.

| Synthetic adult case | Expected software behavior | Clinician agrees / notes |
|---|---|---|
| Age 40, 70 kg 4-2-1 |110 mL/hr, 2640 mL/24 h; 40+20+50 math; no fluid order | |
| Age 40, 100 kg |140 mL/hr, 3360 mL/24 h | |
| Age 18; 10/20 kg boundary arithmetic |40/60 mL/hr; verify low adult weight, not automatic plausibility | |
|70 kg NICE measured |1750–2100 mL/day; lower reference 1400–1750 | |
| Obesity, clinician-confirmed ideal 60 kg |NICE 1500–1800/day; 4-2-1 still explicitly measured weight | |
| Age 17.99, missing age, malformed dose |STOP; no complete calculation | |
| Lidocaine 1%, 10 mL |100 mg; separate selected-route reference | |
| Duplicate same-drug doses above lower limit |STOP; no cross-drug percentage | |
| Ropivacaine 0.5% major block, selected limit 300 mg |STOP; guide ceiling 250 | |
| EXPAREL infiltration 20 mL |266 mg; route cap 266 | |
| EXPAREL interscalene 10 mL vs 10.001 mL |133 mg within checks; excess STOP | |
| EXPAREL 133+HCl 66.5 vs 66.51 mg |Literal conservative ratio boundary; resolve manufacturer interpretation | |
| EXPAREL adductor 133+50 mg 0.5% HCl |20 mL; exact regimen; not labeled safe | |
| Adductor wrong concentration/timing/diluent |STOP outside checked regimen | |
| Local lidocaine 19.99 vs 20 min before EXPAREL |STOP before 20; no permission to mix or dose afterward | |
| Prior EXPAREL within 96 h or unknown |STOP additional local-anesthetic plan | |
| EXPAREL 266 mg final 300 mL |Conservative 0.89 floor STOP; resolve rounded 1:14 example | |
| Other block/drug/diluent; pregnancy unknown |STOP outside app scope | |
|70 kg LAST |Disclosed exact 70 weight-based convention; clinician must accept | |

## Timed provider tasks

Use a 390 px iPhone layout and a real iPhone. For each task, record completion time, result-interpretation time, errors, and teach-back. Target: result meaning understood within 3–5 seconds once displayed. This target has **not** been verified in a live provider session.

1. Enter age/weight in kg, then lb. Explain which weight is used.
2. Select drug, concentration and route. Read mg, mL, and mg/mL without mixing units.
3. Open “Show the math” and explain the steps.
4. Recognize excessive/unsupported input. Explain why STOP prevents using the plan.
5. Distinguish 4-2-1 from NICE and explain why neither is an automatic order.
6. Review EXPAREL/HCl. Explain why a passing ratio does not prove safety.
7. Clear entries, reload offline, open dated references and identify reference age.
8. Explain when bedside judgment or a specialist plan is required.

Anesthesia clinician signature/date: ______
Pharmacist signature/date: ______
Owner release decision: ______
