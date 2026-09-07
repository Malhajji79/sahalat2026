function repaymentPeriodAdminReviewView(){
  if(state.currentUser.role!=='أدمن'){
    return `<div class="card">${tx('هذه الصفحة متاحة للأدمن فقط.','This page is available to Admin only.')}</div>`;
  }

  const r=(state.repaymentRequests||[]).find(x=>x.id===state.selectedRepaymentRequestId);
  const l=state.loans.find(x=>x.dbId===r?.loanDbId) || state.loans.find(x=>x.id===state.selectedLoanId);

  if(!r || !l){
    return `<div class="card">
      <h3 class="section-title">${tx('مراجعة فترة السداد','Review Repayment Period')}</h3>
      <p>${tx('طلب المراجعة غير موجود.','Review request not found.')}</p>
      <button class="btn btn-secondary" id="adminRepaymentBackBtn">${tx('الرجوع','Back')}</button>
    </div>`;
  }

  return `
    <div class="toolbar">
      <button class="btn btn-secondary" id="adminRepaymentBackBtn">${tx('الرجوع لطلبات المراجعة','Back to Review Requests')}</button>
      <div class="muted">${tx('القرض رقم','Loan No.')} <strong>${l.id}</strong></div>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <h3 class="section-title">${tx('الوضع الحالي','Current Position')}</h3>
        <div class="summary-row"><span>${tx('المستخدم','User')}</span><strong>${r.requestedBy||'—'}</strong></div>
        <div class="summary-row"><span>${tx('المستفيد','Beneficiary')}</span><strong>${l.beneficiary||'—'}</strong></div>
        <div class="summary-row"><span>${tx('عدد الشهور الحالي','Current Months')}</span><strong>${r.oldMonths}</strong></div>
        <div class="summary-row"><span>${tx('إجمالي السداد الحالي','Current Total Due')}</span><strong>${money(r.oldTotal)}</strong></div>
        <div class="summary-row"><span>${tx('القسط الحالي','Current Installment')}</span><strong>${wholeMoney(r.oldInstallment)}</strong></div>
        <div class="summary-row"><span>${tx('المدفوع حتى وقت الطلب','Paid at Request Time')}</span><strong>${money(r.paidAtRequest)}</strong></div>
      </div>

      <div class="card">
        <h3 class="section-title">${tx('بعد مراجعة فترة السداد','After Repayment Period Review')}</h3>
        <div class="summary-row"><span>عدد الشهور الجديد</span><strong>${r.requestedMonths}</strong></div>
        <div class="summary-row"><span>${tx('إجمالي السداد الجديد','New Total Due')}</span><strong>${money(r.newTotal)}</strong></div>
        <div class="summary-row"><span>${tx('القسط الشهري الجديد','New Monthly Installment')}</span><strong>${wholeMoney(r.newInstallment)}</strong></div>
        <div class="summary-row"><span>${tx('المتبقي الجديد','New Remaining')}</span><strong>${money(r.newRemaining)}</strong></div>
        <div class="summary-row"><span>${tx('حصة المستخدم الجديدة','New User Share')}</span><strong>${wholeMoney(r.newUserNet)}</strong></div>
        <div class="summary-row"><span>${tx('حصة المالك الجديدة','New Owner Share')}</span><strong>${wholeMoney(r.newAdminNet)}</strong></div>
      </div>
    </div>

    <div class="card" style="margin-top:18px">
      <div class="field">
        <label>${tx('ملاحظة الأدمن','Admin Note')}</label>
        <input id="adminRepaymentNote" type="text" placeholder="${tx('اختياري للاعتماد، ومطلوب عند الرفض','Optional for approval; required for rejection')}">
      </div>
      <div id="adminRepaymentError" class="small" style="color:#b91c1c;margin-top:8px"></div>
      <div class="actions">
        <button class="btn btn-success" id="approveRepaymentPeriodBtn">${tx('اعتماد التغيير','Approve Change')}</button>
        <button class="btn btn-danger" id="rejectRepaymentPeriodBtn">${tx('رفض التغيير','Reject Change')}</button>
      </div>
    </div>`;
}

