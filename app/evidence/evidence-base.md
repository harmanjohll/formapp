# Motion Coach — Evidence Base for Coaching Cues & Form Thresholds

**Status:** `DRAFT — awaiting expert sign-off` · **Compiled:** 2026-06-25 · **Curriculum framing:** US (SHAPE America National Standards / NFHS) · **Source:** deep-research run `wf_3c2f6517-885` (30 sources fetched, 25 claims adversarially verified, 18 confirmed / 7 refuted).

This document is the **resource layer** for the drill content packs. Every numeric threshold a spec uses should cite a `REF-*` id from [`references.json`](./references.json) and carry an evidence level. **No threshold here is final until a PE teacher / S&C coach / physiotherapist signs off** (hybrid flow, step 2).

> **Convention note on knee angle.** The app's `angle3()` returns the *interior* joint angle: **180° = straight leg, smaller = more bent**. Sports-science literature usually reports **knee *flexion*** = `180 − interiorAngle`. So "≥30° flexion at landing" (LESS soft-landing) = **interior knee angle ≤ 150°**. Both conventions appear below; watch which one a number is in.

---

## How to read the evidence levels

| Level | Meaning |
|---|---|
| **research-backed** | Peer-reviewed primary research / systematic review, verified this pass. |
| **preliminary** | Only preprints / small-n / non-3D-mocap criterion. Use with caution. |
| **coaching-consensus** | Widely taught, but not tied to a verified numeric study here. |
| **heuristic-unverified** | Reasonable engineering guess. **No source.** Needs sign-off. |

**Headline for the whole project:** the verified evidence strongly supports the *cross-cutting methodology* (tolerance bands, landing grading via LESS, rep-counting caveats) and a few *specific drill mechanics* (squat trunk/tibia interaction, badminton lunge/split-step kinematics, basketball shooting redundancy). It does **not** supply research-backed numbers for jumping jacks, lunge front-knee angle, badminton clear/smash, or fitness depth/cadence — those are **coaching-consensus / heuristic and must be signed off.**

---

## Cross-cutting #1 — Measurement validity → use TOLERANCE BANDS, not cut-points

This is the most important and best-supported finding, and it shapes every spec.

- **Joint angles from pose should be graded with bands of several degrees, not single thresholds.** Accepted criterion for lower-limb angles is bias `< ±2–5°`; even the marker-based "gold standard" carries ~2–5° intrinsic error. → **Apply at least ±5° tolerance** to any sagittal-plane angle gate, wider for anything not in-plane. *(research-backed — `REF-MARKERLESS-TOLERANCE`)*
- **Our system is the hard case: a SINGLE camera.** The strong accuracy figures in the literature come from **multi-camera** rigs that resolve depth by triangulation. Single-camera setups have fundamental depth ambiguity → **budget larger error and wider bands** than the headline studies suggest. *(research-backed — `REF-MULTICAM-GAP`)*
- **Sagittal (in-plane) signals are reliable; frontal/transverse are not.** Squat depth, trunk flexion, landing knee flexion → measurable. **Knee valgus, hip rotation/abduction, "alignment" left-right → measured poorly by one camera.** Treat any rubric item that depends on those as low-confidence regardless of source. *(research-backed — `REF-MARKERLESS-TOLERANCE`, `REF-LESSM`)*
- **Per-task validity is lower than pooled figures.** Single-camera BlazePose knee angle: pooled ICC 0.982 (MAE ~7°) but **squat-specific ICC dropped to ~0.773, sit-to-stand ~0.632**. *(preliminary — `REF-SINGLECAM-KNEE`)*
- **Jump/landing metrics are directionally biased** (markerless overestimates jump height / CoM velocity) but reliable (ICC > 0.91). Don't treat landing output as unbiased. *(research-backed — `REF-LANDING-BIAS`)*

**Engine implication:** grading should be three-zone with a margin — `good` inside the band, `adjust` within ±tolerance of the edge, `off` only well beyond it. The existing **rep-detection hysteresis** (enter/exit at different angles) is exactly the right pattern; extend the same band thinking to *grading*.

## Cross-cutting #2 — Rep counting & camera orientation

- **Rep counting is feasible but dataset-dependent (~86–99%).** Don't trust demo-grade numbers; validate per drill. *(preliminary — `REF-REPCOUNT`)*
- **BlazePose miscounts when the face isn't visible / the subject is angled away** — it relies on a face/person detector. **Camera-orientation guidance and graceful low-visibility handling are required.** *(research-backed — `REF-FACEVIS`)*

**Implications:** keep/strengthen the per-drill "Camera: side on / face on" hints; the existing `bodyVisible`/`track` gating is correct — extend it to warn on low landmark visibility. **For the upcoming front/back camera toggle:** the rear camera is fine for filming a partner, *but the subject's head/face should still be in frame* or counting degrades.

