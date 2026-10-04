function analyticsView(){
  const model=ownerAnalyticsModel();
  if(!model.year)return html`<div class="card"><h3>${tx('أضف السنوات التحصيلية أولًا','Configure collection years first')}</h3><p>${tx('تحتاج المقارنة إلى تاريخ بداية ونهاية معتمد لكل سنة تحصيلية.','Comparison requires approved start and end dates for each collection year.')}</p></div>`;
  const {current:c,previous:p}=model;
  const date=d=>dateDisplay(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  const delta=(value,old)=>!p?tx('لا توجد سنة سابقة مسجلة','No preceding year recorded'):old===0?(value===0?tx('دون تغير','No change'):tx('لا تُحسب النسبة لأن الأساس صفر','Percentage unavailable: zero baseline')):`${value>old?'+':''}${percentDisplay((value-old)/Math.abs(old)*100,1)} ${tx('مقارنة بالسنة السابقة','vs preceding year')}`;
  const metric=(key,label,note)=>html`<button type="button" class="card oa-metric" data-analytics-detail="${key}" aria-controls="analyticsDetails"><span class="muted">${label}</span><strong>${wholeMoney(c[key])}</strong><span class="oa-change">${delta(c[key],p?.[key]||0)}</span><span class="small muted">${note}</span></button>`;
  const allLoans=state.loans.filter(l=>['active','closed'].includes(l.dbStatus));
  const userIds=[...new Set(allLoans.map(l=>String(l.assignedUserId||'')))];
  const userOptions=userIds.map(id=>({id,name:state.users.find(u=>String(u.id)===id)?.username||allLoans.find(l=>String(l.assignedUserId||'')===id)?.assignedUser||'—'}));
  const types=[...new Set(allLoans.map(l=>l.type).filter(Boolean))];
  const detailKey=state.analyticsDetail||'overdue';
  const detailLabels={collected:tx('التحصيل خلال الفترة','Collections in period'),due:tx('الاستحقاقات خلال الفترة','Amounts due in period'),covered:tx('تغطية استحقاقات الفترة','Period dues covered'),overdue:tx('المتأخرات عند نهاية الفترة','Overdue at period end'),outstanding:tx('الرصيد المتبقي عند نهاية الفترة','Outstanding at period end'),owner:tx('حق المالك المحقق خلال الفترة','Owner share realized in period')};
  const ageBucket=detailKey==='overdue'&&Number.isInteger(state.analyticsAging)?model.aging[state.analyticsAging]:null;
  const detailRows=c.rows.map(r=>ageBucket?{...r,overdue:r.schedule.filter(s=>{const days=ownerAnalyticsDays(s.due,model.end);return days>=ageBucket.min&&days<=ageBucket.max;}).reduce((s,d)=>s+d.unpaid,0)}:r).filter(r=>r[detailKey]>0.005).sort((a,b)=>b[detailKey]-a[detailKey]);
  const maxBar=Math.max(1,...model.buckets.flatMap(b=>[b.due,b.collected]));
  const maxPortfolio=Math.max(1,...model.users.map(u=>u.outstanding));
  const currentUsers=state.users.filter(u=>u.dbRole!=='admin'&&(!state.analyticsUser||String(u.id)===String(state.analyticsUser)));
  const nowMetrics=currentUsers.map(u=>getUserAccountMetrics(u.username)).filter(Boolean);
  const cash=nowMetrics.reduce((s,m)=>s+m.bankAfterCollection,0),ownerRealized=nowMetrics.reduce((s,m)=>s+m.realizedOwnerRight,0),ownerTransferred=nowMetrics.reduce((s,m)=>s+m.transferredOwner,0);
  const issues=[...c.issues,...(p?.issues||[])];
  return html`<div class="analytics-dashboard oa-dashboard">
    <section class="card oa-heading"><div><div class="oa-eyebrow">${tx('نظرة المالك','OWNER OVERVIEW')}</div><h2>${tx('أداء المحفظة والتحصيل','Portfolio & Collection Performance')}</h2><p class="muted">${tx('قارن السنوات، راقب الاستحقاقات، وافتح تفاصيل الأرقام.','Compare years, monitor dues, and inspect the underlying loans.')}</p></div><span class="small muted">${tx('وقت العرض','Viewed at')}: ${date(new Date())}</span></section>
    <section class="card oa-filters" aria-label="${tx('فلاتر التحليلات','Analytics filters')}">
      <div class="field"><label for="analyticsYear">${tx('السنة التحصيلية','Collection year')}</label><select id="analyticsYear">${htmlJoin(model.years.map(y=>html`<option value="${y.year}" ${String(y.year)===String(model.year.year)?'selected':''}>${arNum(y.year)}</option>`))}</select></div>
      <div class="field"><label for="analyticsCompare">${tx('طريقة المقارنة','Comparison')}</label><select id="analyticsCompare"><option value="matched" ${state.analyticsCompare!=='full'?'selected':''}>${tx('نفس المدة المنقضية','Same elapsed period')}</option><option value="full" ${state.analyticsCompare==='full'?'selected':''}>${tx('السنة السابقة كاملة','Full preceding year')}</option></select></div>
      <div class="field"><label for="analyticsUser">${tx('المستخدم','User')}</label><select id="analyticsUser"><option value="">${tx('جميع المستخدمين','All users')}</option>${htmlJoin(userOptions.map(u=>html`<option value="${u.id}" ${String(state.analyticsUser||'')===u.id?'selected':''}>${u.name}</option>`))}</select></div>
      <div class="field"><label for="analyticsType">${tx('نوع القرض','Loan type')}</label><select id="analyticsType"><option value="">${tx('جميع الأنواع','All types')}</option>${htmlJoin(types.map(type=>html`<option value="${type}" ${state.analyticsType===type?'selected':''}>${displayLoanType(type)}</option>`))}</select></div>
    </section>
    <div class="oa-period"><strong>${tx('الفترة المختارة','Selected period')}: ${date(model.start)} — ${model.days?date(model.end):tx('لم تبدأ بعد','Not started')}</strong><span>${model.previous?html`${tx('المقارنة مع','Compared with')} ${arNum(model.previousYear.year)}: ${date(model.previousYear.start)} — ${model.days?date(model.previousEnd):'—'}`:tx('لا توجد سنة تحصيلية أقدم للمقارنة.','No earlier collection year available.')}</span></div>
    ${issues.length?html`<div class="oa-warning" role="status">${tx('تحتاج بعض البيانات إلى مراجعة؛ المؤشرات المعتمدة عليها تقديرية.','Some records need review; affected indicators are estimates.')} ${tx('عدد القروض المتأثرة في المقارنة','Affected loans in comparison')}: ${arNum(new Set(issues.map(i=>i.loan.dbId||i.loan.id)).size)}. <a href="#analyticsQuality">${tx('عرض الملاحظات','View notes')}</a></div>`:''}
    <section class="oa-kpis">
      ${metric('collected',tx('المحصل خلال الفترة','Collected in period'),tx('جميع الدفعات المؤرخة داخل الفترة','All dated payments within the period'))}
      ${metric('due',tx('المستحق حتى نهاية الفترة','Due by period end'),tx('أقساط الفترة وفق مواعيدها الفعلية','Period installments at their scheduled dates'))}
      ${metric('covered',tx('المغطى من استحقاقات الفترة','Period dues covered'),c.due?`${percentDisplay(c.covered/c.due*100,1)} — ${tx('يشمل السداد المقدم','Includes prepayments')}`:tx('لا توجد استحقاقات','No dues'))}
      ${metric('overdue',tx('المتأخرات عند نهاية الفترة','Overdue at period end'),`${arNum(c.overdueCount)} ${tx('قرض — تشمل متأخرات سنوات سابقة','loans — includes earlier-year arrears')}`)}
      ${metric('outstanding',tx('الرصيد المتبقي للتحصيل','Outstanding balance'),tx('يشمل أصل الدين والأرباح عند نهاية الفترة','Principal and profit at period end'))}
      ${metric('owner',tx('حق المالك المحقق خلال الفترة','Owner share realized in period'),tx('قبل خصم تحويلات التصفية','Before settlement transfers'))}
    </section>
    <section class="card"><div class="oa-section-title"><h3>${tx('المقارنة السنوية','Year comparison')}</h3><span class="small muted">${tx('التغير ليس حكمًا على الأداء؛ انخفاض المتأخرات أفضل.','Change is not a performance rating; lower arrears is better.')}</span></div><div class="table-wrap"><table><thead><tr><th>${tx('المؤشر','Metric')}</th><th>${arNum(model.year.year)}</th><th>${model.previous?arNum(model.previousYear.year):'—'}</th><th>${tx('الفرق','Difference')}</th></tr></thead><tbody>${htmlJoin([
      ['lent',tx('الإقراض الجديد','New lending')],['collected',tx('التحصيل','Collections')],['due',tx('الاستحقاقات','Dues')],['overdue',tx('المتأخرات','Overdue')],['outstanding',tx('الرصيد المتبقي','Outstanding')],['owner',tx('حق المالك المحقق','Realized owner share')]
    ].map(([key,label])=>html`<tr><td>${label}</td><td>${wholeMoney(c[key])}</td><td>${p?wholeMoney(p[key]):'—'}</td><td>${p?wholeMoney(c[key]-p[key]):'—'}</td></tr>`))}<tr><td>${tx('نسبة السداد في الموعد','On-time coverage')}</td><td>${c.rate===null?'—':percentDisplay(c.rate,1)}</td><td>${!p||p.rate===null?'—':percentDisplay(p.rate,1)}</td><td>${p&&p.rate!==null&&c.rate!==null?`${arNum((c.rate-p.rate).toFixed(1))} ${tx('نقطة مئوية','percentage points')}`:'—'}</td></tr></tbody></table></div></section>
    <div class="oa-two-columns">
      <section class="card"><h3>${tx('الاستحقاقات والتحصيل عبر الفترة','Dues and collections over time')}</h3><p class="small muted">${tx('أزرق: مستحق حسب يوم 5. أخضر: تحصيل نقدي بتاريخ الدفع، وقد يشمل مقدمًا أو متأخرات.','Blue: dues on day 5. Green: cash received, including advances or arrears.')}</p><div class="oa-chart">${model.buckets.length?htmlJoin(model.buckets.map(b=>html`<div class="oa-chart-row"><strong>${arNum(b.date.getFullYear())}/${arNum(b.date.getMonth()+1)}</strong><div class="oa-chart-pair"><div><span class="oa-bar-track"><span class="oa-bar oa-due" style="width:${b.due/maxBar*100}%"></span></span><span>${wholeMoney(b.due)}</span></div><div><span class="oa-bar-track"><span class="oa-bar oa-collected" style="width:${b.collected/maxBar*100}%"></span></span><span>${wholeMoney(b.collected)}</span></div></div></div>`)):html`<p class="muted">${tx('لا توجد فترة منقضية بعد.','No elapsed period yet.')}</p>`}</div></section>
      <section class="card"><h3>${tx('أعمار المتأخرات','Overdue aging')}</h3><p class="small muted">${tx('من تاريخ الاستحقاق حتى نهاية الفترة؛ قد يظهر القرض في أكثر من فئة.','Due date to period end; a loan may appear in multiple buckets.')}</p><div class="oa-aging">${htmlJoin(model.aging.map((b,i)=>html`<button class="oa-aging-item oa-aging-${i}" data-analytics-aging="${i}"><span>${b.label} ${tx('يوم','days')}</span><strong>${wholeMoney(b.value)}</strong><span>${arNum(b.count)} ${tx('قرض','loans')}</span></button>`))}</div><h3>${tx('مصدر التحصيل خلال الفترة','Collection allocation')}</h3><dl class="oa-breakdown"><dt>${tx('لاستحقاقات الفترة','Period dues')}</dt><dd>${wholeMoney(c.currentCollected)}</dd><dt>${tx('لاستحقاقات أقدم','Earlier dues')}</dt><dd>${wholeMoney(c.arrearsCollected)}</dd><dt>${tx('لاستحقاقات لاحقة','Future dues')}</dt><dd>${wholeMoney(c.advanceCollected)}</dd><dt>${tx('غير موزع على جدول','Unallocated to schedule')}</dt><dd>${wholeMoney(Math.max(0,c.collected-c.currentCollected-c.arrearsCollected-c.advanceCollected))}</dd></dl></section>
    </div>
    <section class="card"><div class="oa-section-title"><h3>${tx('أداء المستخدمين','User performance')}</h3><label>${tx('ترتيب حسب','Sort by')} <select id="analyticsSort">${htmlJoin([['overdue',tx('الأعلى تأخرًا','Highest overdue')],['rate',tx('الأفضل التزامًا','Best on-time coverage')],['collected',tx('الأعلى تحصيلًا','Highest collections')],['outstanding',tx('الأكبر رصيدًا','Largest outstanding')]].map(([key,label])=>html`<option value="${key}" ${(state.analyticsSort||'overdue')===key?'selected':''}>${label}</option>`))}</select></label></div><div class="table-wrap"><table><thead><tr><th>${tx('المستخدم','User')}</th><th>${tx('المستحق','Due')}</th><th>${tx('المحصل نقدًا','Cash collected')}</th><th>${tx('السداد في الموعد','On-time coverage')}</th><th>${tx('المتأخرات','Overdue')}</th><th>${tx('الرصيد المتبقي','Outstanding')}</th><th>${tx('القروض ذات الرصيد','Loans with balance')}</th></tr></thead><tbody>${model.users.length?htmlJoin(model.users.map(u=>html`<tr><td><button class="oa-link" data-analytics-user="${u.id}">${u.name}</button></td><td>${wholeMoney(u.due)}</td><td>${wholeMoney(u.collected)}</td><td>${u.rate===null?'—':percentDisplay(u.rate,1)}</td><td>${wholeMoney(u.overdue)}</td><td>${wholeMoney(u.outstanding)}</td><td>${arNum(u.activeCount)}</td></tr>`)):html`<tr><td colspan="7">${tx('لا توجد قروض مطابقة.','No matching loans.')}</td></tr>`}</tbody></table></div></section>
    <div class="oa-two-columns"><section class="card"><h3>${tx('توزيع الرصيد المتبقي','Outstanding distribution')}</h3>${htmlJoin(model.users.filter(u=>u.outstanding>0).map(u=>html`<button class="oa-distribution" data-analytics-user="${u.id}"><span>${u.name}</span><strong>${wholeMoney(u.outstanding)} · ${percentDisplay(c.outstanding?u.outstanding/c.outstanding*100:0,1)}</strong><span class="oa-bar-track"><span class="oa-bar oa-collected" style="width:${u.outstanding/maxPortfolio*100}%"></span></span></button>`))}${!c.outstanding?html`<p class="muted">${tx('لا توجد أرصدة متبقية.','No outstanding balances.')}</p>`:''}</section>
    <section class="card"><h3>${tx('حركة الإقراض والتحصيل','Lending and collection flow')}</h3><dl class="oa-breakdown"><dt>${tx('تحصيل داخل الفترة','Collections in period')}</dt><dd>${wholeMoney(c.collected)}</dd><dt>${tx('إقراض جديد داخل الفترة','New lending in period')}</dt><dd>${wholeMoney(c.lent)}</dd><dt>${tx('صافي التحصيل ناقص الإقراض','Collections less new lending')}</dt><dd>${wholeMoney(c.collected-c.lent)}</dd></dl><p class="small muted">${tx('هذا صافي حركة القروض فقط. لا يمثل رصيد البنك ولا يشمل حركات رأس المال وتحويلات التصفية.','Loan cash flow only. This is not a bank balance and excludes capital movements and settlement transfers.')}</p></section></div>
    <section class="card" id="analyticsDetails" tabindex="-1"><div class="oa-section-title"><h3>${(detailLabels[detailKey]||detailLabels.overdue)+(ageBucket?' · '+ageBucket.label+' '+tx('يوم','days'):'')}</h3><span class="small muted">${tx('اضغط بطاقة لعرض القروض المكوّنة للمبلغ','Select a metric card to inspect its loans')}</span></div><div class="table-wrap"><table><thead><tr><th>${tx('القرض','Loan')}</th><th>${tx('المستفيد','Beneficiary')}</th><th>${tx('المستخدم','User')}</th><th>${tx('المبلغ','Amount')}</th><th>${tx('أقدم تأخر بالأيام','Oldest overdue days')}</th><th>${tx('آخر سداد','Last payment')}</th></tr></thead><tbody>${detailRows.length?htmlJoin(detailRows.map(r=>{const latest=r.dated.filter(d=>d.date<=model.end).at(-1);return html`<tr><td><button class="btn btn-secondary" data-analytics-loan="${r.loan.id}">${r.loan.id}</button></td><td>${r.loan.beneficiary}</td><td>${r.loan.assignedUser||'—'}</td><td>${wholeMoney(r[detailKey])}</td><td>${arNum(r.lateDays)}</td><td>${latest?date(latest.date):'—'}</td></tr>`;})):html`<tr><td colspan="6">${tx('لا توجد حالات مطابقة.','No matching records.')}</td></tr>`}</tbody></table></div></section>
    <details class="card oa-live"><summary>${tx('الوضع الحالي المسجل — مستقل عن السنة ونوع القرض','Current recorded position — independent of year and loan type')}</summary><p class="small muted">${tx('يتبع المستخدم المحدد ويشمل كامل حسابه. لا يُعرض كرصد تاريخي للسنة المختارة.','Applies to the selected user’s entire account. Not a historical snapshot of the selected year.')}</p><div class="oa-live-grid"><div><span>${tx('السيولة المسجلة المتاحة','Recorded available cash')}</span><strong>${wholeMoney(cash)}</strong></div><div><span>${tx('حق المالك المحقق غير المحول','Realized owner share less transfers')}</span><strong>${wholeMoney(ownerRealized-ownerTransferred)}</strong></div><div><span>${tx('المحول للمالك','Transferred to owner')}</span><strong>${wholeMoney(ownerTransferred)}</strong></div></div></details>
    <details class="card" id="analyticsQuality"><summary>${tx('طريقة الحساب وجودة البيانات','Method and data quality')}</summary><p>${tx('الاستحقاق الأول يوم 5 من الشهر التالي للقروض المؤرخة من 1 إلى 25، وبعد شهرين للقروض المؤرخة من 26 إلى نهاية الشهر. فرق التصفية مضاف إلى القسط الأخير لأغراض التحليل. توزع الدفعات على أقدم استحقاق أولًا؛ هذا توزيع تحليلي لا يغيّر السجلات.','First due date is day 5 of the next month for loans dated 1–25, or the second following month for loans dated 26 onward. Settlement remainder is included in the last installment for analysis. Payments are allocated oldest due first; records are not changed.')}</p><p>${tx('المقارنة مبنية على تواريخ الدفعات وشروط القروض المحفوظة حاليًا، وليست لقطة أرشيفية. تعديل شروط قرض أو حذف دفعة لاحقًا قد يغير نتائج السنوات السابقة. عند غياب تاريخ الدفع يستخدم تاريخ تسجيله. حق المالك المحقق محسوب بالتناسب مع التحصيل وفق قاعدة النظام.','Comparison uses dated payments and currently stored loan terms, not archived snapshots. Later term changes or payment deletions may alter past results. Registration date is used when payment date is absent. Realized owner share follows the system’s proportional collection rule.')}</p>${issues.length?html`<ul>${htmlJoin([...new Map(issues.map(i=>[`${i.loan.id}:${i.reason}`,i])).values()].map(i=>html`<li>${tx('قرض','Loan')} <button class="oa-link" data-analytics-loan="${i.loan.id}">${i.loan.id}</button>: ${i.reason==='payments'?tx('دفعات غير مؤرخة أو غير متطابقة مع إجمالي المدفوع؛ الأرصدة التاريخية قد تكون غير مكتملة.','Undated payments or mismatch with paid total; historical balances may be incomplete.'):i.reason==='date'?tx('تاريخ القرض مفقود أو غير صالح؛ مستبعد من التحليل.','Missing or invalid loan date; excluded.'):i.reason==='amended'?tx('تم تعديل فترة السداد؛ يستخدم التحليل الشروط الحالية.','Repayment period amended; current terms used.'):tx('جدول استحقاق غير مكتمل؛ راجع المدة والقسط.','Incomplete schedule; review term and installment.')}</li>`))}</ul>`:html`<p>${tx('لم تظهر ملاحظات على اتساق سجلات الدفعات والجداول المشمولة.','No payment or schedule consistency issues detected in included records.')}</p>`}</details>
  </div>`;
}


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

