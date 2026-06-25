/* Frozen verbatim copies of the squat/lunge/netlunge drill objects as they were
   BEFORE the archetype refactor. These are the behavioural reference (golden) for
   the parity test — do not "improve" them; they define intended behaviour. */

const WAIT=(cue)=>({status:'waiting',cue,phase:'—',repDelta:0});
function focusFrom(pairs){ for(const p of pairs){ if(p.bad>0) return {text:p.text, next:p.next}; } return null; }
function blankReport(head,next){ return {head, sub:'Nothing was counted this time.', stats:[], focus:'Try again.', next}; }

export const SQUAT={
  id:'squat', sport:'Fitness', label:'Squat', type:'rep', facing:'Side on',
  blurb:'Depth, even legs, chest up.',
  setup:'Stand side on to the camera, a few steps back, whole body in frame. Squat at your own pace.',
  unit:'reps',
  gauge:{leftLabel:'Deep', rightLabel:'Standing', min:60, max:180, bandLow:70, bandHigh:100, read:m=>m.kneeAvg},
  init:()=>({count:0, phase:'up', minKnee:180, minKneeL:180, minKneeR:180, maxLean:0, records:[]}),
  update(m,s){
    if(!m.bodyVisible || m.kneeAvg==null) return WAIT('Step into frame');
    const k=m.kneeAvg;
    if(s.phase==='down'){
      s.minKnee=Math.min(s.minKnee,k);
      s.minKneeL=Math.min(s.minKneeL, m.kneeL ?? 180);
      s.minKneeR=Math.min(s.minKneeR, m.kneeR ?? 180);
      s.maxLean=Math.max(s.maxLean, m.torsoLean);
    }
    let repDelta=0;
    if(s.phase==='up' && k<150){
      s.phase='down'; s.minKnee=k; s.minKneeL=m.kneeL ?? 180; s.minKneeR=m.kneeR ?? 180; s.maxLean=m.torsoLean;
    } else if(s.phase==='down' && k>160){
      const depthGood=s.minKnee<=105, tooShallow=s.minKnee>120;
      const even=Math.abs(s.minKneeL-s.minKneeR)<=22;
      const upright=s.maxLean<=50;
      s.records.push({depthGood,tooShallow,even,upright});
      s.count++; repDelta=1; s.phase='up'; s.minKnee=180;
    }
    let status,cue,phase;
    if(s.phase==='up'){ status='waiting'; cue='Bend and squat'; phase='Standing'; }
    else{
      phase='Going down';
      if(k>=60 && k<=100){ status='good'; cue='Good depth — drive up'; }
      else if(k>100 && k<=130){ status='adjust'; cue='Lower'; }
      else if(k<60){ status='adjust'; cue='Deep — stay controlled'; }
      else{ status='waiting'; cue='Keep going down'; }
      if(m.torsoLean>50){ status='adjust'; cue='Chest up'; }
    }
    return {status,cue,phase,repDelta};
  },
  summarise(s){
    const N=s.count, R=s.records;
    if(!N) return blankReport('No full squats counted yet.','Stand side on, sink until your thighs near parallel, then stand tall.');
    const good=R.filter(r=>r.depthGood).length;
    const f=focusFrom([
      {bad:R.filter(r=>r.tooShallow).length, text:'Sink deeper.', next:'Lower until your thighs reach about parallel each rep.'},
      {bad:R.filter(r=>!r.upright).length, text:'Keep your chest up.', next:'Lead with your hips, not your shoulders, on the way down.'},
      {bad:R.filter(r=>!r.even).length, text:'Share the load.', next:'Both knees should bend the same amount. Even them out.'}
    ]);
    return {
      head:`${N} squat${N>1?'s':''} logged`,
      sub:'Depth measured at the lowest point of each rep.',
      stats:[['Reps counted',N],['Reached good depth',`${good} of ${N}`],['Even left and right',`${R.filter(r=>r.even).length} of ${N}`]],
      focus: f?f.text:'Strong, balanced set.',
      next: f?f.next:'Hold this depth and add a few reps.'
    };
  }
};

