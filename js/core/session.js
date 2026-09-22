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

  // Fetch independently; only mapping waits for users and request-to-loan linking waits for loans.
  const usersReady=loadVisibleUsers().then(()=>{
    if(!state.users.some(u=>u.id===state.currentUser.id)) state.users.unshift(state.currentUser);
  });
  const loansReady=loadLoansFromDatabase(usersReady);
  await finishLoaders([
    usersReady, loansReady, loadSystemSettings(),
    loadFinancialPolicies(), loadSettlementTransferTotals(), loadCollectionYears(), loadExpectedInterestByCollectionYear(),
    loadRepaymentRequestsFromDatabase(loansReady),
    loadCapitalMovementsFromDatabase(usersReady), loadCapitalHistoryFromDatabase()
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

    if(session?.user && !SAHALAT_EXISTING_TAB_SESSION){
      // Supabase can persist its token after the tab/browser closes.
      // A new tab/browser must start from the Sahalat login screen.
      await supabaseClient.auth.signOut();
      state.authSession=null;
      state.authUser=null;
      state.currentUser=null;
    }

    if(state.authUser){
      await loadCurrentProfile(state.authUser);
      startSahalatSessionSecurity();
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

// ======================================================
// Session security: reliable auto logout
// - 5 minutes without real activity => sign out
// - Works after background/sleep by comparing timestamps
// - Closing the tab/browser => next open requires login
// ======================================================
const SAHALAT_IDLE_LOGOUT_MS = 5 * 60 * 1000;
const SAHALAT_IDLE_CHECK_MS = 15 * 1000;
const SAHALAT_TAB_SESSION_KEY = 'sahalat_tab_session_active';
const SAHALAT_LAST_ACTIVITY_KEY = 'sahalat_last_activity';

const SAHALAT_EXISTING_TAB_SESSION =
  sessionStorage.getItem(SAHALAT_TAB_SESSION_KEY) === '1';

sessionStorage.setItem(SAHALAT_TAB_SESSION_KEY, '1');

let sahalatIdleInterval = null;
let sahalatLogoutInProgress = false;
let sahalatSecurityStarted = false;

function recordSahalatActivity(){
  if(!state.authUser || sahalatLogoutInProgress) return;
  sessionStorage.setItem(
    SAHALAT_LAST_ACTIVITY_KEY,
    String(Date.now())
  );
}

function getSahalatLastActivity(){
  const value = Number(
    sessionStorage.getItem(SAHALAT_LAST_ACTIVITY_KEY)
  );

  return Number.isFinite(value) && value > 0
    ? value
    : Date.now();
}

async function sahalatAutoSignOut(){
  if(sahalatLogoutInProgress || !state.authUser) return;

  sahalatLogoutInProgress = true;

  try{
    if(sahalatIdleInterval){
      clearInterval(sahalatIdleInterval);
      sahalatIdleInterval = null;
    }

    sessionStorage.removeItem(SAHALAT_LAST_ACTIVITY_KEY);
    sessionStorage.removeItem(SAHALAT_TAB_SESSION_KEY);

    await supabaseClient.auth.signOut();
  }catch(err){
    console.error('Automatic sign out failed:', err);
  }finally{
    state.authSession = null;
    state.authUser = null;
    state.currentUser = null;
    state.accountUser = null;
    state.users = [];

    sahalatLogoutInProgress = false;

    await bootstrapApp();
  }
}

async function checkSahalatIdleTimeout(){
  if(!state.authUser || sahalatLogoutInProgress) return;

  const idleFor =
    Date.now() - getSahalatLastActivity();

  if(idleFor >= SAHALAT_IDLE_LOGOUT_MS){
    await sahalatAutoSignOut();
  }
}

function startSahalatSessionSecurity(){
  if(!state.authUser) return;

  // Start a fresh inactivity period after successful login/app load.
  recordSahalatActivity();

  // Add activity listeners only once.
  if(!sahalatSecurityStarted){
    sahalatSecurityStarted = true;

    const activityEvents = [
      'pointerdown',
      'keydown',
      'touchstart',
      'scroll'
    ];

    activityEvents.forEach(eventName => {
      window.addEventListener(
        eventName,
        recordSahalatActivity,
        {passive:true}
      );
    });

    // Important for tablets/phones:
    // immediately check elapsed time when returning from background.
    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'visible'){
        checkSahalatIdleTimeout();
      }
    });

    window.addEventListener('focus', () => {
      checkSahalatIdleTimeout();
    });

    window.addEventListener('pageshow', () => {
      checkSahalatIdleTimeout();
    });
  }

  if(sahalatIdleInterval){
    clearInterval(sahalatIdleInterval);
  }

  sahalatIdleInterval = setInterval(
    checkSahalatIdleTimeout,
    SAHALAT_IDLE_CHECK_MS
  );
}
