const screens=Object.fromEntries(['home','bank','records','settings','select','game'].map(id=>[id,document.getElementById(id)]));
const frame=document.getElementById('gameFrame');
// Play bundled English recordings; no browser speech engine is required.
let wordAudio=null, resumeWordAudio=false;
function wordSpeech(action,word='',rate=.9){
  try{
    if(action==='pause'){
      resumeWordAudio=Boolean(wordAudio&&!wordAudio.paused&&!wordAudio.ended);
      if(wordAudio)wordAudio.pause();return;
    }
    if(action==='resume'){
      if(wordAudio&&resumeWordAudio){resumeWordAudio=false;wordAudio.play().catch(()=>{});}return;
    }
    resumeWordAudio=false;
    if(wordAudio){wordAudio.pause();wordAudio.currentTime=0;}
    if(action==='cancel'||!readSave().set.voice)return;
    if(action!=='unlock'&&!/^[a-z]+$/.test(word))return;
    if(!wordAudio){wordAudio=new Audio();wordAudio.preload='auto';}
    wordAudio.src='assets/word-audio/'+(action==='unlock'?'_silence.wav':word+'.mp3');
    wordAudio.volume=action==='unlock'?0:1;
    wordAudio.playbackRate=rate/.9;
    wordAudio.play().catch(error=>console.warn('Word audio playback failed',error));
  }catch(error){console.warn('Word audio unavailable',error);}
}
const runnerMedia=Object.fromEntries([['lulu','lulu'],['sister','lumei']].map(([runner,id])=>[runner,{
  wrapper:document.getElementById(`${id}Motion`),
  video:document.getElementById(`${id}Video`),
  poster:document.getElementById(`${id}Poster`),
  fallback:document.getElementById(`${id}Fallback`)
}]));
const SAVE_KEY='escape-forgetting-v1';
const bankNames={academic:'四六级',core:'雅思',listen:'日常交流'};
const state={runner:'lulu',mode:'typing',scene:'0'};
window.addEventListener('message',event=>{
  if((location.protocol==='file:'||event.origin===location.origin)&&event.source===frame.contentWindow&&event.data?.type==='lulu-game-state')screens.game.classList.toggle('is-defeat',Boolean(event.data.defeat));
  if((location.protocol==='file:'||event.origin===location.origin)&&event.source===frame.contentWindow&&event.data?.type==='lulu-game-exit'){
    leaveGame(event.data.target==='home'?'home':'select');
  }
});
const sceneImages=['scene-street.png','scene-garden.png','scene-room.png','scene-snow.png'];
const defaultSave=()=>({bestDist:0,bestCh:0,bestWpm:0,runs:0,mastered:{},bank:'core',set:{listen:false,voice:true,music:.7,amb:.6,sfx:.8}});

function readSave(){
  try{
    const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');
    if(saved&&typeof saved==='object')return {...defaultSave(),...saved,set:{...defaultSave().set,...saved.set}};
  }catch{}
  return defaultSave();
}
function updateSave(change){
  const save=readSave();
  change(save);
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(save))}catch{}
  return save;
}
state.mode=readSave().set.listen?'listening':'typing';
// One persistent audio element spans all menu pages, so navigation never restarts the song.
const menuMusic=new Audio('assets/menu-theme.mp3');
menuMusic.id='menuMusic';menuMusic.loop=true;menuMusic.preload='auto';
menuMusic.setAttribute('aria-label','背景音乐：萌萌噜噜');document.body.append(menuMusic);
const gameMusic=new Audio('assets/game-theme.mp3');
gameMusic.id='gameMusic';gameMusic.loop=true;gameMusic.preload='metadata';
gameMusic.setAttribute('aria-label','游戏背景音乐：萌萌噜噜伴奏');document.body.append(gameMusic);
let musicPage='home';
function syncBackgroundMusic(){
  const saved=Number(readSave().set.music);
  const volume=Math.max(0,Math.min(1,Number.isFinite(saved)?saved:.7));
  menuMusic.volume=volume;gameMusic.volume=volume;
  const active=musicPage==='game'?gameMusic:menuMusic;
  const inactive=musicPage==='game'?menuMusic:gameMusic;inactive.pause();
  if(active.paused&&volume>0)active.play().catch(()=>{});
}
document.addEventListener('pointerdown',syncBackgroundMusic,{capture:true});
document.addEventListener('keydown',syncBackgroundMusic,{capture:true});
window.addEventListener('storage',event=>{if(event.key===SAVE_KEY)syncBackgroundMusic();});
const characterVoices=Object.fromEntries([['lulu','lulu'],['sister','lumei']].map(([key,name])=>{
  const audio=new Audio(`assets/${name}-voice.m4a`);
  audio.id=`${name}Voice`;audio.preload='auto';audio.loop=false;
  audio.setAttribute('aria-label',name==='lulu'?'噜噜点击语音':'噜妹点击语音');
  document.body.append(audio);return [key,audio];
}));
function playCharacterVoice(runner){
  // A fresh click restarts one voice; background music uses independent players.
  for(const audio of Object.values(characterVoices)){audio.pause();audio.currentTime=0;}
  const audio=characterVoices[runner];if(!audio)return;
  const saved=Number(readSave().set.sfx);
  audio.volume=Math.max(0,Math.min(1,Number.isFinite(saved)?saved:.8));
  audio.play().catch(()=>{});
}

