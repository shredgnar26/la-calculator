const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('../calculations.js');

// Assertions are computed here independently of the implementation.
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const adult = {kg: 70, age: 40, priorExparel: 'no', pregnancy: 'no', highRisk: false};
const med = changes => ({drug: 'lidocaine', concentration: 1, volume: 10, status: 'given', epi: false, route: 'infiltration', selectedLimit: '', lowerLimit: '', indication: '', ...changes});
const exp = changes => ({drug: 'exparel', concentration: 1.3, volume: 20, status: 'planned', indication: 'infiltration', epi: false, route: '', selectedLimit: '', lowerLimit: '', ...changes});
const expOpts = changes => ({priorLocal: 'none', lidocaineMinutes: '', bupiTiming: 'none', diluent: 'none', diluentVolume: 0, ...changes});

test('version, review date and exported API surface', () => {
  assert.equal(C.VERSION, '2.1.0-review.1');
  assert.equal(C.REVIEW_DATE, '2026-10-21');
  for (const fn of ['number', 'weight', 'adultAge', 'toKg', 'maintenance', 'fluids', 'adultMaintenance', 'abl', 'measurements', 'burns', 'lipid', 'referenceLimit', 'medicationReview']) {
    assert.equal(typeof C[fn], 'function', fn);
  }
});

test('strict numeric parsing rejects blanks, hex, scientific, non-numeric and non-finite', () => {
  for (const bad of ['', '   ', '0x10', '0X10', '1e3', '1E3', '1e-3', 'NaN', 'Infinity', '-Infinity', 'abc', '1,000', '1 2', '12px', null, undefined, true, false, [], {}, [1]]) {
    assert.throws(() => C.number(bad, 'value', 0, 100), `accepted ${String(bad)}`);
  }
  for (const bad of [NaN, Infinity, -Infinity]) assert.throws(() => C.number(bad, 'value', 0, 100));
  close(C.number(' 12.5 ', 'value'), 12.5);
  close(C.number('.5', 'value'), 0.5);
  close(C.number('+3', 'value'), 3);
  close(C.number('-3', 'value', -5), -3);
  close(C.number('3.', 'value'), 3);
  close(C.number(7, 'value'), 7);
  assert.throws(() => C.number('101', 'value', 0, 100));
  assert.throws(() => C.number('-1', 'value', 0, 100));
});

test('weight software bounds 0.1..350 are input validation, not eligibility', () => {
  close(C.weight(0.1), 0.1);
  close(C.weight('0.1'), 0.1);
  close(C.weight('350'), 350);
  close(C.weight(200), 200);
  for (const bad of [0, 0.09, 350.1, -1, '', null, NaN, Infinity, '1e2']) assert.throws(() => C.weight(bad));
});

test('adult age guard 18..120 is mandatory at every clinical API', () => {
  close(C.adultAge(18), 18);
  close(C.adultAge('120'), 120);
  for (const bad of [17.999, 120.001, 0, '', null, undefined, 'adult', NaN, '1e2']) assert.throws(() => C.adultAge(bad));
  assert.throws(() => C.maintenance(70, 17));
  assert.throws(() => C.fluids(70, 121));
  assert.throws(() => C.adultMaintenance(70, 17, 'measured'));
  assert.throws(() => C.abl(70, 75, 14, 10, 'hb', 17));
  assert.throws(() => C.measurements(70, 170, 'male', 17));
  assert.throws(() => C.burns({kg: 70, age: 17, tbsa: 30, elapsed: 1, prior: 0, protocol: 'aba-adult'}));
  assert.throws(() => C.lipid(70, 17));
  assert.throws(() => C.referenceLimit(med({}), {kg: 70, age: 17}));
  assert.throws(() => C.medicationReview([med({})], {kg: 70, age: 17, priorExparel: 'no'}));
  assert.throws(() => C.medicationReview([med({})], {kg: 70, age: 121, priorExparel: 'no'}));
});

