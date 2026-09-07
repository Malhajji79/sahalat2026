function calcRepaymentPeriodLoan(loan, months){
  // Repayment reviews retain the share policy effective on the loan issue date.
  const issueDate = String(loan.loanDate||'').slice(0,10);
  const shares = /^\d{4}-\d{2}-\d{2}$/.test(issueDate)
    ? (issueDate < '2026-01-12' ? {user:50,owner:50} : {user:40,owner:60})
    : undefined;
  return calcLoan(
    Number(loan.amount||0), months,
    Number(loan.generalDiscount||0),
    Number(loan.userDiscount||0),
    Number(loan.adminDiscount||0), shares
  );
}

