// Annual profit monitoring, read-only; uses existing validated loan shares and payment records.
function annualProfitYears(){
  const now=new Date();const y=now.getFullYear();
  const all=new Set((state.collectionYears||[]).map(x=>Number(x.year)));
  (state.expectedInterestByCollectionYear||[]).forEach(x=>all.add(Number(x.collectionYear)));
  for(let i=2026;i<=y+2;i++)all.add(i);
  return [...all].filter(Number.isFinite).sort((a,b)=>b-a);
}
function annualProfitRange(year){
  const saved=(state.collectionYears||[]).find(x=>Number(x.year)===Number(year));
  return {start:saved?.startDate||`${year}-01-06`,end:saved?.endDate||`${year+1}-01-05`,configured:!!saved};
}
function buildAnnualProfitReport(){
  const years=annualProfitYears();
  if(!years.includes(Number(state.annualProfitYear)))state.annualProfitYear=years.includes(new Date().getFullYear())?new Date().getFullYear():years[0];
  const year=Number(state.annualProfitYear);const range=annualProfitRange(year);
  const users=(state.users||[]).filter(u=>u.dbRole!=='admin');
  const rows=users.map(u=>({id:String(u.id),name:u.username,realizedUser:0,realizedOwner:0,expectedUser:0,expectedOwner:0,settledUser:0,settledOwner:0,priorSettledUser:0,priorSettledOwner:0,cumulativeRealizedUser:0,cumulativeRealizedOwner:0,remainingUser:0,remainingOwner:0,cumulativeRemainingUser:0,cumulativeRemainingOwner:0}));
  const byId=new Map(rows.map(r=>[r.id,r]));
  for(const loan of state.loans||[]){
    if(!['active','closed'].includes(loan.dbStatus))continue;
    const r=byId.get(String(loan.assignedUserId));if(!r)continue;
    const total=Number(loan.total||0);const user=Number(loan.userNet||0),owner=Number(loan.adminNet||0);
    // Each payment realizes a proportional fraction of the interest; never count principal as profit.
    if(total<=0||user+owner<=0)continue;
    for(const payment of loan.payments||[]){
      const date=payment.paymentDate||String(payment.createdAt||'').slice(0,10);
      if(!date||date>range.end)continue;
      const fraction=Math.max(0,Number(payment.amount||0))/total;
      r.cumulativeRealizedUser+=user*fraction;r.cumulativeRealizedOwner+=owner*fraction;
      if(date>=range.start){r.realizedUser+=user*fraction;r.realizedOwner+=owner*fraction;}
    }
  }
  for(const exp of state.expectedInterestByCollectionYear||[]){
    if(Number(exp.collectionYear)!==year)continue;
    const r=byId.get(String(exp.userId));if(!r)continue;
    r.expectedUser+=Number(exp.userShare||0);r.expectedOwner+=Number(exp.ownerShare||0);
  }
  for(const settlement of state.annualProfitSettlements||[]){
    const settlementYear=Number(settlement.settlement_year);
    if(!Number.isFinite(settlementYear)||settlementYear>year)continue;
    const r=byId.get(String(settlement.account_user_id));if(!r)continue;
    const prior=settlementYear<year;
    if(settlement.settlement_for==='user')r[prior?'priorSettledUser':'settledUser']+=Number(settlement.amount||0);
    if(settlement.settlement_for==='owner')r[prior?'priorSettledOwner':'settledOwner']+=Number(settlement.amount||0);
  }
  for(const r of rows){
    r.remainingUser=r.realizedUser-r.settledUser;r.remainingOwner=r.realizedOwner-r.settledOwner;
    r.cumulativeRemainingUser=r.cumulativeRealizedUser-r.priorSettledUser-r.settledUser;
    r.cumulativeRemainingOwner=r.cumulativeRealizedOwner-r.priorSettledOwner-r.settledOwner;
  }
  return {year,range,years,rows,totals:rows.reduce((a,r)=>{
    for(const key of ['realizedUser','realizedOwner','expectedUser','expectedOwner','settledUser','settledOwner','priorSettledUser','priorSettledOwner','cumulativeRealizedUser','cumulativeRealizedOwner','remainingUser','remainingOwner','cumulativeRemainingUser','cumulativeRemainingOwner'])a[key]=(a[key]||0)+r[key];
    return a;
  },{})};
}
function annualProfitReportView(){
  if(state.currentUser?.role!=='مدير مشروع')return html`<div class="card">${tx('غير مصرح','Not authorized')}</div>`;
  const r=buildAnnualProfitReport(),a=r.totals,fmt=n=>wholeMoney(Math.round(n||0));
  const header=tx('تقرير استرشادي للمتابعة فقط. لا يسجل أو يعتمد تصفية مالية. المتوقع هو مجموع أرباح الأقساط المجدولة وفق بيانات السنوات التحصيلية، والمحقق هو الحصة النسبية من الدفعات الفعلية.','Read-only monitoring report. This does not post or approve settlements. Expected profit comes from scheduled collections and realized profit from actual payments.');
  return html`<div class="annual-profit-report">
    <div class="notice">${header}</div>
    ${state.annualProfitError?html`<div class="notice" style="background:#fee2e2;color:#991b1b">${state.annualProfitError}</div>`:''}
    <div class="panel"><div class="toolbar">
      <div class="field" style="min-width:190px;margin:0"><label>${tx('السنة التحصيلية','Collection year')}</label><select id="annualProfitYear">${htmlJoin(r.years.map(y=>html`<option value="${y}" ${y===r.year?'selected':''}>${arNum(y)}</option>`))}</select></div>
      <div class="actions"><button class="btn btn-secondary" id="annualProfitRefresh">${tx('تحديث الحسابات','Refresh')}</button><button class="btn btn-secondary" id="annualProfitCsv">${tx('تصدير CSV','Export CSV')}</button></div>
    </div>
    <p class="small muted">${tx('الفترة','Period')}: ${dateDisplay(r.range.start)} — ${dateDisplay(r.range.end)} ${!r.range.configured?tx(' (فترة افتراضية لم تُعتمد في جدول السنوات)',' (default dates; not configured in collection years)'):''}</p>
    <div class="grid cards">${metricCard(tx('المحقق للمستخدمين','Realized user shares'),fmt(a.realizedUser))}${metricCard(tx('المحقق للمالك','Realized owner shares'),fmt(a.realizedOwner))}${metricCard(tx('المتوقع للمستخدمين','Expected user shares'),fmt(a.expectedUser))}${metricCard(tx('المتوقع للمالك','Expected owner shares'),fmt(a.expectedOwner))}</div>
    <div class="grid cards" style="margin-top:12px">${metricCard(tx('المصفى في السنة للمستخدمين','Settled in year for users'),fmt(a.settledUser))}${metricCard(tx('المصفى في السنة للمالك','Settled in year for owner'),fmt(a.settledOwner))}${metricCard(tx('متبقي محقق السنة للمستخدمين','Remaining year realized for users'),fmt(a.remainingUser))}${metricCard(tx('متبقي محقق السنة للمالك','Remaining year realized for owner'),fmt(a.remainingOwner))}</div>
    <div class="grid cards" style="margin-top:12px">${metricCard(tx('المصفى سابقًا لجميع السنوات للمستخدمين','All previous years settled for users'),fmt(a.priorSettledUser))}${metricCard(tx('المصفى سابقًا لجميع السنوات للمالك','All previous years settled for owner'),fmt(a.priorSettledOwner))}${metricCard(tx('صافي المستحق المتراكم للمستخدمين','Cumulative balance for users'),fmt(a.cumulativeRemainingUser))}${metricCard(tx('صافي المستحق المتراكم للمالك','Cumulative balance for owner'),fmt(a.cumulativeRemainingOwner))}</div>
    <div class="table-wrap" style="margin-top:18px"><table style="min-width:1150px"><thead><tr>
      <th>${tx('المستخدم','User')}</th><th>${tx('المحقق للمستخدم','Realized user')}</th><th>${tx('المحقق للمالك','Realized owner')}</th><th>${tx('المتوقع للمستخدم','Expected user')}</th><th>${tx('المتوقع للمالك','Expected owner')}</th><th>${tx('المصفى سابقًا للمستخدم','Prior settled user')}</th><th>${tx('المصفى سابقًا للمالك','Prior settled owner')}</th><th>${tx('المصفى هذه السنة للمستخدم','Current year settled user')}</th><th>${tx('المصفى هذه السنة للمالك','Current year settled owner')}</th><th>${tx('متبقي المستخدم','Remaining user')}</th><th>${tx('متبقي المالك','Remaining owner')}</th>
    </tr></thead><tbody>${htmlJoin(r.rows.map(u=>html`<tr><td><strong>${u.name}</strong></td><td>${fmt(u.realizedUser)}</td><td>${fmt(u.realizedOwner)}</td><td>${fmt(u.expectedUser)}</td><td>${fmt(u.expectedOwner)}</td><td>${fmt(u.priorSettledUser)}</td><td>${fmt(u.priorSettledOwner)}</td><td>${fmt(u.settledUser)}</td><td>${fmt(u.settledOwner)}</td><td>${fmt(u.remainingUser)}</td><td>${fmt(u.remainingOwner)}</td></tr>`))}</tbody></table></div>
    <p class="small muted" style="margin-top:12px">${tx('المصفى سابقًا يجمع جميع سنوات التحصيل السابقة؛ صافي السنة لا يخصم تصفيات السنوات الماضية مرة أخرى. يستند الرصيد التراكمي إلى جميع الدفعات حتى نهاية الفترة بعد خصم كل التصفيات المسجلة. ','Prior settlements include every earlier collection year; annual balance does not double-deduct them. Cumulative balance uses all paid installments through period end and all recorded settlements. ')} ${tx('تُستخدم حصة كل قرض المخزنة بعد خصوماته؛ لذلك لا تُفرض نسبة 40/60 على القروض القديمة. التقريب للعرض فقط. يجب مراجعة الفروقات والتسويات قبل اعتماد الصرف.','Each loan uses its stored discounted shares, preserving older loan policies. Rounding is display-only. Reconcile differences and adjustments before any payout.')}</p>
    </div></div>`;
}
