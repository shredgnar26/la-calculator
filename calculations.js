/* Pure calculation functions. Reference limits are comparisons, never treatment orders. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BlockCalc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '2.0.0-review.1';
  const REVIEW_DATE = '2026-09-12';
  function number(value, label, min = 0, max = Infinity) {
    if (value === '' || value === null || value === undefined || typeof value === 'boolean') throw Error(`Enter ${label}.`);
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) throw Error(`${label} must be between ${min} and ${max === Infinity ? 'a finite positive value' : max}.`);
    return n;
  }
  const weight = value => number(value, 'patient weight in kg', 0.1, 350);
  function maintenance(value) {
    const w = weight(value);
    const parts = [Math.min(w, 10) * 4, Math.min(Math.max(w - 10, 0), 10) * 2, Math.max(w - 20, 0)];
    return {parts, rate: parts.reduce((a, b) => a + b, 0)};
  }
  function fluids(w, fasting, duration) {
    const {parts, rate} = maintenance(w);
    const npo = number(fasting, 'fasting hours (enter 0 if none)', 0, 168);
    const hours = number(duration, 'case duration in hours', 0, 168);
    const deficit = rate * npo;
    const fractions = [0.5, 0.25, 0.25, 0];
    const schedule = fractions.map((f, i) => ({hour: i + 1, base: rate, deficit: deficit * f, total: rate + deficit * f}));
    const deficitIncluded = deficit * (0.5 * Math.min(hours, 1) + 0.25 * Math.min(Math.max(hours - 1, 0), 1) + 0.25 * Math.min(Math.max(hours - 2, 0), 1));
    return {parts, rate, deficit, schedule, duration: hours, baseIncluded: rate * hours, deficitIncluded, total: rate * hours + deficitIncluded};
  }
  function abl(w, factor, initial, minimum, mode) {
    const kg = weight(w);
    const mlKg = number(factor, 'blood-volume factor in mL/kg', 40, 120);
    if (!['hb', 'hct'].includes(mode)) throw Error('Choose hemoglobin or hematocrit.');
    const max = mode === 'hb' ? 25 : 75;
    const unit = mode === 'hb' ? 'g/dL' : '%';
    const start = number(initial, `starting ${mode === 'hb' ? 'hemoglobin' : 'hematocrit'} (${unit})`, 0.1, max);
    const end = number(minimum, `clinician-selected minimum (${unit})`, 0.1, max);
    if (end > start) throw Error('The selected minimum exceeds the starting value. Review both values.');
    const ebv = kg * mlKg;
    return {mode, unit, initial: start, minimum: end, ebv, factor: mlKg, loss: ebv * (start - end) / start};
  }
  function measurements(w, height, sex) {
    const kg = weight(w);
    const cm = number(height, 'adult height in cm', 152.4, 230);
    if (!['male', 'female'].includes(sex)) throw Error('Select the sex used by the body-size formulas.');
    const bmi = kg / (cm / 100) ** 2;
    const ibw = (sex === 'male' ? 50 : 45.5) + 2.3 * (cm / 2.54 - 60);
    const pbw = (sex === 'male' ? 50 : 45.5) + 0.91 * (cm - 152.4);
    const lbw = 9270 * kg / (sex === 'male' ? 6680 + 216 * bmi : 8780 + 244 * bmi);
    const adjusted = ibw + 0.4 * (kg - ibw);
    const category = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal range' : bmi < 30 ? 'Overweight' : bmi < 35 ? 'Obesity class I' : bmi < 40 ? 'Obesity class II' : 'Obesity class III';
    return {bmi, ibw, pbw, lbw, adjusted, bsa: Math.sqrt(cm * kg / 3600), category};
  }
  function burns({kg, tbsa, elapsed, prior, protocol, pediatricCoefficient}) {
    const w = weight(kg);
    const area = number(tbsa, 'assessed burn percentage', 0.1, 100);
    const time = number(elapsed, 'hours since injury', 0, 168);
    const given = number(prior, 'resuscitation volume already given in mL (enter 0 if none)', 0, 100000);
    if (!['aba-adult', 'parkland-adult', 'pediatric'].includes(protocol)) throw Error('Select a burn-fluid protocol.');
    if (protocol === 'aba-adult' && area < 20) throw Error('The ABA adult starting protocol shown here applies to burns ≥20% TBSA. Select the clinical protocol with the burn team.');
    const coefficient = protocol === 'aba-adult' ? 2 : protocol === 'parkland-adult' ? 4 : number(pediatricCoefficient, 'prescribed pediatric coefficient', 1, 10);
    const total = coefficient * w * area;
    const firstPeriod = total / 2;
    const remaining = Math.max(0, total - given);
    const remainingFirst = Math.max(0, firstPeriod - given);
    return {total, firstPeriod, remaining, remainingFirst, elapsed: time, prior: given, coefficient,
      timeLeftFirst: Math.max(0, 8 - time), timeLeft24: Math.max(0, 24 - time),
      // No automatic catch-up rate: elapsed time/prior fluid require bedside reassessment.
      nominalFirstRate: firstPeriod / 8, nominalNextRate: firstPeriod / 16};
  }
  function lipid(w) {
    const kg = weight(w);
    // At exactly 70 kg use weight-based arithmetic; ASRA labels its groups under/over 70 kg.
    const fixed = kg > 70;
    return {fixed, kg, bolus: fixed ? 100 : 1.5 * kg, rateLow: fixed ? 250 / 20 : 0.25 * kg,
      rateHigh: fixed ? 250 / 15 : 0.25 * kg, maximum: 12 * kg};
  }
  const DRUGS = {
    lidocaine: {name: 'Lidocaine', concentrations: [0.5, 1, 1.5, 2], source: 'https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=7f202319-effa-4dd8-b871-e720b75f4a83&version=6'},
    bupivacaine: {name: 'Bupivacaine HCl', concentrations: [0.25, 0.5], source: 'https://dailymed.nlm.nih.gov/dailymed/getFile.cfm?setid=00fb869a-40e7-4c85-8380-c5e0cdee8018&type=pdf'},
    mepivacaine: {name: 'Mepivacaine', concentrations: [1, 1.5, 2], source: 'https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=996381e2-485b-9434-e053-2a95a90a08e1'},
    ropivacaine: {name: 'Ropivacaine', concentrations: [0.2, 0.5, 0.75], source: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d00bfdee-d3e9-4faf-b079-43ac1add51b3'},
    chloroprocaine: {name: 'Chloroprocaine', concentrations: [2, 3], source: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e21e24d5-0535-4962-b9ed-7957fe4ed3db'},
    exparel: {name: 'Exparel', concentrations: [1.3], source: 'https://www.exparel.com/prescribing-information.pdf'}
  };
  function referenceLimit(a, patient) {
    const kg = weight(patient.kg);
    const age = number(patient.age, 'age in years', 0, 120);
    if (!DRUGS[a.drug]) throw Error('Choose a medication for every row.');
    if (a.drug === 'exparel') {
      const indications = ['infiltration', 'interscalene', 'popliteal', 'adductor'];
      if (!indications.includes(a.indication)) throw Error('Choose the Exparel indication.');
      if (age < 6 || (age < 18 && a.indication !== 'infiltration') || age === 17) throw Error('This Exparel reference does not cover the selected age/indication. Consult the prescribing information.');
      return {limit: age < 17 ? Math.min(4 * kg, 266) : a.indication === 'infiltration' ? 266 : 133, basis: age < 17 ? 'Pediatric infiltration: 4 mg/kg, maximum 266 mg' : a.indication === 'infiltration' ? 'Adult infiltration: up to 266 mg' : 'Specified adult nerve block: 133 mg'};
    }
    if (age < 18) throw Error('The conventional local-anesthetic references in this review support adults only. Use an approved pediatric protocol.');
    if (!['infiltration', 'peripheral'].includes(a.route)) throw Error('Select local infiltration or peripheral nerve block.');
    let ceiling, basis;
    if (a.drug === 'lidocaine') {
      const perKg = a.epi ? 7 : 4.5, cap = a.epi ? 500 : 300;
      ceiling = Math.min(kg * perKg, cap); basis = `Lower of ${perKg} mg/kg × ${kg.toFixed(1)} kg and ${cap} mg`;
    } else if (a.drug === 'chloroprocaine') {
      const perKg = a.epi ? 14 : 11, cap = a.epi ? 1000 : 800;
      ceiling = Math.min(kg * perKg, cap); basis = `Lower of ${perKg} mg/kg × ${kg.toFixed(1)} kg and ${cap} mg`;
    } else {
      // Patient/procedure-selected limit avoids inventing a universal mg/kg rule.
      const cap = a.drug === 'bupivacaine' ? (a.epi ? 225 : 175) : a.drug === 'mepivacaine' ? 400 : a.route === 'infiltration' ? 200 : 300;
      ceiling = number(a.selectedLimit, `clinician-selected total limit for ${DRUGS[a.drug].name} in mg`, 0.1, cap);
      basis = `Clinician-selected limit; must not exceed the selected label ceiling of ${cap} mg`;
    }
    if (a.lowerLimit !== '' && a.lowerLimit !== undefined) {ceiling = number(a.lowerLimit, 'lower patient-specific limit in mg', 0.1, ceiling); basis += '; lower patient-specific limit applied';}
    return {limit: ceiling, basis};
  }
  function medicationReview(agents, patient) {
    if (!agents.length) throw Error('Add at least one medication.');
    const rows = agents.map((a, i) => {
      const d = DRUGS[a.drug];
      if (!d) throw Error(`Choose medication ${i + 1}.`);
      const conc = number(a.concentration, `concentration for medication ${i + 1}`, 0.01, 10);
      if (!d.concentrations.includes(conc)) throw Error(`Select a supported concentration for ${d.name}.`);
      if (a.drug === 'ropivacaine' && a.route === 'infiltration' && conc > 0.5) throw Error('This infiltration reference supports ropivacaine 0.2% or 0.5%.');
      const volume = number(a.volume, `volume for medication ${i + 1} in mL (enter 0 if none)`, 0, 1000);
      if (!['given', 'planned'].includes(a.status)) throw Error('Identify each dose as already given or proposed.');
      const mgMl = a.drug === 'exparel' ? 13.3 : conc * 10;
      const {limit, basis} = referenceLimit(a, patient);
      return {...a, name: d.name, concentration: conc, volume, mgMl, dose: volume * mgMl, limit, basis, source: d.source};
    });
    const flags = [];
    const totals = new Map();
    for (const row of rows) {
      const aggregate = totals.get(row.drug) || {dose: 0, limit: row.limit, name: row.name};
      aggregate.dose += row.dose; aggregate.limit = Math.min(aggregate.limit, row.limit); totals.set(row.drug, aggregate);
    }
    let fraction = 0;
    for (const item of totals.values()) {
      fraction += item.dose / item.limit;
      if (item.dose > item.limit + 1e-9) flags.push(`${item.name}: total entered dose exceeds the selected reference limit.`);
    }
    const exp = rows.filter(r => r.drug === 'exparel' && r.dose > 0);
    if (exp.length) {
      flags.push('Exparel: clinical compatibility review required; no shared remaining-dose budget is calculated.');
      const exDose = exp.reduce((n, r) => n + r.dose, 0);
      const bupi = rows.filter(r => r.drug === 'bupivacaine').reduce((n, r) => n + r.dose, 0);
      if (bupi > exDose / 2 + 1e-9) flags.push('Bupivacaine HCl entered exceeds the 1:2 mg ratio to Exparel. Review dose, timing and site.');
      if (exp.some(r => r.indication === 'adductor')) flags.push('Adductor canal: verify the label-specific bupivacaine HCl adjunct regimen.');
      if (rows.some(r => !['bupivacaine', 'exparel'].includes(r.drug) && r.dose > 0)) flags.push('Do not admix Exparel with non-bupivacaine local anesthetics. A ≥20-minute interval is established for prior lidocaine, not all other agents.');
    } else if (fraction > 1 + 1e-9) flags.push('Combined fraction exceeds 100% of the selected reference limits.');
    if (patient.priorExparel) flags.push('Exparel within the previous 96 hours: review additional local anesthetic use with the prescribing information and clinician.');
    if (patient.highRisk || Number(patient.age) >= 70) flags.push('Patient-specific dose review required. No automatic age or high-risk percentage reduction is assumed.');
    return {rows, fraction: exp.length ? null : fraction, flags, givenDose: rows.filter(r => r.status === 'given').reduce((n, r) => n + r.dose, 0)};
  }
  return {VERSION, REVIEW_DATE, number, weight, maintenance, fluids, abl, measurements, burns, lipid, DRUGS, referenceLimit, medicationReview};
});