export const LUNGE={
  id:'lunge', sport:'Fitness', label:'Lunge', type:'rep', facing:'Side on',
  blurb:'Front knee to a right angle, tall trunk.',
  setup:'Stand side on, whole body in frame. Step one foot forward and lower into the lunge.',
  unit:'reps',
  gauge:{leftLabel:'Deep', rightLabel:'Standing', min:60, max:180, bandLow:80, bandHigh:105, read:m=>Math.min(m.kneeL ?? 180, m.kneeR ?? 180)},
  init:()=>({count:0, phase:'up', minFront:180, minBack:180, maxLean:0, records:[]}),
  update(m,s){
    if(!m.bodyVisible || m.kneeL==null || m.kneeR==null) return WAIT('Step into frame');
    const front=Math.min(m.kneeL,m.kneeR), back=Math.max(m.kneeL,m.kneeR);
    if(s.phase==='down'){ s.minFront=Math.min(s.minFront,front); s.minBack=Math.min(s.minBack,back); s.maxLean=Math.max(s.maxLean,m.torsoLean); }
    let repDelta=0;
    if(s.phase==='up' && front<140){ s.phase='down'; s.minFront=front; s.minBack=back; s.maxLean=m.torsoLean; }
    else if(s.phase==='down' && front>160){
      const frontGood=s.minFront>=80 && s.minFront<=110;
      const backBent=s.minBack<140;
      const upright=s.maxLean<=45;
      s.records.push({frontGood,backBent,upright});
      s.count++; repDelta=1; s.phase='up'; s.minFront=180; s.minBack=180;
    }
    let status,cue,phase;
    if(s.phase==='up'){ status='waiting'; cue='Lower into the lunge'; phase='Standing'; }
    else{
      phase='Lunging';
      if(front>=80 && front<=110){ status='good'; cue='Good — front knee bent'; }
      else if(front>110){ status='adjust'; cue='Lower'; }
      else{ status='adjust'; cue='Ease up a little'; }
      if(m.torsoLean>45){ status='adjust'; cue='Stand tall'; }
    }
    return {status,cue,phase,repDelta};
  },
  summarise(s){
    const N=s.count, R=s.records;
    if(!N) return blankReport('No full lunges counted yet.','Step forward, bend the front knee toward a right angle, keep your trunk tall.');
    const good=R.filter(r=>r.frontGood).length;
    const f=focusFrom([
      {bad:R.filter(r=>!r.frontGood).length, text:'Bend the front knee more.', next:'Aim the front thigh toward parallel, knee over the ankle.'},
      {bad:R.filter(r=>!r.backBent).length, text:'Use the back leg.', next:'Lower the back knee toward the floor. Step a touch longer.'},
      {bad:R.filter(r=>!r.upright).length, text:'Keep your trunk tall.', next:'Stay upright, do not fold forward over the front leg.'}
    ]);
    return {
      head:`${N} lunge${N>1?'s':''} logged`,
      sub:'Front knee depth measured at the bottom of each rep.',
      stats:[['Reps counted',N],['Front knee bent well',`${good} of ${N}`],['Back leg lowered',`${R.filter(r=>r.backBent).length} of ${N}`]],
      focus: f?f.text:'Clean, controlled lunges.',
      next: f?f.next:'Add reps or slow the descent for more control.'
    };
  }
};

export const NETLUNGE={
  id:'netlunge', sport:'Badminton', label:'Net lunge', type:'rep', facing:'Side on',
  blurb:'Deep front knee, racket arm reaching to the net.',
  setup:'Stand side on, a couple of steps back, whole body in frame. Step forward into a lunge and stretch your racket arm out toward the net, then push back to recover.',
  unit:'lunges',
  gauge:{leftLabel:'Deep', rightLabel:'Standing', min:60, max:180, bandLow:80, bandHigh:115, read:m=>Math.min(m.kneeL ?? 180, m.kneeR ?? 180)},
  init:()=>({count:0, phase:'up', minFront:180, reached:false, maxLean:0, records:[]}),
  update(m,s){
    if(!m.bodyVisible || m.kneeL==null || m.kneeR==null) return WAIT('Step into frame');
    const front=Math.min(m.kneeL,m.kneeR);
    const reaching=(m.elbowR!=null && m.elbowR>=150 && m.nWrR.y>m.shoulderMidY) ||
                   (m.elbowL!=null && m.elbowL>=150 && m.nWrL.y>m.shoulderMidY);
    if(s.phase==='down'){ s.minFront=Math.min(s.minFront,front); s.reached=s.reached||reaching; s.maxLean=Math.max(s.maxLean,m.torsoLean); }
    let repDelta=0;
    if(s.phase==='up' && front<140){ s.phase='down'; s.minFront=front; s.reached=reaching; s.maxLean=m.torsoLean; }
    else if(s.phase==='down' && front>160){
      const depthGood=s.minFront>=75 && s.minFront<=120;
      const reached=s.reached;
      const steady=s.maxLean<=45;
      s.records.push({depthGood,reached,steady});
      s.count++; repDelta=1; s.phase='up'; s.minFront=180; s.reached=false;
    }
    let status,cue,phase;
    if(s.phase==='up'){ status='waiting'; cue='Lunge forward to the net'; phase='Ready'; }
    else{
      phase='Lunging';
      if(front>120){ status='adjust'; cue='Deeper into the lunge'; }
      else if(!reaching){ status='adjust'; cue='Reach the racket out'; }
      else{ status='good'; cue='Good — reach, then push back'; }
      if(m.torsoLean>45){ status='adjust'; cue='Chest up, stay balanced'; }
    }
    return {status,cue,phase,repDelta};
  },
  summarise(s){
    const N=s.count, R=s.records;
    if(!N) return blankReport('No net lunges counted yet.','Step forward into a deep lunge and stretch the racket arm out toward the net.');
    const good=R.filter(r=>r.depthGood).length;
    const f=focusFrom([
      {bad:R.filter(r=>!r.depthGood).length, text:'Lunge deeper.', next:'Bend the front knee toward a right angle, knee tracking over the ankle.'},
      {bad:R.filter(r=>!r.reached).length, text:'Reach further.', next:'Stretch the racket arm out in front to take the shuttle early at the net.'},
      {bad:R.filter(r=>!r.steady).length, text:'Stay balanced.', next:'Keep your chest up and weight back so you can push off to recover.'}
    ]);
    return {
      head:`${N} net lunge${N>1?'s':''} logged`,
      sub:'Front knee depth and reach measured at the lowest point of each rep.',
      stats:[['Reps counted',N],['Good depth',`${good} of ${N}`],['Reached out',`${R.filter(r=>r.reached).length} of ${N}`]],
      focus: f?f.text:'Sharp lunges with a long reach.',
      next: f?f.next:'Add reps, and push back to your ready base each time.'
    };
  }
};
