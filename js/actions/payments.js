function appendPaymentAudit(l,entry){
  if(!Array.isArray(l.paymentAuditLog)) l.paymentAuditLog=[];
  l.paymentAuditLog.push({
    ...entry,
    actionBy:state.currentUser.username,
    actionAt:new Date().toISOString()
  });
}

function editLastPayment(loanId,paymentId,newAmount,newDate,newNote,reason){
  const l=state.loans.find(x=>x.id===loanId);
  const p=l?.payments?.find(x=>x.id===paymentId);
  if(!l || !p) return {ok:false,msg:'الدفعة غير موجودة.'};
  if(!canModifyLastPayment(l,p)){
    return {ok:false,msg:isPaymentPrivilegedRole()
      ? 'انتهت مهلة الخمسة أيام لتعديل هذه الدفعة.'
      : (paymentActionWindowOpen(p)
          ? 'يمكن تعديل آخر دفعة فقط بواسطة المستخدم الذي سجلها.'
          : 'انتهت مهلة تعديل الدفعة بعد مرور 24 ساعة.')};
  }
  if(!Number.isFinite(newAmount) || newAmount<=0) return {ok:false,msg:'مبلغ الدفعة غير صحيح.'};
  if(!newDate) return {ok:false,msg:'تاريخ الدفعة مطلوب.'};
  if(!reason || !reason.trim()) return {ok:false,msg:'سبب التعديل مطلوب.'};

  const oldAmount=Number(p.amount||0);
  const oldPaid=Number(l.paid||0);
  const newPaid=oldPaid-oldAmount+newAmount;
  if(newPaid<0) return {ok:false,msg:'قيمة المدفوع الناتجة غير صحيحة.'};
  if(newPaid>Number(l.total||0)) return {ok:false,msg:'مجموع الدفعات بعد التعديل أكبر من إجمالي السداد.'};

  appendPaymentAudit(l,{
    action:'تعديل دفعة',
    paymentId:p.id,
    oldAmount,
    newAmount,
    oldDate:p.paymentDate||'',
    newDate,
    oldNote:p.note||'',
    newNote:newNote||'',
    reason:reason.trim()
  });

  p.amount=newAmount;
  p.paymentDate=newDate;
  p.note=newNote||'';
  p.lastEditedBy=state.currentUser.username;
  p.lastEditedAt=new Date().toISOString();
  p.lastEditReason=reason.trim();

  l.paid=newPaid;

  if(l.paid>=Number(l.total||0)-0.000001){
    l.paid=Number(l.total||0);
    l.status='مغلق';
    l.closedBy=state.currentUser.username;
    l.closedAt=new Date().toISOString();
  }else if(l.status==='مغلق'){
    l.status='نشط';
    delete l.closedBy;
    delete l.closedAt;
  }

  return {ok:true};
}

function deleteLastPayment(loanId,paymentId,reason){
  const l=state.loans.find(x=>x.id===loanId);
  const p=l?.payments?.find(x=>x.id===paymentId);
  if(!l || !p) return {ok:false,msg:'الدفعة غير موجودة.'};
  if(!canModifyLastPayment(l,p)){
    return {ok:false,msg:isPaymentPrivilegedRole()
      ? 'انتهت مهلة الخمسة أيام لحذف هذه الدفعة.'
      : (paymentActionWindowOpen(p)
          ? 'يمكن حذف آخر دفعة فقط بواسطة المستخدم الذي سجلها.'
          : 'انتهت مهلة حذف الدفعة بعد مرور 24 ساعة.')};
  }
  if(!reason || !reason.trim()) return {ok:false,msg:'سبب الحذف مطلوب.'};

  appendPaymentAudit(l,{
    action:'حذف دفعة',
    paymentId:p.id,
    oldAmount:Number(p.amount||0),
    oldDate:p.paymentDate||'',
    oldNote:p.note||'',
    reason:reason.trim()
  });

  l.paid=Math.max(0,Number(l.paid||0)-Number(p.amount||0));
  l.payments=l.payments.filter(x=>x.id!==p.id);

  if(l.status==='مغلق'){
    l.status='نشط';
    delete l.closedBy;
    delete l.closedAt;
  }

  return {ok:true};
}



;
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

