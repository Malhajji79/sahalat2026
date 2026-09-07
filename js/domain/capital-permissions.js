function capitalActionDeadline(t){
  if(!t) return 0;
  const stamp=t.lastEditedAt || t.createdAt;
  const ms=stamp ? new Date(stamp).getTime() : 0;
  return ms + 24*60*60*1000;
}

function capitalActionWindowOpen(t){
  if(!t) return false;
  return Date.now() <= capitalActionDeadline(t);
}


function canEditCapitalTransfer(t){
  if(!t || t.entryKind!=='transfer' || t.status!=='active') return false;
  if(t.createdById!==state.currentUser.id) return false;
  return capitalActionWindowOpen(t);
}

function canDeleteCapitalTransfer(t){
  if(!t || t.entryKind!=='transfer' || t.status!=='active') return false;
  if(t.createdById!==state.currentUser.id) return false;
  return capitalActionWindowOpen(t);
}

