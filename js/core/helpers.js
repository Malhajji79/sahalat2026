const I18N = {
  ar: {
    appName:'سهالات',
    tagline:'إدارة القروض والتحصيل ... بكل سهولة',
    login:'تسجيل الدخول', username:'اسم المستخدم', password:'كلمة المرور',
    chooseUser:'اختر المستخدم', noUsers:'لا توجد أسماء محملة', passwordPlaceholder:'أدخل كلمة المرور',
    reloadUsers:'إعادة تحميل الأسماء', loading:'جاري التحميل...', loggingIn:'جاري تسجيل الدخول...',
    loginRequired:'اختر اسم المستخدم وأدخل كلمة المرور.', loginFailed:'فشل تسجيل الدخول.',
    loadUsersFailed:'تعذر تحميل قائمة المستخدمين.', unknownError:'خطأ غير معروف',
    dashboard:'الرئيسية', loans:'القروض', newLoan:'قرض جديد', payments:'سجل الدفعات', analytics:'لوحة التحليلات',
    collectionYears:'السنوات التحصيلية', accounts:'حسابات المستخدمين', capitalMovements:'حركة رأس المال',
    annualSettlement:'تصفية أرباح', administration:'الإدارة', logout:'تسجيل الخروج', refresh:'تحديث البيانات',
    refreshing:'جاري التحديث...', refreshFailed:'تعذر تحديث البيانات.',
    loanDetails:'تفاصيل القرض', loanApproval:'مراجعة واعتماد القرض', recordPayment:'تسجيل دفعة',
    editPayment:'تعديل الدفعة', deletePayment:'حذف الدفعة', repaymentPeriod:'مراجعة فترة السداد',
    addNewLoan:'إضافة قرض جديد', language:'English', languageTitle:'Switch to English'
  },
  en: {
    appName:'Sahalat',
    tagline:'Loan and collection management ... made simple',
    login:'Log In', username:'Username', password:'Password',
    chooseUser:'Select user', noUsers:'No users loaded', passwordPlaceholder:'Enter password',
    reloadUsers:'Reload Users', loading:'Loading...', loggingIn:'Signing in...',
    loginRequired:'Select a username and enter the password.', loginFailed:'Login failed.',
    loadUsersFailed:'Unable to load the user list.', unknownError:'Unknown error',
    dashboard:'Home', loans:'Loans', newLoan:'New Loan', payments:'Payments', analytics:'Analytics',
    collectionYears:'Collection Years', accounts:'User Accounts', capitalMovements:'Capital Movements',
    annualSettlement:'Profit Settlement', administration:'Administration', logout:'Log Out', refresh:'Refresh Data',
    refreshing:'Refreshing...', refreshFailed:'Unable to refresh data.',
    loanDetails:'Loan Details', loanApproval:'Review & Approve Loan', recordPayment:'Record Payment',
    editPayment:'Edit Payment', deletePayment:'Delete Payment', repaymentPeriod:'Review Repayment Period',
    addNewLoan:'Add New Loan', language:'العربية', languageTitle:'التبديل إلى العربية'
  }
};

function t(key){ return I18N[state.lang]?.[key] ?? I18N.ar[key] ?? key; }
function tx(ar,en){ return state.lang==='en' ? en : ar; }
function displayLoanStatus(v){ const m={'نشط':'Active','مغلق':'Closed','بانتظار موافقة الأدمن':'Awaiting Admin Approval','بانتظار الاعتماد':'Awaiting Approval','مرفوض':'Rejected','معتمد':'Approved'}; if(state.lang!=='en') return v; return m[v] || (String(v||'').includes('بانتظار')?'Awaiting Action':v); }
function displayLoanType(v){ const m={'عادي':'Normal','مجاني':'Free','دراسة':'Study','تكييف':'AC','Normal':'Normal','Free':'Free','Study':'Study','AC':'AC'}; return state.lang==='en'?(m[v]||v):v; }
function localeCode(){ return state.lang==='en'?'en-US':'ar-SA'; }
function applyLanguageDocument(){
  const isEn=state.lang==='en';
  document.documentElement.lang=isEn?'en':'ar';
  document.documentElement.dir=isEn?'ltr':'rtl';
  document.body?.setAttribute('dir',isEn?'ltr':'rtl');
}

