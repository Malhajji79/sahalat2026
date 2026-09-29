// Style visible numeric text only; never change stored data or input values.
// All numbers are blue, negative numbers are red, and dates stay black.
let englishNumberObserver=null;

function stopEnglishNumberStyling(){
  if(englishNumberObserver)englishNumberObserver.disconnect();
  englishNumberObserver=null;
}

function styleEnglishNumbers(root){
  if(!root)return;
  const digit='0-9٠-٩۰-۹';
  const dateRe=new RegExp(`(?:[${digit}]{1,2})-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(?:[${digit}]{2,4})`,'gi');
  const tokenRe=new RegExp(`(?:[${digit}]{1,2})-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(?:[${digit}]{2,4})|[-−–]\s*[${digit}]+(?:[,.٬٫][${digit}]+)*|[${digit}]+(?:[,.٬٫][${digit}]+)*`,'gi');

  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
    const parent=node.parentElement;
    if(!parent||parent.closest('.sahalat-number,.sahalat-date-number,script,style,textarea,input,select,option,svg,[contenteditable]'))return NodeFilter.FILTER_REJECT;
    return new RegExp(`[${digit}]`).test(node.nodeValue||'')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT;
  }});

  const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    const value=node.nodeValue||'';
    const matches=[...value.matchAll(tokenRe)];
    if(!matches.length)return;
    const fragment=document.createDocumentFragment();
    let last=0;
    matches.forEach(match=>{
      fragment.appendChild(document.createTextNode(value.slice(last,match.index)));
      const span=document.createElement('span');
      const token=match[0];
      if(dateRe.test(token)){
        span.className='sahalat-date-number';
      }else{
        span.className=/^[-−–]/.test(token.trim())?'sahalat-number sahalat-negative-number':'sahalat-number';
      }
      dateRe.lastIndex=0;
      span.textContent=token;
      fragment.appendChild(span);
      last=match.index+token.length;
    });
    fragment.appendChild(document.createTextNode(value.slice(last)));
    node.replaceWith(fragment);
  });
}

function startEnglishNumberStyling(){
  stopEnglishNumberStyling();
  const root=document.getElementById('app');if(!root)return;
  styleEnglishNumbers(root);
  englishNumberObserver=new MutationObserver(()=>{
    const observer=englishNumberObserver;if(!observer)return;
    observer.disconnect();
    styleEnglishNumbers(root);
    observer.observe(root,{childList:true,subtree:true,characterData:true});
  });
  englishNumberObserver.observe(root,{childList:true,subtree:true,characterData:true});
}
