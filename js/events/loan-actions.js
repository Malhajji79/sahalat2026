function bindLoanActions(){
  document.querySelectorAll('.reviewLoan').forEach(b=>b.onclick=()=>{
    state.selectedLoanId=b.dataset.id;
    state.page='loan-approval';
    render();
  });

  document.querySelectorAll('.payLoan').forEach(b=>b.onclick=()=>{
    state.selectedLoanId=b.dataset.id;
    state.page='record-payment';
    render();
  });

  document.querySelectorAll('.openLoan').forEach(b=>b.onclick=()=>{
    state.selectedLoanId=b.dataset.id;
    state.page='loan-details';
    render();
  });
}



