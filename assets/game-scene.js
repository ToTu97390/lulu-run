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

// Render the same panorama used to make the street movie, using world distance
// rather than an independent video clock. Native canvas also works under file://.
function createStreetCamera(ChaseMotion){
  const element=document.createElement('canvas');element.className='game-environment';
  element.setAttribute('role','img');element.setAttribute('aria-label','随奔跑速度滚动的暖街漫步街景');
  element.style.background='url("game-street-poster.jpg") center / cover';
  const context=element.getContext('2d',{alpha:false});
  const image=new Image();let tile=null,cameraX=0,lastKey='';
  function render(nextX=cameraX){
    cameraX=nextX;if(window.innerWidth<2||window.innerHeight<2)return;if(!context||!tile)return;
    const ratio=Math.min(1.5,window.devicePixelRatio||1);
    const width=Math.max(1,Math.round(window.innerWidth*ratio));
    const height=Math.max(1,Math.round(window.innerHeight*ratio));
    const period=tile.width*height/tile.height;
    const offset=ChaseMotion.scrollOffset(cameraX,width,period);
    const key=`${width}:${height}:${offset.toFixed(3)}`;
    if(key===lastKey)return;lastKey=key;
    if(element.width!==width||element.height!==height){element.width=width;element.height=height;}
    // Draw complete repeated tiles. No seeking, playback-rate clamp or restart.
    for(let left=-offset;left<width;left+=period)context.drawImage(tile,left,0,period,height);
    element.dataset.cameraX=cameraX.toFixed(4);element.dataset.scrollPixels=offset.toFixed(3);
  }
  image.onload=()=>{
    if(!context)return;
    const w=image.naturalWidth,h=image.naturalHeight,overlap=Math.round(180*h/1080);
    tile=document.createElement('canvas');tile.width=w-overlap;tile.height=h;
    const t=tile.getContext('2d');
    t.drawImage(image,overlap,0,w-2*overlap,h,0,0,w-2*overlap,h);
    // Match the original movie's seam. Draw strips instead of reading pixels,
    // which would be disallowed for some browsers' local-file image origins.
    for(let i=0;i<overlap;i++){
      const target=w-2*overlap+i;
      t.globalAlpha=1;t.drawImage(image,w-overlap+i,0,1,h,target,0,1,h);
      t.globalAlpha=i/Math.max(1,overlap-1);t.drawImage(image,i,0,1,h,target,0,1,h);
    }
    t.globalAlpha=1;render();
  };
  image.src='game-street-panorama.jpg';
  watchGameViewport(()=>{lastKey='';render();});
  return {element,render};
}

