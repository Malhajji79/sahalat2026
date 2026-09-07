function bindAnnualSettlement(){
  const reload=async()=>{
    const btn=document.getElementById('refreshAnnualSettlement');
    if(btn){btn.disabled=true;btn.textContent=tx('جاري التحديث...','Refreshing...');}
    try{
      await loadAnnualSettlementData();
      render();
    }catch(e){
      console.error(e);
      alert(e?.message||tx('تعذر تحميل تصفية الأرباح.','Unable to load profit settlement.'));
      if(btn){btn.disabled=false;btn.textContent=tx('تحديث','Refresh');}
    }
  };

  document.getElementById('annualSettlementUser')?.addEventListener('change',async e=>{
    state.annualSettlementUserId=e.target.value;
    state.annualSettlementSummary=null;
    state.annualSettlementRecords=[];
    await reload();
  });

  document.getElementById('refreshAnnualSettlement')?.addEventListener('click',reload);

  const forSelect=document.getElementById('annualSettlementFor');
  if(forSelect) forSelect.onchange=()=>{
    const selected=state.users.find(u=>String(u.id)===String(state.annualSettlementUserId));
    const receiver=document.getElementById('annualSettlementReceiver');
    const delivered=document.getElementById('annualSettlementDeliveredBy');
    if(forSelect.value==='user'){
      if(receiver) receiver.value=selected?.username||'';
      if(delivered) delivered.value=selected?.username||'';
    }else{
      if(receiver) receiver.value=tx('المالك','Owner');
      if(delivered) delivered.value=selected?.username||'';
    }
  };

  const save=document.getElementById('saveAnnualSettlement');
  if(save) save.onclick=async()=>{
    const err=document.getElementById('annualSettlementError');
    if(err) err.textContent='';

    const settlementFor=document.getElementById('annualSettlementFor').value;
    const amount=Number(document.getElementById('annualSettlementAmount').value);
    const date=document.getElementById('annualSettlementDate').value;
    const receiver=document.getElementById('annualSettlementReceiver').value.trim();
    const deliveredBy=document.getElementById('annualSettlementDeliveredBy').value.trim();
    const note=document.getElementById('annualSettlementNote').value.trim();

    if(!Number.isFinite(amount)||amount<=0){err.textContent=tx('أدخل مبلغًا صحيحًا.','Enter a valid amount.');return;}
    if(!date){err.textContent=tx('التاريخ مطلوب.','Date is required.');return;}
    if(!receiver){err.textContent=tx('اسم المستلم مطلوب.','Receiver name is required.');return;}
    if(!deliveredBy){err.textContent=tx('اسم مسلّم المبلغ مطلوب.','Delivered-by name is required.');return;}

    save.disabled=true;
    save.textContent=tx('جاري الحفظ...','Saving...');

    try{
      const {error}=await supabaseClient.rpc('create_annual_settlement',{
        p_user_id:state.annualSettlementUserId,
        p_year:Number(date.slice(0,4)),
        p_settlement_for:settlementFor,
        p_amount:amount,
        p_settlement_date:date,
        p_receiver_name:receiver,
        p_delivered_by_name:deliveredBy,
        p_note:note||null
      });
      if(error) throw error;

      await loadAnnualSettlementData();
      render();
    }catch(e){
      console.error(e);
      err.textContent=e?.message||tx('تعذر حفظ التصفية.','Unable to save settlement.');
      save.disabled=false;
      save.textContent=tx('حفظ التصفية','Save Settlement');
    }
  };

  if(!state.annualSettlementSummary && state.annualSettlementUserId){
    loadAnnualSettlementData().then(()=>render()).catch(e=>console.error(e));
  }
}

