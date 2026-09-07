function bindLogin(){
  const username=document.getElementById('loginUsername');
  const password=document.getElementById('password');
  const button=document.getElementById('loginBtn');
  const errorBox=document.getElementById('loginError');

  const reloadUsers=document.getElementById('reloadLoginUsersBtn');
  if(reloadUsers) reloadUsers.onclick=async()=>{
    reloadUsers.disabled=true;
    reloadUsers.textContent=t('loading');
    try{
      const {data,error}=await supabaseClient.rpc('get_login_users');
      if(error) throw error;
      state.loginUsers=(data||[]).filter(x=>x?.username&&x?.email).map(x=>({
        username:String(x.username),
        email:String(x.email)
      }));
      state.connectionError='';
      render();
    }catch(e){
      console.error(e);
      state.connectionError=t('loadUsersFailed')+' '+(e?.message||t('unknownError'));
      render();
    }
  };

  const submit=async()=>{
    const e=username.value;
    const p=password.value;

    errorBox.textContent='';
    if(!e || !p){
      errorBox.textContent=t('loginRequired');
      return;
    }

    button.disabled=true;
    button.textContent=t('loggingIn');

    try{
      const {data,error}=await supabaseClient.auth.signInWithPassword({
        email:e,
        password:p
      });

      if(error) throw error;
      if(!data?.user) throw new Error('تعذر قراءة حساب المستخدم بعد تسجيل الدخول.');

      state.authSession=data.session;
      state.authUser=data.user;
      await loadCurrentProfile(data.user);
      state.page='dashboard';
      state.connectionError='';
      render();
    }catch(err){
      console.error(err);
      await supabaseClient.auth.signOut().catch(()=>{});
      state.currentUser=null;
      state.authSession=null;
      state.authUser=null;
      errorBox.textContent=err?.message||t('loginFailed');
    }finally{
      button.disabled=false;
      button.textContent=t('login');
    }
  };

  button.onclick=submit;
  password.addEventListener('keydown',e=>{
    if(e.key==='Enter') submit();
  });
  username.addEventListener('keydown',e=>{
    if(e.key==='Enter') submit();
  });
}