function languageSwitchButton(extraClass=''){
  return html`<button class="btn btn-secondary ${extraClass}" type="button" data-language-switch title="${t('languageTitle')}">🌐 ${t('language')}</button>`;
}

const SAHALAT_UI_EN = new Map([
  ['ابحث برقم القرض','Search by loan number'],
  ['عرض جميع الدفعات','Show all payments'],
  ['هذا سجل Log للدفعات. كل دفعة تحفظ باسم المستخدم ووقت التسجيل ولا تُحذف من السجل. وعند سداد كامل المتبقي، يُغلق القرض تلقائياً بعد احتساب مستحق التصفية.','This is the payment log. Each payment keeps the username and recording date and is not removed from the log. When the full remaining balance is paid, the loan closes automatically after calculating the final settlement due.'],
  ['مبلغ الدفعة','Payment Amount'],
  ['مسجل بواسطة','Recorded By'],
  ['التاريخ والوقت','Date'],
  ['ملاحظة','Note'],
  ['إجمالي المبالغ المقرضة','Total Amount Lent'],
  ['إجمالي المبالغ المحصلة','Total Amount Collected'],
  ['متوسط فعالية المستخدمين','Average User Effectiveness'],
  ['عدد المستخدمين','Number of Users'],
  ['نمو القروض حسب السنة التحصيلية','Loan Growth by Collection Year'],
  ['سنوي','Annual'],
  ['نصف سنوي','Semiannual'],
  ['ترتيب فعالية المستخدمين','User Effectiveness Ranking'],
  ['الترتيب','Rank'],
  ['المستخدم','User'],
  ['مؤشر الفعالية','Effectiveness Score'],
  ['التحصيل / المتوقع (6 أشهر)','Collected / Expected (6 Months)'],
  ['نسبة إغلاق القروض','Loan Closure Rate'],
  ['إجمالي المقرض','Total Lent'],
  ['جدول السنوات التحصيلية','Collection Years Schedule'],
  ['تحديث البيانات','Refresh Data'],
  ['التسلسل','Sequence'],
  ['السنة التحصيلية','Collection Year'],
  ['تبدأ من','Starts'],
  ['تنتهي في','Ends'],
  ['حفظ','Save'],
  ['مثبتة','Locked'],
  ['مقفلة','Locked'],
  ['الفائدة المتوقعة بنهاية السنة التحصيلية','Expected Interest at Collection-Year End'],
  ['توزيع حصة المستخدم وحصة المالك على تواريخ الاستحقاق الشهرية الفعلية حسب قاعدة يوم ٢٥/٢٦.','User and owner shares are distributed across actual monthly due dates according to the 25/26-day rule.'],
  ['حصة المستخدمين المتوقعة','Expected User Share'],
  ['حصة المالك المتوقعة','Expected Owner Share'],
  ['إجمالي الفائدة المتوقعة','Total Expected Interest'],
  ['عدد الاستحقاقات','Number of Installments'],

['إجمالي المبالغ المقرضة','Total Amount Lent'],['إجمالي المبالغ المحصلة','Total Amount Collected'],['متوسط فعالية المستخدمين','Average User Effectiveness'],['عدد المستخدمين','Number of Users'],['نمو القروض حسب السنة التحصيلية','Loan Growth by Collection Year'],['سنوي','Annual'],['نصف سنوي','Semiannual'],['ترتيب فعالية المستخدمين','User Effectiveness Ranking'],['الترتيب','Rank'],['المستخدم','User'],['مؤشر الفعالية','Effectiveness Score'],['التحصيل / المتوقع (6 أشهر)','Collected / Expected (6 Months)'],['نسبة إغلاق القروض','Loan Closure Rate'],['إجمالي المقرض','Total Lent'],['توزيع المحفظة النشطة بين المستخدمين','Active Portfolio Distribution by User'],['نسبة كل مستخدم من إجمالي مبالغ القروض النشطة.','Each user’s share of total active-loan amounts.'],['مقارنة مؤشر الفعالية','Effectiveness Score Comparison'],['مقارنة مرئية سريعة لأداء المستخدمين وفق التحصيل والإغلاق والنشاط.','Quick visual comparison of user performance based on collections, closures, and activity.'],['مؤشرات إدارية مقترحة','Suggested Management Indicators'],['أعلى فعالية','Highest Effectiveness'],['أعلى تحصيل آخر 6 أشهر','Highest Collections – Last 6 Months'],['أكبر محفظة نشطة','Largest Active Portfolio'],['أعلى نسبة إغلاق','Highest Closure Rate'],['جدول السنوات التحصيلية','Collection Years Schedule'],['تحديث البيانات','Refresh Data'],['التسلسل','Sequence'],['السنة التحصيلية','Collection Year'],['تبدأ من','Starts'],['تنتهي في','Ends'],['حفظ','Save'],['مثبتة','Locked'],['الفائدة المتوقعة حسب السنة التحصيلية','Expected Interest by Collection Year'],['حصة المستخدم المتوقعة','Expected User Share'],['حصة المالك المتوقعة','Expected Owner Share'],['إجمالي الفائدة المتوقعة','Total Expected Interest'],['عدد الأقساط','Installment Count'],['عدد القروض','Loan Count'],['الحسابات ذات السجلات المالية لا تُحذف؛ يتم تعطيلها بدلًا من ذلك.','Accounts with financial records cannot be deleted; they are disabled instead.'],['الحد الأعلى للقرض','Maximum Loan Amount'],['الحد الأعلى للمدة','Maximum Term'],['حصة المستخدم','User Share'],['حصة المالك','Owner Share'],['كلمة مرور المالك','Owner Password'],['هذا الخيار يغيّر كلمة مرور حساب الأدمن الحالي فقط.','This option changes the password of the current admin account only.'],['كلمة المرور الجديدة','New Password'],['تأكيد كلمة المرور الجديدة','Confirm New Password'],['تغيير الرقم السري للمالك','Change Owner Password'],['إضافة مستخدم جديد','Add New User'],['اسم المستخدم','Username'],['الاسم الكامل','Full Name'],['البريد الإلكتروني للدخول','Login Email'],['كلمة المرور المؤقتة','Temporary Password'],['الدور','Role'],['رأس المال الابتدائي','Initial Capital'],['بداية أرقام القروض','Loan Number Start'],['إنشاء المستخدم','Create User'],['المستخدمون','Users'],['تحديث القائمة','Refresh List'],['رأس المال','Capital'],['بداية القروض','Loan Start'],['الإجراءات','Actions'],['تغيير كلمة السر','Change Password'],['تعطيل','Disable'],['تفعيل','Enable'],['لا يوجد مستخدمون.','No users found.'],['مستخدم','User'],['مدير مشروع','Project Manager'],['أدمن','Admin'],['نشط','Active'],['غير نشط','Inactive'],['الإجراء','Action'],
['لوحة مقارنة إدارية. التحليلات السنوية ونصف السنوية مبنية على حدود السنوات التحصيلية المعتمدة. مؤشر الفعالية يعطي الوزن الأكبر للتحصيل الفعلي مقارنة بالتحصيل المتوقع خلال آخر 6 أشهر.','Administrative comparison dashboard. Annual and semiannual analytics are based on approved collection-year boundaries. The effectiveness score gives the greatest weight to actual versus expected collections over the last 6 months.'],
['السنة التحصيلية هي المرجع الرسمي للتحليلات السنوية في سهالات. تاريخ استحقاق القسط المعتمد هو يوم ٥ من نهاية فترة التحصيل، والقروض النشطة والمغلقة تدخل في حساب الفائدة المتوقعة.','The collection year is Sahalat’s official reference for annual analytics. The approved installment due date is the 5th at the end of the collection period, and active and closed loans are included in expected-interest calculations.'],
['السنوات التحصيلية المنتهية مثبتة. السنة الحالية والسنوات المستقبلية التي لديها أقساط متوقعة تظهر تلقائياً، مع بقاء تاريخ البداية والنهاية قابلين للتعديل. التواريخ مأخوذة كما هي من جدول السنوات التحصيلية المعتمد.','Completed collection years are locked. The current year and future years with expected installments appear automatically, while start and end dates remain editable. Dates are read directly from the approved collection-years table.']
]);
function translateRemainingUi(root=document.getElementById('app')){
 if(state.lang!=='en'||!root)return;
 const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[]; while(w.nextNode())nodes.push(w.currentNode);
 nodes.forEach(n=>{const raw=n.nodeValue,t=raw.trim();if(!t)return;let v=SAHALAT_UI_EN.get(t);if(!v)return; n.nodeValue=(raw.match(/^\s*/)?.[0]||'')+v+(raw.match(/\s*$/)?.[0]||'');});
}

