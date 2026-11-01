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

