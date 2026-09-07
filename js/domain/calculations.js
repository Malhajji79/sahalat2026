const RATES = {
1:3.00,2:3.60,3:5.40,4:7.20,5:9.00,6:10.80,7:12.60,8:14.40,9:16.20,10:18.00,11:19.80,12:20.00,
13:20.58,14:21.17,15:21.75,16:22.33,17:22.92,18:23.50,19:24.08,20:24.67,21:25.25,22:25.83,23:26.42,24:27.00,
25:27.58,26:28.17,27:28.75,28:29.33,29:29.92,30:30.50,31:31.08,32:31.67,33:32.25,34:32.83,35:33.42,36:34.00
};



function calcLoan(amount, months, generalDiscount, userDiscount, adminDiscount, sharePercentages){
  // نحفظ الحساب الدقيق داخليًا، لكن العرض والسداد الدوري يكونان بالريال الصحيح فقط.
  const baseRate = RATES[months] || 0;
  const baseInterest = amount * baseRate/100;
  const afterGeneral = baseInterest * (1-generalDiscount/100);
  const userShare = Number(sharePercentages?.user ?? (state.userSharePercent||40)) / 100;
  const ownerShare = Number(sharePercentages?.owner ?? (state.ownerSharePercent||60)) / 100;
  const userGross = afterGeneral * userShare;
  const adminGross = afterGeneral * ownerShare;
  const userNet = userGross * (1-userDiscount/100);
  const adminNet = adminGross * (1-adminDiscount/100);
  const finalInterest = userNet + adminNet;
  const total = amount + finalInterest;

  // القسط الدوري بدون كسور: نأخذ الريال الصحيح.
  const installmentExact = months ? total/months : 0;
  const installment = whole(installmentExact);

  // مجموع الأقساط الصحيحة، ثم الفرق الحقيقي يذهب إلى مستحق التصفية الأخير.
  const scheduledWholePayments = installment * months;
  const settlementDue = Math.max(0, total - scheduledWholePayments);

  return {
    baseRate,baseInterest,afterGeneral,userGross,adminGross,userNet,adminNet,
    finalInterest,total,installmentExact,installment,scheduledWholePayments,settlementDue
  };
}




;
function canManageUsers(){ return state.currentUser?.role === 'أدمن'; }
function canChangeLimits(){ return ['أدمن','مدير مشروع'].includes(state.currentUser?.role); }

function canAccessAnalytics(){
  if(!state.currentUser) return false;
  if(state.currentUser.role==='مدير مشروع' || state.currentUser.role==='مدير المشروع') return true;
  if(state.currentUser.role==='أدمن') return state.adminAnalyticsEnabled===true;
  return false;
}


;
function calcRepaymentPeriodLoan(loan, months){
  // Repayment reviews retain the share policy effective on the loan issue date.
  const issueDate = String(loan.loanDate||'').slice(0,10);
  const shares = /^\d{4}-\d{2}-\d{2}$/.test(issueDate)
    ? (issueDate < '2026-01-12' ? {user:50,owner:50} : {user:40,owner:60})
    : undefined;
  return calcLoan(
    Number(loan.amount||0), months,
    Number(loan.generalDiscount||0),
    Number(loan.userDiscount||0),
    Number(loan.adminDiscount||0), shares
  );
}


;
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

;
function activeCapitalMovements(){
  return (state.capitalTransfers||[]).filter(t=>t.entryKind==='transfer' && t.status==='active');
}

function userCapitalMovementMetrics(user){
  const rows=activeCapitalMovements();
  let ownerToUser=0;
  let userToOwner=0;
  let userToUserIn=0;
  let userToUserOut=0;

  rows.forEach(t=>{
    if(t.dbType==='owner_to_user' && t.toUserId===user.id) ownerToUser+=Number(t.amount||0);
    if(t.dbType==='user_to_owner' && t.fromUserId===user.id) userToOwner+=Number(t.amount||0);
    if(t.dbType==='user_to_user'){
      if(t.toUserId===user.id) userToUserIn+=Number(t.amount||0);
      if(t.fromUserId===user.id) userToUserOut+=Number(t.amount||0);
    }
  });

  return {ownerToUser,userToOwner,userToUserIn,userToUserOut};
}