;
function latinDigits(v){
  return String(v ?? '')
    .replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}
function arNum(v){
  const str=String(v ?? '');
  return state.lang==='en' ? latinDigits(str) : str.replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[d]);
}
function money(n){
  const formatted=new Intl.NumberFormat(state.lang==='en'?'en-US-u-nu-latn':'ar-SA-u-nu-arab',{maximumFractionDigits:2}).format(n||0);
  return state.lang==='en' ? `${latinDigits(formatted)} SAR` : formatted;
}
function whole(n){ return Math.floor(Number(n||0)); }
function wholeMoney(n){
  const formatted=new Intl.NumberFormat(state.lang==='en'?'en-US-u-nu-latn':'ar-SA-u-nu-arab',{maximumFractionDigits:0}).format(whole(n));
  return state.lang==='en' ? `${latinDigits(formatted)} SAR` : formatted;
}
function plainWholeNumber(n){
  const formatted=new Intl.NumberFormat(state.lang==='en'?'en-US-u-nu-latn':'ar-SA-u-nu-arab',{maximumFractionDigits:0}).format(whole(n));
  return state.lang==='en' ? latinDigits(formatted) : formatted;
}
function percentDisplay(n, digits=2){
  const v=Number(n||0).toFixed(digits)+'%';
  return state.lang==='en' ? latinDigits(v) : arNum(v);
}
function fractionPart(n){ return Math.max(0, Number(n||0) - whole(n)); }

