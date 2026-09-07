let sahalatCalendarState=null;
function closeSahalatCalendar(){
  document.getElementById('sahalatCalendarPopup')?.remove();
  sahalatCalendarState=null;
}
function openCustomDatePicker(el){
  const wrap=el?.closest?.('.custom-date-input');
  const input=wrap?.querySelector?.('.date-native');
  if(!input) return;
  closeSahalatCalendar();
  const selected=parseISODateParts(input.value) || (()=>{const n=new Date();return {y:n.getFullYear(),m:n.getMonth()+1,d:n.getDate()};})();
  sahalatCalendarState={input,wrap,year:selected.y,month:selected.m};
  const popup=document.createElement('div');
  popup.id='sahalatCalendarPopup';
  popup.className='sahalat-calendar';
  document.body.appendChild(popup);
  renderSahalatCalendar();
  const r=wrap.getBoundingClientRect();
  const pr=popup.getBoundingClientRect();
  let left=Math.min(Math.max(12,r.left),window.innerWidth-pr.width-12);
  let top=r.bottom+6;
  if(top+pr.height>window.innerHeight-12) top=Math.max(12,r.top-pr.height-6);
  popup.style.left=`${left}px`;
  popup.style.top=`${top}px`;
  setTimeout(()=>document.addEventListener('pointerdown',sahalatCalendarOutside,true),0);
}
function sahalatCalendarOutside(e){
  const popup=document.getElementById('sahalatCalendarPopup');
  if(!popup) return document.removeEventListener('pointerdown',sahalatCalendarOutside,true);
  if(popup.contains(e.target) || sahalatCalendarState?.wrap?.contains(e.target)) return;
  closeSahalatCalendar();
  document.removeEventListener('pointerdown',sahalatCalendarOutside,true);
}
function shiftSahalatCalendarMonth(delta){
  if(!sahalatCalendarState) return;
  let m=sahalatCalendarState.month+delta, y=sahalatCalendarState.year;
  if(m<1){m=12;y--;} if(m>12){m=1;y++;}
  sahalatCalendarState.month=m; sahalatCalendarState.year=y;
  renderSahalatCalendar();
}
function selectSahalatCalendarDate(iso){
  const input=sahalatCalendarState?.input;
  if(!input) return;
  input.value=iso;
  input.dispatchEvent(new Event('change',{bubbles:true}));
  closeSahalatCalendar();
  document.removeEventListener('pointerdown',sahalatCalendarOutside,true);
}

;
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



;
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



;
function bindLogin(){
  const username=document.getElementById('loginUsername');
  const password=document.getElementById('password');
  const button=document.getElementById('loginBtn');
  const errorBox=document.getElementById('loginError');

  const reloadUsers=document.getElementById('reloadLoginUsersBtn');
  if(reloadUsers) reloadUsers.onclick=async()=>{
    reloadUsers.disabled=true;
    reloadUsers.textContent=t('loading');
    try{
      const {data,error}=await supabaseClient.rpc('get_login_users');
      if(error) throw error;
      state.loginUsers=(data||[]).filter(x=>x?.username&&x?.email).map(x=>({
        username:String(x.username),
        email:String(x.email)
      }));
      state.connectionError='';
      render();
    }catch(e){
      console.error(e);
      state.connectionError=t('loadUsersFailed')+' '+(e?.message||t('unknownError'));
      render();
    }
  };

  const submit=async()=>{
    const e=username.value;
    const p=password.value;

    errorBox.textContent='';
    if(!e || !p){
      errorBox.textContent=t('loginRequired');
      return;
    }

    button.disabled=true;
    button.textContent=t('loggingIn');

    try{
      const {data,error}=await supabaseClient.auth.signInWithPassword({
        email:e,
        password:p
      });

      if(error) throw error;
      if(!data?.user) throw new Error('تعذر قراءة حساب المستخدم بعد تسجيل الدخول.');

      state.authSession=data.session;
      state.authUser=data.user;
      await loadCurrentProfile(data.user);
      state.page='dashboard';
      state.connectionError='';
      render();
    }catch(err){
      console.error(err);
      await supabaseClient.auth.signOut().catch(()=>{});
      state.currentUser=null;
      state.authSession=null;
      state.authUser=null;
      errorBox.textContent=err?.message||t('loginFailed');
    }finally{
      button.disabled=false;
      button.textContent=t('login');
    }
  };

  button.onclick=submit;
  password.addEventListener('keydown',e=>{
    if(e.key==='Enter') submit();
  });
  username.addEventListener('keydown',e=>{
    if(e.key==='Enter') submit();
  });
}


