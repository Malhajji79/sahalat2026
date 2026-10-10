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

  let loginPending=false;
  const submit=async()=>{
    if(loginPending) return;
    const e=username.value;
    const p=password.value;

    errorBox.textContent='';
    if(!e || !p){
      errorBox.textContent=t('loginRequired');
      return;
    }

    loginPending=true;
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
      button.textContent=state.lang==='en'?'Loading account…':'جاري تحميل الحساب…';
      await loadCurrentProfile(data.user);
      // Start/reset the 5-minute inactivity timer immediately after a successful login.
      startSahalatSessionSecurity(true);
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
      loginPending=false;
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
// Render failures display a safe recovery panel rather than a broken/blank page.
function render(){
  try{
    renderApp();
    setupTopTableScrollbars();
    if(!window.sahalatTableObserver){
      let pending=false;
      window.sahalatTableObserver=new MutationObserver(()=>{
        if(pending)return;
        pending=true;
        queueMicrotask(()=>{pending=false;setupTopTableScrollbars();});
      });
      window.sahalatTableObserver.observe(document.getElementById('app'),{childList:true,subtree:true});
    }
  }catch(error){
    console.error('Sahalat render failed:',error);
    for(const stop of [stopDecisionNotifications,stopEnglishNumberStyling,disableArabicDigitRendering,disableEnglishSarStyling,closeSahalatCalendar]){
      try{stop();}catch(cleanupError){console.error('Render cleanup failed:',cleanupError);}
    }
    const app=document.getElementById('app');
    if(!app)return;
    const english=state.lang==='en';
    const panel=document.createElement('section');
    panel.className='card';panel.setAttribute('role','alert');panel.dir=english?'ltr':'rtl';
    panel.style.margin='24px';
    const heading=document.createElement('h2');heading.tabIndex=-1;
    heading.textContent=english?'Unable to display this page':'تعذر عرض هذه الصفحة';
    const message=document.createElement('p');
    message.textContent=english?'Try displaying the page again or return to the home page.':'حاول عرض الصفحة مرة أخرى أو ارجع إلى الصفحة الرئيسية.';
    const retry=document.createElement('button');retry.type='button';retry.className='btn btn-primary';
    retry.textContent=english?'Try Again':'إعادة المحاولة';retry.onclick=()=>render();
    const home=document.createElement('button');home.type='button';home.className='btn btn-secondary';
    home.textContent=english?'Home':'الرئيسية';home.onclick=()=>{state.page='dashboard';render();};
    panel.append(heading,message,retry,home);app.replaceChildren(panel);heading.focus();
  }
}

function renderApp(){
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
  document.querySelector('.shell > .main')?.classList.toggle('loan-details-page',state.page==='loan-details');
  // Sticky offsets are refreshed after page content renders and whenever viewport size changes.

  if(state.page==='dashboard'){title.textContent=t('dashboard'); c.innerHTML=dashboardView();}
  if(state.page==='loans'){title.textContent=t('loans'); c.innerHTML=loansView(); bindLoanActions(); bindLoanFilters();}
  if(state.page==='loan-details'){title.textContent=t('loanDetails'); c.innerHTML=loanDetailsView(); bindLoanDetails();}
  requestAnimationFrame(updateLoanDetailsStickyLayout);
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
    if(!['أدمن','مدير مشروع'].includes(state.currentUser.role)){
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
  if(state.page==='annual-profit-report'){
    if(state.currentUser.role!=='مدير مشروع'){
      state.page='dashboard';title.textContent=t('dashboard');c.innerHTML=dashboardView();
    }else{
      title.textContent=tx('التصفية السنوية للأرباح','Annual Profit Report');
      c.innerHTML=annualProfitReportView();bindAnnualProfitReport();
    }
  }
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



// Synchronize a visible top scrollbar with each table's horizontal position.
function setupTopTableScrollbars(){
  document.querySelectorAll('.table-wrap').forEach(wrap=>{
    const table=wrap.querySelector('table');
    if(!table || wrap.dataset.scrollReady==='yes')return;
    wrap.dataset.scrollReady='yes';
    let section=wrap.parentElement;
    if(!section.classList.contains('top-scroll-table')){
      section=document.createElement('div');
      section.className='top-scroll-table';
      wrap.parentNode.insertBefore(section,wrap);
      section.appendChild(wrap);
    }
    let top=section.querySelector(':scope > .top-horizontal-scroll');
    if(!top){
      top=document.createElement('div');
      top.className='top-horizontal-scroll';
      top.setAttribute('role','region');
      top.setAttribute('aria-label',state.lang==='en'?'Horizontal table scrolling':'التمرير الأفقي للجدول');
      const spacer=document.createElement('div');
      spacer.className='top-scroll-spacer';
      top.appendChild(spacer);
      section.insertBefore(top,wrap);
    }
    // Pin the Action and Loan Number columns wherever these two exist.
    const heads=Array.from(table.querySelectorAll('thead tr:first-child th'));
    const keyText=el=>(el?.textContent||'').trim().toLowerCase();
    const actionIndex=heads.findIndex(th=>/^(إجراء|الإجراء|action|actions)$/.test(keyText(th)));
    const loanIndex=heads.findIndex(th=>/^(رقم القرض|loan no\.?|loan number)$/.test(keyText(th)));
    if(actionIndex>=0 && loanIndex>=0 && Math.abs(actionIndex-loanIndex)===1){
      table.classList.add('pinned-loan-columns');
      const rtl=getComputedStyle(table).direction==='rtl';
      const first=Math.min(actionIndex,loanIndex),second=Math.max(actionIndex,loanIndex);
      const applyPin=()=>{
        const cells=Array.from(table.querySelectorAll('tr'));
        const offset=heads[first]?.getBoundingClientRect().width||0;
        cells.forEach(tr=>{
          const a=tr.children[first],b=tr.children[second];
          if(a){a.classList.add('table-pin-first');a.style.setProperty('--table-pin-offset','0px');}
          if(b){b.classList.add('table-pin-second');b.style.setProperty('--table-pin-offset',offset+'px');}
        });
      };
      applyPin();
      if(typeof ResizeObserver!=='undefined')new ResizeObserver(applyPin).observe(heads[first]);
    }
    const spacer=top.querySelector('.top-scroll-spacer');
    let syncing=false;
    const syncWidth=()=>{
      spacer.style.width=Math.max(table.scrollWidth,wrap.clientWidth)+'px';
      top.style.display=table.scrollWidth>wrap.clientWidth+1?'block':'none';
      top.scrollLeft=wrap.scrollLeft;
    };
    top.addEventListener('scroll',()=>{if(syncing)return;syncing=true;wrap.scrollLeft=top.scrollLeft;syncing=false;},{passive:true});
    wrap.addEventListener('scroll',()=>{if(syncing)return;syncing=true;top.scrollLeft=wrap.scrollLeft;syncing=false;},{passive:true});
    if(typeof ResizeObserver!=='undefined'){
      const observer=new ResizeObserver(syncWidth);
      observer.observe(table);observer.observe(wrap);
    }
    syncWidth();
  });
}



// A single responsive offset source prevents overlap between both sticky toolbars.
function updateLoanDetailsStickyLayout(){
  const main=document.querySelector('.shell > .main');
  if(!main)return;
  const bar=main.querySelector(':scope > .topbar');
  const sidebar=document.querySelector('.shell > .sidebar');
  if(!bar)return;
  // The main title is sticky on every page; update the action bar offset for loan details.
  // On narrow screens the navigation remains sticky at the top of the viewport.
  const sideHeight=sidebar && getComputedStyle(sidebar).position==='sticky' ? Math.ceil(sidebar.getBoundingClientRect().height) : 0;
  main.style.setProperty('--loan-sticky-sidebar-height',sideHeight+'px');
  main.style.setProperty('--loan-details-topbar-height',Math.ceil(bar.getBoundingClientRect().height+8)+'px');
  main.classList.toggle('is-scrolled',window.scrollY>12);
}
window.addEventListener('scroll',()=>{
  const main=document.querySelector('.shell > .main');
  if(main)main.classList.toggle('is-scrolled',window.scrollY>12);
},{passive:true});
window.addEventListener('resize',updateLoanDetailsStickyLayout,{passive:true});

// Observe title height changes caused by language switching and responsive wrapping.
if (typeof ResizeObserver !== 'undefined') {
  const installStickyTitleObserver = () => {
    const titleBar=document.querySelector('.shell > .main > .topbar');
    if (!titleBar || titleBar.dataset.stickyTitleObserved==='1') return;
    titleBar.dataset.stickyTitleObserved='1';
    new ResizeObserver(()=>updateLoanDetailsStickyLayout()).observe(titleBar);
    updateLoanDetailsStickyLayout();
  };
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',installStickyTitleObserver);
  else installStickyTitleObserver();
}
