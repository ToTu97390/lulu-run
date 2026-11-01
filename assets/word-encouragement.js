function createWordEncouragement(doc,random=Math.random){
  const phrases=['GREAT!','GOOD!','EXCELLENT!','PERFECT!','FANTASTIC!','AWESOME!','WELL DONE!','AMAZING!','NICE!','KEEP IT UP!'];
  const variants=['bounce','sparkle','burst','twirl'];
  let root=null,active=null,timer=null,lastPhrase='',lastVariant='';
  function clear(){
    if(timer!==null){clearTimeout(timer);timer=null;}
    active=null;
    if(root){root.replaceChildren();root.hidden=true;}
  }
  function pick(list,previous){
    const choices=list.filter(value=>value!==previous);
    return choices[Math.min(choices.length-1,Math.max(0,Math.floor(random()*choices.length)))];
  }
  function show(){
    clear();
    if(!root){
      root=doc.createElement('div');root.id='wordEncouragement';
      root.setAttribute('aria-hidden','true');doc.body.append(root);
    }
    const phrase=pick(phrases,lastPhrase),variant=pick(variants,lastVariant);
    lastPhrase=phrase;lastVariant=variant;
    const card=doc.createElement('div');card.className='word-encouragement encourage--'+variant;
    const text=doc.createElement('strong');text.className='encourage-text';text.textContent=phrase;card.append(text);
    for(let i=0;i<6;i++){
      const star=doc.createElement('span');star.className='encourage-star encourage-star-'+i;
      star.textContent=i%2?'✧':'✦';card.append(star);
    }
    active=card;root.hidden=false;root.replaceChildren(card);
    card.addEventListener('animationend',event=>{if(event.target===card&&active===card)clear();});
    timer=setTimeout(()=>{if(active===card)clear();},1300);
  }
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden)clear();});
  return {show,clear};
}
if(typeof module!=='undefined'&&module.exports)module.exports={createWordEncouragement};
