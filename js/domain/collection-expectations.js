function currentCollectionYearExpectedInterest(userId){
  const today=new Date();
  const currentYear=(state.collectionYears||[]).find(y=>{
    if(!y?.startDate || !y?.endDate) return false;
    const start=new Date(y.startDate+'T00:00:00');
    const end=new Date(y.endDate+'T23:59:59');
    return today>=start && today<=end;
  });

  if(!currentYear){
    return {collectionYear:null,userShare:0,ownerShare:0,totalInterest:0};
  }

  const row=(state.expectedInterestByCollectionYear||[]).find(r=>
    String(r.userId||'')===String(userId||'') &&
    Number(r.collectionYear)===Number(currentYear.year)
  );

  return {
    collectionYear:currentYear.year,
    userShare:Number(row?.userShare||0),
    ownerShare:Number(row?.ownerShare||0),
    totalInterest:Number(row?.totalInterest||0)
  };
}