function realizedRightsForLoan(l){
  const totalDue=Number(l.total||0);
  const principal=Number(l.amount||0);
  const paid=Math.min(Number(l.paid||0),totalDue);
  const finalInterest=Math.max(0,Number(l.finalInterest||0));

  if(totalDue<=0 || paid<=0 || finalInterest<=0){
    return {user:0,owner:0,realizedInterest:0};
  }

  // Interest is realized proportionally to actual cash collected.
  const realizedInterest=Math.min(finalInterest, finalInterest*(paid/totalDue));
  const userTarget=Math.max(0,Number(l.userNet||0));
  const ownerTarget=Math.max(0,Number(l.adminNet||0));
  const targetSum=userTarget+ownerTarget;

  if(targetSum<=0) return {user:0,owner:0,realizedInterest};

  return {
    user:realizedInterest*(userTarget/targetSum),
    owner:realizedInterest*(ownerTarget/targetSum),
    realizedInterest
  };
}


;
function getUserAccountMetrics(username){
  const u=state.users.find(x=>x.username===username);
  if(!u) return null;

  const approvedLoans=state.loans.filter(l=>
    l.assignedUserId===u.id &&
    ['active','closed'].includes(l.dbStatus)
  );
  const activeLoans=approvedLoans.filter(l=>l.dbStatus==='active');
  const closedLoans=approvedLoans.filter(l=>l.dbStatus==='closed');

  const totalLent=approvedLoans.reduce((s,l)=>s+Number(l.amount||0),0);
  const totalCollected=approvedLoans.reduce((s,l)=>s+Number(l.paid||0),0);
  const totalOutstanding=approvedLoans.reduce((s,l)=>s+Math.max(0,Number(l.total||0)-Number(l.paid||0)),0);
  const targetUserRight=approvedLoans.reduce((s,l)=>s+Number(l.userNet||0),0);
  const targetOwnerRight=approvedLoans.reduce((s,l)=>s+Number(l.adminNet||0),0);

  let realizedUserRight=0;
  let realizedOwnerRight=0;
  approvedLoans.forEach(l=>{
    const r=realizedRightsForLoan(l);
    realizedUserRight+=r.user;
    realizedOwnerRight+=r.owner;
  });

  const capital=userCapitalMovementMetrics(u);
  const baseCapital=Number(u.baseCapital||0);

  // base_capital is the live balance maintained by capital-movement DB functions.
  // Available bank balance also accounts for loan principal leaving and repayments returning.
  const transferredUser=Number(state.settlementTransferTotals[String(u.id)]?.user||0);
  const transferredOwner=Number(state.settlementTransferTotals[String(u.id)]?.owner||0);

  // Available bank balance =
  // base capital - total lent + total collected
  // - transferred to user - transferred to owner.
  const bankAfterCollection=baseCapital-totalLent+totalCollected-transferredUser-transferredOwner;

  const now=new Date();
  const y=now.getFullYear();
  const m=now.getMonth();

  const loanDateObj=l=>{
    if(l.loanDate) return new Date(l.loanDate+'T00:00:00');
    if(l.createdAt) return new Date(l.createdAt);
    return null;
  };

  const lentThisMonth=approvedLoans
    .filter(l=>{const d=loanDateObj(l);return d&&d.getFullYear()===y&&d.getMonth()===m;})
    .reduce((s,l)=>s+Number(l.amount||0),0);

  const lentThisYear=approvedLoans
    .filter(l=>{const d=loanDateObj(l);return d&&d.getFullYear()===y;})
    .reduce((s,l)=>s+Number(l.amount||0),0);

  let collectedThisMonth=0; // 6th current month through 25th next month
  let paymentCount=0;
  approvedLoans.forEach(l=>{
    (l.payments||[]).forEach(p=>{
      paymentCount++;
      const d=p.paymentDate ? new Date(p.paymentDate+'T00:00:00') : (p.createdAt?new Date(p.createdAt):null);
      if(d){
        const collectionStart=new Date(y,m,6);
        const collectionEnd=new Date(y,m+1,25,23,59,59,999);
        if(d>=collectionStart && d<=collectionEnd){
          collectedThisMonth+=Number(p.amount||0);
        }
      }
    });
  });

  const expectedMonthlyCollection=activeLoans.reduce((s,l)=>s+Number(l.installment||0),0);
  const remainingThisMonth=Math.max(0,expectedMonthlyCollection-collectedThisMonth);

  return {
    user:u,
    baseCapital,
    totalLent,
    totalCollected,
    totalOutstanding,
    targetUserRight,
    targetOwnerRight,
    realizedUserRight:Math.max(0, realizedUserRight - transferredUser),
    realizedOwnerRight:Math.max(0, realizedOwnerRight - transferredOwner),
    transferredUser,
    transferredOwner,
    transferredBetweenUsersOut:capital.userToUserOut,
    bankAfterCollection,
    activeCount:activeLoans.length,
    closedCount:closedLoans.length,
    totalCount:approvedLoans.length,
    paymentCount,
    expectedMonthlyCollection,
    remainingThisMonth,
    lentThisMonth,
    collectedThisMonth,
    lentThisYear,
    finalSettlementTotal:Math.max(0, totalLent + targetUserRight + targetOwnerRight - transferredUser - transferredOwner - totalCollected)
  };
}

