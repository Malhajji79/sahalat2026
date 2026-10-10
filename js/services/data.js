// Wait for every started loader before surfacing an error; avoid late state writes after failure.
async function finishLoaders(loaders){
  const results=await Promise.allSettled(loaders);
  const failure=results.find(r=>r.status==='rejected');
  if(failure) throw failure.reason;
  return results.map(r=>r.value);
}

async function loadSystemSettings(){
  const {data,error}=await supabaseClient
    .from('system_settings')
    .select('id,max_loan_amount,max_loan_months,user_share_percent,owner_share_percent,admin_analytics_enabled,updated_by,updated_at')
    .order('id',{ascending:true})
    .limit(1)
    .maybeSingle();

  if(error) throw error;
  if(!data) throw new Error('إعدادات النظام غير موجودة في جدول system_settings.');

  state.systemSettingsId=data.id;
  state.maxLoan=Number(data.max_loan_amount||0);
  state.maxMonths=Number(data.max_loan_months||0);
  state.userSharePercent=Number(data.user_share_percent||0);
  state.ownerSharePercent=Number(data.owner_share_percent||0);
  state.adminAnalyticsEnabled=data.admin_analytics_enabled===true;

  if(state.maxLoan<=0) throw new Error('الحد الأعلى للقرض في إعدادات النظام غير صحيح.');
  if(state.maxMonths<=0) throw new Error('الحد الأعلى لمدة القرض في إعدادات النظام غير صحيح.');
  if(state.userSharePercent<0 || state.ownerSharePercent<0){
    throw new Error('نسب توزيع الفائدة في إعدادات النظام غير صحيحة.');
  }
}


;
function dbRoleToArabic(role){
  return ['admin','أدمن'].includes(role) ? 'أدمن' : ['manager','مدير مشروع','مدير المشروع'].includes(role) ? 'مدير مشروع' : 'مستخدم';
}

function dbStatusToArabic(status){
  return status==='active' ? 'نشط' : 'غير نشط';
}

function mapDbUser(u){
  const role=dbRoleToArabic(u.role);
  return {
    id: u.id,
    authUserId: u.auth_user_id,
    username: u.username,
    fullName: u.full_name,
    role,
    dbRole: role==='أدمن'?'admin':role==='مدير مشروع'?'manager':'user',
    status: dbStatusToArabic(u.status),
    dbStatus: u.status,
    lastLogin: '—',
    baseCapital: Number(u.base_capital||0),
    transferredUser: Number(u.transferred_user||0),
    transferredOwner: Number(u.transferred_owner||0),
    loanNumberStart: u.loan_number_start
  };
}

async function loadVisibleUsers(){
  const {data,error} = await supabaseClient
    .from('users')
    .select('id,auth_user_id,username,full_name,role,status,base_capital,transferred_user,transferred_owner,loan_number_start')
    .order('loan_number_start',{ascending:true,nullsFirst:true});

  if(error) throw error;
  state.users = (data||[]).map(mapDbUser);
}


;
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



;
function dbLoanStatusToArabic(status){
  return status==='pending_admin' ? 'بانتظار موافقة الأدمن'
    : status==='active' ? 'نشط'
    : status==='rejected' ? 'مرفوض'
    : status==='closed' ? 'مغلق'
    : status;
}

function dbLoanTypeToArabic(type){
  return type==='normal' ? 'قرض عادي'
    : type==='free' ? 'قرض مجاني'
    : type==='study' ? 'قرض دراسة'
    : type==='ac' ? 'قرض مكيفات'
    : type;
}

