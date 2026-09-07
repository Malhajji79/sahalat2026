function capitalMovementsView(){
  const liveRows=(state.capitalTransfers||[]);
  const historicalAll=(state.capitalHistory||[]);

  const live = state.currentUser.role==='أدمن'
    ? liveRows.slice().reverse()
    : liveRows.filter(t=>t.from===state.currentUser.username || t.to===state.currentUser.username).slice().reverse();

  const historical = ['أدمن','مدير مشروع','مدير المشروع'].includes(state.currentUser.role)
    ? historicalAll.slice().reverse()
    : historicalAll
        .filter(t=>capitalNameMatches(t.from,state.currentUser.username)
          || capitalNameMatches(t.to,state.currentUser.username)
          || capitalNameMatches(t.name,state.currentUser.username))
        .slice().reverse();

  // ONLY live movements are counted here. Historical Excel rows are display-only.
  const totalIn=live
    .filter(t=>t.entryKind!=='deletion' && t.status!=='deleted' && t.to===state.currentUser.username)
    .reduce((s,t)=>s+Number(t.amount||0),0);
  const totalOut=live
    .filter(t=>t.entryKind!=='deletion' && t.status!=='deleted' && t.from===state.currentUser.username)
    .reduce((s,t)=>s+Number(t.amount||0),0);
  const activeCount=live.filter(t=>t.entryKind!=='deletion' && t.status!=='deleted').length;

  const historicalTable=`
    <div class="card" style="margin-top:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div>
          <h3 class="section-title" style="margin-bottom:4px">${tx('السجل التاريخي لرأس المال','Historical Capital Log')}</h3>
          <div class="small muted">${tx('مستورد من ورقة Update Total في ملف سهالات القديم — للعرض والتوثيق فقط ولا يدخل في أي حساب لرأس المال.','Imported from the Update Total sheet in the legacy Sahalat file — for viewing and documentation only; it is not included in capital calculations.')}</div>
        </div>
        <span class="status pending">${tx('سجل تاريخي فقط','Historical Record Only')}</span>
      </div>
      <div class="table-wrap" style="margin-top:14px">
        <table>
          <thead><tr>
            <th>${tx('التسلسل','Sequence')}</th><th>${tx('التاريخ','Date')}</th><th>${tx('من','From')}</th><th>${tx('إلى','To')}</th>
            <th>${tx('خصم','Debit')}</th><th>${tx('إضافة','Credit')}</th><th>${tx('الاسم','Name')}</th>
          </tr></thead>
          <tbody>
            ${historical.length ? historical.map(t=>`<tr>
              <td>${t.seq}</td>
              <td>${dateDisplay(t.date)}</td>
              <td>${t.from||'—'}</td>
              <td>${t.to||'—'}</td>
              <td style="${t.deduct>0?'font-weight:900;color:#b91c1c':''}">${t.deduct>0?wholeMoney(t.deduct):'—'}</td>
              <td style="${t.add>0?'font-weight:900;color:#166534':''}">${t.add>0?wholeMoney(t.add):'—'}</td>
              <td>${t.name||'—'}</td>
            </tr>`).join('') : `<tr><td colspan="7" class="muted">${tx('لا توجد سجلات تاريخية مرتبطة بهذا الحساب.','No historical records are linked to this account.')}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>`;

  if(state.currentUser.role==='أدمن'){
    const totalOwnerToUsers=live.filter(t=>t.type==='owner-to-user' && t.status!=='deleted').reduce((s,t)=>s+Number(t.amount||0),0);
    const totalUsersToOwner=live.filter(t=>t.type==='user-to-owner' && t.status!=='deleted').reduce((s,t)=>s+Number(t.amount||0),0);
    const betweenUsers=live.filter(t=>t.type==='user-to-user' && t.status!=='deleted').reduce((s,t)=>s+Number(t.amount||0),0);

    return `
      <div class="notice" style="background:#ecfdf5;color:#166534">
        ${tx('الحركات الجديدة فقط تؤثر على رأس المال. سجل Update Total التاريخي محفوظ منفصلًا ولا يدخل في الأرصدة أو المجاميع.','Only new movements affect capital. The historical Update Total log is stored separately and is not included in balances or totals.')}
      </div>
      <div class="grid cards">
        <div class="card"><div class="muted">${tx('إضافات جديدة من المالك','New Additions from Owner')}</div><div class="kpi">${wholeMoney(totalOwnerToUsers)}</div></div>
        <div class="card"><div class="muted">${tx('حركات جديدة إلى المالك','New Movements to Owner')}</div><div class="kpi">${wholeMoney(totalUsersToOwner)}</div></div>
        <div class="card"><div class="muted">${tx('تحويلات جديدة بين المستخدمين','New Transfers Between Users')}</div><div class="kpi">${wholeMoney(betweenUsers)}</div></div>
        <div class="card"><div class="muted">${tx('عدد الحركات الجديدة','Number of New Movements')}</div><div class="kpi">${live.length}</div></div>
      </div>

      <div class="card" style="margin-top:18px">
        <h3 class="section-title">${tx('حركات رأس المال الجديدة','New Capital Movements')}</h3>
        <div class="small muted" style="margin-bottom:12px">${tx('أي حركة تُسجل من النظام بعد الانتقال تعتبر حركة فعلية جديدة وتؤثر على رأس المال حسب نوعها.','Any movement recorded in the system after the transition is treated as a new actual movement and affects capital according to its type.')}</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>${tx('التاريخ','Date')}</th><th>${tx('من','From')}</th><th>${tx('إلى','To')}</th><th>${tx('المبلغ','Amount')}</th><th>${tx('نوع الحركة','Movement Type')}</th><th>${tx('الملاحظة','Note')}</th><th>${tx('الحالة','Status')}</th><th>${tx('نفذها','Created By')}</th></tr></thead>
            <tbody>${live.length?live.map(t=>`<tr>
              <td>${dateDisplay(t.date)}</td><td>${t.from||'—'}</td><td>${t.to||'—'}</td>
              <td>${wholeMoney(t.amount)}</td><td>${state.lang==='en'?({ 'إضافة رأس مال من المالك':'Owner to User','إرجاع رأس مال إلى المالك':'User to Owner','تحويل رأس مال بين المستخدمين':'User to User' }[t.typeLabel]||t.typeLabel||'—'):(t.typeLabel||'—')}</td><td>${t.note||'—'}</td>
              <td>${t.entryKind==='deletion'?tx('سجل إلغاء','Cancellation Record'):(t.status==='deleted'?tx('ملغاة','Cancelled'):tx('فعالة','Active'))}</td>
              <td>${t.createdBy||'—'}</td>
            </tr>`).join(''):`<tr><td colspan="8" class="muted">${tx('لا توجد حركات جديدة بعد نقطة الانتقال.','No new movements after the transition point.')}</td></tr>`}</tbody>
          </table>
        </div>
      </div>
      ${historicalTable}`;
  }

  return `
    <div class="notice">
      ${tx('السجل التاريخي أدناه للتوثيق فقط ولا يؤثر على رأس مالك الحالي. أي حركة جديدة من النظام تُعامل كحركة فعلية بعد الانتقال.','The historical log below is for documentation only and does not affect your current capital. Any new movement recorded in the system is treated as an actual movement after the transition.')}
    </div>
    <div class="grid cards">
      <div class="card"><div class="muted">${tx('الحركات الجديدة الداخلة','New Incoming Movements')}</div><div class="kpi">${wholeMoney(totalIn)}</div></div>
      <div class="card"><div class="muted">${tx('الحركات الجديدة الخارجة','New Outgoing Movements')}</div><div class="kpi">${wholeMoney(totalOut)}</div></div>
      <div class="card"><div class="muted">${tx('الحركات الجديدة الفعالة','Active New Movements')}</div><div class="kpi">${activeCount}</div></div>
      <div class="card"><div class="muted">${tx('إجمالي السجلات الجديدة','Total New Records')}</div><div class="kpi">${live.length}</div></div>
    </div>
    ${historicalTable}`;
}

