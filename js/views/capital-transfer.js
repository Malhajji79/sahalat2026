function capitalTransferView(){
  if(state.currentUser.role==='أدمن'){
    return `<div class="card">${tx('الأدمن لا يستخدم تعديل رأس المال من الصفحة الرئيسية للمستخدم.','Admin does not use capital editing from the user home page.')}</div>`;
  }

  const allUsers=state.users.filter(u=>u.status==='نشط' && u.role!=='أدمن');
  const users = state.currentUser.role==='مستخدم'
    ? allUsers.filter(u=>u.username===state.currentUser.username)
    : allUsers;

  const selected = state.currentUser.role==='مستخدم'
    ? state.currentUser.username
    : (state.accountUser && users.some(u=>u.username===state.accountUser)
        ? state.accountUser
        : users[0]?.username);

  if(selected) state.accountUser=selected;

  const currentUser=state.users.find(u=>u.username===state.accountUser);

  return `
    <div class="toolbar">
      <button class="btn btn-secondary" id="capitalBackBtn">${tx('الرجوع لحسابات المستخدمين','Back to User Accounts')}</button>
      <div class="muted">${tx('إدارة حركة رأس المال','Manage Capital Movement')}</div>
    </div>

    <div class="grid" style="grid-template-columns:1fr 1fr;gap:18px">
      <div class="panel">
        <div class="notice" style="background:#ecfdf5;color:#166534">${tx('يمكن تعديل أو إلغاء الحركة ضمن المهلة المسموحة.','The movement can be edited or cancelled within the allowed time window.')}</div>
        <h3 class="section-title">${tx('حركة رأس المال','Capital Movement')}</h3>

        ${state.currentUser.role==='مستخدم'
          ? `<div class="field"><label>${tx('المستخدم','User')}</label><input value="${state.currentUser.username}" disabled></div>`
          : `<div class="field">
              <label>${tx('المستخدم المحدد','Selected User')}</label>
              <select id="capitalSelectedUser">
                ${users.map(u=>`<option value="${u.username}" ${u.username===state.accountUser?'selected':''}>${u.username}</option>`).join('')}
              </select>
            </div>`}

        <div class="card" style="margin-bottom:14px">
          <div class="muted">${tx('المبلغ الحالي','Current Amount')}</div>
          <div class="kpi" style="font-size:30px">${wholeMoney(currentUser?.baseCapital||0)}</div>
        </div>

        <div class="field">
          <label>${tx('نوع الحركة','Movement Type')}</label>
          <select id="capitalTransferType">
            <option value="owner-to-user">${tx('من المالك إلى المستخدم','Owner to User')}</option>
            <option value="user-to-user">${tx('من مستخدم إلى مستخدم','User to User')}</option>
            <option value="user-to-owner">${tx('من المستخدم إلى المالك','User to Owner')}</option>
          </select>
        </div>

        <div class="field">
          <label>${tx('من','From')}</label>
          <select id="capitalFrom"></select>
        </div>

        <div class="field">
          <label>${tx('إلى','To')}</label>
          <select id="capitalTo"></select>
        </div>

        <div class="field">
          <label>${tx('المبلغ','Amount')}</label>
          <input id="capitalAmount" type="number" min="1" placeholder="${tx('أدخل مبلغ الحركة','Enter movement amount')}">
        </div>

        <div class="field">
          <label>${tx('التاريخ','Date')}</label>
          ${customDateInput('capitalDate',todayISO())}
        </div>

        <div class="field">
          <label>${tx('ملاحظة (اختياري)','Note (Optional)')}</label>
          <input id="capitalNote" type="text" placeholder="${tx('سبب أو ملاحظة','Reason or note')}">
        </div>

        <div id="capitalError" class="small" style="color:#b91c1c;margin-top:8px"></div>

        <div class="actions">
          <button class="btn btn-primary" id="saveCapitalTransferBtn">${tx('تنفيذ الحركة','Execute Movement')}</button>
          <button class="btn btn-secondary" id="cancelCapitalTransferBtn">${tx('إلغاء','Cancel')}</button>
        </div>
      </div>

      <div class="card">
        <h3 class="section-title">${tx('سجل حركات رأس المال الخاصة بحسابي','My Capital Movement Log')}</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>${tx('التاريخ','Date')}</th>
                <th>${tx('من','From')}</th>
                <th>${tx('إلى','To')}</th>
                <th>${tx('المبلغ','Amount')}</th>
                <th>${tx('النوع','Type')}</th>
                <th>${tx('نفذها','Created By')}</th>
                <th>${tx('الإجراء','Action')}</th>
              </tr>
            </thead>
            <tbody>
              ${(state.capitalTransfers||[]).filter(t=>t.from===state.currentUser.username || t.to===state.currentUser.username).length
                ? (state.capitalTransfers||[])
                    .filter(t=>t.from===state.currentUser.username || t.to===state.currentUser.username)
                    .slice()
                    .reverse()
                    .map(t=>`
                <tr>
                  <td>${dateDisplay(t.date)}</td>
                  <td>${t.from}</td>
                  <td>${t.to}</td>
                  <td>${wholeMoney(t.amount)}</td>
                  <td>${state.lang==='en'?({ 'إضافة رأس مال من المالك':'Owner to User','إرجاع رأس مال إلى المالك':'User to Owner','تحويل رأس مال بين المستخدمين':'User to User' }[t.typeLabel]||t.typeLabel):t.typeLabel}${t.status==='deleted'?tx(' — ملغاة',' — Cancelled'):''}</td>
                  <td>${t.createdBy}</td>
                  <td>
                    ${(canEditCapitalTransfer(t) || canDeleteCapitalTransfer(t))
                      ? `${canEditCapitalTransfer(t)?`<button class="btn btn-secondary editCapitalTransferBtn" data-id="${t.id}">${tx('تعديل','Edit')}</button>`:''}
                         ${canDeleteCapitalTransfer(t)?`<button class="btn btn-danger deleteCapitalTransferBtn" data-id="${t.id}">${tx('إلغاء الحركة','Cancel Movement')}</button>`:''}`
                      : ''}
                  </td>
                </tr>
              `).join('') : `<tr><td colspan="7" class="muted">${tx('لا توجد حركات رأس مال مرتبطة بحسابك.','No capital movements are linked to your account.')}</td></tr>`}
            </tbody>
          </table>
        </div>

      ${state.pendingEditTransferId ? (() => {
        const et=(state.capitalTransfers||[]).find(x=>x.id===state.pendingEditTransferId);
        if(!et || et.createdBy!==state.currentUser.username || et.status==='deleted' || et.entryKind==='deletion') return '';
        return `
        <div class="card" style="grid-column:1/-1;border:1px solid #cbd5e1">
          <h3 class="section-title">${tx('تعديل حركة رأس المال','Edit Capital Movement')}</h3>
          <div class="summary-row"><span>${tx('من','From')}</span><strong>${et.from}</strong></div>
          <div class="summary-row"><span>${tx('إلى','To')}</span><strong>${et.to}</strong></div>
          <div class="field"><label>${tx('المبلغ','Amount')}</label><input id="capitalEditAmount" type="number" min="1" value="${Number(et.amount||0)}"></div>
          <div class="field"><label>${tx('التاريخ','Date')}</label>${customDateInput('capitalEditDate',et.date||todayISO())}</div>
          <div class="field"><label>${tx('الملاحظة','Note')}</label><input id="capitalEditNote" type="text" value="${et.note||''}"></div>
          <div class="field"><label>${tx('سبب التعديل','Edit Reason')}</label><input id="capitalEditReason" type="text" placeholder="${tx('اكتب سبب التعديل','Enter edit reason')}"></div>
          <div id="capitalEditError" class="small" style="color:#b91c1c;margin-top:8px"></div>
          <div class="actions">
            <button class="btn btn-primary" id="confirmEditCapitalBtn">${tx('حفظ التعديل','Save Changes')}</button>
            <button class="btn btn-secondary" id="cancelEditCapitalBtn">${tx('إلغاء','Cancel')}</button>
          </div>
        </div>`;
      })() : ''}
      ${state.pendingDeleteTransferId ? (() => {
        const dt=(state.capitalTransfers||[]).find(x=>x.id===state.pendingDeleteTransferId);
        if(!dt) return '';
        return `
        <div class="card" style="grid-column:1/-1;border:1px solid #fecaca">
          <h3 class="section-title">${tx('إلغاء حركة رأس المال','Cancel Capital Movement')}</h3>
          <div class="summary-row"><span>${tx('الحركة','Movement')}</span><strong>${dt.id}</strong></div>
          <div class="summary-row"><span>${tx('من','From')}</span><strong>${dt.from}</strong></div>
          <div class="summary-row"><span>${tx('إلى','To')}</span><strong>${dt.to}</strong></div>
          <div class="summary-row"><span>${tx('المبلغ','Amount')}</span><strong>${wholeMoney(dt.amount)}</strong></div>
          <div class="summary-row"><span>${tx('أنشأها','Created By')}</span><strong>${dt.createdBy}</strong></div>

          <div class="field" style="margin-top:12px">
            <label>${tx('سبب الإلغاء','Cancellation Reason')}</label>
            <input id="capitalDeleteReason" type="text" placeholder="${tx('اكتب سبب الإلغاء','Enter cancellation reason')}">
          </div>

          <div id="capitalDeleteError" class="small" style="color:#b91c1c;margin-top:8px"></div>

          <div class="actions">
            <button class="btn btn-danger" id="confirmDeleteCapitalBtn">${tx('تأكيد الإلغاء','Confirm Cancellation')}</button>
            <button class="btn btn-secondary" id="cancelDeleteCapitalBtn">${tx('إلغاء','Cancel')}</button>
          </div>
        </div>`;
      })() : ''}
      </div>
    </div>`;
}