---

## Per-drill evidence

Each table maps **checkpoint → pose signal → recommended threshold (+tolerance) → evidence level**, then compares to the **current hard-coded value** in `index.html` so we know what changes at sign-off.

### 1. Bodyweight squat (Fitness) — facing: side on

**Technical model:** "sit back and down to about thigh-parallel, chest up, knees tracking over toes." The one *research-backed* structural insight: **trunk lean and shin (tibia) inclination have opposing effects on knee load and must be read together** — you cannot judge squat safety from trunk lean alone, and **shin angle alone does NOT map to knee load** (that specific claim was refuted). *(REF-SQUAT-TRUNK-TIBIA)*

| Checkpoint | Pose signal | Recommended threshold (+tol) | Evidence | Current app value |
|---|---|---|---|---|
| Depth ≈ parallel | min knee interior angle | ≈ **90–100° flexion** → interior **≤ ~95° ±10°** | coaching-consensus | `depthGood ≤105°`, `tooShallow >120°` |
| Trunk not excessive | torso lean from vertical | interpret **with** shin angle, not alone | research-backed (principle) | `upright ≤50°` (lean alone) |
| Even L/R load | \|kneeL−kneeR\| | symmetry desirable; band only | heuristic-unverified | `even ≤22°` |

**Faults → cues:** shallow → "sink to parallel"; trunk dives forward → "chest up" *(but only flag if shin is also forward — combine signals)*; uneven → "share the load."
**Safety (SHAPE America / developmental):** for school-age learners emphasize control and pain-free range over maximal depth; no research basis here for an adolescent depth limit → **sign-off needed.**
**Open questions:** exact PE-appropriate depth band; whether to add a tibia-inclination signal so the trunk cue is biomechanically valid (currently trunk-only, which the evidence says is insufficient).

### 2. Forward lunge (Fitness) — facing: side on

**Technical model:** step out, lower until the **front thigh ≈ parallel / front knee ≈ 90°**, knee tracks over the ankle, trunk tall, back knee lowers. No verified numeric surfaced — this is **coaching-consensus**.

| Checkpoint | Pose signal | Recommended threshold (+tol) | Evidence | Current app value |
|---|---|---|---|---|
| Front knee ≈ 90° | min front-knee interior angle | **~90° ±15°** (i.e. ~75–105°) | coaching-consensus | `frontGood 80–110°` |
| Back leg engaged | max (other) knee bend | bent below straight | heuristic-unverified | `backBent <140°` |
| Tall trunk | torso lean | small lean | heuristic-unverified | `upright ≤45°` |

**Faults → cues:** front knee too straight → "bend the front knee toward 90°"; upright fold → "stand tall"; back leg unused → "lower the back knee."
**Open questions:** the entire numeric set is consensus/heuristic — **sign-off needed**; confirm "knee over ankle" can be judged from a single sagittal view (it borders on a depth-ambiguous signal).

### 3. Jumping jacks (Fitness) — facing: face on

**No research evidence surfaced.** Pure movement-completeness check (arms overhead + feet wide). Everything here is **heuristic-unverified.**

| Checkpoint | Pose signal | Recommended | Evidence | Current app value |
|---|---|---|---|---|
| Arms overhead | both wrists.y < nose.y | full reach | heuristic-unverified | `armsUp: wrists above nose` |
| Feet wide | ankle separation / shoulder width | clearly > shoulder width | heuristic-unverified | `wide: sep > 1.5× shoulderWidth` |

**Camera note:** face-on means `shoulderWidth` is a *valid* normalizer here (unlike side-on drills). **Open questions:** all thresholds; cadence/tempo not assessed.

### 4. Basketball free throw / set shot (Basketball) — facing: side on

**Key research finding — design-changing:** **there is NO single correct joint configuration** for shooting; many shoulder/elbow/wrist combinations produce an optimal release (joints compensate). → **Do not grade against rigid joint angles** (e.g. a mandatory 90° set elbow). Grade **gross BEEF checkpoints** (Balance–Eyes–Elbow–Follow-through, *coaching-consensus*) and **consistency/repeatability** instead. *(research-backed — `REF-SHOOTING-REDUNDANCY`)*

| Checkpoint | Pose signal | Recommended | Evidence | Current app value |
|---|---|---|---|---|
| Loaded set exists | elbow bent at set | presence, not a precise angle | coaching-consensus | `setElbow ≤110°`, cock 60–115° |
| Legs involved | knee bend during load | some flexion present | coaching-consensus | `legsUsed knee ≤160°` |
| Full release | peak elbow extension | near-full extension (gross) | coaching-consensus | `fullExtension ≥160°` |
| Elbow "lined up" | elbow-under-wrist horizontal offset | **low confidence — frontal-plane-ish** | heuristic-unverified | `aligned <0.07` |

