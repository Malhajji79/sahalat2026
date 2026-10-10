function toggleLanguage(){
  state.lang=state.lang==='ar'?'en':'ar';
  localStorage.setItem('sahalat_lang',state.lang);
  // مراقب تحويل الأرقام إلى العربية يجب أن يعمل في العربية فقط.
  // عند الانتقال للإنجليزية نوقفه فورًا حتى لا يعيد تحويل الأرقام بعد إعادة الرسم.
  if(state.lang==='en'){ disableArabicDigitRendering(); } else { disableEnglishSarStyling(); }
  applyLanguageDocument();
  render();
}
function bindLanguageSwitch(){
  document.querySelectorAll('[data-language-switch]').forEach(btn=>{
    btn.onclick=toggleLanguage;
  });
}


;
function bindAnalytics(){
  for(const key of ['Year','Compare','User','Type','Sort']){
    document.getElementById('analytics'+key)?.addEventListener('change',e=>{
      state['analytics'+key]=e.target.value;state.analyticsAging=null;render();
    });
  }
  const details=()=>{render();const el=document.getElementById('analyticsDetails');el?.scrollIntoView({block:'start'});el?.focus({preventScroll:true});};
  document.querySelectorAll('[data-analytics-detail]').forEach(b=>b.onclick=()=>{state.analyticsDetail=b.dataset.analyticsDetail;state.analyticsAging=null;details();});
  document.querySelectorAll('[data-analytics-aging]').forEach(b=>b.onclick=()=>{state.analyticsDetail='overdue';state.analyticsAging=Number(b.dataset.analyticsAging);details();});
  document.querySelectorAll('[data-analytics-user]').forEach(b=>b.onclick=()=>{state.analyticsUser=b.dataset.analyticsUser;state.analyticsAging=null;render();});
  document.querySelectorAll('[data-analytics-loan]').forEach(b=>b.onclick=()=>{state.selectedLoanId=b.dataset.analyticsLoan;state.page='loan-details';render();});
}



;
function bindEarlyReviews(){
  document.querySelectorAll('.openRepaymentReviewBtn').forEach(b=>b.onclick=()=>{
    state.selectedRepaymentRequestId=b.dataset.requestId;
    state.selectedLoanId=b.dataset.loanId;
    state.page='repayment-period-admin-review';
    render();
  });
}


;
function bindLoanActions(){
  document.querySelectorAll('.reviewLoan').forEach(b=>b.onclick=()=>{
    state.selectedLoanId=b.dataset.id;
    state.page='loan-approval';
    render();
  });

  document.querySelectorAll('.payLoan').forEach(b=>b.onclick=()=>{
    state.selectedLoanId=b.dataset.id;
    state.page='record-payment';
    render();
  });

  document.querySelectorAll('.openLoan').forEach(b=>b.onclick=()=>{
    state.selectedLoanId=b.dataset.id;
    state.page='loan-details';
    render();
  });
}




;
function bindPaymentsFilters(){
  const loanInput=document.getElementById('paymentLoanFilter');
  const dateInput=document.getElementById('paymentDateFilter');
  const recorderInput=document.getElementById('paymentRecorderFilter');
  const clearBtn=document.getElementById('clearPaymentFilters');
  const body=document.getElementById('paymentsTableBody');
  const countKpi=document.getElementById('paymentsCountKpi');
  const totalKpi=document.getElementById('paymentsTotalKpi');
  const summary=document.getElementById('paymentsFilterSummary');
  if(!loanInput||!dateInput||!recorderInput||!body) return;

  const allRows=paymentLogRows();
  const results=document.getElementById('paymentsResults');
  let showAll=false;

  const apply=()=>{
    const loan=loanInput.value.trim();
    const date=dateInput.value;
    const recorder=recorderInput.value;

    const active=!!(loan||date||recorder);
    const visible=showAll||active;
    if(results) results.hidden=!visible;
    const filtered=visible?allRows.filter(r=>{
      const loanOk=!loan || String(r.loanId).includes(loan);
      const dateOk=!date || paymentFilterDate(r)===date;
      const recorderOk=!recorder || r.by===recorder;
      return loanOk&&dateOk&&recorderOk;
    }):[];

    body.innerHTML=paymentsTableRows(filtered);
    countKpi.textContent=String(filtered.length);
    totalKpi.textContent=wholeMoney(filtered.reduce((s,r)=>s+Number(r.amount||0),0));
    summary.textContent=!visible ? tx('اختر فلترًا لعرض الدفعات أو اضغط إظهار الجميع.','Choose a filter to view payments, or select Show All.') : (loan||date||recorder)
      ? `${tx('النتائج المطابقة','Matching results')}: ${arNum(filtered.length)} ${tx('من','of')} ${arNum(allRows.length)} ${tx('دفعة','payments')}`
      : `${tx('عرض جميع الدفعات','Show all payments')}: ${arNum(allRows.length)}`;
  };

  const filterChanged=()=>{showAll=false;apply();};
  loanInput.addEventListener('input',filterChanged);
  dateInput.addEventListener('change',filterChanged);
  recorderInput.addEventListener('change',filterChanged);
  clearBtn.onclick=()=>{
    loanInput.value='';
    dateInput.value='';
    recorderInput.value='';
    showAll=false;
    syncCustomDateInput(dateInput);
    apply();
  };
  document.getElementById('showAllPayments').onclick=()=>{
    loanInput.value='';dateInput.value='';recorderInput.value='';
    syncCustomDateInput(dateInput);showAll=true;apply();
  };
  apply();
}