;
function render(){
  const app = document.getElementById('app');
  if(state.isBootstrapping) return;
  applyLanguageDocument();
  stopEnglishNumberStyling();
  if(state.lang==='en') disableArabicDigitRendering();
  else disableEnglishSarStyling();
  if(!state.currentUser){
    stopDecisionNotifications();
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
    startEnglishNumberStyling();
    return;
  }
  app.innerHTML = shellView();
  bindNav();
  bindLanguageSwitch();
  renderPage();
  startDecisionNotifications();
  startEnglishNumberStyling();
  if(state.lang==='ar'){
    enableArabicDigitRendering();
    convertVisibleDigitsToArabic(app);
  }else{
    enableEnglishSarStyling();
    styleEnglishSarUnits(app);
  }
}


;
function renderPage(){
  const c = document.getElementById('content');
  const title = document.getElementById('pageTitle');
  if(state.page==='dashboard'){title.textContent=t('dashboard'); c.innerHTML=dashboardView();}
  if(state.page==='loans'){title.textContent=t('loans'); c.innerHTML=loansView(); bindLoanActions(); bindLoanFilters();}
  if(state.page==='loan-details'){title.textContent=t('loanDetails'); c.innerHTML=loanDetailsView(); bindLoanDetails();}
  if(state.page==='loan-approval'){title.textContent=t('loanApproval'); c.innerHTML=loanApprovalView(); bindLoanApproval();}
  if(state.page==='record-payment'){title.textContent=t('recordPayment'); c.innerHTML=recordPaymentView(); bindRecordPayment();}
  if(state.page==='payment-action'){title.textContent=state.paymentActionMode==='edit'?t('editPayment'):t('deletePayment'); c.innerHTML=paymentActionView(); bindPaymentAction();}
  if(state.page==='repayment-period-request'){title.textContent=t('repaymentPeriod'); c.innerHTML=repaymentPeriodRequestView(); bindRepaymentPeriodRequest();}
  if(state.page==='new-loan'){
    if(state.currentUser.role==='أدمن'){
      state.page='loans';
      title.textContent=t('loans');
      c.innerHTML=loansView();
      bindLoanActions();
    }else{
      title.textContent=t('addNewLoan');
      c.innerHTML=newLoanView();
      bindLoanForm();
    }
  }
  if(state.page==='payments'){title.textContent=t('payments'); c.innerHTML=paymentsView(); bindPaymentsFilters();}
  if(state.page==='analytics'){
    if(!canAccessAnalytics()){
      state.page='dashboard';
      title.textContent=t('dashboard');
      c.innerHTML=dashboardView();
    }else{
      title.textContent=t('analytics');
      c.innerHTML=analyticsView();
      bindAnalytics();
    }
  }
  if(state.page==='collection-years'){
    if(!['أدمن','مدير مشروع','مدير المشروع'].includes(state.currentUser.role)){
      state.page='dashboard';
      title.textContent=t('dashboard');
      c.innerHTML=dashboardView();
    }else{
      title.textContent=t('collectionYears');
      c.innerHTML=collectionYearsView();
      bindCollectionYears();
    }
  }
  if(state.page==='accounts'){
    if(state.currentUser.role==='مستخدم'){
      state.page='dashboard';
      title.textContent=t('dashboard');
      c.innerHTML=dashboardView();
    }else{
      title.textContent=t('accounts');
      c.innerHTML=accountsView();
      bindAccounts();
    }
  }
  if(state.page==='edit-account-values'){
    if(state.currentUser.role==='أدمن'){
      state.page='dashboard';
      title.textContent=t('dashboard');
      c.innerHTML=dashboardView();
    }else{
      title.textContent='تعديل رأس المال';
      c.innerHTML=capitalTransferView();
      bindCapitalTransfer();
    }
  }
  if(state.page==='early-reviews'){title.textContent=t('repaymentPeriod'); c.innerHTML=earlyReviewsView(); bindEarlyReviews();}
  if(state.page==='repayment-period-admin-review'){title.textContent=t('repaymentPeriod'); c.innerHTML=repaymentPeriodAdminReviewView(); bindRepaymentPeriodAdminReview();}
  if(state.page==='capital-movements'){title.textContent=t('capitalMovements'); c.innerHTML=capitalMovementsView(); bindCapitalMovements();}
  if(state.page==='annual-settlement'){
    if(state.currentUser.role!=='مدير مشروع'){
      state.page='dashboard';
      title.textContent=t('dashboard');
      c.innerHTML=dashboardView();
    }else{
      title.textContent=t('annualSettlement');
      c.innerHTML=annualSettlementView();
      bindAnnualSettlement();
    }
  }
  if(state.page==='admin'){
    if(state.currentUser.role!=='أدمن'){
      state.page='dashboard';
      title.textContent=t('dashboard');
      c.innerHTML=dashboardView();
    }else{
      title.textContent=t('administration');
      c.innerHTML=adminView();
      bindAdmin();
    }
  }
}


