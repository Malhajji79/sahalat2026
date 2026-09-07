function bindCapitalMovements(){
  document.querySelectorAll('.capitalMovementEditBtn').forEach(b=>b.onclick=()=>{
    const t=(state.capitalTransfers||[]).find(x=>x.id===b.dataset.id);
    if(!canEditCapitalTransfer(t)) return;
    state.pendingEditTransferId=t.id;
    state.accountUser=state.currentUser.username;
    state.page='edit-account-values';
    render();
  });

  document.querySelectorAll('.capitalMovementDeleteBtn').forEach(b=>b.onclick=async()=>{
    const t=(state.capitalTransfers||[]).find(x=>x.id===b.dataset.id);
    if(!t || !canDeleteCapitalTransfer(t)) return;

    const reasonBox=document.createElement('div');
    reasonBox.className='card';
    reasonBox.id='capitalMovementDeletePanel';
    reasonBox.style.marginTop='18px';
    reasonBox.innerHTML=`
      <h3 class="section-title">${tx('إلغاء حركة رأس المال','Cancel Capital Movement')}</h3>
      <div class="summary-row"><span>${tx('من','From')}</span><strong>${t.from}</strong></div>
      <div class="summary-row"><span>${tx('إلى','To')}</span><strong>${t.to}</strong></div>
      <div class="summary-row"><span>${tx('المبلغ','Amount')}</span><strong>${wholeMoney(t.amount)}</strong></div>
      <div class="field" style="margin-top:12px">
        <label>${tx('سبب الإلغاء','Cancellation Reason')}</label>
        <input id="movementDeleteReason" type="text" placeholder="${tx('اكتب سبب الإلغاء','Enter cancellation reason')}">
      </div>
      <div id="movementDeleteError" class="small" style="color:#b91c1c;margin-top:8px"></div>
      <div class="actions">
        <button class="btn btn-danger" id="movementDeleteConfirm">${tx('تأكيد الإلغاء','Confirm Cancellation')}</button>
        <button class="btn btn-secondary" id="movementDeleteCancel">${tx('إلغاء','Cancel')}</button>
      </div>`;

    document.getElementById('capitalMovementDeletePanel')?.remove();
    document.getElementById('content').appendChild(reasonBox);

    document.getElementById('movementDeleteCancel').onclick=()=>reasonBox.remove();
    document.getElementById('movementDeleteConfirm').onclick=async()=>{
      const reason=document.getElementById('movementDeleteReason').value.trim();
      const err=document.getElementById('movementDeleteError');
      const result=await cancelCapitalTransferDb(t.id,reason);
      if(!result.ok){
        err.textContent=result.msg;
        return;
      }
      render();
    };
    reasonBox.scrollIntoView({behavior:'smooth',block:'center'});
  });
}