// Shared 10-second periodic garden renderer: used by the game and MP4 export.
function createGardenPainter(makeCanvas,images){
  const tau=Math.PI*2,mod=(v,n)=>((v%n)+n)%n;
  const tiles=images.map(image=>{
    const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;
    const overlap=Math.round(w*.045),tile=makeCanvas(w-overlap,h),ctx=tile.getContext('2d');
    ctx.drawImage(image,overlap,0,w-2*overlap,h,0,0,w-2*overlap,h);
    for(let i=0;i<overlap;i++){
      const x=w-2*overlap+i;
      ctx.globalAlpha=1;ctx.drawImage(image,w-overlap+i,0,1,h,x,0,1,h);
      ctx.globalAlpha=i/Math.max(1,overlap-1);ctx.drawImage(image,i,0,1,h,x,0,1,h);
    }
    ctx.globalAlpha=1;return tile;
  });
  function star(ctx,x,y,size,alpha){
    ctx.save();ctx.globalAlpha=alpha;ctx.strokeStyle='#fff9da';ctx.lineWidth=Math.max(1,size*.2);ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(x-size,y);ctx.lineTo(x+size,y);ctx.moveTo(x,y-size*.4);ctx.lineTo(x,y+size*.4);ctx.stroke();ctx.restore();
  }
  function flower(ctx,x,y,size,phase){
    ctx.save();ctx.translate(x,y);ctx.rotate(.13*Math.sin(phase));
    ctx.strokeStyle='#70a755';ctx.lineWidth=size*.16;ctx.beginPath();ctx.moveTo(0,size*1.7);ctx.quadraticCurveTo(size*.2,size*.5,0,0);ctx.stroke();
    ctx.fillStyle='#fff3db';for(let i=0;i<5;i++){ctx.save();ctx.rotate(i*tau/5);ctx.beginPath();ctx.ellipse(0,-size*.52,size*.35,size*.55,0,0,tau);ctx.fill();ctx.restore();}
    ctx.fillStyle='#ffc951';ctx.beginPath();ctx.arc(0,0,size*.31,0,tau);ctx.fill();ctx.restore();
  }
  function windmill(ctx,x,y,r,phase){
    ctx.save();ctx.translate(x,y);ctx.rotate(phase);ctx.lineCap='round';
    for(let i=0;i<3;i++){ctx.rotate(tau/3);ctx.strokeStyle='#e5d7b6';ctx.lineWidth=r*.17;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-r);ctx.stroke();ctx.strokeStyle='#fff8de';ctx.lineWidth=r*.27;ctx.beginPath();ctx.moveTo(0,-r*.4);ctx.lineTo(0,-r);ctx.stroke();}
    ctx.fillStyle='#f3c973';ctx.beginPath();ctx.arc(0,0,r*.15,0,tau);ctx.fill();ctx.restore();
  }
  function kite(ctx,x,y,size,phase){
    ctx.save();ctx.translate(x,y+Math.sin(phase)*size*.2);ctx.rotate(-.22+.045*Math.sin(phase));
    const p=[[0,-size],[size*.7,0],[0,size*.8],[-size*.7,0]],colors=['#ffd56c','#ffb5b4','#a8dfad','#b8dcf2'];
    for(let i=0;i<4;i++){ctx.fillStyle=colors[i];ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(...p[i]);ctx.lineTo(...p[(i+1)%4]);ctx.closePath();ctx.fill();}
    ctx.strokeStyle='#fff1cb';ctx.lineWidth=Math.max(1,size*.025);ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(0,size*.8);ctx.moveTo(-size*.7,0);ctx.lineTo(size*.7,0);ctx.stroke();
    ctx.strokeStyle='#fff6da';ctx.beginPath();ctx.moveTo(0,size*.8);ctx.bezierCurveTo(size*.8,size*1.5,size*.8+Math.sin(phase)*size*.5,size*2,size*2,size*2.6);ctx.stroke();
    for(let i=0;i<3;i++){ctx.strokeStyle=colors[i];ctx.lineWidth=size*.055;ctx.beginPath();ctx.moveTo(size*.15*i,size*.8);ctx.bezierCurveTo(size*.3,size*1.3,size*(1.2+.2*Math.sin(phase+i)),size*1.3,size*(1.6+i*.2),size*(1.8+i*.2));ctx.stroke();}
    ctx.restore();
  }
  function swing(ctx,x,y,size,phase){
    ctx.save();ctx.translate(x,y);ctx.rotate(.045*Math.sin(phase));
    ctx.strokeStyle='#ddbc8d';ctx.lineWidth=size*.025;ctx.lineCap='round';
    for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*size*.30,0);ctx.lineTo(side*size*.30,size);ctx.stroke();}
    ctx.fillStyle='#a3dca6';ctx.strokeStyle='#72ad83';ctx.lineWidth=size*.025;ctx.beginPath();ctx.roundRect(-size*.42,size*.92,size*.84,size*.16,size*.07);ctx.fill();ctx.stroke();ctx.restore();
  }
  function render(ctx,width,height,scrollPhase,detailPhase){
    const phase=mod(detailPhase,1),angle=phase*tau;
    ctx.clearRect(0,0,width,height);ctx.fillStyle='#9bdcf8';ctx.fillRect(0,0,width,height);
    const layouts=[{h:.8,y:0},{h:.9,y:0},{h:1,y:.08}];
    for(let layer=0;layer<3;layer++){
      const tile=tiles[layer],h=height*layouts[layer].h,y=height*layouts[layer].y;
      const period=tile.width*h/tile.height,offset=mod(scrollPhase,1)*period;
      for(let logicalLeft=-offset;logicalLeft<width;logicalLeft+=period){
        // Pixel-aligned overlapping bounds prevent hairline cracks between tiles.
        const left=Math.floor(logicalLeft),span=Math.ceil(logicalLeft+period)-left;
        if(layer===1){
          // Only the canopy bends; bridge, fence and other park furniture stay rigid.
          const limit=Math.round(tile.height*.32),strip=12;
          for(let sy=0;sy<limit;sy+=strip){const sh=Math.min(strip,limit-sy),sway=Math.sin(angle*2+sy*.015)*(1-sy/limit)*height*.0018;ctx.drawImage(tile,0,sy,tile.width,sh,left+sway,y+sy*h/tile.height,span,sh*h/tile.height);}
          ctx.drawImage(tile,0,limit,tile.width,tile.height-limit,left,y+limit*h/tile.height,span,h*(1-limit/tile.height));
        }else if(layer===2){
          const split=Math.round(tile.height*.88);ctx.drawImage(tile,0,0,tile.width,split,left,y,span,h*split/tile.height);
          const sway=Math.sin(angle*2)*height*.0014;ctx.drawImage(tile,0,split,tile.width,tile.height-split,left+sway,y+split*h/tile.height,span,h*(1-split/tile.height));
        }else ctx.drawImage(tile,left,y,span,h);
        if(layer===0){
          for(const [tx,ty] of [[.205,.576],[.245,.60],[.427,.535],[.578,.60],[.776,.58],[.814,.606]])windmill(ctx,left+(tx-.045)/.955*period,y+ty*h,h*.024,angle);
          kite(ctx,left+period*.54,y+h*.22,h*.041,angle);
        }
        if(layer===1){
          for(let n=0;n<19;n++){
            const tx=.34+(n*17%100)/100*.075,ty=.69+(n*23%100)/100*.055;
            const brightness=Math.pow(Math.max(0,Math.sin(angle*3+n*2.4)),5)*.65;
            star(ctx,left+period*tx,y+h*ty,h*(.0018+(n%3)*.0006),brightness);
          }
          swing(ctx,left+period*.7225,y+h*.615,h*.145,angle*2);
        }
        if(layer===2)for(let n=0;n<12;n++)flower(ctx,left+period*(n+.5)/12,y+h*.645,h*.006,angle*2+n);
      }
    }
    // Deterministic periodic petals: fade outside the visible route before wrap.
    for(let i=0;i<19;i++){
      const fall=mod(phase+(i*37%101)/101,1),alpha=Math.min(1,fall*8,(1-fall)*8)*.65;
      const x=mod((i*.237+fall*.14)*width+Math.sin(angle+i)*height*.018,width),y=fall*height;
      ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(angle+i);
      ctx.fillStyle=i%5===0?'#b5ce73':'#ffbccc';ctx.beginPath();ctx.ellipse(0,0,height*.0035,height*.0018,0,0,tau);ctx.fill();ctx.restore();
    }
  }
  return {render,duration:10};
}