;
function setupSahalatMobileNav(){
  const sidebar=document.getElementById('sahalatSidebar');
  const trigger=document.getElementById('mobileNavTrigger');
  const close=document.getElementById('mobileNavClose');
  const backdrop=document.getElementById('mobileNavBackdrop');
  if(!sidebar||!trigger)return;
  const setOpen=open=>{
    document.body.classList.toggle('sahalat-nav-open',open);
    trigger.setAttribute('aria-expanded',String(open));
  };
  trigger.onclick=()=>setOpen(!document.body.classList.contains('sahalat-nav-open'));
  if(close)close.onclick=()=>setOpen(false);
  if(backdrop)backdrop.onclick=()=>setOpen(false);
  sidebar.querySelectorAll('[data-page],#logoutBtn').forEach(b=>b.addEventListener('click',()=>setOpen(false)));
  document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false)},{once:false});
}
function bindNav(){
  setupSahalatMobileNav();
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render();});
  const refreshBtn=document.getElementById('refreshDbBtn');
  if(refreshBtn) refreshBtn.onclick=async()=>{
    refreshBtn.disabled=true;
    refreshBtn.textContent=t('refreshing');
    try{
      await refreshAuthenticatedData();
    }catch(err){
      console.error(err);
      alert(err?.message||t('refreshFailed'));
    }finally{
      if(document.getElementById('refreshDbBtn')){
        document.getElementById('refreshDbBtn').disabled=false;
        document.getElementById('refreshDbBtn').textContent=t('refresh');
      }
    }
  };
  document.getElementById('logoutBtn').onclick=async()=>{
    await supabaseClient.auth.signOut();
    state.currentUser=null;
    state.authUser=null;
    state.authSession=null;
    state.users=[];
    state.loans=[];
    state.capitalTransfers=[];
    state.annualSettlementSummary=null;
    state.annualSettlementRecords=[];
    state.settlementTransferTotals={};
    state.collectionYears=[];
    state.expectedInterestByCollectionYear=[];
    state.selectedCollectionYear=null;
    state.page='dashboard';
    render();
  };
}


