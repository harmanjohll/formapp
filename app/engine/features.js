/* Named feature extractors, frame guards, and comparison ops used by the
   archetype engines. Drill specs reference these by NAME (string) so that the
   spec files stay pure, JSON-serialisable data — no functions, no thresholds
   buried in logic. This is the vetted vocabulary a spec is allowed to use. */

export const FEATURES = {
  // direct joint angles (interior angle in degrees; 180 = straight)
  kneeAvg:        m => m.kneeAvg,
  torsoLean:      m => m.torsoLean,
  // derived knee features
  frontKnee:      m => Math.min(m.kneeL, m.kneeR),          // the more-bent (front) leg
  backKnee:       m => Math.max(m.kneeL, m.kneeR),          // the straighter (back) leg
  frontKneeOr180: m => Math.min(m.kneeL ?? 180, m.kneeR ?? 180),
  kneeLOr180:     m => m.kneeL ?? 180,
  kneeROr180:     m => m.kneeR ?? 180,
  // badminton net-lunge: racket arm extended forward and below the shoulders
  netReach:       m => (m.elbowR!=null && m.elbowR>=150 && m.nWrR.y>m.shoulderMidY) ||
                       (m.elbowL!=null && m.elbowL>=150 && m.nWrL.y>m.shoulderMidY),
};

export const GUARDS = {
  kneeAvgReady: m => m.bodyVisible && m.kneeAvg!=null,
  kneesReady:   m => m.bodyVisible && m.kneeL!=null && m.kneeR!=null,
};

export const OPS = {
  ge:(a,b)=>a>=b, le:(a,b)=>a<=b, gt:(a,b)=>a>b, lt:(a,b)=>a<b, eq:(a,b)=>a===b,
};

export function feat(name, m){
  const f=FEATURES[name];
  if(!f) throw new Error('unknown feature: '+name);
  return f(m);
}
