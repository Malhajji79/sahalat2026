function bindLoanDetails(){
  const back = document.getElementById('backToLoans');
  if(back) back.onclick=()=>{state.page='loans';render();};
  const review = document.getElementById('detailsReviewBtn');
  if(review) review.onclick=()=>{
    state.page='loan-approval';
    render();
  };
  const early = document.getElementById('earlySettlementBtn');
  if(early) early.onclick=()=>{
    state.page='repayment-period-request';
    render();
  };
  const reviewPeriod = document.getElementById('reviewEarlySettlementBtn');
  if(reviewPeriod) reviewPeriod.onclick=()=>{
    state.page='repayment-period-admin-review';
    render();
  };
  document.querySelectorAll('.editLastPaymentBtn').forEach(b=>b.onclick=()=>{
    state.selectedPaymentId=b.dataset.id;
    state.paymentActionMode='edit';
    state.page='payment-action';
    render();
  });
  document.querySelectorAll('.deleteLastPaymentBtn').forEach(b=>b.onclick=()=>{
    state.selectedPaymentId=b.dataset.id;
    state.paymentActionMode='delete';
    state.page='payment-action';
    render();
  });

  const pay = document.getElementById('detailsPayBtn');
  if(pay) pay.onclick=()=>{
    state.page='record-payment';
    render();
  };

  const deleteLoanBtn=document.getElementById('deleteLatestUnpaidLoanBtn');
  if(deleteLoanBtn) deleteLoanBtn.onclick=async()=>{
    const l=state.loans.find(x=>x.id===state.selectedLoanId);
    if(!l) return;
    const ok=confirm(`هل أنت متأكد من حذف القرض رقم ${l.id}؟\n\nلا يمكن التراجع عن عملية الحذف.`);
    if(!ok) return;
    deleteLoanBtn.disabled=true;
    deleteLoanBtn.textContent='جاري الحذف...';
    try{
      const {error}=await supabaseClient.rpc('delete_latest_unpaid_loan',{p_loan_id:l.dbId});
      if(error) throw error;
      await loadLoansFromDatabase();
      state.selectedLoanId=null;
      state.page='loans';
      render();
    }catch(e){
      console.error(e);
      alert(e?.message||'تعذر حذف القرض.');
      deleteLoanBtn.disabled=false;
      deleteLoanBtn.textContent='حذف القرض';
    }
  };
}



