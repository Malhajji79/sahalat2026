function ownerLabel(){ return 'المالك'; }
function ownerDisplay(){ return tx('المالك','Owner'); }

function fillCapitalRecipientOptions(){
  const type=document.getElementById('capitalTransferType');
  const from=document.getElementById('capitalFrom');
  const to=document.getElementById('capitalTo');
  if(type?.value!=='user-to-user' || !from || !to) return;
  const previous=to.value;
  const recipients=(state.capitalRecipientUsers||[]).filter(u=>u.username!==from.value);
  to.replaceChildren();
  for(const user of recipients){
    const option=document.createElement('option');
    option.value=user.username;
    option.textContent=user.username;
    to.appendChild(option);
  }
  if(recipients.some(u=>u.username===previous)) to.value=previous;
  if(!recipients.length){
    const option=document.createElement('option');
    option.value='';
    option.textContent=tx('لا يوجد مستلم متاح','No recipient available');
    to.appendChild(option);
  }
}

function fillCapitalPartyOptions(){
  const type=document.getElementById('capitalTransferType')?.value;
  const from=document.getElementById('capitalFrom');
  const to=document.getElementById('capitalTo');
  if(!from || !to) return;

  const allUsers=state.users.filter(u=>u.status==='نشط' && u.role!=='أدمن');
  const isOrdinary=state.currentUser.role==='مستخدم';
  const own=state.currentUser.username;
  const allOptions=htmlJoin(allUsers.map(u=>html`<option value="${u.username}">${u.username}</option>`));

  if(type==='owner-to-user'){
    from.innerHTML=html`<option value="${ownerLabel()}">${ownerDisplay()}</option>`;
    to.innerHTML=isOrdinary
      ? html`<option value="${own}">${own}</option>`
      : allOptions;
    if(!isOrdinary && state.accountUser) to.value=state.accountUser;
  }else if(type==='user-to-owner'){
    from.innerHTML=isOrdinary
      ? html`<option value="${own}">${own}</option>`
      : allOptions;
    if(!isOrdinary && state.accountUser) from.value=state.accountUser;
    to.innerHTML=html`<option value="${ownerLabel()}">${ownerDisplay()}</option>`;
  }else{
    from.innerHTML=isOrdinary
      ? html`<option value="${own}">${own}</option>`
      : allOptions;
    to.innerHTML=allOptions;
    if(!isOrdinary && state.accountUser) from.value=state.accountUser;
    fillCapitalRecipientOptions();
  }
}





;
function toggleInactiveFinancialUsers(){
  const table=document.querySelector('.admin-financial-summary');
  const btn=document.getElementById('toggleInactiveFinancialUsersBtn');
  if(!table||!btn) return;

  const hidden=[...table.querySelectorAll('.inactive-financial-user')];
  const willShow=hidden.some(el=>el.style.display==='none' || getComputedStyle(el).display==='none');

  hidden.forEach(el=>el.style.display=willShow?'table-cell':'none');
  btn.textContent=willShow?tx('إخفاء المستخدمين غير النشطين','Hide Inactive Users'):tx('إظهار المستخدمين غير النشطين','Show Inactive Users');
  btn.setAttribute('aria-expanded',willShow?'true':'false');

  convertVisibleDigitsToArabic(table);
}


;
function refreshApprovalCalculation(){
  const l=state.loans.find(x=>x.id===state.selectedLoanId);
  const input=document.getElementById('approvalAdminDiscount');
  if(!l || !input) return null;

  const ad=Number(input.value);
  if(!Number.isFinite(ad) || ad<0 || ad>100) return null;

  const r=calcLoan(
    Number(l.amount||0),
    Number(l.months||0),
    Number(l.generalDiscount||0),
    Number(l.userDiscount||0),
    ad, getLoanShares(l.loanDate)
  );

  document.getElementById('apBaseRate').textContent=percentDisplay(r.baseRate);
  document.getElementById('apUserNet').textContent=wholeMoney(r.userNet);
  document.getElementById('apAdminNet').textContent=wholeMoney(r.adminNet);
  document.getElementById('apFinalInterest').textContent=wholeMoney(r.finalInterest);
  document.getElementById('apTotal').textContent=money(r.total);
  document.getElementById('apInstallment').textContent=wholeMoney(r.installment);
  document.getElementById('apSettlement').textContent=money(r.settlementDue);
  return {r, ad};
}

function calculateRepaymentPeriodPreview(){
  const l=state.loans.find(x=>x.id===state.selectedLoanId);
  const input=document.getElementById('repaymentNewMonths');
  if(!l || !input) return null;

  const newMonths=Number(input.value);
  if(!Number.isInteger(newMonths) || newMonths<1 || newMonths>state.maxMonths) return null;

  const r=calcRepaymentPeriodLoan(l,newMonths);

  const paid=Number(l.paid||0);
  const newRemaining=Math.max(0,r.total-paid);

  const a=document.getElementById('rpNewTotal');
  const b=document.getElementById('rpNewRemaining');
  const c=document.getElementById('rpNewInstallment');
  const d=document.getElementById('rpNewSettlement');
  if(a) a.textContent=money(r.total);
  if(b) b.textContent=money(newRemaining);
  if(c) c.textContent=wholeMoney(r.installment);
  if(d) d.textContent=money(r.settlementDue);

  return {newMonths,r,paid,newRemaining};
}