function refreshBank(){
  const bank=readSave().bank;
  document.querySelectorAll('[data-bank]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.bank===bank)));
  document.getElementById('bankNote').textContent=`当前词库：${bankNames[bank]||'雅思'}`;
}
function refreshRecords(){
  const save=readSave();
  document.getElementById('recordDistance').textContent=`${Math.floor(Number(save.bestDist)||0)} m`;
  document.getElementById('recordChapter').textContent=String(Number(save.bestCh)||0);
  document.getElementById('recordMastered').textContent=String(Object.values(save.mastered||{}).filter(n=>Number(n)>=2).length);
  document.getElementById('recordRuns').textContent=String(Number(save.runs)||0);
}
function refreshSettings(){
  const settings=readSave().set;
  document.querySelectorAll('[data-setting]').forEach(button=>button.setAttribute('aria-pressed',String(settings[button.dataset.setting]=== (button.dataset.value==='true'))));
  document.querySelectorAll('[data-volume]').forEach(input=>{
    const value=Math.max(0,Math.min(1,Number(settings[input.dataset.volume])||0));
    input.value=String(value);
    input.style.setProperty('--fill',`${value*100}%`);
  });
}
function activateRunnerFallback({video,poster,fallback}){
  video.hidden=true;
  if(!fallback.getAttribute('src'))fallback.src=fallback.dataset.src;
  fallback.hidden=false;
  poster.hidden=fallback.complete&&fallback.naturalWidth>0;
}
function refreshRunnerMotion(){
  const visible=!screens.select.hidden&&screens.select.classList.contains('active');
  screens.select.classList.toggle('runner-animated',visible);
  Object.entries(runnerMedia).forEach(([runner,media])=>{
    const {wrapper,video,poster,fallback}=media;
    const selected=visible&&state.runner===runner;
    wrapper.hidden=!selected;
    if(selected){
      video.muted=true;video.defaultMuted=true;video.playsInline=true;
      poster.hidden=(!video.paused&&video.readyState>=2)||!fallback.hidden;
      if(video.error)activateRunnerFallback(media);
      else playSelectedRunner(media);
    }else video.pause();
  });
}
function playSelectedRunner(media){
  const {wrapper,video,poster}=media;
  if(wrapper.hidden||!screens.select.classList.contains('active')||media.playPending)return;
  video.hidden=false;
  media.playPending=true;
  video.play().then(()=>{if(!wrapper.hidden)poster.hidden=true;}).catch(error=>{
    if(wrapper.hidden)return;
    if(error.name==='AbortError')requestAnimationFrame(()=>playSelectedRunner(media));
    else activateRunnerFallback(media);
  }).finally(()=>{media.playPending=false;});
}
Object.values(runnerMedia).forEach(media=>{
  const {wrapper,video,poster,fallback}=media;
  video.addEventListener('error',()=>{
    if(!wrapper.hidden)activateRunnerFallback(media);
  });
  for(const event of ['loadeddata','canplay','pause'])video.addEventListener(event,()=>{
    if(!wrapper.hidden)requestAnimationFrame(()=>playSelectedRunner(media));
  });
  video.addEventListener('playing',()=>{if(!wrapper.hidden){poster.hidden=true;fallback.hidden=true;}});
  fallback.addEventListener('load',()=>{if(!fallback.hidden)poster.hidden=true});
});
let gameReturnTimer;
function leaveGame(target){
  wordSpeech('cancel');
  clearTimeout(gameReturnTimer);
  // Hide the game before navigation, so unloading cannot flash through the menu.
  screens.game.hidden=true;screens.game.classList.remove('active');
  show(target);
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(!screens.game.classList.contains('active')&&!gameBoot.pending){
      frame.src='about:blank';gameBoot.key='';gameBoot.ready=false;
    }
  }));
}
function show(name){
  const returning=screens.game.classList.contains('active')||(screens.game.hidden&&frame.getAttribute('src')?.includes('original-game'));
  clearTimeout(gameReturnTimer);
  if(name!=='select')for(const audio of Object.values(characterVoices))audio.pause();
  musicPage=name;syncBackgroundMusic();
  if(name!=='select'){
    clearTimeout(gameBoot.timer);gameBoot.pending=false;entryStatus.hidden=true;
    screens.select.querySelector('[data-action="play"]').disabled=false;
  }
  if(name==='bank')refreshBank();
  if(name==='records')refreshRecords();
  if(name==='settings')refreshSettings();
  if(name==='select'){
    document.getElementById('sceneComposition').hidden=false;
    screens.select.classList.add('custom-scene');
    state.mode=readSave().set.listen?'listening':'typing';
    document.querySelectorAll('[data-group="mode"]').forEach(button=>{
      const selected=button.dataset.value===state.mode;
      button.classList.toggle('selected',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
  }
  Object.entries(screens).forEach(([key,element])=>{
    if(key===name){element.hidden=false;requestAnimationFrame(()=>{element.classList.add('active');if(name==='select'){refreshRunnerMotion();if(!returning)prepareGame();}})}
    else{element.classList.remove('active');if(returning)element.hidden=true;else setTimeout(()=>{if(!element.classList.contains('active'))element.hidden=true},600)}
  });
  if(name==='select')refreshRunnerMotion();
  else{Object.values(runnerMedia).forEach(({wrapper,video})=>{wrapper.hidden=true;video.pause()})}
  history.replaceState(null,'',name==='home'?location.pathname:'#'+name);
}

const navOptions=[
  {action:'start',label:'开始出发',y:40.0},
  {action:'bank',label:'词库',y:49.2},
  {action:'records',label:'记录',y:58.2},
  {action:'settings',label:'设置',y:67.4}
];
document.querySelectorAll('.sub-menu').forEach(nav=>{
  nav.innerHTML=navOptions.map(option=>`<button style="--x:3.2;--y:${option.y};--w:22.5;--h:7.8" data-action="${option.action}" aria-label="${option.label}"></button>`).join('');
});

const gameBoot={key:'',id:0,url:'',ready:false,pending:false,timer:null,failed:false};
const entryStatus=document.createElement('div');entryStatus.className='game-entry-status';entryStatus.hidden=true;
entryStatus.setAttribute('role','status');entryStatus.setAttribute('aria-live','polite');screens.select.append(entryStatus);
function prepareGame(force=false){
  const key=`${state.scene}:${state.runner}`;
  if(!force&&gameBoot.key===key&&frame.getAttribute('src')===gameBoot.url)return;
  gameBoot.key=key;gameBoot.id++;gameBoot.ready=false;gameBoot.failed=false;
  gameBoot.url=`assets/original-game.html?luluScene=${state.scene}&runner=${state.runner}&boot=${gameBoot.id}&v=17balance`;
  frame.onload=null;frame.src=gameBoot.url;
}
function sendGameStart(){
  if(!gameBoot.pending||!gameBoot.ready)return;
  const save=updateSave(save=>{save.set.listen=state.mode==='listening'});
  frame.contentWindow.postMessage({type:'lulu-start',boot:String(gameBoot.id),scene:state.scene,bank:save.bank,settings:save.set},location.protocol==='file:'?'*':location.origin);
}
function startOriginal(){
  if(gameBoot.pending)return;
  wordSpeech('unlock');
  screens.game.classList.remove('is-defeat');
  gameBoot.pending=true;entryStatus.hidden=false;entryStatus.textContent='正在准备出发…';
  screens.select.querySelector('[data-action="play"]').disabled=true;
  prepareGame(gameBoot.failed);sendGameStart();
  gameBoot.timer=setTimeout(()=>{
    gameBoot.pending=false;gameBoot.failed=true;screens.select.querySelector('[data-action="play"]').disabled=false;
    entryStatus.textContent='加载较慢，请再点一次出发';
  },20000);
}
window.addEventListener('message',event=>{
  if((location.protocol!=='file:'&&event.origin!==location.origin)||event.source!==frame.contentWindow||String(event.data?.boot)!==String(gameBoot.id))return;
  if(event.data.type==='lulu-word-speech'){
    const {action,word,rate}=event.data;
    if(['speak','pause','resume','cancel'].includes(action))wordSpeech(action,String(word||''),rate===.8?.8:.9);
    return;
  }
  if(event.data.type==='lulu-ready'){gameBoot.ready=true;sendGameStart();}
  if(event.data.type==='lulu-started'&&gameBoot.pending){
    clearTimeout(gameBoot.timer);gameBoot.pending=false;entryStatus.hidden=true;
    screens.select.querySelector('[data-action="play"]').disabled=false;show('game');
  }
});

document.addEventListener('click',event=>{
  const bank=event.target.closest('[data-bank]');
  if(bank){
    updateSave(save=>{save.bank=bank.dataset.bank});
    refreshBank();
    const note=document.getElementById('bankNote');
    note.classList.add('visible');
    clearTimeout(note.hideTimer);
    note.hideTimer=setTimeout(()=>note.classList.remove('visible'),2200);
    return;
  }
  const setting=event.target.closest('[data-setting]');
  if(setting){
    updateSave(save=>{save.set[setting.dataset.setting]=setting.dataset.value==='true'});
    if(setting.dataset.setting==='listen')state.mode=setting.dataset.value==='true'?'listening':'typing';
    refreshSettings();
    return;
  }
  const choice=event.target.closest('[data-group]');
  if(choice){
    const group=choice.dataset.group;
    state[group]=choice.dataset.value;
    if(group==='runner'){refreshRunnerMotion();playCharacterVoice(state.runner);}
    if(group==='mode')updateSave(save=>{save.set.listen=state.mode==='listening'});
    if(group==='scene'){
      const composition=document.getElementById('sceneComposition');
      document.getElementById('sceneBackdrop').src=`assets/${sceneImages[Number(state.scene)]}`;
      composition.dataset.scene=state.scene;
      composition.hidden=false;
      screens.select.classList.add('custom-scene');
      screens.select.classList.toggle('snow-scene',state.scene==='3');
    }
    document.querySelectorAll(`[data-group="${group}"]`).forEach(element=>{
      const selected=element===choice;
      element.classList.toggle('selected',selected);
      element.setAttribute('aria-pressed',String(selected));
    });
    if(group==='runner'||group==='scene')prepareGame();
    return;
  }
  const action=event.target.closest('[data-action]')?.dataset.action;
  if(!action)return;
  if(action==='start')show('select');
  else if(action==='play')startOriginal();
  else if(action==='back')show('home');
  else show(action);
});

document.querySelectorAll('[data-volume]').forEach(input=>input.addEventListener('input',()=>{
  updateSave(save=>{save.set[input.dataset.volume]=Number(input.value)});
  input.style.setProperty('--fill',`${Number(input.value)*100}%`);
  if(input.dataset.volume==='music')syncBackgroundMusic();
}));
document.getElementById('homeButton').addEventListener('click',()=>leaveGame('home'));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&Object.values(screens).some(screen=>screen!==screens.home&&screen.classList.contains('active'))){
    if(screens.game.classList.contains('active'))leaveGame('home');
    else show('home');
  }
  if(event.key==='Enter'&&screens.select.classList.contains('active')&&document.activeElement.tagName!=='BUTTON')startOriginal();
});
if(location.hash&&screens[location.hash.slice(1)]&&location.hash!=='#game')show(location.hash.slice(1));
syncBackgroundMusic();

// Refit the same 1672:941 composition after tab/window restoration.
let layoutRestoreFrame=0;
function restoreGameLayout(){
  if(document.hidden)return;
  const width=document.documentElement.clientWidth||window.innerWidth;
  const height=document.documentElement.clientHeight||window.innerHeight;
  if(width<2||height<2)return;
  const app=document.getElementById('app'),ratio=1672/941;
  const fittedWidth=Math.min(width,height*ratio);
  app.style.width=fittedWidth+'px';app.style.height=(fittedWidth/ratio)+'px';
  cancelAnimationFrame(layoutRestoreFrame);
  layoutRestoreFrame=requestAnimationFrame(()=>{
    layoutRestoreFrame=requestAnimationFrame(()=>{
      layoutRestoreFrame=0;
      if(gameBoot.ready)frame.contentWindow.postMessage({type:'lulu-layout',boot:String(gameBoot.id)},location.protocol==='file:'?'*':location.origin);
    });
  });
}
for(const event of ['resize','focus','pageshow'])window.addEventListener(event,restoreGameLayout);
document.addEventListener('visibilitychange',restoreGameLayout);
window.visualViewport?.addEventListener('resize',restoreGameLayout);
restoreGameLayout();
