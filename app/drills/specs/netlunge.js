/* Net lunge — Badminton. repByAngleHysteresis spec. Pure data; thresholds DRAFT. */
export default {
  meta: {
    id:'netlunge', sport:'Badminton', label:'Net lunge', type:'rep', facing:'Side on',
    blurb:'Deep front knee, racket arm reaching to the net.',
    setup:'Stand side on, a couple of steps back, whole body in frame. Step forward into a lunge and stretch your racket arm out toward the net, then push back to recover.',
    unit:'lunges',
  },
  archetype:'repByAngleHysteresis',
  signal:'frontKnee',
  guard:'kneesReady',
  waitCue:'Step into frame',
  gauge:{ leftLabel:'Deep', rightLabel:'Standing', min:60, max:180, bandLow:80, bandHigh:115, signal:'frontKneeOr180' },
  detect:{
    enter:{ op:'lt', k:140 },
    exit:{ op:'gt', k:160 },
    track:[
      { name:'minFront', feature:'frontKnee', agg:'min' },
      { name:'reached',  feature:'netReach',  agg:'or' },
      { name:'maxLean',  feature:'torsoLean', agg:'max' },
    ],
  },
  rubric:[
    { key:'depthGood', type:'range', acc:'minFront', min:75, max:120 },
    { key:'reached',   type:'bool',  acc:'reached' },
    { key:'steady',    type:'cmp',   acc:'maxLean',  op:'le', value:45 },
  ],
  cues:{
    up:{ cue:'Lunge forward to the net', phase:'Ready' },
    down:{
      phase:'Lunging',
      conds:[
        { when:{ all:[{v:'signal',op:'gt',k:120}] }, status:'adjust', cue:'Deeper into the lunge' },
        { when:{ not:'netReach' },                   status:'adjust', cue:'Reach the racket out' },
      ],
      default:{ status:'good', cue:'Good — reach, then push back' },
      override:{ when:{ all:[{v:'torsoLean',op:'gt',k:45}] }, status:'adjust', cue:'Chest up, stay balanced' },
    },
  },
  summary:{
    word:'net lunge', headSuffix:' logged',
    sub:'Front knee depth and reach measured at the lowest point of each rep.',
    blankHead:'No net lunges counted yet.',
    blankNext:'Step forward into a deep lunge and stretch the racket arm out toward the net.',
    stats:[
      { label:'Reps counted', kind:'N' },
      { label:'Good depth',   kind:'ratio', field:'depthGood' },
      { label:'Reached out',  kind:'ratio', field:'reached' },
    ],
    focus:[
      { field:'depthGood', match:false, text:'Lunge deeper.',  next:'Bend the front knee toward a right angle, knee tracking over the ankle.' },
      { field:'reached',   match:false, text:'Reach further.', next:'Stretch the racket arm out in front to take the shuttle early at the net.' },
      { field:'steady',    match:false, text:'Stay balanced.', next:'Keep your chest up and weight back so you can push off to recover.' },
    ],
    fallbackFocus:'Sharp lunges with a long reach.',
    fallbackNext:'Add reps, and push back to your ready base each time.',
  },
  provenance:{
    status:'draft', reviewedBy:null, lastReviewed:null,
    thresholds:[
      { name:'depthGood (minFront 75-120)', source:'REF-BADMINTON-LUNGE', evidenceLevel:'coaching-consensus',
        note:'Net-lunge touchdown is naturally stiffer post split-step; do not grade like a soft jump-landing.' },
      { name:'reached (racket arm extended, wrist below shoulder)', source:null, evidenceLevel:'heuristic-unverified' },
      { name:'steady (maxLean<=45)', source:null, evidenceLevel:'heuristic-unverified' },
    ],
  },
};
