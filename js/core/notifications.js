// Decisions are read from existing records. Dismissal is local to this browser/user.
let decisionUserId=null;
let decisionTimer=null;
let decisionBusy=false;
let decisionEpoch=0;
let decisionRows=[];
let dismissedDecisions=new Set();
function decisionStorageKey(){return 'sahalat_decisions_dismissed_v1:'+SUPABASE_URL+':'+String(state.currentUser?.id||'');}
function decisionEscape(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function decisionItems(){
  const uid=String(state.currentUser?.id||'');
  if(!uid || state.currentUser.role==='أدمن') return [];
  const items=new Map();
  const addLoan=l=>{
    if(![l.createdById,l.assignedUserId].some(id=>id!=null&&String(id)===uid))return;
    const rejected=l.dbStatus==='rejected'||l.status==='مرفوض';
    const approved=!rejected&&!!l.approvedAt;
    if(!rejected&&!approved)return;
    const id=String(l.dbId||l.id),time=(rejected?l.rejectedAt:l.approvedAt)||'';
    items.set('loan:'+id,{key:JSON.stringify(['loan',id,rejected?'rejected':'approved',time]),kind:'loan',loan:l.id||'—',rejected,reason:l.rejectReason||'',time});
  };
  const addReview=r=>{
    if(String(r.requestedById)!==uid||!['approved','rejected'].includes(r.status))return;
    const loan=state.loans.find(l=>String(l.dbId)===String(r.loanDbId));
    const id=String(r.dbId||r.id),time=r.reviewedAt||'';
    items.set('review:'+id,{key:JSON.stringify(['review',id,r.status,time]),kind:'review',loan:r.loanNumber||loan?.id||'—',rejected:r.status==='rejected',reason:r.reviewNote||'',time});
  };
  (state.loans||[]).forEach(addLoan);(state.repaymentRequests||[]).forEach(addReview);
  decisionRows.forEach(r=>r.kind==='loan'?addLoan(r.data):addReview(r.data));
  const now=Date.now();
  const oldest=now-7*24*60*60*1000;
  return [...items.values()]
    .filter(n=>{const time=Date.parse(n.time);return Number.isFinite(time)&&time>=oldest&&time<=now&&!dismissedDecisions.has(n.key);})
    .sort((a,b)=>Date.parse(b.time)-Date.parse(a.time))
    .slice(0,5);
}
function renderDecisionNotifications(){
  let host=document.getElementById('decisionNotifications');
  if(!state.currentUser||state.currentUser.role==='أدمن'){host?.remove();return;}
  const main=document.querySelector('#app .main');if(!main)return;
  if(!host){host=document.createElement('section');host.id='decisionNotifications';host.setAttribute('aria-live','polite');main.insertBefore(host,document.getElementById('content'));}
  const items=decisionItems();
  host.innerHTML=items.length?`<h3>${tx('إشعارات القرارات الأخيرة','Recent Decision Notifications')}</h3>`+items.map(n=>{
    const subject=n.kind==='loan'?tx('القرض','Loan'):tx('مراجعة فترة السداد للقرض','Repayment review for loan');
    return `<div class="decision-notice ${n.rejected?'decision-rejected':'decision-approved'}"><div><strong>${n.rejected?tx('تم رفض','Rejected:'):tx('تمت الموافقة على','Approved:')} ${subject} ${decisionEscape(n.loan)}</strong>${n.rejected?`<p>${tx('سبب الرفض','Rejection reason')}: ${decisionEscape(n.reason||tx('لم يُسجل سبب للرفض.','No rejection reason was recorded.'))}</p>`:''}${n.time?`<div class="small">${decisionEscape(dateInputText(n.time))}</div>`:''}</div><button class="btn btn-secondary" type="button" data-dismiss-decision="${decisionEscape(n.key)}">${tx('إغلاق الإشعار','Dismiss')}</button></div>`;
  }).join(''):'';
  host.hidden=!items.length;
  host.querySelectorAll('[data-dismiss-decision]').forEach(button=>button.onclick=()=>{
    dismissedDecisions.add(button.dataset.dismissDecision);
    try{localStorage.setItem(decisionStorageKey(),JSON.stringify([...dismissedDecisions]));}catch(e){/* Keep dismissal in memory when storage is unavailable. */}
    renderDecisionNotifications();
  });
}
function stopDecisionNotifications(){
  if(decisionTimer)clearInterval(decisionTimer);
  decisionTimer=null;decisionUserId=null;decisionRows=[];dismissedDecisions=new Set();decisionBusy=false;decisionEpoch++;
  document.getElementById('decisionNotifications')?.remove();
}
async function pollDecisionNotifications(){
  if(decisionBusy||!state.currentUser||state.currentUser.role==='أدمن'||document.hidden)return;
  const uid=String(state.currentUser.id),epoch=decisionEpoch;decisionBusy=true;
  try{
    const readPages=async build=>{const rows=[];for(let from=0;;from+=1000){const {data,error}=await build().range(from,from+999);if(error)throw error;const page=data||[];rows.push(...page);if(page.length<1000)return rows;}};
    const [loans,reviews]=await Promise.all([
      readPages(()=>supabaseClient.from('loans').select('id,loan_number,status,created_by,assigned_user_id,approved_at,rejected_at,rejection_reason,updated_at').or(`created_by.eq.${uid},assigned_user_id.eq.${uid}`).order('id',{ascending:true})),
      readPages(()=>supabaseClient.from('repayment_period_requests').select('id,loan_id,requested_by,status,review_note,reviewed_at').eq('requested_by',uid).in('status',['approved','rejected']).order('id',{ascending:true}))
    ]);
    if(epoch!==decisionEpoch||uid!==String(state.currentUser?.id))return;
    const loanNames=new Map(loans.map(l=>[String(l.id),String(l.loan_number)]));
    decisionRows=[...loans.map(l=>({kind:'loan',data:{dbId:l.id,id:String(l.loan_number),dbStatus:l.status,createdById:l.created_by,assignedUserId:l.assigned_user_id,approvedAt:l.approved_at,rejectedAt:l.rejected_at,rejectReason:l.rejection_reason,updatedAt:l.updated_at}})),...reviews.map(r=>({kind:'review',data:{id:r.id,loanDbId:r.loan_id,requestedById:r.requested_by,status:r.status,reviewNote:r.review_note,reviewedAt:r.reviewed_at,loanNumber:loanNames.get(String(r.loan_id))}}))];
    // Remove rejected requests from an already-open pending list without resetting filters or forms.
    const rejectedIds=new Set(loans.filter(l=>l.status==='rejected').map(l=>String(l.loan_number)));
    loans.filter(l=>l.status==='rejected').forEach(row=>{
      const local=state.loans.find(l=>String(l.dbId)===String(row.id));
      if(local){local.status='مرفوض';local.dbStatus='rejected';local.rejectReason=row.rejection_reason||'';local.rejectedAt=row.rejected_at;}
    });
    document.querySelectorAll('#otherLoansBody tr[data-loan-id]').forEach(row=>{if(rejectedIds.has(row.dataset.loanId))row.remove();});
    const pendingBody=document.getElementById('otherLoansBody');
    if(pendingBody){const count=pendingBody.querySelectorAll('tr[data-loan-id]').length;const label=document.getElementById('otherLoansCount');if(label)label.textContent=`(${count})`;if(!count)document.getElementById('otherLoansSection')?.remove();}
    renderDecisionNotifications();
  }catch(e){/* Existing loaded decisions remain available; retry on the next interval. */}
  finally{if(epoch===decisionEpoch)decisionBusy=false;}
}
function startDecisionNotifications(){
  if(!state.currentUser||state.currentUser.role==='أدمن'){stopDecisionNotifications();return;}
  const uid=String(state.currentUser.id);
  if(decisionUserId!==uid){
    stopDecisionNotifications();decisionUserId=uid;
    try{const saved=JSON.parse(localStorage.getItem(decisionStorageKey())||'[]');dismissedDecisions=new Set(Array.isArray(saved)?saved:[]);}catch(e){dismissedDecisions=new Set();}
    renderDecisionNotifications();
    decisionTimer=setInterval(pollDecisionNotifications,30000);
    pollDecisionNotifications();
  }else renderDecisionNotifications();
}
