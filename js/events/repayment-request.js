function bindRepaymentPeriodRequest(){
  const back=()=>{state.page='loan-details';render();};

  document.getElementById('repaymentBackBtn')?.addEventListener('click',back);
  document.getElementById('cancelRepaymentReviewBtn')?.addEventListener('click',back);

  const input=document.getElementById('repaymentNewMonths');
  if(input) input.oninput=calculateRepaymentPeriodPreview;

  const submit=document.getElementById('submitRepaymentReviewBtn');
  if(submit) submit.onclick=async()=>{
    const l=state.loans.find(x=>x.id===state.selectedLoanId);
    const err=document.getElementById('repaymentError');
    if(err) err.textContent='';

    if(!l || l.status!=='نشط'){
      if(err) err.textContent=tx('القرض غير صالح لمراجعة فترة السداد.','This loan is not eligible for repayment-period review.');
      return;
    }
    if(!l.dbId){
      if(err) err.textContent='معرّف القرض في قاعدة البيانات غير متوفر.';
      return;
    }
    if(l.earlySettlementRequest){
      if(err) err.textContent='يوجد طلب قائم بالفعل بانتظار موافقة الأدمن.';
      return;
    }

    const newMonths=Number(document.getElementById('repaymentNewMonths')?.value);
    if(!Number.isInteger(newMonths) || newMonths<1 || newMonths>state.maxMonths){
      if(err) err.textContent=`عدد الشهور يجب أن يكون رقمًا صحيحًا بين 1 و${state.maxMonths}.`;
      return;
    }

    submit.disabled=true;
    submit.textContent='جاري إرسال الطلب...';

    try{
      const {error}=await supabaseClient.rpc('create_repayment_period_request',{
        p_loan_id:l.dbId,
        p_requested_months:newMonths
      });

      if(error) throw error;

      await loadRepaymentRequestsFromDatabase();
      state.page='loan-details';
      render();
    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||tx('تعذر إرسال طلب مراجعة فترة السداد.','Unable to submit repayment-period review request.');
      submit.disabled=false;
      submit.textContent='إرسال طلب المراجعة';
    }
  };

  calculateRepaymentPeriodPreview();
}

