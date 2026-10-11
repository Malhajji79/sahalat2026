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



function analyticsColor(index, alpha=1){
  const palette=[
    [16,111,137],[34,158,143],[36,83,161],[233,159,54],[114,88,163],[207,105,85],[68,139,187],[122,153,77],[83,105,133],[177,119,150]
  ];
  const c=palette[index%palette.length];
  return alpha===1?`rgb(${c[0]},${c[1]},${c[2]})`:`rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}
function analyticsSimpleDonut(items,title,subtitle=''){
  const clean=(items||[]).map(x=>({label:x.label,value:Number(x.value||0)})).filter(x=>x.value>0.005);
  const total=clean.reduce((s,x)=>s+x.value,0);
  if(total<=0)return html`<div class="muted">${tx('لا توجد بيانات كافية للرسم.','Not enough data to display the chart.')}</div>`;
  let offset=0;
  const gradient=clean.map((x,i)=>{const start=offset;const pct=x.value/total*100;offset+=pct;return `${analyticsColor(i)} ${start}% ${offset}%`;}).join(', ');
  return html`<div style="display:grid;grid-template-columns:minmax(190px,.9fr) minmax(220px,1.1fr);gap:18px;align-items:center">
    <div style="display:grid;place-items:center">
      <div style="width:170px;height:170px;border-radius:50%;background:conic-gradient(${gradient});display:grid;place-items:center;box-shadow:inset 0 0 0 1px rgba(15,23,42,.06)">
        <div style="width:92px;height:92px;border-radius:50%;background:#fff;display:grid;place-items:center;text-align:center;padding:8px;box-shadow:0 1px 8px rgba(15,23,42,.08)">
          <div style="font-size:12px;font-weight:800;color:#475569;line-height:1.3">${title}</div>
          <div style="font-size:14px;font-weight:900;color:#0f172a">${wholeMoney(total)}</div>
          ${subtitle?html`<div class="small muted" style="line-height:1.2">${subtitle}</div>`:''}
        </div>
      </div>
    </div>
    <div style="display:grid;gap:10px">
      ${htmlJoin(clean.map((x,i)=>html`<div style="display:grid;grid-template-columns:minmax(80px,1fr) auto auto;gap:10px;align-items:center">
        <span style="display:flex;align-items:center;gap:8px"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${analyticsColor(i)}"></span>${x.label}</span>
        <strong>${wholeMoney(x.value)}</strong>
        <span class="small muted">${percentDisplay(x.value/total*100,1)}</span>
      </div>`))}
    </div>
  </div>`;
}
function analyticsPie(items,title){
  const clean=(items||[]).map(x=>({label:x.label,value:Number(x.value||0)})).filter(x=>x.value>0.005);
  const total=clean.reduce((s,x)=>s+x.value,0);
  if(total<=0)return html`<div class="muted">${tx('لا توجد بيانات كافية للرسم.','Not enough data to display the chart.')}</div>`;
  let offset=0;
  const gradient=clean.map((x,i)=>{const start=offset;const pct=x.value/total*100;offset+=pct;return `${analyticsColor(i)} ${start}% ${offset}%`;}).join(', ');
  return html`<div style="display:grid;grid-template-columns:minmax(190px,.9fr) minmax(220px,1.1fr);gap:18px;align-items:center">
    <div style="display:grid;place-items:center">
      <div style="width:170px;height:170px;border-radius:50%;background:conic-gradient(${gradient});display:grid;place-items:center;text-align:center;box-shadow:inset 0 0 0 1px rgba(15,23,42,.06)">
        <div style="background:rgba(255,255,255,.78);padding:8px 10px;border-radius:14px;backdrop-filter:blur(4px)">
          <div style="font-size:12px;font-weight:800;color:#475569;line-height:1.3">${title}</div>
          <div style="font-size:14px;font-weight:900;color:#0f172a">${wholeMoney(total)}</div>
        </div>
      </div>
    </div>
    <div style="display:grid;gap:10px">
      ${htmlJoin(clean.map((x,i)=>html`<div style="display:grid;grid-template-columns:minmax(80px,1fr) auto auto;gap:10px;align-items:center">
        <span style="display:flex;align-items:center;gap:8px"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${analyticsColor(i)}"></span>${x.label}</span>
        <strong>${wholeMoney(x.value)}</strong>
        <span class="small muted">${percentDisplay(x.value/total*100,1)}</span>
      </div>`))}
    </div>
  </div>`;
}
function analyticsTreemap(items,title,valueLabel){
  const clean=(items||[]).map(x=>({id:x.id,label:x.label||'—',value:Number(x.value||0),note:x.note||'',button:x.button||''})).filter(x=>x.value>0.005).sort((a,b)=>b.value-a.value);
  const total=clean.reduce((s,x)=>s+x.value,0);
  if(total<=0)return html`<div class="muted">${tx('لا توجد بيانات كافية للرسم.','Not enough data to display the chart.')}</div>`;
  return html`<div><div class="small muted" style="margin-bottom:10px">${title}</div><div style="display:flex;flex-wrap:wrap;gap:10px;align-items:stretch">
    ${htmlJoin(clean.map((x,i)=>{const pct=x.value/total*100; const basis=Math.max(140, Math.min(420, pct*6)); return html`<button type="button" data-analytics-user="${x.id||''}" style="flex:${Math.max(1,pct)} 1 ${basis}px;min-height:108px;border:1px solid rgba(15,23,42,.08);border-radius:18px;padding:14px;background:${analyticsColor(i,.14)};text-align:${state.lang==='en'?'left':'right'};display:grid;gap:7px;cursor:${x.id?'pointer':'default'}">
      <span class="small" style="font-weight:800;color:${analyticsColor(i)}">${x.label}</span>
      <strong style="font-size:clamp(1.05rem,1.8vw,1.5rem);color:#0f172a">${wholeMoney(x.value)}</strong>
      <span class="small muted">${percentDisplay(pct,1)} · ${valueLabel}</span>
      ${x.note?html`<span class="small muted">${x.note}</span>`:''}
    </button>`;}))}
  </div></div>`;
}
function analyticsSourceTable(rows){
  return html`<div class="table-wrap"><table><thead><tr><th>${tx('العنصر','Item')}</th><th>${tx('المصدر / المرجع','Source / Reference')}</th><th>${tx('طريقة الاستخدام','How it is used')}</th></tr></thead><tbody>${htmlJoin(rows.map(r=>html`<tr><td>${r.item}</td><td>${r.source}</td><td>${r.use}</td></tr>`))}</tbody></table></div>`;
}
function analyticsView(){
  if(ownerAnalyticsYears().length&&!ownerAnalyticsYears().some(y=>Number(y.year)===2026))return html`<div class="card"><h3>${tx('يلزم تحديد بداية السنة التحصيلية 2026','Collection year 2026 start date required')}</h3><p>${tx('أضف حدود السنة التحصيلية 2026 في إعدادات السنوات لتطبيق مهلة السداد الصحيحة؛ لن نستخدم بداية السنة الميلادية بدلًا منها.','Configure collection year 2026 boundaries to apply the correct payment grace period; the calendar year is not used as a substitute.')}</p></div>`;
  const model=ownerAnalyticsModel();
  if(!model.year)return html`<div class="card"><h3>${tx('أضف السنوات التحصيلية أولًا','Configure collection years first')}</h3><p>${tx('تحتاج التحليلات إلى تاريخ بداية ونهاية معتمد لكل سنة تحصيلية.','Analytics requires approved start and end dates for each collection year.')}</p></div>`;
  const {current:c}=model;
  const date=d=>dateDisplay(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`);
  const allLoans=state.loans.filter(l=>['active','closed'].includes(l.dbStatus));
  const userIds=[...new Set(allLoans.map(l=>String(l.assignedUserId||'')))];
  const userOptions=userIds.map(id=>({id,name:state.users.find(u=>String(u.id)===id)?.username||allLoans.find(l=>String(l.assignedUserId||'')===id)?.assignedUser||'—'}));
  const types=[...new Set(allLoans.map(l=>l.type).filter(Boolean))];
  const detailKey=state.analyticsDetail||'overdue';
  const detailLabels={collected:tx('التحصيل خلال السنة','Collections in year'),due:tx('الاستحقاقات خلال السنة','Dues in year'),covered:tx('المغطى من استحقاقات السنة','Year dues covered'),overdue:tx('المتأخرات بنهاية السنة','Overdue at year end'),outstanding:tx('الرصيد المتبقي بنهاية السنة','Outstanding at year end'),owner:tx('حق المالك المحقق خلال السنة','Owner share realized in year')};
  const ageBucket=detailKey==='overdue'&&Number.isInteger(state.analyticsAging)?model.aging[state.analyticsAging]:null;
  const detailRows=c.rows.map(r=>ageBucket?{...r,overdue:r.schedule.filter(s=>{const days=ownerAnalyticsDays(s.deadline,model.end);return days>=ageBucket.min&&days<=ageBucket.max;}).reduce((s,d)=>s+d.unpaid,0)}:r).filter(r=>r[detailKey]>0.005).sort((a,b)=>b[detailKey]-a[detailKey]);
  const maxBar=Math.max(1,...model.buckets.flatMap(b=>[b.due,b.collected]));
  const issues=[...c.issues];
  const yearDuration=Math.max(1,ownerAnalyticsDays(model.year.start,model.year.end)+1);
  const elapsedPct=Math.max(0,Math.min(100,model.days/yearDuration*100));
  const totalPaymentsConsidered=c.rows.reduce((sum,r)=>sum+r.dated.filter(p=>p.date<=model.end).length,0);
  const byType=[...new Set(c.rows.map(r=>r.loan.type||'normal'))].map(type=>{
    const rows=c.rows.filter(r=>(r.loan.type||'normal')===type);
    return {type,label:displayLoanType(type),count:rows.length,collected:rows.reduce((s,r)=>s+r.collected,0),due:rows.reduce((s,r)=>s+r.due,0),overdue:rows.reduce((s,r)=>s+r.overdue,0),outstanding:rows.reduce((s,r)=>s+r.outstanding,0)};
  }).sort((a,b)=>b.outstanding-a.outstanding);
  const collectionMix=[
    {label:tx('استحقاقات السنة','Year dues'),value:c.currentCollected},
    {label:tx('متأخرات أقدم','Older arrears'),value:c.arrearsCollected},
    {label:tx('دفعات مقدمة','Prepayments'),value:c.advanceCollected},
    {label:tx('غير موزع','Unallocated'),value:Math.max(0,c.collected-c.currentCollected-c.arrearsCollected-c.advanceCollected)}
  ].filter(x=>x.value>0.005);
  const agingMix=model.aging.map(b=>({label:`${b.label} ${tx('يوم','days')}`,value:b.value})).filter(x=>x.value>0.005);
  const typeMix=byType.map(t=>({label:t.label,value:t.collected})).filter(x=>x.value>0.005);
  const userTreemapCollected=model.users.map(u=>({id:u.id,label:u.name,value:u.collected,note:`${tx('المستحق','Due')}: ${wholeMoney(u.due)}`,button:`data-analytics-user="${u.id}"`}));
  const userTreemapOutstanding=model.users.map(u=>({id:u.id,label:u.name,value:u.outstanding,note:`${tx('المتأخرات','Overdue')}: ${wholeMoney(u.overdue)}`,button:`data-analytics-user="${u.id}"`}));
  const sourceRows=[
    {item:tx('حدود السنة التحصيلية المختارة','Selected collection year boundaries'),source:tx('جدول السنوات التحصيلية Collection Years','Collection Years table'),use:`${date(model.year.start)} — ${date(model.year.end)}`},
    {item:tx('القروض المشمولة','Included loans'),source:tx('القروض المعتمدة النشطة والمغلقة','Approved active and closed loans'),use:`${arNum(c.rows.length)} ${tx('قرض','loans')} · ${state.analyticsType?displayLoanType(state.analyticsType):tx('كل الأنواع','All types')}`},
    {item:tx('الدفعات المستخدمة','Payments used'),source:tx('سجل الدفعات المؤرخ حتى نهاية السنة','Dated payments up to year end'),use:`${arNum(totalPaymentsConsidered)} ${tx('سجل','records')}`},
    {item:tx('إنشاء الاستحقاقات','Installment schedule generation'),source:tx('تاريخ القرض + المدة + القسط + إجمالي القرض','Loan date + term + installment + total amount'),use:tx('لتحديد المستحق، المتأخر، والتغطية في الموعد','Used to derive due, overdue, and on-time coverage')},
    {item:tx('حق المالك المحقق','Realized owner share'),source:tx('قاعدة التوزيع التناسبي المعتمدة في النظام','System proportional allocation rule'),use:tx('يُحسب من التحصيل داخل السنة فقط','Calculated from collections within the selected year only')},
    {item:tx('جودة البيانات','Data quality notes'),source:tx('فحص السجلات غير المؤرخة أو غير المتطابقة','Undated or inconsistent record checks'),use:`${arNum(new Set(issues.map(i=>i.loan.dbId||i.loan.id)).size)} ${tx('قرض متأثر','affected loans')}`}
  ];
  const metric=(key,label,note)=>html`<button type="button" class="card oa-metric" data-analytics-detail="${key}" aria-controls="analyticsDetails"><span class="muted">${label}</span><strong>${key==='rate'?percentDisplay(c.rate||0,1):wholeMoney(c[key])}</strong><span class="oa-change">${key==='rate'?tx('السداد في الموعد من استحقاقات السنة','On-time share of year dues'):tx('سنة تحصيلية مستقلة دون مقارنة','Standalone collection year view')}</span><span class="small muted">${note}</span></button>`;
  return html`<div class="analytics-dashboard oa-dashboard">
    <section class="card oa-heading"><div><div class="oa-eyebrow">${tx('التحليلات السنوية','ANNUAL ANALYTICS')}</div><h2>${tx('تحليل كل سنة تحصيلية بشكل مستقل','One Collection Year at a Time')}</h2><p class="muted">${tx('هذه اللوحة تعرض السنة التحصيلية المختارة فقط، دون مقارنتها تلقائيًا بسنوات أخرى. كل الرسومات والمجاميع موثقة بمراجع البيانات المستخدمة.','This dashboard shows the selected collection year only, without automatic year-to-year comparison. Every chart and figure includes a reference to the underlying data.')}</p></div><span class="small muted">${tx('وقت العرض','Viewed at')}: ${date(new Date())}</span></section>
    <section class="card" style="padding:14px 18px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between"><div><strong>${tx('تصدير تحليل السنة المختارة','Export selected collection year')}</strong><div class="small muted">${tx('يتضمن الفلاتر والبيانات والمصادر.','Includes filters, values and data references.')}</div></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="btn btn-primary" id="analyticsExportPdf">${tx('تصدير PDF','Export PDF')}</button><button type="button" class="btn btn-secondary" id="analyticsExportExcel">${tx('تصدير Excel','Export Excel')}</button></div></section>
    <section class="card oa-filters" aria-label="${tx('فلاتر التحليلات','Analytics filters')}">
      <div class="field"><label for="analyticsYear">${tx('السنة التحصيلية','Collection year')}</label><select id="analyticsYear">${htmlJoin(model.years.map(y=>html`<option value="${y.year}" ${String(y.year)===String(model.year.year)?'selected':''}>${arNum(y.year)}</option>`))}</select></div>
      <div class="field"><label for="analyticsUser">${tx('المستخدم','User')}</label><select id="analyticsUser"><option value="">${tx('جميع المستخدمين','All users')}</option>${htmlJoin(userOptions.map(u=>html`<option value="${u.id}" ${String(state.analyticsUser||'')===u.id?'selected':''}>${u.name}</option>`))}</select></div>
      <div class="field"><label for="analyticsType">${tx('نوع القرض','Loan type')}</label><select id="analyticsType"><option value="">${tx('جميع الأنواع','All types')}</option>${htmlJoin(types.map(type=>html`<option value="${type}" ${state.analyticsType===type?'selected':''}>${displayLoanType(type)}</option>`))}</select></div>
      <div class="field"><label for="analyticsSort">${tx('ترتيب المستخدمين','User ranking')}</label><select id="analyticsSort">${htmlJoin([['overdue',tx('الأعلى تأخرًا','Highest overdue')],['rate',tx('الأفضل التزامًا','Best on-time coverage')],['collected',tx('الأعلى تحصيلًا','Highest collections')],['outstanding',tx('الأكبر رصيدًا','Largest outstanding')]].map(([key,label])=>html`<option value="${key}" ${(state.analyticsSort||'overdue')===key?'selected':''}>${label}</option>`))}</select></div>
    </section>
    <section class="card" style="padding:18px">
      <div class="oa-section-title"><h3>${tx('مرجع السنة التحصيلية المختارة','Reference for the Selected Collection Year')}</h3><span class="small muted">${tx('السنة تعرض بشكل مستقل','Standalone year view')}</span></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;margin-bottom:14px">
        <div><div class="small muted">${tx('الفترة','Period')}</div><strong>${date(model.year.start)} — ${date(model.year.end)}</strong></div>
        <div><div class="small muted">${tx('المدة المنقضية','Elapsed')}</div><strong>${arNum(model.days)} / ${arNum(yearDuration)} ${tx('يوم','days')}</strong></div>
        <div><div class="small muted">${tx('القروض المشمولة','Included loans')}</div><strong>${arNum(c.rows.length)}</strong></div>
        <div><div class="small muted">${tx('سجلات الدفعات المستخدمة','Payment records used')}</div><strong>${arNum(totalPaymentsConsidered)}</strong></div>
      </div>
      <div style="height:12px;background:#e2e8f0;border-radius:999px;overflow:hidden"><div style="height:100%;width:${elapsedPct}%;background:linear-gradient(90deg,#2563eb,#0ea5e9)"></div></div>
      <div class="small muted" style="margin-top:7px">${tx('نسبة التقدم داخل السنة التحصيلية حتى تاريخ العرض.','Progress through the selected collection year as of the viewing date.')}</div>
    </section>
    ${issues.length?html`<div class="oa-warning" role="status">${tx('تحتاج بعض البيانات إلى مراجعة؛ المؤشرات المعتمدة عليها تقديرية.','Some records need review; affected indicators are estimates.')} ${tx('عدد القروض المتأثرة','Affected loans')}: ${arNum(new Set(issues.map(i=>i.loan.dbId||i.loan.id)).size)}. <a href="#analyticsQuality">${tx('عرض الملاحظات','View notes')}</a></div>`:''}
    <section class="oa-kpis">
      ${metric('lent',tx('الإقراض الجديد خلال السنة','New lending in year'),tx('مبالغ القروض المنشأة داخل حدود السنة التحصيلية','Loan principals created inside the selected collection year'))}
      ${metric('due',tx('المستحق خلال السنة','Due in year'),tx('إجمالي الأقساط المجدولة داخل هذه السنة التحصيلية','Installments scheduled within this collection year'))}
      ${metric('collected',tx('المحصل خلال السنة','Collected in year'),tx('جميع الدفعات المؤرخة داخل هذه السنة التحصيلية','All payments dated within the selected collection year'))}
      ${metric('rate',tx('نسبة السداد في الموعد','On-time coverage'),tx('مقارنة السداد في الموعد باستحقاقات السنة فقط','On-time payment coverage of year dues only'))}
      ${metric('overdue',tx('المتأخرات بنهاية السنة','Overdue at year end'),tx('الجزء غير المسدد بعد انتهاء مهلة القسط','Unpaid amounts after installment deadline'))}
      ${metric('outstanding',tx('الرصيد المتبقي بنهاية السنة','Outstanding at year end'),tx('أصل وفائدة غير محصلين حتى نهاية السنة','Uncollected principal and profit by year end'))}
      ${metric('owner',tx('حق المالك المحقق خلال السنة','Realized owner share in year'),tx('محسوب من التحصيل داخل السنة وفق القاعدة المعتمدة','Computed from in-year collections using the approved rule'))}
    </section>
    <div class="oa-two-columns">
      <section class="card"><h3>${tx('الاستحقاقات والتحصيل شهريًا','Monthly dues and collections')}</h3><p class="small muted">${tx('الأزرق = المستحقات الشهرية، الأخضر = التحصيل النقدي الفعلي بالتاريخ المسجل.','Blue = monthly dues, green = actual cash collections by recorded payment date.')}</p><div class="oa-chart">${model.buckets.length?htmlJoin(model.buckets.map(b=>html`<div class="oa-chart-row"><strong>${arNum(b.date.getFullYear())}/${arNum(b.date.getMonth()+1)}</strong><div class="oa-chart-pair"><div><span class="oa-bar-track"><span class="oa-bar oa-due" style="width:${b.due/maxBar*100}%"></span></span><span>${wholeMoney(b.due)}</span></div><div><span class="oa-bar-track"><span class="oa-bar oa-collected" style="width:${b.collected/maxBar*100}%"></span></span><span>${wholeMoney(b.collected)}</span></div></div></div>`)):html`<p class="muted">${tx('لا توجد فترة منقضية بعد.','No elapsed period yet.')}</p>`}</div></section>
      <section class="card"><h3>${tx('مصدر التحصيل داخل السنة','Collection source mix')}</h3><p class="small muted">${tx('يوضح هل جاء التحصيل لتغطية استحقاقات السنة أم متأخرات أقدم أم دفعات مقدمة.','Shows whether collections covered current-year dues, older arrears, or prepayments.')}</p>${analyticsSimpleDonut(collectionMix,tx('التحصيل','Collections'))}</section>
    </div>
    <div class="oa-two-columns">
      <section class="card"><h3>${tx('أعمار المتأخرات','Overdue aging')}</h3><p class="small muted">${tx('القيم موزعة حسب عدد أيام التأخر بعد انتهاء المهلة الفعلية للقسط.','Values are grouped by overdue days after the actual payment grace deadline.')}</p>${analyticsPie(agingMix,tx('المتأخرات','Overdue'))}<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:16px">${htmlJoin(model.aging.map((b,i)=>html`<button class="card" style="padding:12px;border:1px solid rgba(15,23,42,.07)" data-analytics-aging="${i}"><div class="small muted">${b.label} ${tx('يوم','days')}</div><strong>${wholeMoney(b.value)}</strong><span class="small muted">${arNum(b.count)} ${tx('قرض','loans')}</span></button>`))}</div></section>
      <section class="card"><h3>${tx('توزيع التحصيل حسب نوع القرض','Collections by loan type')}</h3><p class="small muted">${tx('المرجع: نوع القرض المحفوظ في كل قرض مشمول ضمن فلاتر السنة.','Reference: loan type stored on each included loan within the selected filters.')}</p>${analyticsSimpleDonut(typeMix,tx('حسب النوع','By type'),tx('تحصيل','Collections'))}</section>
    </div>
    <div class="oa-two-columns">
      <section class="card"><h3>${tx('مخطط هيكلي لتحصيل المستخدمين','Treemap of user collections')}</h3><p class="small muted">${tx('كل مربع يمثل حصة المستخدم من التحصيل داخل السنة. اضغط اسم المستخدم لتصفية اللوحة عليه.','Each tile represents the user’s share of collections within the year. Click a user tile to filter the dashboard.')}</p>${analyticsTreemap(userTreemapCollected,tx('تحصيل المستخدمين','User collections'),tx('من تحصيل السنة','of year collections'))}</section>
      <section class="card"><h3>${tx('مخطط هيكلي للرصيد المتبقي','Treemap of outstanding balance')}</h3><p class="small muted">${tx('كل مربع يمثل الرصيد المتبقي لكل مستخدم عند نهاية السنة التحصيلية.','Each tile represents the outstanding balance for a user at the end of the selected collection year.')}</p>${analyticsTreemap(userTreemapOutstanding,tx('الرصيد المتبقي','Outstanding balance'),tx('بنهاية السنة','at year end'))}</section>
    </div>
    <section class="card"><div class="oa-section-title"><h3>${tx('أداء المستخدمين في السنة المختارة','User performance in the selected year')}</h3><span class="small muted">${tx('الجدول مرجعي لكل الرسومات السابقة','This table is the reference behind the charts above')}</span></div><div class="table-wrap"><table><thead><tr><th>${tx('المستخدم','User')}</th><th>${tx('المستحق','Due')}</th><th>${tx('المحصل نقدًا','Cash collected')}</th><th>${tx('السداد في الموعد','On-time coverage')}</th><th>${tx('المتأخرات','Overdue')}</th><th>${tx('الرصيد المتبقي','Outstanding')}</th><th>${tx('حق المالك المحقق','Realized owner share')}</th><th>${tx('القروض ذات الرصيد','Loans with balance')}</th></tr></thead><tbody>${model.users.length?htmlJoin(model.users.map(u=>html`<tr><td><button class="oa-link" data-analytics-user="${u.id}">${u.name}</button></td><td>${wholeMoney(u.due)}</td><td>${wholeMoney(u.collected)}</td><td>${u.rate===null?'—':percentDisplay(u.rate,1)}</td><td>${wholeMoney(u.overdue)}</td><td>${wholeMoney(u.outstanding)}</td><td>${wholeMoney(u.owner)}</td><td>${arNum(u.activeCount)}</td></tr>`)):html`<tr><td colspan="8">${tx('لا توجد قروض مطابقة.','No matching loans.')}</td></tr>`}</tbody></table></div></section>
    <section class="card"><div class="oa-section-title"><h3>${tx('مرجع حسب نوع القرض','Reference by loan type')}</h3><span class="small muted">${tx('يدعم قراءة واضحة لكل نوع في السنة المختارة','Clear breakdown for each type in the selected year')}</span></div><div class="table-wrap"><table><thead><tr><th>${tx('نوع القرض','Loan type')}</th><th>${tx('عدد القروض','Loans')}</th><th>${tx('المستحق','Due')}</th><th>${tx('المحصل','Collected')}</th><th>${tx('المتأخرات','Overdue')}</th><th>${tx('الرصيد المتبقي','Outstanding')}</th></tr></thead><tbody>${byType.length?htmlJoin(byType.map(t=>html`<tr><td>${t.label}</td><td>${arNum(t.count)}</td><td>${wholeMoney(t.due)}</td><td>${wholeMoney(t.collected)}</td><td>${wholeMoney(t.overdue)}</td><td>${wholeMoney(t.outstanding)}</td></tr>`)):html`<tr><td colspan="6">${tx('لا توجد بيانات مطابقة.','No matching data.')}</td></tr>`}</tbody></table></div></section>
    <section class="card" id="analyticsDetails" tabindex="-1"><div class="oa-section-title"><h3>${(detailLabels[detailKey]||detailLabels.overdue)+(ageBucket?' · '+ageBucket.label+' '+tx('يوم','days'):'')}</h3><span class="small muted">${tx('اضغط بطاقة أو فئة تأخر لعرض القروض المكونة للمبلغ.','Select a metric card or aging bucket to inspect the underlying loans.')}</span></div><div class="table-wrap"><table><thead><tr><th>${tx('القرض','Loan')}</th><th>${tx('المستفيد','Beneficiary')}</th><th>${tx('المستخدم','User')}</th><th>${tx('المبلغ','Amount')}</th><th>${tx('أقدم تأخر بالأيام','Oldest overdue days')}</th><th>${tx('آخر سداد','Last payment')}</th></tr></thead><tbody>${detailRows.length?htmlJoin(detailRows.map(r=>{const latest=r.dated.filter(d=>d.date<=model.end).at(-1);return html`<tr><td><button class="btn btn-secondary" data-analytics-loan="${r.loan.id}">${r.loan.id}</button></td><td>${r.loan.beneficiary}</td><td>${r.loan.assignedUser||'—'}</td><td>${wholeMoney(r[detailKey])}</td><td>${arNum(r.lateDays)}</td><td>${latest?date(latest.date):'—'}</td></tr>`;})):html`<tr><td colspan="6">${tx('لا توجد حالات مطابقة.','No matching records.')}</td></tr>`}</tbody></table></div></section>
    <details class="card" open><summary>${tx('مرجع كل المعلومات المستخدمة','Reference for all information used')}</summary><p class="small muted">${tx('الجدول التالي يوضح مصدر كل رقم أو رسم وطريقة اشتقاقه داخل سهالات.','The following table identifies the source and derivation of each number and chart in Sahalat.')}</p>${analyticsSourceTable(sourceRows)}</details>
    <details class="card" id="analyticsQuality"><summary>${tx('طريقة الحساب وجودة البيانات','Method and data quality')}</summary><p>${tx('الاستحقاق الأول يوم 5 من الشهر التالي للقروض المؤرخة من 1 إلى 25، وبعد شهرين للقروض المؤرخة من 26 إلى نهاية الشهر. قبل بداية السنة التحصيلية 2026 تكون المهلة حتى يوم 10 شاملًا؛ من بدايتها حتى يوم 5 شاملًا. يبدأ التأخر في اليوم التالي للمهلة، ويحتفظ القسط السابق لبداية السنة بمهلته الأصلية. فرق التصفية مضاف إلى القسط الأخير لأغراض التحليل. توزع الدفعات على أقدم استحقاق أولًا؛ هذا توزيع تحليلي لا يغيّر السجلات.','First due date is day 5 of the next month for loans dated 1–25, or the second following month for loans dated 26 onward. Before collection year 2026 begins, payment is on time through day 10 inclusive; from that boundary, through day 5 inclusive. Lateness starts the following day. Earlier installments retain their original grace. Settlement remainder is included in the last installment for analysis. Payments are allocated oldest due first; records are not changed.')}</p><p>${tx('اللوحة الحالية سنوية وليست مقارنة تلقائية بين السنوات. عند اختيار سنة أخرى تتغير جميع الرسومات والمرجع تبعًا لها. تعديل شروط قرض أو حذف دفعة لاحقًا قد يغير نتائج السنوات السابقة لأنها ليست لقطة أرشيفية مجمدة. عند غياب تاريخ الدفع يستخدم تاريخ تسجيله. حق المالك المحقق محسوب بالتناسب مع التحصيل وفق قاعدة النظام.','The current dashboard is annual and not an automatic comparison between years. When another year is selected, all charts and references update accordingly. Later term changes or payment deletions may alter past results because this is not a frozen archival snapshot. Registration date is used when payment date is absent. Realized owner share follows the system’s proportional collection rule.')}</p>${issues.length?html`<ul>${htmlJoin([...new Map(issues.map(i=>[`${i.loan.id}:${i.reason}`,i])).values()].map(i=>html`<li>${tx('قرض','Loan')} <button class="oa-link" data-analytics-loan="${i.loan.id}">${i.loan.id}</button>: ${i.reason==='payments'?tx('دفعات غير مؤرخة أو غير متطابقة مع إجمالي المدفوع؛ الأرصدة التاريخية قد تكون غير مكتملة.','Undated payments or mismatch with paid total; historical balances may be incomplete.'):i.reason==='date'?tx('تاريخ القرض مفقود أو غير صالح؛ مستبعد من التحليل.','Missing or invalid loan date; excluded.'):i.reason==='amended'?tx('تم تعديل فترة السداد؛ يستخدم التحليل الشروط الحالية.','Repayment period amended; current terms used.'):tx('جدول استحقاق غير مكتمل؛ راجع المدة والقسط.','Incomplete schedule; review term and installment.')}</li>`))}</ul>`:html`<p>${tx('لم تظهر ملاحظات على اتساق سجلات الدفعات والجداول المشمولة.','No payment or schedule consistency issues detected in included records.')}</p>`}</details>
  </div>`;
}


