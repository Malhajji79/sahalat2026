function bindLoanApproval(){
  const back=document.getElementById('approvalBackBtn');
  if(back) back.onclick=()=>{state.page='loans';render();};

  const input=document.getElementById('approvalAdminDiscount');
  if(input) input.oninput=refreshApprovalCalculation;

  const approve=document.getElementById('approveLoanFinalBtn');
  if(approve) approve.onclick=async()=>{
    const l=state.loans.find(x=>x.id===state.selectedLoanId);
    const calc=refreshApprovalCalculation();
    const err=document.getElementById('approvalError');

    if(err) err.textContent='';

    if(!l || !l.status.includes('بانتظار')){
      if(err) err.textContent='هذا القرض لم يعد بانتظار الاعتماد.';
      return;
    }
    if(!l.dbId){
      if(err) err.textContent='معرّف القرض في قاعدة البيانات غير متوفر.';
      return;
    }
    if(!calc){
      if(err) err.textContent='نسبة خصم الأدمن يجب أن تكون بين 0 و100%.';
      return;
    }

    const {ad}=calc;
    approve.disabled=true;
    const rejectBtn=document.getElementById('rejectLoanFinalBtn');
    if(rejectBtn) rejectBtn.disabled=true;
    approve.textContent='جاري الاعتماد...';

    try{
      const {error}=await supabaseClient.rpc('approve_loan',{
        p_loan_id:l.dbId,
        p_admin_discount:ad
      });

      if(error) throw error;

      await loadLoansFromDatabase();
      state.page='loans';
      render();
    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||'تعذر اعتماد القرض.';
      approve.disabled=false;
      approve.textContent='اعتماد القرض';
      if(rejectBtn) rejectBtn.disabled=false;
    }
  };

  const reject=document.getElementById('rejectLoanFinalBtn');
  if(reject) reject.onclick=async()=>{
    const l=state.loans.find(x=>x.id===state.selectedLoanId);
    const err=document.getElementById('approvalError');
    const reason=document.getElementById('approvalRejectReason')?.value.trim()||'';

    if(err) err.textContent='';

    if(!l || !l.status.includes('بانتظار')){
      if(err) err.textContent='هذا القرض لم يعد بانتظار مراجعة الأدمن.';
      return;
    }
    if(!l.dbId){
      if(err) err.textContent='معرّف القرض في قاعدة البيانات غير متوفر.';
      return;
    }
    if(!reason){
      if(err) err.textContent='سبب رفض القرض مطلوب.';
      return;
    }

    reject.disabled=true;
    const approveBtn=document.getElementById('approveLoanFinalBtn');
    if(approveBtn) approveBtn.disabled=true;
    reject.textContent='جاري الرفض...';

    try{
      const {error}=await supabaseClient.rpc('reject_loan',{
        p_loan_id:l.dbId,
        p_reason:reason
      });

      if(error) throw error;

      await loadLoansFromDatabase();
      state.page='loans';
      render();
    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||'تعذر رفض القرض.';
      reject.disabled=false;
      reject.textContent='رفض القرض';
      if(approveBtn) approveBtn.disabled=false;
    }
  };
}




