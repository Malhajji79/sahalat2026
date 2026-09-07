function loanDetailsView(){
  const l = state.loans.find(x=>x.id===state.selectedLoanId);
  if(!l) return `<div class="card">${tx('القرض غير موجود.','Loan not found.')}</div>`;

  const paid = Number(l.paid||0);
  const remaining = Math.max(0, Number(l.total||0)-paid);
  const payments = Array.isArray(l.payments)?l.payments:[];
  const createdAt = dateTimeDisplay(l.createdAt);
  const approvedAt = dateTimeDisplay(l.approvedAt);

  // حذف القرض متاح فقط إذا لم تُسجل عليه أي دفعة وكان هو أحدث قرض
  // وفق صلاحيات دالة Supabase: المستخدم لأحدث قرض أنشأه، والأدمن/المدير لأحدث قرض في النظام.
  const privilegedDelete=['أدمن','مدير مشروع','مدير المشروع'].includes(state.currentUser?.role);
  const deleteScope=privilegedDelete
    ? state.loans
    : state.loans.filter(x=>String(x.createdById||'')===String(state.currentUser?.id||''));
  const latestLoan=deleteScope.slice().sort((a,b)=>{
    const ta=a.createdAt?new Date(a.createdAt).getTime():0;
    const tb=b.createdAt?new Date(b.createdAt).getTime():0;
    return tb-ta || String(b.id).localeCompare(String(a.id));
  })[0];
  const canDeleteLatestUnpaid=payments.length===0 && latestLoan && String(latestLoan.id)===String(l.id);

  return `
    <div class="toolbar">
      <button class="btn btn-secondary" id="backToLoans">${tx('الرجوع للقروض','Back to Loans')}</button>
      <div class="actions" style="margin:0">
        ${(state.currentUser.role==='أدمن' && l.status.includes('بانتظار'))?`<button class="btn btn-success" id="detailsReviewBtn">${tx('تعديل خصم الأدمن واعتماد','Edit Admin Discount & Approve')}</button>`:''}
        ${(state.currentUser.role!=='أدمن' && l.status==='نشط')?`<button class="btn btn-secondary" id="earlySettlementBtn">${tx('مراجعة فترة السداد','Review Repayment Period')}</button>`:''}
        ${(state.currentUser.role!=='أدمن' && l.status==='نشط')?`<button class="btn btn-primary" id="detailsPayBtn">${tx('تسجيل دفعة','Record Payment')}</button>`:''}
        ${(state.currentUser.role==='أدمن' && l.earlySettlementRequest)?`<button class="btn btn-success" id="reviewEarlySettlementBtn">${tx('مراجعة فترة السداد','Review Repayment Period')}</button>`:''}
        ${canDeleteLatestUnpaid?`<button class="btn btn-danger" id="deleteLatestUnpaidLoanBtn">${tx('حذف القرض','Delete Loan')}</button>`:''}
      </div>
    </div>

    <div class="grid cards">
      <div class="card"><div class="muted">${tx('رقم القرض','Loan No.')}</div><div class="kpi" style="font-size:22px">${l.id}</div></div>
      <div class="card"><div class="muted">${tx('الحالة','Status')}</div><div class="kpi" style="font-size:20px">${displayLoanStatus(l.status)}</div></div>
      <div class="card"><div class="muted">${tx('المدفوع','Paid')}</div><div class="kpi" style="font-size:20px">${wholeMoney(paid)}</div></div>
      <div class="card"><div class="muted">${tx('المتبقي','Remaining')}</div><div class="kpi" style="font-size:20px">${money(remaining)}</div></div>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr;gap:16px;margin-top:18px">
      <div class="card">
        <h3 class="section-title">${tx('بيانات المستفيد','Beneficiary Details')}</h3>
        <div class="summary-row"><span>${tx('الاسم','Name')}</span><strong>${l.beneficiary||'—'}</strong></div>
        <div class="summary-row"><span>${tx('رقم بطاقة الأحوال','National ID')}</span><strong>${l.nationalId||'—'}</strong></div>
        <div class="summary-row"><span>${tx('رقم الجوال','Mobile')}</span><strong>${l.mobile||'—'}</strong></div>
        <div class="summary-row"><span>${tx('تاريخ القرض','Loan Date')}</span><strong>${dateDisplay(l.loanDate)}</strong></div>
      </div>

      <div class="card">
        <h3 class="section-title">${tx('بيانات القرض','Loan Details')}</h3>
        <div class="summary-row"><span>${tx('المستخدم المخصص له القرض','Assigned User')}</span><strong>${l.assignedUser||l.createdBy||'—'}</strong></div>
        <div class="summary-row"><span>${tx('نوع القرض','Loan Type')}</span><strong>${displayLoanType(l.type)||'—'}</strong></div>
        <div class="summary-row"><span>${tx('قيمة القرض','Loan Amount')}</span><strong>${wholeMoney(l.amount)}</strong></div>
        <div class="summary-row"><span>${tx('عدد الشهور','Months')}</span><strong>${l.months||'—'}</strong></div>
        <div class="summary-row"><span>${tx('عدد الدفعات المدفوعة','Payments Made')}</span><strong>${payments.length}</strong></div>
        <div class="summary-row"><span>${tx('عدد الدفعات المتبقية لإنهاء القرض','Remaining Payments')}</span><strong>${Math.max(0, Number(l.months||0)-payments.length)}</strong></div>
        <div class="summary-row"><span>${tx('القسط الشهري','Monthly Installment')}</span><strong>${wholeMoney(l.installment||0)}</strong></div>
      </div>

      <div class="card">
        <h3 class="section-title">${tx('النسب والحسابات','Rates & Calculations')}</h3>
        <div class="summary-row"><span>${tx('نسبة الفائدة الأساسية','Base Interest Rate')}</span><strong>${l.baseRate!=null ? percentDisplay(l.baseRate) : '—'}</strong></div>
        <div class="summary-row"><span>${tx('الخصم العام','General Discount')}</span><strong>${l.generalDiscount!=null ? l.generalDiscount+'%' : '—'}</strong></div>
        <div class="summary-row"><span>${tx('خصم المستخدم','User Discount')}</span><strong>${l.userDiscount!=null ? l.userDiscount+'%' : '—'}</strong></div>
        <div class="summary-row"><span>${tx('خصم الأدمن','Admin Discount')}</span><strong>${l.adminDiscount!=null ? l.adminDiscount+'%' : '—'}</strong></div>
        <div class="summary-row"><span>${tx('حصة المستخدم','User Share')}</span><strong>${l.userNet!=null ? wholeMoney(l.userNet) : '—'}</strong></div>
        <div class="summary-row"><span>${tx('حصة الأدمن','Admin Share')}</span><strong>${l.adminNet!=null ? wholeMoney(l.adminNet) : '—'}</strong></div>
        <div class="summary-row"><span>${tx('الفائدة النهائية','Final Interest')}</span><strong>${l.finalInterest!=null ? wholeMoney(l.finalInterest) : '—'}</strong></div>
        <div class="summary-row"><span>${tx('إجمالي السداد','Total Due')}</span><strong>${money(l.total||0)}</strong></div>
        <div class="summary-row"><span>${tx('مستحق التصفية','Final Settlement Due')}</span><strong>${money(l.settlementDue||0)}</strong></div>
      </div>

      <div class="card">
        <h3 class="section-title">${tx('الاعتماد والسجل','Approval & History')}</h3>
        <div class="summary-row"><span>${tx('أنشأ القرض','Loan Created By')}</span><strong>${l.createdBy||'—'}</strong></div>
        <div class="summary-row"><span>${tx('تاريخ الإنشاء','Created At')}</span><strong>${createdAt}</strong></div>
        <div class="summary-row"><span>${tx('اعتمده','Approved By')}</span><strong>${l.approvedBy||'—'}</strong></div>
        <div class="summary-row"><span>${tx('تاريخ الاعتماد','Approved At')}</span><strong>${approvedAt}</strong></div>
        <div class="summary-row"><span>${tx('سبب الرفض','Rejection Reason')}</span><strong>${l.rejectReason||'—'}</strong></div>
      </div>
    </div>


    ${l.earlySettlementRequest?`
    <div class="card" style="margin-top:18px">
      <h3 class="section-title">طلب مراجعة فترة السداد بانتظار الاعتماد</h3>
      <div class="summary-row"><span>طلبه</span><strong>${l.earlySettlementRequest.requestedBy}</strong></div>
      <div class="summary-row"><span>عدد الشهور القديم</span><strong>${l.earlySettlementRequest.oldMonths}</strong></div>
      <div class="summary-row"><span>عدد الشهور الجديد</span><strong>${l.earlySettlementRequest.requestedMonths}</strong></div>
      <div class="summary-row"><span>${tx('الإجمالي الجديد','New Total')}</span><strong>${money(l.earlySettlementRequest.newTotal)}</strong></div>
      <div class="summary-row"><span>المدفوع السابق</span><strong>${money(l.earlySettlementRequest.paidAtRequest)}</strong></div>
      <div class="summary-row"><span>${tx('المتبقي الجديد','New Remaining')}</span><strong>${money(l.earlySettlementRequest.newRemaining)}</strong></div>
      <div class="summary-row"><span>${tx('القسط الجديد','New Installment')}</span><strong>${wholeMoney(l.earlySettlementRequest.newInstallment)}</strong></div>
    </div>`:''}

    ${(!l.earlySettlementRequest && l.lastRepaymentPeriodReview)?`
    <div class="card" style="margin-top:18px">
      <h3 class="section-title">آخر مراجعة لفترة السداد</h3>
      <div class="notice" style="${l.lastRepaymentPeriodReview.status==='معتمد'
        ? 'background:#ecfdf5;color:#166534'
        : 'background:#fef2f2;color:#991b1b'}">
        الحالة: <strong>${l.lastRepaymentPeriodReview.status==='معتمد'
          ? 'تم اعتماد مراجعة فترة السداد'
          : 'تم رفض مراجعة فترة السداد'}</strong>
      </div>
      <div class="summary-row"><span>المدة المطلوبة</span><strong>${l.lastRepaymentPeriodReview.requestedMonths} شهر</strong></div>
      <div class="summary-row"><span>راجع الطلب</span><strong>${l.lastRepaymentPeriodReview.reviewedBy||'—'}</strong></div>
      <div class="summary-row"><span>تاريخ المراجعة</span><strong>${l.lastRepaymentPeriodReview.reviewedAt ? dateTimeDisplay(l.lastRepaymentPeriodReview.reviewedAt) : '—'}</strong></div>
      ${l.lastRepaymentPeriodReview.status==='مرفوض'
        ? `<div class="summary-row"><span>${tx('سبب الرفض','Rejection Reason')}</span><strong>${l.lastRepaymentPeriodReview.rejectionReason||'—'}</strong></div>`
        : `<div class="summary-row"><span>${tx('الإجمالي الجديد','New Total')}</span><strong>${money(l.lastRepaymentPeriodReview.newTotal)}</strong></div>
           <div class="summary-row"><span>${tx('القسط الجديد','New Installment')}</span><strong>${wholeMoney(l.lastRepaymentPeriodReview.newInstallment)}</strong></div>`}
    </div>`:''}

    <div class="card" style="margin-top:18px">
      <h3 class="section-title">${tx('سجل الدفعات','Payment History')}</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${tx('المبلغ','Amount')}</th><th>${tx('سجلها','Recorded By')}</th><th>${tx('التاريخ','Date')}</th><th>${tx('الملاحظة','Note')}</th><th>${tx('الإجراء','Action')}</th></tr></thead>
          <tbody>
            ${payments.length ? payments.map(p=>`<tr>
              <td>${wholeMoney(p.amount)}</td>
              <td>${p.createdBy||'—'}</td>
              <td>${p.paymentDate ? dateDisplay(p.paymentDate) : dateTimeDisplay(p.createdAt)}</td>
              <td>${p.note||'—'}</td>
              <td>
                ${canModifyLastPayment(l,p)
                  ? `<button class="btn btn-secondary editLastPaymentBtn" data-id="${p.id}">${tx('تعديل','Edit')}</button>
                     <button class="btn btn-danger deleteLastPaymentBtn" data-id="${p.id}">${tx('حذف','Delete')}</button>`
                  : ''}
              </td>
            </tr>`).join('') : `<tr><td colspan="5" class="muted">${tx('لا توجد دفعات مسجلة.','No payments recorded.')}</td></tr>`}
          </tbody>
        </table>
      </div>

    ${Array.isArray(l.paymentAuditLog) && l.paymentAuditLog.length ? `
    <div class="card" style="margin-top:18px">
      <h3 class="section-title">سجل تعديلات الدفعات</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>العملية</th><th>رقم الدفعة</th><th>القيمة السابقة</th><th>القيمة الجديدة</th><th>السبب</th><th>نفذها</th><th>الوقت</th></tr></thead>
          <tbody>
            ${l.paymentAuditLog.slice().reverse().map(a=>`
              <tr>
                <td>${a.action}</td>
                <td>${a.paymentId}</td>
                <td>${a.oldAmount!=null?wholeMoney(a.oldAmount):'—'}</td>
                <td>${a.newAmount!=null?wholeMoney(a.newAmount):'—'}</td>
                <td>${a.reason||'—'}</td>
                <td>${a.actionBy||'—'}</td>
                <td>${a.actionAt?dateTimeDisplay(a.actionAt):'—'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`:''}
    </div>
  `;
}