function toArabicDigitsText(value){
  return String(value??'').replace(/[0-9]/g,d=>'٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

function convertVisibleDigitsToArabic(root=document){
  const target=root?.nodeType ? root : document;
  const walker=document.createTreeWalker(
    target,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node){
        const parent=node.parentElement;
        if(!parent) return NodeFilter.FILTER_REJECT;
        const tag=parent.tagName;
        if(['SCRIPT','STYLE','TEXTAREA','INPUT','SELECT','OPTION'].includes(tag)) return NodeFilter.FILTER_REJECT;
        if(!/[0-9]/.test(node.nodeValue||'')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );
  const nodes=[];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    const next=toArabicDigitsText(node.nodeValue);
    if(next!==node.nodeValue) node.nodeValue=next;
  });
}

function styleEnglishSarUnits(root=document.getElementById('app')){
  if(state.lang!=='en' || !root) return;
  const walker=document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node){
        const parent=node.parentElement;
        if(!parent) return NodeFilter.FILTER_REJECT;
        if(parent.closest('.sar-unit')) return NodeFilter.FILTER_REJECT;
        if(['SCRIPT','STYLE','TEXTAREA','INPUT','SELECT','OPTION'].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
        return /\bSAR\b/.test(node.nodeValue||'') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    }
  );
  const nodes=[];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    const text=node.nodeValue||'';
    const parts=text.split(/(\bSAR\b)/g);
    if(parts.length<2) return;
    const frag=document.createDocumentFragment();
    parts.forEach(part=>{
      if(part==='SAR'){
        const span=document.createElement('span');
        span.className='sar-unit';
        span.textContent='SAR';
        frag.appendChild(span);
      }else if(part){
        frag.appendChild(document.createTextNode(part));
      }
    });
    node.replaceWith(frag);
  });
}

