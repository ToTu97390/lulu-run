// Hidden/resumed windows need a redraw even when no resize event arrives.
function watchGameViewport(refresh){
  let pending=0;
  const restore=()=>{
    if(document.hidden)return;
    refresh();
    if(typeof requestAnimationFrame==='function'){
      if(pending&&typeof cancelAnimationFrame==='function')cancelAnimationFrame(pending);
      pending=requestAnimationFrame(()=>{pending=0;if(!document.hidden)refresh();});
    }
  };
  for(const event of ['resize','focus','pageshow'])window.addEventListener(event,restore);
  document.addEventListener?.('visibilitychange',restore);
}

// Snow-town loop shared by the game and the 12-second video export.
function createSnowPainter(makeCanvas,images){
  const tau=Math.PI*2,mod=(v,n)=>((v%n)+n)%n;
  const tiles=images.map(im=>{
    const w=im.naturalWidth||im.width,h=im.naturalHeight||im.height,overlap=Math.round(w*.035);
    const c=makeCanvas(w-overlap,h),t=c.getContext('2d');
    t.drawImage(im,overlap,0,w-2*overlap,h,0,0,w-2*overlap,h);
    for(let i=0;i<overlap;i++){
      const x=w-2*overlap+i;
      t.globalAlpha=1;t.drawImage(im,w-overlap+i,0,1,h,x,0,1,h);
      t.globalAlpha=i/(overlap-1);t.drawImage(im,i,0,1,h,x,0,1,h);
    }
    t.globalAlpha=1;return c;
  });
  function render(ctx,width,height,scrollPhase,detailPhase){
    const p=mod(scrollPhase,1),d=mod(detailPhase,1),a=d*tau;
    ctx.clearRect(0,0,width,height);ctx.fillStyle='#d5c6ec';ctx.fillRect(0,0,width,height);
    // A single map displacement locks the entire snowy town together.
    // No differential scrolling between sky, village, road and near snowbanks.
    const mapWidth=height*3,worldShift=p*mapWidth;
    for(let layer=0;layer<3;layer++){
      const tile=tiles[layer],period=mapWidth,offset=worldShift;
      for(let x=-offset;x<width;x+=period){
        ctx.drawImage(tile,x,layer===2?height*.12:0,period+.35,height);
        if(layer===1){
          // Lamp glows and chimney smoke are attached to village coordinates.
          for(const [u,v] of [[.06,.52],[.229,.52],[.434,.62],[.568,.58],[.799,.58],[.94,.59]]){
            const lx=x+(u-.035)/.965*period,ly=v*height,r=height*.027;
            const glow=ctx.createRadialGradient(lx,ly,0,lx,ly,r);
            glow.addColorStop(0,`rgba(255,222,148,${.10+.015*Math.sin(a*2+u*9)})`);glow.addColorStop(1,'rgba(255,220,160,0)');
            ctx.fillStyle=glow;ctx.fillRect(lx-r,ly-r,r*2,r*2);
          }
          for(const [u,v] of [[.085,.25],[.358,.335],[.95,.33]]){
            for(let j=0;j<4;j++){
              const f=mod(d*2+j/4+u,1),r=height*(.004+f*.008);
              const sx=x+(u-.035)/.965*period+Math.sin(a*2+j)*height*.004;
              const sy=height*(v-f*.065);
              ctx.save();ctx.globalAlpha=Math.sin(Math.PI*f)**2*.10;ctx.fillStyle='#fff2fc';ctx.shadowColor='#fff5ff';ctx.shadowBlur=r;
              ctx.beginPath();ctx.ellipse(sx,sy,r*1.3,r,0,0,tau);ctx.fill();ctx.restore();
            }
          }
        }
      }
    }
    // Soft periodic snow. Each flake fades before crossing its wrap boundary.
    for(let i=0;i<88;i++){
      const f=mod(d+(i*37%103)/103,1),depth=.35+(i%5)*.16;
      const alpha=Math.min(1,f*12,(1-f)*12)*(.22+depth*.33);
      const x=mod((i*.618033+f*.025)*width+Math.sin(a+i*1.7)*height*.012*depth,width);
      const y=(f*1.12-.06)*height,r=height*(.0009+(i%4)*.00045)*depth;
      ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#fff8fd';ctx.shadowColor='#fff1ff';ctx.shadowBlur=r*1.7;
      ctx.beginPath();ctx.arc(x,y,r,0,tau);ctx.fill();ctx.restore();
    }
    // Tiny snow-dust sparkles breathe gently, never changing the buildings.
    for(let i=0;i<12;i++){
      const x=width*((i*.273)%1),y=height*(.18+(i*.137%1)*.64),r=height*.0015;
      ctx.save();ctx.globalAlpha=Math.pow(Math.max(0,Math.sin(a*2+i)),6)*.35;
      ctx.fillStyle='#fff1dc';ctx.beginPath();ctx.arc(x,y,r,0,tau);ctx.fill();ctx.restore();
    }
  }
  return {render,duration:12};
}
function createSnowCamera(ChaseMotion){
  const element=document.createElement('canvas');element.className='game-environment';
  element.setAttribute('role','img');element.setAttribute('aria-label','雪夜暖梦动态雪乡背景');
  element.style.background='url("game-snow-poster.jpg") center / cover';
  const context=element.getContext('2d',{alpha:false});
  let painter=null,cameraX=0,natureTime=0,lastKey='';
  function render(nextX=cameraX,delta=0,speed=4){
    cameraX=nextX;if(window.innerWidth<2||window.innerHeight<2)return;if(speed>.02)natureTime+=Math.max(0,delta);
    if(!context||!painter)return;
    const ratio=Math.min(1.5,window.devicePixelRatio||1,1920/window.innerWidth,1080/window.innerHeight);
    const w=Math.max(1,Math.round(window.innerWidth*ratio)),h=Math.max(1,Math.round(window.innerHeight*ratio));
    const key=`${w}:${h}:${cameraX.toFixed(5)}:${natureTime.toFixed(5)}`;
    if(key===lastKey)return;lastKey=key;
    if(element.width!==w||element.height!==h){element.width=w;element.height=h;}
    painter.render(context,w,h,cameraX/48,natureTime/12);
    element.dataset.cameraX=cameraX.toFixed(4);element.dataset.detailTime=natureTime.toFixed(4);
  }
  Promise.all(['snow-far.png','snow-village-road.png','snow-foreground.png'].map(src=>new Promise((resolve,reject)=>{
    const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;
  }))).then(images=>{
    painter=createSnowPainter((w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},images);render();
  }).catch(()=>{element.setAttribute('aria-label','雪夜暖梦背景素材加载失败');});
  watchGameViewport(()=>{lastKey='';render();});
  return {element,render,reset(){cameraX=0;natureTime=0;lastKey='';render();}};
}
if(typeof module!=='undefined'&&module.exports)module.exports={createSnowPainter,createSnowCamera};

