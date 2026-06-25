/* Validate every drill spec against app/schema/drill.schema.json (a tiny,
   dependency-free JSON-schema-subset validator) PLUS semantic checks against the
   engine's real feature/guard/op vocabulary, so a typo'd feature name or an
   undefined accumulator reference fails CI rather than breaking at runtime.
   Run: node test/validate-specs.mjs */

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { FEATURES, GUARDS, OPS } from '../app/engine/features.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const schema = JSON.parse(readFileSync(join(root, 'app/schema/drill.schema.json'), 'utf8'));

// ---- minimal JSON-schema-subset validator (type/required/properties/items/enum) ----
function validate(value, sch, path, errs){
  if(sch.enum && !sch.enum.includes(value)) errs.push(`${path}: ${JSON.stringify(value)} not in [${sch.enum.join(', ')}]`);
  if(sch.type){
    const t = sch.type;
    const ok = t==='array' ? Array.isArray(value)
      : t==='object' ? (value && typeof value==='object' && !Array.isArray(value))
      : t==='integer' ? Number.isInteger(value)
      : t==='null' ? value===null
      : typeof value===t;
    if(!ok){ errs.push(`${path}: expected ${t}, got ${Array.isArray(value)?'array':value===null?'null':typeof value}`); return; }
  }
  if(sch.type==='object'){
    for(const r of (sch.required||[])) if(!(r in value)) errs.push(`${path}: missing required "${r}"`);
    for(const [k, sub] of Object.entries(sch.properties||{})) if(k in value) validate(value[k], sub, `${path}.${k}`, errs);
  }
  if(sch.type==='array' && sch.items) value.forEach((el,i)=>validate(el, sch.items, `${path}[${i}]`, errs));
}

// ---- semantic checks against the live engine vocabulary ----
function semantic(spec, errs){
  const has = (map,name)=>Object.prototype.hasOwnProperty.call(map,name);
  if(!has(FEATURES, spec.signal)) errs.push(`signal "${spec.signal}" is not a known feature`);
  if(!has(GUARDS, spec.guard)) errs.push(`guard "${spec.guard}" is not a known guard`);
  if(spec.gauge && !has(FEATURES, spec.gauge.signal)) errs.push(`gauge.signal "${spec.gauge.signal}" is not a known feature`);
  const trackNames = new Set();
  for(const t of spec.detect.track){
    trackNames.add(t.name);
    if(!has(FEATURES, t.feature)) errs.push(`track "${t.name}" uses unknown feature "${t.feature}"`);
  }
  for(const r of spec.rubric){
    if(r.acc && !trackNames.has(r.acc)) errs.push(`rubric "${r.key}" references unknown accumulator "${r.acc}"`);
    if(r.acc2 && !trackNames.has(r.acc2)) errs.push(`rubric "${r.key}" references unknown accumulator "${r.acc2}"`);
    if(r.op && !has(OPS, r.op)) errs.push(`rubric "${r.key}" uses unknown op "${r.op}"`);
  }
  const checkCond = (c, where)=>{
    if(!c) return;
    if(c.all) for(const cc of c.all){
      if(cc.v!=='signal' && !has(FEATURES, cc.v)) errs.push(`${where}: unknown feature "${cc.v}"`);
      if(!has(OPS, cc.op)) errs.push(`${where}: unknown op "${cc.op}"`);
    }
    if(c.is && !has(FEATURES, c.is)) errs.push(`${where}: unknown feature "${c.is}"`);
    if(c.not && !has(FEATURES, c.not)) errs.push(`${where}: unknown feature "${c.not}"`);
  };
  spec.cues.down.conds.forEach((z,i)=>checkCond(z.when, `cues.down.conds[${i}]`));
  if(spec.cues.down.override) checkCond(spec.cues.down.override.when, 'cues.down.override');
}

const dir = join(root, 'app/drills/specs');
const files = readdirSync(dir).filter(f=>f.endsWith('.js'));
let fails=0;
for(const f of files){
  const spec = (await import(join(dir, f))).default;
  const plain = JSON.parse(JSON.stringify(spec)); // strip any non-JSON, prove serialisable
  const errs=[];
  validate(plain, schema, spec.meta?.id || f, errs);
  if(errs.length===0) semantic(plain, errs); // only run semantic checks once the shape is valid
  if(errs.length){ fails++; console.log(`FAIL ${f}:\n  - ${errs.join('\n  - ')}`); }
  else console.log(`PASS ${f} (${spec.meta.id}) — schema + semantics OK`);
}
console.log(`\n${fails===0?'ALL SPECS VALID':'SPEC VALIDATION FAILED'} — ${files.length} spec(s), ${fails} invalid`);
process.exit(fails===0?0:1);
