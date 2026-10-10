// Text/attribute encoding. Never use this for JavaScript, CSS or URL construction.
function esc(value){
  return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// Only templates authored in source code produce HTML fragments. Database strings
// are always encoded, including when they happen to contain valid HTML/entities.
const {html,htmlJoin}=(()=>{
  const fragments=new WeakMap();
  const make=value=>{
    const fragment=Object.freeze({toString:()=>value});
    fragments.set(fragment,value);
    return fragment;
  };
  const content=value=>value && fragments.has(value) ? fragments.get(value) : esc(value);
  return {
    html(strings,...values){
      if(!Object.isFrozen(strings)||!Object.isFrozen(strings.raw))throw new TypeError('Use html as a template tag');
      let result=strings[0];
      for(let i=0;i<values.length;i++)result+=content(values[i])+strings[i+1];
      return make(result);
    },
    htmlJoin(values){return make(values.map(content).join(''));}
  };
})();