test('toKg uses an exact lb factor and strict rejection', () => {
  close(C.toKg(70, 'kg'), 70);
  close(C.toKg('2', 'lb'), 2 * 0.45359237);
  close(C.toKg('10', 'lb'), 4.5359237);
  close(C.toKg('100', 'lb'), 45.359237);
  assert.equal(C.toKg('2', 'lb'), 0.90718474);
  for (const bad of ['1e2', '0x10', '', null, [], {}]) assert.throws(() => C.toKg(bad, 'kg'));
  assert.throws(() => C.toKg('70', 'stone'));
});

test('4-2-1 maintenance boundaries, 70=110 and 100=140 totals', () => {
  close(C.maintenance(5, 40).rate, 20);
  close(C.maintenance(10, 40).rate, 40);
  close(C.maintenance('10.5', 40).rate, 41);
  close(C.maintenance(20, 40).rate, 60);
  close(C.maintenance(20.5, 40).rate, 60.5);
  close(C.maintenance(70, 40).rate, 110);
  close(C.maintenance(100, 40).rate, 140);
  const m = C.maintenance(70, 40);
  assert.deepEqual(m.parts, [40, 20, 50]);
  close(m.daily, 2640);
  close(m.kg, 70);
  close(C.maintenance(100, 40).daily, 3360);
});

test('fluids is the maintenance alias with no fasting/NPO deficit schedule', () => {
  const f = C.fluids(70, 40);
  assert.deepEqual(f, C.maintenance(70, 40));
  assert.equal('deficit' in f, false);
  assert.equal('schedule' in f, false);
  close(f.rate, 110);
  close(f.daily, 2640);
});

test('NICE adult maintenance ranges and required weight basis', () => {
  const n = C.adultMaintenance(70, 40, 'measured');
  close(n.kg, 70);
  assert.equal(n.basis, 'measured');
  close(n.dailyLow, 1750);
  close(n.dailyHigh, 2100);
  close(n.lowerDailyLow, 1400);
  close(n.lowerDailyHigh, 1750);
  close(n.hourlyLow, 1750 / 24);
  close(n.hourlyHigh, 2100 / 24);
  close(C.adultMaintenance(100, 40, 'ideal').dailyHigh, 3000);
  for (const bad of ['', 'actual', null, 'MEASURED']) assert.throws(() => C.adultMaintenance(70, 40, bad));
});

test('adult ABL arithmetic preserved with an age guard', () => {
  close(C.abl(70, 75, 14, 10, 'hb', 40).loss, 1500);
  close(C.abl(70, 75, 42, 30, 'hct', 40).loss, 1500);
  close(C.abl(70, 75, 10, 10, 'hb', 40).loss, 0);
  close(C.abl(70, 75, 13, 10, 'hb', 40).loss, 5250 * 3 / 13);
  assert.throws(() => C.abl(70, 75, 10, 11, 'hb', 40));
  assert.throws(() => C.abl(70, 75, 42, 30, 'hb', 40));
  assert.throws(() => C.abl(70, 75, 14, 10, 'other', 40));
});

test('adult body-size outputs; adjusted/category removed; LBW study-range warning', () => {
  const r = C.measurements(70, 170, 'male', 40);
  close(r.bmi, 70 / 1.7 ** 2);
  close(r.ibw, 50 + 2.3 * (170 / 2.54 - 60));
  close(r.pbw, 66.016);
  close(r.bsa, Math.sqrt(170 * 70 / 3600));
  assert.equal('adjusted' in r, false);
  assert.equal('category' in r, false);
  assert.deepEqual(r.warnings, []);
  assert.equal(C.measurements(85, 170, 'male', 85).warnings.length, 1);
  assert.equal(C.measurements(30, 170, 'male', 40).warnings.length, 1);
  assert.equal(C.measurements(70, 170, 'female', 40).warnings.length, 0);
  assert.throws(() => C.measurements(70, 140, 'male', 40));
  assert.throws(() => C.measurements(70, 231, 'male', 40));
  assert.throws(() => C.measurements(70, 170, '', 40));
});

