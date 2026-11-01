// Shared movement rules, also embedded in the local HTML for file:// support.
const ChaseMotion = (() => {
  const rules=Object.freeze({baseSpeed:4,cowSpeed:4.3,spellingCowSpeed:4.7,cowStartSpeed:3.8,initialGap:12,idleBrake:.8,errorBrake:.45,errorDuration:.65,errorFloor:2.8,sprintBonus:3,catchGap:.7});
  function reset(run){
    run.cowSlowLeft=0;
    run.cowSpeed=rules.cowSpeed;
    run.sprintDurationScale=1;
    run.errorStreak=0;run.lastErrorTime=-Infinity;
    run.v=rules.baseSpeed;run.bossX=run.x-rules.initialGap;
    run.chaseTime=0;run.wordDeadline=Infinity;run.wordBudget=5;run.brakeUntil=0;run.sprintLeft=0;
  }
  function startWord(run,length,listening=false){
    run.cowSpeed=listening?rules.cowSpeed:rules.spellingCowSpeed;
    run.sprintDurationScale=listening?1:.9;
    run.wordBudget=Math.max(5.5,Math.min(12,3.5+.6*Math.max(1,length)))+(listening?2.5:0);
    run.wordDeadline=run.chaseTime+run.wordBudget;
    run.errorStreak=0;
  }
  // Correct input restores the runner; only a whole word earns the sprint.
  function correctLetter(run){
    run.errorStreak=0;run.brakeUntil=run.chaseTime;
    run.v=Math.max(run.v,rules.baseSpeed);
    run.wordDeadline=Math.max(run.wordDeadline,run.chaseTime+1.5);
  }
  function wrongLetter(run){
    run.errorStreak=run.chaseTime-run.lastErrorTime<2?Math.min(4,run.errorStreak+1):1;
    run.lastErrorTime=run.chaseTime;
    run.brakeUntil=run.chaseTime+Math.min(1.4,rules.errorDuration+.25*(run.errorStreak-1));
    run.sprintLeft=0;
  }
  function correctWord(run){
    run.wordDeadline=Infinity;run.brakeUntil=0;
    // Length-aware reward lets an on-time long word offset the cow's advantage.
    run.sprintLeft=Math.max(.6,Math.min(1.1,((rules.cowSpeed-rules.baseSpeed)*run.wordBudget+.65)/rules.sprintBonus))*run.sprintDurationScale;
    run.v=rules.baseSpeed+rules.sprintBonus;
  }
  function step(run,seconds){
    let left=Math.max(0,seconds);
    while(left>1e-9){
      // Split on phase boundaries, so the result does not depend on frame rate.
      let duration=left;
      if(run.cowSlowLeft>1e-9)duration=Math.min(duration,run.cowSlowLeft);
      if(run.sprintLeft>1e-9){
        duration=Math.min(duration,run.sprintLeft);
        run.v=rules.baseSpeed+rules.sprintBonus;run.x+=run.v*duration;
        run.sprintLeft=Math.max(0,run.sprintLeft-duration);
        if(run.sprintLeft<1e-9){run.sprintLeft=0;run.v=rules.baseSpeed;}
      }else{
        const error=run.chaseTime<run.brakeUntil-1e-9;
        const idle=run.chaseTime>=run.wordDeadline-1e-9;
        if(error)duration=Math.min(duration,run.brakeUntil-run.chaseTime);
        else if(!idle)duration=Math.min(duration,run.wordDeadline-run.chaseTime);
        const settling=!error&&!idle&&run.v>rules.baseSpeed;
        const brake=error?rules.errorBrake+Math.min(.4,.13*(run.errorStreak-1)):idle?rules.idleBrake:settling?4:0;
        const floor=error?Math.min(run.v,rules.errorFloor):settling?rules.baseSpeed:0;
        const moving=brake>0?Math.max(0,Math.min(duration,(run.v-floor)/brake)):duration;
        run.x+=run.v*moving-.5*brake*moving*moving+floor*(duration-moving);
        run.v=Math.max(floor,run.v-brake*duration);
      }
      const cowSpeed=run.cowSlowLeft>1e-9?rules.cowStartSpeed:run.cowSpeed;
      run.bossX+=cowSpeed*duration;
      if(run.cowSlowLeft>1e-9)run.cowSlowLeft=Math.max(0,run.cowSlowLeft-duration);
      run.chaseTime+=duration;left-=duration;
    }
    return run.x-run.bossX<=rules.catchGap;
  }
  function countdown(run,seconds){run.v=rules.baseSpeed;run.x+=run.v*seconds;run.bossX+=rules.baseSpeed*seconds;}
  function createView(){return {player:44,cow:5,cameraX:0,startX:null,lastX:null,lastBoss:null};}
  function project(view,x,bossX,counting=false,seconds=1/60){
    if(view.startX===null)view.startX=x;
    // One camera tracks the actual runner position from the first frame.
    // There is no screen-space burst offset and therefore no return movement.
    view.cameraX=x-view.startX;
    view.player=44;
    view.cow=counting?5:Math.min(view.player,view.player-3.25*Math.max(0,x-bossX));
    view.lastX=x;view.lastBoss=bossX;return view;
  }
  function scrollOffset(cameraX,viewportWidth,periodPixels){
    const distance=Math.max(0,cameraX)*Math.max(0,viewportWidth)*.0325;
    return periodPixels>0?distance%periodPixels:0;
  }
  return {rules,reset,startWord,correctLetter,wrongLetter,correctWord,step,countdown,createView,project,scrollOffset};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ChaseMotion;
