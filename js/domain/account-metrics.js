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

