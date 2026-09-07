async function loadSettlementTransferTotals(){
  const visible=state.users.filter(u=>u.dbRole!=='admin');
  const totals={};

  for(const u of visible){
    try{
      const {data,error}=await supabaseClient.rpc('get_settlement_transfer_totals',{
        p_user_id:u.id
      });
      if(error) throw error;

      const row=Array.isArray(data)?data[0]:data;
      totals[String(u.id)]={
        user:Number(row?.transferred_to_user||0),
        owner:Number(row?.transferred_to_owner||0)
      };
    }catch(e){
      // Ordinary users may only query their own totals. Ignore inaccessible rows.
      if(String(u.id)===String(state.currentUser?.id)) throw e;
    }
  }

  state.settlementTransferTotals=totals;
}

