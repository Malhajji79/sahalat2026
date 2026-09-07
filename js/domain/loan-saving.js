function nextLoanNumberForUser(username){
  const starts = {
    'AHMED H ALHASHIM': 1001,
    'HANI M ALHAJJI': 2001,
    'HASSAN A ALHASHIM': 3001,
    'HASSAN J ALHASHIM': 4001,
    'HUSSAIN A BOHLIGAH': 5001,
    'MOHAMMED H ALHAJJI': 6001
  };

  const start = starts[username];
  if(!start){
    // Temporary fallback for users whose ranges have not yet been defined.
    const nums = state.loans
      .map(l=>Number(String(l.id||'').replace(/\D/g,'')))
      .filter(n=>Number.isFinite(n));
    return nums.length ? Math.max(...nums)+1 : 3001;
  }

  const used = state.loans
    .filter(l=>(l.assignedUser||l.createdBy)===username)
    .map(l=>Number(String(l.id||'').replace(/\D/g,'')))
    .filter(n=>Number.isFinite(n) && n>=start && n<start+1000);

  return used.length ? Math.max(...used)+1 : start;
}

async function saveLoan(){
  const err=document.getElementById('formError');
  const saveBtn=document.getElementById('saveLoanBtn');

  err.textContent='';

  const beneficiary=document.getElementById('beneficiary').value.trim();
  const nationalId=document.getElementById('nationalId').value.trim();
  const mobile=document.getElementById('mobile').value.trim();
  const amount=Number(document.getElementById('amount').value||0);
  const months=Number(document.getElementById('months').value||0);
  const type=document.getElementById('loanType').value;
  const dbType=loanTypeToDb(type);
  const assignedUser=document.getElementById('assignedUser').value;
  const assignedObj=state.users.find(u=>u.username===assignedUser);

  if(!assignedObj || assignedObj.role==='أدمن'){
    err.textContent='لا يمكن تخصيص قرض للأدمن.';
    return;
  }

  const gd=clampPct(document.getElementById('generalDiscount').value);
  const ud=clampPct(document.getElementById('userDiscount').value);
  const ad=clampPct(document.getElementById('adminDiscount').value);
  const loanDate=document.getElementById('loanDate').value;

  if(!beneficiary || beneficiary.split(/\s+/).length<4){
    err.textContent='يجب إدخال اسم المستفيد رباعيًا.';
    return;
  }
  if(!nationalId){
    err.textContent='رقم بطاقة الأحوال مطلوب.';
    return;
  }
  if(!mobile){
    err.textContent='رقم الجوال مطلوب.';
    return;
  }
  if(!loanDate){
    err.textContent='تاريخ القرض مطلوب.';
    return;
  }
  if(amount<500 || amount>state.maxLoan){
    err.textContent=`قيمة القرض يجب أن تكون بين 500 و ${state.maxLoan} ريال.`;
    return;
  }
  if(months<1 || months>state.maxMonths){
    err.textContent=`عدد الشهور يجب أن يكون بين 1 و ${state.maxMonths}.`;
    return;
  }
  if(!dbType){
    err.textContent='نوع القرض غير صحيح.';
    return;
  }

  saveBtn.disabled=true;
  saveBtn.textContent='جاري الحفظ...';

  try{
    const {data,error}=await supabaseClient.rpc('create_loan',{
      p_assigned_user_id: assignedObj.id,
      p_beneficiary_name: beneficiary,
      p_national_id: nationalId,
      p_mobile: mobile,
      p_loan_date: loanDate,
      p_loan_type: dbType,
      p_loan_amount: amount,
      p_months: months,
      p_general_discount: gd,
      p_user_discount: ud,
      p_admin_discount: ad
    });

    if(error) throw error;

    await loadLoansFromDatabase();

    // Move directly to the database-backed loan list.
    state.page='loans';
    render();
  }catch(e){
    console.error(e);
    err.textContent=e?.message || 'تعذر حفظ القرض في قاعدة البيانات.';
  }finally{
    const currentBtn=document.getElementById('saveLoanBtn');
    if(currentBtn){
      currentBtn.disabled=false;
      currentBtn.textContent='حفظ وإرسال لموافقة الأدمن';
    }
  }
}