;
function bindLoanFilters(){
  const creator=document.getElementById('loanCreatorFilter');
  const type=document.getElementById('loanTypeFilter');
  const clear=document.getElementById('clearLoanFilters');
  const summary=document.getElementById('loanFilterSummary');
  if(!creator||!type) return;

  const apply=()=>{
    const creatorValue=creator.value;
    const typeValue=type.value;
    const allRows=[...document.querySelectorAll('tr[data-loan-id]')];

    let shown=0;
    const sectionCounts={active:0,other:0,closed:0};

    allRows.forEach(row=>{
      const okCreator=!creatorValue || row.dataset.loanCreator===creatorValue;
      const okType=!typeValue || row.dataset.loanType===typeValue;
      const visible=okCreator&&okType;
      row.style.display=visible?'':'none';
      if(visible){
        shown++;
        if(row.closest('#activeLoansBody')) sectionCounts.active++;
        else if(row.closest('#otherLoansBody')) sectionCounts.other++;
        else if(row.closest('#closedLoansBody')) sectionCounts.closed++;
      }
    });

    const activeCount=document.getElementById('activeLoansCount');
    const otherCount=document.getElementById('otherLoansCount');
    const closedCount=document.getElementById('closedLoansCount');
    if(activeCount) activeCount.textContent=`(${sectionCounts.active})`;
    if(otherCount) otherCount.textContent=`(${sectionCounts.other})`;
    if(closedCount) closedCount.textContent=`(${sectionCounts.closed})`;

    // Recalculate the active-loans totals from only the rows that remain visible
    // after the current filters are applied.
    const visibleActiveRows=[...document.querySelectorAll('#activeLoansBody tr[data-loan-id]')]
      .filter(row=>row.style.display!=='none');
    const sumData=key=>visibleActiveRows.reduce((sum,row)=>sum+Number(row.dataset[key]||0),0);
    const totalInstallment=document.getElementById('activeTotalInstallment');
    const totalAmount=document.getElementById('activeTotalAmount');
    const totalPaid=document.getElementById('activeTotalPaid');
    const totalRemaining=document.getElementById('activeTotalRemaining');
    if(totalInstallment) totalInstallment.textContent=wholeMoney(sumData('loanInstallment'));
    if(totalAmount) totalAmount.textContent=wholeMoney(sumData('loanAmount'));
    if(totalPaid) totalPaid.textContent=wholeMoney(sumData('loanPaid'));
    if(totalRemaining) totalRemaining.textContent=wholeMoney(sumData('loanRemaining'));

    const total=allRows.length;
    summary.textContent=(creatorValue||typeValue)
      ? `النتائج المطابقة: ${shown} من ${total} قرض`
      : `${tx('عرض جميع القروض:','Showing all loans:')} ${total}`;
  };

  creator.addEventListener('change',apply);
  type.addEventListener('change',apply);
  clear.onclick=()=>{
    creator.value='';
    type.value='';
    apply();
  };
}


;
function bindAccounts(){
  const analyticsPermissionBtn=document.getElementById('toggleAdminAnalyticsBtn');
  if(analyticsPermissionBtn){
    analyticsPermissionBtn.onclick=async()=>{
      const status=document.getElementById('analyticsPermissionStatus');
      const next=!state.adminAnalyticsEnabled;
      analyticsPermissionBtn.disabled=true;
      if(status){
        status.style.color='#475569';
        status.textContent=tx('جاري حفظ الصلاحية...','Saving access setting...');
      }
      try{
        const {error}=await supabaseClient
          .from('system_settings')
          .update({admin_analytics_enabled:next,updated_by:state.currentUser?.id||null})
          .eq('id',state.systemSettingsId);
        if(error) throw error;
        state.adminAnalyticsEnabled=next;
        if(status){
          status.style.color='#166534';
          status.textContent=next?tx('تمت إضافة لوحة التحليلات لحساب الأدمن.','Analytics access was granted to Admin.'):tx('تم إخفاء لوحة التحليلات عن حساب الأدمن.','Analytics access was removed from Admin.');
        }
        setTimeout(()=>render(),500);
      }catch(e){
        console.error(e);
        analyticsPermissionBtn.disabled=false;
        if(status){
          status.style.color='#b91c1c';
          status.textContent=e?.message||tx('تعذر تعديل الصلاحية.','Unable to update access setting.');
        }
      }
    };
  }

  const sel=document.getElementById('accountUserSelect');
  if(sel) sel.onchange=()=>{
    state.accountUser=sel.value;
    render();
  };

  const edit=document.getElementById('editAccountValues');
  if(edit) edit.onclick=()=>{
    state.page='edit-account-values';
    render();
  };
}



;
function bindLoanForm(){
  const assigned=document.getElementById('assignedUser');
  if(assigned && state.currentUser.role==='مستخدم'){
    assigned.value=state.currentUser.username;
    assigned.disabled=true;
  }
  const ids=['loanType','generalDiscount','userDiscount','adminDiscount','amount','months'];
  ids.forEach(id=>document.getElementById(id).addEventListener('input',refreshLoanForm));
  document.getElementById('loanType').addEventListener('change',refreshLoanForm);
  document.getElementById('loanDate').addEventListener('change',refreshLoanForm);
  document.getElementById('saveLoanBtn').onclick=saveLoan;
  refreshLoanForm();
}


