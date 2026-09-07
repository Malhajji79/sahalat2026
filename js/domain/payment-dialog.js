function openPaymentDialog(loanId){
  if(state.currentUser.role==='أدمن'){
    alert('الأدمن لا يستطيع تسجيل الدفعات.');
    return;
  }
  const l=state.loans.find(x=>x.id===loanId);
  if(!l || l.status!=='نشط') return;

  const paid=Number(l.paid||0);
  const remaining=Math.max(0, Number(l.total||0)-paid);
  const suggested = remaining <= Number(l.installment||0) + Number(l.settlementDue||0)
    ? remaining
    : Number(l.installment||0);

  const raw = prompt(
    `تسجيل دفعة للقرض ${l.id}\nالمستفيد: ${l.beneficiary}\nالمدفوع: ${wholeMoney(paid)}\nالمتبقي: ${money(remaining)}\n\nأدخل مبلغ الدفعة بالريال:`,
    String(whole(suggested))
  );
  if(raw===null) return;

  const amount=Number(raw);
  if(!Number.isFinite(amount) || amount<=0){
    alert('مبلغ الدفعة غير صحيح.');
    return;
  }
  if(amount>remaining){
    alert('مبلغ الدفعة أكبر من المتبقي على القرض.');
    return;
  }

  const note = prompt('ملاحظة على الدفعة (اختياري):','') || '';
  if(!Array.isArray(l.payments)) l.payments=[];
  l.payments.push({
    id:'P-'+Date.now(),
    amount,
    note,
    createdBy:state.currentUser.username,
    createdAt:new Date().toISOString()
  });
  l.paid = paid + amount;

  const newRemaining=Math.max(0, Number(l.total||0)-l.paid);
  if(newRemaining<=0.000001){
    l.paid = Number(l.total||0);
    l.status='مغلق';
    l.closedBy=state.currentUser.username;
    l.closedAt=new Date().toISOString();
  }
  render();
}

