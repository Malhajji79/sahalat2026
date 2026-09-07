async function invokeAdminUsers(body){
  const {data,error}=await supabaseClient.functions.invoke('admin-users',{body});
  if(error){
    let msg=error.message||tx('تعذر تنفيذ العملية.','Unable to complete the operation.');
    try{
      const ctx=error.context;
      if(ctx && typeof ctx.json==='function'){
        const payload=await ctx.json();
        if(payload?.error) msg=payload.error;
      }
    }catch(_){}
    throw new Error(msg);
  }
  if(data?.error) throw new Error(data.error);
  return data;
}

async function refreshAdminData(){
  await loadVisibleUsers();
  if(!state.users.some(u=>u.id===state.currentUser.id)) state.users.unshift(state.currentUser);
  const current=state.users.find(u=>u.id===state.currentUser.id);
  if(current) state.currentUser={...state.currentUser,...current};
  await loadLoansFromDatabase();
  await loadCapitalMovementsFromDatabase();
  await loadCapitalHistoryFromDatabase();
  await loadRepaymentRequestsFromDatabase();
  await loadCollectionYears();
  await loadExpectedInterestByCollectionYear();
}