;
function bindLoanDetails(){
  const back = document.getElementById('backToLoans');
  if(back) back.onclick=()=>{state.page='loans';render();};
  const review = document.getElementById('detailsReviewBtn');
  if(review) review.onclick=()=>{
    state.page='loan-approval';
    render();
  };
  const early = document.getElementById('earlySettlementBtn');
  if(early) early.onclick=()=>{
    state.page='repayment-period-request';
    render();
  };
  const reviewPeriod = document.getElementById('reviewEarlySettlementBtn');
  if(reviewPeriod) reviewPeriod.onclick=()=>{
    state.page='repayment-period-admin-review';
    render();
  };
  document.querySelectorAll('.editLastPaymentBtn').forEach(b=>b.onclick=()=>{
    state.selectedPaymentId=b.dataset.id;
    state.paymentActionMode='edit';
    state.page='payment-action';
    render();
  });
  document.querySelectorAll('.deleteLastPaymentBtn').forEach(b=>b.onclick=()=>{
    state.selectedPaymentId=b.dataset.id;
    state.paymentActionMode='delete';
    state.page='payment-action';
    render();
  });

  const pay = document.getElementById('detailsPayBtn');
  if(pay) pay.onclick=()=>{
    state.page='record-payment';
    render();
  };

  const deleteLoanBtn=document.getElementById('deleteLatestUnpaidLoanBtn');
  if(deleteLoanBtn) deleteLoanBtn.onclick=async()=>{
    const l=state.loans.find(x=>x.id===state.selectedLoanId);
    if(!l) return;
    const ok=confirm(`هل أنت متأكد من حذف القرض رقم ${l.id}؟\n\nلا يمكن التراجع عن عملية الحذف.`);
    if(!ok) return;
    deleteLoanBtn.disabled=true;
    deleteLoanBtn.textContent='جاري الحذف...';
    try{
      const {error}=await supabaseClient.rpc('delete_latest_unpaid_loan',{p_loan_id:l.dbId});
      if(error) throw error;
      await loadLoansFromDatabase();
      state.selectedLoanId=null;
      state.page='loans';
      render();
    }catch(e){
      console.error(e);
      alert(e?.message||'تعذر حذف القرض.');
      deleteLoanBtn.disabled=false;
      deleteLoanBtn.textContent='حذف القرض';
    }
  };
}




;
function bindLoanApproval(){
  const back=document.getElementById('approvalBackBtn');
  if(back) back.onclick=()=>{state.page='loans';render();};

  const input=document.getElementById('approvalAdminDiscount');
  if(input) input.oninput=refreshApprovalCalculation;

  const approve=document.getElementById('approveLoanFinalBtn');
  if(approve) approve.onclick=async()=>{
    const l=state.loans.find(x=>x.id===state.selectedLoanId);
    const calc=refreshApprovalCalculation();
    const err=document.getElementById('approvalError');

    if(err) err.textContent='';

    if(!l || !l.status.includes('بانتظار')){
      if(err) err.textContent='هذا القرض لم يعد بانتظار الاعتماد.';
      return;
    }
    if(!l.dbId){
      if(err) err.textContent='معرّف القرض في قاعدة البيانات غير متوفر.';
      return;
    }
    if(!calc){
      if(err) err.textContent='نسبة خصم الأدمن يجب أن تكون بين 0 و100%.';
      return;
    }

    const {ad}=calc;
    approve.disabled=true;
    const rejectBtn=document.getElementById('rejectLoanFinalBtn');
    if(rejectBtn) rejectBtn.disabled=true;
    approve.textContent='جاري الاعتماد...';

    try{
      const {error}=await supabaseClient.rpc('approve_loan',{
        p_loan_id:l.dbId,
        p_admin_discount:ad
      });

      if(error) throw error;

      await loadLoansFromDatabase();
      state.page='loans';
      render();
    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||'تعذر اعتماد القرض.';
      approve.disabled=false;
      approve.textContent='اعتماد القرض';
      if(rejectBtn) rejectBtn.disabled=false;
    }
  };

  const reject=document.getElementById('rejectLoanFinalBtn');
  if(reject) reject.onclick=async()=>{
    const l=state.loans.find(x=>x.id===state.selectedLoanId);
    const err=document.getElementById('approvalError');
    const reason=document.getElementById('approvalRejectReason')?.value.trim()||'';

    if(err) err.textContent='';

    if(!l || !l.status.includes('بانتظار')){
      if(err) err.textContent='هذا القرض لم يعد بانتظار مراجعة الأدمن.';
      return;
    }
    if(!l.dbId){
      if(err) err.textContent='معرّف القرض في قاعدة البيانات غير متوفر.';
      return;
    }
    if(!reason){
      if(err) err.textContent='سبب رفض القرض مطلوب.';
      return;
    }

    reject.disabled=true;
    const approveBtn=document.getElementById('approveLoanFinalBtn');
    if(approveBtn) approveBtn.disabled=true;
    reject.textContent='جاري الرفض...';

    try{
      const {error}=await supabaseClient.rpc('reject_loan',{
        p_loan_id:l.dbId,
        p_reason:reason
      });

      if(error) throw error;

      await loadLoansFromDatabase();
      state.page='loans';
      render();
    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||'تعذر رفض القرض.';
      reject.disabled=false;
      reject.textContent='رفض القرض';
      if(approveBtn) approveBtn.disabled=false;
    }
  };
}





