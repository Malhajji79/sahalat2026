function recordPaymentView(){
  if(state.currentUser.role==='أدمن'){
    return `<div class="card">${tx('الأدمن لا يستطيع تسجيل الدفعات.','Admin cannot record payments.')}</div>`;
  }

  const l=state.loans.find(x=>x.id===state.selectedLoanId);
  if(!l){
    return `<div class="card">${tx('القرض غير موجود.','Loan not found.')}</div>`;
  }
  if(l.status!=='نشط'){
    return `<div class="card">${tx('لا يمكن تسجيل دفعة إلا على قرض نشط.','Payments can only be recorded for an active loan.')}</div>`;
  }

  const paid=Number(l.paid||0);
  const remaining=Math.max(0,Number(l.total||0)-paid);
  const suggested = remaining <= Number(l.installment||0) + Number(l.settlementDue||0)
    ? remaining
    : Number(l.installment||0);

  return `
    
    <div class="toolbar">
      <button class="btn btn-secondary" id="paymentBackBtn">${tx('الرجوع لتفاصيل القرض','Back to Loan Details')}</button>
      <div class="muted">${tx('القرض رقم','Loan No.')} <strong>${l.id}</strong></div>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <h3 class="section-title">${tx('ملخص القرض','Loan Summary')}</h3>
        <div class="summary-row"><span>${tx('المستفيد','Beneficiary')}</span><strong>${l.beneficiary||'—'}</strong></div>
        <div class="summary-row"><span>${tx('المستخدم','User')}</span><strong>${l.assignedUser||l.createdBy||'—'}</strong></div>
        <div class="summary-row"><span>${tx('إجمالي السداد','Total Due')}</span><strong>${money(l.total||0)}</strong></div>
        <div class="summary-row"><span>${tx('المدفوع حتى الآن','Paid So Far')}</span><strong>${money(paid)}</strong></div>
        <div class="summary-row"><span>${tx('المتبقي','Remaining')}</span><strong>${money(remaining)}</strong></div>
        <div class="summary-row"><span>${tx('القسط الشهري','Monthly Installment')}</span><strong>${wholeMoney(l.installment||0)}</strong></div>
        <div class="summary-row"><span>${tx('عدد الدفعات السابقة','Previous Payments')}</span><strong>${Array.isArray(l.payments) ? l.payments.length : 0}</strong></div>
        <div class="summary-row"><span>${tx('عدد الدفعات المتبقية لإنهاء القرض','Remaining Payments')}</span><strong>${Math.max(0, Number(l.months||0) - (Array.isArray(l.payments) ? l.payments.length : 0))}</strong></div>
        <div class="summary-row"><span>${tx('مستحق التصفية','Final Settlement Due')}</span><strong>${money(l.settlementDue||0)}</strong></div>
      </div>

      <div class="card">
        <h3 class="section-title">${tx('تسجيل الدفعة','Record Payment')}</h3>
        <div class="field">
          <label>${tx('مبلغ الدفعة','Payment Amount')}</label>
          <input id="paymentAmount" type="number" min="1" max="${remaining}" value="${whole(suggested)}">
        </div>
        <div class="field">
          <label>${tx('تاريخ الدفعة','Payment Date')}</label>
          ${customDateInput('paymentDate',todayISO())}
        </div>
        <div class="field">
          <label>${tx('ملاحظة (اختياري)','Note (Optional)')}</label>
          <input id="paymentNote" type="text" placeholder="${tx('ملاحظة على الدفعة','Payment note')}">
        </div>

        <div id="paymentError" class="small" style="color:#b91c1c;margin-top:8px"></div>

        <div class="actions">
          <button class="btn btn-primary" id="savePaymentBtn">${tx('حفظ الدفعة','Save Payment')}</button>
          <button class="btn btn-secondary" id="cancelPaymentBtn">${tx('إلغاء','Cancel')}</button>
        </div>
      </div>
    </div>`;
}