function getAdminAggregateMetrics(){
  const users=state.users.filter(u=>u.dbStatus==='active' && u.dbRole!=='admin');
  const allApprovedLoans=state.loans.filter(l=>['active','closed'].includes(l.dbStatus));
  const activeLoans=allApprovedLoans.filter(l=>l.dbStatus==='active');
  const closedLoans=allApprovedLoans.filter(l=>l.dbStatus==='closed');

  const baseCapital=users.reduce((s,u)=>s+Number(u.baseCapital||0),0);
  const totalLent=allApprovedLoans.reduce((s,l)=>s+Number(l.amount||0),0);
  const totalCollected=allApprovedLoans.reduce((s,l)=>s+Number(l.paid||0),0);
  const totalOutstanding=allApprovedLoans.reduce((s,l)=>s+Math.max(0,Number(l.total||0)-Number(l.paid||0)),0);
  const targetUserRight=allApprovedLoans.reduce((s,l)=>s+Number(l.userNet||0),0);
  const targetOwnerRight=allApprovedLoans.reduce((s,l)=>s+Number(l.adminNet||0),0);

  let realizedUserRight=0;
  let realizedOwnerRight=0;
  let paymentCount=0;
  allApprovedLoans.forEach(l=>{
    const r=realizedRightsForLoan(l);
    realizedUserRight+=r.user;
    realizedOwnerRight+=r.owner;
    paymentCount+=(l.payments||[]).length;
  });

  const rows=activeCapitalMovements();
  const transferredUser=rows
    .filter(t=>t.dbType==='owner_to_user')
    .reduce((s,t)=>s+Number(t.amount||0),0);
  const transferredOwner=rows
    .filter(t=>t.dbType==='user_to_owner')
    .reduce((s,t)=>s+Number(t.amount||0),0);

  const bankAfterCollection=baseCapital-totalLent+totalCollected;

  const now=new Date();
  const y=now.getFullYear();
  const m=now.getMonth();

  const loanDateObj=l=>{
    if(l.loanDate) return new Date(l.loanDate+'T00:00:00');
    if(l.createdAt) return new Date(l.createdAt);
    return null;
  };

  const lentThisMonth=allApprovedLoans
    .filter(l=>{const d=loanDateObj(l);return d&&d.getFullYear()===y&&d.getMonth()===m;})
    .reduce((s,l)=>s+Number(l.amount||0),0);

  const lentThisYear=allApprovedLoans
    .filter(l=>{const d=loanDateObj(l);return d&&d.getFullYear()===y;})
    .reduce((s,l)=>s+Number(l.amount||0),0);

  let collectedThisMonth=0;
  allApprovedLoans.forEach(l=>{
    (l.payments||[]).forEach(p=>{
      const d=p.paymentDate ? new Date(p.paymentDate+'T00:00:00') : (p.createdAt?new Date(p.createdAt):null);
      if(d){
        const collectionStart=new Date(y,m,6);
        const collectionEnd=new Date(y,m+1,25,23,59,59,999);
        if(d>=collectionStart && d<=collectionEnd){
          collectedThisMonth+=Number(p.amount||0);
        }
      }
    });
  });

  const expectedMonthlyCollection=activeLoans.reduce((s,l)=>s+Number(l.installment||0),0);
  const remainingThisMonth=Math.max(0,expectedMonthlyCollection-collectedThisMonth);

  return {
    user:{username:'admin',role:'أدمن'},
    baseCapital,totalLent,totalCollected,totalOutstanding,
    targetUserRight,targetOwnerRight,
    realizedUserRight,realizedOwnerRight,
    transferredUser,transferredOwner,
    bankAfterCollection,
    activeCount:activeLoans.length,
    closedCount:closedLoans.length,
    totalCount:allApprovedLoans.length,
    paymentCount,
    expectedMonthlyCollection,
    remainingThisMonth,
    lentThisMonth,
    collectedThisMonth,
    lentThisYear,
    finalSettlementTotal:totalOutstanding
  };
}


