function loanApprovalView(){
  if(state.currentUser.role!=='أدمن'){
    return `<div class="card">${tx('هذه الصفحة متاحة للأدمن فقط.','This page is available to Admin only.')}</div>`;
  }

  const l=state.loans.find(x=>x.id===state.selectedLoanId);
  if(!l){
    return `<div class="card">${tx('القرض غير موجود.','Loan not found.')}</div>`;
  }
  if(!l.status.includes('بانتظار')){
    return `
      <div class="card">
        <h3>${tx('القرض','Loan')} ${l.id}</h3>
        <p>${tx('هذا القرض لم يعد بانتظار الاعتماد. الحالة الحالية:','This loan is no longer pending approval. Current status:')} <strong>${displayLoanStatus(l.status)}</strong></p>
        <button class="btn btn-secondary" id="approvalBackBtn">${tx('الرجوع للقروض','Back to Loans')}</button>
      </div>`;
  }

  const r=calcLoan(
    Number(l.amount||0),
    Number(l.months||0),
    Number(l.generalDiscount||0),
    Number(l.userDiscount||0),
    Number(l.adminDiscount||0)
  );

  return `
    <div class="toolbar">
      <button class="btn btn-secondary" id="approvalBackBtn">${tx('الرجوع للقروض','Back to Loans')}</button>
      <div class="muted">${tx('طلب أنشأه:','Request created by:')} <strong>${l.createdBy||'—'}</strong></div>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr;gap:16px">
      <div class="card">
        <h3 class="section-title">${tx('بيانات القرض','Loan Details')}</h3>
        <div class="summary-row"><span>${tx('رقم القرض','Loan No.')}</span><strong>${l.id}</strong></div>
        <div class="summary-row"><span>${tx('المستخدم المخصص له','Assigned User')}</span><strong>${l.assignedUser||'—'}</strong></div>
        <div class="summary-row"><span>${tx('المستفيد','Beneficiary')}</span><strong>${l.beneficiary||'—'}</strong></div>
        <div class="summary-row"><span>${tx('رقم بطاقة الأحوال','National ID')}</span><strong>${l.nationalId||'—'}</strong></div>
        <div class="summary-row"><span>${tx('رقم الجوال','Mobile')}</span><strong>${l.mobile||'—'}</strong></div>
        <div class="summary-row"><span>${tx('نوع القرض','Loan Type')}</span><strong>${displayLoanType(l.type)||'—'}</strong></div>
        <div class="summary-row"><span>${tx('قيمة القرض','Loan Amount')}</span><strong>${wholeMoney(l.amount)}</strong></div>
        <div class="summary-row"><span>${tx('عدد الشهور','Months')}</span><strong>${l.months}</strong></div>
        <div class="summary-row"><span>${tx('الخصم العام','General Discount')}</span><strong>${Number(l.generalDiscount||0)}%</strong></div>
        <div class="summary-row"><span>${tx('خصم المستخدم','User Discount')}</span><strong>${Number(l.userDiscount||0)}%</strong></div>
      </div>

      <div class="card">
        <h3 class="section-title">${tx('مراجعة الأدمن','Admin Review')}</h3>
        <div class="field">
          <label>${tx('نسبة خصم الأدمن %','Admin Discount %')}</label>
          <input id="approvalAdminDiscount" type="number" min="0" max="100" value="${Number(l.adminDiscount||0)}">
        </div>

        <div class="summary-row"><span>${tx('نسبة الفائدة الأساسية','Base Interest Rate')}</span><strong id="apBaseRate">${r.baseRate.toFixed(2)}%</strong></div>
        <div class="summary-row"><span>${tx('حصة المستخدم','User Share')}</span><strong id="apUserNet">${wholeMoney(r.userNet)}</strong></div>
        <div class="summary-row"><span>${tx('حصة الأدمن','Admin Share')}</span><strong id="apAdminNet">${wholeMoney(r.adminNet)}</strong></div>
        <div class="summary-row"><span>${tx('الفائدة النهائية','Final Interest')}</span><strong id="apFinalInterest">${wholeMoney(r.finalInterest)}</strong></div>
        <div class="summary-row"><span>${tx('إجمالي السداد','Total Due')}</span><strong id="apTotal">${money(r.total)}</strong></div>
        <div class="summary-row"><span>${tx('القسط الشهري','Monthly Installment')}</span><strong id="apInstallment">${wholeMoney(r.installment)}</strong></div>
        <div class="summary-row"><span>${tx('مستحق التصفية','Final Settlement Due')}</span><strong id="apSettlement">${money(r.settlementDue)}</strong></div>

        <div class="field" style="margin-top:14px">
          <label>${tx('سبب الرفض (يُستخدم فقط عند رفض القرض)','Rejection reason (used only when rejecting the loan)')}</label>
          <input id="approvalRejectReason" type="text" placeholder="${tx('اكتب سبب رفض القرض','Enter the rejection reason')}">
        </div>

        <div id="approvalError" class="small" style="color:#b91c1c;margin-top:10px"></div>
        <div class="actions">
          <button class="btn btn-success" id="approveLoanFinalBtn">${tx('اعتماد القرض','Approve Loan')}</button>
          <button class="btn btn-danger" id="rejectLoanFinalBtn">${tx('رفض القرض','Reject Loan')}</button>
        </div>
      </div>
    </div>`;
}

