function adminView(){
  // صفحة الإدارة تعرض جميع الحسابات، بما فيها حساب الأدمن، حتى يمكن تغيير كلمة مروره من نفس قائمة المستخدمين.
  const users=state.users;
  return `
  <div class="notice">${tx('الحسابات ذات السجلات المالية لا تُحذف؛ يتم تعطيلها بدلًا من ذلك.','Accounts with financial records cannot be deleted; they are disabled instead.')}</div>

  <div class="grid cards" style="margin-bottom:18px">
    ${metricCard(tx('الحد الأعلى للقرض','Maximum Loan Amount'), wholeMoney(state.maxLoan))}
    ${metricCard(tx('الحد الأعلى للمدة','Maximum Term'), (state.lang==='en'?`${latinDigits(state.maxMonths)} months`:state.maxMonths+' شهر'))}
    ${metricCard(tx('حصة المستخدم','User Share'), state.userSharePercent+'%')}
    ${metricCard(tx('حصة المالك','Owner Share'), state.ownerSharePercent+'%')}
  </div>

  ${state.currentUser.role==='أدمن'?`
  <div class="panel" style="margin-bottom:18px">
    <h3 class="section-title">${tx('كلمة مرور المالك','Owner Password')}</h3>
    <div class="notice" style="margin-bottom:12px">${tx('هذا الخيار يغيّر كلمة مرور حساب الأدمن الحالي فقط.','This option changes the password of the current admin account only.')}</div>
    <div class="form-grid">
      <div class="field"><label>${tx('كلمة المرور الجديدة','New Password')}</label><input id="ownerNewPassword" type="password" minlength="8" autocomplete="new-password"></div>
      <div class="field"><label>${tx('تأكيد كلمة المرور الجديدة','Confirm New Password')}</label><input id="ownerConfirmPassword" type="password" minlength="8" autocomplete="new-password"></div>
    </div>
    <div id="ownerPasswordError" class="small" style="color:#b91c1c;margin-top:8px"></div>
    <div id="ownerPasswordSuccess" class="small" style="color:#166534;margin-top:8px"></div>
    <div class="actions"><button class="btn btn-primary" id="changeOwnerPasswordBtn">${tx('تغيير الرقم السري للمالك','Change Owner Password')}</button></div>
  </div>

  <div class="panel" style="margin-bottom:18px">
    <h3 class="section-title">${tx('إضافة مستخدم جديد','Add New User')}</h3>
    <div class="form-grid">
      <div class="field"><label>${tx('اسم المستخدم','Username')}</label><input id="newUserUsername" placeholder="${tx('مثال: ALI A ALHASHIM','Example: ALI A ALHASHIM')}"></div>
      <div class="field"><label>${tx('الاسم الكامل','Full Name')}</label><input id="newUserFullName" placeholder="${tx('الاسم الكامل','Full name')}"></div>
      <div class="field"><label>${tx('البريد الإلكتروني للدخول','Login Email')}</label><input id="newUserEmail" type="email" placeholder="name@example.com"></div>
      <div class="field"><label>${tx('كلمة المرور المؤقتة','Temporary Password')}</label><input id="newUserPassword" type="password" minlength="8" placeholder="${tx('8 خانات على الأقل','At least 8 characters')}"></div>
      <div class="field"><label>${tx('الدور','Role')}</label>
        <select id="newUserRole"><option value="user">${tx('مستخدم','User')}</option><option value="manager">${tx('مدير مشروع','Project Manager')}</option></select>
      </div>
      <div class="field"><label>${tx('الحالة','Status')}</label>
        <select id="newUserStatus"><option value="active">${tx('نشط','Active')}</option><option value="inactive">${tx('غير نشط','Inactive')}</option></select>
      </div>
      <div class="field"><label>${tx('رأس المال الابتدائي','Initial Capital')}</label><input id="newUserCapital" type="number" min="0" value="0"></div>
      <div class="field"><label>${tx('بداية أرقام القروض','Loan Number Start')}</label><input id="newUserLoanStart" type="number" min="1" placeholder="${tx('مثال: 9001','Example: 9001')}"></div>
    </div>
    <div id="adminUserError" class="small" style="color:#b91c1c;margin-top:8px"></div>
    <div id="adminUserSuccess" class="small" style="color:#166534;margin-top:8px"></div>
    <div class="actions"><button class="btn btn-primary" id="createUserBtn">${tx('إنشاء المستخدم','Create User')}</button></div>
  </div>`:''}

  <div class="toolbar">
    <div class="muted">${tx('المستخدمون','Users')}</div>
    <button class="btn btn-secondary" id="refreshUsersBtn">${tx('تحديث القائمة','Refresh List')}</button>
  </div>

  <div class="table-wrap"><table>
    <thead><tr><th>${tx('اسم المستخدم','Username')}</th><th>${tx('الدور','Role')}</th><th>${tx('الحالة','Status')}</th><th>${tx('رأس المال','Capital')}</th><th>${tx('بداية القروض','Loan Start')}</th><th>${tx('الإجراءات','Actions')}</th></tr></thead>
    <tbody>
      ${users.length?users.map(u=>`<tr>
        <td>${u.username}</td>
        <td>${state.lang==='en'?({'أدمن':'Admin','مدير مشروع':'Project Manager','مدير المشروع':'Project Manager','مستخدم':'User'}[u.role]||u.role):u.role}</td>
        <td><span class="status ${u.dbStatus==='active'?'active':'disabled'}">${state.lang==='en'?({'نشط':'Active','غير نشط':'Inactive'}[u.status]||u.status):u.status}</span></td>
        <td>${wholeMoney(Number(u.baseCapital||0))}</td>
        <td>${u.loanNumberStart??'—'}</td>
        <td>
          ${state.currentUser.role==='أدمن'?`
            <button class="btn btn-secondary resetPass" data-id="${u.id}">${tx('تغيير كلمة السر','Change Password')}</button>
            ${u.dbRole==='admin'?'':`
              <button class="btn ${u.dbStatus==='active'?'btn-danger':'btn-success'} toggleUserStatus" data-id="${u.id}" data-status="${u.dbStatus==='active'?'inactive':'active'}">${u.dbStatus==='active'?tx('تعطيل','Disable'):tx('تفعيل','Enable')}</button>
              <button class="btn btn-danger deleteUserBtn" data-id="${u.id}">${tx('حذف','Delete')}</button>
            `}
          `:'—'}
        </td>
      </tr>`).join(''):`<tr><td colspan="6" class="muted">${tx('لا يوجد مستخدمون.','No users found.')}</td></tr>`}
    </tbody>
  </table></div>

  <div id="adminActionModal"></div><div id="adminGlobalActionStatus" class="small" style="margin-top:10px"></div>`;
}

