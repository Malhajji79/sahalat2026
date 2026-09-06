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

async function loadLoansFromDatabase(){
  const {data:loanRows,error:loanError} = await supabaseClient
    .from('loans')
    .select(`
      id,loan_number,assigned_user_id,beneficiary_name,national_id,mobile,loan_date,
      loan_type,loan_amount,months,general_discount,user_discount,admin_discount,
      base_rate,base_interest,interest_after_discount,user_target_share,owner_target_share,
      final_interest,total_due,monthly_installment,settlement_difference,paid_amount,status,
      created_by,approved_by,rejected_by,rejection_reason,approved_at,rejected_at,closed_at,
      created_at,updated_at
    `)
    .order('loan_number',{ascending:true});

  if(loanError) throw loanError;

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

  const {data:auditRows,error:auditError}=await supabaseClient
    .from('payment_audit_log')
    .select('id,payment_id,original_payment_id,loan_id,action,old_amount,new_amount,old_payment_date,new_payment_date,old_note,new_note,reason,action_by,action_at')
    .order('action_at',{ascending:true});

  if(auditError) throw auditError;

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


