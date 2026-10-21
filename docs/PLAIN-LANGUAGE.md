# Plain-language and usability review

Reviewed 2026-10-21 by the implementation coordinator and an independent AI/software reviewer. This is not a provider study or licensed clinical review.

The copy review covered the complete authored message surfaces: `index.html`, `app.js`, `calculations.js`, and `references.html`, including invalid-input errors, STOP reasons, optional explanations, copied summaries, reset/offline/update messages and the retained adult tools. Drug names, route names, units and essential clinical distinctions remain exact.

| Surface | Review decision |
|---|---|
| Shared age and weight | Explicit adult scope, units and measured-weight basis; no saved patient data. Invalid entries clear results. |
| Local dose and EXPAREL results | Large mg result, mL and mg/mL math, selected route and limit, qualified passing status, visible caution. STOP has an action and does not depend on color. |
| Timing, prior drugs and compatibility | Short instructions name what must be checked. A passing interval or ratio is not a whole-regimen safety assessment. |
| 4-2-1 and NICE | Result first; three simple tiers; separate guideline range and weight choice; no automatic order or fasting replacement. |
| Blood loss, body size, burns and LAST | Formula and purpose stated; clinician-selected inputs are explicit; emergency checklist remains available offline. |
| Offline, copy and update | Short outcomes; user chooses copying/update; update and reset clear entries. |
| Source notes | Dated, expandable or separate from the main result. Technical source terms and precise preparation rules are preserved. |

The automated scan-first sample contains six exact explanations (75 words, 13 short sentences). A simple Flesch–Kincaid syllable estimate gives grade **3.8**, approximately grade 4. This heuristic applies only to that sample. It does not establish a grade for every drug name, equation, warning or source document. The test caps these scan-first sentences at 18 words and checks STOP/action language and the qualified passing label.

Automated mobile tasks cover entry, concentration/route selection, units, immediate changes, invalid inputs, a one-tap result jump, math access, touch targets and overflow. Screenshots receive visual review. Browser automation does not establish comprehension, one-handed use on real hardware, or the 3–5 second target. Use the unsigned [provider worksheet](CLINICIAN-REVIEW.md) for timed interpretation and teach-back before release.
