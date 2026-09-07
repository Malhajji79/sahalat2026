function shellView(){
  const navItems = [
    ['dashboard',t('dashboard')],
    ['loans',t('loans')],
    ...(state.currentUser.role==='أدمن' ? [] : [['new-loan',t('newLoan')]]),
    ['payments',t('payments')],
    ...(canAccessAnalytics() ? [['analytics',t('analytics')]] : []),
    ...(['أدمن','مدير مشروع','مدير المشروع'].includes(state.currentUser.role) ? [['collection-years',t('collectionYears')]] : []),
    ...(state.currentUser.role==='مستخدم' ? [] : [['accounts',t('accounts')]]),
    ['capital-movements',t('capitalMovements')],
    ...(state.currentUser.role==='مدير مشروع' ? [['annual-settlement',t('annualSettlement')]] : []),
    ...(state.currentUser.role==='أدمن' ? [['admin',t('administration')]] : [])
  ];
  return `
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">${t('appName')}</div>
      <div class="nav">
        ${navItems.map(([id,label])=>`<button data-page="${id}" class="${state.page===id?'active':''}">${label}</button>`).join('')}
        <button id="logoutBtn">${t('logout')}</button>
      </div>
    </aside>
    <main class="main">
      <div class="topbar">
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

