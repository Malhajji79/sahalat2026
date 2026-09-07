function mapDbRepaymentRequest(r, usersById){
  return {
    id:r.id,
    dbId:r.id,
    loanDbId:r.loan_id,
    requestedBy:usersById.get(r.requested_by)?.username||'—',
    requestedById:r.requested_by,
    oldMonths:Number(r.old_months||0),
    requestedMonths:Number(r.requested_months||0),
    oldTotal:Number(r.old_total_due||0),
    newTotal:Number(r.new_total_due||0),
    paidAtRequest:Number(r.paid_amount_at_request||0),
    newRemaining:Number(r.new_remaining_amount||0),
    oldInstallment:Number(r.old_installment||0),
    newInstallment:Number(r.new_installment||0),
    oldSettlementDue:Number(r.old_settlement_difference||0),
    newSettlementDue:Number(r.new_settlement_difference||0),
    newBaseRate:Number(r.new_base_rate||0),
    newBaseInterest:Number(r.new_base_interest||0),
    newAfterGeneral:Number(r.new_interest_after_discount||0),
    newUserNet:Number(r.new_user_target_share||0),
    newAdminNet:Number(r.new_owner_target_share||0),
    newFinalInterest:Number(r.new_final_interest||0),
    status:r.status,
    reviewedBy:usersById.get(r.reviewed_by)?.username||'—',
    reviewNote:r.review_note||'',
    requestedAt:r.requested_at,
    reviewedAt:r.reviewed_at
  };
}

async function loadRepaymentRequestsFromDatabase(){
  const {data,error}=await supabaseClient
    .from('repayment_period_requests')
    .select(`
      id,loan_id,requested_by,old_months,requested_months,
      old_total_due,new_total_due,paid_amount_at_request,new_remaining_amount,
      old_installment,new_installment,old_settlement_difference,new_settlement_difference,
      new_base_rate,new_base_interest,new_interest_after_discount,
      new_user_target_share,new_owner_target_share,new_final_interest,
      status,reviewed_by,review_note,requested_at,reviewed_at
    `)
    .order('requested_at',{ascending:true});

  if(error) throw error;

  const usersById=new Map(state.users.map(u=>[u.id,u]));
  const mapped=(data||[]).map(r=>mapDbRepaymentRequest(r,usersById));

  state.repaymentRequests=mapped;

  const byLoan=new Map();
  mapped.filter(r=>r.status==='pending').forEach(r=>byLoan.set(r.loanDbId,r));

  state.loans.forEach(l=>{
    l.earlySettlementRequest=byLoan.get(l.dbId)||null;
  });
}


