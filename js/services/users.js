function dbRoleToArabic(role){
  return role==='admin' ? 'أدمن' : role==='manager' ? 'مدير مشروع' : 'مستخدم';
}

function dbStatusToArabic(status){
  return status==='active' ? 'نشط' : 'غير نشط';
}

function mapDbUser(u){
  return {
    id: u.id,
    authUserId: u.auth_user_id,
    username: u.username,
    fullName: u.full_name,
    role: dbRoleToArabic(u.role),
    dbRole: u.role,
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