test('adult burn protocols, elapsed time and prior fluids', () => {
  const b = C.burns({kg: 70, age: 40, tbsa: 30, elapsed: 2, prior: 500, protocol: 'aba-adult'});
  close(b.total, 4200);
  close(b.firstPeriod, 2100);
  close(b.remaining, 3700);
  close(b.remainingFirst, 1600);
  close(b.timeLeftFirst, 6);
  close(b.timeLeft24, 22);
  close(b.nominalFirstRate, 262.5);
  close(b.nominalNextRate, 131.25);
  close(C.burns({kg: 70, age: 40, tbsa: 30, elapsed: 0, prior: 0, protocol: 'parkland-adult'}).total, 8400);
  close(C.burns({kg: 70, age: 40, tbsa: 30, elapsed: 24, prior: 5000, protocol: 'aba-adult'}).remaining, 0);
  for (const bad of [{tbsa: 101}, {tbsa: 19}, {elapsed: -1}, {prior: -1}]) {
    assert.throws(() => C.burns({kg: 70, age: 40, tbsa: 30, elapsed: 0, prior: 0, protocol: 'aba-adult', ...bad}));
  }
  assert.throws(() => C.burns({kg: 70, age: 40, tbsa: 30, elapsed: 0, prior: 0, protocol: 'pediatric'}));
});

test('LAST lipid arithmetic and the 70 kg boundary', () => {
  const l = C.lipid(60, 40);
  close(l.bolus, 90);
  close(l.rateLow, 15);
  close(l.maximum, 720);
  assert.equal(C.lipid(70, 40).fixed, false);
  assert.equal(C.lipid(70.01, 40).fixed, true);
  close(C.lipid(80, 40).rateHigh * 15, 250);
  close(C.lipid(80, 40).rateLow * 20, 250);
});

test('lidocaine/chloroprocaine label ceilings and selected clinician limits', () => {
  close(C.referenceLimit(med({}), {kg: 100, age: 40}).limit, 300);
  close(C.referenceLimit(med({epi: true}), {kg: 100, age: 40}).limit, 500);
  close(C.referenceLimit(med({drug: 'chloroprocaine'}), {kg: 100, age: 40}).limit, 800);
  close(C.referenceLimit(med({drug: 'chloroprocaine', epi: true}), {kg: 100, age: 40}).limit, 1000);
  close(C.referenceLimit(med({}), {kg: 50, age: 40}).limit, 225);
  for (const drug of ['bupivacaine', 'mepivacaine', 'ropivacaine']) assert.throws(() => C.referenceLimit(med({drug}), {kg: 70, age: 40}));
  assert.throws(() => C.referenceLimit(med({drug: 'bupivacaine', selectedLimit: 176}), {kg: 70, age: 40}));
  close(C.referenceLimit(med({drug: 'bupivacaine', selectedLimit: 175, lowerLimit: 140}), {kg: 70, age: 40}).limit, 140);
  close(C.referenceLimit(med({drug: 'bupivacaine', epi: true, selectedLimit: 225}), {kg: 70, age: 40}).limit, 225);
  close(C.referenceLimit(med({drug: 'mepivacaine', concentration: 1, selectedLimit: 400}), {kg: 70, age: 40}).limit, 400);
  assert.throws(() => C.referenceLimit(med({drug: 'mepivacaine', concentration: 1, selectedLimit: 401}), {kg: 70, age: 40}));
  close(C.referenceLimit(med({drug: 'ropivacaine', concentration: 0.5, route: 'peripheral', selectedLimit: 250}), {kg: 70, age: 40}).limit, 250);
  close(C.referenceLimit(med({drug: 'ropivacaine', concentration: 0.75, route: 'peripheral', selectedLimit: 300}), {kg: 70, age: 40}).limit, 300);
  close(C.referenceLimit(med({drug: 'ropivacaine', concentration: 0.5, route: 'infiltration', selectedLimit: 200}), {kg: 70, age: 40}).limit, 200);
  assert.throws(() => C.referenceLimit(med({drug: 'ropivacaine', concentration: 0.2, route: 'peripheral', selectedLimit: 200}), {kg: 70, age: 40}));
});

