function dashboardView(){
  const scopedLoans = visibleLoansForCurrentUser();

  const active=scopedLoans.filter(x=>x.status==='نشط').length;
  const pending=scopedLoans.filter(x=>x.status.includes('بانتظار')).length;

  const total=scopedLoans
    .filter(x=>x.status==='نشط')
    .reduce((a,b)=>a+Number(b.amount||0),0);

  const totalPaid=scopedLoans
    .filter(x=>['نشط','مغلق'].includes(x.status))
    .reduce((a,b)=>a+Number(b.paid||0),0);

  const totalCount = scopedLoans.length;
  const earlyPending = state.currentUser.role==='أدمن' ? pendingEarlySettlementLoans() : [];

  if(state.currentUser.role!=='أدمن'){
    const m = getUserAccountMetrics(state.currentUser.username);
    const expectedCY=currentCollectionYearExpectedInterest(state.currentUser.id);
    const expectedCYLabel=expectedCY.collectionYear ? `${tx('السنة التحصيلية','Collection Year')} ${arNum(expectedCY.collectionYear)}` : tx('السنة التحصيلية الحالية','Current Collection Year');

    return `
    
    <div class="grid user-dashboard-layout" style="grid-template-columns:minmax(0,1.05fr) minmax(360px,.95fr);gap:20px;align-items:start">

      <div class="grid compact-metrics" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:10px">
        ${metricCard(tx('المبلغ الأساسي','Base Capital'), wholeMoney(m.baseCapital))}
        ${metricCard(tx('مجموع المبالغ المقرضة','Total Lent'), wholeMoney(m.totalLent))}
        ${metricCard(tx('مجموع المبالغ المحصلة','Total Collected'), wholeMoney(m.totalCollected))}
        ${metricCard(tx('المبلغ المتوفر في البنك','Available Bank Balance'), wholeMoney(m.bankAfterCollection))}
        ${metricCard(`${tx('الفائدة المتوقعة للمستخدم','Expected User Interest')} - ${expectedCYLabel}`, wholeMoney(expectedCY.userShare))}
        ${metricCard(`${tx('الفائدة المتوقعة للمالك','Expected Owner Interest')} - ${expectedCYLabel}`, wholeMoney(expectedCY.ownerShare))}
        ${metricCard(tx('المقرض خلال السنة','Lent This Year'), wholeMoney(m.lentThisYear))}
        ${metricCard(tx('المقرض خلال الشهر الحالي','Lent This Month'), wholeMoney(m.lentThisMonth))}
        ${metricCard(tx('المحصل خلال الشهر الحالي','Collected This Month'), wholeMoney(m.collectedThisMonth))}
        ${metricCard(tx('التحصيل الشهري المتوقع','Expected Monthly Collection'), wholeMoney(m.expectedMonthlyCollection))}
        ${metricCard(tx('المتبقي للتحصيل الشهر الحالي','Remaining This Month'), wholeMoney(m.remainingThisMonth))}
        ${metricCard(tx('عدد القروض المقرضة','Total Loans'), String(m.totalCount))}
        ${metricCard(tx('عدد القروض النشطة','Active Loans'), String(m.activeCount))}
        ${metricCard(tx('عدد القروض المنتهية','Closed Loans'), String(m.closedCount))}
        ${metricCard(tx('مجموع حق المستخدم المستهدف','Target User Share'), wholeMoney(m.targetUserRight))}
        ${metricCard(tx('مجموع المبلغ المحول للمستخدم','Transferred to User'), wholeMoney(m.transferredUser))}
        ${metricCard(tx('مجموع حق المالك المستهدف','Target Owner Share'), wholeMoney(m.targetOwnerRight))}
        ${metricCard(tx('مجموع المبلغ المحول للمالك','Transferred to Owner'), wholeMoney(m.transferredOwner))}
        
        <div class="card" style="grid-column:1/-1">
          <div class="small muted">
            ${tx('المبلغ المحول للمستخدم = مجموع تصفية الأرباح التي استلمها المستخدم وسلّمها المستخدم نفسه. والمبلغ المحول للمالك = مجموع تصفية الأرباح التي استلمها المالك وسلّمها هذا المستخدم.','Transferred to User = total settled profits received and handed over by the user. Transferred to Owner = total settled profits received by the owner and handed over by this user.')}
          </div>
        </div>
      </div>

      <div class="grid" style="gap:16px">
        <div class="card" style="padding:28px">
          <div class="muted">${tx('مجموع حق المالك المحقق','Total Realized Owner Share')}</div>
          <div class="kpi" style="font-size:36px">${wholeMoney(m.realizedOwnerRight)}</div>
        </div>

        <div class="card" style="padding:28px">
          <div class="muted">${tx('مجموع حق المستخدم المحقق','Total Realized User Share')}</div>
          <div class="kpi" style="font-size:36px">${wholeMoney(m.realizedUserRight)}</div>
        </div>

        <div class="card" style="padding:28px">
          <div class="muted">${tx('إجمالي المتبقي للتصفية النهائية','Total Remaining Final Settlement')}</div>
          <div class="kpi" style="font-size:36px">${wholeMoney(m.finalSettlementTotal)}</div>
        </div>
      </div>
    </div>

    <div class="card" style="margin-top:18px">
      <div class="actions">
        <button class="btn btn-primary" onclick="state.page='new-loan';render()">${tx('قرض جديد','New Loan')}</button>
        <button class="btn btn-secondary" onclick="state.page='loans';render()">${tx('عرض القروض','View Loans')}</button>
        <button class="btn btn-secondary" onclick="state.accountUser=state.currentUser.username;state.page='edit-account-values';render()">${tx('تعديل رأس المال','Edit Capital')}</button>
      </div>
    </div>`;
  }

  return `
  
  ${state.currentUser.role==='أدمن' && earlyPending.length ? `
  <div class="notice" style="background:#fff4e5;color:#8a4b08;border:1px solid #f3c98b">
    ${tx('يوجد','There are')} <strong>${earlyPending.length}</strong> ${tx('طلب مراجعة فترة السداد بانتظار موافقة الأدمن.','repayment period review request(s) awaiting admin approval.')}
    <button class="btn btn-success" style="margin-right:12px" onclick="state.page='early-reviews';render()">${tx('مراجعة الطلبات','Review Requests')}</button>
  </div>`:''}
  <div class="grid cards">
    <div class="card"><div class="muted">${tx('إجمالي القروض','Total Loans')}</div><div class="kpi">${totalCount}</div></div>
    <div class="card"><div class="muted">${tx('القروض النشطة','Active Loans')}</div><div class="kpi">${active}</div></div>
    <div class="card"><div class="muted">${tx('بانتظار الاعتماد','Awaiting Approval')}</div><div class="kpi">${pending}</div></div>
    <div class="card"><div class="muted">${tx('قيمة القروض النشطة','Active Loan Value')}</div><div class="kpi" style="font-size:22px">${wholeMoney(total)}</div></div>
  </div>
  <div class="grid cards" style="margin-top:16px">
    <div class="card"><div class="muted">${tx('إجمالي المحصل','Total Collected')}</div><div class="kpi" style="font-size:22px">${wholeMoney(totalPaid)}</div></div>
  </div>

  ${adminUsersFinancialSummaryTable()}

  <div class="card" style="margin-top:18px">
    <h3>${tx('اختصارات','Shortcuts')}</h3>
    <div class="actions">
      <button class="btn btn-secondary" onclick="state.page='loans';render()">${tx('عرض القروض','View Loans')}</button>
      <button class="btn btn-secondary" onclick="state.page='accounts';render()">${tx('حسابات المستخدمين','User Accounts')}</button>
    </div>
  </div>`;
}