function mapDbLoan(l, usersById){
  const assigned = usersById.get(l.assigned_user_id);
  const creator = usersById.get(l.created_by);
  const approver = usersById.get(l.approved_by);
  const rejecter = usersById.get(l.rejected_by);

  return {
    dbId: l.id,
    id: String(l.loan_number),
    loanNumber: l.loan_number,
    beneficiary: l.beneficiary_name,
    nationalId: l.national_id,
    mobile: l.mobile,
    loanDate: l.loan_date,
    type: dbLoanTypeToArabic(l.loan_type),
    dbType: l.loan_type,
    amount: Number(l.loan_amount||0),
    months: Number(l.months||0),
    generalDiscount: Number(l.general_discount||0),
    userDiscount: Number(l.user_discount||0),
    adminDiscount: Number(l.admin_discount||0),
    baseRate: Number(l.base_rate||0),
    baseInterest: Number(l.base_interest||0),
    afterGeneral: Number(l.interest_after_discount||0),
    userNet: Number(l.user_target_share||0),
    adminNet: Number(l.owner_target_share||0),
    finalInterest: Number(l.final_interest||0),
    total: Number(l.total_due||0),
    installment: Number(l.monthly_installment||0),
    settlementDue: Number(l.settlement_difference||0),
    paid: Number(l.paid_amount||0),
    payments: [],
    paymentAuditLog: [],
    status: dbLoanStatusToArabic(l.status),
    dbStatus: l.status,
    assignedUser: assigned?.username || '—',
    assignedUserId: l.assigned_user_id,
    createdBy: creator?.username || '—',
    createdById: l.created_by,
    approvedBy: approver?.username || '—',
    rejectedBy: rejecter?.username || '—',
    rejectReason: l.rejection_reason || '',
    approvedAt: l.approved_at,
    rejectedAt: l.rejected_at,
    closedAt: l.closed_at,
    createdAt: l.created_at,
    updatedAt: l.updated_at,
    earlySettlementRequest: null
  };
}

async function loadLoansFromDatabase(dependenciesReady=Promise.resolve()){
  const [loanRows,paymentRows,auditRows]=await finishLoaders([
    (async()=>{const {data,error}=await supabaseClient
    .from('loans')
    .select(`
      id,loan_number,assigned_user_id,beneficiary_name,national_id,mobile,loan_date,
      loan_type,loan_amount,months,general_discount,user_discount,admin_discount,
      base_rate,base_interest,interest_after_discount,user_target_share,owner_target_share,
      final_interest,total_due,monthly_installment,settlement_difference,paid_amount,status,
      created_by,approved_by,rejected_by,rejection_reason,approved_at,rejected_at,closed_at,
      created_at,updated_at
    `)
    .order('loan_number',{ascending:true});if(error)throw error;return data||[];})(),
    (async()=>{
  // Load ALL payment rows in pages. Supabase/PostgREST commonly caps
  // a single request at 1000 rows, so one query can hide older payments.
  const paymentRows=[];
  const paymentPageSize=1000;
  let paymentFrom=0;

  while(true){
    const {data:paymentPage,error:paymentError}=await supabaseClient
      .from('payments')
      .select('id,loan_id,amount,payment_date,note,created_by,last_edited_by,last_edited_at,created_at')
      .order('created_at',{ascending:true})
      .range(paymentFrom,paymentFrom+paymentPageSize-1);

    if(paymentError) throw paymentError;

    const page=paymentPage||[];
    paymentRows.push(...page);

    if(page.length<paymentPageSize) break;
    paymentFrom+=paymentPageSize;
  }

      return paymentRows;
    })(),
    (async()=>{const {data,error}=await supabaseClient
    .from('payment_audit_log')
    .select('id,payment_id,original_payment_id,loan_id,action,old_amount,new_amount,old_payment_date,new_payment_date,old_note,new_note,reason,action_by,action_at')
    .order('action_at',{ascending:true});if(error)throw error;return data||[];})()
  ]);

  // Requests start immediately; resolve names and loan links only after their dependencies.
  await dependenciesReady;
  const usersById = new Map(state.users.map(u=>[u.id,u]));
  const paymentsByLoan = new Map();
  const auditByLoan = new Map();

  (paymentRows||[]).forEach(p=>{
    if(!paymentsByLoan.has(p.loan_id)) paymentsByLoan.set(p.loan_id,[]);
    paymentsByLoan.get(p.loan_id).push({
      id:p.id,
      dbId:p.id,
      amount:Number(p.amount||0),
      paymentDate:p.payment_date,
      note:p.note||'',
      createdBy:usersById.get(p.created_by)?.username||'—',
      createdById:p.created_by,
      lastEditedBy:usersById.get(p.last_edited_by)?.username||'—',
      lastEditedAt:p.last_edited_at,
      createdAt:p.created_at
    });
  });

  (auditRows||[]).forEach(a=>{
    if(!auditByLoan.has(a.loan_id)) auditByLoan.set(a.loan_id,[]);
    auditByLoan.get(a.loan_id).push({
      id:a.id,
      action:a.action==='edit'?'تعديل دفعة':'حذف دفعة',
      paymentId:a.original_payment_id||a.payment_id||'—',
      oldAmount:a.old_amount!=null?Number(a.old_amount):null,
      newAmount:a.new_amount!=null?Number(a.new_amount):null,
      oldDate:a.old_payment_date,
      newDate:a.new_payment_date,
      oldNote:a.old_note||'',
      newNote:a.new_note||'',
      reason:a.reason||'',
      actionBy:usersById.get(a.action_by)?.username||'—',
      actionAt:a.action_at
    });
  });

  state.loans = (loanRows||[]).map(l=>{
    const mapped=mapDbLoan(l,usersById);
    mapped.payments=paymentsByLoan.get(l.id)||[];
    mapped.paymentAuditLog=auditByLoan.get(l.id)||[];
    return mapped;
  });
}