function createGardenCamera(ChaseMotion){
  const element=document.createElement('canvas');element.className='game-environment';
  element.setAttribute('role','img');element.setAttribute('aria-label','花园拾趣动态公园背景');
  element.style.background='url("game-garden.png") center / cover';
  const context=element.getContext('2d',{alpha:false});
  let painter=null,cameraX=0,natureTime=0,lastKey='';
  function render(nextX=cameraX,delta=0,speed=4){
    cameraX=nextX;if(window.innerWidth<2||window.innerHeight<2)return;if(speed>.02)natureTime+=Math.max(0,delta);
    if(!painter||!context)return;
    const ratio=Math.min(1.5,window.devicePixelRatio||1,1920/window.innerWidth,1080/window.innerHeight),width=Math.round(window.innerWidth*ratio),height=Math.round(window.innerHeight*ratio);
    const key=`${width}:${height}:${cameraX.toFixed(5)}:${natureTime.toFixed(5)}`;
    if(key===lastKey)return;lastKey=key;
    if(element.width!==width||element.height!==height){element.width=width;element.height=height;}
    painter.render(context,width,height,cameraX/40,natureTime/10);
    element.dataset.cameraX=cameraX.toFixed(4);element.dataset.detailTime=natureTime.toFixed(4);
  }
  Promise.all(['garden-far.png','garden-middle.png','garden-foreground.png'].map(src=>new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;
  }))).then(images=>{
    painter=createGardenPainter((w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},images);render();
  }).catch(()=>{element.setAttribute('aria-label','花园拾趣背景素材加载失败');});
  watchGameViewport(()=>{lastKey='';render();});
  return {element,render,reset(){natureTime=0;cameraX=0;lastKey='';render();}};
}
if(typeof module!=='undefined'&&module.exports)module.exports={createGardenPainter,createGardenCamera};