**Faults → cues:** keep BEEF-style verbal cues; **reframe scoring toward "repeatable, same-every-time" rather than hitting prescribed angles.** The `aligned` check leans on a left-right signal a single side-on camera estimates poorly → **demote or drop pending sign-off.**
**Open questions:** all specific angles are heuristic; best to add a **consistency metric** across attempts.

### 5. Badminton overhead clear / smash (Badminton) — facing: face on / slightly side

**No verified numeric thresholds surfaced** (BWF *Shuttle Time* technical model was not captured by a verified claim). Current logic (cock the arm, reach high, full extension at contact, non-racket arm up) is **coaching-consensus / heuristic.**

| Checkpoint | Pose signal | Recommended | Evidence | Current app value |
|---|---|---|---|---|
| Loaded cock | min prep elbow angle | bent behind head | heuristic-unverified | `cocked ≤120°` |
| High contact | wrist above nose | overhead | coaching-consensus | wrist.y < nose.y |
| Full arm at contact | peak elbow extension | near-full | coaching-consensus | `fullExtension ≥160°` |
| Non-racket arm up | other wrist above shoulder | balance cue | coaching-consensus | other wrist < shoulderMidY |

**Open questions:** source BWF Shuttle Time checkpoints; all numbers need sign-off; "which arm is the racket arm" inference (higher hand) is fragile.

### 6. Badminton net lunge (Badminton) — facing: side on

**Relevant research:** performing a **split step before a forehand forecourt lunge increases hip abduction/rotation but DECREASES knee flexion at foot contact** (a *stiffer*, more-extended touchdown is the natural pattern). So a relatively extended knee at the *instant of touchdown* is expected here — **don't penalize it the way you would a soft-landing jump.** Hip rotation/abduction are **out-of-plane → not reliably single-camera-measurable.** *(research-backed, single small male-only study — `REF-BADMINTON-LUNGE`)*

| Checkpoint | Pose signal | Recommended | Evidence | Current app value |
|---|---|---|---|---|
| Deep lunge | min front-knee interior angle | ~90–110° (band) | coaching-consensus | `depthGood 75–120°` |
| Reach to net | racket arm extended + wrist below shoulder | presence | heuristic-unverified | elbow ≥150° & wrist below shoulder |
| Balanced/controlled | torso lean | small | heuristic-unverified | `steady ≤45°` |

