function bindNav(){
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render();});
  const refreshBtn=document.getElementById('refreshDbBtn');
  if(refreshBtn) refreshBtn.onclick=async()=>{
    refreshBtn.disabled=true;
    refreshBtn.textContent=t('refreshing');
    try{
      await refreshAuthenticatedData();
    }catch(err){
      console.error(err);
      alert(err?.message||t('refreshFailed'));
    }finally{
      if(document.getElementById('refreshDbBtn')){
        document.getElementById('refreshDbBtn').disabled=false;
        document.getElementById('refreshDbBtn').textContent=t('refresh');
      }
    }
  };
  document.getElementById('logoutBtn').onclick=async()=>{
    await supabaseClient.auth.signOut();
    state.currentUser=null;
    state.authUser=null;
    state.authSession=null;
    state.users=[];
    state.loans=[];
    state.capitalTransfers=[];
    state.annualSettlementSummary=null;
    state.annualSettlementRecords=[];
    state.settlementTransferTotals={};
    state.collectionYears=[];
    state.expectedInterestByCollectionYear=[];
    state.selectedCollectionYear=null;
    state.page='dashboard';
    render();
  };
}

