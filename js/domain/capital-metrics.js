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

