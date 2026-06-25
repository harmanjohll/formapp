/* Squat — Fitness. Declarative spec for the repByAngleHysteresis archetype.
   Pure data (features referenced by name); JSON-serialisable for schema checks.
   Thresholds are DRAFT and isolated here for expert sign-off (see provenance). */
export default {
  meta: {
    id:'squat', sport:'Fitness', label:'Squat', type:'rep', facing:'Side on',
    blurb:'Depth, even legs, chest up.',
    setup:'Stand side on to the camera, a few steps back, whole body in frame. Squat at your own pace.',
    unit:'reps',
  },
  archetype:'repByAngleHysteresis',
  signal:'kneeAvg',
  guard:'kneeAvgReady',
  waitCue:'Step into frame',
  gauge:{ leftLabel:'Deep', rightLabel:'Standing', min:60, max:180, bandLow:70, bandHigh:100, signal:'kneeAvg' },
  detect:{
    enter:{ op:'lt', k:150 },
    exit:{ op:'gt', k:160 },
    track:[
      { name:'minKnee',  feature:'kneeAvg',    agg:'min' },
      { name:'minKneeL', feature:'kneeLOr180', agg:'min' },
      { name:'minKneeR', feature:'kneeROr180', agg:'min' },
      { name:'maxLean',  feature:'torsoLean',  agg:'max' },
    ],
  },
  rubric:[
    { key:'depthGood',  type:'cmp',     acc:'minKnee',  op:'le', value:105 },
    { key:'tooShallow', type:'cmp',     acc:'minKnee',  op:'gt', value:120 },
    { key:'even',       type:'absDiff', acc:'minKneeL', acc2:'minKneeR', op:'le', value:22 },
    { key:'upright',    type:'cmp',     acc:'maxLean',  op:'le', value:50 },
  ],
  cues:{
    up:{ cue:'Bend and squat', phase:'Standing' },
    down:{
      phase:'Going down',
      conds:[
        { when:{ all:[{v:'signal',op:'ge',k:60},{v:'signal',op:'le',k:100}] }, status:'good',   cue:'Good depth — drive up' },
        { when:{ all:[{v:'signal',op:'gt',k:100},{v:'signal',op:'le',k:130}] }, status:'adjust', cue:'Lower' },
        { when:{ all:[{v:'signal',op:'lt',k:60}] },                            status:'adjust', cue:'Deep — stay controlled' },
      ],
      default:{ status:'waiting', cue:'Keep going down' },
      override:{ when:{ all:[{v:'torsoLean',op:'gt',k:50}] }, status:'adjust', cue:'Chest up' },
    },
  },
  summary:{
    word:'squat', headSuffix:' logged',
    sub:'Depth measured at the lowest point of each rep.',
    blankHead:'No full squats counted yet.',
    blankNext:'Stand side on, sink until your thighs near parallel, then stand tall.',
    stats:[
      { label:'Reps counted',       kind:'N' },
      { label:'Reached good depth', kind:'ratio', field:'depthGood' },
      { label:'Even left and right',kind:'ratio', field:'even' },
    ],
    focus:[
      { field:'tooShallow', match:true,  text:'Sink deeper.',          next:'Lower until your thighs reach about parallel each rep.' },
      { field:'upright',    match:false, text:'Keep your chest up.',   next:'Lead with your hips, not your shoulders, on the way down.' },
      { field:'even',       match:false, text:'Share the load.',       next:'Both knees should bend the same amount. Even them out.' },
    ],
    fallbackFocus:'Strong, balanced set.',
    fallbackNext:'Hold this depth and add a few reps.',
  },
  provenance:{
    status:'draft', reviewedBy:null, lastReviewed:null,
    thresholds:[
      { name:'depthGood (minKnee<=105)', source:'REF-SQUAT-TRUNK-TIBIA', evidenceLevel:'coaching-consensus',
        note:'Near-parallel depth. Consensus parallel is ~90-100deg knee; apply +-5-10deg band. Trunk lean alone is NOT a valid load cue — pair with a shin/tibia signal at sign-off.' },
      { name:'even (|L-R|<=22)', source:null, evidenceLevel:'heuristic-unverified', note:'Symmetry band; needs sign-off.' },
      { name:'upright (maxLean<=50)', source:null, evidenceLevel:'heuristic-unverified', note:'Trunk-lean limit; biomechanically should combine with tibia inclination.' },
    ],
  },
};
