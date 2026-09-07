function analyticsUsers(){
  return state.users.filter(u=>u.dbStatus==='active' && u.dbRole!=='admin');
}
function analyticsLoanDate(l){
  if(l.loanDate) return new Date(l.loanDate+'T00:00:00');
  if(l.createdAt) return new Date(l.createdAt);
  return null;
}
function collectionYearDateRange(row){
  if(!row?.startDate || !row?.endDate) return null;
  return {
    start:new Date(row.startDate+'T00:00:00'),
    end:new Date(row.endDate+'T23:59:59')
  };
}
function analyticsPeriods(mode){
  const today=new Date();
  const loanDates=state.loans
    .filter(l=>['active','closed'].includes(l.dbStatus))
    .map(analyticsLoanDate)
    .filter(Boolean);
  const earliest=loanDates.length?new Date(Math.min(...loanDates.map(d=>d.getTime()))):null;

  const years=(state.collectionYears||[]).filter(y=>{
    const r=collectionYearDateRange(y);
    if(!r) return false;
    if(r.start>today) return false;
    if(earliest && r.end<earliest) return false;
    return true;
  });

  const periods=[];
  years.forEach(y=>{
    const r=collectionYearDateRange(y);
    if(mode==='half'){
      const totalDays=Math.floor((r.end-r.start)/(24*60*60*1000))+1;
      const firstDays=Math.ceil(totalDays/2);
      const midEnd=new Date(r.start);
      midEnd.setDate(midEnd.getDate()+firstDays-1);
      const secondStart=new Date(midEnd);
      secondStart.setDate(secondStart.getDate()+1);
      periods.push({key:`${y.year}-H1`,label:`${arNum(y.year)} - ${tx('النصف الأول','First Half')}`,year:y.year,half:1,start:r.start,end:new Date(midEnd.getFullYear(),midEnd.getMonth(),midEnd.getDate(),23,59,59)});
      periods.push({key:`${y.year}-H2`,label:`${arNum(y.year)} - ${tx('النصف الثاني','Second Half')}`,year:y.year,half:2,start:new Date(secondStart.getFullYear(),secondStart.getMonth(),secondStart.getDate()),end:r.end});
    }else{
      periods.push({key:String(y.year),label:arNum(y.year),year:y.year,start:r.start,end:r.end});
    }
  });
  return periods;
}
function analyticsPeriodMatch(d,p,mode){
  if(!d || !p?.start || !p?.end) return false;
  return d>=p.start && d<=p.end;
}
function analyticsExpectedForUser(u){
  const m=getUserAccountMetrics(u.username);
  return Number(m?.expectedMonthlyCollection||0);
}
function analyticsActualRecentForUser(u, months=6){
  const now=new Date(); const start=new Date(now.getFullYear(),now.getMonth()-months+1,1);
  return state.loans.filter(l=>l.assignedUserId===u.id && ['active','closed'].includes(l.dbStatus)).reduce((sum,l)=>sum+(l.payments||[]).reduce((s,p)=>{
    const d=p.paymentDate?new Date(p.paymentDate+'T00:00:00'):(p.createdAt?new Date(p.createdAt):null);
    return s+(d&&d>=start?Number(p.amount||0):0);
  },0),0);
}
function analyticsEffectiveness(u){
  const m=getUserAccountMetrics(u.username); if(!m) return {score:0,collectionRate:0,closeRate:0,activity:0};
  const expected6=analyticsExpectedForUser(u)*6;
  const actual6=analyticsActualRecentForUser(u,6);
  const collectionRate=expected6>0?Math.min(150,(actual6/expected6)*100):(actual6>0?100:0);
  const closeRate=m.totalCount?m.closedCount/m.totalCount*100:0;
  const maxLoans=Math.max(1,...analyticsUsers().map(x=>getUserAccountMetrics(x.username)?.totalCount||0));
  const activity=m.totalCount/maxLoans*100;
  // Main weight is actual collection versus expected collection, as agreed.
  const score=Math.min(100, collectionRate*.65 + closeRate*.20 + activity*.15);
  return {score,collectionRate,closeRate,activity,actual6,expected6};
}