function getAdminAggregateMetrics(){
  const users = state.users.filter(u=>u.status==='نشط' && u.role!=='أدمن');
  const allApprovedLoans = state.loans.filter(l=>['نشط','مغلق'].includes(l.status));
  const activeLoans = allApprovedLoans.filter(l=>l.status==='نشط');
  const closedLoans = allApprovedLoans.filter(l=>l.status==='مغلق');

  const baseCapital = users.reduce((s,u)=>s+Number(u.baseCapital||0),0);
  const totalLent = allApprovedLoans.reduce((s,l)=>s+Number(l.amount||0),0);
  const totalCollected = allApprovedLoans.reduce((s,l)=>s+Number(l.paid||0),0);
  const targetUserRight = allApprovedLoans.reduce((s,l)=>s+Number(l.userNet||0),0);
  const targetOwnerRight = allApprovedLoans.reduce((s,l)=>s+Number(l.adminNet||0),0);

  let realizedUserRight = 0;
  let realizedOwnerRight = 0;
  allApprovedLoans.forEach(l=>{
    const months = Math.max(1, Number(l.months||1));
    const paidMonthlyCount = Math.min(months, (l.payments||[]).length);
    realizedUserRight += (Number(l.userNet||0)/months) * paidMonthlyCount;
    realizedOwnerRight += (Number(l.adminNet||0)/months) * paidMonthlyCount;
  });

  const transferredUser = users.reduce((s,u)=>s+Number(u.transferredUser||0),0);
  const transferredOwner = users.reduce((s,u)=>s+Number(u.transferredOwner||0),0);

  const bankAfterCollection =
    baseCapital - totalLent + totalCollected - (transferredUser + transferredOwner);

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const loanDateObj = l => {
    if(l.loanDate) return new Date(l.loanDate+'T00:00:00');
    if(l.createdAt) return new Date(l.createdAt);
    return null;
  };

  const lentThisMonth = allApprovedLoans
    .filter(l=>{const d=loanDateObj(l); return d && d.getFullYear()===y && d.getMonth()===m;})
    .reduce((s,l)=>s+Number(l.amount||0),0);

  const lentThisYear = allApprovedLoans
    .filter(l=>{const d=loanDateObj(l); return d && d.getFullYear()===y;})
    .reduce((s,l)=>s+Number(l.amount||0),0);

  let collectedThisMonth = 0;
  allApprovedLoans.forEach(l=>{
    (l.payments||[]).forEach(p=>{
      const d=p.createdAt?new Date(p.createdAt):null;
      if(d && d.getFullYear()===y && d.getMonth()===m){
        collectedThisMonth += Number(p.amount||0);
      }
    });
  });

  const expectedMonthlyCollection = activeLoans.reduce((s,l)=>s+Number(l.installment||0),0);
  const remainingThisMonth = Math.max(0, expectedMonthlyCollection - collectedThisMonth);

  const finalSettlementTotal =
    baseCapital - totalCollected - (transferredUser + transferredOwner);

  return {
    user:{username:'admin', role:'أدمن'},
    baseCapital,totalLent,totalCollected,targetUserRight,targetOwnerRight,
    realizedUserRight,realizedOwnerRight,transferredUser,transferredOwner,
    bankAfterCollection,
    activeCount:activeLoans.length,
    closedCount:closedLoans.length,
    totalCount:allApprovedLoans.length,
    expectedMonthlyCollection,
    remainingThisMonth,
    lentThisMonth,
    collectedThisMonth,
    lentThisYear,
    finalSettlementTotal
  };
}