**Safety:** lunge landing loads the lead knee; same ACL-mechanics cautions as landings apply (see #7). **Open questions:** depth band; whether to add a *controlled-deceleration* cue rather than a soft-knee cue (evidence says touchdown is naturally stiffer post-split-step).

### 7. Badminton split step / ready-position landing (Badminton) — facing: face on

**Best-evidenced drill in the app — anchor it to the Landing Error Scoring System (LESS).**

- **Soft-landing checkpoint:** **knee flexion at initial contact should be > 30°** (interior knee angle **< 150°**); ≤30° flexion = a stiff-landing *error*. Sagittal, in-plane → exactly what one camera measures best. *(research-backed at item level — `REF-LESS-KNEEFLEX`)*
- **Grade by category, not one number:** LESS overall score (excellent ≤4 / good >4–5 / moderate >5–6 / poor >6) has concurrent validity vs 3D mocap; ≥5 errors predicted ACL injury in one population (86% sens, 64% spec) — **population-specific, don't over-claim.** *(research-backed — `REF-LESS-CATEGORIES`)*
- **LESS is reliable** (intrarater ICC 0.82–0.99) — a sound rubric to model on — **but automated pose scoring of it is unvalidated**, and it was validated on a *drop-vertical-jump*, so transfer to badminton is a reasonable **but unvalidated extrapolation**. *(REF-LESS-RELIABILITY)*

| Checkpoint | Pose signal | Recommended (+tol) | Evidence | Current app value |
|---|---|---|---|---|
| **Soft landing** | knee interior angle at/just after contact | **≤ 150° (≥30° flexion) ±5°** | research-backed (item) / extrapolated to badminton | `lowEnough ≤158°`, gate `bent ≤165°` ← **too lenient vs LESS** |
| Wide, athletic base | ankle sep / shoulder width | clearly wide | heuristic-unverified | `wide ≥1.4`, `wideEnough ≥1.5` |
| Even, two-foot landing | L/R ankle vertical offset | symmetric | heuristic-unverified (frontal-ish) | `even: level ≤0.5` |
| Knee valgus (LESS item) | knee-over-foot frontal | **avoid — single-camera measures poorly** | not recommended | not implemented (correctly) |

**⚠️ Concrete actionable change at sign-off:** the current "low enough" bar (`≤158°` ≈ 22° flexion, gated by `bent ≤165°` ≈ 15° flexion) is **shallower than the LESS soft-landing standard** (≥30° flexion → ≤150°). Recommend tightening toward **≤150° ±5°**, *pending expert confirmation that the DVJ-derived 30° transfers to a badminton split-step* (it may not — split-step touchdowns are naturally stiffer, see #6).
**Safety (developmental):** soft, controlled landings are the core ACL-risk-reduction message for school-age athletes; this drill is the app's best injury-prevention lever — but keep the "prompt, not diagnosis" framing.

---

## ⛔ DO NOT IMPLEMENT — claims that were adversarially REFUTED

These plausible-sounding values were killed in verification. **Do not hard-code any of them.**

1. **No "10° = hard upper bound" rule** for acceptable markerless error (refuted 0-3). Use bands, not a universal ceiling.
2. **No fixed −5° / ±7° BlazePose bias correction** for knee angle (refuted 1-2). Do not bake in a directional offset.
3. **No assumption that BlazePose bias is unstable session-to-session** (refuted 0-3) — but also don't assume a calibratable fixed offset (see #2). Net: avoid per-session offset hacks entirely.
4. **No "near-perfect CMJ agreement (r > 0.98)"** framing (refuted 1-2). Markerless is *reliable*, not *exact*.
5. **No "LESS = 17 items / max score 19" as settled fact** for this app (refuted 1-2). Cite the *checkpoints* (esp. the 30° item), not a fixed item count.
6. **No "shin-angle-alone → knee load" checkpoint** (refuted 0-3). Shin angle is only meaningful *combined with* trunk lean.
7. **No "split-step stance width ≈ 50% body height" or "~0.25 s reaction time" anchors** (refuted 0-3). The current `sep ≥ 1.4 shoulder-widths` is a heuristic and must be labelled as such, not justified by these numbers.

---

## Global open questions for expert sign-off

1. **System validity gap (biggest):** no surviving evidence validates *single-camera MediaPipe/BlazePose* on *any* of the 7 drills. All per-drill tolerance bands are extrapolations → ideally a small in-house validation, at minimum expert sign-off.
2. **Uncovered numerics:** jumping jacks (all), lunge front-knee angle, squat depth band, badminton clear/smash — source from governing bodies (NSCA, BWF Shuttle Time, FIBA) and label coaching-consensus before locking.
3. **Automated LESS:** can pose-based scoring reproduce trained-rater LESS grading, given valgus items are frontal-plane (single-camera-weak)? Validate before using the landing rubric for grading.
4. **Developmental appropriateness & safety (SHAPE America / NFHS / afPE):** age-appropriate squat depth & knee load for adolescents; landing/ACL guidance for school-age learners. No verified claim addresses these → **all safety thresholds require PE-teacher / S&C / physio sign-off.**

---

## Consolidated references

See [`references.json`](./references.json) for the structured register keyed by `REF-*`. Primary sources verified this pass:

- Sensors (MDPI) 2026, 26(12):3956 — markerless vs marker-based, lower-limb systematic review.
- Needham et al. 2022, *J Biomechanics* — multi-view markerless accuracy.
- Aleksic, Kanevsky et al. 2024, *Sensors* 24(20):6624 — two-camera CMJ validation.
- JMIR preprint #102399 — single-camera BlazePose knee angle (preliminary).
- Pūioio 2023, arXiv:2308.02420 — on-device rep counting (preliminary); Sports Medicine review s40279-020-01382-w — movement-event detection.
- Bazarevsky et al. 2020, arXiv:2006.10204 — BlazePose model.
- Padua et al. 2009 (PMID 19726623) & 2015 (PMC4527442) — LESS validation & ACL-predictive cutoff.
- Hanzlikova & Hébert-Losier 2020 (PMC7040940) — LESS reliability/validity systematic review.
- Modified LESS validity 2025 (S1466853X25001130) & 2026 youth-basketball follow-up.
- Straub & Powers 2024 (PMC10987311) — squat biomechanics (trunk/tibia); corroborated by Lorenzetti 2021, Bagchi/Sayers 2023.
- Okubo & Hubbard 2015, *Procedia Engineering* 112:443-448 — basketball shooting joint redundancy.
- Bioengineering (MDPI) 2024, 11(5):501 — badminton forehand lunge / split-step kinematics.

---

*Provenance: generated 2026-06-25 from deep-research run `wf_3c2f6517-885`. Status `draft`; flip each drill to `reviewed` (with reviewer name + date) in the spec `provenance` block once signed off.*
