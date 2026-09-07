function newLoanView(){
  return `
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
            ${state.users.filter(u=>u.status==='نشط' && u.role!=='أدمن').map(u=>`<option value="${u.username}" ${u.username===state.currentUser.username?'selected':''}>${u.username} — ${state.lang==='en'?({'أدمن':'Admin','مدير مشروع':'Project Manager','مدير المشروع':'Project Manager','مستخدم':'User'}[u.role]||u.role):u.role}</option>`).join('')}
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

