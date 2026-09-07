function render(){
  const app = document.getElementById('app');
  if(state.isBootstrapping) return;
  applyLanguageDocument();
  if(state.lang==='en') disableArabicDigitRendering();
  else disableEnglishSarStyling();
  if(!state.currentUser){
    app.innerHTML = loginView();
    bindLogin();
    bindLanguageSwitch();
    if(state.lang==='ar'){
      enableArabicDigitRendering();
      convertVisibleDigitsToArabic(app);
    }else{
      enableEnglishSarStyling();
      styleEnglishSarUnits(app);
    }
    return;
  }
  app.innerHTML = shellView();
  bindNav();
  bindLanguageSwitch();
  renderPage();
  if(state.lang==='ar'){
    enableArabicDigitRendering();
    convertVisibleDigitsToArabic(app);
  }else{
    enableEnglishSarStyling();
    styleEnglishSarUnits(app);
  }
}

