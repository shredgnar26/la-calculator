const {test}=require('node:test');
const assert=require('node:assert/strict');
const C=require('../calculations.js');
const patient={kg:70,age:40,priorExparel:'no',pregnancy:'no'};
const ex={drug:'exparel',volume:10,status:'planned',indication:'interscalene'};
const hcl={drug:'bupivacaine',volume:10,concentration:0.5,route:'peripheral',selectedLimit:100,status:'planned',epi:false};
const opts={priorLocal:'none',bupiTiming:'none',diluent:'none',diluentVolume:0};
const review=(rows,options={})=>C.medicationReview(rows,patient,{...opts,...options});

test('EXPAREL route limits propagate to displayed row and per-drug total',()=>{
  for(const [indication,volume,limit] of [['infiltration',20,266],['interscalene',10,133],['popliteal',10,133]]){
    const r=review([{...ex,indication,volume}]);
    assert.equal(r.rows[0].limit,limit);assert.equal(r.totals[0].limit,limit);assert.equal(r.exparel.limit,limit);
  }
  assert.equal(review([{...ex,indication:'unsupported'}]).rows[0].limit,null);
});
test('every EXPAREL timing choice is explicit and matches presence of HCl',()=>{
  for(const bupiTiming of ['',undefined,null,'bogus'])assert.throws(()=>review([ex],{bupiTiming}));
  for(const bupiTiming of ['admix','immediately-before','other'])assert.equal(review([ex],{bupiTiming}).blocked,true);
  assert.equal(review([ex]).blocked,false);
  assert.equal(review([ex,hcl]).blocked,true);
  assert.equal(review([ex,hcl],{bupiTiming:'admix'}).blocked,false);
});
test('given and planned statuses cannot imply impossible mixing or later anesthetic',()=>{
  for(const bupiTiming of ['admix','immediately-before'])assert.equal(review([{...ex,status:'given'},hcl],{bupiTiming}).blocked,true);
  assert.equal(review([ex,{...hcl,status:'given'}],{bupiTiming:'admix'}).blocked,true);
  assert.equal(review([ex,{...hcl,status:'given'}],{bupiTiming:'immediately-before'}).blocked,false);
  assert.equal(review([{...ex,status:'given'},{...hcl,status:'given'}],{bupiTiming:'admix'}).blocked,false);
});
test('HCl route must agree with EXPAREL context',()=>{
  assert.equal(review([ex,{...hcl,concentration:0.25,route:'infiltration'}],{bupiTiming:'admix'}).blocked,true);
  assert.equal(review([{...ex,indication:'infiltration'},hcl],{bupiTiming:'admix'}).blocked,true);
});
test('unsupported conventional pairs keep math but never pass',()=>{
  const drugs=[
    {drug:'lidocaine',concentration:1,volume:1,route:'infiltration',epi:false,status:'planned'},
    {...hcl,volume:1},
    {drug:'mepivacaine',concentration:1,volume:1,route:'infiltration',selectedLimit:100,epi:false,status:'planned'},
    {drug:'ropivacaine',concentration:0.5,volume:1,route:'infiltration',selectedLimit:100,epi:false,status:'planned'},
    {drug:'chloroprocaine',concentration:2,volume:1,route:'infiltration',epi:false,status:'planned'}
  ];
  for(let i=0;i<drugs.length;i++)for(let j=i+1;j<drugs.length;j++){
    const r=review([drugs[i],drugs[j]]);assert.equal(r.blocked,true);assert.equal(r.totals.length,2);
  }
  for(const drug of drugs.filter(d=>['mepivacaine','ropivacaine'].includes(d.drug)))assert.throws(()=>review([{...drug,epi:true}]));
});
test('unrounded dilution floor, separate HCl volume and prior-lidocaine caveat',()=>{
  const inf={...ex,volume:20,indication:'infiltration'};
  const boundary=266/0.89-20;
  assert.equal(review([inf],{diluent:'saline',diluentVolume:boundary}).blocked,false);
  assert.equal(review([inf],{diluent:'saline',diluentVolume:boundary+0.001}).blocked,true);
  assert.equal(review([inf],{diluent:'saline',diluentVolume:280}).blocked,true);
  const r=review([ex,hcl],{bupiTiming:'immediately-before'});assert.equal(r.exparel.finalVolume,10);
  assert.ok(review([ex],{priorLocal:'lidocaine',lidocaineMinutes:20}).flags.some(f=>f.includes('earlier lidocaine dose')&&f.includes('not checked')));
});
test('conversion rejects impossible weights and tier precision stays continuous',()=>{
  for(const w of [-1,0,351,'1e2'])assert.throws(()=>C.toKg(w,'kg'));
  for(const [w,expected] of [[9.999,39.996],[10.001,40.002],[19.999,59.998],[20.001,60.001]])assert.ok(Math.abs(C.maintenance(w,18).rate-expected)<1e-10);
});
