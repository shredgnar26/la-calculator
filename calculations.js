/* Pure calculation functions. Reference limits are comparisons, never treatment orders.
   Adult-only clinical scope (18-120 years). Numeric inputs are parsed strictly: only a
   real finite number or a plain decimal string is accepted. The numeric bounds below are
   software input-validation scope; they are not clinical eligibility criteria. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BlockCalc = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '2.1.0-review.1';
  const REVIEW_DATE = '2026-10-21';
  // Plain decimal only: no blanks, hex, scientific text, or non-numeric strings.
  const DECIMAL = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;
  const EPSILON = 1e-9;

  function parseNumber(value, label) {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) throw Error(`Enter a valid ${label}.`);
      return value;
    }
    if (typeof value !== 'string') throw Error(`Enter ${label}.`);
    const text = value.trim();
    if (text === '') throw Error(`Enter ${label}.`);
    if (!DECIMAL.test(text)) throw Error(`${label} accepts a plain decimal number only.`);
    const n = Number(text);
    if (!Number.isFinite(n)) throw Error(`Enter a valid ${label}.`);
    return n;
  }
  function number(value, label, min = 0, max = Infinity) {
    const n = parseNumber(value, label);
    if (n < min || n > max) throw Error(`${label} must be between ${min} and ${max === Infinity ? 'a finite positive value' : max}.`);
    return n;
  }
  function adultAge(value) {
    return number(value, 'adult age in years', 18, 120);
  }
  const weight = value => number(value, 'patient weight in kg', 0.1, 350);
  function toKg(value, unit) {
    const n = parseNumber(value, 'weight');
    if (unit === 'kg') return weight(n);
    if (unit === 'lb') return weight(n * 0.45359237);
    throw Error('Select kilograms or pounds.');
  }
  function maintenance(w, age) {
    adultAge(age);
    const kg = weight(w);
    const parts = [Math.min(kg, 10) * 4, Math.min(Math.max(kg - 10, 0), 10) * 2, Math.max(kg - 20, 0)];
    const rate = parts.reduce((a, b) => a + b, 0);
    return {parts, rate, daily: rate * 24, kg};
  }
  // Alias: adult 4-2-1 maintenance only. No fasting/NPO deficit schedule is supplied.
  function fluids(w, age) {return maintenance(w, age);}
  function adultMaintenance(w, age, basis) {
    adultAge(age);
    const kg = weight(w);
    if (!['measured', 'ideal', 'clinician'].includes(basis)) throw Error('Choose the weight basis used for this reference.');
    const dailyLow = 25 * kg, dailyHigh = 30 * kg;
    return {kg, basis, dailyLow, dailyHigh, lowerDailyLow: 20 * kg, lowerDailyHigh: 25 * kg, hourlyLow: dailyLow / 24, hourlyHigh: dailyHigh / 24};
  }
  function abl(w, factor, initial, minimum, mode, age) {
    adultAge(age);
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
  // Adult body-size references. Numeric BMI retained; the unsupported 0.4 adjusted-weight and
  // BMI category outputs are removed. LBW carries a study-range warning instead.
  function measurements(w, height, sex, age) {
    const years = adultAge(age);
    const kg = weight(w);
    const cm = number(height, 'adult height in cm', 152.4, 230);
    if (!['male', 'female'].includes(sex)) throw Error('Select the sex used by the body-size formulas.');
    const bmi = kg / (cm / 100) ** 2;
    const ibw = (sex === 'male' ? 50 : 45.5) + 2.3 * (cm / 2.54 - 60);
    const pbw = (sex === 'male' ? 50 : 45.5) + 0.91 * (cm - 152.4);
    const lbw = 9270 * kg / (sex === 'male' ? 6680 + 216 * bmi : 8780 + 244 * bmi);
    const warnings = [];
    if (years > 82 || kg < 40.7 || kg > 216.5 || bmi < 17.1 || bmi > 69.9) warnings.push('Lean body weight is outside the studied adult range (age 18–82 years, 40.7–216.5 kg, BMI 17.1–69.9); interpret with caution.');
    return {bmi, ibw, pbw, lbw, bsa: Math.sqrt(cm * kg / 3600), warnings};
  }
  function burns({kg, age, tbsa, elapsed, prior, protocol}) {
    adultAge(age);
    const w = weight(kg);
    const area = number(tbsa, 'assessed burn percentage', 0.1, 100);
    const time = number(elapsed, 'hours since injury', 0, 168);
    const given = number(prior, 'resuscitation volume already given in mL (enter 0 if none)', 0, 100000);
    if (!['aba-adult', 'parkland-adult'].includes(protocol)) throw Error('Select an adult burn-fluid protocol.');
    if (protocol === 'aba-adult' && area < 20) throw Error('The ABA adult starting protocol shown here applies to burns ≥20% TBSA. Select the clinical protocol with the burn team.');
    const coefficient = protocol === 'aba-adult' ? 2 : 4;
    const total = coefficient * w * area;
    const firstPeriod = total / 2;
    const remaining = Math.max(0, total - given);
    const remainingFirst = Math.max(0, firstPeriod - given);
    return {total, firstPeriod, remaining, remainingFirst, elapsed: time, prior: given, coefficient,
      timeLeftFirst: Math.max(0, 8 - time), timeLeft24: Math.max(0, 24 - time),
      // No automatic catch-up rate: elapsed time/prior fluid require bedside reassessment.
      nominalFirstRate: firstPeriod / 8, nominalNextRate: firstPeriod / 16};
  }
  function lipid(w, age) {
    adultAge(age);
    const kg = weight(w);
    // At exactly 70 kg use weight-based arithmetic; ASRA labels its groups under/over 70 kg.
    const fixed = kg > 70;
    return {fixed, kg, bolus: fixed ? 100 : 1.5 * kg, rateLow: fixed ? 250 / 20 : 0.25 * kg,
      rateHigh: fixed ? 250 / 15 : 0.25 * kg, maximum: 12 * kg};
  }
  const DRUGS = {
    lidocaine: {name: 'Lidocaine', concentrations: [0.5, 1, 1.5, 2], routes: {infiltration: [0.5, 1, 1.5, 2], peripheral: [0.5, 1, 1.5, 2]}, epi: true, source: 'https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=7f202319-effa-4dd8-b871-e720b75f4a83'},
    bupivacaine: {name: 'Bupivacaine HCl', concentrations: [0.25, 0.5], routes: {infiltration: [0.25], peripheral: [0.25, 0.5]}, epi: true, source: 'https://www.dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=02a845c3-4521-4926-e397-25ab536e7cf6'},
    mepivacaine: {name: 'Mepivacaine', concentrations: [0.5, 1, 2], routes: {infiltration: [0.5, 1], peripheral: [1, 2]}, epi: false, source: 'https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=996381e2-485b-9434-e053-2a95a90a08e1'},
    ropivacaine: {name: 'Ropivacaine', concentrations: [0.2, 0.5, 0.75], routes: {infiltration: [0.2, 0.5], peripheral: [0.5, 0.75]}, epi: false, source: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=d00bfdee-d3e9-4faf-b079-43ac1add51b3'},
    chloroprocaine: {name: 'Chloroprocaine', concentrations: [2, 3], routes: {infiltration: [2, 3], peripheral: [2, 3]}, epi: true, source: 'https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e21e24d5-0535-4962-b9ed-7957fe4ed3db'},
    exparel: {name: 'EXPAREL', concentrations: [1.3], source: 'https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=bb5a9e59-0f51-11df-8a39-0800200c9a66'}
  };
  const EXPAREL_ROUTES = ['infiltration', 'interscalene', 'popliteal', 'adductor'];

  function referenceLimit(a, patient) {
    if (!a || typeof a !== 'object') throw Error('Choose a medication for every row.');
    if (!patient || typeof patient !== 'object') throw Error('Enter the adult patient weight and age.');
    const kg = weight(patient.kg);
    adultAge(patient.age);
    const d = DRUGS[a.drug];
    if (!d) throw Error('Choose a medication for every row.');
    if (a.drug === 'exparel') {
      if (!EXPAREL_ROUTES.includes(a.indication)) throw Error('Choose the EXPAREL route.');
      return a.indication === 'infiltration'
        ? {limit: 266, basis: 'Adult local infiltration: up to 266 mg EXPAREL'}
        : {limit: 133, basis: 'Specified adult nerve block: 133 mg EXPAREL'};
    }
    if (!['infiltration', 'peripheral'].includes(a.route)) throw Error('Select local infiltration or peripheral nerve block.');
    let ceiling, basis;
    if (a.drug === 'lidocaine') {
      const perKg = a.epi ? 7 : 4.5, cap = a.epi ? 500 : 300;
      ceiling = Math.min(kg * perKg, cap); basis = `Lower of ${perKg} mg/kg × ${kg} kg and ${cap} mg label ceiling`;
    } else if (a.drug === 'chloroprocaine') {
      const perKg = a.epi ? 14 : 11, cap = a.epi ? 1000 : 800;
      ceiling = Math.min(kg * perKg, cap); basis = `Lower of ${perKg} mg/kg × ${kg} kg and ${cap} mg label ceiling`;
    } else {
      // Patient/procedure-selected limit avoids inventing a universal mg/kg rule.
      let cap;
      if (a.drug === 'bupivacaine') cap = a.epi ? 225 : 175;
      else if (a.drug === 'mepivacaine') cap = 400;
      else if (a.drug === 'ropivacaine') {
        if (a.route === 'infiltration') cap = 200;
        else {
          const c = number(a.concentration, 'ropivacaine concentration', 0.01, 10);
          if (c === 0.5) cap = 250;
          else if (c === 0.75) cap = 300;
          else throw Error('Select a supported ropivacaine concentration for this route.');
        }
      } else throw Error('Choose a medication for every row.');
      ceiling = number(a.selectedLimit, `clinician-selected total limit for ${d.name} in mg`, 0.1, cap);
      basis = `Clinician-selected limit; must not exceed the selected label ceiling of ${cap} mg`;
    }
    if (a.lowerLimit !== '' && a.lowerLimit !== undefined && a.lowerLimit !== null) {
      ceiling = number(a.lowerLimit, 'lower patient-specific limit in mg', 0.1, ceiling);
      basis += '; lower patient-specific limit applied';
    }
    return {limit: ceiling, basis};
  }

  function buildRow(a, index, patient) {
    if (!a || typeof a !== 'object') throw Error(`Choose medication ${index + 1}.`);
    const d = DRUGS[a.drug];
    if (!d) throw Error(`Choose medication ${index + 1}.`);
    const n = index + 1;
    if (!['given', 'planned'].includes(a.status)) throw Error(`Identify medication ${n} as already given or planned.`);
    if (a.drug === 'exparel') {
      const volume = number(a.volume, `EXPAREL volume ${n} in mL (enter 0 if none)`, 0, 1000);
      const indication = a.indication === '' || a.indication === undefined || a.indication === null ? '' : String(a.indication);
      const mgMl = 13.3; // exact labeled concentration; never 13.0
      const limit = EXPAREL_ROUTES.includes(indication) ? (indication === 'infiltration' ? 266 : 133) : null;
      const basis = limit === null ? 'EXPAREL route not supported'
        : indication === 'infiltration' ? 'Adult local infiltration: up to 266 mg EXPAREL'
        : 'Specified adult nerve block: 133 mg EXPAREL';
      return {drug: 'exparel', name: d.name, status: a.status, concentration: null, route: indication, indication,
        volume, mgMl, dose: volume * mgMl, epi: false, selectedLimit: null, lowerLimit: null, source: d.source, limit, basis};
    }
    if (!['infiltration', 'peripheral'].includes(a.route)) throw Error(`Select local infiltration or peripheral nerve block for medication ${n}.`);
    if (typeof a.epi !== 'boolean') throw Error(`Select whether ${d.name} contains epinephrine for medication ${n}.`);
    if (a.epi && !d.epi) throw Error(`${d.name} with epinephrine is outside this app's checked scope.`);
    const concentration = number(a.concentration, `concentration for medication ${n}`, 0.01, 10);
    if (!d.concentrations.includes(concentration)) throw Error(`Select a supported concentration for ${d.name}.`);
    if (!d.routes[a.route].includes(concentration)) throw Error(`The selected concentration is not supported for ${d.name} by ${a.route === 'infiltration' ? 'local infiltration' : 'peripheral nerve block'}.`);
    const volume = number(a.volume, `volume for medication ${n} in mL (enter 0 if none)`, 0, 1000);
    const mgMl = concentration * 10; // exact %×10; no rounding
    const {limit, basis} = referenceLimit({...a, concentration}, patient);
    return {drug: a.drug, name: d.name, status: a.status, concentration, route: a.route, indication: null,
      volume, mgMl, dose: volume * mgMl, epi: a.epi, selectedLimit: a.selectedLimit, lowerLimit: a.lowerLimit,
      source: d.source, limit, basis};
  }

  function medicationReview(agents, patient, options = {}) {
    if (!Array.isArray(agents) || agents.length === 0) throw Error('Add at least one medication.');
    if (!patient || typeof patient !== 'object') throw Error('Enter the adult patient weight and age.');
    weight(patient.kg);
    adultAge(patient.age);
    if (!['no', 'yes', 'unknown'].includes(patient.priorExparel)) throw Error('Choose whether EXPAREL was given in the past 96 hours (No, Yes, or Not known).');
    const opts = options && typeof options === 'object' ? options : {};

    const rows = agents.map((a, i) => buildRow(a, i, patient));
    const stops = [];
    const stop = message => {if (!stops.includes(message)) stops.push(message);};

    const totals = new Map();
    for (const row of rows) {
      const item = totals.get(row.drug) || {drug: row.drug, name: row.name, dose: 0, limit: null};
      item.dose += row.dose;
      if (row.limit !== null) item.limit = item.limit === null ? row.limit : Math.min(item.limit, row.limit);
      totals.set(row.drug, item);
    }
    for (const item of totals.values()) {
      if (item.limit !== null && item.dose > item.limit + EPSILON) stop(`${item.name}: total entered dose ${item.dose} mg exceeds the checked limit ${item.limit} mg.`);
    }

    const positiveDrugs = [...new Set(rows.filter(r => r.dose > 0).map(r => r.drug))];
    const exparelPair = positiveDrugs.length === 2 && positiveDrugs.includes('exparel') && positiveDrugs.includes('bupivacaine');
    if (positiveDrugs.length > 1 && !exparelPair) stop('Different local anesthetics are outside this app’s checked scope. Review each dose and the combined toxicity risk with the clinician. Only EXPAREL with bupivacaine HCl has a separate mixing check.');

    if (patient.priorExparel === 'yes' || patient.priorExparel === 'unknown') {
      stop('EXPAREL within the previous 96 hours: an additional local-anesthetic plan is blocked pending clinician and label review.');
    }

    let exparel = null;
    const exparelRows = rows.filter(r => r.drug === 'exparel');
    if (exparelRows.length) {
      const positive = exparelRows.filter(r => r.dose > 0);
      if (exparelRows.length > 1) stop('EXPAREL: only one administration is supported per review; doses are not pooled across procedures.');
      if (!positive.length) {
        stop('EXPAREL: enter a positive dose; a zero-volume EXPAREL row cannot clear a local-anesthetic plan.');
      } else {
        const row = positive[0];
        const route = row.route;
        const validRoute = EXPAREL_ROUTES.includes(route);
        if (!validRoute) stop('EXPAREL: the selected route is not supported (infiltration, interscalene, popliteal, or adductor canal only).');
        if (route === 'infiltration') {
          if (row.dose > 266 + EPSILON) stop('EXPAREL: local infiltration exceeds the 266 mg label maximum.');
        } else if (validRoute) {
          if (Math.abs(row.dose - 133) > EPSILON) stop('EXPAREL: perineural blocks use the labeled 133 mg regimen only; below or above 133 mg is not supported.');
        }
        const nonBupi = rows.filter(r => !['exparel', 'bupivacaine'].includes(r.drug) && r.dose > 0);
        if (nonBupi.length) stop('EXPAREL: do not combine with non-bupivacaine local anesthetics in the same plan.');

        const bupiRows = rows.filter(r => r.drug === 'bupivacaine' && r.dose > 0);
        const bupiDose = bupiRows.reduce((sum, r) => sum + r.dose, 0);
        const ratioLimit = row.dose / 2;
        if (!['none', 'admix', 'immediately-before', 'other'].includes(opts.bupiTiming)) throw Error('Choose how bupivacaine HCl will be used.');
        if (bupiDose === 0 && opts.bupiTiming !== 'none') stop('No bupivacaine HCl dose is entered. Select no HCl or enter and check the intended dose.');
        if (row.status === 'given' && rows.some(r => r.dose > 0 && r.status === 'planned')) stop('EXPAREL is marked already given. A later local-anesthetic dose is blocked. Review the 96-hour warning and current label.');
        if (opts.bupiTiming === 'admix' && bupiRows.some(r => r.status !== row.status)) stop('Doses in the same syringe must have the same dose status. Check which doses were already given.');
        const expectedRoute = route === 'infiltration' ? 'infiltration' : 'peripheral';
        if (bupiRows.some(r => r.route !== expectedRoute)) stop('The bupivacaine HCl route does not match the EXPAREL plan. Check the route before use.');
        if (bupiDose > 0) {
          if (opts.bupiTiming !== 'admix' && opts.bupiTiming !== 'immediately-before') stop('EXPAREL + bupivacaine HCl: choose admixed or immediately-before timing; any other timing or plan is blocked.');
          if (bupiDose > ratioLimit + EPSILON) stop(`EXPAREL: bupivacaine HCl ${bupiDose} mg exceeds the conservative listed-mg check of ${ratioLimit} mg (EXPAREL mg ÷ 2). This ratio is not a safety approval.`);
        }

        if (!['none', 'lidocaine', 'other', 'unknown'].includes(opts.priorLocal)) throw Error('Choose the other local anesthetic given before EXPAREL (none, lidocaine, other, or not known).');
        if (opts.priorLocal === 'other' || opts.priorLocal === 'unknown') stop('EXPAREL: another or unknown prior local anesthetic is not supported; review toxicity and timing with the clinician.');
        if (opts.priorLocal === 'lidocaine') {
          const minutes = number(opts.lidocaineMinutes, 'minutes since the prior local lidocaine', 0, 10080);
          if (minutes < 20 - EPSILON) stop('EXPAREL: prior local lidocaine must precede EXPAREL by at least 20 minutes.');
        }

        if (!['no', 'yes', 'unknown'].includes(patient.pregnancy)) throw Error('Choose whether the patient is pregnant (No, Yes, or Not known) for the EXPAREL check.');
        if (patient.pregnancy === 'yes' || patient.pregnancy === 'unknown') stop('EXPAREL: pregnancy status is yes or not known; EXPAREL is not recommended in pregnancy, so this plan is blocked.');

        if (!['none', 'saline', 'lr', 'other'].includes(opts.diluent)) throw Error('Choose the added dilution fluid (none, preservative-free 0.9% sodium chloride, lactated Ringer’s, or other).');
        const diluentVolume = number(opts.diluentVolume, 'added dilution fluid volume in mL', 0, 5000);
        if (opts.diluent === 'other') stop('EXPAREL: only preservative-free 0.9% sodium chloride or lactated Ringer’s may be used as added diluent.');
        if (opts.diluent === 'none' && diluentVolume !== 0) stop('EXPAREL: no diluent was selected, so the added dilution volume must be 0 mL.');
        if ((opts.diluent === 'saline' || opts.diluent === 'lr') && !(diluentVolume > 0)) stop('EXPAREL: a positive added diluent volume is required when a diluent is selected.');

        if (route === 'adductor') {
          const okDose = Math.abs(row.dose - 133) <= EPSILON && Math.abs(row.volume - 10) <= EPSILON;
          const okBupi = bupiRows.length === 1 && Math.abs(bupiRows[0].dose - 50) <= EPSILON && Math.abs(bupiRows[0].concentration - 0.5) <= EPSILON && Math.abs(bupiRows[0].volume - 10) <= EPSILON && bupiRows[0].epi === false;
          const okTiming = opts.bupiTiming === 'admix';
          const okDiluent = opts.diluent === 'none' && diluentVolume === 0;
          if (!(okDose && okBupi && okTiming && okDiluent)) stop('EXPAREL adductor canal: only the exact labeled regimen (133 mg/10 mL plus 50 mg/10 mL bupivacaine 0.5% admixed, no epinephrine, no added diluent) is supported.');
        }

        const bupiAdmixVolume = opts.bupiTiming === 'admix' ? bupiRows.reduce((sum, r) => sum + r.volume, 0) : 0;
        const addedDiluent = opts.diluent === 'none' ? 0 : diluentVolume;
        const finalVolume = row.volume + bupiAdmixVolume + addedDiluent;
        const finalConcentration = finalVolume > 0 ? row.dose / finalVolume : 0;
        if (finalVolume > 0 && finalConcentration < 0.89 - EPSILON) stop('EXPAREL: the final EXPAREL concentration is below the conservative 0.89 mg/mL floor for the selected mixture.');

        exparel = {
          dose: row.dose,
          volume: row.volume,
          route: validRoute ? route : (route || 'unsupported'),
          limit: row.limit,
          bupiDose,
          ratioLimit,
          finalVolume,
          finalConcentration,
          compatibility: stops.length === 0 ? 'Within the checked limits only' : 'Blocked — review the STOP reasons.'
        };
      }
    }

    const flags = [];
    flags.push('Using these medicines together can increase local anesthetic toxicity. Review every drug and dose.');
    flags.push('Trained staff, monitoring, and rescue equipment must be ready.');
    if (exparelRows.length || patient.priorExparel !== 'no') flags.push('Avoid more local anesthetic for 96 hours after EXPAREL. Any label-specific companion plan needs clinician review.');
    flags.push('These drugs are not interchangeable. Check the product and strength.');
    flags.push('This check does not establish safety for this patient.');
    if (patient.highRisk) flags.push('CAUTION — Patient factors may call for a lower dose. The clinician must choose it; this app does not reduce doses.');
    if (exparelRows.length && opts.priorLocal === 'lidocaine') flags.push('The 20-minute wait was checked. The earlier lidocaine dose and total toxicity risk were not checked. Review that dose before use.');

    return {rows, totals: [...totals.values()], flags, stops, blocked: stops.length > 0, exparel};
  }

  return {VERSION, REVIEW_DATE, number, weight, adultAge, toKg, maintenance, fluids, adultMaintenance,
    abl, measurements, burns, lipid, DRUGS, referenceLimit, medicationReview};
});
