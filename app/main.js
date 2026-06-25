/* Motion Coach — application entry.
   Extracted from index.html (behavior-preserving). Loaded as <script type="module" src="./app/main.js">.
   NOTE: served from the repo root, so on GitHub Pages this resolves under /<repo>/app/main.js. */

import {
  FilesetResolver,
  PoseLandmarker,
  DrawingUtils
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10/vision_bundle.mjs";

/* ===== SEGMENT: Spec-driven drills (content-pack architecture) ===== */
import { repByAngleHysteresis } from "./engine/archetypes.js";
import squatSpec from "./drills/specs/squat.js";
import lungeSpec from "./drills/specs/lunge.js";
import netlungeSpec from "./drills/specs/netlunge.js";

/* ===== SEGMENT: Landmark indices (MediaPipe Pose, 33 points) ===== */
const LM = {
  NOSE:0, L_SH:11, R_SH:12, L_EL:13, R_EL:14, L_WR:15, R_WR:16,
  L_HIP:23, R_HIP:24, L_KN:25, R_KN:26, L_AN:27, R_AN:28
};

/* ===== SEGMENT: Maths helpers ===== */
function angle3(a,b,c){
  // angle at vertex b, in degrees, using 3D world coordinates
  const v1=[a.x-b.x, a.y-b.y, a.z-b.z];
  const v2=[c.x-b.x, c.y-b.y, c.z-b.z];
  const dot=v1[0]*v2[0]+v1[1]*v2[1]+v1[2]*v2[2];
  const m1=Math.hypot(v1[0],v1[1],v1[2]);
  const m2=Math.hypot(v2[0],v2[1],v2[2]);
  if(m1===0||m2===0) return null;
  let c0=dot/(m1*m2); c0=Math.max(-1,Math.min(1,c0));
  return Math.acos(c0)*180/Math.PI;
}
const avg=(a,b)=> (a==null?b:(b==null?a:(a+b)/2));
const clamp01=x=> Math.max(0,Math.min(1,x));
const pct=(part,whole)=> whole? Math.round(100*part/whole):0;

/* ===== SEGMENT: Smoothing (exponential moving average) ===== */
const smoothStore={};
function ema(key,val,alpha=0.5){
  if(val==null) return smoothStore[key] ?? null;
  const prev=smoothStore[key];
  const next = prev==null ? val : prev*(1-alpha)+val*alpha;
  smoothStore[key]=next; return next;
}
function resetSmoothing(){ for(const k in smoothStore) delete smoothStore[k]; }

/* ===== SEGMENT: Per-frame metrics ===== */
function computeMetrics(n, w){
  const vis = i => (n[i].visibility ?? 1);
  const m = {};
  // joint angles from world coordinates (robust to camera framing)
  m.kneeL = angle3(w[LM.L_HIP], w[LM.L_KN], w[LM.L_AN]);
  m.kneeR = angle3(w[LM.R_HIP], w[LM.R_KN], w[LM.R_AN]);
  m.elbowL = angle3(w[LM.L_SH], w[LM.L_EL], w[LM.L_WR]);
  m.elbowR = angle3(w[LM.R_SH], w[LM.R_EL], w[LM.R_WR]);
  m.kneeAvg = avg(m.kneeL, m.kneeR);
  // positions from normalised image coordinates (camera relative; y grows downward)
  m.nNose=n[LM.NOSE];
  m.nWrL=n[LM.L_WR]; m.nWrR=n[LM.R_WR];
  m.nElL=n[LM.L_EL]; m.nElR=n[LM.R_EL];
  m.nAnL=n[LM.L_AN]; m.nAnR=n[LM.R_AN];
  m.shoulderMidY=(n[LM.L_SH].y+n[LM.R_SH].y)/2;
  m.hipMidY=(n[LM.L_HIP].y+n[LM.R_HIP].y)/2;
  m.shoulderWidth=Math.max(Math.abs(n[LM.L_SH].x-n[LM.R_SH].x), 0.04);
  // torso lean from vertical, degrees (0 = upright)
  const sx=(n[LM.L_SH].x+n[LM.R_SH].x)/2, sy=m.shoulderMidY;
  const hx=(n[LM.L_HIP].x+n[LM.R_HIP].x)/2, hy=m.hipMidY;
  m.torsoLean=Math.abs(Math.atan2(sx-hx, hy-sy))*180/Math.PI;
  // whole-body visible enough to coach on
  m.bodyVisible=[LM.L_SH,LM.R_SH,LM.L_HIP,LM.R_HIP,LM.L_KN,LM.R_KN].every(i=>vis(i)>0.4);
  return m;
}
function smoothMetrics(m){
  m.kneeAvg=ema('kneeAvg',m.kneeAvg);
  m.kneeL=ema('kneeL',m.kneeL); m.kneeR=ema('kneeR',m.kneeR);
  m.elbowL=ema('elbowL',m.elbowL); m.elbowR=ema('elbowR',m.elbowR);
  return m;
}

/* ============================================================= */
/* SEGMENT: Movement modules                                     */
/* Each module owns its rep/attempt logic and its end report.    */
/* update(m, s) -> {status, cue, phase, repDelta}                */
/* ============================================================= */

const WAIT=(cue)=>({status:'waiting',cue,phase:'—',repDelta:0});

/* ----- Grading helpers ----- */
function focusFrom(pairs){
  // pairs: [{bad:count, text, next}] in priority order; pick first with bad>0
  for(const p of pairs){ if(p.bad>0) return {text:p.text, next:p.next}; }
  return null;
}

/* ---------- SQUAT (spec-driven) ---------- */
const SQUAT=repByAngleHysteresis(squatSpec);

/* ---------- LUNGE (spec-driven) ---------- */
const LUNGE=repByAngleHysteresis(lungeSpec);

/* ---------- JUMPING JACKS ---------- */
const JACKS={
  id:'jacks', sport:'Fitness', label:'Jumping jacks', type:'rep', facing:'Face on',
  blurb:'Full reach: arms overhead, feet wide.',
  setup:'Face the camera, whole body in frame. Leave space above your head and to the sides.',
  unit:'reps',
  gauge:null,
  init:()=>({count:0, phase:'closed', armsUp:false, wide:false, records:[]}),
  update(m,s){
    if(!m.bodyVisible) return WAIT('Step into frame');
    const armsUp=(m.nWrL.y < m.nNose.y) && (m.nWrR.y < m.nNose.y);
    const sep=Math.abs(m.nAnL.x - m.nAnR.x);
    const wide=sep > 1.5*m.shoulderWidth;
    const open=armsUp && wide;
    const closed=(m.nWrL.y > m.shoulderMidY) && (m.nWrR.y > m.shoulderMidY);
    let repDelta=0;
    if(s.phase==='closed' && open){ s.phase='open'; s.armsUp=armsUp; s.wide=wide; }
    else if(s.phase==='open'){
      s.armsUp=s.armsUp||armsUp; s.wide=s.wide||wide;
      if(closed){ s.records.push({armsUp:s.armsUp, wide:s.wide}); s.count++; repDelta=1; s.phase='closed'; s.armsUp=false; s.wide=false; }
    }
    let status,cue,phase;
    if(s.phase==='closed'){ status='waiting'; cue='Jump — arms up, feet wide'; phase='Closed'; }
    else{
      phase='Open';
      if(armsUp && wide){ status='good'; cue='Full reach'; }
      else if(!armsUp && wide){ status='adjust'; cue='Arms higher'; }
      else if(armsUp && !wide){ status='adjust'; cue='Feet wider'; }
      else{ status='adjust'; cue='Reach up and out'; }
    }
    return {status,cue,phase,repDelta};
  },
  summarise(s){
    const N=s.count, R=s.records;
    if(!N) return blankReport('No full jumping jacks counted yet.','Face the camera, reach both arms above your head, jump your feet wide.');
    const full=R.filter(r=>r.armsUp && r.wide).length;
    const f=focusFrom([
      {bad:R.filter(r=>!r.armsUp).length, text:'Reach higher.', next:'Bring both hands fully above your head each rep.'},
      {bad:R.filter(r=>!r.wide).length, text:'Jump wider.', next:'Take your feet clearly past shoulder width.'}
    ]);
    return {
      head:`${N} jumping jack${N>1?'s':''} logged`,
      sub:'Each rep checked for full arm reach and wide feet.',
      stats:[['Reps counted',N],['Full reach',`${full} of ${N}`],['Wide enough',`${R.filter(r=>r.wide).length} of ${N}`]],
      focus: f?f.text:'Crisp, full-range reps.',
      next: f?f.next:'Pick up the pace while keeping the full reach.'
    };
  }
};

/* ---------- BASKETBALL: FREE THROW / SET SHOT ---------- */
const SHOT={
  id:'shot', sport:'Basketball', label:'Free throw / set shot', type:'attempt', facing:'Side on',
  blurb:'Loaded set, legs in, full release.',
  setup:'Stand side on to your shooting arm, whole body in frame. Mime the shot, slow and clear.',
  unit:'shots',
  gauge:null,
  init:()=>({count:0, phase:'rest', setElbow:180, peakElbow:0, loadedKnee:180, align:1, records:[]}),
  update(m,s){
    if(!m.bodyVisible) return WAIT('Step into frame');
    const useR=m.nWrR.y <= m.nWrL.y;            // shooting arm = higher hand
    const elbow=useR ? m.elbowR : m.elbowL;
    const wrist=useR ? m.nWrR : m.nWrL;
    const elb=useR ? m.nElR : m.nElL;
    if(elbow==null) return WAIT('Show your shooting arm');
    const aboveHead=wrist.y < m.nNose.y;
    const belowShoulder=wrist.y > m.shoulderMidY;
    const align=Math.abs(elb.x - wrist.x);      // small = elbow under the wrist
    let repDelta=0, status, cue, phase;

    if(s.phase==='rest'){
      status='waiting'; cue='Load into your set'; phase='Set up';
      // cocked: elbow bent, hand between hips and head
      if(elbow>=60 && elbow<=115 && wrist.y > m.nNose.y && wrist.y < m.hipMidY){
        s.phase='set'; s.setElbow=elbow; s.loadedKnee=m.kneeAvg ?? 180; s.align=align; s.peakElbow=elbow;
      }
    } else if(s.phase==='set'){
      phase='Set'; status='good'; cue='Now drive up';
      s.setElbow=Math.min(s.setElbow,elbow);
      s.loadedKnee=Math.min(s.loadedKnee, m.kneeAvg ?? 180);
      s.align=Math.min(s.align, align);
      s.peakElbow=Math.max(s.peakElbow,elbow);
      if(elbow>150 && aboveHead){
        const rec={
          elbowLoaded:s.setElbow<=110,
          legsUsed:s.loadedKnee<=160,
          fullExtension:s.peakElbow>=160,
          releaseHigh:true,
          aligned:s.align<0.07
        };
        s.records.push(rec); s.count++; repDelta=1; s.phase='follow'; s._last=rec;
      }
    } else if(s.phase==='follow'){
      phase='Follow through'; status='good'; cue='Hold the finish';
      if(belowShoulder) s.phase='rest';         // reset for next shot
    }
    return {status:status||'waiting', cue:cue||'', phase:phase||'Set up', repDelta};
  },
  flash(rec){
    const ok=[]; const fix=[];
    (rec.elbowLoaded?ok:fix).push('elbow loaded');
    (rec.legsUsed?ok:fix).push('legs in');
    (rec.fullExtension?ok:fix).push('full release');
    (rec.aligned?ok:fix).push('elbow lined up');
    let s=`<b>Shot logged.</b> Strong: ${ok.join(', ')||'keep working'}.`;
    if(fix.length) s+=` Watch: ${fix.join(', ')}.`;
    return s;
  },
  summarise(s){
    const N=s.count, R=s.records;
    if(!N) return blankReport('No shots logged yet.','Stand side on, load your set with the elbow bent, then extend fully overhead.');
    const cnt=k=>R.filter(r=>r[k]).length;
    const f=focusFrom([
      {bad:N-cnt('aligned'), text:'Line up your elbow.', next:'At the set, keep the shooting elbow under your wrist, not flared out.'},
      {bad:N-cnt('fullExtension'), text:'Finish high.', next:'Extend the arm fully on release, reach up and through.'},
      {bad:N-cnt('legsUsed'), text:'Use your legs.', next:'Dip the knees and push up, do not shoot with the arm alone.'},
      {bad:N-cnt('elbowLoaded'), text:'Load the set.', next:'Start with the elbow bent around a right angle before you rise.'}
    ]);
    return {
      head:`${N} shot${N>1?'s':''} logged`,
      sub:'Each shot checked at the set and at release.',
      stats:[['Shots',N],['Elbow lined up',`${cnt('aligned')} of ${N}`],['Full release',`${cnt('fullExtension')} of ${N}`],['Legs used',`${cnt('legsUsed')} of ${N}`]],
      focus: f?f.text:'Repeatable, balanced shot.',
      next: f?f.next:'Groove it. Same set, same finish, every time.'
    };
  }
};

/* ---------- BADMINTON: OVERHEAD CLEAR / SMASH ---------- */
const CLEAR={
  id:'clear', sport:'Badminton', label:'Overhead clear / smash', type:'attempt', facing:'Face on',
  blurb:'Cock, reach high, full arm at contact.',
  setup:'Face the camera, slightly side on, whole body in frame. Mime the overhead hit.',
  unit:'hits',
  gauge:null,
  init:()=>({count:0, phase:'rest', minPrepElbow:180, peakElbow:0, nonRacketUp:false, records:[]}),
  update(m,s){
    if(!m.bodyVisible) return WAIT('Step into frame');
    const useR=m.nWrR.y <= m.nWrL.y;            // racket arm = higher hand
    const elbow=useR ? m.elbowR : m.elbowL;
    const wrist=useR ? m.nWrR : m.nWrL;
    const other=useR ? m.nWrL : m.nWrR;
    if(elbow==null) return WAIT('Raise your racket arm');
    const aboveHead=wrist.y < m.nNose.y;
    const nonRacketRaised=other.y < m.shoulderMidY;
    let repDelta=0, status, cue, phase;

    if(s.phase==='rest'){
      status='waiting'; cue='Raise and cock your arm'; phase='Prep';
      if(wrist.y < m.shoulderMidY && elbow < 130){
        s.phase='prep'; s.minPrepElbow=elbow; s.peakElbow=elbow; s.nonRacketUp=nonRacketRaised;
      }
    } else if(s.phase==='prep'){
      phase='Prep'; status='good'; cue='Reach up and hit';
      s.minPrepElbow=Math.min(s.minPrepElbow,elbow);
      s.peakElbow=Math.max(s.peakElbow,elbow);
      s.nonRacketUp=s.nonRacketUp||nonRacketRaised;
      if(elbow>150 && aboveHead){
        const rec={
          contactHigh:true,
          fullExtension:s.peakElbow>=160,
          cocked:s.minPrepElbow<=120,
          nonRacketUp:s.nonRacketUp
        };
        s.records.push(rec); s.count++; repDelta=1; s.phase='follow'; s._last=rec;
      }
    } else if(s.phase==='follow'){
      phase='Follow through'; status='good'; cue='Good — recover';
      if(wrist.y > m.shoulderMidY) s.phase='rest';
    }
    return {status:status||'waiting', cue:cue||'', phase:phase||'Prep', repDelta};
  },
  flash(rec){
    const ok=[]; const fix=[];
    (rec.contactHigh?ok:fix).push('high contact');
    (rec.fullExtension?ok:fix).push('full arm');
    (rec.cocked?ok:fix).push('good cock');
    (rec.nonRacketUp?ok:fix).push('non-racket arm up');
    let s=`<b>Hit logged.</b> Strong: ${ok.join(', ')||'keep working'}.`;
    if(fix.length) s+=` Watch: ${fix.join(', ')}.`;
    return s;
  },
  summarise(s){
    const N=s.count, R=s.records;
    if(!N) return blankReport('No overhead hits logged yet.','Cock the racket arm behind your head, then reach up and hit at full stretch.');
    const cnt=k=>R.filter(r=>r[k]).length;
    const f=focusFrom([
      {bad:N-cnt('fullExtension'), text:'Hit at full stretch.', next:'Straighten the arm fully at contact, reach to your highest point.'},
      {bad:N-cnt('nonRacketUp'), text:'Lead with the other arm.', next:'Point your non-racket hand up at the shuttle for balance and aim.'},
      {bad:N-cnt('cocked'), text:'Load the swing.', next:'Bend the elbow behind your head before you reach up to hit.'}
    ]);
    return {
      head:`${N} overhead hit${N>1?'s':''} logged`,
      sub:'Each hit checked at the cock and at contact.',
      stats:[['Hits',N],['Full arm at contact',`${cnt('fullExtension')} of ${N}`],['Non-racket arm up',`${cnt('nonRacketUp')} of ${N}`],['Loaded swing',`${cnt('cocked')} of ${N}`]],
      focus: f?f.text:'High, clean contact.',
      next: f?f.next:'Keep the contact point high and add some pace.'
    };
  }
};

/* ---------- BADMINTON: NET LUNGE (spec-driven) ---------- */
const NETLUNGE=repByAngleHysteresis(netlungeSpec);

/* ---------- BADMINTON: SPLIT STEP ---------- */
const SPLITSTEP={
  id:'split', sport:'Badminton', label:'Split step', type:'rep', facing:'Face on',
  blurb:'Land wide and low on both feet, ready to push off.',
  setup:'Face the camera, whole body in frame, with a little space to each side. From your toes, split into a wide, low ready base — then stand tall and repeat.',
  unit:'splits',
  gauge:{leftLabel:'Narrow', rightLabel:'Wide', min:0.8, max:2.2, bandLow:1.5, bandHigh:2.2, read:m=>Math.abs(m.nAnL.x-m.nAnR.x)/m.shoulderWidth},
  init:()=>({count:0, phase:'tall', records:[]}),
  update(m,s){
    if(!m.bodyVisible || m.kneeAvg==null) return WAIT('Step into frame');
    const sep=Math.abs(m.nAnL.x-m.nAnR.x)/m.shoulderWidth;   // stance width, in shoulder widths
    const level=Math.abs(m.nAnL.y-m.nAnR.y)/m.shoulderWidth; // small = both feet land together
    const bent=m.kneeAvg<=165, wide=sep>=1.4;
    let repDelta=0, status, cue, phase;
    if(s.phase==='tall'){
      phase='Ready';
      if(wide && bent){
        s.records.push({wideEnough:sep>=1.5, lowEnough:m.kneeAvg<=158, even:level<=0.5});
        s.count++; repDelta=1; s.phase='down';
        status='good'; cue='Balanced base — now reset';
      } else if(wide){ status='adjust'; cue='Sink lower'; }
      else{ status='waiting'; cue='Split — wide and low'; }
    } else {
      phase='Landed';
      if(sep<1.4){ status='adjust'; cue='Land wider'; }
      else if(m.kneeAvg>165){ status='adjust'; cue='Sink lower'; }
      else{ status='good'; cue='Balanced base — stand and reset'; }
      if(m.kneeAvg>170 || sep<1.2) s.phase='tall';   // back to ready, arm for the next split
    }
    return {status:status||'waiting', cue:cue||'', phase:phase||'Ready', repDelta};
  },
  summarise(s){
    const N=s.count, R=s.records;
    if(!N) return blankReport('No split steps counted yet.','Bounce into a wide, low stance landing on both feet, then stand tall and repeat.');
    const f=focusFrom([
      {bad:R.filter(r=>!r.wideEnough).length, text:'Land wider.', next:'Take your feet clearly past shoulder width so you can push off in any direction.'},
      {bad:R.filter(r=>!r.lowEnough).length, text:'Stay lower.', next:'Bend the knees more on landing to load your legs, ready to spring.'},
      {bad:R.filter(r=>!r.even).length, text:'Land on both feet.', next:'Land both feet together and level, weight balanced, not on one side.'}
    ]);
    return {
      head:`${N} split step${N>1?'s':''} logged`,
      sub:'Stance width and knee bend checked at each landing.',
      stats:[['Splits counted',N],['Wide enough',`${R.filter(r=>r.wideEnough).length} of ${N}`],['Low enough',`${R.filter(r=>r.lowEnough).length} of ${N}`]],
      focus: f?f.text:'Balanced, athletic split steps.',
      next: f?f.next:'Time it to land just as your opponent hits.'
    };
  }
};

function blankReport(head,next){
  return {head, sub:'Nothing was counted this time.', stats:[], focus:'Try again.', next};
}

/* ===== SEGMENT: Registry, grouped by sport ===== */
const MOVES={squat:SQUAT, lunge:LUNGE, jacks:JACKS, shot:SHOT, clear:CLEAR, netlunge:NETLUNGE, split:SPLITSTEP};
const SPORTS=[
  {name:'Fitness', moves:['squat','lunge','jacks']},
  {name:'Basketball', moves:['shot']},
  {name:'Badminton', moves:['clear','netlunge','split']}
];

/* ============================================================= */
/* SEGMENT: Application state + DOM                              */
/* ============================================================= */
let active=null, state=null;
let landmarker=null, drawer=null, stream=null;
let running=false, rafId=0, lastVideoTime=-1;
let cameras=[], camIndex=0;
let facingMode = (()=>{ try{ return localStorage.getItem('mc.facing')==='environment' ? 'environment' : 'user'; }catch(e){ return 'user'; } })();

const $=id=>document.getElementById(id);
const screens={home:$('home'), coach:$('coach'), summary:$('summary')};
const video=$('video'), canvas=$('overlayCanvas'), ctx=canvas.getContext('2d');

const STATUS={
  good:{cls:'good', ic:'✓', word:'Good'},
  adjust:{cls:'adjust', ic:'!', word:'Adjust'},
  off:{cls:'off', ic:'✕', word:'Off'},
  waiting:{cls:'wait', ic:'•', word:'Ready'}
};
const SKELCOL={good:'#39d98a', adjust:'#ffb020', off:'#ff5d5d', wait:'#5bd1ff'};

/* ===== SEGMENT: Build the home screen ===== */
function buildHome(){
  const root=$('moveList');
  root.innerHTML='';
  for(const sp of SPORTS){
    const sec=document.createElement('section'); sec.className='sport';
    const h=document.createElement('h2'); h.textContent=sp.name; sec.appendChild(h);
    const grid=document.createElement('div'); grid.className='cardgrid';
    for(const id of sp.moves){
      const mv=MOVES[id];
      const b=document.createElement('button'); b.className='movecard'; b.dataset.move=id;
      b.innerHTML=`<span class="name">${mv.label}</span>`+
        `<span class="facing">${mv.facing} · ${mv.type==='rep'?'counts reps':'logs attempts'}</span>`+
        `<span class="blurb">${mv.blurb}</span>`+
        `<span class="go">Open →</span>`;
      b.addEventListener('click',()=>chooseMove(id));
      grid.appendChild(b);
    }
    sec.appendChild(grid); root.appendChild(sec);
  }
}

/* ===== SEGMENT: Navigation ===== */
function show(name){
  for(const k in screens) screens[k].classList.toggle('is-active', k===name);
}
function chooseMove(id){
  active=MOVES[id]; state=active.init();
  $('coachTitle').textContent=active.label;
  $('coachSport').textContent=active.sport;
  $('setupHint').textContent=active.setup;
  $('angleHint').textContent='Camera: '+active.facing.toLowerCase();
  $('countCap').textContent=active.unit;
  $('countNum').textContent='0';
  // gauge config
  const g=$('gauge');
  if(active.gauge){
    g.classList.add('show');
    $('gaugeL').textContent=active.gauge.leftLabel;
    $('gaugeR').textContent=active.gauge.rightLabel;
    const {min,max,bandLow,bandHigh}=active.gauge;
    $('gaugeBand').style.left=(clamp01((bandLow-min)/(max-min))*100)+'%';
    $('gaugeBand').style.width=(clamp01((bandHigh-bandLow)/(max-min))*100)+'%';
  } else { g.classList.remove('show'); }
  $('flash').classList.remove('show');
  screens.coach.className='screen coach-pre is-active';
  show('coach');
}
function backHome(){ stopCamera(); show('home'); }

/* ===== SEGMENT: Model + camera ===== */
async function ensureModel(){
  if(landmarker) return;
  const vision=await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10/wasm");
  const opts=(delegate)=>({
    baseOptions:{
      modelAssetPath:"https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
      delegate
    },
    runningMode:"VIDEO", numPoses:1,
    minPoseDetectionConfidence:0.5, minPosePresenceConfidence:0.5, minTrackingConfidence:0.5
  });
  try{ landmarker=await PoseLandmarker.createFromOptions(vision, opts("GPU")); }
  catch(e){ landmarker=await PoseLandmarker.createFromOptions(vision, opts("CPU")); }
  drawer=new DrawingUtils(ctx);
}

async function startCamera(){
  // secure-context guard: browsers block the camera off https / localhost
  if(!window.isSecureContext){
    showOverlay('Camera is blocked here',
      `<p>Your browser only allows the camera when the page is served over <b>https</b> or from <b>localhost</b>.</p>
       <p>Opening the file straight from disk will not work. Two fixes:</p>
       <p>1. Put it on GitHub Pages and open the <code>https</code> link.<br>
          2. Or serve it locally, then open <code>http://localhost:8000</code>.</p>`, true);
    return;
  }
  try{
    showOverlay('Loading the pose model', '<p>This step needs internet the first time. A few seconds.</p>', false);
    await ensureModel();
    showOverlay('Starting the camera', '<p>Allow camera access when your browser asks.</p>', false);
    await acquireStream({video:{facingMode:{ideal:facingMode}, width:{ideal:1280}, height:{ideal:720}}, audio:false});
    hideOverlay();
    resetSmoothing();
    running=true; lastVideoTime=-1;
    screens.coach.className='screen coach-live is-active';
    loop();
    refreshCameras();   // device list (labels need camera permission, now granted)
  }catch(err){ handleStartError(err); }
}

/* ===== SEGMENT: Camera stream + front/back toggle ===== */
// Acquire (or re-acquire) the stream, releasing any previous tracks first, then
// sync mirroring to the camera's true facing.
async function acquireStream(constraints){
  if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
  stream=await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject=stream;
  await video.play();
  readFacing();        // learn whether this is the front or back camera
  applyMirror();       // front = selfie mirror; back = no mirror
  sizeStage();
  lastVideoTime=-1;    // force the loop to process the first frame of the new stream
}

// Determine the active camera's facing from track settings, falling back to the
// device label when the browser doesn't report facingMode (common on desktop).
function readFacing(){
  try{
    const tr=stream && stream.getVideoTracks()[0];
    const s=tr && tr.getSettings();
    if(s && s.facingMode){ facingMode=s.facingMode; return; }
    const label=((tr && tr.label) || '').toLowerCase();
    if(/back|rear|environment/.test(label)) facingMode='environment';
    else if(/front|user|face|selfie/.test(label)) facingMode='user';
    // else: keep current value
  }catch(e){ /* settings unavailable; keep current */ }
}

function applyMirror(){
  $('stage').classList.toggle('mirror', facingMode!=='environment');
}

// Enumerate video inputs so the flip button can cycle real devices (desktops
// with several webcams, not just phones with front/back facing modes).
async function refreshCameras(){
  try{
    const devs=await navigator.mediaDevices.enumerateDevices();
    cameras=devs.filter(d=>d.kind==='videoinput');
    const activeId=stream && stream.getVideoTracks()[0] && stream.getVideoTracks()[0].getSettings().deviceId;
    const i=cameras.findIndex(c=>c.deviceId===activeId);
    if(i>=0) camIndex=i;
  }catch(e){ cameras=[]; }   // enumeration blocked; switchCamera falls back to a facing swap
}

// Flip to the next camera. Cycles enumerated devices when available; otherwise
// best-effort front/back facingMode swap. Rolls back on failure.
async function switchCamera(){
  if(!running) return;
  await refreshCameras();
  if(cameras.length===1){ showToast('This device has only one camera'); return; }
  const prevFacing=facingMode, prevIndex=camIndex;
  try{
    if(cameras.length>1){
      camIndex=(camIndex+1)%cameras.length;
      await acquireStream({video:{deviceId:{exact:cameras[camIndex].deviceId}, width:{ideal:1280}, height:{ideal:720}}, audio:false});
    } else {
      facingMode = facingMode==='environment' ? 'user' : 'environment';
      await acquireStream({video:{facingMode:{exact:facingMode}, width:{ideal:1280}, height:{ideal:720}}, audio:false});
    }
    try{ localStorage.setItem('mc.facing', facingMode); }catch(e){}
  }catch(err){
    facingMode=prevFacing; camIndex=prevIndex;
    showToast('Could not switch camera');
    try{ await acquireStream({video:{facingMode:{ideal:prevFacing}, width:{ideal:1280}, height:{ideal:720}}, audio:false}); }
    catch(e){ handleStartError(e); }
  }
}

let toastTimer=0;
function showToast(msg){
  const t=$('toast'); t.textContent=msg; t.classList.add('show');
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>t.classList.remove('show'), 2400);
}

