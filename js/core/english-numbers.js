// Wrap only visible numeric text; never change input values or stored data.
let englishNumberObserver=null;
function stopEnglishNumberStyling(){
  if(englishNumberObserver)englishNumberObserver.disconnect();
  englishNumberObserver=null;
}
function styleEnglishNumbers(root){
  if(state.lang!=='en'||!root)return;
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
    const parent=node.parentElement;
    if(!parent||parent.closest('.english-number,script,style,textarea,input,select,option,svg,[contenteditable]'))return NodeFilter.FILTER_REJECT;
    return /[0-9]/.test(node.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
  }});
  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    const text=node.nodeValue||'',fragment=document.createDocumentFragment();let last=0;
    for(const match of text.matchAll(/[0-9]+(?:[,.][0-9]+)*/g)){
      fragment.appendChild(document.createTextNode(text.slice(last,match.index)));
      const span=document.createElement('span');span.className='english-number';span.textContent=match[0];fragment.appendChild(span);last=match.index+match[0].length;
    }
    fragment.appendChild(document.createTextNode(text.slice(last)));node.replaceWith(fragment);
  });
}
function startEnglishNumberStyling(){
  stopEnglishNumberStyling();
  if(state.lang!=='en')return;
  const root=document.getElementById('app');if(!root)return;
  styleEnglishNumbers(root);
  englishNumberObserver=new MutationObserver(()=>{
    if(state.lang!=='en'){stopEnglishNumberStyling();return;}
    const observer=englishNumberObserver;if(!observer)return;
    observer.disconnect();styleEnglishNumbers(root);
    observer.observe(root,{childList:true,subtree:true,characterData:true});
  });
  englishNumberObserver.observe(root,{childList:true,subtree:true,characterData:true});
}
