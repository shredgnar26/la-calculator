# Deployment readiness

Candidate-only. No merge or deployment authorized.

- [x] Dedicated feature branch/worktree; original application preserved.
- [x] 42 unit/safety tests and 89 browser checks per engine passed.
- [x] Independent software safety review completed; identified blockers corrected.
- [x] Dated evidence matrix, offline notes, screenshots and review worksheet prepared.

- [ ] Independent licensed anesthesia clinician signs the rule matrix and representative cases.
- [ ] Pharmacist resolves EXPAREL listed-mg/salt-equivalence and dilution-rounding interpretations.
- [ ] Institution accepts exact supported routes, product formulations, dosing-weight selection and patient exclusions.
- [ ] Clinician accepts retained ABL/body-size/burn/LAST assumptions, including 70 kg LAST boundary.
- [ ] Providers complete timed tasks and teach-back; confirm results can be understood in 3–5 seconds after entry.
- [ ] Real iPhone Safari/Home Screen installation, offline relaunch, rotation, text zoom and update behavior accepted.
- [ ] Current primary labels/guidelines rechecked at the release date; offline source date renewed if changed.
- [ ] Final software test results and independent safety findings reviewed; no unresolved critical defects.
- [ ] Owner explicitly approves merge; do not infer from PR creation.
- [ ] Owner separately approves production deployment and confirms hosting/deployment triggers.
- [ ] Release cache/version changed together; update deliberately clears in-memory entries.
- [ ] Rollback retains previous deployable commit and matching scoped cache behavior.
- [ ] Post-release public and installed-PWA checks performed without real patient information.

The app has no backend, telemetry or cloud data store. Do not add patient-identifying fields or change that boundary without a new review.

Candidate branch has a branch-specific Vercel Git deployment guard. GitHub Pages was verified to use main. Do not remove the guard or run a deployment command before explicit approval.
