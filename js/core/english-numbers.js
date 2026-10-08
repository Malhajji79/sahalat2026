// Sahalat visible-number styling.
// This affects display only. It never changes stored values or calculations.
let englishNumberObserver=null;

function stopEnglishNumberStyling(){
  if(englishNumberObserver) englishNumberObserver.disconnect();
  englishNumberObserver=null;
}

function styleEnglishNumbers(root){
  if(!root) return;

  // Supports Latin, Arabic-Indic and Persian digits, including separators.
  const digit='0-9٠-٩۰-۹';
  const datePattern=`[${digit}]{1,4}[-\\/][A-Za-z]{3}[-\\/][${digit}]{2,4}|[${digit}]{1,2}[-\\/][A-Za-z]{3}[-\\/][${digit}]{2,4}|[${digit}]{1,2}[-\\/][${digit}]{1,2}[-\\/][${digit}]{2,4}`;
  const numberPattern=`[-−]?[${digit}]+(?:[,.٬٫][${digit}]+)*%?`;
  const tokenRe=new RegExp(`(${datePattern})|(${numberPattern})`,'g');

  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{
    acceptNode(node){
      const parent=node.parentElement;
      if(!parent || parent.closest('.sahalat-number,.sahalat-date,script,style,textarea,input,select,option,svg,[contenteditable]')){
        return NodeFilter.FILTER_REJECT;
      }
      return new RegExp(`[${digit}]`).test(node.nodeValue||'')
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  });

  const nodes=[];
  while(walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach(node=>{
    const text=node.nodeValue||'';
    tokenRe.lastIndex=0;
    let match, last=0, found=false;
    const fragment=document.createDocumentFragment();

    while((match=tokenRe.exec(text))!==null){
      found=true;
      fragment.appendChild(document.createTextNode(text.slice(last,match.index)));

      const span=document.createElement('span');
      if(match[1]){
        span.className='sahalat-date';
      }else{
        const raw=match[2]||'';
        span.className=/^[-−]/.test(raw)?'sahalat-number sahalat-negative':'sahalat-number';
      }
      span.textContent=match[0];
      fragment.appendChild(span);
      last=match.index+match[0].length;
    }

    if(found){
      fragment.appendChild(document.createTextNode(text.slice(last)));
      node.replaceWith(fragment);
    }
  });
}

function startEnglishNumberStyling(){
  stopEnglishNumberStyling();
  const root=document.getElementById('app');
  if(!root) return;

  styleEnglishNumbers(root);

  englishNumberObserver=new MutationObserver(()=>{
    const observer=englishNumberObserver;
    if(!observer) return;
    observer.disconnect();
    styleEnglishNumbers(root);
    observer.observe(root,{childList:true,subtree:true,characterData:true});
  });

  englishNumberObserver.observe(root,{childList:true,subtree:true,characterData:true});
}
