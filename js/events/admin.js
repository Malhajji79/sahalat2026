function bindAdmin(){
  const changeOwnerPasswordBtn=document.getElementById('changeOwnerPasswordBtn');
  if(changeOwnerPasswordBtn) changeOwnerPasswordBtn.onclick=async()=>{
    const p1=document.getElementById('ownerNewPassword')?.value||'';
    const p2=document.getElementById('ownerConfirmPassword')?.value||'';
    const err=document.getElementById('ownerPasswordError');
    const ok=document.getElementById('ownerPasswordSuccess');
    if(err) err.textContent='';
    if(ok) ok.textContent='';

    if(p1.length<8){if(err) err.textContent=tx('كلمة المرور يجب أن تكون 8 خانات على الأقل.','Password must be at least 8 characters.');return;}
    if(p1!==p2){if(err) err.textContent=tx('كلمتا المرور غير متطابقتين.','Passwords do not match.');return;}

    changeOwnerPasswordBtn.disabled=true;
    changeOwnerPasswordBtn.textContent=tx('جاري تغيير الرقم السري...','Changing password...');
    try{
      const {error}=await supabaseClient.auth.updateUser({password:p1});
      if(error) throw error;
      document.getElementById('ownerNewPassword').value='';
      document.getElementById('ownerConfirmPassword').value='';
      if(ok) ok.textContent=tx('تم تغيير الرقم السري للمالك بنجاح.','Owner password changed successfully.');
    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||tx('تعذر تغيير الرقم السري للمالك.','Unable to change owner password.');
    }finally{
      changeOwnerPasswordBtn.disabled=false;
      changeOwnerPasswordBtn.textContent=tx('تغيير الرقم السري للمالك','Change Owner Password');
    }
  };

  document.getElementById('refreshUsersBtn')?.addEventListener('click',async()=>{
    const b=document.getElementById('refreshUsersBtn');
    b.disabled=true;b.textContent=tx('جاري التحديث...','Refreshing...');
    try{await refreshAdminData();render();}
    catch(e){alert(e?.message||tx('تعذر تحديث المستخدمين.','Unable to refresh users.'));b.disabled=false;b.textContent=tx('تحديث القائمة','Refresh List');}
  });

  const create=document.getElementById('createUserBtn');
  if(create) create.onclick=async()=>{
    const err=document.getElementById('adminUserError');
    const ok=document.getElementById('adminUserSuccess');
    err.textContent='';ok.textContent='';

    const username=document.getElementById('newUserUsername').value.trim();
    const fullName=document.getElementById('newUserFullName').value.trim()||username;
    const email=document.getElementById('newUserEmail').value.trim();
    const password=document.getElementById('newUserPassword').value;
    const role=document.getElementById('newUserRole').value;
    const status=document.getElementById('newUserStatus').value;
    const baseCapital=Number(document.getElementById('newUserCapital').value||0);
    const loanStartRaw=document.getElementById('newUserLoanStart').value.trim();
    const loanNumberStart=loanStartRaw?Number(loanStartRaw):null;

    if(!username){err.textContent=tx('اسم المستخدم مطلوب.','Username is required.');return;}
    if(!email || !email.includes('@')){err.textContent=tx('البريد الإلكتروني غير صحيح.','Invalid email address.');return;}
    if(password.length<8){err.textContent='كلمة المرور يجب أن تكون 8 خانات على الأقل.';return;}
    if(!Number.isFinite(baseCapital)||baseCapital<0){err.textContent='رأس المال غير صحيح.';return;}

    create.disabled=true;create.textContent='جاري الإنشاء...';
    try{
      await invokeAdminUsers({
        action:'create_user',
        username,
        full_name:fullName,
        email,
        password,
        role,
        status,
        base_capital:baseCapital,
        loan_number_start:loanNumberStart
      });
      await refreshAdminData();
      render();
    }catch(e){
      err.textContent=e?.message||'تعذر إنشاء المستخدم.';
      create.disabled=false;create.textContent='إنشاء المستخدم';
    }
  };

  document.querySelectorAll('.toggleUserStatus').forEach(b=>b.onclick=()=>{
    const user=state.users.find(u=>String(u.id)===String(b.dataset.id));
    if(!user){
      alert('تعذر تحديد المستخدم المطلوب.');
      return;
    }

    const newStatus=b.dataset.status;
    const label=newStatus==='active'?'تفعيل':'تعطيل';
    const host=document.getElementById('adminActionModal');

    host.innerHTML=`
      <div class="panel" style="margin-top:18px">
        <h3 class="section-title">${label} المستخدم — ${user.username}</h3>
        <div class="notice" style="background:${newStatus==='active'?'#ecfdf5':'#fff7ed'};color:${newStatus==='active'?'#166534':'#9a3412'}">
          ${newStatus==='active'
            ? 'سيُسمح لهذا المستخدم بتسجيل الدخول إلى سهالات مرة أخرى.'
            : 'سيتم منع هذا المستخدم من تسجيل الدخول حتى يتم تفعيله مجددًا.'}
        </div>
        <div id="adminStatusError" class="small" style="color:#b91c1c;margin-top:8px"></div>
        <div class="actions">
          <button class="btn ${newStatus==='active'?'btn-success':'btn-danger'}" id="confirmUserStatus">${label}</button>
          <button class="btn btn-secondary" id="cancelAdminAction">إلغاء</button>
        </div>
      </div>`;

    document.getElementById('cancelAdminAction').onclick=()=>host.innerHTML='';

    document.getElementById('confirmUserStatus').onclick=async()=>{
      const err=document.getElementById('adminStatusError');
      const btn=document.getElementById('confirmUserStatus');
      err.textContent='';
      btn.disabled=true;
      btn.textContent=`جاري ${label} الحساب...`;

      try{
        await invokeAdminUsers({
          action:'set_status',
          user_id:String(user.id),
          status:newStatus
        });

        await refreshAdminData();
        render();
      }catch(e){
        console.error(e);
        err.textContent=e?.message||`تعذر ${label} المستخدم.`;
        btn.disabled=false;
        btn.textContent=label;
      }
    };
  });

  document.querySelectorAll('.resetPass').forEach(b=>b.onclick=()=>{
    const user=state.users.find(u=>String(u.id)===String(b.dataset.id));
    if(!user){
      alert('تعذر تحديد المستخدم المطلوب.');
      return;
    }
    const host=document.getElementById('adminActionModal');
    host.innerHTML=`
      <div class="panel" style="margin-top:18px">
        <h3 class="section-title">تغيير كلمة مرور — ${user.username}</h3>
        <div class="field"><label>${tx('كلمة المرور الجديدة','New Password')}</label><input id="adminNewPassword" type="password" minlength="8"></div>
        <div id="adminPasswordError" class="small" style="color:#b91c1c;margin-top:8px"></div>
        <div class="actions">
          <button class="btn btn-primary" id="confirmResetPassword">حفظ كلمة المرور</button>
          <button class="btn btn-secondary" id="cancelAdminAction">إلغاء</button>
        </div>
      </div>`;

    document.getElementById('cancelAdminAction').onclick=()=>host.innerHTML='';
    document.getElementById('confirmResetPassword').onclick=async()=>{
      const password=document.getElementById('adminNewPassword').value;
      const err=document.getElementById('adminPasswordError');
      err.textContent='';
      if(password.length<8){err.textContent='كلمة المرور يجب أن تكون 8 خانات على الأقل.';return;}
      const btn=document.getElementById('confirmResetPassword');
      btn.disabled=true;btn.textContent=tx('جاري الحفظ...','Saving...');
      try{
        // حساب الأدمن الحالي يغيّر كلمة مروره مباشرة عبر Supabase Auth.
        // بقية المستخدمين تستمر عبر وظيفة admin-users الإدارية.
        if(user.dbRole==='admin' && String(user.id)===String(state.currentUser.id)){
          const {error}=await supabaseClient.auth.updateUser({password});
          if(error) throw error;
        }else{
          await invokeAdminUsers({action:'reset_password',user_id:String(user.id),password});
        }
        host.innerHTML='<div class="notice" style="background:#ecfdf5;color:#166534;margin-top:18px">تم تغيير كلمة المرور بنجاح.</div>';
      }catch(e){
        err.textContent=e?.message||'تعذر تغيير كلمة المرور.';
        btn.disabled=false;btn.textContent='حفظ كلمة المرور';
      }
    };
  });

  document.querySelectorAll('.deleteUserBtn').forEach(b=>b.onclick=()=>{
    const user=state.users.find(u=>String(u.id)===String(b.dataset.id));
    if(!user){
      alert('تعذر تحديد المستخدم المطلوب.');
      return;
    }
    const host=document.getElementById('adminActionModal');
    host.innerHTML=`
      <div class="panel" style="margin-top:18px">
        <h3 class="section-title">حذف المستخدم — ${user.username}</h3>
        <div class="notice" style="background:#fff7ed;color:#9a3412">إذا كان للمستخدم أي قرض أو دفعة أو حركة رأس مال، سترفض قاعدة الإدارة الحذف حفاظًا على السجل المالي. استخدم «تعطيل» في هذه الحالة.</div>
        <div id="adminDeleteError" class="small" style="color:#b91c1c;margin-top:8px"></div>
        <div class="actions">
          <button class="btn btn-danger" id="confirmDeleteUser">تأكيد الحذف</button>
          <button class="btn btn-secondary" id="cancelAdminAction">إلغاء</button>
        </div>
      </div>`;

    document.getElementById('cancelAdminAction').onclick=()=>host.innerHTML='';
    document.getElementById('confirmDeleteUser').onclick=async()=>{
      const err=document.getElementById('adminDeleteError');
      const btn=document.getElementById('confirmDeleteUser');
      err.textContent='';btn.disabled=true;btn.textContent='جاري الحذف...';
      try{
        await invokeAdminUsers({action:'delete_user',user_id:String(user.id)});
        await refreshAdminData();
        render();
      }catch(e){
        err.textContent=e?.message||'تعذر حذف المستخدم.';
        btn.disabled=false;btn.textContent='تأكيد الحذف';
      }
    };
  });
}


