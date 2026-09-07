function visibleLoansForCurrentUser(){
  if(['أدمن','مدير مشروع','مدير المشروع'].includes(state.currentUser.role)) return state.loans;
  return state.loans.filter(l=>{
    const assigned=(l.assignedUser||l.createdBy);
    if(assigned!==state.currentUser.username) return false;
    if(l.status==='نشط' || l.status==='مغلق') return true;
    if(l.status.includes('بانتظار') && l.createdBy===state.currentUser.username) return true;
    return false;
  });
}


function pendingEarlySettlementLoans(){
  return state.loans.filter(l=>l.earlySettlementRequest);
}