// Deterministic 10-second periodic home scene, shared by runtime and MP4 export.
function createRoomPainter(makeCanvas,images){
  const tau=2*Math.PI,mod=(v,n)=>((v%n)+n)%n;
  // Background seam occupies empty wall. Transparent furniture has empty edges.
  const tiles=images.slice(0,3).map((input,n)=>{
    let im=input;
    if(n===0){
      // Repeat a window bay whose two edges are empty wall, not framed pictures.
      const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;
      const sx=Math.round(iw*.37),sw=Math.round(iw*.32),bay=makeCanvas(sw,ih),b=bay.getContext('2d');
      b.drawImage(im,sx,0,sw,ih,0,0,sw,ih);
      const repeated=makeCanvas(sw*3,ih),r=repeated.getContext('2d');
      for(let j=0;j<3;j++)r.drawImage(bay,j*sw,0);
      im=repeated;
    }
    if(n===1)return im;
    const w=im.naturalWidth||im.width,h=im.naturalHeight||im.height;
    const overlap=Math.round(w*(n===0?.004:.035)),c=makeCanvas(w-overlap,h),t=c.getContext('2d');
    t.drawImage(im,overlap,0,w-2*overlap,h,0,0,w-2*overlap,h);
    for(let i=0;i<overlap;i++){
      const x=w-2*overlap+i;
      t.globalAlpha=1;t.drawImage(im,w-overlap+i,0,1,h,x,0,1,h);
      t.globalAlpha=i/(overlap-1);t.drawImage(im,i,0,1,h,x,0,1,h);
    }
    t.globalAlpha=1;return c;
  });
  function curtain(ctx,x,y,w,h,a,side){
    // Each gauze fold shares the same hanging anchor; only its hem sways.
    const strips=16;
    for(let j=0;j<strips;j++){
      const u=j/strips,v=(j+1)/strips;
      const bend=Math.sin(a*2+side*.7)*w*.07;
      ctx.beginPath();ctx.moveTo(x+u*w,y);
      ctx.bezierCurveTo(x+u*w,y+h*.3,x+u*w+bend,y+h*.7,x+u*w+bend*1.3,y+h*(.98+.012*Math.sin(u*12)));
      ctx.lineTo(x+v*w+bend*1.3,y+h*(.98+.012*Math.sin(v*12)));
      ctx.bezierCurveTo(x+v*w+bend,y+h*.7,x+v*w,y+h*.3,x+v*w,y);
      ctx.closePath();ctx.fillStyle=`rgba(255,248,228,${.12+.23*(.5+.5*Math.cos(u*6*tau))})`;ctx.fill();
    }
  }
  function leaf(ctx,x,y,r,a){
    ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle='#b4cf6c';ctx.globalAlpha=.65;
    ctx.beginPath();ctx.ellipse(0,0,r*.5,r,0,0,tau);ctx.fill();ctx.restore();
  }
  function render(ctx,width,height,scrollPhase,detailPhase){
    const p=mod(scrollPhase,1),d=mod(detailPhase,1),a=d*tau;
    ctx.clearRect(0,0,width,height);ctx.fillStyle='#f7e4c9';ctx.fillRect(0,0,width,height);
    // One house, one world-space displacement. Windows, furniture and carpet
    // must never slide relative to one another. Each bay divides the map exactly.
    const bayWidth=height*2.2,mapWidth=bayWidth*3,worldShift=p*mapWidth;
    const periods=[bayWidth,mapWidth,bayWidth];
    for(let layer=0;layer<3;layer++){
      const tile=tiles[layer],period=periods[layer],offset=mod(worldShift,period);
      if(layer===1){
        const scenes=[tiles[1],images[3],images[4]],segment=period/3;
        for(let start=-offset;start<width;start+=period){
          for(let zone=0;zone<scenes.length;zone++){
            const im=scenes[zone],x=start+zone*segment;
            if(x+segment<0||x>width)continue;
            ctx.drawImage(im,x+segment*.025,height*.16,segment*.95,height*.73);
          }
        }
        continue;
      }
      for(let x=-offset;x<width;x+=period){
        const left=x,span=period+.35;
        if(layer===1)ctx.drawImage(tile,x+period*.035,0,period*.93,height*.9);
        else if(layer===2)ctx.drawImage(tile,left,height*.07,span,height);
        else ctx.drawImage(tile,left,0,span,height);
        if(layer===0){
          // Windows occupy the same coordinates as the far panorama.
          for(const wx of [.055,.375,.69]){
            curtain(ctx,x+period*wx,0,period*.045,height*.68,a,1);
            curtain(ctx,x+period*(wx+.185),0,period*.04,height*.68,a,-1);
            // Shift only tiny foliage patches inside the glass; frames stay rigid.
            ctx.save();ctx.beginPath();ctx.rect(x+period*(wx+.008),height*.06,period*.035,height*.15);ctx.clip();
            ctx.drawImage(tile,left+Math.sin(a*2)*height*.001,Math.cos(a)*height*.0005,span,height);ctx.restore();
          }
          ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.025+.007*Math.sin(a);
          ctx.fillStyle='#fff0bb';ctx.fillRect(left,0,span,height);ctx.restore();
        }
      }
    }
    // Dust motes fade before wrapping, with integer harmonic motion at endpoints.
    for(let i=0;i<28;i++){
      const f=mod(d+(i*37%101)/101,1),alpha=Math.sin(Math.PI*f)**2*.38;
      const x=mod((i*.618+f*.035)*width+Math.sin(a+i)*height*.012,width);
      const y=height*(.12+.7*(1-f));
      ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#fff9de';ctx.shadowColor='#fff6d0';ctx.shadowBlur=height*.005;
      ctx.beginPath();ctx.arc(x,y,height*(.0008+i%3*.0003),0,tau);ctx.fill();ctx.restore();
    }
    const glow=ctx.createLinearGradient(width*.15,0,width*.82,height);
    glow.addColorStop(0,'rgba(255,244,209,.055)');glow.addColorStop(.5,`rgba(255,232,170,${.018+.008*Math.sin(a)})`);glow.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=glow;ctx.fillRect(0,0,width,height);
  }
  return {render,duration:12};
}
function createRoomCamera(ChaseMotion){
  const element=document.createElement('canvas');element.className='game-environment';
  element.setAttribute('role','img');element.setAttribute('aria-label','暖屋时光动态居室背景');
  element.style.background='url("game-room-poster.jpg") center / cover';
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
    painter.render(context,w,h,cameraX/96,natureTime/12);
    element.dataset.cameraX=cameraX.toFixed(4);element.dataset.detailTime=natureTime.toFixed(4);
  }
  Promise.all(['room-far.png','room-middle.png','room-foreground.png','room-kitchen-dining.png','room-bath-laundry-balcony.png'].map(src=>new Promise((resolve,reject)=>{
    const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;
  }))).then(images=>{
    painter=createRoomPainter((w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;},images);render();
  }).catch(()=>{element.setAttribute('aria-label','暖屋时光背景素材加载失败');});
  watchGameViewport(()=>{lastKey='';render();});
  return {element,render,reset(){cameraX=0;natureTime=0;lastKey='';render();}};
}
if(typeof module!=='undefined'&&module.exports)module.exports={createRoomPainter,createRoomCamera};

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

