function latinDigits(v){
  return String(v ?? '')
    .replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}
function arNum(v){
  const str=String(v ?? '');
  return state.lang==='en' ? latinDigits(str) : str.replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
}
function money(n){
  const formatted=new Intl.NumberFormat(state.lang==='en'?'en-US-u-nu-latn':'ar-SA-u-nu-arab',{maximumFractionDigits:2}).format(n||0);
  return state.lang==='en' ? `${latinDigits(formatted)} SAR` : formatted;
}
function whole(n){ return Math.floor(Number(n||0)); }
function wholeMoney(n){
  const formatted=new Intl.NumberFormat(state.lang==='en'?'en-US-u-nu-latn':'ar-SA-u-nu-arab',{maximumFractionDigits:0}).format(whole(n));
  return state.lang==='en' ? `${latinDigits(formatted)} SAR` : formatted;
}
function plainWholeNumber(n){
  const formatted=new Intl.NumberFormat(state.lang==='en'?'en-US-u-nu-latn':'ar-SA-u-nu-arab',{maximumFractionDigits:0}).format(whole(n));
  return state.lang==='en' ? latinDigits(formatted) : formatted;
}
function percentDisplay(n, digits=2){
  const v=Number(n||0).toFixed(digits)+'%';
  return state.lang==='en' ? latinDigits(v) : arNum(v);
}
function fractionPart(n){ return Math.max(0, Number(n||0) - whole(n)); }

function toArabicDigitsText(value){
  return String(value??'').replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

function convertVisibleDigitsToArabic(root=document){
  const target=root?.nodeType ? root : document;
  const walker=document.createTreeWalker(
    target,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node){
        const parent=node.parentElement;
        if(!parent) return NodeFilter.FILTER_REJECT;
        const tag=parent.tagName;
        if(['SCRIPT','STYLE','TEXTAREA','INPUT','SELECT','OPTION'].includes(tag)) return NodeFilter.FILTER_REJECT;
        if(!/[0-9]/.test(node.nodeValue||'')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  const nodes=[];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    const next=toArabicDigitsText(node.nodeValue);
    if(next!==node.nodeValue) node.nodeValue=next;
  });
}

function styleEnglishSarUnits(root=document.getElementById('app')){
  if(state.lang!=='en' || !root) return;
  const walker=document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node){
        const parent=node.parentElement;
        if(!parent) return NodeFilter.FILTER_REJECT;
        if(parent.closest('.sar-unit')) return NodeFilter.FILTER_REJECT;
        if(['SCRIPT','STYLE','TEXTAREA','INPUT','SELECT','OPTION'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return /\bSAR\b/.test(node.nodeValue||'') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );
  const nodes=[];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    const text=node.nodeValue||'';
    const parts=text.split(/(\bSAR\b)/g);
    if(parts.length<2) return;
    const frag=document.createDocumentFragment();
    parts.forEach(part=>{
      if(part==='SAR'){
        const span=document.createElement('span');
        span.className='sar-unit';
        span.textContent='SAR';
        frag.appendChild(span);
      }else if(part){
        frag.appendChild(document.createTextNode(part));
      }
    });
    node.replaceWith(frag);
  });
}
