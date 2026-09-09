function paymentsTableRows(rows){
  return rows.length ? htmlJoin(rows.map(r=>html`<tr>
    <td>${r.loanId}</td><td>${r.beneficiary}</td><td>${wholeMoney(r.amount)}</td><td>${r.by||'—'}</td>
    <td>${paymentDisplayDate(r)}</td><td>${r.note||'—'}</td>
  </tr>`)) : html`<tr><td colspan="6" class="muted">${tx('لا توجد دفعات مطابقة للفلاتر.','No payments match the filters.')}</td></tr>`;
}

function paymentsView(){
  const rows=paymentLogRows();
  const totalPaid=rows.reduce((s,r)=>s+Number(r.amount||0),0);
  const recorders=[...new Set(rows.map(r=>r.by).filter(x=>x&&x!=='—'))].sort((a,b)=>String(a).localeCompare(String(b),state.lang==='en'?'en':'ar'));
  return html`
  <div class="grid cards">
    <div class="card"><div class="muted">${tx('عدد الدفعات','Payment Count')}</div><div class="kpi" id="paymentsCountKpi">${arNum(0)}</div></div>
    <div class="card"><div class="muted">${tx('إجمالي الدفعات المسجلة','Total Recorded Payments')}</div><div class="kpi" id="paymentsTotalKpi" style="font-size:22px">${wholeMoney(0)}</div></div>
  </div>
  <div class="card" style="margin-top:18px"><div class="toolbar" style="margin:0">
    <div class="field" style="margin:0;min-width:170px;flex:1"><label>${tx('رقم القرض','Loan No.')}</label><input id="paymentLoanFilter" type="search" inputmode="numeric" placeholder="${tx('ابحث برقم القرض','Search by loan number')}"></div>
    <div class="field" style="margin:0;min-width:170px;flex:1"><label>${tx('التاريخ','Date')}</label>${customDateInput('paymentDateFilter','')}</div>
    <div class="field" style="margin:0;min-width:190px;flex:1"><label>${tx('المسجل','Recorded By')}</label><select id="paymentRecorderFilter"><option value="">${tx('الكل','All')}</option>${htmlJoin(recorders.map(x=>html`<option value="${x}">${x}</option>`))}</select></div>
    <div style="align-self:flex-end"><button class="btn btn-secondary" id="clearPaymentFilters" type="button">${tx('مسح الفلاتر','Clear Filters')}</button><button class="btn btn-primary" id="showAllPayments" type="button">${tx('إظهار الجميع','Show All')}</button></div>
  </div><div class="small muted" id="paymentsFilterSummary" style="margin-top:12px">${tx('اختر فلترًا لعرض الدفعات أو اضغط إظهار الجميع.','Choose a filter to view payments, or select Show All.')}</div></div>
  <div class="card" style="margin-top:18px"><div class="muted">${tx('هذا سجل Log للدفعات. كل دفعة تحفظ باسم المستخدم ووقت التسجيل ولا تُحذف من السجل. وعند سداد كامل المتبقي، يُغلق القرض تلقائيًا بعد احتساب مستحق التصفية.','This is the payment log. Each payment keeps the username and recording date and is not removed from the log. When the full remaining balance is paid, the loan closes automatically after calculating the final settlement due.')}</div></div>
  <div class="table-wrap" id="paymentsResults" hidden style="margin-top:18px"><table><thead><tr><th>${tx('رقم القرض','Loan No.')}</th><th>${tx('المستفيد','Beneficiary')}</th><th>${tx('مبلغ الدفعة','Payment Amount')}</th><th>${tx('سجلها','Recorded By')}</th><th>${tx('التاريخ والوقت','Date')}</th><th>${tx('ملاحظة','Note')}</th></tr></thead><tbody id="paymentsTableBody"></tbody></table></div>`;
}


