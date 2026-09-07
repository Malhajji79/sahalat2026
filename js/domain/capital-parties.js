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
  const allOptions=allUsers.map(u=>`<option value="${u.username}">${u.username}</option>`).join('');

  if(type==='owner-to-user'){
    from.innerHTML=`<option value="${ownerLabel()}">${ownerDisplay()}</option>`;
    to.innerHTML=isOrdinary
      ? `<option value="${own}">${own}</option>`
      : allOptions;
    if(!isOrdinary && state.accountUser) to.value=state.accountUser;
  }else if(type==='user-to-owner'){
    from.innerHTML=isOrdinary
      ? `<option value="${own}">${own}</option>`
      : allOptions;
    if(!isOrdinary && state.accountUser) from.value=state.accountUser;
    to.innerHTML=`<option value="${ownerLabel()}">${ownerDisplay()}</option>`;
  }else{
    from.innerHTML=isOrdinary
      ? `<option value="${own}">${own}</option>`
      : allOptions;
    to.innerHTML=allOptions;
    if(!isOrdinary && state.accountUser) from.value=state.accountUser;
    fillCapitalRecipientOptions();
  }
}




