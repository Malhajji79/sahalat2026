let sahalatCalendarState=null;
function closeSahalatCalendar(){
  document.getElementById('sahalatCalendarPopup')?.remove();
  sahalatCalendarState=null;
}
function openCustomDatePicker(el){
  const wrap=el?.closest?.('.custom-date-input');
  const input=wrap?.querySelector?.('.date-native');
  if(!input) return;
  closeSahalatCalendar();
  const selected=parseISODateParts(input.value) || (()=>{const n=new Date();return {y:n.getFullYear(),m:n.getMonth()+1,d:n.getDate()};})();
  sahalatCalendarState={input,wrap,year:selected.y,month:selected.m};
  const popup=document.createElement('div');
  popup.id='sahalatCalendarPopup';
  popup.className='sahalat-calendar';
  document.body.appendChild(popup);
  renderSahalatCalendar();
  const r=wrap.getBoundingClientRect();
  const pr=popup.getBoundingClientRect();
  let left=Math.min(Math.max(12,r.left),window.innerWidth-pr.width-12);
  let top=r.bottom+6;
  if(top+pr.height>window.innerHeight-12) top=Math.max(12,r.top-pr.height-6);
  popup.style.left=`${left}px`;
  popup.style.top=`${top}px`;
  setTimeout(()=>document.addEventListener('pointerdown',sahalatCalendarOutside,true),0);
}
function sahalatCalendarOutside(e){
  const popup=document.getElementById('sahalatCalendarPopup');
  if(!popup) return document.removeEventListener('pointerdown',sahalatCalendarOutside,true);
  if(popup.contains(e.target) || sahalatCalendarState?.wrap?.contains(e.target)) return;
  closeSahalatCalendar();
  document.removeEventListener('pointerdown',sahalatCalendarOutside,true);
}
function shiftSahalatCalendarMonth(delta){
  if(!sahalatCalendarState) return;
  let m=sahalatCalendarState.month+delta, y=sahalatCalendarState.year;
  if(m<1){m=12;y--;} if(m>12){m=1;y++;}
  sahalatCalendarState.month=m; sahalatCalendarState.year=y;
  renderSahalatCalendar();
}
function selectSahalatCalendarDate(iso){
  const input=sahalatCalendarState?.input;
  if(!input) return;
  input.value=iso;
  input.dispatchEvent(new Event('change',{bubbles:true}));
  closeSahalatCalendar();
  document.removeEventListener('pointerdown',sahalatCalendarOutside,true);
}
