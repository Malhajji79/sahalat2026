function bindCapitalTransfer(){
  state.capitalRecipientUsers=[];
  const back=()=>{state.page='accounts';render();};

  document.getElementById('capitalBackBtn')?.addEventListener('click',back);
  document.getElementById('cancelCapitalTransferBtn')?.addEventListener('click',back);

  const selected=document.getElementById('capitalSelectedUser');
  if(selected) selected.onchange=()=>{
    state.accountUser=selected.value;
    render();
  };

  const type=document.getElementById('capitalTransferType');
  if(type) type.onchange=fillCapitalPartyOptions;

  fillCapitalPartyOptions();
  document.getElementById('capitalFrom')?.addEventListener('change',fillCapitalRecipientOptions);
  const recipientSelect=document.getElementById('capitalTo');
  const signedInUserId=state.currentUser.id;
  supabaseClient.rpc('get_capital_transfer_recipients').then(({data,error})=>{
    if(state.currentUser?.id!==signedInUserId || document.getElementById('capitalTo')!==recipientSelect) return;
    if(error) throw error;
    state.capitalRecipientUsers=(data||[]).map(u=>({id:u.id,username:u.username}));
    fillCapitalRecipientOptions();
  }).catch(error=>{
    if(state.currentUser?.id!==signedInUserId || document.getElementById('capitalTo')!==recipientSelect) return;
    const err=document.getElementById('capitalError');
    if(err) err.textContent=tx('تعذر تحميل أسماء المستلمين. تأكد من تثبيت تحديث Supabase ثم افتح الصفحة مجددًا.','Unable to load recipients. Install the Supabase update and reopen this page.');
    console.error(error);
  });

  document.querySelectorAll('.editCapitalTransferBtn').forEach(b=>b.onclick=()=>{
    const t=(state.capitalTransfers||[]).find(x=>x.id===b.dataset.id);
    if(!canEditCapitalTransfer(t)) return;
    state.pendingEditTransferId=t.id;
    state.pendingDeleteTransferId=null;
    render();
  });

  document.getElementById('cancelEditCapitalBtn')?.addEventListener('click',()=>{
    state.pendingEditTransferId=null;
    render();
  });

  document.getElementById('confirmEditCapitalBtn')?.addEventListener('click',async()=>{
    const amount=Number(document.getElementById('capitalEditAmount')?.value);
    const date=document.getElementById('capitalEditDate')?.value||'';
    const note=document.getElementById('capitalEditNote')?.value||'';
    const reason=document.getElementById('capitalEditReason')?.value||'';
    const err=document.getElementById('capitalEditError');
    if(err) err.textContent='';

    const btn=document.getElementById('confirmEditCapitalBtn');
    btn.disabled=true;
    btn.textContent='جاري الحفظ...';

    const result=await editCapitalTransferDb(state.pendingEditTransferId,amount,date,note,reason);
    if(!result.ok){
      if(err) err.textContent=result.msg;
      btn.disabled=false;
      btn.textContent='حفظ التعديل';
      return;
    }

    state.pendingEditTransferId=null;
    render();
  });

  document.querySelectorAll('.deleteCapitalTransferBtn').forEach(b=>b.onclick=()=>{
    const t=(state.capitalTransfers||[]).find(x=>x.id===b.dataset.id);
    if(!t) return;

    if(!canDeleteCapitalTransfer(t)){
      const err=document.getElementById('capitalError');
      if(err) err.textContent='يمكن حذف الحركة فقط بواسطة المستخدم الذي أنشأها.';
      return;
    }

    state.pendingDeleteTransferId=t.id;
    render();
  });

  const cancelDelete=document.getElementById('cancelDeleteCapitalBtn');
  if(cancelDelete) cancelDelete.onclick=()=>{
    state.pendingDeleteTransferId=null;
    render();
  };

  const confirmDelete=document.getElementById('confirmDeleteCapitalBtn');
  if(confirmDelete) confirmDelete.onclick=async()=>{
    const reason=document.getElementById('capitalDeleteReason')?.value||'';
    const err=document.getElementById('capitalDeleteError');
    if(err) err.textContent='';

    confirmDelete.disabled=true;
    confirmDelete.textContent='جاري الإلغاء...';

    const result=await cancelCapitalTransferDb(state.pendingDeleteTransferId,reason);

    if(!result.ok){
      if(err) err.textContent=result.msg;
      confirmDelete.disabled=false;
      confirmDelete.textContent='تأكيد الإلغاء';
      return;
    }

    state.pendingDeleteTransferId=null;
    render();
  };

  const save=document.getElementById('saveCapitalTransferBtn');
  if(save) save.onclick=async()=>{
    const err=document.getElementById('capitalError');
    if(err) err.textContent='';

    const typeVal=document.getElementById('capitalTransferType').value;
    const from=document.getElementById('capitalFrom').value;
    const to=document.getElementById('capitalTo').value;
    const amount=Number(document.getElementById('capitalAmount').value);
    const date=document.getElementById('capitalDate').value;
    const note=document.getElementById('capitalNote').value.trim();

    if(!Number.isFinite(amount) || amount<=0){
      if(err) err.textContent=tx('أدخل مبلغًا صحيحًا أكبر من صفر.','Enter a valid amount greater than zero.');
      return;
    }
    if(!date){
      if(err) err.textContent=tx('التاريخ مطلوب.','Date is required.');
      return;
    }
    if(from===to){
      if(err) err.textContent=tx('لا يمكن أن يكون الطرف المرسل والمستلم نفس الحساب.','The sender and recipient cannot be the same account.');
      return;
    }

    const fromUser=state.users.find(u=>u.username===from);
    const toUser=(typeVal==='user-to-user' ? (state.capitalRecipientUsers||[]) : state.users).find(u=>u.username===to);

    let dbType;
    let fromUserId=null;
    let toUserId=null;

    if(typeVal==='owner-to-user'){
      dbType='owner_to_user';
      if(!toUser){
        if(err) err.textContent=tx('المستخدم المستلم غير صحيح.','The recipient user is invalid.');
        return;
      }
      toUserId=toUser.id;

    }else if(typeVal==='user-to-owner'){
      dbType='user_to_owner';
      if(!fromUser){
        if(err) err.textContent=tx('المستخدم المرسل غير صحيح.','The sender user is invalid.');
        return;
      }
      fromUserId=fromUser.id;

    }else if(typeVal==='user-to-user'){
      dbType='user_to_user';
      if(!fromUser || !toUser){
        if(err) err.textContent=tx('أحد المستخدمين غير صحيح.','One of the selected users is invalid.');
        return;
      }
      fromUserId=fromUser.id;
      toUserId=toUser.id;

    }else{
      if(err) err.textContent=tx('نوع الحركة غير صحيح.','Invalid movement type.');
      return;
    }

    save.disabled=true;
    save.textContent='جاري التنفيذ...';

    try{
      const {error}=await supabaseClient.rpc('create_capital_movement',{
        p_movement_type:dbType,
        p_from_user_id:fromUserId,
        p_to_user_id:toUserId,
        p_amount:amount,
        p_movement_date:date,
        p_note:note||null
      });

      if(error) throw error;

      // Reload users first because base_capital changes in the database.
      await loadVisibleUsers();

      if(!state.users.some(u=>u.id===state.currentUser.id)){
        state.users.unshift(state.currentUser);
      }

      // Refresh the signed-in user's own profile so dashboard capital is current.
      const refreshedCurrent=state.users.find(u=>u.id===state.currentUser.id);
      if(refreshedCurrent){
        state.currentUser={...state.currentUser,...refreshedCurrent};
      }

      await loadCapitalMovementsFromDatabase();
      await loadCapitalHistoryFromDatabase();

      state.accountUser=state.currentUser.username;
      state.page='capital-movements';
      render();

    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||'تعذر تنفيذ حركة رأس المال.';
      save.disabled=false;
      save.textContent='تنفيذ الحركة';
    }
  };
}


