let arabicDigitObserver=null;
function disableArabicDigitRendering(){
  if(arabicDigitObserver){
    arabicDigitObserver.disconnect();
    arabicDigitObserver=null;
  }
}
function enableArabicDigitRendering(){
  if(state.lang!=='ar'){
    disableArabicDigitRendering();
    return;
  }
  if(arabicDigitObserver) return;
  const app=document.getElementById('app');
  if(!app) return;

  convertVisibleDigitsToArabic(app);

  arabicDigitObserver=new MutationObserver(mutations=>{
    // إذا تغيرت اللغة أثناء وجود المراقب فلا نلمس الأرقام الإنجليزية.
    if(state.lang!=='ar') return;
    mutations.forEach(m=>{
      if(m.type==='characterData'){
        const node=m.target;
        if(/[0-9]/.test(node.nodeValue||'')){
          const next=toArabicDigitsText(node.nodeValue);
          if(next!==node.nodeValue) node.nodeValue=next;
        }
      }else{
        m.addedNodes.forEach(node=>{
          if(node.nodeType===Node.TEXT_NODE){
            if(/[0-9]/.test(node.nodeValue||'')){
              node.nodeValue=toArabicDigitsText(node.nodeValue);
            }
          }else if(node.nodeType===Node.ELEMENT_NODE){
            convertVisibleDigitsToArabic(node);
          }
        });
      }
    });
  });

  arabicDigitObserver.observe(app,{
    subtree:true,
    childList:true,
    characterData:true
  });
}


