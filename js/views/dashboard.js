function analyticsView(){
  const users=analyticsUsers();
  const mode=state.analyticsMode||'year';
  const periods=analyticsPeriods(mode);
  const periodRows=periods.map(p=>{
    const loans=state.loans.filter(l=>['active','closed'].includes(l.dbStatus) && analyticsPeriodMatch(analyticsLoanDate(l),p,mode));
    return {label:p.label,count:loans.length,amount:loans.reduce((s,l)=>s+Number(l.amount||0),0)};
  });
  const maxPeriod=Math.max(1,...periodRows.map(x=>x.amount));
  const metrics=users.map(u=>({u,m:getUserAccountMetrics(u.username)}));
  const maxLoans=Math.max(1,...metrics.map(x=>x.m?.totalCount||0));
  const ranked=metrics.map(({u,m})=>({u,m,e:analyticsEffectiveness(u,m,maxLoans)})).sort((a,b)=>b.e.score-a.e.score);
  const maxLent=Math.max(1,...ranked.map(x=>x.m?.totalLent||0));
  const maxCollected=Math.max(1,...ranked.map(x=>x.m?.totalCollected||0));
  const totalLent=ranked.reduce((s,x)=>s+Number(x.m?.totalLent||0),0);
  const totalCollected=ranked.reduce((s,x)=>s+Number(x.m?.totalCollected||0),0);
  const avgScore=ranked.length?ranked.reduce((s,x)=>s+x.e.score,0)/ranked.length:0;
  return html`
  <div class="analytics-dashboard" dir="${state.lang==='en'?'ltr':'rtl'}">
  <div class="notice" style="background:#ecfdf5;color:#166534">${tx('لوحة مقارنة إدارية. التحليلات السنوية ونصف السنوية مبنية على حدود السنوات التحصيلية المعتمدة. مؤشر الفعالية يعطي الوزن الأكبر للتحصيل الفعلي مقارنة بالتحصيل المتوقع خلال آخر 6 أشهر.','Administrative comparison dashboard. Annual and semiannual analytics are based on the approved collection-year boundaries. The effectiveness score gives the greatest weight to actual collections versus expected collections over the last 6 months.')}</div>
  <div class="grid cards">
    ${metricCard(tx('إجمالي المبالغ المقرضة','Total Amount Lent'),wholeMoney(totalLent))}
    ${metricCard(tx('إجمالي المبالغ المحصلة','Total Amount Collected'),wholeMoney(totalCollected))}
    ${metricCard(tx('متوسط فعالية المستخدمين','Average User Effectiveness'),percentDisplay(avgScore,0))}
    ${metricCard(tx('عدد المستخدمين','Number of Users'),arNum(users.length))}
  </div>
  <div class="card" style="margin-top:18px">
    <div class="toolbar" style="margin:0"><h3 style="margin:0">${tx('نمو القروض حسب السنة التحصيلية','Loan Growth by Collection Year')}</h3><div class="actions"><button class="btn ${mode==='year'?'btn-primary':'btn-secondary'} analyticsMode" data-mode="year">${tx('سنوي','Annual')}</button><button class="btn ${mode==='half'?'btn-primary':'btn-secondary'} analyticsMode" data-mode="half">${tx('نصف سنوي','Semiannual')}</button></div></div>
    <div style="display:grid;gap:12px;margin-top:16px">${htmlJoin(periodRows.map((r,idx)=>{const prev=idx?periodRows[idx-1].amount:0;const growth=prev?((r.amount-prev)/prev*100):null;return html`<div style="display:grid;grid-template-columns:minmax(130px,.5fr) minmax(260px,2fr) minmax(120px,.5fr);gap:12px;align-items:center"><strong class="analytics-number">${r.label}</strong>${analyticsBar(r.amount,maxPeriod,`${wholeMoney(r.amount)} — ${arNum(r.count)} ${analyticsLoanCountLabel(r.count)}`)}<span style="font-weight:800;color:${growth===null?'#64748b':growth>=0?'#15803d':'#b91c1c'}">${growth===null?'—':(growth>=0?'+':'')+percentDisplay(growth,1)}</span></div>`}))}</div>
  </div>
  <div class="card" style="margin-top:18px;padding:0;overflow:hidden">
    <div style="padding:16px 18px;font-weight:800;font-size:18px;background:#ecfdf5;color:#166534">${tx('ترتيب فعالية المستخدمين','User Effectiveness Ranking')}</div>
    <div class="table-wrap"><table style="min-width:1200px"><thead><tr><th>${tx('الترتيب','Rank')}</th><th>${tx('المستخدم','User')}</th><th>${tx('مؤشر الفعالية','Effectiveness Score')}</th><th>${tx('التحصيل / المتوقع (6 أشهر)','Collected / Expected (6 Months)')}</th><th>${tx('نسبة إغلاق القروض','Loan Closure Rate')}</th><th>${tx('إجمالي المقرض','Total Lent')}</th><th>${tx('إجمالي المحصل','Total Collected')}</th><th>${tx('القروض النشطة','Active Loans')}</th></tr></thead><tbody>
    ${htmlJoin(ranked.map((x,i)=>html`<tr><td><strong class="analytics-number">${arNum(i+1)}</strong></td><td><strong>${x.u.username}</strong></td><td><strong style="font-size:18px;color:${x.e.score>=80?'#15803d':x.e.score>=60?'#a16207':'#b91c1c'}">${percentDisplay(x.e.score,0)}</strong></td><td>${percentDisplay(x.e.collectionRate,0)}<div class="small muted">${wholeMoney(x.e.actual6)} / ${wholeMoney(x.e.expected6)}</div></td><td>${percentDisplay(x.e.closeRate,0)}</td><td>${wholeMoney(x.m.totalLent)}${analyticsBar(x.m.totalLent,maxLent,'')}</td><td>${wholeMoney(x.m.totalCollected)}${analyticsBar(x.m.totalCollected,maxCollected,'')}</td><td class="analytics-number">${arNum(x.m.activeCount)}</td></tr>`))}
    </tbody></table></div>
  </div>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:18px;margin-top:18px">
    <div class="card">
      <h3 style="margin-top:0">${tx('توزيع المحفظة النشطة بين المستخدمين','Active Portfolio Distribution by User')}</h3>
      <div class="small muted" style="margin-bottom:12px">${tx('نسبة كل مستخدم من إجمالي مبالغ القروض النشطة.','Each user’s share of total active-loan amounts.')}</div>
      ${analyticsDonut(ranked.map(x=>({label:x.u.username,value:state.loans.filter(l=>l.assignedUserId===x.u.id&&l.dbStatus==='active').reduce((s,l)=>s+Number(l.amount||0),0)})).filter(x=>x.value>0),tx('المحفظة','Portfolio'))}
    </div>
    <div class="card">
      <h3 style="margin-top:0">${tx('مقارنة مؤشر الفعالية','Effectiveness Score Comparison')}</h3>
      <div class="small muted" style="margin-bottom:16px">${tx('مقارنة مرئية سريعة لأداء المستخدمين وفق التحصيل والإغلاق والنشاط.','Quick visual comparison of user performance based on collections, closures, and activity.')}</div>
      ${analyticsScoreBars(ranked)}
    </div>
  </div>
  <div class="card" style="margin-top:18px">
    <h3 style="margin-top:0">${tx('مؤشرات إدارية مقترحة','Suggested Management Indicators')}</h3>
    <div class="grid cards">
      ${metricCard(tx('أعلى فعالية','Highest Effectiveness'),ranked[0]?ranked[0].u.username+' — '+percentDisplay(ranked[0].e.score,0):'—')}
      ${metricCard(tx('أعلى تحصيل آخر 6 أشهر','Highest Collections – Last 6 Months'),ranked.length?[...ranked].sort((a,b)=>b.e.actual6-a.e.actual6)[0].u.username:'—')}
      ${metricCard(tx('أكبر محفظة نشطة','Largest Active Portfolio'),ranked.length?[...ranked].sort((a,b)=>b.m.activeLent-a.m.activeLent)[0].u.username:'—')}
      ${metricCard(tx('أعلى نسبة إغلاق','Highest Closure Rate'),ranked.length?[...ranked].sort((a,b)=>b.e.closeRate-a.e.closeRate)[0].u.username:'—')}
    </div>
  </div>
  </div>`;
}

