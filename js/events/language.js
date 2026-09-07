function toggleLanguage(){
  state.lang=state.lang==='ar'?'en':'ar';
  localStorage.setItem('sahalat_lang',state.lang);
  // مراقب تحويل الأرقام إلى العربية يجب أن يعمل في العربية فقط.
  // عند الانتقال للإنجليزية نوقفه فورًا حتى لا يعيد تحويل الأرقام بعد إعادة الرسم.
  if(state.lang==='en'){ disableArabicDigitRendering(); } else { disableEnglishSarStyling(); }
  applyLanguageDocument();
  render();
}
function bindLanguageSwitch(){
  document.querySelectorAll('[data-language-switch]').forEach(btn=>{
    btn.onclick=toggleLanguage;
  });
}

