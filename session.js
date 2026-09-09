async function loadCurrentProfile(authUser){
  const {data,error} = await supabaseClient
    .from('users')
    .select('id,auth_user_id,username,full_name,role,status,base_capital,transferred_user,transferred_owner,loan_number_start')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if(error) throw error;
  if(!data) throw new Error('حساب الدخول غير مربوط بمستخدم في جدول users.');
  if(data.status!=='active') throw new Error('هذا الحساب غير نشط.');

  state.currentUser = mapDbUser(data);
  state.accountUser = state.currentUser.username;

  await finishLoaders([loadSystemSettings(),loadVisibleUsers()]);

  // Ensure the current profile is available even under the strictest RLS result.
  if(!state.users.some(u=>u.id===state.currentUser.id)){
    state.users.unshift(state.currentUser);
  }

  await finishLoaders([
    loadFinancialPolicies(), loadSettlementTransferTotals(), loadCollectionYears(), loadExpectedInterestByCollectionYear(),
    loadLoansFromDatabase().then(()=>loadRepaymentRequestsFromDatabase()),
    loadCapitalMovementsFromDatabase(), loadCapitalHistoryFromDatabase()
  ]);
  const shares=getLoanShares(todayISO());
  state.userSharePercent=shares.user;state.ownerSharePercent=shares.owner;
}

async function bootstrapApp(){
  const app=document.getElementById('app');
  app.innerHTML=html`<div class="login-wrap"><div class="login-card" style="grid-column:1/-1"><div class="panel login-panel"><h2>سهالات</h2><p class="muted">جاري الاتصال بقاعدة البيانات...</p></div></div></div>`;

  try{
    const {data:{session},error}=await supabaseClient.auth.getSession();
    if(error) throw error;

    state.authSession=session;
    state.authUser=session?.user||null;

    if(session?.user){
      await loadCurrentProfile(session.user);
    }else{
      state.currentUser=null;
      state.users=[];
      const {data:loginUsers,error:loginUsersError}=await supabaseClient.rpc('get_login_users');
      if(loginUsersError){
        console.error('get_login_users error:',loginUsersError);
        state.loginUsers=[];
        state.connectionError='تعذر تحميل قائمة المستخدمين: '+(loginUsersError.message||'خطأ غير معروف');
      }else{
        state.loginUsers=(loginUsers||[])
          .filter(x=>x?.username && x?.email)
          .map(x=>({username:String(x.username),email:String(x.email)}));
      }
    }

    state.connectionError='';
  }catch(err){
    console.error(err);
    state.currentUser=null;
    state.connectionError=err?.message||'تعذر الاتصال بقاعدة البيانات.';
  }finally{
    state.isBootstrapping=false;
    render();
  }
}

async function refreshAuthenticatedData(){
  if(!state.authUser) return;
  await loadCurrentProfile(state.authUser);
  render();
}



