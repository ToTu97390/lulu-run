// Raster layers retain the existing cow's face; transforms are rigid, without mesh stretching.
const ns='http://www.w3.org/2000/svg';
const svg=document.createElementNS(ns,'svg');
svg.id='cowRunRig';svg.setAttribute('viewBox','0 0 1672 941');
svg.setAttribute('aria-label','牛牛原地循环奔跑');svg.setAttribute('role','img');
svg.innerHTML=`<defs>
 <image id="cowOriginal" href="assets/characters-clean.png" width="1672" height="941"/>
 <clipPath id="cowBody"><path d="M1137 503C1210 474 1376 483 1424 555C1461 625 1397 702 1302 711C1205 724 1100 691 1090 623C1080 565 1100 526 1137 503Z"/></clipPath>
 <clipPath id="cowBelly"><ellipse cx="1292" cy="604" rx="119" ry="94"/></clipPath>
 <clipPath id="cowHead"><path d="M1088 280H1480V505Q1450 566 1340 578Q1180 590 1090 531Z"/></clipPath>
 <clipPath id="cowLeftArm"><path d="M1001 430Q1071 398 1138 440L1156 490L1091 569H999Z"/></clipPath>
 <clipPath id="cowRightArm"><path d="M1390 540Q1440 558 1447 615Q1449 663 1377 683L1294 662L1288 608L1341 572Z"/></clipPath>
 <clipPath id="cowLeftLeg"><path d="M1107 608Q1185 583 1236 641L1261 704L1243 756H1106Z"/></clipPath>
 <clipPath id="cowRightLeg"><path d="M1268 658L1404 641L1383 716L1367 778H1235Z"/></clipPath>
 <clipPath id="cowEarLeft"><path d="M1104 297H1229V400H1104Z"/></clipPath>
 <clipPath id="cowEarRight"><path d="M1376 356H1490V446H1376Z"/></clipPath>
 <clipPath id="cowTail"><path d="M1398 478H1488V620H1398Z"/></clipPath>
 <clipPath id="cowHeadCore"><path d="M1215 280H1379V359L1424 413L1444 497Q1412 565 1338 578Q1192 590 1090 531L1088 409L1171 388Z"/></clipPath>
</defs>
<g id="cowBounce">
 <g data-part="tail"><use href="#cowOriginal" clip-path="url(#cowTail)"/></g>
 <g data-part="legRight"><use href="#cowOriginal" clip-path="url(#cowRightLeg)"/></g>
 <g data-part="armLeft"><use href="#cowOriginal" clip-path="url(#cowLeftArm)"/></g>
 <use href="#cowOriginal" clip-path="url(#cowBody)"/>
 <g clip-path="url(#cowBelly)"><svg x="1170" y="510" width="243" height="195" viewBox="1170 540 125 100" preserveAspectRatio="none"><use href="#cowOriginal"/></svg></g>
 <g data-part="legLeft"><use href="#cowOriginal" clip-path="url(#cowLeftLeg)"/></g>
 <g data-part="armRight"><use href="#cowOriginal" clip-path="url(#cowRightArm)"/></g>
 <g data-part="earLeft"><use href="#cowOriginal" clip-path="url(#cowEarLeft)"/></g>
 <g data-part="earRight"><use href="#cowOriginal" clip-path="url(#cowEarRight)"/></g>
 <use href="#cowOriginal" clip-path="url(#cowHeadCore)"/>
</g>`;
document.getElementById('sceneComposition').append(svg);
const parts=Object.fromEntries([...svg.querySelectorAll('[data-part]')].map(p=>[p.dataset.part,p]));
const pivot=(part,x,y,angle,dx=0,dy=0)=>parts[part].setAttribute('transform',`translate(${dx} ${dy}) translate(${x} ${y}) rotate(${angle}) translate(${-x} ${-y})`);
let phase=0,last=0;
function tick(time){
 const active=document.getElementById('select').classList.contains('active')&&!document.hidden;
 if(active){
   const dt=last?Math.min((time-last)/1000,.05):0;phase=(phase+dt*2*Math.PI/0.62)%(2*Math.PI);
   const a=Math.sin(phase),b=Math.cos(phase),hop=-2.8*Math.cos(phase*2);
   svg.querySelector('#cowBounce').setAttribute('transform',`translate(0 ${hop})`);
   pivot('legLeft',1175,626,a*17,0,b*4);
   pivot('legRight',1320,674,-a*17,0,-b*4);
   pivot('armLeft',1100,452,-a*12,0,b*2);
   pivot('armRight',1390,564,a*12,0,-b*2);
   pivot('earLeft',1210,369,b*2.1);
   pivot('earRight',1388,410,-b*2.1);
   pivot('tail',1420,565,b*5);
 }
 last=active?time:0;requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