// Current collection year targets come from the same database-backed expected-interest
// records used on individual dashboards and in the annual profit report.
function managerCurrentCollectionYearTargetsView(){
  const users=(state.users||[]).filter(u=>u.dbRole!=='admin'&&u.role!=='أدمن');
  const today=new Date();
  const current=(state.collectionYears||[]).find(y=>{
    const start=ownerAnalyticsDay(y.startDate),end=ownerAnalyticsDay(y.endDate);
    return start&&end&&start<=today&&today<=end;
  });
  if(!current)return html`<div class="card" style="margin-top:20px">
    <h3>${tx('المستهدف للسنة التحصيلية الحالية','Current Collection Year Targets')}</h3>
    <p class="muted">${tx('لا توجد سنة تحصيلية حالية معرفة في التقويم؛ يرجى مراجعة إعدادات السنوات.','No collection year covers today; check the configured collection calendar.')}</p>
  </div>`;
  const expected=new Map((state.expectedInterestByCollectionYear||[])
    .filter(r=>Number(r.collectionYear)===Number(current.year))
    .map(r=>[String(r.userId),r]));
  const rows=users.map(user=>{
    const target=expected.get(String(user.id));
    return {name:user.username,userShare:Number(target?.userShare||0),ownerShare:Number(target?.ownerShare||0)};
  });
  const sum=key=>rows.reduce((total,r)=>total+r[key],0);
  return html`<div class="card" style="margin-top:20px">
    <h3>${tx('المبلغ المستهدف لكل مستخدم للسنة التحصيلية الحالية','Current Collection Year Target by User')} — ${arNum(current.year)}</h3>
    <p class="small muted">${dateDisplay(current.startDate)} — ${dateDisplay(current.endDate)} · ${tx('الفوائد المستهدفة فقط، وليست المبالغ المحصلة أو المحققة. تشمل المجاميع المستخدمين غير النشطين ذوي السجلات.','Expected interest shares only, not collected or realized amounts. Totals include inactive users with records.')}</p>
    <div class="table-wrap"><table style="width:100%;min-width:620px">
      <thead><tr>
        <th>${tx('المستخدم','User')}</th>
        <th>${tx('المستهدف للمستخدم','Target User Share')}</th>
        <th>${tx('المستهدف للمالك','Target Owner Share')}</th>
        <th>${tx('إجمالي المستهدف','Total Target')}</th>
      </tr></thead>
      <tbody>
      ${htmlJoin(rows.map(r=>html`<tr>
        <td>${r.name}</td><td>${wholeMoney(r.userShare)}</td><td>${wholeMoney(r.ownerShare)}</td><td><strong>${wholeMoney(r.userShare+r.ownerShare)}</strong></td>
      </tr>`))}
      <tr style="background:#ecfdf5;font-weight:900">
        <td>${tx('الإجمالي','Total')}</td><td>${wholeMoney(sum('userShare'))}</td><td>${wholeMoney(sum('ownerShare'))}</td><td>${wholeMoney(sum('userShare')+sum('ownerShare'))}</td>
      </tr></tbody>
    </table></div>
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
          <div class="muted">${tx('مجموع حق المالك المحقق بعد خصم جميع التسويات السابقة','Total Realized Owner Share After All Previous Settlements')}</div>
          <div class="kpi" style="font-size:36px">${wholeMoney(m.remainingRealizedOwnerRight)}</div>
        </div>

        <div class="card" style="padding:28px">
          <div class="muted">${tx('مجموع حق المستخدم المحقق بعد خصم جميع التسويات السابقة','Total Realized User Share After All Previous Settlements')}</div>
          <div class="kpi" style="font-size:36px">${wholeMoney(m.remainingRealizedUserRight)}</div>
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
    </div>
    ${state.currentUser.role==='مدير مشروع' ? managerCurrentCollectionYearTargetsView() : ''}`;
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

