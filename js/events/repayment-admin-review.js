function bindRepaymentPeriodAdminReview(){
  const back=()=>{
    state.page='early-reviews';
    render();
  };

  document.getElementById('adminRepaymentBackBtn')?.addEventListener('click',back);

  const approve=document.getElementById('approveRepaymentPeriodBtn');
  if(approve) approve.onclick=async()=>{
    const r=(state.repaymentRequests||[]).find(x=>x.id===state.selectedRepaymentRequestId);
    const err=document.getElementById('adminRepaymentError');
    const note=document.getElementById('adminRepaymentNote')?.value||'';

    if(err) err.textContent='';
    if(!r){
      if(err) err.textContent='طلب المراجعة غير موجود.';
      return;
    }

    approve.disabled=true;
    const rejectBtn=document.getElementById('rejectRepaymentPeriodBtn');
    if(rejectBtn) rejectBtn.disabled=true;
    approve.textContent='جاري الاعتماد...';

    try{
      const {error}=await supabaseClient.rpc('approve_repayment_period_request',{
        p_request_id:r.dbId,
        p_review_note:note||null
      });
      if(error) throw error;

      await loadLoansFromDatabase();
      await loadRepaymentRequestsFromDatabase();

      state.selectedRepaymentRequestId=null;
      state.page='early-reviews';
      render();
    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||tx('تعذر اعتماد مراجعة فترة السداد.','Unable to approve repayment-period review.');
      approve.disabled=false;
      approve.textContent='اعتماد التغيير';
      if(rejectBtn) rejectBtn.disabled=false;
    }
  };

  const reject=document.getElementById('rejectRepaymentPeriodBtn');
  if(reject) reject.onclick=async()=>{
    const r=(state.repaymentRequests||[]).find(x=>x.id===state.selectedRepaymentRequestId);
    const err=document.getElementById('adminRepaymentError');
    const note=document.getElementById('adminRepaymentNote')?.value?.trim()||'';

    if(err) err.textContent='';
    if(!r){
      if(err) err.textContent='طلب المراجعة غير موجود.';
      return;
    }
    if(!note){
      if(err) err.textContent='سبب الرفض مطلوب.';
      return;
    }

    reject.disabled=true;
    const approveBtn=document.getElementById('approveRepaymentPeriodBtn');
    if(approveBtn) approveBtn.disabled=true;
    reject.textContent='جاري الرفض...';

    try{
      const {error}=await supabaseClient.rpc('reject_repayment_period_request',{
        p_request_id:r.dbId,
        p_review_note:note
      });
      if(error) throw error;

      await loadRepaymentRequestsFromDatabase();

      state.selectedRepaymentRequestId=null;
      state.page='early-reviews';
      render();
    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||tx('تعذر رفض مراجعة فترة السداد.','Unable to reject repayment-period review.');
      reject.disabled=false;
      reject.textContent='رفض التغيير';
      if(approveBtn) approveBtn.disabled=false;
    }
  };
}


