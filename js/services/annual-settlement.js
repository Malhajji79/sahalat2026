async function loadAnnualSettlementData(){
  if(state.currentUser.role!=='مدير مشروع') return;

  const eligible=state.users.filter(u=>u.dbRole!=='admin');
  if(!state.annualSettlementUserId || !eligible.some(u=>String(u.id)===String(state.annualSettlementUserId))){
    state.annualSettlementUserId=eligible[0]?.id||null;
  }
  if(!state.annualSettlementUserId) return;

  const {data:summary,error:summaryError}=await supabaseClient.rpc('get_general_settlement_summary',{
    p_user_id:state.annualSettlementUserId
  });
  if(summaryError) throw summaryError;

  const row=Array.isArray(summary)?summary[0]:summary;
  state.annualSettlementSummary=row?{
    realizedUser:Number(row.realized_user_interest||0),
    settledUser:Number(row.settled_user_interest||0),
    remainingUser:Number(row.remaining_user_interest||0),
    realizedOwner:Number(row.realized_owner_interest||0),
    settledOwner:Number(row.settled_owner_interest||0),
    remainingOwner:Number(row.remaining_owner_interest||0)
  }:null;

  const {data:records,error:recordsError}=await supabaseClient
    .from('annual_settlements')
    .select('id,settlement_year,account_user_id,settlement_for,amount,settlement_date,receiver_name,delivered_by_name,note,created_by,created_at,legacy_no,is_historical,import_source,delivered_by_user_id')
    .eq('delivered_by_user_id',state.annualSettlementUserId)
    .order('settlement_date',{ascending:false})
    .order('created_at',{ascending:false});

  if(recordsError) throw recordsError;
  state.annualSettlementRecords=(records||[]).map(r=>({
    id:r.id,
    year:r.settlement_year,
    userId:r.account_user_id,
    settlementFor:r.settlement_for,
    amount:Number(r.amount||0),
    date:r.settlement_date,
    receiver:r.receiver_name,
    deliveredBy:r.delivered_by_name,
    note:r.note||'',
    createdBy:r.created_by,
    createdAt:r.created_at,
    legacyNo:r.legacy_no,
    isHistorical:!!r.is_historical,
    importSource:r.import_source||''
  }));
}