;
function dbCapitalTypeToUi(type){
  return type==='owner_to_user' ? 'owner-to-user'
    : type==='user_to_owner' ? 'user-to-owner'
    : type==='user_to_user' ? 'user-to-user'
    : type==='edit' ? 'edit'
    : type==='delete' ? 'delete'
    : type;
}

function dbCapitalTypeLabel(type){
  return type==='owner_to_user' ? 'إضافة من المالك'
    : type==='user_to_owner' ? 'خصم إلى المالك'
    : type==='user_to_user' ? 'تحويل بين مستخدمين'
    : type==='edit' ? 'تعديل حركة رأس مال'
    : type==='delete' ? 'إلغاء حركة رأس مال'
    : type;
}

function mapDbCapitalMovement(m, usersById){
  const fromUser = m.from_user_id ? usersById.get(m.from_user_id) : null;
  const toUser = m.to_user_id ? usersById.get(m.to_user_id) : null;
  const creator = usersById.get(m.created_by);

  return {
    id: m.id,
    dbId: m.id,
    entryKind: m.movement_type==='delete' ? 'deletion'
      : m.movement_type==='edit' ? 'edit'
      : 'transfer',
    status: m.status,
    date: m.movement_date,
    from: m.from_user_id ? (fromUser?.username || 'مستخدم آخر') : 'المالك',
    to: m.to_user_id ? (toUser?.username || 'مستخدم آخر') : 'المالك',
    fromUserId: m.from_user_id,
    toUserId: m.to_user_id,
    amount: Number(m.amount||0),
    type: dbCapitalTypeToUi(m.movement_type),
    dbType: m.movement_type,
    typeLabel: dbCapitalTypeLabel(m.movement_type),
    note: m.note||'',
    createdBy: creator?.username || (m.created_by===state.currentUser?.id ? state.currentUser.username : 'مستخدم آخر'),
    createdById: m.created_by,
    lastEditedById: m.last_edited_by,
    lastEditedAt: m.last_edited_at,
    deletedById: m.deleted_by,
    deletedAt: m.deleted_at,
    deleteReason: m.delete_reason||'',
    relatedMovementId: m.related_movement_id,
    createdAt: m.created_at
  };
}