test('route/concentration mismatches are rejected', () => {
  const ap = {kg: 70, age: 40, priorExparel: 'no'};
  assert.throws(() => C.medicationReview([med({drug: 'bupivacaine', concentration: 0.5, selectedLimit: 175})], ap));
  assert.throws(() => C.medicationReview([med({drug: 'ropivacaine', concentration: 0.75, selectedLimit: 200})], ap));
  assert.throws(() => C.medicationReview([med({drug: 'ropivacaine', concentration: 0.2, route: 'peripheral', selectedLimit: 200})], ap));
  assert.throws(() => C.medicationReview([med({drug: 'mepivacaine', concentration: 2, selectedLimit: 400})], ap));
  assert.throws(() => C.medicationReview([med({drug: 'mepivacaine', concentration: 0.5, route: 'peripheral', selectedLimit: 400})], ap));
  assert.throws(() => C.medicationReview([med({drug: 'mepivacaine', concentration: 1.5, selectedLimit: 400})], ap));
  const ok = C.medicationReview([med({drug: 'mepivacaine', concentration: 0.5, route: 'infiltration', selectedLimit: 400})], ap);
  close(ok.rows[0].dose, 50);
});

test('epi boolean, status, drug and volume are required and validated', () => {
  const ap = {kg: 70, age: 40, priorExparel: 'no'};
  assert.throws(() => C.medicationReview([med({epi: undefined})], ap));
  assert.throws(() => C.medicationReview([med({epi: 'false'})], ap));
  assert.throws(() => C.medicationReview([med({status: 'unknown'})], ap));
  assert.throws(() => C.medicationReview([med({status: ''})], ap));
  assert.throws(() => C.medicationReview([med({drug: ''})], ap));
  assert.throws(() => C.medicationReview([], ap));
  assert.throws(() => C.medicationReview([med({volume: ''})], ap));
  assert.throws(() => C.medicationReview([med({volume: -1})], ap));
  assert.throws(() => C.medicationReview([med({concentration: 99})], ap));
});

test('priorExparel enum is required and yes/unknown hard-block the plan', () => {
  assert.throws(() => C.medicationReview([med({})], {kg: 70, age: 40}));
  assert.throws(() => C.medicationReview([med({})], {kg: 70, age: 40, priorExparel: ''}));
  assert.throws(() => C.medicationReview([med({})], {kg: 70, age: 40, priorExparel: true}));
  const yes = C.medicationReview([med({})], {kg: 70, age: 40, priorExparel: 'yes'});
  assert.equal(yes.blocked, true);
  assert.ok(yes.stops.some(s => s.includes('96')));
  assert.equal(C.medicationReview([med({})], {kg: 70, age: 40, priorExparel: 'unknown'}).blocked, true);
  assert.equal(C.medicationReview([med({})], {kg: 70, age: 40, priorExparel: 'no'}).blocked, false);
});

test('duplicate rows sum the same drug and keep the lowest chosen limit', () => {
  const ap = {kg: 70, age: 40, priorExparel: 'no'};
  const r = C.medicationReview([
    med({drug: 'bupivacaine', concentration: 0.5, route: 'peripheral', volume: 10, selectedLimit: 100, epi: false}),
    med({drug: 'bupivacaine', concentration: 0.5, route: 'peripheral', volume: 10, selectedLimit: 80, epi: false})
  ], ap);
  const t = r.totals.find(x => x.drug === 'bupivacaine');
  close(t.dose, 100);
  close(t.limit, 80);
  assert.equal(r.blocked, true);
  assert.ok(r.stops.some(s => s.includes('Bupivacaine HCl')));
});

test('review shape: per-drug totals, no cross-agent fraction or given-dose total', () => {
  const ap = {kg: 70, age: 40, priorExparel: 'no'};
  const r = C.medicationReview([med({volume: 10}), med({drug: 'chloroprocaine', concentration: 2, volume: 5})], ap);
  assert.equal('fraction' in r, false);
  assert.equal('givenDose' in r, false);
  assert.equal(r.blocked, true);
  assert.equal(r.totals.length, 2);
  for (const t of r.totals) assert.deepEqual(Object.keys(t).sort(), ['dose', 'drug', 'limit', 'name']);
  close(r.totals.find(t => t.drug === 'lidocaine').dose, 100);
  close(r.totals.find(t => t.drug === 'chloroprocaine').dose, 100);
});