function sizeStage(){
  const vw=video.videoWidth||3, vh=video.videoHeight||4;
  canvas.width=vw; canvas.height=vh;
  $('stage').style.setProperty('--ar', vw+' / '+vh);
}

function stopCamera(){
  running=false;
  if(rafId) cancelAnimationFrame(rafId), rafId=0;
  if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; }
  video.srcObject=null;
}

function handleStartError(err){
  const name=(err&&err.name)||'';
  if(name==='NotAllowedError' || name==='SecurityError'){
    showOverlay('Camera permission needed',
      '<p>You blocked the camera, or your browser refused it. Allow camera access for this page, then start again.</p>', true);
  } else if(name==='NotFoundError' || name==='DevicesNotFoundError'){
    showOverlay('No camera found', '<p>This device has no camera the browser can use. Try one with a webcam.</p>', true);
  } else {
    showOverlay('Could not start',
      `<p>Something stopped the camera or the model from loading. If you are offline, the model cannot download. Check your connection and try again.</p>
       <p style="color:var(--ink-faint);font-size:.82rem">${name||'unknown error'}</p>`, true);
  }
  stopCamera();
}

/* ===== SEGMENT: Detection loop ===== */
function loop(){
  if(!running) return;
  if(video.readyState>=2 && video.currentTime!==lastVideoTime){
    lastVideoTime=video.currentTime;
    let res=null;
    try{ res=landmarker.detectForVideo(video, performance.now()); }
    catch(e){ /* skip a bad frame */ }
    onResults(res);
  }
  rafId=requestAnimationFrame(loop);
}

