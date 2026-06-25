/* Lunge — Fitness. repByAngleHysteresis spec. Pure data; thresholds DRAFT. */
export default {
  meta: {
    id:'lunge', sport:'Fitness', label:'Lunge', type:'rep', facing:'Side on',
    blurb:'Front knee to a right angle, tall trunk.',
    setup:'Stand side on, whole body in frame. Step one foot forward and lower into the lunge.',
    unit:'reps',
  },
  archetype:'repByAngleHysteresis',
  signal:'frontKnee',
  guard:'kneesReady',
  waitCue:'Step into frame',
  gauge:{ leftLabel:'Deep', rightLabel:'Standing', min:60, max:180, bandLow:80, bandHigh:105, signal:'frontKneeOr180' },
  detect:{
    enter:{ op:'lt', k:140 },
    exit:{ op:'gt', k:160 },
    track:[
      { name:'minFront', feature:'frontKnee', agg:'min' },
      { name:'minBack',  feature:'backKnee',  agg:'min' },
      { name:'maxLean',  feature:'torsoLean', agg:'max' },
    ],
  },
  rubric:[
    { key:'frontGood', type:'range', acc:'minFront', min:80, max:110 },
    { key:'backBent',  type:'cmp',   acc:'minBack',  op:'lt', value:140 },
    { key:'upright',   type:'cmp',   acc:'maxLean',  op:'le', value:45 },
  ],
  cues:{
    up:{ cue:'Lower into the lunge', phase:'Standing' },
    down:{
      phase:'Lunging',
      conds:[
        { when:{ all:[{v:'signal',op:'ge',k:80},{v:'signal',op:'le',k:110}] }, status:'good',   cue:'Good — front knee bent' },
        { when:{ all:[{v:'signal',op:'gt',k:110}] },                          status:'adjust', cue:'Lower' },
      ],
      default:{ status:'adjust', cue:'Ease up a little' },
      override:{ when:{ all:[{v:'torsoLean',op:'gt',k:45}] }, status:'adjust', cue:'Stand tall' },
    },
  },
  summary:{
    word:'lunge', headSuffix:' logged',
    sub:'Front knee depth measured at the bottom of each rep.',
    blankHead:'No full lunges counted yet.',
    blankNext:'Step forward, bend the front knee toward a right angle, keep your trunk tall.',
    stats:[
      { label:'Reps counted',        kind:'N' },
      { label:'Front knee bent well',kind:'ratio', field:'frontGood' },
      { label:'Back leg lowered',    kind:'ratio', field:'backBent' },
    ],
    focus:[
      { field:'frontGood', match:false, text:'Bend the front knee more.', next:'Aim the front thigh toward parallel, knee over the ankle.' },
      { field:'backBent',  match:false, text:'Use the back leg.',         next:'Lower the back knee toward the floor. Step a touch longer.' },
      { field:'upright',   match:false, text:'Keep your trunk tall.',     next:'Stay upright, do not fold forward over the front leg.' },
    ],
    fallbackFocus:'Clean, controlled lunges.',
    fallbackNext:'Add reps or slow the descent for more control.',
  },
  provenance:{
    status:'draft', reviewedBy:null, lastReviewed:null,
    thresholds:[
      { name:'frontGood (minFront 80-110)', source:null, evidenceLevel:'coaching-consensus', note:'Front knee ~90deg; apply +-15deg band. Needs sign-off.' },
      { name:'backBent (minBack<140)', source:null, evidenceLevel:'heuristic-unverified' },
      { name:'upright (maxLean<=45)', source:null, evidenceLevel:'heuristic-unverified' },
    ],
  },
};