;
function todayISO(){ return new Date().toISOString().slice(0,10); }
const DATE_MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function dateDisplay(value){
  if(!value) return '—';
  let d,m,y;
  const raw=String(value);
  const iso=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(iso){ y=Number(iso[1]); m=Number(iso[2]); d=Number(iso[3]); }
  else{
    const dt=new Date(value);
    if(Number.isNaN(dt.getTime())) return raw;
    y=dt.getFullYear(); m=dt.getMonth()+1; d=dt.getDate();
  }
  const formatted=`${String(d).padStart(2,'0')}-${DATE_MONTHS[m-1]}-${String(y).slice(-2)}`;
  // نعزل التاريخ باتجاه LTR حتى لا يعيد RTL ترتيب اليوم/الشهر/السنة بصريًا.
  return `\u2066${formatted}\u2069`;
}
function dateTimeDisplay(value){
  // في سهالات نعرض التاريخ فقط حتى للحقول المخزنة مع وقت.
  return dateDisplay(value);
}
function dateInputText(value){
  const shown=dateDisplay(value||'');
  return shown==='—' ? '' : shown.replace(/[\u2066\u2069]/g,'');
}
function customDateInput(id,value='',options={}){
  const safeValue=String(value||'').slice(0,10);
  const pickerLabel=state.lang==='en' ? 'Choose date' : 'اختر التاريخ';
  return html`<span class="custom-date-input">
    <input class="date-display" type="text" value="${dateInputText(safeValue)}" readonly aria-label="${pickerLabel}" onclick="openCustomDatePicker(this)">
    <input id="${id}" type="date" value="${safeValue}" data-id="${options.dataId??''}" class="date-native ${options.className==='collectionStartDate'?'collectionStartDate':options.className==='collectionEndDate'?'collectionEndDate':''}" onchange="syncCustomDateInput(this)" aria-label="${pickerLabel}">
    <button type="button" class="date-picker-btn" aria-label="${pickerLabel}" onclick="openCustomDatePicker(this)">📅</button>
  </span>`;
}

function isoFromParts(y,m,d){
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function parseISODateParts(v){
  const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? {y:+m[1],m:+m[2],d:+m[3]} : null;
}

function renderSahalatCalendar(){
  const st=sahalatCalendarState, popup=document.getElementById('sahalatCalendarPopup');
  if(!st||!popup) return;
  const months=state.lang==='en'
    ? ['January','February','March','April','May','June','July','August','September','October','November','December']
    : ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const week=state.lang==='en'?['Su','Mo','Tu','We','Th','Fr','Sa']:['ح','ن','ث','ر','خ','ج','س'];
  const first=new Date(st.year,st.month-1,1).getDay();
  const days=new Date(st.year,st.month,0).getDate();
  const selected=st.input.value;
  const min=st.input.min||'';
  const max=st.input.max||'';
  const cells=[];
  for(let i=0;i<first;i++) cells.push(html`<div class="sahalat-calendar-empty"></div>`);
  for(let d=1;d<=days;d++){
    const iso=isoFromParts(st.year,st.month,d);
    const disabled=(min&&iso<min)||(max&&iso>max);
    cells.push(html`<button type="button" class="sahalat-calendar-day${iso===selected?' is-selected':''}" ${disabled?'disabled':''} data-calendar-date="${iso}">${d}</button>`);
  }
  popup.innerHTML=html`
    <div class="sahalat-calendar-head">
      <button type="button" class="sahalat-calendar-nav" onclick="shiftSahalatCalendarMonth(-1)" aria-label="Previous month">‹</button>
      <div class="sahalat-calendar-title">${months[st.month-1]} ${st.year}</div>
      <button type="button" class="sahalat-calendar-nav" onclick="shiftSahalatCalendarMonth(1)" aria-label="Next month">›</button>
    </div>
    <div class="sahalat-calendar-week">${htmlJoin(week.map(x=>html`<div>${x}</div>`))}</div>
    <div class="sahalat-calendar-grid">${htmlJoin(cells)}</div>`;
  popup.querySelectorAll('[data-calendar-date]').forEach(button=>button.onclick=()=>selectSahalatCalendarDate(button.dataset.calendarDate));
}
function syncCustomDateInput(input){
  const wrap=input?.closest?.('.custom-date-input');
  const display=wrap?.querySelector?.('.date-display');
  if(display) display.value=dateInputText(input.value);
}

function collectionDateDisplay(value){ return dateDisplay(value); }
