/* Archetype engines: generic drill mechanics driven entirely by a declarative
   spec. A spec picks an archetype, names the signals/features it uses, and
   supplies thresholds + copy as data. The engine here is the only place
   behaviour lives, so thresholds can be tuned (and sourced) without touching it.

   Each factory returns a drill object matching the runtime contract:
     { ...meta, gauge, init(), update(m,s)->{status,cue,phase,repDelta}, summarise(s) } */

import { GUARDS, OPS, feat } from './features.js';

// ---- structured condition over a context {signal, m} ----
// forms: {all:[{v,op,k}...]}  |  {is:featureName}  |  {not:featureName}
function evalCond(cond, vctx){
  if(cond.all) return cond.all.every(c=>{
    const left = c.v==='signal' ? vctx.signal : feat(c.v, vctx.m);
    return OPS[c.op](left, c.k);
  });
  if(cond.is)  return !!feat(cond.is, vctx.m);
  if(cond.not) return !feat(cond.not, vctx.m);
  return false;
}

// ---- descent accumulators ----
const initAcc  = agg => agg==='min' ? Infinity : agg==='max' ? -Infinity : false;
const applyAcc = (agg, prev, val) => agg==='min' ? Math.min(prev,val)
                                   : agg==='max' ? Math.max(prev,val)
                                   : (prev || !!val);

// ---- per-rep rubric over the accumulators ----
function evalRubric(item, acc){
  if(item.type==='cmp')     return OPS[item.op](acc[item.acc], item.value);
  if(item.type==='range')   return acc[item.acc]>=item.min && acc[item.acc]<=item.max;
  if(item.type==='absDiff') return OPS[item.op](Math.abs(acc[item.acc]-acc[item.acc2]), item.value);
  if(item.type==='bool')    return !!acc[item.acc];
  throw new Error('unknown rubric type: '+item.type);
}

// ---- end-of-set report, driven by the spec's summary block ----
function buildSummarise(spec){
  const S = spec.summary;
  return (s)=>{
    const N=s.count, R=s.records;
    if(!N) return {head:S.blankHead, sub:'Nothing was counted this time.', stats:[], focus:'Try again.', next:S.blankNext};
    const cnt=(field,match)=>R.filter(r=>r[field]===match).length;
    const stats=S.stats.map(st=>{
      if(st.kind==='N')     return [st.label, N];
      if(st.kind==='ratio') return [st.label, `${cnt(st.field,true)} of ${N}`];
      if(st.kind==='count') return [st.label, `${cnt(st.field,true)}`];
      return [st.label, ''];
    });
    let focus=null;
    for(const fc of S.focus){ if(cnt(fc.field, fc.match)>0){ focus={text:fc.text, next:fc.next}; break; } }
    const head=`${N} ${S.word}${N>1?'s':''}${S.headSuffix}`;
    return { head, sub:S.sub, stats, focus:focus?focus.text:S.fallbackFocus, next:focus?focus.next:S.fallbackNext };
  };
}

/* repByAngleHysteresis — descend below `enter`, count on rising back above
   `exit`, tracking extremes through the descent and grading them on the way up.
   Reproduces squat / lunge / net-lunge style rep drills. */
export function repByAngleHysteresis(spec){
  const D=spec.detect, guard=GUARDS[spec.guard];
  return {
    ...spec.meta,
    gauge: spec.gauge ? { ...spec.gauge, read:(m)=>feat(spec.gauge.signal, m) } : null,
    init(){
      const s={count:0, phase:'up', records:[], acc:{}};
      for(const t of D.track) s.acc[t.name]=initAcc(t.agg);
      return s;
    },
    update(m,s){
      if(!guard(m)) return {status:'waiting', cue:spec.waitCue, phase:'—', repDelta:0};
      const signal=feat(spec.signal, m);
      if(s.phase==='down') for(const t of D.track) s.acc[t.name]=applyAcc(t.agg, s.acc[t.name], feat(t.feature, m));
      let repDelta=0;
      if(s.phase==='up' && OPS[D.enter.op](signal, D.enter.k)){
        s.phase='down';
        for(const t of D.track) s.acc[t.name]=feat(t.feature, m);
      } else if(s.phase==='down' && OPS[D.exit.op](signal, D.exit.k)){
        const rec={}; for(const r of spec.rubric) rec[r.key]=evalRubric(r, s.acc);
        s.records.push(rec); s.count++; repDelta=1; s.phase='up';
        for(const t of D.track) s.acc[t.name]=initAcc(t.agg);
      }
      let status, cue, phase;
      if(s.phase==='up'){ status='waiting'; cue=spec.cues.up.cue; phase=spec.cues.up.phase; }
      else{
        phase=spec.cues.down.phase;
        const vctx={signal, m};
        let matched=false;
        for(const z of spec.cues.down.conds){ if(evalCond(z.when, vctx)){ status=z.status; cue=z.cue; matched=true; break; } }
        if(!matched){ status=spec.cues.down.default.status; cue=spec.cues.down.default.cue; }
        const ov=spec.cues.down.override;
        if(ov && evalCond(ov.when, vctx)){ status=ov.status; cue=ov.cue; }
      }
      return {status, cue, phase, repDelta};
    },
    summarise: buildSummarise(spec),
  };
}