;
function bindRepaymentPeriodRequest(){
  const back=()=>{state.page='loan-details';render();};

  document.getElementById('repaymentBackBtn')?.addEventListener('click',back);
  document.getElementById('cancelRepaymentReviewBtn')?.addEventListener('click',back);

  const input=document.getElementById('repaymentNewMonths');
  if(input) input.oninput=calculateRepaymentPeriodPreview;

  const submit=document.getElementById('submitRepaymentReviewBtn');
  if(submit) submit.onclick=async()=>{
    const l=state.loans.find(x=>x.id===state.selectedLoanId);
    const err=document.getElementById('repaymentError');
    if(err) err.textContent='';

    if(!l || l.status!=='نشط'){
      if(err) err.textContent=tx('القرض غير صالح لمراجعة فترة السداد.','This loan is not eligible for repayment-period review.');
      return;
    }
    if(!l.dbId){
      if(err) err.textContent='معرّف القرض في قاعدة البيانات غير متوفر.';
      return;
    }
    if(l.earlySettlementRequest){
      if(err) err.textContent='يوجد طلب قائم بالفعل بانتظار موافقة الأدمن.';
      return;
    }

    const newMonths=Number(document.getElementById('repaymentNewMonths')?.value);
    if(!Number.isInteger(newMonths) || newMonths<1 || newMonths>state.maxMonths){
      if(err) err.textContent=`عدد الشهور يجب أن يكون رقمًا صحيحًا بين 1 و${state.maxMonths}.`;
      return;
    }

    submit.disabled=true;
    submit.textContent='جاري إرسال الطلب...';

    try{
      const {error}=await supabaseClient.rpc('create_repayment_period_request',{
        p_loan_id:l.dbId,
        p_requested_months:newMonths
      });

      if(error) throw error;

      await loadRepaymentRequestsFromDatabase();
      state.page='loan-details';
      render();
    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||tx('تعذر إرسال طلب مراجعة فترة السداد.','Unable to submit repayment-period review request.');
      submit.disabled=false;
      submit.textContent='إرسال طلب المراجعة';
    }
  };

  calculateRepaymentPeriodPreview();
}


;
function bindRepaymentPeriodAdminReview(){
  const back=()=>{
    state.page='early-reviews';
    render();
  };

  document.getElementById('adminRepaymentBackBtn')?.addEventListener('click',back);

  const approve=document.getElementById('approveRepaymentPeriodBtn');
  if(approve) approve.onclick=async()=>{
    const r=(state.repaymentRequests||[]).find(x=>x.id===state.selectedRepaymentRequestId);
    const err=document.getElementById('adminRepaymentError');
    const note=document.getElementById('adminRepaymentNote')?.value||'';

    if(err) err.textContent='';
    if(!r){
      if(err) err.textContent='طلب المراجعة غير موجود.';
      return;
    }

    approve.disabled=true;
    const rejectBtn=document.getElementById('rejectRepaymentPeriodBtn');
    if(rejectBtn) rejectBtn.disabled=true;
    approve.textContent='جاري الاعتماد...';

    try{
      const {error}=await supabaseClient
