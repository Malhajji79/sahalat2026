function loginView(){
  return html`
  <div class="login-wrap sahalat-login-v2">
    <main class="login-stage">
      <section class="login-visual" aria-label="سهالات لإدارة القروض">
        <div class="login-visual-head">
          <div class="login-logo-mark" aria-hidden="true">◢</div>
          <div><h1 class="login-title">${t('appName')}</h1><p class="login-subtitle">${tx('إدارة القروض بسهولة وشفافية','Loan management, made simple')}</p></div>
        </div>
        <div class="login-benefits">
          <div><span>🛡</span><strong>${tx('أمان البيانات','Data security')}</strong><small>${tx('خصوصية عالية','Privacy first')}</small></div>
          <div><span>▤</span><strong>${tx('إدارة مرنة','Flexible management')}</strong><small>${tx('للقروض والأقساط','Loans & installments')}</small></div>
          <div><span>▥</span><strong>${tx('تقارير دقيقة','Clear reporting')}</strong><small>${tx('رؤية أوضح','Better visibility')}</small></div>
          <div><span>♙</span><strong>${tx('صلاحيات متعددة','User roles')}</strong><small>${tx('حسب الدور','Role-based')}</small></div>
        </div>
        <img class="login-hero-image" src="assets/login-finance-illustration.png" alt="${tx('لوحة تحليلات مالية وقروض','Financial dashboard illustration')}">
      </section>
      <section class="login-card">
        <div class="panel login-panel">
          <div class="login-language-switch">${languageSwitchButton()}</div>
          <div class="login-mobile-brand">${t('appName')}</div>
          <h2>${tx('مرحبًا بك في سهالات','Welcome to Sahalat')}</h2>
          <p class="login-welcome-sub">${tx('يرجى تسجيل الدخول للمتابعة','Please sign in to continue')}</p>
          <div class="field"><label for="loginUsername">${t('username')}</label>
            <select id="loginUsername" autocomplete="username" ${state.loginUsers.length?'':'disabled'}>
              <option value="">${state.loginUsers.length?t('chooseUser'):t('noUsers')}</option>
              ${htmlJoin(state.loginUsers.map(u=>html`<option value="${u.email}">${u.username}</option>`))}
            </select>
            ${!state.loginUsers.length?html`<div class="small" style="color:#b91c1c;margin-top:6px">${state.connectionError||t('loadUsersFailed')}</div><button class="btn btn-secondary" id="reloadLoginUsersBtn" type="button" style="margin-top:8px">${t('reloadUsers')}</button>`:''}
          </div>
          <div class="field"><label for="password">${t('password')}</label><input id="password" type="password" autocomplete="current-password" placeholder="${t('passwordPlaceholder')}"></div>
          <div class="actions login-submit"><button class="btn btn-primary" id="loginBtn">${t('login')} <span aria-hidden="true">←</span></button></div>
          <p id="loginError" class="small" style="color:#b91c1c;text-align:center;margin:12px 0 0">${state.connectionError||''}</p>
          <div class="login-secure-note"><span aria-hidden="true">🛡</span><div><strong>${tx('بياناتك محمية وآمنة','Your data is protected')}</strong><small>${tx('يتم استخدام اتصال آمن لحماية معلوماتك','A secure connection protects your information')}</small></div></div>
        </div>
      </section>
    </main>
  </div>`;
}


;
function shellView(){
  const navItems = [
    ['dashboard',t('dashboard')],
    ['loans',t('loans')],
    ...(state.currentUser.role==='أدمن' ? [] : [['new-loan',t('newLoan')]]),
    ['payments',t('payments')],
    ...(canAccessAnalytics() ? [['analytics',t('analytics')]] : []),
    ...(['أدمن','مدير مشروع'].includes(state.currentUser.role) ? [['collection-years',t('collectionYears')]] : []),
    ...(state.currentUser.role==='مستخدم' ? [] : [['accounts',t('accounts')]]),
    ['capital-movements',t('capitalMovements')],
    ...(state.currentUser.role==='مدير مشروع' ? [['annual-profit-report',tx('التصفية السنوية للأرباح','Annual Profit Report')]] : []),
    ...(state.currentUser.role==='مدير مشروع' ? [['annual-settlement',t('annualSettlement')]] : []),
    ...(state.currentUser.role==='أدمن' ? [['admin',t('administration')]] : [])
  ];
  return html`
  <div class="shell">
    <aside class="sidebar" id="sahalatSidebar">
      <button type="button" class="mobile-nav-close" id="mobileNavClose" aria-label="إغلاق القائمة">✕</button>
      <div class="brand">${t('appName')}</div>
      <div class="nav">
        ${htmlJoin(navItems.map(([id,label])=>html`<button data-page="${id}" class="${state.page===id?'active':''}">${label}</button>`))}
        <button id="logoutBtn">${t('logout')}</button>
      </div>
    </aside>
    <button type="button" class="mobile-nav-backdrop" id="mobileNavBackdrop" aria-label="إغلاق القائمة"></button>
    <main class="main">
      <div class="topbar">
        <button type="button" class="mobile-nav-trigger" id="mobileNavTrigger" aria-label="فتح القائمة" aria-expanded="false">☰ <span>القائمة</span></button>
        <h2 id="pageTitle"></h2>
        <div class="actions" style="margin:0">
          ${languageSwitchButton()}
          <button class="btn btn-secondary" id="refreshDbBtn">${t('refresh')}</button>
          <div class="user-badge">${state.currentUser.username} — ${state.currentUser.role}</div>
        </div>
      </div>
      <div id="content"></div>
    </main>
  </div>`;
}
