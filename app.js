'use strict';
const C = window.BlockCalc;
const $ = id => document.getElementById(id);
const value = id => $(id).value;
const fmt = (n, digits = 1) => n === null || n === undefined ? 'Not available' : Number(n).toLocaleString('en-US', {maximumFractionDigits: digits});
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const row = (label, val) => `<div class="result-row"><span class="result-label">${label}</span><strong class="result-value">${val}</strong></div>`;
let kg = '', heightCm = '', activePage = 'local', nextMedicationId = 1, medications = [], latestReview = null;
let serviceWorkerRegistration = null;
function showPage(name, focus = true) {
  const panel = $(`page-${name}`);
  if (!panel) return;
  activePage = name;
  document.querySelectorAll('.page-panel').forEach(el => {el.hidden = el !== panel; el.classList.toggle('active', el === panel);});
  document.querySelectorAll('#app-menu [data-page]').forEach(el => {if (el.dataset.page === name) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');});
  $('app-menu').hidden = true; $('menu-button').setAttribute('aria-expanded', 'false');
  if (focus) $(`title-${name}`).focus();
  updateResultJump();
}
document.querySelectorAll('[data-page]').forEach(el => el.addEventListener('click', () => showPage(el.dataset.page)));
$('menu-button').addEventListener('click', () => {const open = $('app-menu').hidden; $('app-menu').hidden = !open; $('menu-button').setAttribute('aria-expanded', String(open));});
document.addEventListener('keydown', e => {if (e.key === 'Escape' && !$('app-menu').hidden) {$('app-menu').hidden = true; $('menu-button').setAttribute('aria-expanded', 'false'); $('menu-button').focus();}});
function patient() {return {kg, age: value('patient-age'), highRisk: $('la-risk').checked, priorExparel: value('la-prior-exparel'), pregnancy: value('la-pregnancy')};}
function result(errorId, outputId, fn) {
  $(errorId).hidden = true; $(errorId).textContent = ''; $(outputId).replaceChildren();
  try {$(outputId).innerHTML = fn();} catch (error) {$(errorId).textContent = 'STOP — ' + error.message; $(errorId).hidden = false;}
  updateResultJump();
}
function resultTarget() {
  const prefix = ({local:'la', fluids:'fluid', abl:'abl', profile:'profile', burns:'burn', last:'lipid'})[activePage];
  if (!prefix) return null;
  return !$(prefix + '-error').hidden ? $(prefix + '-error') : $(prefix + '-results');
}
function updateResultJump() {
  const target = resultTarget();
  const stop = target && (target.classList.contains('validation') || !!target.querySelector('.warning'));
  $('jump-result').disabled = !target;
  $('jump-result').textContent = stop ? 'STOP' : 'Result';
  $('jump-result').setAttribute('aria-label', stop ? 'View stopped result' : 'View result');
}
$('jump-result').addEventListener('click', () => {const target = resultTarget(); if (target) {target.setAttribute('tabindex','-1'); target.focus({preventScroll:true}); target.scrollIntoView({block:'start'});}});
function addMedication(drug = '') {
  medications.push({id: nextMedicationId++, drug, concentration: '', volume: '', status: '', epi: false, route: '', indication: '', selectedLimit: '', lowerLimit: ''});
  if (drug === 'exparel') medications.at(-1).concentration = '1.3';
  renderMedicationInputs(); renderLocal();
}
function selectOptions(options, selected) {return options.map(([v, label]) => `<option value="${v}" ${String(v) === String(selected) ? 'selected' : ''}>${label}</option>`).join('');}
function medField(a, key, label, control) {return `<label for="med-${a.id}-${key}">${label}${control}</label>`;}
function medInput(a, key, extra = '') {return `<input id="med-${a.id}-${key}" data-key="${key}" type="number" step="any" min="0" inputmode="decimal" value="${escapeHTML(a[key])}" ${extra}>`;}
function renderMedicationInputs() {
  $('medications').innerHTML = medications.map((a, index) => {
    const exp = a.drug === 'exparel'; const d = C.DRUGS[a.drug];
    const select = (key, options) => `<select id="med-${a.id}-${key}" data-key="${key}">${selectOptions(options, a[key])}</select>`;
    let html = `<section class="agent-card" data-medication="${a.id}" aria-label="Medication ${index + 1}"><div class="agent-header"><h2>Medication ${index + 1}</h2><button class="remove-btn" data-remove="${a.id}" aria-label="Remove medication ${index + 1}">Remove</button></div><div class="fields">`;
    html += medField(a, 'drug', 'Medication', select('drug', [['', 'Select medication'], ...Object.entries(C.DRUGS).map(([key, drug]) => [key, drug.name])]));
    html += medField(a, 'status', 'Dose status', select('status', [['', 'Select'], ['given', 'Already given'], ['planned', 'Planned dose']]));
    if (exp) {
      html += medField(a, 'indication', 'EXPAREL route', select('indication', [['', 'Select indication'], ['infiltration', 'Local infiltration'], ['interscalene', 'Adult interscalene block'], ['popliteal', 'Adult popliteal sciatic block'], ['adductor', 'Adult adductor canal block'], ['unsupported', 'Other block / route — not supported']]));
      html += '<div><strong>Concentration</strong><p>13.3 mg/mL · fixed</p></div>';
    } else {
      html += medField(a, 'route', 'Procedure', select('route', [['', 'Select route'], ['infiltration', 'Local infiltration'], ['peripheral', a.drug === 'ropivacaine' ? 'Major peripheral nerve block' : 'Peripheral nerve block']]));
      html += medField(a, 'concentration', 'Concentration', select('concentration', [['', 'Select concentration'], ...(d ? d.concentrations : []).map(n => [n, `${n}% · ${n * 10} mg/mL`])]));
    }
    html += medField(a, 'volume', exp ? 'EXPAREL stock volume (mL)' : 'Volume (mL)', medInput(a, 'volume', 'max="1000" placeholder="Enter 0 if none"'));
    if (!exp && ['bupivacaine', 'mepivacaine', 'ropivacaine'].includes(a.drug)) {
      const cap = a.drug === 'bupivacaine' ? (a.epi ? 225 : 175) : a.drug === 'mepivacaine' ? 400 : a.route === 'infiltration' ? 200 : Number(a.concentration) === 0.5 ? 250 : 300;
      html += medField(a, 'selectedLimit', `Clinician-selected total limit (mg; ≤${cap})`, medInput(a, 'selectedLimit', `max="${cap}" placeholder="Required for this drug"`));
    }
    html += '</div>';
    if (!exp && d) {
      if (['lidocaine', 'bupivacaine', 'chloroprocaine'].includes(a.drug)) html += `<label class="checkbox-row"><input type="checkbox" data-key="epi" ${a.epi ? 'checked' : ''}>This medication contains epinephrine${['chloroprocaine', 'bupivacaine'].includes(a.drug) ? ' (1:200,000)' : ''}</label>`;
      html += `<details><summary>Lower patient-specific limit (optional)</summary>${medField(a, 'lowerLimit', 'Lower total limit (mg)', medInput(a, 'lowerLimit', 'placeholder="Only if selected by clinician"'))}</details>`;
    }
    if (exp) html += `<aside class="info-warn"><strong>CAUTION — EXPAREL is a separate product.</strong><p>It is not plain bupivacaine. A dose or ratio check does not prove safety.</p><button class="text-button" data-add-bupi="true">+ Add bupivacaine HCl</button></aside>`;
    if (d) html += `<p class="info-text"><a href="${d.source}" target="_blank" rel="noopener">${d.name} label</a> · Checked ${C.REVIEW_DATE}</p>`;
    return html + '</section>';
  }).join('');
}
$('medications').addEventListener('input', event => {
  const key = event.target.dataset.key; if (!key || event.target.tagName === 'SELECT') return;
  const a = medications.find(m => m.id === Number(event.target.closest('[data-medication]').dataset.medication));
  a[key] = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
  if (key === 'epi') renderMedicationInputs();
  renderLocal();
});
$('medications').addEventListener('change', event => {
  if (event.target.tagName !== 'SELECT') return;
  const key = event.target.dataset.key;
  const a = medications.find(m => m.id === Number(event.target.closest('[data-medication]').dataset.medication));
  a[key] = event.target.value;
  if (key === 'drug') {a.concentration = a.drug === 'exparel' ? '1.3' : ''; a.selectedLimit = ''; a.lowerLimit = ''; a.epi = false; a.indication = ''; a.volume = ''; a.status = ''; a.route = ''; resetExparelChecks();}
  if (key === 'route') {a.selectedLimit = ''; a.lowerLimit = '';}
  if (['drug', 'route', 'concentration'].includes(key)) renderMedicationInputs();
  renderLocal();
});
$('medications').addEventListener('click', event => {
  const remove = event.target.closest('[data-remove]');
  if (remove) {medications = medications.filter(m => m.id !== Number(remove.dataset.remove)); renderMedicationInputs(); renderLocal(); $('add-medication').focus();}
  if (event.target.closest('[data-add-bupi]')) addMedication('bupivacaine');
});
$('add-medication').addEventListener('click', () => {addMedication(); $(`med-${medications.at(-1).id}-drug`).focus();});
function resetExparelChecks() { for (const id of ['la-pregnancy', 'exp-prior-local', 'exp-lidocaine-minutes', 'exp-bupi-timing', 'exp-diluent', 'exp-diluent-volume']) $(id).value = ''; }
function exparelOptions() {
  return {priorLocal: value('exp-prior-local'), lidocaineMinutes: value('exp-lidocaine-minutes'), bupiTiming: value('exp-bupi-timing'), diluent: value('exp-diluent'), diluentVolume: value('exp-diluent-volume')};
}
function renderLocal() {
  latestReview = null; $('copy-summary').disabled = true; $('copy-status').textContent = '';
  const hasExparel = medications.some(a => a.drug === 'exparel');
  $('exparel-checks').hidden = !hasExparel;
  if (!hasExparel) resetExparelChecks();
  $('exp-lidocaine-wrap').hidden = value('exp-prior-local') !== 'lidocaine';
  result('la-error', 'la-results', () => {
    const review = C.medicationReview(medications, patient(), exparelOptions());
    latestReview = review; $('copy-summary').disabled = review.blocked;
    let html = `<div class="${review.blocked ? 'warning' : 'clinical-note'}" role="status"><h2>${review.blocked ? 'STOP — CHECK THIS DOSE OR MIXTURE' : 'Within the checked limits'}</h2><p>${review.blocked ? 'Do not use this plan as entered. Check the dose and current label.' : 'These checks do not prove safety. The clinician must choose the plan.'}</p>${review.stops.length ? '<ul>' + review.stops.map(flag => `<li>${escapeHTML(flag)}</li>`).join('') + '</ul>' : ''}</div>`;

    for (const r of review.rows) html += `<div class="result-card"><h3>${r.name} · ${r.status === 'given' ? 'Already given' : 'Planned'}</h3><div class="hero-result">${fmt(r.dose, 3)} <span>mg</span></div>${row('Stock volume', `${fmt(r.volume, 3)} mL`)}${row('Route', escapeHTML(routeName(r)))}${row(r.drug === 'exparel' ? 'Route dose limit' : 'Individual-drug limit', `${fmt(r.limit, 3)} mg`)}${r.drug === 'exparel' && review.exparel ? row('Added HCl dose', `${fmt(review.exparel.bupiDose, 3)} mg`) + row('Conservative HCl ratio check', `≤${fmt(review.exparel.ratioLimit, 3)} mg`) : ''}<details><summary>Show the math</summary><p>${fmt(r.volume, 3)} mL × ${fmt(r.mgMl, 3)} mg/mL = ${fmt(r.dose, 3)} mg</p><p>${escapeHTML(r.basis)}</p><p>Checks use the full values. Display rounding does not change a limit.</p><a href="${r.source}" target="_blank" rel="noopener">Product label</a> · Checked ${C.REVIEW_DATE}</details></div>`;
    if (review.exparel) {
      const e = review.exparel;
      html += `<div class="result-card"><h3>EXPAREL compatibility</h3>${row('Status', escapeHTML(e.compatibility))}${row('Added bupivacaine HCl', `${fmt(e.bupiDose, 3)} mg`)}${row('Conservative HCl check', `≤${fmt(e.ratioLimit, 3)} mg`)}${row('Final syringe volume', `${fmt(e.finalVolume, 3)} mL`)}<details><summary>Show mixing and dilution math</summary><p>Listed EXPAREL mg ÷ 2 = HCl check limit. This app uses a conservative listed-mg rule. Manufacturer examples use a different salt conversion. A pharmacist must resolve that difference before release.</p><p>EXPAREL ${fmt(e.dose, 3)} mg ÷ ${fmt(e.finalVolume, 3)} mL = ${fmt(e.finalConcentration, 4)} mg/mL.</p><p>This app uses an exact 0.89 mg/mL floor. It may reject a rounded 1:14 example. No safety is proved by passing either check.</p></details></div>`;
    }
    if (review.flags.length) html += `<aside class="info-warn"><strong>CAUTION — Check before use</strong><ul>${review.flags.map(flag => `<li>${escapeHTML(flag)}</li>`).join('')}</ul></aside>`;
    html += `<details><summary>Review the dose record</summary><p>Check allergies, the actual vial, site, timing, all prior doses, and the patient’s condition. Stop if any detail is uncertain. Different drugs do not share one dose budget.</p>${review.totals.map(t => row(`${escapeHTML(t.name)} — all entered doses`, `${fmt(t.dose, 3)} mg / ${fmt(t.limit, 3)} mg checked limit`)).join('')}<p>Include all relevant doses. This tool does not clear repeat dosing or continuous infusions.</p></details><p class="source-note">Checked ${C.REVIEW_DATE} · <a href="references.html#local">Offline drug rules</a></p>`;
    return html;
  });
}
function routeName(r) {return ({infiltration:'Local infiltration', peripheral:r.drug === 'ropivacaine' ? 'Major peripheral nerve block' : 'Peripheral nerve block', interscalene:'Interscalene brachial plexus block', popliteal:'Popliteal sciatic block', adductor:'Adductor canal block'})[r.indication || r.route] || 'Unsupported route';}
function renderFluids() {
  result('fluid-error', 'fluid-results', () => {
    const f = C.maintenance(kg, value('patient-age'));
    return `<div class="clinical-note"><span>4-2-1 estimate</span><div class="hero-result" id="fluid-rate">${fmt(f.rate, 2)} <span>mL/hr</span></div>${row('Over 24 hours', `<span id="fluid-total">${fmt(f.daily, 2)} mL</span>`)}<p>This is a historical estimate. Adult fluid needs may be different.</p></div><details><summary>Show the math</summary><p>First 10 kg: ${fmt(f.parts[0], 2)} mL/hr</p><p>Next 10 kg: ${fmt(f.parts[1], 2)} mL/hr</p><p>Remaining ${fmt(Math.max(0, f.kg - 20), 3)} kg: ${fmt(f.parts[2], 2)} mL/hr</p><p>Total: ${fmt(f.parts[0], 2)} + ${fmt(f.parts[1], 2)} + ${fmt(f.parts[2], 2)} = ${fmt(f.rate, 2)} mL/hr</p><p>${fmt(f.rate, 2)} × 24 = ${fmt(f.daily, 2)} mL in 24 hours.</p><p>Uses the measured weight above, with 4, 2, then 1 mL/kg/hr. No rounding is used between steps.</p></details>`;
  });
  $('fluid-weight-wrap').hidden = !['ideal', 'clinician'].includes(value('fluid-basis'));
  result('nice-error', 'nice-results', () => {
    const n = C.adultMaintenance(value('fluid-basis') === 'measured' ? kg : value('fluid-weight'), value('patient-age'), value('fluid-basis'));
    return `<div class="clinical-note"><h2>NICE adult maintenance reference</h2><div class="hero-result">${fmt(n.dailyLow)}–${fmt(n.dailyHigh)} <span>mL/day</span></div><p>${fmt(n.hourlyLow, 1)}–${fmt(n.hourlyHigh, 1)} mL/hr equivalent</p><p>${fmt(n.kg, 3)} kg × 25–30 mL/kg/day.</p><p>For patients who need less: ${fmt(n.lowerDailyLow)}–${fmt(n.lowerDailyHigh)} mL/day (${fmt(n.kg, 3)} × 20–25).</p></div><p>INFO — A starting reference for routine maintenance only. Check the weight choice and all other fluid intake.</p>`;
  });
}
function ablFactor() {return value('abl-factor');}
function renderABL() {
  const mode = document.querySelector('[name="abl-mode"]:checked').value;
  $('hb-fields').hidden = mode !== 'hb'; $('hct-fields').hidden = mode !== 'hct';
  result('abl-error', 'abl-results', () => {
    const a = C.abl(kg, ablFactor(), value(`${mode}-start`), value(`${mode}-min`), mode, value('patient-age'));
    return `<div class="clinical-note"><span>Estimated loss to selected ${mode === 'hb' ? 'hemoglobin' : 'hematocrit'}</span><h2 id="abl-total">${fmt(a.loss)} mL</h2></div><div class="result-card"><h3>Calculation</h3>${row('Estimated blood volume', `${fmt(a.ebv)} mL`)}<p>${fmt(Number(kg))} kg × ${fmt(a.factor)} mL/kg = ${fmt(a.ebv)} mL</p><p>${fmt(a.ebv)} × (${fmt(a.initial)} − ${fmt(a.minimum)}) ÷ ${fmt(a.initial)} = ${fmt(a.loss)} mL</p><p class="info-text">Both laboratory inputs are ${a.unit}. Equal starting and minimum values yield 0 mL.</p></div>`;
  });
  const comparisons = ['hb', 'hct'].map(mode => {try {const a = C.abl(kg, ablFactor(), value(`${mode}-start`), value(`${mode}-min`), mode, value('patient-age')); return row(mode === 'hb' ? 'Your hemoglobin inputs' : 'Your hematocrit inputs', `${fmt(a.loss)} mL`);} catch (_) {return '';}});
  $('abl-comparison').innerHTML = comparisons.join('');
}
function renderProfile() {
  result('profile-error', 'profile-results', () => {
    C.number(value('patient-age'), 'age for adult body-size references', 18, 120);
    const p = C.measurements(kg, heightCm, value('profile-sex'), value('patient-age'));
    return `<div class="result-card">${row('Ideal body weight (IBW) · Devine', `${fmt(p.ibw)} kg`)}${row('Lean body weight (LBW) · Janmahasatian', `${fmt(p.lbw)} kg`)}${row('Body surface area (BSA) · Mosteller', `${fmt(p.bsa, 2)} m²`)}${row('Body mass index (BMI)', `${fmt(p.bmi)} kg/m²`)}</div><p>INFO — These describe body size. They do not choose a drug dose.</p>${(p.warnings || []).map(w => `<p class="info-warn">CAUTION — ${escapeHTML(w)}</p>`).join('')}<details><summary>Show the math</summary><p>BMI = ${fmt(kg, 3)} kg ÷ (${fmt(heightCm / 100, 3)} m)².</p><p>IBW = ${value('profile-sex') === 'male' ? '50' : '45.5'} + 2.3 × (${fmt(heightCm / 2.54, 3)} inches − 60).</p><p>LBW = 9,270 × ${fmt(kg, 3)} ÷ (${value('profile-sex') === 'male' ? '6,680 + 216' : '8,780 + 244'} × BMI).</p><p>BSA = square root of (${fmt(heightCm, 3)} cm × ${fmt(kg, 3)} kg ÷ 3,600).</p></details><details><summary>Ventilation size reference</summary>${row('Predicted body weight (PBW) · ARDSNet', `${fmt(p.pbw)} kg`)}<p>PBW = ${value('profile-sex') === 'male' ? '50' : '45.5'} + 0.91 × (${fmt(heightCm, 3)} cm − 152.4). This is a lung-size reference. No tidal volume is chosen.</p></details><p class="source-note">Checked ${C.REVIEW_DATE} · <a href="references.html#other">Sources and limits</a></p>`;
  });
}
function renderBurns() {
  const protocol = value('burn-protocol');
  result('burn-error', 'burn-results', () => {
    C.adultAge(value('patient-age'));
    const b = C.burns({kg, age: value('patient-age'), tbsa: value('burn-tbsa'), elapsed: value('burn-elapsed'), prior: value('burn-prior'), protocol});
    let html = `<div class="clinical-note"><span>Initial 24-hour formula estimate</span><h2>${fmt(b.total)} mL</h2><p>${b.coefficient} × ${fmt(Number(kg))} kg × ${escapeHTML(value('burn-tbsa'))}%</p></div>`;
    if (b.elapsed >= 24) return html + '<div class="info-warn">At least 24 hours have elapsed. This initial formula does not provide an ongoing rate. Reassess with the burn team.</div>';
    html += `<div class="result-card">${row('Time since injury', `${fmt(b.elapsed)} hours`)}${row('Previously given resuscitation fluid', `${fmt(b.prior)} mL`)}${row('Remaining 24-hour formula volume', `${fmt(b.remaining)} mL`)}${row('Time to 24 hours after injury', `${fmt(b.timeLeft24)} hours`)}`;
    if (b.elapsed < 8) html += row('Remaining first-period formula volume', `${fmt(b.remainingFirst)} mL`) + row('Time to 8 hours after injury', `${fmt(b.timeLeftFirst)} hours`);
    else html += '<p>The first eight-hour period has passed. No automatic catch-up rate is calculated.</p>';
    if (b.prior >= b.total) html += '<p>Previously administered fluid meets or exceeds the formula estimate. This does not determine whether to stop fluids; reassess clinically.</p>';
    html += '</div>';
    html += `<details><summary>Original time-zero schedule (before titration)</summary><p>Half over the first 8 hours from injury: ${fmt(b.firstPeriod)} mL, nominally ${fmt(b.nominalFirstRate)} mL/hr.</p><p>Half over the following 16 hours: ${fmt(b.firstPeriod)} mL, nominally ${fmt(b.nominalNextRate)} mL/hr.</p><p>These are original formula rates, not adjusted rates for the current time.</p></details>`;
    return html;
  });
}
function renderLipid() {
  result('lipid-error', 'lipid-results', () => {
    const l = C.lipid(kg, value('patient-age'));
    const rates = l.fixed ? `${fmt(l.rateLow)}–${fmt(l.rateHigh)} mL/min` : `${fmt(l.rateLow, 2)} mL/min`;
    return `<div class="result-card">${row('Weight used', `${fmt(l.kg)} kg`)}${row('Initial bolus · over 2–3 minutes', `${fmt(l.bolus)} mL`)}${row('Initial infusion', l.fixed ? 'Approximately 250 mL over 15–20 minutes' : rates)}${row('Equivalent initial pump rate', `${fmt(l.rateLow * 60)}${l.fixed ? '–' + fmt(l.rateHigh * 60) : ''} mL/hr`)}${row('Maximum cumulative lipid · all doses', `${fmt(l.maximum)} mL`)}<details><summary>Show the math</summary><p>Maximum = 12 mL/kg × ${fmt(l.kg, 3)} kg = ${fmt(l.maximum)} mL.</p><p>${l.fixed ? 'Over 70 kg: fixed approximate volumes from the checklist. 250 mL ÷ 20 or 15 minutes gives the rate range.' : `Bolus = 1.5 × ${fmt(l.kg, 3)} mL. Initial infusion = 0.25 × ${fmt(l.kg, 3)} mL/min.`} Multiply mL/min by 60 for mL/hr.</p></details><p class="info-text">${l.fixed ? 'ASRA approximate fixed-dose group, over 70 kg.' : 'Weight-based arithmetic: bolus 1.5 mL/kg; infusion 0.25 mL/kg/min. At exactly 70 kg this version uses weight-based arithmetic.'} Verify against the checklist and account for lipid already administered.</p></div>`;
  });
}
function renderAll() {
  $('patient-error').hidden = true;
  try {C.adultAge(value('patient-age')); C.weight(kg); $('patient-context').textContent = `Measured weight: ${fmt(kg, 3)} kg. Check the weight needed for each tool. No patient data are saved.`;} catch (e) {$('patient-error').textContent = e.message; $('patient-error').hidden = false; $('patient-context').textContent = 'Enter a valid measured weight. Calculated results are cleared when inputs are invalid.';}
  renderLocal(); renderFluids(); renderABL(); renderProfile(); renderBurns(); renderLipid();
}
$('patient-weight').addEventListener('input', () => {try {kg = C.toKg(value('patient-weight'), value('patient-unit'));} catch (_) {kg = '';} renderAll();});
$('patient-unit').addEventListener('change', () => {$('patient-weight').value = kg === '' ? '' : Number((Number(kg) * (value('patient-unit') === 'lb' ? 1 / 0.45359237 : 1)).toFixed(5)); renderAll();});
$('profile-height').addEventListener('input', () => {try {heightCm = C.number(value('profile-height'), 'height', 0.1, 1000) * (value('height-unit') === 'in' ? 2.54 : 1);} catch (_) {heightCm = '';} renderProfile();});
$('height-unit').addEventListener('change', () => {$('profile-height').value = heightCm === '' ? '' : Number((Number(heightCm) / (value('height-unit') === 'in' ? 2.54 : 1)).toFixed(5)); renderProfile();});
for (const id of ['patient-age', 'la-risk', 'la-prior-exparel', 'fluid-basis', 'fluid-weight', 'la-pregnancy', 'exp-prior-local', 'exp-lidocaine-minutes', 'exp-bupi-timing', 'exp-diluent', 'exp-diluent-volume', 'abl-factor', 'hb-start', 'hb-min', 'hct-start', 'hct-min', 'profile-sex', 'burn-protocol', 'burn-tbsa', 'burn-elapsed', 'burn-prior']) $(id).addEventListener('input', renderAll);
document.querySelectorAll('[name="abl-mode"]').forEach(el => el.addEventListener('change', renderABL));
$('reset-patient').addEventListener('click', () => {
  kg = ''; heightCm = ''; medications = [];
  document.querySelectorAll('main input, .patient-bar input').forEach(el => {if (el.type === 'checkbox') el.checked = false; else if (el.type !== 'radio') el.value = '';});
  for (const id of ['abl-factor', 'profile-sex', 'burn-protocol', 'fluid-basis', 'la-prior-exparel', 'la-pregnancy', 'exp-prior-local', 'exp-bupi-timing', 'exp-diluent']) $(id).value = '';
  $('patient-unit').value = 'kg'; $('height-unit').value = 'cm'; document.querySelector('[name="abl-mode"][value="hb"]').checked = true;
  addMedication(); renderAll(); $('patient-weight').focus();
});
$('copy-summary').addEventListener('click', async () => {
  if (!latestReview || latestReview.blocked) return;
  const p = patient();
  const lines = [`BlockCalc ${C.VERSION} — ${new Date().toISOString()}`, 'Reference comparison only, not a treatment order.', `Measured weight ${fmt(kg, 3)} kg; age ${p.age}; high-risk review ${p.highRisk}; prior EXPAREL within 96 h: ${p.priorExparel}; pregnancy: ${p.pregnancy || 'not checked for this drug'}`, `Reference review ${C.REVIEW_DATE}`];
  latestReview.rows.forEach(r => lines.push(`${r.name}: ${r.status}; ${r.volume} mL × ${r.mgMl} mg/mL = ${fmt(r.dose, 2)} mg; ${r.indication || r.route}; epinephrine ${!!r.epi}; reference limit ${fmt(r.limit)} mg; ${r.basis}; source ${r.source}`));
  lines.push('Within the checked limits. This does not establish safety.');
  if (latestReview.exparel) {
    const e = latestReview.exparel, o = exparelOptions();
    const timing = {'none':'No HCl', 'admix':'Same syringe', 'immediately-before':'HCl given right before EXPAREL'};
    const fluids = {'none':'None', 'saline':'Preservative-free 0.9% sodium chloride', 'lr':'Lactated Ringer’s'};
    lines.push(`EXPAREL compatibility: ${e.compatibility}; HCl ${fmt(e.bupiDose, 3)} mg; conservative HCl limit ${fmt(e.ratioLimit, 3)} mg.`,
      `Prior local anesthetic: ${o.priorLocal}${o.priorLocal === 'lidocaine' ? '; minutes before EXPAREL: ' + o.lidocaineMinutes : ''}.`,
      `HCl timing: ${timing[o.bupiTiming] || o.bupiTiming}. Added fluid: ${fluids[o.diluent] || o.diluent}, ${o.diluentVolume} mL.`,
      `Final syringe: ${fmt(e.finalVolume, 3)} mL; EXPAREL concentration ${fmt(e.finalConcentration, 4)} mg/mL.`,
      'Conservative listed-mg ratio and exact dilution floor; pharmacist review required.');
  }
  lines.push(...latestReview.stops.map(f => `STOP: ${f}`));
  lines.push(...latestReview.flags.map(f => `REVIEW: ${f}`));
  try {await navigator.clipboard.writeText(lines.join('\n')); $('copy-status').textContent = 'Complete review copied.';} catch (_) {$('copy-status').textContent = 'Copy is unavailable in this browser. Use the displayed review.';}
});
$('version').textContent = C.VERSION;
$('reference-list').innerHTML = Object.values(C.DRUGS).map(d => `<li><a href="${d.source}" target="_blank" rel="noopener">${d.name} product label</a></li>`).join('') + '<li><a href="https://www.fda.gov/vaccines-blood-biologics/safety-availability-biologics/labeling-changes-mortality-kidney-injury-and-excess-bleeding-hydroxyethyl-starch-products" target="_blank" rel="noopener">FDA synthetic starch warning</a></li>';
$('quick-exparel').addEventListener('click', () => {showPage('local'); if (!medications.some(a => a.drug === 'exparel')) {if (medications.length === 1 && !medications[0].drug) medications = []; addMedication('exparel');} $('exparel-checks').open = true;});
addMedication(); renderAll();
async function setupOffline() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') {$('offline-status').textContent = 'Offline installation requires HTTPS or localhost. Calculators still run while this page is open.'; $('check-update').disabled = true; return;}
  try {
    serviceWorkerRegistration = await navigator.serviceWorker.register('./service-worker.js');
    const showUpdate = () => {if (serviceWorkerRegistration.waiting && navigator.serviceWorker.controller) {$('apply-update').hidden = false; $('offline-status').textContent = 'An update is ready. Load it after finishing the current patient.';}};
    showUpdate();
    serviceWorkerRegistration.addEventListener('updatefound', () => {const worker = serviceWorkerRegistration.installing; worker.addEventListener('statechange', () => {if (worker.state === 'installed') {showUpdate(); if (!navigator.serviceWorker.controller) $('offline-status').textContent = 'App assets cached. Reload once to enable offline navigation.';}});});
    if (navigator.serviceWorker.controller) $('offline-status').textContent = 'App and dated adult clinical notes are available offline. Full source links need internet.';
  } catch (_) {$('offline-status').textContent = 'Offline setup was unsuccessful. Keep this page online and retry later.';}
}
$('check-update').addEventListener('click', async () => {try {if (!serviceWorkerRegistration) {await setupOffline(); return;} await serviceWorkerRegistration.update(); $('offline-status').textContent = serviceWorkerRegistration.waiting ? 'An update is ready to load.' : 'Update check completed; no waiting update found.'; $('apply-update').hidden = !serviceWorkerRegistration.waiting;} catch (_) {$('offline-status').textContent = 'Could not check for updates. Try again when online.';}});
$('apply-update').addEventListener('click', () => {if (!serviceWorkerRegistration?.waiting) return; navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), {once: true}); serviceWorkerRegistration.waiting.postMessage({type: 'ACTIVATE_UPDATE'});});
setupOffline();