function onResults(res){
  ctx.save();
  ctx.clearRect(0,0,canvas.width,canvas.height);
  if(facingMode!=='environment'){ ctx.translate(canvas.width,0); ctx.scale(-1,1); }   // mirror only for the front (selfie) camera
  const has=res && res.landmarks && res.landmarks.length;
  if(has){
    const n=res.landmarks[0];
    const w=(res.worldLandmarks && res.worldLandmarks[0]) || n;
    let m=computeMetrics(n,w); m=smoothMetrics(m);
    const out=active.update(m,state);
    paint(out, m);
    drawSkeleton(n, STATUS[out.status]?.cls || 'wait');
    setTrack(m.bodyVisible);
  } else {
    paint({status:'waiting', cue:'Move into the frame', phase:'—', repDelta:0}, null);
    setTrack(false);
  }
  ctx.restore();
}

function drawSkeleton(n, cls){
  const col=SKELCOL[cls]||SKELCOL.wait;
  drawer.drawConnectors(n, PoseLandmarker.POSE_CONNECTIONS, {color:col, lineWidth:4});
  drawer.drawLandmarks(n, {color:'#ffffff', fillColor:col, lineWidth:1, radius:4});
}

/* ===== SEGMENT: Paint live feedback ===== */
let lastCount=0;
function paint(out, m){
  // count
  $('countNum').textContent=String(state.count);
  if(out.repDelta){
    const box=$('countBox'); box.classList.remove('bump'); void box.offsetWidth; box.classList.add('bump');
    if(active.type==='attempt' && state._last && active.flash){
      const f=$('flash'); f.innerHTML=active.flash(state._last); f.classList.add('show');
    }
  }
  // chip + cue + phase
  const st=STATUS[out.status]||STATUS.waiting;
  const chip=$('chip'); chip.className='chip '+st.cls;
  $('chipIc').textContent=st.ic; $('chipWord').textContent=st.word;
  $('cue').textContent=out.cue||'';
  $('phase').textContent=out.phase||'—';
  // gauge
  if(active.gauge && m){
    const v=active.gauge.read(m);
    if(v!=null){
      const {min,max}=active.gauge;
      $('gaugeMarker').style.left=(clamp01((v-min)/(max-min))*100)+'%';
    }
  }
  lastCount=state.count;
}