;
function dashboardView(){
  const scopedLoans = visibleLoansForCurrentUser();

  const active=scopedLoans.filter(x=>x.status==='نشط').length;
  const pending=scopedLoans.filter(x=>x.status.includes('بانتظار')).length;

  const totalCount = scopedLoans.length;
  const earlyPending = state.currentUser.role==='أدمن' ? pendingEarlySettlementLoans() : [];

  if(state.currentUser.role!=='أدمن'){
    const m = getUserAccountMetrics(state.currentUser.username);
    const expectedCY=currentCollectionYearExpectedInterest(state.currentUser.id);
    const expectedCYLabel=expectedCY.collectionYear ? `${tx('السنة التحصيلية','Collection Year')} ${arNum(expectedCY.collectionYear)}` : tx('السنة التحصيلية الحالية','Current Collection Year');

    return html`
    
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

  return html`
  
  ${state.currentUser.role==='أدمن' && earlyPending.length ? html`
  <div class="notice" style="background:#fff4e5;color:#8a4b08;border:1px solid #f3c98b">
    ${tx('يوجد','There are')} <strong>${earlyPending.length}</strong> ${tx('طلب مراجعة فترة السداد بانتظار موافقة الأدمن.','repayment period review request(s) awaiting admin approval.')}
    <button class="btn btn-success" style="margin-right:12px" onclick="state.page='early-reviews';render()">${tx('مراجعة الطلبات','Review Requests')}</button>
  </div>`:''}
  <div class="grid cards admin-overview">
    <div class="card"><div class="muted">${tx('إجمالي القروض','Total Loans')}</div><div class="kpi">${totalCount}</div></div>
    <div class="card"><div class="muted">${tx('القروض النشطة','Active Loans')}</div><div class="kpi">${active}</div></div>
    <div class="card"><div class="muted">${tx('بانتظار الاعتماد','Awaiting Approval')}</div><div class="kpi">${pending}</div><button class="btn btn-primary" onclick="state.page='loans';render();document.getElementById('otherLoansSection')?.scrollIntoView({block:'start'});">${tx('عرض القروض بانتظار الاعتماد','View Loans Awaiting Approval')}</button></div>
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

