function bindEarlyReviews(){
  document.querySelectorAll('.openRepaymentReviewBtn').forEach(b=>b.onclick=()=>{
    state.selectedRepaymentRequestId=b.dataset.requestId;
    state.selectedLoanId=b.dataset.loanId;
    state.page='repayment-period-admin-review';
    render();
  });
}

