function paymentActionView(){
  const l=state.loans.find(x=>x.id===state.selectedLoanId);
  const p=l?.payments?.find(x=>x.id===state.selectedPaymentId);
  if(!l || !p) return `<div class="card">${tx('الدفعة غير موجودة.','Payment not found.')}</div>`;
  if(!canModifyLastPayment(l,p)){
    return `<div class="card">${isPaymentPrivilegedRole()?'انتهت مهلة الخمسة أيام لهذه الدفعة.':'انتهت مهلة التعديل أو أن هذه ليست آخر دفعة مسموح بتعديلها.'}</div>`;
  }

  const isEdit=state.paymentActionMode==='edit';

  return `
    <div class="toolbar">
      <button class="btn btn-secondary" id="paymentActionBackBtn">${tx('الرجوع لتفاصيل القرض','Back to Loan Details')}</button>
      <div class="muted">${tx('الدفعة','Payment')} ${p.id}</div>
    </div>

    <div class="panel" style="max-width:700px">
      <div class="notice" style="background:#ecfdf5;color:#166534">${isPaymentPrivilegedRole()?'الأدمن ومدير المشروع يستطيعان تعديل أو حذف أي دفعة خلال 5 أيام من تاريخ إضافتها، حتى لو كان القرض مسددًا.':'يمكنك تعديل أو حذف آخر دفعة سجلتها فقط خلال 24 ساعة.'}</div>
      <h3 class="section-title">${isEdit?tx('تعديل دفعة','Edit Payment'):tx('حذف دفعة','Delete Payment')}</h3>

      <div class="summary-row"><span>${tx('المبلغ الحالي','Current Amount')}</span><strong>${wholeMoney(p.amount)}</strong></div>
      <div class="summary-row"><span>${tx('التاريخ الحالي','Current Date')}</span><strong>${dateDisplay(p.paymentDate)}</strong></div>
      <div class="summary-row"><span>${tx('سجلها','Recorded By')}</span><strong>${p.createdBy||'—'}</strong></div>

      ${isEdit ? `
        <div class="field" style="margin-top:14px">
          <label>${tx('المبلغ الجديد','New Amount')}</label>
          <input id="editPaymentAmount" type="number" min="1" value="${Number(p.amount||0)}">
        </div>
        <div class="field">
          <label>التاريخ الجديد</label>
          ${customDateInput('editPaymentDate',p.paymentDate||todayISO())}
        </div>
        <div class="field">
          <label>الملاحظة</label>
          <input id="editPaymentNote" type="text" value="${p.note||''}">
        </div>` : ''}

      <div class="field">
        <label>سبب ${isEdit?'التعديل':'الحذف'}</label>
        <input id="paymentActionReason" type="text" placeholder="اكتب السبب">
      </div>

      <div id="paymentActionError" class="small" style="color:#b91c1c;margin-top:8px"></div>

      <div class="actions">
        <button class="btn ${isEdit?'btn-primary':'btn-danger'}" id="confirmPaymentActionBtn">${isEdit?'حفظ التعديل':'تأكيد الحذف'}</button>
        <button class="btn btn-secondary" id="cancelPaymentActionBtn">${tx('إلغاء','Cancel')}</button>
      </div>
    </div>`;
}