// The artwork is a separate layer; the existing typing/chase rules remain in control.
export function createGameScene(ChaseMotion) {
  const query=new URLSearchParams(location.search);
  if(!query.has('luluScene')) return null;
  const index=Math.max(0,Math.min(3,Number(query.get('luluScene'))||0));
  const names=['暖街漫步','花园拾趣','暖屋时光','雪夜暖梦'];
  const images=['game-street-still.png','game-garden.png','game-room.png','game-snow.png'];
  const runner=['sister','lumei'].includes(query.get('runner'))?'lumei':'lulu';
  document.documentElement.classList.add('lulu-game');
  const layer=document.createElement('div'); layer.id='luluGameWorld';
  layer.setAttribute('aria-label',names[index]+'游戏场景');
  const streetCamera=index===0?createStreetCamera(ChaseMotion):null;
  const gardenCamera=index===1?createGardenCamera(ChaseMotion):null;
  const roomCamera=index===2?createRoomCamera(ChaseMotion):null;
  const snowCamera=index===3?createSnowCamera(ChaseMotion):null;
  const backdrop=streetCamera?streetCamera.element:gardenCamera?gardenCamera.element:roomCamera?roomCamera.element:snowCamera?snowCamera.element:document.createElement('img');backdrop.className='game-environment';
  if(!streetCamera&&!gardenCamera&&!roomCamera&&!snowCamera){backdrop.src=images[index];backdrop.alt=names[index];}
  const performer=document.createElement('video'); performer.className='game-performer';
  performer.src=runner+'-motion.webm?v=8'; performer.poster=runner+'-motion-poster.png';
  performer.loop=true;performer.muted=true;performer.playsInline=true;
  performer.setAttribute('aria-label',runner==='lulu'?'水豚噜噜':'噜妹');
  const cow=document.createElement('div');cow.className='game-cow';cow.setAttribute('aria-label','追赶者牛牛');
  cow.innerHTML='<img src="characters-clean.png" alt="">';
  const title=document.createElement('div');title.className='game-scene-name';title.textContent=names[index];
  const pauseButton=document.createElement('button');pauseButton.className='game-pause';pauseButton.textContent='Ⅱ 暂停';
  pauseButton.addEventListener('click',()=>document.getElementById('pauseBtn2').click());
  layer.append(backdrop,cow,performer,title,pauseButton);document.body.prepend(layer);
  let playing=false,sceneSpeed=4;
  let raceView=ChaseMotion.createView();
  const media=[performer];
  for(const video of media){
    video.muted=true;video.defaultMuted=true;video.preload='auto';
    video.addEventListener('canplay',()=>{if(playing&&sceneSpeed>.02)video.play().catch(()=>{});});
  }
  // Preserve the supplied victory artwork, with live results over its sample numbers.
  const defeat=document.getElementById('defeat');
  const result=document.createElement('div');result.className='cow-results';
  const labels={rDist:'本局跑步距离',rCh:'本局章节单词',rWpm:'本局打字速度',rAcc:'本局准确率'};
  for(const id of ['rDist','rCh','rWpm','rAcc','nearTxt','missed']){
    const element=document.getElementById(id);result.append(element);
    if(labels[id])element.setAttribute('aria-label',labels[id]);
  }
  const art=document.createElement('img');art.className='cow-victory-art';art.src='cow-win.png';
  art.alt='牛牛获胜！被牛牛追上了。小牛能有什么坏心思呢';
  defeat.append(art,result);
  const syncDefeat=()=>{
    const ended=!defeat.hidden;
    if(ended){for(const video of media)video.pause();playing=false;}
    parent.postMessage({type:'lulu-game-state',defeat:ended},location.protocol==='file:'?'*':location.origin);
  };
  new MutationObserver(syncDefeat).observe(defeat,{attributes:true,attributeFilter:['hidden']});
  syncDefeat();
  const observer=new MutationObserver(()=>{
    if(!document.getElementById('hud').hidden){
      document.getElementById('bossNameH').textContent='牛牛';
      document.getElementById('wHint').textContent='拼对单词向前奔跑 · 空格暂停 · TAB 重听';
    }
  });
  observer.observe(document.getElementById('hud'),{attributes:true,attributeFilter:['hidden']});
  return {
    resetRace(){raceView=ChaseMotion.createView();if(gardenCamera)gardenCamera.reset();if(roomCamera)roomCamera.reset();if(snowCamera)snowCamera.reset();},
    update(live,gap,mode,x=0,bossX=0,startX=0,count=0,speed=4,delta=1/60){
      const active=mode==='run'||mode==='caught'||mode==='clear'||mode==='defeat';
      layer.hidden=!active;
      const moving=active&&live&&mode!=='defeat';
      playing=moving;sceneSpeed=Math.max(0,speed);
      if(active&&live&&mode!=='defeat'){
        const view=ChaseMotion.project(raceView,x,bossX,count>0,delta);
        cow.style.left=view.cow+'%';performer.style.left=view.player+'%';
        if(streetCamera)streetCamera.render(view.cameraX);
        if(gardenCamera)gardenCamera.render(view.cameraX,delta,sceneSpeed);
        if(roomCamera)roomCamera.render(view.cameraX,delta,sceneSpeed);
        if(snowCamera)snowCamera.render(view.cameraX,delta,sceneSpeed);
      }
      const speedRatio=sceneSpeed/ChaseMotion.rules.baseSpeed;
      // Character cadence follows speed. The street position is drawn above
      // from the same camera distance, including exact pauses and stops.
      for(const video of media){
        video.playbackRate=video===performer?Math.max(.25,Math.min(1.8,speedRatio)):Math.max(.0625,Math.min(4,speedRatio));
        if(moving&&sceneSpeed>.02){if(video.paused)video.play().catch(()=>{});}
        else if(!video.paused)video.pause();
      }
      layer.classList.toggle('paused',!moving);
      pauseButton.textContent=moving?'Ⅱ 暂停':'▶ 继续';
    }
  };
}
