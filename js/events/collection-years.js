function bindCollectionYears(){
  const status=document.getElementById('collectionYearStatus');
  document.getElementById('expectedCollectionYearSelect')?.addEventListener('change',e=>{
    state.selectedCollectionYear=Number(e.target.value);
    render();
  });

  document.getElementById('refreshCollectionYearsBtn')?.addEventListener('click',async()=>{
    const b=document.getElementById('refreshCollectionYearsBtn');
    b.disabled=true;b.textContent=tx('جاري التحديث...','Refreshing...');
    try{
      await loadCollectionYears();
      await loadExpectedInterestByCollectionYear();
      render();
    }catch(e){
      console.error(e);
      if(status){status.style.color='#b91c1c';status.textContent=e?.message||tx('تعذر تحديث البيانات.','Unable to refresh data.');}
      b.disabled=false;b.textContent=tx('تحديث البيانات','Refresh Data');
    }
  });

  document.querySelectorAll('.saveCollectionYearBtn').forEach(btn=>btn.onclick=async()=>{
    const id=btn.dataset.id;
    const start=document.querySelector(`.collectionStartDate[data-id="${id}"]`)?.value||'';
    const end=document.querySelector(`.collectionEndDate[data-id="${id}"]`)?.value||'';
    if(!start || !end){
      if(status){status.style.color='#b91c1c';status.textContent=tx('أدخل تاريخ البداية والنهاية.','Enter both start and end dates.');}
      return;
    }
    if(new Date(end+'T00:00:00')<new Date(start+'T00:00:00')){
      if(status){status.style.color='#b91c1c';status.textContent=tx('تاريخ النهاية لا يمكن أن يسبق تاريخ البداية.','End date cannot be earlier than start date.');}
      return;
    }

    btn.disabled=true;btn.textContent=tx('جاري الحفظ...','Saving...');
    try{
      const {error}=await supabaseClient
        .from('collection_years')
        .update({start_date:start,end_date:end,updated_by:state.currentUser.id,updated_at:new Date().toISOString()})
        .eq('id',id);
      if(error) throw error;
      await loadCollectionYears();
      await loadExpectedInterestByCollectionYear();
      if(status){status.style.color='#166534';status.textContent=tx('تم حفظ السنة التحصيلية وتحديث حسابات الفائدة المتوقعة.','Collection year saved and expected-interest calculations updated.');}
      render();
    }catch(e){
      console.error(e);
      if(status){status.style.color='#b91c1c';status.textContent=e?.message||tx('تعذر حفظ السنة التحصيلية.','Unable to save the collection year.');}
      btn.disabled=false;btn.textContent=tx('حفظ','Save');
    }
  });
}

