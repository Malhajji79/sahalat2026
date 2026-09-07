function bindAnalytics(){
  document.querySelectorAll('.analyticsMode').forEach(b=>b.onclick=()=>{state.analyticsMode=b.dataset.mode;render();});
}


