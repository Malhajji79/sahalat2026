function earlyReviewsView(){
  if(state.currentUser.role!=='أدمن'){
    return `<div class="card">${tx('هذه الصفحة متاحة للأدمن فقط.','This page is available to Admin only.')}</div>`;
  }

  const pending=(state.repaymentRequests||[]).filter(r=>r.status==='pending');

  return `
    
    <div class="card">
      <h3 class="section-title">${tx('طلبات مراجعة فترة السداد','Repayment Period Review Requests')}</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${tx('رقم القرض','Loan No.')}</th><th>${tx('المستخدم','User')}</th><th>${tx('المستفيد','Beneficiary')}</th><th>${tx('الشهور الحالية','Current Months')}</th><th>${tx('الشهور المطلوبة','Requested Months')}</th><th>${tx('تاريخ الطلب','Request Date')}</th><th>${tx('الإجراء','Action')}</th></tr></thead>
          <tbody>
            ${pending.length ? pending.map(r=>{
              const l=state.loans.find(x=>x.dbId===r.loanDbId);
              return `<tr>
                <td>${l?.id||'—'}</td>
                <td>${r.requestedBy||'—'}</td>
                <td>${l?.beneficiary||'—'}</td>
                <td>${r.oldMonths}</td>
                <td>${r.requestedMonths}</td>
                <td>${r.requestedAt?dateTimeDisplay(r.requestedAt):'—'}</td>
                <td><button class="btn btn-primary openRepaymentReviewBtn" data-request-id="${r.id}" data-loan-id="${l?.id||''}">${tx('مراجعة','Review')}</button></td>
              </tr>`;
            }).join('') : `<tr><td colspan="7" class="muted">${tx('لا توجد طلبات مراجعة فترة سداد معلقة.','No pending repayment-period review requests.')}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;
}