;
function loansView(){
  const scopedLoans = visibleLoansForCurrentUser();
  const {creators,types}=loanFilterOptions();

  const isManager=state.currentUser?.role==='مدير مشروع';
  const activeLoans=scopedLoans
    .filter(l=>l.status==='نشط')
    .sort((a,b)=>{
      const aPaid=hasPaymentInCurrentCollectionWindow(a);
      const bPaid=hasPaymentInCurrentCollectionWindow(b);

      // Manager view priority:
      // 1) Loans created by the manager that have NOT paid in the current 26→5 window.
      // 2) Other unpaid loans.
      // 3) Loans that paid in the current window (green rows) at the bottom.
      if(isManager){
        const aOwnUnpaid=!aPaid && (String(a.createdById||'')===String(state.currentUser?.id||''));
        const bOwnUnpaid=!bPaid && (String(b.createdById||'')===String(state.currentUser?.id||''));
        const aRank=aOwnUnpaid?0:(!aPaid?1:2);
        const bRank=bOwnUnpaid?0:(!bPaid?1:2);
        if(aRank!==bRank) return aRank-bRank;
        return 0;
      }

      const aPaidRank=aPaid?1:0;
      const bPaidRank=bPaid?1:0;
      if(aPaidRank!==bPaidRank) return aPaidRank-bPaidRank;
      return 0;
    });
  const otherLoans=scopedLoans.filter(l=>String(l.status||'').includes('بانتظار'));
  const closedLoans=scopedLoans.filter(l=>l.status==='مغلق').sort((a,b)=>{
    const aPaid=hasPaymentInCurrentCollectionWindow(a)?1:0;
    const bPaid=hasPaymentInCurrentCollectionWindow(b)?1:0;
    if(aPaid!==bPaid) return aPaid-bPaid;
    return 0;
  });

  const loanRows=(loans)=>htmlJoin(loans.map(l=>{
    const paid = Number(l.paid||0);
    const remaining = Math.max(0, Number(l.total||0)-paid);
    const paidInWindow=hasPaymentInCurrentCollectionWindow(l);
    return html`<tr class="${paidInWindow?'loan-paid-current-window':''}" data-loan-id="${l.id}" data-loan-creator="${l.createdBy||''}" data-loan-type="${l.type||''}">
      <td><button class="btn btn-secondary openLoan" data-id="${l.id}">${l.id}</button></td>
      <td>${l.beneficiary}</td>
      <td>${l.createdBy || '—'}</td>
      <td>${displayLoanType(l.type)}</td>
      <td>${wholeMoney(l.amount)}</td>
      <td>${wholeMoney(paid)}</td>
      <td>${wholeMoney(remaining)}</td>
      <td><span class="status ${l.status==='نشط'?'active':l.status==='مغلق'?'active':l.status.includes('بانتظار')?'pending':'rejected'}">${displayLoanStatus(l.status)}</span></td>
      <td>
        ${(state.currentUser.role==='أدمن' && l.status.includes('بانتظار'))?html`<button class="btn btn-success reviewLoan" data-id="${l.id}">${tx('مراجعة واعتماد','Review & Approve')}</button>`:''}
        ${(state.currentUser.role!=='أدمن' && l.status==='نشط')?html`<button class="btn ${paidInWindow?'btn-success':'btn-primary'} payLoan" data-id="${l.id}">${tx('تسجيل دفعة','Record Payment')}</button>`:''}
        ${(!l.status.includes('بانتظار') && l.status!=='نشط')?'—':''}
      </td>
    </tr>`;
  }));

  const tableHead=html`<table><thead><tr><th>${tx('رقم القرض','Loan No.')}</th><th>${tx('المستفيد','Beneficiary')}</th><th>${tx('أنشأه','Created By')}</th><th>${tx('النوع','Type')}</th><th>${tx('المبلغ','Amount')}</th><th>${tx('المدفوع','Paid')}</th><th>${tx('المتبقي','Remaining')}</th><th>${tx('الحالة','Status')}</th><th>${tx('إجراء','Action')}</th></tr></thead>`;

  return html`
    

    <div class="card" style="margin-bottom:16px">
      <div class="toolbar" style="margin:0">
        <div class="field" style="margin:0;min-width:220px;flex:1">
          <label>${tx('المنشئ','Creator')}</label>
          <select id="loanCreatorFilter">
            <option value="">${tx('الكل','All')}</option>
            ${htmlJoin(creators.map(x=>html`<option value="${x}">${x}</option>`))}
          </select>
        </div>
        <div class="field" style="margin:0;min-width:220px;flex:1">
          <label>${tx('النوع','Type')}</label>
          <select id="loanTypeFilter">
            <option value="">${tx('الكل','All')}</option>
            ${htmlJoin(types.map(x=>html`<option value="${x}">${x}</option>`))}
          </select>
        </div>
        <div style="align-self:flex-end">
          <button class="btn btn-secondary" id="clearLoanFilters" type="button">${tx('مسح الفلاتر','Clear Filters')}</button>
        </div>
      </div>
      <div class="small muted" id="loanFilterSummary" style="margin-top:10px">${tx('عرض جميع القروض:','Showing all loans:')} ${scopedLoans.length}</div>
    </div>

    <div class="toolbar">
      <div class="muted">${tx('سجل القروض الحقيقي','Loan Register')}</div>
      ${state.currentUser.role!=='أدمن'?html`<button class="btn btn-primary" onclick="state.page='new-loan';render()">+ ${tx('قرض جديد','New Loan')}</button>`:''}
    </div>

    ${otherLoans.length?html`
      <div style="height:16px"></div>
      <div class="card" style="padding:0;overflow:hidden" id="otherLoansSection">
        <div style="padding:14px 16px;background:#fff7ed;border-bottom:1px solid #fed7aa;font-weight:800;color:#9a3412">
          ${tx('قروض بانتظار الإجراء','Loans Awaiting Action')} <span class="small" id="otherLoansCount">(${otherLoans.length})</span>
        </div>
        <div class="table-wrap">
          ${tableHead}<tbody id="otherLoansBody">${loanRows(otherLoans)}</tbody></table>
        </div>
      </div>
    `:''}

    <details class="card loan-section" id="activeLoansSection" style="padding:0;overflow:hidden">
      <summary style="padding:14px 16px;background:#ecfdf5;border-bottom:1px solid #d1fae5;font-weight:800;color:#166534">
        ${tx('القروض النشطة','Active Loans')} <span class="small" id="activeLoansCount">(${activeLoans.length})</span> <span class="small">${tx('إظهار / إخفاء','Show / Hide')}</span>
      </summary>
      <div class="table-wrap">
        ${tableHead}<tbody id="activeLoansBody">
          ${activeLoans.length?loanRows(activeLoans):html`<tr class="empty-row"><td colspan="9" class="muted">${tx('لا توجد قروض نشطة.','No active loans.')}</td></tr>`}
        </tbody></table>
      </div>
    </details>



    <div style="height:22px;border-bottom:2px solid var(--border);margin-bottom:22px"></div>

    <details class="card loan-section" id="closedLoansSection" style="padding:0;overflow:hidden">
      <summary style="padding:14px 16px;background:#f8fafc;border-bottom:1px solid var(--border);font-weight:800;color:#475569">
        ${tx('القروض المغلقة','Closed Loans')} <span class="small" id="closedLoansCount">(${closedLoans.length})</span> <span class="small">${tx('إظهار / إخفاء','Show / Hide')}</span>
      </summary>
      <div class="table-wrap">
        ${tableHead}<tbody id="closedLoansBody">
          ${closedLoans.length?loanRows(closedLoans):html`<tr class="empty-row"><td colspan="9" class="muted">${tx('لا توجد قروض مغلقة.','No closed loans.')}</td></tr>`}
        </tbody></table>
      </div>
    </details>`;
}


