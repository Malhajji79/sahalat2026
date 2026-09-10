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


;
async function editCapitalTransferDb(transferId,newAmount,newDate,newNote,reason){
  const t=(state.capitalTransfers||[]).find(x=>x.id===transferId);
  if(!t) return {ok:false,msg:'الحركة غير موجودة.'};
  if(!canEditCapitalTransfer(t)){
    return {ok:false,msg:capitalActionWindowOpen(t)
      ? 'يمكن تعديل الحركة فقط بواسطة المستخدم الذي أنشأها.'
      : 'انتهت مهلة تعديل الحركة بعد مرور 24 ساعة.'};
  }
  if(!Number.isFinite(newAmount) || newAmount<=0) return {ok:false,msg:'المبلغ الجديد غير صحيح.'};
  if(!newDate) return {ok:false,msg:'التاريخ مطلوب.'};
  if(!reason || !reason.trim()) return {ok:false,msg:'سبب التعديل مطلوب.'};

  const {error}=await supabaseClient.rpc('edit_capital_movement',{
    p_movement_id:t.dbId||t.id,
    p_new_amount:newAmount,
    p_new_movement_date:newDate,
    p_new_note:newNote||null,
    p_reason:reason.trim()
  });

  if(error) return {ok:false,msg:error.message||'تعذر تعديل الحركة.'};

  await loadVisibleUsers();
  if(!state.users.some(u=>u.id===state.currentUser.id)) state.users.unshift(state.currentUser);
  const refreshed=state.users.find(u=>u.id===state.currentUser.id);
  if(refreshed) state.currentUser={...state.currentUser,...refreshed};
  await loadCapitalMovementsFromDatabase();
  await loadCapitalHistoryFromDatabase();

  return {ok:true};
}




async function cancelCapitalTransferDb(transferId,reason){
  const t=(state.capitalTransfers||[]).find(x=>x.id===transferId);
  if(!t) return {ok:false,msg:'الحركة غير موجودة.'};
  if(!canDeleteCapitalTransfer(t)){
    return {ok:false,msg:capitalActionWindowOpen(t)
      ? 'يمكن إلغاء الحركة فقط بواسطة المستخدم الذي أنشأها.'
      : 'انتهت مهلة إلغاء الحركة بعد مرور 24 ساعة.'};
  }
  if(!reason || !reason.trim()) return {ok:false,msg:'سبب الإلغاء مطلوب.'};

  const {error}=await supabaseClient.rpc('cancel_capital_movement',{
    p_movement_id:t.dbId||t.id,
    p_reason:reason.trim()
  });

  if(error) return {ok:false,msg:error.message||'تعذر إلغاء الحركة.'};

  await loadVisibleUsers();
  if(!state.users.some(u=>u.id===state.currentUser.id)) state.users.unshift(state.currentUser);
  const refreshed=state.users.find(u=>u.id===state.currentUser.id);
  if(refreshed) state.currentUser={...state.currentUser,...refreshed};
  await loadCapitalMovementsFromDatabase();
  await loadCapitalHistoryFromDatabase();

  return {ok:true};
}



;
function capitalNameMatches(a,b){
  const norm=v=>String(v||'').trim().toLowerCase().replace(/\./g,'').replace(/\s+/g,' ');
  return norm(a)===norm(b);
}

