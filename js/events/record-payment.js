function bindRecordPayment(){
  const back=()=>{state.page='loan-details';render();};

  const backBtn=document.getElementById('paymentBackBtn');
  if(backBtn) backBtn.onclick=back;

  const cancel=document.getElementById('cancelPaymentBtn');
  if(cancel) cancel.onclick=back;

  const save=document.getElementById('savePaymentBtn');
  if(save) save.onclick=async()=>{
    const l=state.loans.find(x=>x.id===state.selectedLoanId);
    const err=document.getElementById('paymentError');
    if(err) err.textContent='';

    if(!l || l.status!=='نشط'){
      if(err) err.textContent='القرض غير صالح لتسجيل دفعة.';
      return;
    }

    if(state.currentUser.role==='أدمن'){
      if(err) err.textContent='الأدمن لا يستطيع تسجيل الدفعات.';
      return;
    }

    if(!l.dbId){
      if(err) err.textContent='معرّف القرض في قاعدة البيانات غير متوفر.';
      return;
    }

    const amount=Number(document.getElementById('paymentAmount').value);
    const date=document.getElementById('paymentDate').value;
    const note=document.getElementById('paymentNote').value.trim();

    const paid=Number(l.paid||0);
    const remaining=Math.max(0,Number(l.total||0)-paid);

    if(!Number.isFinite(amount) || amount<=0){
      if(err) err.textContent='مبلغ الدفعة غير صحيح.';
      return;
    }
    if(amount>remaining){
      if(err) err.textContent='مبلغ الدفعة أكبر من المتبقي على القرض.';
      return;
    }
    if(!date){
      if(err) err.textContent='تاريخ الدفعة مطلوب.';
      return;
    }

    save.disabled=true;
    save.textContent=tx('جاري الحفظ...','Saving...');

    try{
      const {error}=await supabaseClient.rpc('create_payment',{
        p_loan_id:l.dbId,
        p_amount:amount,
        p_payment_date:date,
        p_note:note||null
      });

      if(error) throw error;

      await loadLoansFromDatabase();
      state.page='loan-details';
      render();
    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||'تعذر تسجيل الدفعة.';
      save.disabled=false;
      save.textContent='حفظ الدفعة';
    }
  };
}


