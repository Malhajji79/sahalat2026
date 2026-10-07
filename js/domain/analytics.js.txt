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
        const amount=i===months-1?total-offset:Math.min(installment,total-offset);
        const covered=Math.min(amount,Math.max(0,paid-offset));
        const onTime=Math.min(amount,Math.max(0,paidAt(due)-offset));
        schedule.push({due,amount,covered,onTime:due<=end?onTime:0,unpaid:Math.max(0,amount-covered),offset});offset+=amount;
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
    const overdue=schedule.filter(s=>s.due<end&&s.unpaid>0.005);
    rows.push({loan,origin,schedule,periodDues,dated,incomplete,collected,owner,lent:inRange(origin)?Number(loan.amount||0):0,
      due:periodDues.reduce((s,d)=>s+d.amount,0),covered:periodDues.reduce((s,d)=>s+d.covered,0),onTime:periodDues.reduce((s,d)=>s+d.onTime,0),
      outstanding:Math.max(0,total-paid),overdue:overdue.reduce((s,d)=>s+d.unpaid,0),lateDays:overdue.length?Math.max(...overdue.map(s=>ownerAnalyticsDays(s.due,end))):0,
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
    const matches=current.rows.map(r=>({r,amount:r.schedule.filter(s=>{const days=ownerAnalyticsDays(s.due,context.end);return days>=b.min&&days<=b.max;}).reduce((sum,s)=>sum+s.unpaid,0)})).filter(x=>x.amount>0.005);
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