test('flags name toxicity, monitoring, product differences and no safety approval', () => {
  const r = C.medicationReview([med({})], {kg: 70, age: 40, priorExparel: 'no'});
  const text = r.flags.join(' ').toLowerCase();
  for (const key of ['toxicity', 'monitoring', 'interchangeable', 'does not establish safety']) {
    assert.ok(text.includes(key), `missing ${key}`);
  }
});

test('high-risk flag requires review without automatic reduction', () => {
  const r = C.medicationReview([med({})], {kg: 70, age: 75, priorExparel: 'no', highRisk: true});
  assert.equal(r.blocked, false);
  assert.ok(r.flags.some(f => f.includes('CAUTION') && f.includes('Patient factors')));
  assert.ok(r.flags.some(f => f.includes('does not reduce doses')));
});

test('limits compare unrounded values with at most 1e-9 tolerance', () => {
  const ap = {kg: 70, age: 40, priorExparel: 'no'};
  // lidocaine 2% = 20 mg/mL; 4.5 mg/kg x 70 kg = 315, capped at the 300 mg label ceiling.
  const at = C.medicationReview([med({concentration: 2, volume: 15, epi: false})], ap);
  close(at.rows[0].dose, 300);
  assert.equal(at.blocked, false);
  const over = C.medicationReview([med({concentration: 2, volume: 15.0000001, epi: false})], ap);
  assert.equal(over.blocked, true);
  close(over.rows[0].dose, 300.000002);
});

test('EXPAREL exact 13.3 mg/mL and infiltration/perineural limits', () => {
  const ap = {kg: 70, age: 40, priorExparel: 'no', pregnancy: 'no'};
  const r = C.medicationReview([exp({volume: 20})], ap, expOpts());
  close(r.rows[0].mgMl, 13.3);
  close(r.rows[0].dose, 266);
  close(r.rows[0].limit, 266);
  assert.equal(r.blocked, false);
  close(C.referenceLimit({drug: 'exparel', indication: 'adductor'}, ap).limit, 133);
  close(C.referenceLimit({drug: 'exparel', indication: 'infiltration'}, ap).limit, 266);
  assert.throws(() => C.referenceLimit({drug: 'exparel', indication: ''}, ap));
  assert.equal(r.exparel.route, 'infiltration');
  close(r.exparel.limit, 266);
  close(r.exparel.ratioLimit, 133);
  close(r.exparel.finalVolume, 20);
  close(r.exparel.finalConcentration, 13.3);
  assert.equal(r.exparel.compatibility, 'Within the checked limits only');
  assert.equal(r.exparel.compatibility.toLowerCase().includes('safe'), false);
  const p = C.medicationReview([exp({volume: 10, indication: 'interscalene'})], ap, expOpts());
  assert.equal(p.blocked, false);
  close(p.exparel.limit, 133);
});

test('EXPAREL infiltration 266 boundary and perineural exact-133 regimen', () => {
  const ap = {kg: 70, age: 40, priorExparel: 'no', pregnancy: 'no'};
  assert.equal(C.medicationReview([exp({volume: 20})], ap, expOpts()).blocked, false);
  assert.equal(C.medicationReview([exp({volume: 20.0000001})], ap, expOpts()).blocked, true);
  assert.equal(C.medicationReview([exp({volume: 9, indication: 'interscalene'})], ap, expOpts()).blocked, true);
  assert.equal(C.medicationReview([exp({volume: 11, indication: 'popliteal'})], ap, expOpts()).blocked, true);
  assert.equal(C.medicationReview([exp({volume: 10, indication: 'adductor'})], ap, expOpts()).blocked, true);
});

