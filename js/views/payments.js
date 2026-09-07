function paymentsTableRows(rows){
  return rows.length ? rows.map(r=>`<tr>
    <td>${r.loanId}</td><td>${r.beneficiary}</td><td>${wholeMoney(r.amount)}</td><td>${r.by||'—'}</td>
    <td>${paymentDisplayDate(r)}</td><td>${r.note||'—'}</td>
  </tr>`).join('') : `<tr><td colspan="6" class="muted">${tx('لا توجد دفعات مطابقة للفلاتر.','No payments match the filters.')}</td></tr>`;
}

function paymentsView(){
  const rows=paymentLogRows();
  const totalPaid=rows.reduce((s,r)=>s+Number(r.amount||0),0);
  const recorders=[...new Set(rows.map(r=>r.by).filter(x=>x&&x!=='—'))].sort((a,b)=>String(a).localeCompare(String(b),state.lang==='en'?'en':'ar'));
  return `
  <div class="grid cards">
    <div class="card"><div class="muted">${tx('عدد الدفعات','Payment Count')}</div><div class="kpi" id="paymentsCountKpi">${arNum(rows.length)}</div></div>
    <div class="card"><div class="muted">${tx('إجمالي الدفعات المسجلة','Total Recorded Payments')}</div><div class="kpi" id="paymentsTotalKpi" style="font-size:22px">${wholeMoney(totalPaid)}</div></div>
  </div>
  <div class="card" style="margin-top:18px"><div class="toolbar" style="margin:0">
    <div class="field" style="margin:0;min-width:170px;flex:1"><label>${tx('رقم القرض','Loan No.')}</label><input id="paymentLoanFilter" type="search" inputmode="numeric" placeholder="${tx('ابحث برقم القرض','Search by loan number')}"></div>
    <div class="field" style="margin:0;min-width:170px;flex:1"><label>${tx('التاريخ','Date')}</label>${customDateInput('paymentDateFilter','')}</div>
    <div class="field" style="margin:0;min-width:190px;flex:1"><label>${tx('المسجل','Recorded By')}</label><select id="paymentRecorderFilter"><option value="">${tx('الكل','All')}</option>${recorders.map(x=>`<option value="${x}">${x}</option>`).join('')}</select></div>
    <div style="align-self:flex-end"><button class="btn btn-secondary" id="clearPaymentFilters" type="button">${tx('مسح الفلاتر','Clear Filters')}</button></div>
  </div><div class="small muted" id="paymentsFilterSummary" style="margin-top:12px">${tx('عرض جميع الدفعات','Show all payments')}: ${arNum(rows.length)}</div></div>
  <div class="card" style="margin-top:18px"><div class="muted">${tx('هذا سجل Log للدفعات. كل دفعة تحفظ باسم المستخدم ووقت التسجيل ولا تُحذف من السجل. وعند سداد كامل المتبقي، يُغلق القرض تلقائيًا بعد احتساب مستحق التصفية.','This is the payment log. Each payment keeps the username and recording date and is not removed from the log. When the full remaining balance is paid, the loan closes automatically after calculating the final settlement due.')}</div></div>
  <div class="table-wrap" style="margin-top:18px"><table><thead><tr><th>${tx('رقم القرض','Loan No.')}</th><th>${tx('المستفيد','Beneficiary')}</th><th>${tx('مبلغ الدفعة','Payment Amount')}</th><th>${tx('سجلها','Recorded By')}</th><th>${tx('التاريخ والوقت','Date')}</th><th>${tx('ملاحظة','Note')}</th></tr></thead><tbody id="paymentsTableBody">${paymentsTableRows(rows)}</tbody></table></div>`;
}

