/* Parity test: the archetype-built squat/lunge/netlunge must produce byte-for-byte
   identical output to the frozen legacy drills — every frame's {status,cue,phase,
   repDelta}, the gauge reading, and the final summarise() — across scripted reps
   and a large deterministic random sweep. Run: node test/parity.mjs */

import { repByAngleHysteresis } from '../app/engine/archetypes.js';
import squatSpec from '../app/drills/specs/squat.js';
import lungeSpec from '../app/drills/specs/lunge.js';
import netlungeSpec from '../app/drills/specs/netlunge.js';
import * as legacy from './fixtures/legacy-rep-drills.mjs';

// deterministic PRNG so the sweep is reproducible
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
const rnd = mulberry32(20260625);
const pick=(lo,hi)=>lo+(hi-lo)*rnd();

function randomFrame(){
  const bodyVisible = rnd() > 0.10;
  const kneeAvgNull = rnd() < 0.05;
  const kneeLNull   = rnd() < 0.05;
  const kneeRNull   = rnd() < 0.05;
  return {
    bodyVisible,
    kneeAvg: kneeAvgNull ? null : pick(40,185),
    kneeL:   kneeLNull   ? null : pick(40,185),
    kneeR:   kneeRNull   ? null : pick(40,185),
    torsoLean: pick(0,70),
    elbowL: rnd()<0.05 ? null : pick(40,180),
    elbowR: rnd()<0.05 ? null : pick(40,180),
    nWrL: { y: pick(0.2,0.7) },
    nWrR: { y: pick(0.2,0.7) },
    shoulderMidY: 0.4,
  };
}

// a few clean reps (so summarise() runs with records of varied quality)
function scriptedReps(){
  const frames=[];
  const F=(kneeAvg,kneeL,kneeR,torsoLean,reach)=>({
    bodyVisible:true, kneeAvg, kneeL, kneeR, torsoLean,
    elbowL: reach?160:90, elbowR: reach?160:90,
    nWrL:{y: reach?0.6:0.3}, nWrR:{y: reach?0.6:0.3}, shoulderMidY:0.4,
  });
  // good deep rep
  frames.push(F(178,178,178,8,false));
  for(let i=0;i<4;i++) frames.push(F(92,92,92,10,true));
  frames.push(F(170,170,170,8,false));
  // shallow + leaning + uneven + no-reach rep
  frames.push(F(176,176,176,6,false));
  for(let i=0;i<4;i++) frames.push(F(128,150,118,60,false));
  frames.push(F(171,171,171,6,false));
  return frames;
}

const DRILLS=[
  {name:'squat',    built:repByAngleHysteresis(squatSpec),    leg:legacy.SQUAT},
  {name:'lunge',    built:repByAngleHysteresis(lungeSpec),    leg:legacy.LUNGE},
  {name:'netlunge', built:repByAngleHysteresis(netlungeSpec), leg:legacy.NETLUNGE},
];

let fails=0, frameCount=0;
const frames = [...scriptedReps()];
for(let i=0;i<2000;i++) frames.push(randomFrame());

for(const d of DRILLS){
  const sB=d.built.init(), sL=d.leg.init();
  for(let i=0;i<frames.length;i++){
    const m=frames[i];
    const oB=d.built.update(m,sB), oL=d.leg.update(m,sL);
    frameCount++;
    if(JSON.stringify(oB)!==JSON.stringify(oL)){
      fails++; if(fails<=5) console.log(`FAIL ${d.name} frame ${i}\n  built ${JSON.stringify(oB)}\n  legacy ${JSON.stringify(oL)}\n  m ${JSON.stringify(m)}`);
    }
    // gauge reading must match too (used by the live gauge)
    const gB=d.built.gauge.read(m), gL=d.leg.gauge.read(m);
    if(JSON.stringify(gB)!==JSON.stringify(gL)){
      fails++; if(fails<=5) console.log(`FAIL ${d.name} gauge frame ${i}: built=${gB} legacy=${gL}`);
    }
  }
  const rB=JSON.stringify(d.built.summarise(sB)), rL=JSON.stringify(d.leg.summarise(sL));
  if(rB!==rL){ fails++; console.log(`FAIL ${d.name} summarise\n  built ${rB}\n  legacy ${rL}`); }
  else console.log(`PASS ${d.name}: ${frames.length} frames identical, counts B=${sB.count} L=${sL.count}, summarise identical`);
}

console.log(`\n${fails===0?'PARITY OK':'PARITY FAILED'} — ${frameCount} frame-comparisons, ${fails} mismatch(es)`);
process.exit(fails===0?0:1);
