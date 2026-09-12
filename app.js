'use strict';
const C = window.BlockCalc;
const $ = id => document.getElementById(id);
const value = id => $(id).value;
const fmt = (n, digits = 1) => Number(n).toLocaleString('en-US', {maximumFractionDigits: digits});
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
}
document.querySelectorAll('[data-page]').forEach(el => el.addEventListener('click', () => showPage(el.dataset.page)));
$('menu-button').addEventListener('click', () => {const open = $('app-menu').hidden; $('app-menu').hidden = !open; $('menu-button').setAttribute('aria-expanded', String(open));});
document.addEventListener('keydown', e => {if (e.key === 'Escape' && !$('app-menu').hidden) {$('app-menu').hidden = true; $('menu-button').setAttribute('aria-expanded', 'false'); $('menu-button').focus();}});
function patient() {return {kg, age: value('patient-age'), highRisk: $('la-risk').checked, priorExparel: $('la-prior-exparel').checked};}
function result(errorId, outputId, fn) {
  $(errorId).hidden = true; $(errorId).textContent = ''; $(outputId).replaceChildren();
  try {$(outputId).innerHTML = fn();} catch (error) {$(errorId).textContent = error.message; $(errorId).hidden = false;}
}
function addMedication(drug = '') {
  medications.push({id: nextMedicationId++, drug, concentration: '', volume: '', status: 'given', epi: false, route: 'infiltration', indication: '', selectedLimit: '', lowerLimit: ''});
  if (drug === 'exparel') medications.at(-1).concentration = '1.3';
  renderMedicationInputs(); renderLocal();
}
function selectOptions(options, selected) {return options.map(([v, label]) => `<option value="${v}" ${String(v) === String(selected) ? 'selected' : ''}>${label}</option>`).join('');}
function medField(a, key, label, control) {return `<label for="med-${a.id}-${key}">${label}${control}</label>`;}
function medInput(a, key, extra = '') {return `<input id="med-${a.id}-${key}" data-key="${key}" type="number" step="any" min="0" value="${escapeHTML(a[key])}" ${extra}>`;}
function renderMedicationInputs() {
  $('medications').innerHTML = medications.map((a, index) => {
    const exp = a.drug === 'exparel'; const d = C.DRUGS[a.drug];
    const select = (key, options) => `<select id="med-${a.id}-${key}" data-key="${key}">${selectOptions(options, a[key])}</select>`;
    let html = `<section class="agent-card" data-medication="${a.id}" aria-label="Medication ${index + 1}"><div class="agent-header"><h2>Medication ${index + 1}</h2><button class="remove-btn" data-remove="${a.id}" aria-label="Remove medication ${index + 1}">Remove</button></div><div class="fields">`;
    html += medField(a, 'drug', 'Medication', select('drug', [['', 'Select medication'], ...Object.entries(C.DRUGS).map(([key, drug]) => [key, drug.name])]));
    html += medField(a, 'status', 'Dose status', select('status', [['given', 'Already administered'], ['planned', 'Proposed additional dose']]));
    if (exp) {
      html += medField(a, 'indication', 'Exparel indication', select('indication', [['', 'Select indication'], ['infiltration', 'Local infiltration'], ['interscalene', 'Adult interscalene block'], ['popliteal', 'Adult popliteal sciatic block'], ['adductor', 'Adult adductor canal block']]));
      html += '<div><strong>Concentration</strong><p>13.3 mg/mL · fixed</p></div>';
    } else {
      html += medField(a, 'route', 'Procedure', select('route', [['infiltration', 'Local infiltration'], ['peripheral', 'Peripheral nerve block']]));
      html += medField(a, 'concentration', 'Concentration', select('concentration', [['', 'Select concentration'], ...(d ? d.concentrations : []).map(n => [n, `${n}% · ${n * 10} mg/mL`])]));
    }
    html += medField(a, 'volume', 'Volume (mL)', medInput(a, 'volume', 'max="1000" placeholder="Enter 0 if none"'));
    if (!exp && ['bupivacaine', 'mepivacaine', 'ropivacaine'].includes(a.drug)) {
      const cap = a.drug === 'bupivacaine' ? (a.epi ? 225 : 175) : a.drug === 'mepivacaine' ? 400 : a.route === 'infiltration' ? 200 : 300;
      html += medField(a, 'selectedLimit', `Clinician-selected total limit (mg; ≤${cap})`, medInput(a, 'selectedLimit', `max="${cap}" placeholder="Required for this drug"`));
    }
    html += '</div>';
    if (!exp && d) {
      if (['lidocaine', 'bupivacaine', 'chloroprocaine'].includes(a.drug)) html += `<label class="checkbox-row"><input type="checkbox" data-key="epi" ${a.epi ? 'checked' : ''}>This medication contains epinephrine${a.drug === 'chloroprocaine' ? ' (1:200,000)' : ''}</label>`;
      html += `<details><summary>Lower patient-specific limit (optional)</summary>${medField(a, 'lowerLimit', 'Lower total limit (mg)', medInput(a, 'lowerLimit', 'placeholder="Only if selected by clinician"'))}</details>`;
    }
    if (exp) html += `<aside class="info-warn"><strong>Separate compatibility review</strong><p>Add bupivacaine HCl as its own medication row so it appears in the full record. Exparel is not included in a generic remaining-dose budget.</p><p>Do not admix non-bupivacaine anesthetics. The ≥20-minute interval is established for prior lidocaine, not every agent. Avoid additional local anesthetics within 96 hours; consult label-specific concomitant-use instructions.</p><button class="text-button" data-add-bupi="true">+ Add bupivacaine HCl row</button></aside>`;
    if (d) html += `<p class="info-text"><a href="${d.source}" target="_blank" rel="noopener">${d.name} prescribing information</a></p>`;
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
  if (key === 'drug') {a.concentration = a.drug === 'exparel' ? '1.3' : ''; a.selectedLimit = ''; a.lowerLimit = ''; a.epi = false; a.indication = '';}
  if (key === 'route') {a.selectedLimit = ''; a.lowerLimit = '';}
  if (['drug', 'route'].includes(key)) renderMedicationInputs();
  renderLocal();
});
$('medications').addEventListener('click', event => {
  const remove = event.target.closest('[data-remove]');
  if (remove) {medications = medications.filter(m => m.id !== Number(remove.dataset.remove)); renderMedicationInputs(); renderLocal(); $('add-medication').focus();}
  if (event.target.closest('[data-add-bupi]')) addMedication('bupivacaine');
});
$('add-medication').addEventListener('click', () => {addMedication(); $(`med-${medications.at(-1).id}-drug`).focus();});
function renderLocal() {
  latestReview = null; $('copy-summary').disabled = true; $('copy-status').textContent = '';
  result('la-error', 'la-results', () => {
    const review = C.medicationReview(medications, patient()); latestReview = review; $('copy-summary').disabled = false;
    let html = `<div class="${review.flags.length ? 'info-warn' : 'clinical-note'}"><h2>${review.flags.length ? 'Dose review required' : 'Below the selected reference limits'}</h2><p>This comparison does not establish safety for this patient.</p>${review.flags.length ? '<ul>' + review.flags.map(flag => `<li>${escapeHTML(flag)}</li>`).join('') + '</ul>' : ''}</div>`;
    for (const r of review.rows) html += `<div class="result-card"><h3>${r.name} · ${r.status === 'given' ? 'Already administered' : 'Proposed additional dose'}</h3>${row('Dose entered', `${fmt(r.dose, 2)} mg`)}${row('Volume and concentration', `${fmt(r.volume)} mL × ${fmt(r.mgMl, 2)} mg/mL`)}${row('Selected reference limit', `${fmt(r.limit, 2)} mg`)}<details><summary>Show reference calculation</summary><p>${escapeHTML(r.basis)}</p><a href="${r.source}" target="_blank" rel="noopener">Product label</a></details></div>`;
    if (review.fraction !== null) html += `<div class="result-card">${row('Combined reference fraction', `${fmt(review.fraction * 100)}%`)}<p class="info-text">All administered and proposed doses are counted. Repeated rows of the same drug are combined using the lower selected limit. This fraction is not a toxicity probability or an instruction to use the remaining percentage.</p></div>`;
    return html;
  });
}
function renderFluids() {
  result('fluid-error', 'fluid-results', () => {
    const f = C.fluids(kg, value('fasting'), value('duration'));
    return `<div class="clinical-note">${row('Base rate (maintenance)', `${fmt(f.rate)} mL/hr`)}${row('Estimated fasting deficit', `${fmt(f.deficit)} mL`)}<p>${fmt(f.rate)} mL/hr × ${escapeHTML(value('fasting'))} hours = ${fmt(f.deficit)} mL</p></div><h2>First four hours</h2><p class="info-text">From the start of deficit replacement. Each row covers one full hour.</p><div class="result-card">${f.schedule.map(r => `<div class="hour-row"><div><strong>${['First', 'Second', 'Third', 'Fourth'][r.hour - 1]} hour</strong><p>${r.hour - 1}–${r.hour} hours · ${r.hour === 4 ? 'base only' : r.hour === 1 ? 'half the deficit' : 'one quarter of deficit'}</p></div><div class="hour-total"><strong>${fmt(r.total)} mL</strong><p>${fmt(r.total)} mL/hr for 1 hour</p></div><p class="hour-formula">${fmt(r.base)} mL base + ${fmt(r.deficit)} mL deficit = ${fmt(r.total)} mL</p></div>`).join('')}</div><div class="clinical-note"><h2>Total through ${fmt(f.duration, 2)} hours: <span id="fluid-total">${fmt(f.total)} mL</span></h2><p>${fmt(f.baseIncluded)} mL maintenance + ${fmt(f.deficitIncluded)} mL deficit</p><p>Blood-loss replacement excluded. Partial hours are prorated.</p></div><details><summary>Show the base-rate calculation</summary><p>First 10 kg: ${fmt(f.parts[0])} mL/hr</p><p>Next 10 kg: ${fmt(f.parts[1])} mL/hr</p><p>Remaining weight: ${fmt(f.parts[2])} mL/hr</p><p>4, 2 and 1 mL/kg/hr for the respective weight bands.</p></details>`;
  });
}
function ablFactor() {return value('abl-factor') === 'custom' ? value('abl-custom') : value('abl-factor');}
function renderABL() {
  const mode = document.querySelector('[name="abl-mode"]:checked').value;
  $('hb-fields').hidden = mode !== 'hb'; $('hct-fields').hidden = mode !== 'hct'; $('abl-custom-wrap').hidden = value('abl-factor') !== 'custom';
  result('abl-error', 'abl-results', () => {
    const a = C.abl(kg, ablFactor(), value(`${mode}-start`), value(`${mode}-min`), mode);
    return `<div class="clinical-note"><span>Estimated loss to selected ${mode === 'hb' ? 'hemoglobin' : 'hematocrit'}</span><h2 id="abl-total">${fmt(a.loss)} mL</h2></div><div class="result-card"><h3>Calculation</h3>${row('Estimated blood volume', `${fmt(a.ebv)} mL`)}<p>${fmt(Number(kg))} kg × ${fmt(a.factor)} mL/kg = ${fmt(a.ebv)} mL</p><p>${fmt(a.ebv)} × (${fmt(a.initial)} − ${fmt(a.minimum)}) ÷ ${fmt(a.initial)} = ${fmt(a.loss)} mL</p><p class="info-text">Both laboratory inputs are ${a.unit}. Equal starting and minimum values yield 0 mL.</p></div>`;
  });
  const comparisons = ['hb', 'hct'].map(mode => {try {const a = C.abl(kg, ablFactor(), value(`${mode}-start`), value(`${mode}-min`), mode); return row(mode === 'hb' ? 'Your hemoglobin inputs' : 'Your hematocrit inputs', `${fmt(a.loss)} mL`);} catch (_) {return '';}});
  $('abl-comparison').innerHTML = comparisons.join('');
}
function renderProfile() {
  result('profile-error', 'profile-results', () => {
    C.number(value('patient-age'), 'age for adult body-size references', 18, 120);
    const p = C.measurements(kg, heightCm, value('profile-sex'));
    return `<div class="result-card">${row('Ideal body weight (IBW) · Devine', `${fmt(p.ibw)} kg`)}${row('Lean body weight (LBW) · Janmahasatian', `${fmt(p.lbw)} kg`)}${row('Body surface area (BSA) · Mosteller', `${fmt(p.bsa, 2)} m²`)}${row('Body mass index (BMI)', `${fmt(p.bmi)} kg/m²`)}${row('Weight category', p.category)}</div><details><summary>Adjusted weight and ventilation reference</summary>${row('Adjusted body weight · 0.4 correction', `${fmt(p.adjusted)} kg`)}<p>Use adjusted weight only when the medication protocol calls for it. No automatic indication is assigned.</p>${row('Predicted body weight (PBW) · adult ARDSNet', `${fmt(p.pbw)} kg`)}<p>PBW is shown separately from Devine IBW. No universal tidal-volume target is prescribed.</p><a href="https://biolincc.nhlbi.nih.gov/media/studies/factt/Protocol.pdf" target="_blank" rel="noopener">ARDSNet protocol</a></details>`;
  });
}
function renderBurns() {
  const protocol = value('burn-protocol'); $('burn-pediatric').hidden = protocol !== 'pediatric';
  result('burn-error', 'burn-results', () => {
    if (protocol === 'pediatric') C.number(value('patient-age'), 'pediatric age in years', 0, 17.99); else C.number(value('patient-age'), 'adult age in years', 18, 120);
    const b = C.burns({kg, tbsa: value('burn-tbsa'), elapsed: value('burn-elapsed'), prior: value('burn-prior'), protocol, pediatricCoefficient: value('burn-coefficient')});
    let html = `<div class="clinical-note"><span>Initial 24-hour formula estimate</span><h2>${fmt(b.total)} mL</h2><p>${b.coefficient} × ${fmt(Number(kg))} kg × ${escapeHTML(value('burn-tbsa'))}%</p></div>`;
    if (b.elapsed >= 24) return html + '<div class="info-warn">At least 24 hours have elapsed. This initial formula does not provide an ongoing rate. Reassess with the burn team.</div>';
    html += `<div class="result-card">${row('Time since injury', `${fmt(b.elapsed)} hours`)}${row('Previously given resuscitation fluid', `${fmt(b.prior)} mL`)}${row('Remaining 24-hour formula volume', `${fmt(b.remaining)} mL`)}${row('Time to 24 hours after injury', `${fmt(b.timeLeft24)} hours`)}`;
    if (protocol === 'pediatric') html += '<p>Use the timing in the prescribed pediatric protocol. No adult eight-hour schedule is applied.</p>';
    else if (b.elapsed < 8) html += row('Remaining first-period formula volume', `${fmt(b.remainingFirst)} mL`) + row('Time to 8 hours after injury', `${fmt(b.timeLeftFirst)} hours`);
    else html += '<p>The first eight-hour period has passed. No automatic catch-up rate is calculated.</p>';
    if (b.prior >= b.total) html += '<p>Previously administered fluid meets or exceeds the formula estimate. This does not determine whether to stop fluids; reassess clinically.</p>';
    html += '</div>';
    if (protocol !== 'pediatric') html += `<details><summary>Original time-zero schedule (before titration)</summary><p>Half over the first 8 hours from injury: ${fmt(b.firstPeriod)} mL, nominally ${fmt(b.nominalFirstRate)} mL/hr.</p><p>Half over the following 16 hours: ${fmt(b.firstPeriod)} mL, nominally ${fmt(b.nominalNextRate)} mL/hr.</p><p>These are original formula rates, not adjusted rates for the current time.</p></details>`;
    return html;
  });
}
function renderLipid() {
  result('lipid-error', 'lipid-results', () => {
    const l = C.lipid(kg);
    const rates = l.fixed ? `${fmt(l.rateLow)}–${fmt(l.rateHigh)} mL/min` : `${fmt(l.rateLow, 2)} mL/min`;
    return `<div class="result-card">${row('Weight used', `${fmt(l.kg)} kg`)}${row('Initial bolus · over 2–3 minutes', `${fmt(l.bolus)} mL`)}${row('Initial infusion', l.fixed ? 'Approximately 250 mL over 15–20 minutes' : rates)}${row('Equivalent initial pump rate', `${fmt(l.rateLow * 60)}${l.fixed ? '–' + fmt(l.rateHigh * 60) : ''} mL/hr`)}${row('Maximum cumulative lipid · all doses', `${fmt(l.maximum)} mL`)}<p class="info-text">${l.fixed ? 'ASRA approximate fixed-dose group, over 70 kg.' : 'Weight-based arithmetic: bolus 1.5 mL/kg; infusion 0.25 mL/kg/min. At exactly 70 kg this version uses weight-based arithmetic.'} Verify against the checklist and account for lipid already administered.</p></div>`;
  });
}
function renderAll() {
  $('patient-error').hidden = true;
  try {C.weight(kg); $('patient-context').textContent = `Shared measured weight: ${fmt(kg, 3)} kg. Confirm the appropriate dosing weight for each protocol. No patient data are saved.`;} catch (e) {$('patient-error').textContent = e.message; $('patient-error').hidden = false; $('patient-context').textContent = 'Enter a valid measured weight. Calculated results are cleared when inputs are invalid.';}
  renderLocal(); renderFluids(); renderABL(); renderProfile(); renderBurns(); renderLipid();
}
$('patient-weight').addEventListener('input', () => {kg = value('patient-weight') === '' ? '' : Number(value('patient-weight')) / (value('patient-unit') === 'lb' ? 2.2046226218 : 1); renderAll();});
$('patient-unit').addEventListener('change', () => {$('patient-weight').value = kg === '' ? '' : Number((Number(kg) * (value('patient-unit') === 'lb' ? 2.2046226218 : 1)).toFixed(5)); renderAll();});
$('profile-height').addEventListener('input', () => {heightCm = value('profile-height') === '' ? '' : Number(value('profile-height')) * (value('height-unit') === 'in' ? 2.54 : 1); renderProfile();});
$('height-unit').addEventListener('change', () => {$('profile-height').value = heightCm === '' ? '' : Number((Number(heightCm) / (value('height-unit') === 'in' ? 2.54 : 1)).toFixed(5)); renderProfile();});
for (const id of ['patient-age', 'la-risk', 'la-prior-exparel', 'fasting', 'duration', 'abl-factor', 'abl-custom', 'hb-start', 'hb-min', 'hct-start', 'hct-min', 'profile-sex', 'burn-protocol', 'burn-coefficient', 'burn-tbsa', 'burn-elapsed', 'burn-prior']) $(id).addEventListener('input', renderAll);
document.querySelectorAll('[name="abl-mode"]').forEach(el => el.addEventListener('change', renderABL));
$('reset-patient').addEventListener('click', () => {
  kg = ''; heightCm = ''; medications = [];
  document.querySelectorAll('main input, .patient-bar input').forEach(el => {if (el.type === 'checkbox') el.checked = false; else if (el.type !== 'radio') el.value = '';});
  for (const id of ['abl-factor', 'profile-sex', 'burn-protocol']) $(id).value = '';
  $('patient-unit').value = 'kg'; $('height-unit').value = 'cm'; document.querySelector('[name="abl-mode"][value="hb"]').checked = true;
  addMedication(); renderAll(); $('patient-weight').focus();
});
$('copy-summary').addEventListener('click', async () => {
  if (!latestReview) return;
  const p = patient();
  const lines = [`BlockCalc ${C.VERSION} — ${new Date().toISOString()}`, 'Reference comparison only, not a treatment order.', `Measured weight ${fmt(kg, 3)} kg; age ${p.age}; high-risk review ${p.highRisk}; prior Exparel within 96 h ${p.priorExparel}`, `Reference review ${C.REVIEW_DATE}`];
  latestReview.rows.forEach(r => lines.push(`${r.name}: ${r.status}; ${r.volume} mL × ${r.mgMl} mg/mL = ${fmt(r.dose, 2)} mg; ${r.indication || r.route}; epinephrine ${!!r.epi}; reference limit ${fmt(r.limit)} mg; ${r.basis}; source ${r.source}`));
  if (latestReview.fraction !== null) lines.push(`Combined reference fraction: ${fmt(latestReview.fraction * 100)}%`);
  lines.push(...latestReview.flags.map(f => `REVIEW: ${f}`));
  try {await navigator.clipboard.writeText(lines.join('\n')); $('copy-status').textContent = 'Complete review copied.';} catch (_) {$('copy-status').textContent = 'Copy is unavailable in this browser. Use the displayed review.';}
});
$('version').textContent = C.VERSION;
$('reference-list').innerHTML = Object.values(C.DRUGS).map(d => `<li><a href="${d.source}" target="_blank" rel="noopener">${d.name} product label</a></li>`).join('') + '<li><a href="https://www.fda.gov/vaccines-blood-biologics/safety-availability-biologics/labeling-changes-mortality-kidney-injury-and-excess-bleeding-hydroxyethyl-starch-products" target="_blank" rel="noopener">FDA synthetic starch warning</a></li>';
addMedication(); renderAll();
async function setupOffline() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') {$('offline-status').textContent = 'Offline installation requires HTTPS or localhost. Calculators still run while this page is open.'; $('check-update').disabled = true; return;}
  try {
    serviceWorkerRegistration = await navigator.serviceWorker.register('./service-worker.js');
    const showUpdate = () => {if (serviceWorkerRegistration.waiting && navigator.serviceWorker.controller) {$('apply-update').hidden = false; $('offline-status').textContent = 'An update is ready. Load it after finishing the current patient.';}};
    showUpdate();
    serviceWorkerRegistration.addEventListener('updatefound', () => {const worker = serviceWorkerRegistration.installing; worker.addEventListener('statechange', () => {if (worker.state === 'installed') {showUpdate(); if (!navigator.serviceWorker.controller) $('offline-status').textContent = 'App assets cached. Reload once to enable offline navigation.';}});});
    if (navigator.serviceWorker.controller) $('offline-status').textContent = 'App assets available offline. External clinical references require a separate saved copy.';
  } catch (_) {$('offline-status').textContent = 'Offline setup was unsuccessful. Keep this page online and retry later.';}
}
$('check-update').addEventListener('click', async () => {try {if (!serviceWorkerRegistration) {await setupOffline(); return;} await serviceWorkerRegistration.update(); $('offline-status').textContent = serviceWorkerRegistration.waiting ? 'An update is ready to load.' : 'Update check completed; no waiting update found.'; $('apply-update').hidden = !serviceWorkerRegistration.waiting;} catch (_) {$('offline-status').textContent = 'Could not check for updates. Try again when online.';}});
$('apply-update').addEventListener('click', () => {if (!serviceWorkerRegistration?.waiting) return; navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), {once: true}); serviceWorkerRegistration.waiting.postMessage({type: 'ACTIVATE_UPDATE'});});
setupOffline();
