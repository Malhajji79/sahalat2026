function repaymentPeriodRequestView(){
  if(state.currentUser.role==='أدمن'){
    return `<div class="card">${tx('الأدمن لا ينشئ طلبات مراجعة فترة السداد.','Admin cannot create repayment-period review requests.')}</div>`;
  }

  const l=state.loans.find(x=>x.id===state.selectedLoanId);
  if(!l) return `<div class="card">${tx('القرض غير موجود.','Loan not found.')}</div>`;
  if(l.status!=='نشط') return `<div class="card">${tx('مراجعة فترة السداد متاحة للقروض النشطة فقط.','Repayment-period review is available for active loans only.')}</div>`;
  if(l.earlySettlementRequest){
    return `
      <div class="card">
        <h3>${tx('يوجد طلب مراجعة فترة السداد قائم بالفعل','A repayment-period review request already exists')}</h3>
        <p>${tx('الحالة','Status')}: <strong>${tx('بانتظار موافقة الأدمن','Pending Admin Approval')}</strong></p>
        <button class="btn btn-secondary" id="repaymentBackBtn">${tx('الرجوع لتفاصيل القرض','Back to Loan Details')}</button>
      </div>`;
  }

  const paid=Number(l.paid||0);

  return `
    <div class="toolbar">
      <button class="btn btn-secondary" id="repaymentBackBtn">${tx('الرجوع لتفاصيل القرض','Back to Loan Details')}</button>
      <div class="muted">${tx('القرض رقم','Loan No.')} <strong>${l.id}</strong></div>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <h3 class="section-title">${tx('الوضع الحالي','Current Position')}</h3>
        <div class="summary-row"><span>${tx('المستفيد','Beneficiary')}</span><strong>${l.beneficiary||'—'}</strong></div>
        <div class="summary-row"><span>${tx('عدد الشهور الحالي','Current Months')}</span><strong>${l.months}</strong></div>
        <div class="summary-row"><span>${tx('إجمالي السداد الحالي','Current Total Due')}</span><strong>${money(l.total||0)}</strong></div>
        <div class="summary-row"><span>${tx('المدفوع حتى الآن','Paid So Far')}</span><strong>${money(paid)}</strong></div>
        <div class="summary-row"><span>${tx('المتبقي الحالي','Current Remaining')}</span><strong>${money(Math.max(0,Number(l.total||0)-paid))}</strong></div>
      </div>

      <div class="card">
        <h3 class="section-title">${tx('المراجعة الجديدة','New Review')}</h3>
        <div class="field">
          <label>${tx('عدد الشهور الجديد','New Number of Months')}</label>
          <input id="repaymentNewMonths" type="number" min="1" max="${state.maxMonths}" value="${l.months}">
        </div>

        <div class="summary-row"><span>${tx('الإجمالي الجديد','New Total')}</span><strong id="rpNewTotal">—</strong></div>
        <div class="summary-row"><span>${tx('المتبقي بعد خصم المدفوع','Remaining After Payments')}</span><strong id="rpNewRemaining">—</strong></div>
        <div class="summary-row"><span>${tx('القسط الجديد','New Installment')}</span><strong id="rpNewInstallment">—</strong></div>
        <div class="summary-row"><span>${tx('مستحق التصفية الجديد','New Settlement Due')}</span><strong id="rpNewSettlement">—</strong></div>

        <div id="repaymentError" class="small" style="color:#b91c1c;margin-top:8px"></div>

        <div class="actions">
          <button class="btn btn-primary" id="submitRepaymentReviewBtn">${tx('إرسال طلب المراجعة','Submit Review Request')}</button>
          <button class="btn btn-secondary" id="cancelRepaymentReviewBtn">${tx('إلغاء','Cancel')}</button>
        </div>
      </div>
    </div>`;
}

