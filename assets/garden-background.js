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