test('EXPAREL single administration, positive dose and known route', () => {
  const ap = {kg: 70, age: 40, priorExparel: 'no', pregnancy: 'no'};
  const multi = C.medicationReview([exp({volume: 10, indication: 'interscalene'}), exp({volume: 10, indication: 'interscalene'})], ap, expOpts());
  assert.equal(multi.blocked, true);
  const zero = C.medicationReview([exp({volume: 0})], ap, expOpts());
  assert.equal(zero.blocked, true);
  assert.equal(zero.exparel, null);
  const bad = C.medicationReview([exp({indication: 'unsupported'})], ap, expOpts());
  assert.equal(bad.blocked, true);
  assert.equal(bad.exparel.limit, null);
});

test('EXPAREL/bupivacaine HCl conservative ratio boundary and timing', () => {
  const ap = {kg: 70, age: 40, priorExparel: 'no', pregnancy: 'no'};
  const bupiAt = med({drug: 'bupivacaine', concentration: 0.5, route: 'peripheral', volume: 13.3, selectedLimit: 100, epi: false, status: 'planned'});
  const at = C.medicationReview([exp({volume: 10, indication: 'interscalene'}), bupiAt], ap, expOpts({bupiTiming: 'admix'}));
  close(at.exparel.bupiDose, 66.5);
  assert.equal(at.exparel.ratioLimit, 66.5);
  assert.equal(at.blocked, false);
  const overBupi = med({drug: 'bupivacaine', concentration: 0.5, route: 'peripheral', volume: 13.3001, selectedLimit: 100, epi: false, status: 'planned'});
  const over = C.medicationReview([exp({volume: 10, indication: 'interscalene'}), overBupi], ap, expOpts({bupiTiming: 'admix'}));
  assert.equal(over.blocked, true);
  assert.ok(over.stops.some(s => s.includes('÷ 2')));
  assert.throws(() => C.medicationReview([exp({volume: 10, indication: 'interscalene'}), bupiAt], ap, expOpts({bupiTiming: ''})));
  assert.equal(C.medicationReview([exp({volume: 10, indication: 'interscalene'}), bupiAt], ap, expOpts({bupiTiming: 'other'})).blocked, true);
});

test('EXPAREL blocks simultaneous non-bupivacaine agents', () => {
  const ap = {kg: 70, age: 40, priorExparel: 'no', pregnancy: 'no'};
  const r = C.medicationReview([exp({volume: 20}), med({volume: 1})], ap, expOpts());
  assert.equal(r.blocked, true);
  assert.ok(r.stops.some(s => s.includes('non-bupivacaine')));
});

test('EXPAREL prior-local rules and the lidocaine 20-minute boundary', () => {
  const ap = {kg: 70, age: 40, priorExparel: 'no', pregnancy: 'no'};
  assert.equal(C.medicationReview([exp({})], ap, expOpts({priorLocal: 'other'})).blocked, true);
  assert.equal(C.medicationReview([exp({})], ap, expOpts({priorLocal: 'unknown'})).blocked, true);
  assert.throws(() => C.medicationReview([exp({})], ap, expOpts({priorLocal: ''})));
  assert.equal(C.medicationReview([exp({})], ap, expOpts({priorLocal: 'lidocaine', lidocaineMinutes: 19.99})).blocked, true);
  assert.equal(C.medicationReview([exp({})], ap, expOpts({priorLocal: 'lidocaine', lidocaineMinutes: 20})).blocked, false);
});

test('EXPAREL pregnancy enum required; yes or unknown blocks', () => {
  const base = {kg: 70, age: 40, priorExparel: 'no'};
  assert.throws(() => C.medicationReview([exp({})], {...base}, expOpts()));
  assert.throws(() => C.medicationReview([exp({})], {...base, pregnancy: ''}, expOpts()));
  assert.equal(C.medicationReview([exp({})], {...base, pregnancy: 'yes'}, expOpts()).blocked, true);
  assert.equal(C.medicationReview([exp({})], {...base, pregnancy: 'unknown'}, expOpts()).blocked, true);
  assert.equal(C.medicationReview([exp({})], {...base, pregnancy: 'no'}, expOpts()).blocked, false);
});