function setTrack(ok){
  const b=$('trackBadge'); b.classList.toggle('ok', !!ok);
  $('trackLbl').textContent = ok ? 'In frame' : 'Move into the frame';
}

/* ===== SEGMENT: Finish + summary ===== */
function finishSet(){
  stopCamera();
  const r=active.summarise(state);
  $('sumHead').textContent=r.head;
  $('sumSub').textContent=r.sub;
  const st=$('sumStats'); st.innerHTML='';
  if(r.stats.length){
    for(const [k,v] of r.stats){
      const row=document.createElement('div'); row.className='stat';
      row.innerHTML=`<span class="k">${k}</span><span class="v">${v}</span>`;
      st.appendChild(row);
    }
    st.style.display='flex';
  } else { st.style.display='none'; }
  $('sumFocus').textContent=r.focus;
  $('sumNext').textContent=r.next;
  show('summary');
}
function goAgain(){
  state=active.init();
  $('countNum').textContent='0'; $('flash').classList.remove('show');
  show('coach'); startCamera();
}

/* ===== SEGMENT: Overlay helpers ===== */
function showOverlay(title, bodyHtml, closeable){
  $('ovTitle').textContent=title;
  $('ovBody').innerHTML=bodyHtml;
  $('ovSpinner').style.display=closeable?'none':'block';
  $('ovClose').style.display=closeable?'block':'none';
  $('overlay').classList.add('show');
}
function hideOverlay(){ $('overlay').classList.remove('show'); }

/* ===== SEGMENT: Wire controls ===== */
$('backBtn').addEventListener('click', backHome);
$('startBtn').addEventListener('click', startCamera);
$('flipBtn').addEventListener('click', switchCamera);
$('finishBtn').addEventListener('click', finishSet);
$('resetBtn').addEventListener('click', ()=>{
  state=active.init(); $('countNum').textContent='0'; $('flash').classList.remove('show'); resetSmoothing();
});
$('againBtn').addEventListener('click', goAgain);
$('chooseBtn').addEventListener('click', ()=>{ stopCamera(); show('home'); });
$('ovClose').addEventListener('click', hideOverlay);
window.addEventListener('resize', ()=>{ if(running) sizeStage(); });

/* ===== SEGMENT: Boot ===== */
buildHome();