;
function recordPaymentView(){
  if(state.currentUser.role==='أدمن'){
    return html`<div class="card">${tx('الأدمن لا يستطيع تسجيل الدفعات.','Admin cannot record payments.')}</div>`;
  }

  const l=state.loans.find(x=>x.id===state.selectedLoanId);
  if(!l){
    return html`<div class="card">${tx('القرض غير موجود.','Loan not found.')}</div>`;
  }
  if(l.status!=='نشط'){
    return html`<div class="card">${tx('لا يمكن تسجيل دفعة إلا على قرض نشط.','Payments can only be recorded for an active loan.')}</div>`;
  }

  const paid=Number(l.paid||0);
  const remaining=Math.max(0,Number(l.total||0)-paid);
  const suggested = remaining <= Number(l.installment||0) + Number(l.settlementDue||0)
    ? remaining
    : Number(l.installment||0);

  return html`
    
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


;
function paymentActionView(){
  const l=state.loans.find(x=>x.id===state.selectedLoanId);
  const p=l?.payments?.find(x=>x.id===state.selectedPaymentId);
  if(!l || !p) return html`<div class="card">${tx('الدفعة غير موجودة.','Payment not found.')}</div>`;
  if(!canModifyPayment(l,p)){
    return html`<div class="card">${isPaymentPrivilegedRole()?'انتهت مهلة الخمسة أيام لهذه الدفعة.':'انتهت مهلة التعديل أو أن هذه ليست آخر دفعة مسموح بتعديلها.'}</div>`;
  }

  const isEdit=state.paymentActionMode==='edit';

  return html`
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

      ${isEdit ? html`
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


;
function loanDetailsView(){
  const l = state.loans.find(x=>x.id===state.selectedLoanId);
  if(!l) return html`<div class="card">${tx('القرض غير موجود.','Loan not found.')}</div>`;

  const paid = Number(l.paid||0);
  const remaining = Math.max(0, Number(l.total||0)-paid);
  const payments = Array.isArray(l.payments)?l.payments:[];
  const createdAt = dateTimeDisplay(l.createdAt);
  const approvedAt = dateTimeDisplay(l.approvedAt);

  // حذف القرض متاح فقط إذا لم تُسجل عليه أي دفعة وكان هو أحدث قرض
  // وفق صلاحيات دالة Supabase: المستخدم لأحدث قرض أنشأه، والأدمن/المدير لأحدث قرض في النظام.
  const privilegedDelete=['أدمن','مدير مشروع'].includes(state.currentUser?.role);
  const deleteScope=privilegedDelete
    ? state.loans
    : state.loans.filter(x=>String(x.createdById||'')===String(state.currentUser?.id||''));
  const latestLoan=deleteScope.slice().sort((a,b)=>{
    const ta=a.createdAt?new Date(a.createdAt).getTime():0;
    const tb=b.createdAt?new Date(b.createdAt).getTime():0;
    return tb-ta || String(b.id).localeCompare(String(a.id));
  })[0];
  const canDeleteLatestUnpaid=payments.length===0 && latestLoan && String(latestLoan.id)===String(l.id);

  return html`
    <div class="toolbar">
      <button class="btn btn-secondary" id="backToLoans">${tx('الرجوع للقروض','Back to Loans')}</button>
      <div class="actions" style="margin:0">
        ${(state.currentUser.role==='أدمن' && l.status.includes('بانتظار'))?html`<button class="btn btn-success" id="detailsReviewBtn">${tx('تعديل خصم الأدمن واعتماد','Edit Admin Discount & Approve')}</button>`:''}
        ${(state.currentUser.role!=='أدمن' && l.status==='نشط')?html`<button class="btn btn-secondary" id="earlySettlementBtn">${tx('مراجعة فترة السداد','Review Repayment Period')}</button>`:''}
        ${(state.currentUser.role!=='أدمن' && l.status==='نشط')?html`<button class="btn btn-primary" id="detailsPayBtn">${tx('تسجيل دفعة','Record Payment')}</button>`:''}
        ${(state.currentUser.role==='أدمن' && l.earlySettlementRequest)?html`<button class="btn btn-success" id="reviewEarlySettlementBtn">${tx('مراجعة فترة السداد','Review Repayment Period')}</button>`:''}
        ${canDeleteLatestUnpaid?html`<button class="btn btn-danger" id="deleteLatestUnpaidLoanBtn">${tx('حذف القرض','Delete Loan')}</button>`:''}
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


    ${l.earlySettlementRequest?html`
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

    ${(!l.earlySettlementRequest && l.lastRepaymentPeriodReview)?html`
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
        ? html`<div class="summary-row"><span>${tx('سبب الرفض','Rejection Reason')}</span><strong>${l.lastRepaymentPeriodReview.rejectionReason||'—'}</strong></div>`
        : html`<div class="summary-row"><span>${tx('الإجمالي الجديد','New Total')}</span><strong>${money(l.lastRepaymentPeriodReview.newTotal)}</strong></div>
           <div class="summary-row"><span>${tx('القسط الجديد','New Installment')}</span><strong>${wholeMoney(l.lastRepaymentPeriodReview.newInstallment)}</strong></div>`}
    </div>`:''}

    <div class="card" style="margin-top:18px">
      <h3 class="section-title">${tx('سجل الدفعات','Payment History')}</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${tx('المبلغ','Amount')}</th><th>${tx('سجلها','Recorded By')}</th><th>${tx('التاريخ','Date')}</th><th>${tx('الملاحظة','Note')}</th><th>${tx('الإجراء','Action')}</th></tr></thead>
          <tbody>
            ${payments.length ? htmlJoin(payments.map(p=>html`<tr>
              <td>${wholeMoney(p.amount)}</td>
              <td>${p.createdBy||'—'}</td>
              <td>${p.paymentDate ? dateDisplay(p.paymentDate) : dateTimeDisplay(p.createdAt)}</td>
              <td>${p.note||'—'}</td>
              <td>
                ${canModifyPayment(l,p)
                  ? html`<button class="btn btn-secondary editLastPaymentBtn" data-id="${p.id}">${tx('تعديل','Edit')}</button>
                     <button class="btn btn-danger deleteLastPaymentBtn" data-id="${p.id}">${tx('حذف','Delete')}</button>`
                  : ''}
              </td>
            </tr>`)) : html`<tr><td colspan="5" class="muted">${tx('لا توجد دفعات مسجلة.','No payments recorded.')}</td></tr>`}
          </tbody>
        </table>
      </div>

    ${Array.isArray(l.paymentAuditLog) && l.paymentAuditLog.length ? html`
    <div class="card" style="margin-top:18px">
      <h3 class="section-title">سجل تعديلات الدفعات</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>العملية</th><th>رقم الدفعة</th><th>القيمة السابقة</th><th>القيمة الجديدة</th><th>السبب</th><th>نفذها</th><th>الوقت</th></tr></thead>
          <tbody>
            ${htmlJoin(l.paymentAuditLog.slice().reverse().map(a=>html`
              <tr>
                <td>${a.action}</td>
                <td>${a.paymentId}</td>
                <td>${a.oldAmount!=null?wholeMoney(a.oldAmount):'—'}</td>
                <td>${a.newAmount!=null?wholeMoney(a.newAmount):'—'}</td>
                <td>${a.reason||'—'}</td>
                <td>${a.actionBy||'—'}</td>
                <td>${a.actionAt?dateTimeDisplay(a.actionAt):'—'}</td>
              </tr>`))}
          </tbody>
        </table>
      </div>
    </div>`:''}
    </div>
  `;
}


;
function loanApprovalView(){
  if(state.currentUser.role!=='أدمن'){
    return html`<div class="card">${tx('هذه الصفحة متاحة للأدمن فقط.','This page is available to Admin only.')}</div>`;
  }

  const l=state.loans.find(x=>x.id===state.selectedLoanId);
  if(!l){
    return html`<div class="card">${tx('القرض غير موجود.','Loan not found.')}</div>`;
  }
  if(!l.status.includes('بانتظار')){
    return html`
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

  return html`
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


;
function repaymentPeriodRequestView(){
  if(state.currentUser.role==='أدمن'){
    return html`<div class="card">${tx('الأدمن لا ينشئ طلبات مراجعة فترة السداد.','Admin cannot create repayment-period review requests.')}</div>`;
  }

  const l=state.loans.find(x=>x.id===state.selectedLoanId);
  if(!l) return html`<div class="card">${tx('القرض غير موجود.','Loan not found.')}</div>`;
  if(l.status!=='نشط') return html`<div class="card">${tx('مراجعة فترة السداد متاحة للقروض النشطة فقط.','Repayment-period review is available for active loans only.')}</div>`;
  if(l.earlySettlementRequest){
    return html`
      <div class="card">
        <h3>${tx('يوجد طلب مراجعة فترة السداد قائم بالفعل','A repayment-period review request already exists')}</h3>
        <p>${tx('الحالة','Status')}: <strong>${tx('بانتظار موافقة الأدمن','Pending Admin Approval')}</strong></p>
        <button class="btn btn-secondary" id="repaymentBackBtn">${tx('الرجوع لتفاصيل القرض','Back to Loan Details')}</button>
      </div>`;
  }

  const paid=Number(l.paid||0);

  return html`
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


;
function repaymentPeriodAdminReviewView(){
  if(state.currentUser.role!=='أدمن'){
    return html`<div class="card">${tx('هذه الصفحة متاحة للأدمن فقط.','This page is available to Admin only.')}</div>`;
  }

  const r=(state.repaymentRequests||[]).find(x=>x.id===state.selectedRepaymentRequestId);
  const l=state.loans.find(x=>x.dbId===r?.loanDbId) || state.loans.find(x=>x.id===state.selectedLoanId);

  if(!r || !l){
    return html`<div class="card">
      <h3 class="section-title">${tx('مراجعة فترة السداد','Review Repayment Period')}</h3>
      <p>${tx('طلب المراجعة غير موجود.','Review request not found.')}</p>
      <button class="btn btn-secondary" id="adminRepaymentBackBtn">${tx('الرجوع','Back')}</button>
    </div>`;
  }

  return html`
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


;
function earlyReviewsView(){
  if(state.currentUser.role!=='أدمن'){
    return html`<div class="card">${tx('هذه الصفحة متاحة للأدمن فقط.','This page is available to Admin only.')}</div>`;
  }

  const pending=(state.repaymentRequests||[]).filter(r=>r.status==='pending');

  return html`
    
    <div class="card">
      <h3 class="section-title">${tx('طلبات مراجعة فترة السداد','Repayment Period Review Requests')}</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${tx('رقم القرض','Loan No.')}</th><th>${tx('المستخدم','User')}</th><th>${tx('المستفيد','Beneficiary')}</th><th>${tx('الشهور الحالية','Current Months')}</th><th>${tx('الشهور المطلوبة','Requested Months')}</th><th>${tx('تاريخ الطلب','Request Date')}</th><th>${tx('الإجراء','Action')}</th></tr></thead>
          <tbody>
            ${pending.length ? htmlJoin(pending.map(r=>{
              const l=state.loans.find(x=>x.dbId===r.loanDbId);
              return html`<tr>
                <td>${l?.id||'—'}</td>
                <td>${r.requestedBy||'—'}</td>
                <td>${l?.beneficiary||'—'}</td>
                <td>${r.oldMonths}</td>
                <td>${r.requestedMonths}</td>
                <td>${r.requestedAt?dateTimeDisplay(r.requestedAt):'—'}</td>
                <td><button class="btn btn-primary openRepaymentReviewBtn" data-request-id="${r.id}" data-loan-id="${l?.id||''}">${tx('مراجعة','Review')}</button></td>
              </tr>`;
            })) : html`<tr><td colspan="7" class="muted">${tx('لا توجد طلبات مراجعة فترة سداد معلقة.','No pending repayment-period review requests.')}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
}


;
function newLoanView(){
  return html`
  <div class="stepper"><span class="step active">${tx('1 نوع القرض','1 Loan Type')}</span><span class="step active">${tx('2 البيانات الأساسية','2 Basic Details')}</span><span class="step active">${tx('3 الحساب والمراجعة','3 Calculation & Review')}</span></div>
  <div class="wizard">
    <div class="panel">
      <h3 class="section-title">${tx('بيانات القرض','Loan Details')}</h3>
      <div class="form-grid">
        <div class="field full"><label>${tx('نوع القرض','Loan Type')}</label>
          <select id="loanType">
            <option value="قرض عادي">${tx('قرض عادي','Normal Loan')}</option><option value="قرض مجاني">${tx('قرض مجاني','Free Loan')}</option><option value="قرض دراسة">${tx('قرض دراسة','Study Loan')}</option><option value="قرض مكيفات">${tx('قرض مكيفات','A/C Loan')}</option>
          </select>
        </div>
        <div class="field"><label>${tx('نسبة الخصم العامة %','General Discount %')}</label><input id="generalDiscount" type="number" min="0" max="100" value="0"></div>
        <div class="field"><label>${tx('نسبة خصم المستخدم %','User Discount %')}</label><input id="userDiscount" type="number" min="0" max="100" value="0"></div>
        <div class="field"><label>${tx('نسبة خصم الأدمن %','Admin Discount %')}</label><input id="adminDiscount" type="number" min="0" max="100" value="0"></div>
        <div class="field full"><label>${tx('المستخدم المخصص له القرض','Assigned User')}</label>
          <select id="assignedUser">
            ${htmlJoin(state.users.filter(u=>u.status==='نشط' && u.role!=='أدمن').map(u=>html`<option value="${u.username}" ${u.username===state.currentUser.username?'selected':''}>${u.username} — ${state.lang==='en'?({'أدمن':'Admin','مدير مشروع':'Project Manager','مدير المشروع':'Project Manager','مستخدم':'User'}[u.role]||u.role):u.role}</option>`))}
          </select>
        </div>
        <div class="field full"><label>${tx('اسم المستفيد رباعيًا','Beneficiary Full Name')}</label><input id="beneficiary" placeholder="${tx('الاسم الرباعي','Full name')}"></div>
        <div class="field"><label>${tx('رقم بطاقة الأحوال','National ID')}</label><input id="nationalId" inputmode="numeric"></div>
        <div class="field"><label>${tx('رقم الجوال','Mobile')}</label><input id="mobile" inputmode="tel"></div>
        <div class="field"><label>${tx('تاريخ القرض','Loan Date')}</label>${customDateInput('loanDate',todayISO())}</div>
        <div class="field"><label>${tx('قيمة القرض','Loan Amount')} <bdi dir="ltr">(${state.lang==='en' ? '500 - '+plainWholeNumber(state.maxLoan) : arNum(500)+' - '+arNum(state.maxLoan)})</bdi></label><input id="amount" type="number" min="500" max="${state.maxLoan}" placeholder="${tx('أدخل قيمة القرض','Enter loan amount')}"></div>
        <div class="field"><label>${tx('عدد شهور السداد','Repayment Months')} <bdi dir="ltr">(${state.lang==='en' ? '1 - '+latinDigits(state.maxMonths) : arNum(1)+' - '+arNum(state.maxMonths)})</bdi></label><input id="months" type="number" min="1" max="${state.maxMonths}" placeholder="${tx('أدخل عدد شهور السداد','Enter repayment months')}"></div>
      </div>
      <div class="notice small">${tx(`إعدادات القرض الحالية: الحد الأعلى ${plainWholeNumber(state.maxLoan)}، المدة القصوى ${state.maxMonths} شهر، حصة المستخدم ${state.userSharePercent}%، وحصة المالك ${state.ownerSharePercent}%.`,`Current loan settings: maximum amount ${plainWholeNumber(state.maxLoan)}, maximum term ${state.maxMonths} months, user share ${state.userSharePercent}%, owner share ${state.ownerSharePercent}%.`)}</div>
      <div id="formError" class="small" style="color:#b91c1c"></div>
      <div class="actions">
        <button class="btn btn-primary" id="saveLoanBtn">${tx('حفظ وإرسال لموافقة الأدمن','Save & Send for Admin Approval')}</button>
        <button class="btn btn-secondary" onclick="state.page='loans';render()">${tx('إلغاء','Cancel')}</button>
      </div>
    </div>
    <div class="card summary">
      <h3 class="section-title">${tx('ملخص الحساب','Calculation Summary')}</h3>
      <div class="summary-row"><span>${tx('نسبة الفائدة الأساسية','Base Interest Rate')}</span><strong id="sBaseRate">—</strong></div>
      <div class="summary-row"><span>${tx('الفائدة قبل الخصم','Interest Before Discount')}</span><strong id="sBaseInterest">—</strong></div>
      <div class="summary-row"><span>${tx('بعد الخصم العام','After General Discount')}</span><strong id="sAfterGeneral">—</strong></div>
      <div class="summary-row"><span>${tx('حصة المستخدم الصافية','Net User Share')}</span><strong id="sUserNet">—</strong></div>
      <div class="summary-row"><span>${tx('حصة الأدمن الصافية','Net Admin Share')}</span><strong id="sAdminNet">—</strong></div>
      <div class="summary-row"><span>${tx('الفائدة النهائية','Final Interest')}</span><strong id="sFinalInterest">—</strong></div>
      <div class="summary-row"><span>${tx('إجمالي السداد','Total Due')}</span><strong id="sTotal">—</strong></div>
      <div class="summary-row"><span>${tx('القسط الشهري','Monthly Installment')}</span><strong id="sInstallment">—</strong></div>
      <div class="summary-row"><span>${tx('مستحق التصفية (فروقات الكسور)','Final Settlement Due (Rounding Difference)')}</span><strong id="sSettlementDue">—</strong></div>
      <p class="small muted">${tx('كل القيم الظاهرة بدون كسور. الفروقات الدقيقة تُحفظ وتُجمع في مستحق التصفية الأخير.','Displayed values are whole riyals. Exact rounding differences are preserved and added to the final settlement due.')}</p>
      <p class="small muted">${tx('أي قرض جديد يبدأ بحالة «بانتظار موافقة الأدمن».','Any new loan starts with the status “Awaiting Admin Approval”.')}</p>
    </div>
  </div>`;
}