test('EXPAREL diluent rules and the 0.89 mg/mL final-concentration floor', () => {
  const ap = {kg: 70, age: 40, priorExparel: 'no', pregnancy: 'no'};
  assert.equal(C.medicationReview([exp({})], ap, expOpts({diluent: 'none', diluentVolume: 5})).blocked, true);
  assert.equal(C.medicationReview([exp({})], ap, expOpts({diluent: 'saline', diluentVolume: 0})).blocked, true);
  assert.equal(C.medicationReview([exp({})], ap, expOpts({diluent: 'other', diluentVolume: 5})).blocked, true);
  assert.throws(() => C.medicationReview([exp({})], ap, expOpts({diluent: ''})));
  assert.throws(() => C.medicationReview([exp({})], ap, expOpts({diluentVolume: ''})));
  const ok = C.medicationReview([exp({})], ap, expOpts({diluent: 'lr', diluentVolume: 10}));
  assert.equal(ok.blocked, false);
  close(ok.exparel.finalVolume, 30);
  close(ok.exparel.finalConcentration, 266 / 30);
  const floor = C.medicationReview([exp({})], ap, expOpts({diluent: 'saline', diluentVolume: 290}));
  assert.equal(floor.blocked, true);
  close(floor.exparel.finalConcentration, 266 / 310);
  assert.ok(floor.exparel.finalConcentration < 0.89);
});

test('EXPAREL adductor canal accepts only the exact labeled regimen', () => {
  const ap = {kg: 70, age: 40, priorExparel: 'no', pregnancy: 'no'};
  const bupi = med({drug: 'bupivacaine', concentration: 0.5, route: 'peripheral', volume: 10, selectedLimit: 100, epi: false, status: 'planned'});
  const base = [exp({volume: 10, indication: 'adductor'}), bupi];
  const good = C.medicationReview(base, ap, expOpts({bupiTiming: 'admix'}));
  assert.equal(good.blocked, false);
  close(good.exparel.finalVolume, 20);
  close(good.exparel.finalConcentration, 6.65);
  assert.equal(C.medicationReview(base, ap, expOpts({bupiTiming: 'immediately-before'})).blocked, true);
  const bupi11 = med({drug: 'bupivacaine', concentration: 0.5, route: 'peripheral', volume: 11, selectedLimit: 100, epi: false, status: 'planned'});
  assert.equal(C.medicationReview([exp({volume: 10, indication: 'adductor'}), bupi11], ap, expOpts({bupiTiming: 'admix'})).blocked, true);
  const bupiEpi = med({drug: 'bupivacaine', concentration: 0.5, route: 'peripheral', volume: 10, selectedLimit: 100, epi: true, status: 'planned'});
  assert.equal(C.medicationReview([exp({volume: 10, indication: 'adductor'}), bupiEpi], ap, expOpts({bupiTiming: 'admix'})).blocked, true);
  assert.equal(C.medicationReview(base, ap, expOpts({bupiTiming: 'admix', diluent: 'saline', diluentVolume: 5})).blocked, true);
  const wrongConc = med({drug: 'bupivacaine', concentration: 0.25, route: 'peripheral', volume: 20, selectedLimit: 100, epi: false, status: 'planned'});
  assert.equal(C.medicationReview([exp({volume: 10, indication: 'adductor'}), wrongConc], ap, expOpts({bupiTiming: 'admix'})).blocked, true);
});

test('mepivacaine cannot be combined with another local anesthetic', () => {
  const ap = {kg: 70, age: 40, priorExparel: 'no'};
  const combo = C.medicationReview([
    med({drug: 'mepivacaine', concentration: 1, volume: 10, selectedLimit: 400, status: 'given'}),
    med({drug: 'lidocaine', concentration: 1, volume: 5, status: 'given'})
  ], ap);
  assert.equal(combo.blocked, true);
  assert.ok(combo.stops.some(s => s.includes('mix')));
  const alone = C.medicationReview([med({drug: 'mepivacaine', concentration: 1, volume: 10, selectedLimit: 400, status: 'given'})], ap);
  assert.equal(alone.blocked, false);
});
