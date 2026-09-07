function bindLoanForm(){
  const assigned=document.getElementById('assignedUser');
  if(assigned && state.currentUser.role==='مستخدم'){
    assigned.value=state.currentUser.username;
    assigned.disabled=true;
  }
  const ids=['loanType','generalDiscount','userDiscount','adminDiscount','amount','months'];
  ids.forEach(id=>document.getElementById(id).addEventListener('input',refreshLoanForm));
  document.getElementById('loanType').addEventListener('change',refreshLoanForm);
  document.getElementById('saveLoanBtn').onclick=saveLoan;
  refreshLoanForm();
}

