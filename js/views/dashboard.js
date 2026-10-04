// Read-only analytics. All dates use local calendar days and approved year boundaries.
function ownerAnalyticsDay(value){
  const raw=String(value||'').slice(0,10),m=raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return null;
  const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
  return d.getFullYear()===Number(m[1])&&d.getMonth()===Number(m[2])-1&&d.getDate()===Number(m[3])?d:null;
}
function ownerAnalyticsDays(a,b){
  return Math.round((Date.UTC(b.getFullYear(),b.getMonth(),b.getDate())-Date.UTC(a.getFullYear(),a.getMonth(),a.getDate()))/86400000);
}
function ownerAnalyticsYears(){
  return (state.collectionYears||[]).map(y=>({...y,start:ownerAnalyticsDay(y.startDate),end:ownerAnalyticsDay(y.endDate)}))
    .filter(y=>y.start&&y.end&&y.start<=y.end).sort((a,b)=>a.start-b.start);
}
function ownerAnalyticsContext(now=new Date()){
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),years=ownerAnalyticsYears();
  const current=years.find(y=>y.start<=today&&y.end>=today)||[...years].reverse().find(y=>y.start<=today)||years[0];
  const year=years.find(y=>String(y.year)===String(state.analyticsYear))||current;
  if(!year)return {years,today,year:null};
  const previous=years[years.indexOf(year)-1]||null;
  const end=new Date(Math.min(year.end.getTime(),today.getTime()));
  const days=Math.max(0,ownerAnalyticsDays(year.start,end)+1);
  let previousEnd=previous?new Date(previous.end):null;
  if(previous&&state.analyticsCompare!=='full'){
    previousEnd=new Date(previous.start);previousEnd.setDate(previousEnd.getDate()+days-1);
    previousEnd=new Date(Math.min(previousEnd.getTime(),previous.end.getTime(),today.getTime()));
  }
  return {years,today,year,previous,start:year.start,end,previousEnd,days};
}
function ownerAnalyticsLoanRows(start,end,filters={}){
  const issues=[];
  const policyStart=ownerAnalyticsYears().find(y=>Number(y.year)===2026)?.start;
  if(!policyStart)throw new Error("Collection year 2026 start date is required for payment deadlines");
  if(end<start)return {rows:[],issues};
  const approved=(state.loans||[]).filter(l=>['active','closed'].includes(l.dbStatus))
    .filter(l=>(!filters.user||String(l.assignedUserId)===String(filters.user))&&(!filters.type||l.type===filters.type));
  const inRange=d=>d&&d>=start&&d<=end;
  const rows=[];
  for(const loan of approved){
    const origin=ownerAnalyticsDay(loan.loanDate||loan.createdAt);
    if(!origin){issues.push({loan,reason:'date'});continue;}
    if(origin>end)continue;
    const total=Math.max(0,Number(loan.total||0)),months=Number(loan.months||0),installment=Number(loan.installment||0);
    const validSchedule=Number.isInteger(months)&&months>0&&months<=1200&&installment>0&&total>0;
    const payments=(loan.payments||[]).map(p=>({date:ownerAnalyticsDay(p.paymentDate||p.createdAt),amount:Number(p.amount||0)}));
    const dated=payments.filter(p=>p.date&&Number.isFinite(p.amount)&&p.amount>=0).sort((a,b)=>a.date-b.date);
    const incomplete=payments.some(p=>!p.date||!Number.isFinite(p.amount)||p.amount<0)||Math.abs(dated.reduce((s,p)=>s+p.amount,0)-Number(loan.paid||0))>0.02;
    if(incomplete)issues.push({loan,reason:'payments'});
    if(!validSchedule)issues.push({loan,reason:'schedule'});
    if((state.repaymentRequests||[]).some(r=>r.loanDbId===loan.dbId&&r.status==='approved'))issues.push({loan,reason:'amended'});
    const paidAt=d=>dated.reduce((s,p)=>s+(p.date<=d?p.amount:0),0);
    const paid=paidAt(end),schedule=[];
    if(validSchedule){
      let offset=0;
      for(let i=0;i<months&&offset<total;i++){
        const due=new Date(origin.getFullYear(),origin.getMonth()+(origin.getDate()<=25?1:2)+i,5);
        // Keep the scheduled due date for year membership; grace changes lateness only.
        // An installment due before the policy boundary retains its original grace.
        const deadline=new Date(due);
        if(due<policyStart)deadline.setDate(10);
        const amount=i===months-1?total-offset:Math.min(installment,total-offset);
        const covered=Math.min(amount,Math.max(0,paid-offset));
        const onTime=Math.min(amount,Math.max(0,paidAt(new Date(Math.min(deadline.getTime(),end.getTime())))-offset));
        schedule.push({due,deadline,amount,covered,onTime:due<=end?onTime:0,unpaid:Math.max(0,amount-covered),offset});offset+=amount;
      }
    }
    const periodDues=schedule.filter(s=>inRange(s.due));
    const collected=dated.filter(p=>inRange(p.date)).reduce((s,p)=>s+p.amount,0);
    // FIFO allocation is an analytical convention, not a mutation of payment records.
    let running=0,arrearsCollected=0,currentCollected=0,advanceCollected=0;
    for(const p of dated){
      if(inRange(p.date))for(const s of schedule){
        const allocated=Math.max(0,Math.min(running+p.amount,s.offset+s.amount)-Math.max(running,s.offset));
        if(s.due<start)arrearsCollected+=allocated;
        else if(s.due>end)advanceCollected+=allocated;
        else currentCollected+=allocated;
      }
      running+=p.amount;
    }
    const before=new Date(start);before.setDate(before.getDate()-1);
    const owner=realizedRightsForLoan({...loan,paid}).owner-realizedRightsForLoan({...loan,paid:paidAt(before)}).owner;
    const overdue=schedule.filter(s=>s.deadline<end&&s.unpaid>0.005);
    rows.push({loan,origin,schedule,periodDues,dated,incomplete,collected,owner,lent:inRange(origin)?Number(loan.amount||0):0,
      due:periodDues.reduce((s,d)=>s+d.amount,0),covered:periodDues.reduce((s,d)=>s+d.covered,0),onTime:periodDues.reduce((s,d)=>s+d.onTime,0),
      outstanding:Math.max(0,total-paid),overdue:overdue.reduce((s,d)=>s+d.unpaid,0),lateDays:overdue.length?Math.max(...overdue.map(s=>ownerAnalyticsDays(s.deadline,end))):0,
      arrearsCollected,currentCollected,advanceCollected});
  }
  return {rows,issues};
}
function ownerAnalyticsSummary(data){
  const out={...data};
  for(const key of ['collected','owner','lent','due','covered','onTime','outstanding','overdue','arrearsCollected','currentCollected','advanceCollected'])out[key]=data.rows.reduce((s,r)=>s+r[key],0);
  out.rate=out.due>0?out.onTime/out.due*100:null;
  out.overdueCount=data.rows.filter(r=>r.overdue>0.005).length;
  out.activeCount=data.rows.filter(r=>r.outstanding>0.005).length;
  return out;
}
function ownerAnalyticsModel(now=new Date()){
  const context=ownerAnalyticsContext(now);
  if(!context.year)return context;
  const filters={user:state.analyticsUser||'',type:state.analyticsType||''};
  const current=ownerAnalyticsSummary(ownerAnalyticsLoanRows(context.start,context.end,filters));
  const previous=context.previous?ownerAnalyticsSummary(ownerAnalyticsLoanRows(context.previous.start,context.previousEnd,filters)):null;
  const buckets=[];
  for(let d=new Date(context.start.getFullYear(),context.start.getMonth(),1);d<=context.end;d=new Date(d.getFullYear(),d.getMonth()+1,1)){
    const first=new Date(Math.max(d.getTime(),context.start.getTime())),last=new Date(Math.min(new Date(d.getFullYear(),d.getMonth()+1,0).getTime(),context.end.getTime()));
    buckets.push({date:d,due:current.rows.reduce((sum,r)=>sum+r.schedule.filter(s=>s.due>=first&&s.due<=last).reduce((a,s)=>a+s.amount,0),0),collected:current.rows.reduce((sum,r)=>sum+r.dated.filter(p=>p.date>=first&&p.date<=last).reduce((a,p)=>a+p.amount,0),0)});
  }
  const aging=[{min:1,max:30,label:'1–30'},{min:31,max:60,label:'31–60'},{min:61,max:90,label:'61–90'},{min:91,max:Infinity,label:'90+'}].map(b=>{
    const matches=current.rows.map(r=>({r,amount:r.schedule.filter(s=>{const days=ownerAnalyticsDays(s.deadline,context.end);return days>=b.min&&days<=b.max;}).reduce((sum,s)=>sum+s.unpaid,0)})).filter(x=>x.amount>0.005);
    return {...b,value:matches.reduce((s,x)=>s+x.amount,0),count:matches.length};
  });
  const ids=[...new Set(current.rows.map(r=>String(r.loan.assignedUserId||'')))];
  const users=ids.map(id=>{
    const user=state.users.find(u=>String(u.id)===id),rows=current.rows.filter(r=>String(r.loan.assignedUserId||'')===id);
    return {id,name:user?.username||rows[0]?.loan.assignedUser||'—',...ownerAnalyticsSummary({rows,issues:[]})};
  });
  const sort=state.analyticsSort||'overdue';users.sort((a,b)=>Number(b[sort]??-1)-Number(a[sort]??-1));
  return {...context,previousYear:context.previous,current,previous,buckets,aging,users,filters};
}