;
function paymentActionDeadline(p){
  if(!p) return 0;
  const stamp=p.lastEditedAt || p.createdAt;
  return (stamp ? new Date(stamp).getTime() : 0) + 24*60*60*1000;
}

function privilegedPaymentActionDeadline(p){
  if(!p || !p.createdAt) return 0;
  // للأدمن والمدير: خمسة أيام من created_at الأصلي، والتعديل لا يجدد المهلة.
  return new Date(p.createdAt).getTime() + 5*24*60*60*1000;
}

function paymentActionWindowOpen(p){
  return !!p && Date.now() <= paymentActionDeadline(p);
}

function privilegedPaymentActionWindowOpen(p){
  return !!p && Date.now() <= privilegedPaymentActionDeadline(p);
}

function isPaymentPrivilegedRole(){
  return !!state.currentUser && ['أدمن','مدير مشروع','مدير المشروع'].includes(state.currentUser.role);
}

function lastActivePayment(l){
  if(!l || !Array.isArray(l.payments) || !l.payments.length) return null;
  return l.payments[l.payments.length-1];
}

function canModifyLastPayment(l,p){
  if(!l || !p || !state.currentUser) return false;

  // الأدمن ومدير المشروع: أي دفعة لأي مستخدم خلال 5 أيام من إنشائها،
  // بما في ذلك دفعات القروض التي أصبحت مغلقة/مسددة.
  if(isPaymentPrivilegedRole()) return privilegedPaymentActionWindowOpen(p);

  // المستخدم العادي: نفس القاعدة القديمة، آخر دفعة سجلها فقط وخلال 24 ساعة.
  const last=lastActivePayment(l);
  if(!last || last.id!==p.id) return false;
  if(p.createdById!==state.currentUser.id) return false;
  return paymentActionWindowOpen(p);
}



;
function currentCollectionYearExpectedInterest(userId){
  const today=new Date();
  const currentYear=(state.collectionYears||[]).find(y=>{
    if(!y?.startDate || !y?.endDate) return false;
    const start=new Date(y.startDate+'T00:00:00');
    const end=new Date(y.endDate+'T23:59:59');
    return today>=start && today<=end;
  });

  if(!currentYear){
    return {collectionYear:null,userShare:0,ownerShare:0,totalInterest:0};
  }

  const row=(state.expectedInterestByCollectionYear||[]).find(r=>
    String(r.userId||'')===String(userId||'') &&
    Number(r.collectionYear)===Number(currentYear.year)
  );

  return {
    collectionYear:currentYear.year,
    userShare:Number(row?.userShare||0),
    ownerShare:Number(row?.ownerShare||0),
    totalInterest:Number(row?.totalInterest||0)
  };
}


;
function loanFilterOptions(){
  const scoped=visibleLoansForCurrentUser();
  const creators=[...new Set(scoped.map(l=>l.createdBy).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ar'));
  const types=[...new Set(scoped.map(l=>l.type).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ar'));
  return {creators,types};
}

