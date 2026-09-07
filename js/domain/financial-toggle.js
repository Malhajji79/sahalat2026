function toggleInactiveFinancialUsers(){
  const table=document.querySelector('.admin-financial-summary');
  const btn=document.getElementById('toggleInactiveFinancialUsersBtn');
  if(!table||!btn) return;

  const hidden=[...table.querySelectorAll('.inactive-financial-user')];
  const willShow=hidden.some(el=>el.style.display==='none' || getComputedStyle(el).display==='none');

  hidden.forEach(el=>el.style.display=willShow?'table-cell':'none');
  btn.textContent=willShow?tx('إخفاء المستخدمين غير النشطين','Hide Inactive Users'):tx('إظهار المستخدمين غير النشطين','Show Inactive Users');
  btn.setAttribute('aria-expanded',willShow?'true':'false');

  convertVisibleDigitsToArabic(table);
}

