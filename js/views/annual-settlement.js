function annualSettlementView(){
  if(state.currentUser.role!=='مدير مشروع'){
    return `<div class="card">${tx('هذه الصفحة متاحة لمدير المشروع فقط.','This page is available to the Project Manager only.')}</div>`;
  }

  const eligible=state.users.filter(u=>u.dbRole!=='admin');
  if(!state.annualSettlementUserId && eligible.length){
    state.annualSettlementUserId=eligible[0].id;
  }

  const selected=eligible.find(u=>String(u.id)===String(state.annualSettlementUserId));
  const s=state.annualSettlementSummary;
  const rows=state.annualSettlementRecords||[];
  const currentYear=new Date().getFullYear();
  const years=[];
  for(let y=currentYear;y>=2020;y--) years.push(y);

  return `
    <div class="notice" style="background:#ecfdf5;color:#166534">
      ${tx('هذه الصفحة مخصصة لمدير المشروع. الفائدة المحققة تُحسب بشكل عام من جميع الدفعات الفعلية للمستخدم عبر كل السنوات، وأي مبلغ تتم تصفيته يُحفظ كسجل دائم ويُخصم من الرصيد المحقق المتبقي.','This page is for the Project Manager. Realized interest is calculated from all actual payments made by the user across all years. Every settled amount is stored permanently and deducted from the remaining realized balance.')}
    </div>

    <div class="toolbar">
      <div class="field" style="min-width:270px;margin:0">
        <label>${tx('المستخدم','User')}</label>
        <select id="annualSettlementUser">
          ${eligible.map(u=>`<option value="${u.id}" ${String(u.id)===String(state.annualSettlementUserId)?'selected':''}>${u.username} — ${state.lang==='en'?({'أدمن':'Admin','مدير مشروع':'Project Manager','مدير المشروع':'Project Manager','مستخدم':'User'}[u.role]||u.role):u.role}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-secondary" id="refreshAnnualSettlement">${tx('تحديث','Refresh')}</button>
    </div>

    ${!s?`<div class="card">${tx('اضغط تحديث لاحتساب تصفية الأرباح.','Click Refresh to calculate profit settlement.')}</div>`:`
    <div class="grid cards">
      ${metricCard(tx('فائدة المستخدم المحققة','Realized User Interest'),wholeMoney(s.realizedUser))}
      ${metricCard(tx('المصفى للمستخدم','Settled for User'),wholeMoney(s.settledUser))}
      ${metricCard(tx('المتبقي للمستخدم','Remaining for User'),wholeMoney(s.remainingUser))}
    </div>
    <div class="grid cards" style="margin-top:16px">
      ${metricCard(tx('فائدة المالك المحققة','Realized Owner Interest'),wholeMoney(s.realizedOwner))}
      ${metricCard(tx('المصفى للمالك','Settled for Owner'),wholeMoney(s.settledOwner))}
      ${metricCard(tx('المتبقي للمالك','Remaining for Owner'),wholeMoney(s.remainingOwner))}
    </div>`}

    <div class="panel" style="margin-top:18px">
      <h3 class="section-title">${tx('تسجيل تصفية','Record Settlement')}</h3>
      <div class="form-grid">
        <div class="field">
          <label>${tx('التصفية لصالح','Settlement For')}</label>
          <select id="annualSettlementFor">
            <option value="user">${tx('المستخدم','User')}</option>
            <option value="owner">${tx('المالك','Owner')}</option>
          </select>
        </div>
        <div class="field">
          <label>${tx('المبلغ','Amount')}</label>
          <input id="annualSettlementAmount" type="number" min="0.01" step="0.01">
        </div>
        <div class="field">
          <label>${tx('المستلم','Receiver')}</label>
          <input id="annualSettlementReceiver" value="${selected?.username||''}">
        </div>
        <div class="field">
          <label>${tx('المسلّم للمبلغ','Delivered By')}</label>
          <input id="annualSettlementDeliveredBy" value="${selected?.username||''}">
        </div>
        <div class="field">
          <label>${tx('التاريخ','Date')}</label>
          ${customDateInput('annualSettlementDate',todayISO())}
        </div>
        <div class="field">
          <label>${tx('ملاحظات','Notes')}</label>
          <input id="annualSettlementNote" type="text" placeholder="${tx('اختياري','Optional')}">
        </div>
      </div>
      <div id="annualSettlementError" class="small" style="color:#b91c1c;margin-top:8px"></div>
      <div class="actions"><button class="btn btn-primary" id="saveAnnualSettlement">${tx('حفظ التصفية','Save Settlement')}</button></div>
    </div>

    <div class="card" style="margin-top:18px">
      <h3 class="section-title">${tx('جميع عمليات التصفية بواسطة المستخدم','All Settlements by User')}</h3>
      <div class="table-wrap">
        <table>
          <thead><tr><th>${tx('م','No.')}</th><th>${tx('المستلم','Receiver')}</th><th>${tx('المبلغ','Amount')}</th><th>${tx('المسلّم للمبلغ','Delivered By')}</th><th>${tx('التاريخ','Date')}</th><th>${tx('الحساب','Account')}</th><th>${tx('ملاحظات','Notes')}</th></tr></thead>
          <tbody>
            ${rows.length?rows.map((r,index)=>`<tr>
              <td>${r.legacyNo??(index+1)}</td>
              <td>${r.receiver}</td>
              <td style="${Number(r.amount)<0?'color:#b91c1c;font-weight:700':''}">${money(r.amount)}</td>
              <td>${r.deliveredBy}</td>
              <td>${dateDisplay(r.date)}</td>
              <td>${r.settlementFor==='user'?tx('فائدة المستخدم','User Interest'):tx('فائدة المالك','Owner Interest')}${r.isHistorical?tx(' — سجل سابق',' — Historical Record'):''}</td>
              <td>${r.note||'—'}</td>
            </tr>`).join(''):`<tr><td colspan="7" class="muted">${tx('لا توجد سجلات تصفية لهذه السنة.','No settlement records for this year.')}</td></tr>`}
          </tbody>
        </table>
      </div>
      <p class="small muted" style="margin-top:10px">${tx('السجل محفوظ تاريخيًا ولا يوجد تعديل أو حذف من هذه الصفحة. المبالغ السالبة في السجلات السابقة تُعامل كعكس/تصحيح لتصفية سابقة.','The record is preserved historically and cannot be edited or deleted from this page. Negative amounts in historical records are treated as reversals/corrections of previous settlements.')}</p>
    </div>
  `;
}

