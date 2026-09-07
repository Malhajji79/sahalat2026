function accountsView(){
  const selectable = state.currentUser.role==='مستخدم'
    ? state.users.filter(u=>u.id===state.currentUser.id)
    : [
        ...(state.currentUser.role==='أدمن' ? [{username:'admin',role:'أدمن',id:'admin-aggregate'}] : []),
        ...state.users.filter(u=>u.dbStatus==='active' && u.dbRole!=='admin')
      ];

  if(!state.accountUser || !selectable.some(u=>u.username===state.accountUser)){
    state.accountUser = selectable[0]?.username || state.currentUser.username;
  }

  const m = state.accountUser==='admin'
    ? getAdminAggregateMetrics()
    : getUserAccountMetrics(state.accountUser);
  if(!m) return `<div class="card">${tx('لا توجد بيانات لهذا المستخدم.','No data is available for this user.')}</div>`;
  const canEdit = ['أدمن','مدير مشروع'].includes(state.currentUser.role) && state.accountUser!=='admin';

  const analyticsPermissionPanel = (state.currentUser.role==='مدير مشروع' || state.currentUser.role==='مدير المشروع') ? `
    <div class="card" style="margin-bottom:18px;border:1px solid #bbf7d0;background:#f0fdf4">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
        <div>
          <div style="font-weight:900;font-size:clamp(1.05rem,1.3vw,1.3rem);color:#166534">${tx('صلاحية لوحة التحليلات للأدمن','Admin Analytics Access')}</div>
          <div class="small muted" style="margin-top:5px">
            ${tx('لوحة التحليلات متاحة لمدير المشروع افتراضيًا. يمكنك من هنا إدارة صلاحية عرضها لحساب الأدمن.','Analytics is available to the Project Manager by default. You can manage the Admin account’s access here.')}
          </div>
        </div>
        <button id="toggleAdminAnalyticsBtn"
          class="btn ${state.adminAnalyticsEnabled?'btn-danger':'btn-success'}"
          type="button">
          ${state.adminAnalyticsEnabled?tx('إخفاء التحليلات عن الأدمن','Remove Analytics from Admin'):tx('إضافة التحليلات لحساب الأدمن','Grant Analytics to Admin')}
        </button>
      </div>
      <div id="analyticsPermissionStatus" class="small" style="margin-top:8px"></div>
    </div>` : '';

  return `
    ${analyticsPermissionPanel}
    <div class="toolbar">
      <div class="field" style="min-width:280px;margin:0">
        <label>${tx('المستخدم','User')}</label>
        <select id="accountUserSelect">
          ${selectable.map(u=>`<option value="${u.username}" ${u.username===state.accountUser?'selected':''}>${u.username} — ${state.lang==='en'?({'أدمن':'Admin','مدير مشروع':'Project Manager','مدير المشروع':'Project Manager','مستخدم':'User'}[u.role]||u.role):u.role}</option>`).join('')}
        </select>
      </div>
      ${canEdit?`<button class="btn btn-primary" id="editAccountValues">${tx('تعديل رأس المال','Edit Capital')}</button>`:''}
    </div>

    <div class="notice">
      ${state.accountUser==='admin'
        ? tx('حساب الأدمن هنا يمثل المجاميع الإجمالية لجميع المستخدمين في سهالات.','The Admin account here represents the combined totals for all Sahalat users.')
        : tx('الحسابات هنا تعتمد فقط على القروض المعتمدة، والدفعات الفعلية، والتحويلات المسجلة.','These accounts are based only on approved loans, actual payments, and recorded transfers.')}
    </div>

    <div class="grid cards">
      ${metricCard(tx('المبلغ الأساسي','Base Capital'), wholeMoney(m.baseCapital))}
      ${metricCard(tx('مجموع المبلغ المقرض','Total Amount Lent'), wholeMoney(m.totalLent))}
      ${metricCard(tx('المبلغ المحصل','Amount Collected'), wholeMoney(m.totalCollected))}
      ${metricCard(tx('المبلغ في البنك بعد التحصيل','Bank Balance After Collections'), wholeMoney(m.bankAfterCollection))}
    </div>

    <div class="grid cards" style="margin-top:16px">
      ${metricCard(tx('حق المستخدم المستهدف','Target User Share'), wholeMoney(m.targetUserRight))}
      ${metricCard(tx('حق المالك المستهدف','Target Owner Share'), wholeMoney(m.targetOwnerRight))}
      ${metricCard(tx('حق المستخدم المحقق','Realized User Share'), wholeMoney(m.realizedUserRight))}
      ${metricCard(tx('حق المالك المحقق','Realized Owner Share'), wholeMoney(m.realizedOwnerRight))}
    </div>

    <div class="grid cards" style="margin-top:16px">
      ${metricCard(tx('المبلغ المحول للمستخدم','Transferred to User'), wholeMoney(m.transferredUser))}
      ${metricCard(tx('المبلغ المحول للمالك','Transferred to Owner'), wholeMoney(m.transferredOwner))}
      ${metricCard(tx('إجمالي المتبقي للتصفية النهائية','Total Remaining for Final Settlement'), wholeMoney(m.finalSettlementTotal),
      tx('مجموع المبالغ المقرضة + حق المستخدم المستهدف + حق المالك المستهدف − المحول للمستخدم − المحول للمالك − مجموع المبالغ المحصلة','Total amount lent + target user share + target owner share − transferred to user − transferred to owner − total amount collected'))}
      
    </div>

    <div class="grid cards" style="margin-top:16px">
      ${metricCard(tx('عدد القروض القائمة','Active Loans'), String(m.activeCount))}
      ${metricCard(tx('عدد القروض المنتهية','Closed Loans'), String(m.closedCount))}
      ${metricCard(tx('عدد القروض الكلي','Total Loans'), String(m.totalCount))}
      ${metricCard(tx('مجموع التحصيل الشهري','Total Monthly Collection'), wholeMoney(m.expectedMonthlyCollection))}
    </div>

    <div class="grid cards" style="margin-top:16px">
      ${metricCard(tx('المتبقي للتحصيل هذا الشهر','Remaining to Collect This Month'), wholeMoney(m.remainingThisMonth))}
      ${metricCard(tx('المقرض هذا الشهر','Lent This Month'), wholeMoney(m.lentThisMonth))}
      ${metricCard(tx('المحصل هذا الشهر','Collected This Month'), wholeMoney(m.collectedThisMonth))}
      ${metricCard(tx('المقرض هذه السنة','Lent This Year'), wholeMoney(m.lentThisYear))}
    </div>
  `;
}

