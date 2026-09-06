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
function customDateInput(id,value='',extraAttrs=''){
  const safeValue=String(value||'').slice(0,10);
  const pickerLabel=state.lang==='en' ? 'Choose date' : 'اختر التاريخ';
  return `<span class="custom-date-input">
    <input class="date-display" type="text" value="${dateInputText(safeValue)}" readonly aria-label="${pickerLabel}" onclick="openCustomDatePicker(this)">
    <input id="${id}" type="date" value="${safeValue}" ${extraAttrs} class="date-native" onchange="syncCustomDateInput(this)" aria-label="${pickerLabel}">
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
  let cells='';
  for(let i=0;i<first;i++) cells+='<div class="sahalat-calendar-empty"></div>';
  for(let d=1;d<=days;d++){
    const iso=isoFromParts(st.year,st.month,d);
    const disabled=(min&&iso<min)||(max&&iso>max);
    cells+=`<button type="button" class="sahalat-calendar-day${iso===selected?' is-selected':''}" ${disabled?'disabled':''} onclick="selectSahalatCalendarDate('${iso}')">${d}</button>`;
  }
  popup.innerHTML=`
    <div class="sahalat-calendar-head">
      <button type="button" class="sahalat-calendar-nav" onclick="shiftSahalatCalendarMonth(-1)" aria-label="Previous month">‹</button>
      <div class="sahalat-calendar-title">${months[st.month-1]} ${st.year}</div>
      <button type="button" class="sahalat-calendar-nav" onclick="shiftSahalatCalendarMonth(1)" aria-label="Next month">›</button>
    </div>
    <div class="sahalat-calendar-week">${week.map(x=>`<div>${x}</div>`).join('')}</div>
    <div class="sahalat-calendar-grid">${cells}</div>`;
}
function syncCustomDateInput(input){
  const wrap=input?.closest?.('.custom-date-input');
  const display=wrap?.querySelector?.('.date-display');
  if(display) display.value=dateInputText(input.value);
}

function collectionDateDisplay(value){ return dateDisplay(value); }
