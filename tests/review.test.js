const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const C = require('../calculations.js');

test('review branch cannot trigger Vercel Git deployment', () => {
  assert.equal(JSON.parse(read('vercel.json')).git.deploymentEnabled['feature/blockcalc-clinical-validation'], false);
});

test('offline assets include dated rules and the unmodified full ASRA checklist', () => {
  const sw = read('service-worker.js');
  assert.ok(sw.includes(C.VERSION));
  for (const file of ['references.html', 'references/asra-last-2020.pdf']) {
    assert.ok(sw.includes(file));
    assert.ok(fs.existsSync(path.join(root,file)));
  }
  assert.ok(read('references.html').includes(C.REVIEW_DATE));
  const hash=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'references/asra-last-2020.pdf'))).digest('hex');
  assert.equal(hash,'49854f19cc3b192c59ae2220036a853665642f9e57069b1287e4ec99d5644a36');
});

test('patient input has no persistence or outbound API path', () => {
  const ui=read('app.js');
  assert.doesNotMatch(ui,/localStorage|sessionStorage|indexedDB|sendBeacon|XMLHttpRequest|fetch\s*\(/);
  assert.doesNotMatch(read('index.html'),/<script[^>]+src=["']https?:/);
});

// These short, exact messages are the scan-first layer, not a grade for drug names or source documents.
const messages = [
  'Do not use this plan as entered. Check the dose and current label.',
  'These checks do not prove safety. The clinician must choose the plan.',
  'This is a historical estimate. Adult fluid needs may be different.',
  'Adult needs may differ. Fasting alone does not set a fluid deficit or a replacement plan.',
  'Enter the dose. Check the units. Review the limits.',
  'It is not plain bupivacaine. A dose or ratio check does not prove safety.'
];
function syllables(word) {
  let w=word.toLowerCase().replace(/[^a-z]/g,'');
  if(w.length<=3)return 1;
  w=w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/,'').replace(/^y/,'');
  return (w.match(/[aeiouy]{1,2}/g)||['']).length;
}
test('scan-first explanations use short sentences and retain actionable cautions', t => {
  const source=read('app.js')+read('index.html');
  let words=0,sentences=0,syllableCount=0;
  for(const message of messages){
    assert.ok(source.includes(message),message);
    for(const sentence of message.split(/[.!?]+/).filter(s=>s.trim())){
      const tokens=sentence.match(/[a-z]+/gi)||[];
      assert.ok(tokens.length<=18,`Long scan-first sentence: ${sentence}`);
      words+=tokens.length;sentences++;syllableCount+=tokens.reduce((n,w)=>n+syllables(w),0);
    }
  }
  const grade=0.39*(words/sentences)+11.8*(syllableCount/words)-15.59;
  assert.ok(grade<=7.9,`Approximate Flesch-Kincaid grade ${grade}`);
  t.diagnostic(JSON.stringify({sampleMessages:messages.length,words,sentences,approximateGrade:Number(grade.toFixed(1)),limit:'Heuristic sample only; clinical words preserved; provider testing still required.'}));
  assert.ok(source.includes('STOP — CHECK THIS DOSE OR MIXTURE'));
  assert.ok(source.includes('Within the checked limits'));
  assert.doesNotMatch(source,/This (?:dose|mixture|combination) is safe/i);
});