function analyticsView(){
  if(ownerAnalyticsYears().length&&!ownerAnalyticsYears().some(y=>Number(y.year)===2026))return html`<div class="card"><h3>${tx('يلزم تحديد بداية السنة التحصيلية 2026','Collection year 2026 start date required')}</h3><p>${tx('أضف حدود السنة التحصيلية 2026 في إعدادات السنوات لتطبيق مهلة السداد الصحيحة؛ لن نستخدم بداية السنة الميلادية بدلًا منها.','Configure collection year 2026 boundaries to apply the correct payment grace period; the calendar year is not used as a substitute.')}</p></div>`;
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
  const detailRows=c.rows.map(r=>ageBucket?{...r,overdue:r.schedule.filter(s=>{const days=ownerAnalyticsDays(s.deadline,model.end);return days>=ageBucket.min&&days<=ageBucket.max;}).reduce((s,d)=>s+d.unpaid,0)}:r).filter(r=>r[detailKey]>0.005).sort((a,b)=>b[detailKey]-a[detailKey]);
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
      <section class="card"><h3>${tx('أعمار المتأخرات','Overdue aging')}</h3><p class="small muted">${tx('من اليوم التالي لانتهاء مهلة السداد حتى نهاية الفترة؛ قد يظهر القرض في أكثر من فئة.','Days after the payment deadline to period end; a loan may appear in multiple buckets.')}</p><div class="oa-aging">${htmlJoin(model.aging.map((b,i)=>html`<button class="oa-aging-item oa-aging-${i}" data-analytics-aging="${i}"><span>${b.label} ${tx('يوم','days')}</span><strong>${wholeMoney(b.value)}</strong><span>${arNum(b.count)} ${tx('قرض','loans')}</span></button>`))}</div><h3>${tx('مصدر التحصيل خلال الفترة','Collection allocation')}</h3><dl class="oa-breakdown"><dt>${tx('لاستحقاقات الفترة','Period dues')}</dt><dd>${wholeMoney(c.currentCollected)}</dd><dt>${tx('لاستحقاقات أقدم','Earlier dues')}</dt><dd>${wholeMoney(c.arrearsCollected)}</dd><dt>${tx('لاستحقاقات لاحقة','Future dues')}</dt><dd>${wholeMoney(c.advanceCollected)}</dd><dt>${tx('غير موزع على جدول','Unallocated to schedule')}</dt><dd>${wholeMoney(Math.max(0,c.collected-c.currentCollected-c.arrearsCollected-c.advanceCollected))}</dd></dl></section>
    </div>
    <section class="card"><div class="oa-section-title"><h3>${tx('أداء المستخدمين','User performance')}</h3><label>${tx('ترتيب حسب','Sort by')} <select id="analyticsSort">${htmlJoin([['overdue',tx('الأعلى تأخرًا','Highest overdue')],['rate',tx('الأفضل التزامًا','Best on-time coverage')],['collected',tx('الأعلى تحصيلًا','Highest collections')],['outstanding',tx('الأكبر رصيدًا','Largest outstanding')]].map(([key,label])=>html`<option value="${key}" ${(state.analyticsSort||'overdue')===key?'selected':''}>${label}</option>`))}</select></label></div><div class="table-wrap"><table><thead><tr><th>${tx('المستخدم','User')}</th><th>${tx('المستحق','Due')}</th><th>${tx('المحصل نقدًا','Cash collected')}</th><th>${tx('السداد في الموعد','On-time coverage')}</th><th>${tx('المتأخرات','Overdue')}</th><th>${tx('الرصيد المتبقي','Outstanding')}</th><th>${tx('القروض ذات الرصيد','Loans with balance')}</th></tr></thead><tbody>${model.users.length?htmlJoin(model.users.map(u=>html`<tr><td><button class="oa-link" data-analytics-user="${u.id}">${u.name}</button></td><td>${wholeMoney(u.due)}</td><td>${wholeMoney(u.collected)}</td><td>${u.rate===null?'—':percentDisplay(u.rate,1)}</td><td>${wholeMoney(u.overdue)}</td><td>${wholeMoney(u.outstanding)}</td><td>${arNum(u.activeCount)}</td></tr>`)):html`<tr><td colspan="7">${tx('لا توجد قروض مطابقة.','No matching loans.')}</td></tr>`}</tbody></table></div></section>
    <div class="oa-two-columns"><section class="card"><h3>${tx('توزيع الرصيد المتبقي','Outstanding distribution')}</h3>${htmlJoin(model.users.filter(u=>u.outstanding>0).map(u=>html`<button class="oa-distribution" data-analytics-user="${u.id}"><span>${u.name}</span><strong>${wholeMoney(u.outstanding)} · ${percentDisplay(c.outstanding?u.outstanding/c.outstanding*100:0,1)}</strong><span class="oa-bar-track"><span class="oa-bar oa-collected" style="width:${u.outstanding/maxPortfolio*100}%"></span></span></button>`))}${!c.outstanding?html`<p class="muted">${tx('لا توجد أرصدة متبقية.','No outstanding balances.')}</p>`:''}</section>
    <section class="card"><h3>${tx('حركة الإقراض والتحصيل','Lending and collection flow')}</h3><dl class="oa-breakdown"><dt>${tx('تحصيل داخل الفترة','Collections in period')}</dt><dd>${wholeMoney(c.collected)}</dd><dt>${tx('إقراض جديد داخل الفترة','New lending in period')}</dt><dd>${wholeMoney(c.lent)}</dd><dt>${tx('صافي التحصيل ناقص الإقراض','Collections less new lending')}</dt><dd>${wholeMoney(c.collected-c.lent)}</dd></dl><p class="small muted">${tx('هذا صافي حركة القروض فقط. لا يمثل رصيد البنك ولا يشمل حركات رأس المال وتحويلات التصفية.','Loan cash flow only. This is not a bank balance and excludes capital movements and settlement transfers.')}</p></section></div>
    <section class="card" id="analyticsDetails" tabindex="-1"><div class="oa-section-title"><h3>${(detailLabels[detailKey]||detailLabels.overdue)+(ageBucket?' · '+ageBucket.label+' '+tx('يوم','days'):'')}</h3><span class="small muted">${tx('اضغط بطاقة لعرض القروض المكوّنة للمبلغ','Select a metric card to inspect its loans')}</span></div><div class="table-wrap"><table><thead><tr><th>${tx('القرض','Loan')}</th><th>${tx('المستفيد','Beneficiary')}</th><th>${tx('المستخدم','User')}</th><th>${tx('المبلغ','Amount')}</th><th>${tx('أقدم تأخر بالأيام','Oldest overdue days')}</th><th>${tx('آخر سداد','Last payment')}</th></tr></thead><tbody>${detailRows.length?htmlJoin(detailRows.map(r=>{const latest=r.dated.filter(d=>d.date<=model.end).at(-1);return html`<tr><td><button class="btn btn-secondary" data-analytics-loan="${r.loan.id}">${r.loan.id}</button></td><td>${r.loan.beneficiary}</td><td>${r.loan.assignedUser||'—'}</td><td>${wholeMoney(r[detailKey])}</td><td>${arNum(r.lateDays)}</td><td>${latest?date(latest.date):'—'}</td></tr>`;})):html`<tr><td colspan="6">${tx('لا توجد حالات مطابقة.','No matching records.')}</td></tr>`}</tbody></table></div></section>
    <details class="card oa-live"><summary>${tx('الوضع الحالي المسجل — مستقل عن السنة ونوع القرض','Current recorded position — independent of year and loan type')}</summary><p class="small muted">${tx('يتبع المستخدم المحدد ويشمل كامل حسابه. لا يُعرض كرصد تاريخي للسنة المختارة.','Applies to the selected user’s entire account. Not a historical snapshot of the selected year.')}</p><div class="oa-live-grid"><div><span>${tx('السيولة المسجلة المتاحة','Recorded available cash')}</span><strong>${wholeMoney(cash)}</strong></div><div><span>${tx('حق المالك المحقق غير المحول','Realized owner share less transfers')}</span><strong>${wholeMoney(ownerRealized)}</strong></div><div><span>${tx('المحول للمالك','Transferred to owner')}</span><strong>${wholeMoney(ownerTransferred)}</strong></div></div></details>
    <details class="card" id="analyticsQuality"><summary>${tx('طريقة الحساب وجودة البيانات','Method and data quality')}</summary><p>${tx('الاستحقاق الأول يوم 5 من الشهر التالي للقروض المؤرخة من 1 إلى 25، وبعد شهرين للقروض المؤرخة من 26 إلى نهاية الشهر. قبل بداية السنة التحصيلية 2026 تكون المهلة حتى يوم 10 شاملًا؛ من بدايتها حتى يوم 5 شاملًا. يبدأ التأخر في اليوم التالي للمهلة، ويحتفظ القسط السابق لبداية السنة بمهلته الأصلية. فرق التصفية مضاف إلى القسط الأخير لأغراض التحليل. توزع الدفعات على أقدم استحقاق أولًا؛ هذا توزيع تحليلي لا يغيّر السجلات.','First due date is day 5 of the next month for loans dated 1–25, or the second following month for loans dated 26 onward. Before collection year 2026 begins, payment is on time through day 10 inclusive; from that boundary, through day 5 inclusive. Lateness starts the following day. Earlier installments retain their original grace. Settlement remainder is included in the last installment for analysis. Payments are allocated oldest due first; records are not changed.')}</p><p>${tx('المقارنة مبنية على تواريخ الدفعات وشروط القروض المحفوظة حاليًا، وليست لقطة أرشيفية. تعديل شروط قرض أو حذف دفعة لاحقًا قد يغير نتائج السنوات السابقة. عند غياب تاريخ الدفع يستخدم تاريخ تسجيله. حق المالك المحقق محسوب بالتناسب مع التحصيل وفق قاعدة النظام.','Comparison uses dated payments and currently stored loan terms, not archived snapshots. Later term changes or payment deletions may alter past results. Registration date is used when payment date is absent. Realized owner share follows the system’s proportional collection rule.')}</p>${issues.length?html`<ul>${htmlJoin([...new Map(issues.map(i=>[`${i.loan.id}:${i.reason}`,i])).values()].map(i=>html`<li>${tx('قرض','Loan')} <button class="oa-link" data-analytics-loan="${i.loan.id}">${i.loan.id}</button>: ${i.reason==='payments'?tx('دفعات غير مؤرخة أو غير متطابقة مع إجمالي المدفوع؛ الأرصدة التاريخية قد تكون غير مكتملة.','Undated payments or mismatch with paid total; historical balances may be incomplete.'):i.reason==='date'?tx('تاريخ القرض مفقود أو غير صالح؛ مستبعد من التحليل.','Missing or invalid loan date; excluded.'):i.reason==='amended'?tx('تم تعديل فترة السداد؛ يستخدم التحليل الشروط الحالية.','Repayment period amended; current terms used.'):tx('جدول استحقاق غير مكتمل؛ راجع المدة والقسط.','Incomplete schedule; review term and installment.')}</li>`))}</ul>`:html`<p>${tx('لم تظهر ملاحظات على اتساق سجلات الدفعات والجداول المشمولة.','No payment or schedule consistency issues detected in included records.')}</p>`}</details>
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

