let sarUnitObserver=null;
function disableEnglishSarStyling(){
  if(sarUnitObserver){
    sarUnitObserver.disconnect();
    sarUnitObserver=null;
  }
}
function enableEnglishSarStyling(){
  if(state.lang!=='en'){
    disableEnglishSarStyling();
    return;
  }
  if(sarUnitObserver) return;
  const app=document.getElementById('app');
  if(!app) return;
  styleEnglishSarUnits(app);
  sarUnitObserver=new MutationObserver(mutations=>{
    if(state.lang!=='en') return;
    mutations.forEach(m=>{
      if(m.type==='characterData'){
        const node=m.target;
        if(/\bSAR\b/.test(node.nodeValue||'')) styleEnglishSarUnits(node.parentElement);
      }else{
        m.addedNodes.forEach(node=>{
          if(node.nodeType===Node.TEXT_NODE){
            if(/\bSAR\b/.test(node.nodeValue||'')) styleEnglishSarUnits(node.parentElement);
          }else if(node.nodeType===Node.ELEMENT_NODE && !node.classList.contains('sar-unit')){
            styleEnglishSarUnits(node);
          }
        });
      }
    });
  });
  sarUnitObserver.observe(app,{subtree:true,childList:true,characterData:true});
}


