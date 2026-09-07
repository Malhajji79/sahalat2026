function createEarlySettlementRequest(loanId){
  if(state.currentUser.role==='أدمن'){
    alert(tx('الأدمن لا ينشئ طلبات مراجعة فترة السداد.','Admin cannot create repayment-period review requests.'));
    return;
  }

  const l=state.loans.find(x=>x.id===loanId);
  if(!l || l.status!=='نشط') return;
  if(l.earlySettlementRequest){
    alert(tx('يوجد بالفعل طلب مراجعة فترة السداد بانتظار موافقة الأدمن.','A repayment-period review request is already awaiting admin approval.'));
    return;
  }

  const raw = prompt(
    `مراجعة فترة السداد للقرض ${l.id}
عدد الشهور الحالي: ${l.months}
المدفوع حتى الآن: ${money(Number(l.paid||0))}

أدخل عدد الشهور الجديد:`,
    String(l.months)
  );
  if(raw===null) return;

  const newMonths = Number(raw);
  if(!Number.isInteger(newMonths) || newMonths<1 || newMonths>state.maxMonths){
    alert(`عدد الشهور يجب أن يكون رقمًا صحيحًا بين 1 و${state.maxMonths}.`);
    return;
  }

  const r = calcRepaymentPeriodLoan(l,newMonths);

  const paid = Number(l.paid||0);
  const newRemaining = Math.max(0, r.total - paid);

  l.earlySettlementRequest = {
    status:'بانتظار موافقة الأدمن',
    requestedMonths:newMonths,
    requestedBy:state.currentUser.username,
    requestedAt:new Date().toISOString(),
    oldMonths:Number(l.months||0),
    oldTotal:Number(l.total||0),
    oldInstallment:Number(l.installment||0),
    oldSettlementDue:Number(l.settlementDue||0),
    paidAtRequest:paid,
    newBaseRate:r.baseRate,
    newBaseInterest:r.baseInterest,
    newAfterGeneral:r.afterGeneral,
    newUserNet:r.userNet,
    newAdminNet:r.adminNet,
    newFinalInterest:r.finalInterest,
    newTotal:r.total,
    newInstallment:r.installment,
    newSettlementDue:r.settlementDue,
    newRemaining
  };

  alert(
    `تم إنشاء طلب سداد مبكر بانتظار موافقة الأدمن.

المدة الجديدة: ${newMonths} شهر
الإجمالي الجديد: ${money(r.total)}
المدفوع السابق: ${money(paid)}
المتبقي الجديد: ${money(newRemaining)}
القسط الجديد: ${wholeMoney(r.installment)}
مستحق التصفية: ${money(r.settlementDue)}`
  );
  render();
}

function approveRepaymentPeriodRequest(loanId){
  if(state.currentUser.role!=='أدمن') return;
  const l=state.loans.find(x=>x.id===loanId);
  const req=l?.earlySettlementRequest;
  if(!l || !req) return;

  const ok = confirm(
    `اعتماد طلب مراجعة فترة السداد للقرض ${l.id}

طلبه: ${req.requestedBy}
المدة القديمة: ${req.oldMonths} شهر
المدة الجديدة: ${req.requestedMonths} شهر
الإجمالي القديم: ${money(req.oldTotal)}
الإجمالي الجديد: ${money(req.newTotal)}
المدفوع حتى الطلب: ${money(req.paidAtRequest)}
المتبقي الجديد: ${money(req.newRemaining)}
القسط الجديد: ${wholeMoney(req.newInstallment)}
مستحق التصفية الجديد: ${money(req.newSettlementDue)}`
  );
  if(!ok) return;

  l.earlySettlementHistory = l.earlySettlementHistory || [];
  const record = {
    ...req,
    status:'معتمد',
    reviewedBy:state.currentUser.username,
    reviewedAt:new Date().toISOString()
  };
  l.earlySettlementHistory.push(record);
  l.lastRepaymentPeriodReview = record;

  l.months=req.requestedMonths;
  l.baseRate=req.newBaseRate;
  l.baseInterest=req.newBaseInterest;
  l.afterGeneral=req.newAfterGeneral;
  l.userNet=req.newUserNet;
  l.adminNet=req.newAdminNet;
  l.finalInterest=req.newFinalInterest;
  l.total=req.newTotal;
  l.installment=req.newInstallment;
  l.settlementDue=req.newSettlementDue;

  if(Number(l.paid||0) >= Number(l.total||0)){
    l.paid=Number(l.total||0);
    l.status='مغلق';
    l.closedBy=state.currentUser.username;
    l.closedAt=new Date().toISOString();
  }

  delete l.earlySettlementRequest;
  render();
}

function rejectRepaymentPeriodRequest(loanId){
  if(state.currentUser.role!=='أدمن') return;
  const l=state.loans.find(x=>x.id===loanId);
  const req=l?.earlySettlementRequest;
  if(!l || !req) return;

  const reason = prompt('سبب رفض طلب مراجعة فترة السداد:','') || '';
  if(!confirm(`تأكيد رفض طلب مراجعة فترة السداد للقرض ${l.id}؟`)) return;

  l.earlySettlementHistory = l.earlySettlementHistory || [];
  const record = {
    ...req,
    status:'مرفوض',
    rejectionReason:reason,
    reviewedBy:state.currentUser.username,
    reviewedAt:new Date().toISOString()
  };
  l.earlySettlementHistory.push(record);
  l.lastRepaymentPeriodReview = record;
  delete l.earlySettlementRequest;
  render();
}

function reviewEarlySettlementRequest(loanId){
  approveRepaymentPeriodRequest(loanId);
}


