async function loadCollectionYears(){
  const {data,error}=await supabaseClient
    .from('collection_years')
    .select('id,sequence_no,collection_year,start_date,end_date,updated_by,updated_at')
    .order('sequence_no',{ascending:true});
  if(error) throw error;
  state.collectionYears=(data||[]).map(r=>({
    id:r.id,
    sequenceNo:Number(r.sequence_no||0),
    year:Number(r.collection_year||0),
    startDate:r.start_date,
    endDate:r.end_date,
    updatedBy:r.updated_by||null,
    updatedAt:r.updated_at||null
  }));

  if(!state.selectedCollectionYear || !state.collectionYears.some(y=>y.year===Number(state.selectedCollectionYear))){
    const today=new Date();
    const current=state.collectionYears.find(y=>{
      const a=new Date(y.startDate+'T00:00:00');
      const b=new Date(y.endDate+'T23:59:59');
      return today>=a && today<=b;
    });
    state.selectedCollectionYear=current?.year || state.collectionYears.filter(y=>new Date(y.startDate+'T00:00:00')<=today).at(-1)?.year || state.collectionYears[0]?.year || null;
  }
}

async function loadExpectedInterestByCollectionYear(){
  const {data,error}=await supabaseClient.rpc('get_expected_interest_by_collection_year');
  if(error) throw error;
  state.expectedInterestByCollectionYear=(data||[]).map(r=>({
    userId:r.user_id,
    collectionYear:Number(r.collection_year||0),
    userShare:Number(r.expected_user_share||0),
    ownerShare:Number(r.expected_owner_share||0),
    totalInterest:Number(r.expected_total_interest||0),
    installmentCount:Number(r.installment_count||0),
    loanCount:Number(r.loan_count||0)
  }));
}