async function loadCapitalMovementsFromDatabase(dependenciesReady=Promise.resolve()){
  const {data,error}=await supabaseClient
    .from('capital_movements')
    .select(`
      id,movement_type,from_user_id,to_user_id,amount,movement_date,note,status,
      related_movement_id,created_by,last_edited_by,last_edited_at,
      deleted_by,deleted_at,delete_reason,created_at
    `)
    .order('created_at',{ascending:true});

  if(error) throw error;

  // Requests start immediately; resolve names and loan links only after their dependencies.
  await dependenciesReady;
  const usersById=new Map(state.users.map(u=>[u.id,u]));
  if(state.currentUser && !usersById.has(state.currentUser.id)){
    usersById.set(state.currentUser.id,state.currentUser);
  }

  state.capitalTransfers=(data||[]).map(m=>mapDbCapitalMovement(m,usersById));
}


async function loadCapitalHistoryFromDatabase(){
  const {data,error}=await supabaseClient
    .from('capital_movement_history')
    .select('id,source_seq,to_name,from_name,deduct_amount,add_amount,movement_date,recorded_name,source_name,imported_at')
    .eq('source_name','Update Total')
    .order('source_seq',{ascending:true});

  if(error){
    console.error('capital_movement_history load error:',error);
    throw error;
  }

  state.capitalHistory=(data||[]).map(r=>({
    id:r.id,
    seq:Number(r.source_seq||0),
    to:r.to_name||'—',
    from:r.from_name||'—',
    deduct:Number(r.deduct_amount||0),
    add:Number(r.add_amount||0),
    date:r.movement_date||'',
    name:r.recorded_name||'—',
    source:r.source_name||'Update Total'
  }));
}



;
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

async function loadRepaymentRequestsFromDatabase(dependenciesReady=Promise.resolve()){
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

  // Requests start immediately; resolve names and loan links only after their dependencies.
  await dependenciesReady;
  const usersById=new Map(state.users.map(u=>[u.id,u]));
  const mapped=(data||[]).map(r=>mapDbRepaymentRequest(r,usersById));

  state.repaymentRequests=mapped;

  const byLoan=new Map();
  mapped.filter(r=>r.status==='pending').forEach(r=>byLoan.set(r.loanDbId,r));

  state.loans.forEach(l=>{
    l.earlySettlementRequest=byLoan.get(l.dbId)||null;
  });
}



;
async function loadSettlementTransferTotals(){
  const {data,error}=await supabaseClient.rpc('get_visible_settlement_transfer_totals');
  if(error) throw error;
  state.settlementTransferTotals=Object.fromEntries((data||[]).map(row=>[
    String(row.user_id),{user:Number(row.transferred_to_user||0),owner:Number(row.transferred_to_owner||0)}
  ]));
}

async function loadFinancialPolicies(){
  const results=await finishLoaders([
    supabaseClient.from('loan_rates').select('months,rate_percent').order('months'),
    supabaseClient.from('loan_share_policies').select('effective_from,user_share_percent,owner_share_percent').order('effective_from')
  ]);
  for(const result of results)if(result.error)throw result.error;
  const rates={};
  for(const row of results[0].data||[]){
    const month=Number(row.months),rate=Number(row.rate_percent);
    if(!Number.isInteger(month)||month<1||!Number.isFinite(rate)||rate<0)throw Error('Invalid loan rate configuration');
    rates[month]=rate;
  }
  const policies=(results[1].data||[]).map(row=>({
    effectiveFrom:row.effective_from,user:Number(row.user_share_percent),owner:Number(row.owner_share_percent)
  }));
  if(!Object.keys(rates).length||!policies.length)throw Error('Financial policy configuration is missing');
  for(const policy of policies){
    if(policy.effectiveFrom!=='-infinity'&&!/^\d{4}-\d{2}-\d{2}$/.test(policy.effectiveFrom))throw Error('Invalid policy date');
    if(!Number.isFinite(policy.user)||!Number.isFinite(policy.owner)||policy.user<0||policy.owner<0||Math.abs(policy.user+policy.owner-100)>0.000001)throw Error('Invalid share policy');
  }
  state.loanRates=rates;state.loanSharePolicies=policies;
}



;
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
