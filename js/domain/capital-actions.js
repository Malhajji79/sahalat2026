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


function reverseCapitalTransfer(t){
  const fromUser=state.users.find(u=>u.username===t.from);
  const toUser=state.users.find(u=>u.username===t.to);
  const amount=Number(t.amount||0);

  if(t.type==='owner-to-user'){
    if(!toUser) return {ok:false,msg:'المستخدم المستلم غير موجود.'};
    if(Number(toUser.baseCapital||0)<amount){
      return {ok:false,msg:'لا يمكن إلغاء الحركة لأن رأس مال المستخدم الحالي أقل من مبلغ الحركة.'};
    }
    toUser.baseCapital=Number(toUser.baseCapital||0)-amount;
    return {ok:true};
  }

  if(t.type==='user-to-owner'){
    if(!fromUser) return {ok:false,msg:'المستخدم المرسل غير موجود.'};
    fromUser.baseCapital=Number(fromUser.baseCapital||0)+amount;
    return {ok:true};
  }

  if(t.type==='user-to-user'){
    if(!fromUser || !toUser) return {ok:false,msg:'أحد المستخدمين غير موجود.'};
    if(Number(toUser.baseCapital||0)<amount){
      return {ok:false,msg:'لا يمكن إلغاء التحويل لأن رصيد المستخدم المستلم الحالي أقل من مبلغ التحويل.'};
    }
    toUser.baseCapital=Number(toUser.baseCapital||0)-amount;
    fromUser.baseCapital=Number(fromUser.baseCapital||0)+amount;
    return {ok:true};
  }

  return {ok:false,msg:'نوع الحركة غير معروف.'};
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


