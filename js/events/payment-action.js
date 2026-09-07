function bindPaymentAction(){
  const back=()=>{state.page='loan-details';render();};
  document.getElementById('paymentActionBackBtn')?.addEventListener('click',back);
  document.getElementById('cancelPaymentActionBtn')?.addEventListener('click',back);

  const confirmBtn=document.getElementById('confirmPaymentActionBtn');
  if(confirmBtn) confirmBtn.onclick=async()=>{
    const l=state.loans.find(x=>x.id===state.selectedLoanId);
    const p=l?.payments?.find(x=>x.id===state.selectedPaymentId);
    const err=document.getElementById('paymentActionError');
    const reason=document.getElementById('paymentActionReason')?.value.trim()||'';

    if(err) err.textContent='';

    if(!l || !p){
      if(err) err.textContent='الدفعة غير موجودة.';
      return;
    }
    if(!p.dbId){
      if(err) err.textContent='معرّف الدفعة في قاعدة البيانات غير متوفر.';
      return;
    }
    if(!reason){
      if(err) err.textContent='سبب العملية مطلوب.';
      return;
    }

    confirmBtn.disabled=true;
    confirmBtn.textContent=state.paymentActionMode==='edit'?'جاري الحفظ...':'جاري الحذف...';

    try{
      if(state.paymentActionMode==='edit'){
        const amount=Number(document.getElementById('editPaymentAmount')?.value);
        const date=document.getElementById('editPaymentDate')?.value||'';
        const note=document.getElementById('editPaymentNote')?.value||'';

        if(!Number.isFinite(amount) || amount<=0){
          throw new Error('مبلغ الدفعة غير صحيح.');
        }
        if(!date){
          throw new Error('تاريخ الدفعة مطلوب.');
        }

        const {error}=await supabaseClient.rpc('edit_last_payment',{
          p_payment_id:p.dbId,
          p_new_amount:amount,
          p_new_payment_date:date,
          p_new_note:note||null,
          p_reason:reason
        });

        if(error) throw error;

      }else{
        const {error}=await supabaseClient.rpc('delete_last_payment',{
          p_payment_id:p.dbId,
          p_reason:reason
        });

        if(error) throw error;
      }

      await loadLoansFromDatabase();

      state.selectedPaymentId=null;
      state.paymentActionMode=null;
      state.page='loan-details';
      render();

    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||'تعذر تنفيذ العملية.';
      confirmBtn.disabled=false;
      confirmBtn.textContent=state.paymentActionMode==='edit'?'حفظ التعديل':'تأكيد الحذف';
    }
  };
}


