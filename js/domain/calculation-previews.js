function refreshApprovalCalculation(){
  const l=state.loans.find(x=>x.id===state.selectedLoanId);
  const input=document.getElementById('approvalAdminDiscount');
  if(!l || !input) return null;

  const ad=Number(input.value);
  if(!Number.isFinite(ad) || ad<0 || ad>100) return null;

  const r=calcLoan(
    Number(l.amount||0),
    Number(l.months||0),
    Number(l.generalDiscount||0),
    Number(l.userDiscount||0),
    ad
  );

  document.getElementById('apBaseRate').textContent=percentDisplay(r.baseRate);
  document.getElementById('apUserNet').textContent=wholeMoney(r.userNet);
  document.getElementById('apAdminNet').textContent=wholeMoney(r.adminNet);
  document.getElementById('apFinalInterest').textContent=wholeMoney(r.finalInterest);
  document.getElementById('apTotal').textContent=money(r.total);
  document.getElementById('apInstallment').textContent=wholeMoney(r.installment);
  document.getElementById('apSettlement').textContent=money(r.settlementDue);
  return {r, ad};
}

function calculateRepaymentPeriodPreview(){
  const l=state.loans.find(x=>x.id===state.selectedLoanId);
  const input=document.getElementById('repaymentNewMonths');
  if(!l || !input) return null;

  const newMonths=Number(input.value);
  if(!Number.isInteger(newMonths) || newMonths<1 || newMonths>state.maxMonths) return null;

  const r=calcRepaymentPeriodLoan(l,newMonths);

  const paid=Number(l.paid||0);
  const newRemaining=Math.max(0,r.total-paid);

  const a=document.getElementById('rpNewTotal');
  const b=document.getElementById('rpNewRemaining');
  const c=document.getElementById('rpNewInstallment');
  const d=document.getElementById('rpNewSettlement');
  if(a) a.textContent=money(r.total);
  if(b) b.textContent=money(newRemaining);
  if(c) c.textContent=wholeMoney(r.installment);
  if(d) d.textContent=money(r.settlementDue);

  return {newMonths,r,paid,newRemaining};
}

