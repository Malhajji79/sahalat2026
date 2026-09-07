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
  document.querySelectorAll('.analyticsMode').forEach(b=>b.onclick=()=>{state.analyticsMode=b.dataset.mode;render();});
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
function bindNav(){
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
      const {error}=await supabaseClient.rpc('approve_repayment_period_request',{
        p_request_id:r.dbId,
        p_review_note:note||null
      });
      if(error) throw error;

      await loadLoansFromDatabase();
      await loadRepaymentRequestsFromDatabase();

      state.selectedRepaymentRequestId=null;
      state.page='early-reviews';
      render();
    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||tx('تعذر اعتماد مراجعة فترة السداد.','Unable to approve repayment-period review.');
      approve.disabled=false;
      approve.textContent='اعتماد التغيير';
      if(rejectBtn) rejectBtn.disabled=false;
    }
  };

  const reject=document.getElementById('rejectRepaymentPeriodBtn');
  if(reject) reject.onclick=async()=>{
    const r=(state.repaymentRequests||[]).find(x=>x.id===state.selectedRepaymentRequestId);
    const err=document.getElementById('adminRepaymentError');
    const note=document.getElementById('adminRepaymentNote')?.value?.trim()||'';

    if(err) err.textContent='';
    if(!r){
      if(err) err.textContent='طلب المراجعة غير موجود.';
      return;
    }
    if(!note){
      if(err) err.textContent='سبب الرفض مطلوب.';
      return;
    }

    reject.disabled=true;
    const approveBtn=document.getElementById('approveRepaymentPeriodBtn');
    if(approveBtn) approveBtn.disabled=true;
    reject.textContent='جاري الرفض...';

    try{
      const {error}=await supabaseClient.rpc('reject_repayment_period_request',{
        p_request_id:r.dbId,
        p_review_note:note
      });
      if(error) throw error;

      await loadRepaymentRequestsFromDatabase();

      state.selectedRepaymentRequestId=null;
      state.page='early-reviews';
      render();
    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||tx('تعذر رفض مراجعة فترة السداد.','Unable to reject repayment-period review.');
      reject.disabled=false;
      reject.textContent='رفض التغيير';
      if(approveBtn) approveBtn.disabled=false;
    }
  };
}



;
function bindPaymentAction(){
  const back=()=>{state.page='loan-details';render();};
  document.getElementById('paymentActionBackBtn')?.addEventListener('click',back);
  document.getElementById('cancelPaymentActionBtn')?.addEventListener('click',back);

  const confirmBtn=document.getElementById('confirmPaymentActionBtn');
  if(confirmBtn) confirmBtn.onclick=async()=>{
    const l=state.loans.find(x=>x.id===state.selectedLoanId);
    const p=l?.payments?.find(x=>x.id===state.selectedPaymentId);
    const err=document.getElementById('paymentActionError');
    const reason=document.getElementById('paymentActionReason')?.value.trim()||'';

    if(err) err.textContent='';

    if(!l || !p){
      if(err) err.textContent='الدفعة غير موجودة.';
      return;
    }
    if(!p.dbId){
      if(err) err.textContent='معرّف الدفعة في قاعدة البيانات غير متوفر.';
      return;
    }
    if(!reason){
      if(err) err.textContent='سبب العملية مطلوب.';
      return;
    }

    confirmBtn.disabled=true;
    confirmBtn.textContent=state.paymentActionMode==='edit'?'جاري الحفظ...':'جاري الحذف...';

    try{
      if(state.paymentActionMode==='edit'){
        const amount=Number(document.getElementById('editPaymentAmount')?.value);
        const date=document.getElementById('editPaymentDate')?.value||'';
        const note=document.getElementById('editPaymentNote')?.value||'';

        if(!Number.isFinite(amount) || amount<=0){
          throw new Error('مبلغ الدفعة غير صحيح.');
        }
        if(!date){
          throw new Error('تاريخ الدفعة مطلوب.');
        }

        const {error}=await supabaseClient.rpc('edit_last_payment',{
          p_payment_id:p.dbId,
          p_new_amount:amount,
          p_new_payment_date:date,
          p_new_note:note||null,
          p_reason:reason
        });

        if(error) throw error;

      }else{
        const {error}=await supabaseClient.rpc('delete_last_payment',{
          p_payment_id:p.dbId,
          p_reason:reason
        });

        if(error) throw error;
      }

      await loadLoansFromDatabase();

      state.selectedPaymentId=null;
      state.paymentActionMode=null;
      state.page='loan-details';
      render();

    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||'تعذر تنفيذ العملية.';
      confirmBtn.disabled=false;
      confirmBtn.textContent=state.paymentActionMode==='edit'?'حفظ التعديل':'تأكيد الحذف';
    }
  };
}



;
function bindRecordPayment(){
  const back=()=>{state.page='loan-details';render();};

  const backBtn=document.getElementById('paymentBackBtn');
  if(backBtn) backBtn.onclick=back;

  const cancel=document.getElementById('cancelPaymentBtn');
  if(cancel) cancel.onclick=back;

  const save=document.getElementById('savePaymentBtn');
  if(save) save.onclick=async()=>{
    const l=state.loans.find(x=>x.id===state.selectedLoanId);
    const err=document.getElementById('paymentError');
    if(err) err.textContent='';

    if(!l || l.status!=='نشط'){
      if(err) err.textContent='القرض غير صالح لتسجيل دفعة.';
      return;
    }

    if(state.currentUser.role==='أدمن'){
      if(err) err.textContent='الأدمن لا يستطيع تسجيل الدفعات.';
      return;
    }

    if(!l.dbId){
      if(err) err.textContent='معرّف القرض في قاعدة البيانات غير متوفر.';
      return;
    }

    const amount=Number(document.getElementById('paymentAmount').value);
    const date=document.getElementById('paymentDate').value;
    const note=document.getElementById('paymentNote').value.trim();

    const paid=Number(l.paid||0);
    const remaining=Math.max(0,Number(l.total||0)-paid);

    if(!Number.isFinite(amount) || amount<=0){
      if(err) err.textContent='مبلغ الدفعة غير صحيح.';
      return;
    }
    if(amount>remaining){
      if(err) err.textContent='مبلغ الدفعة أكبر من المتبقي على القرض.';
      return;
    }
    if(!date){
      if(err) err.textContent='تاريخ الدفعة مطلوب.';
      return;
    }

    save.disabled=true;
    save.textContent=tx('جاري الحفظ...','Saving...');

    try{
      const {error}=await supabaseClient.rpc('create_payment',{
        p_loan_id:l.dbId,
        p_amount:amount,
        p_payment_date:date,
        p_note:note||null
      });

      if(error) throw error;

      await loadLoansFromDatabase();
      state.page='loan-details';
      render();
    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||'تعذر تسجيل الدفعة.';
      save.disabled=false;
      save.textContent='حفظ الدفعة';
    }
  };
}



;
function bindCollectionYears(){
  const status=document.getElementById('collectionYearStatus');
  document.getElementById('expectedCollectionYearSelect')?.addEventListener('change',e=>{
    state.selectedCollectionYear=Number(e.target.value);
    render();
  });

  document.getElementById('refreshCollectionYearsBtn')?.addEventListener('click',async()=>{
    const b=document.getElementById('refreshCollectionYearsBtn');
    b.disabled=true;b.textContent=tx('جاري التحديث...','Refreshing...');
    try{
      await loadCollectionYears();
      await loadExpectedInterestByCollectionYear();
      render();
    }catch(e){
      console.error(e);
      if(status){status.style.color='#b91c1c';status.textContent=e?.message||tx('تعذر تحديث البيانات.','Unable to refresh data.');}
      b.disabled=false;b.textContent=tx('تحديث البيانات','Refresh Data');
    }
  });

  document.querySelectorAll('.saveCollectionYearBtn').forEach(btn=>btn.onclick=async()=>{
    const id=btn.dataset.id;
    const start=document.querySelector(`.collectionStartDate[data-id="${id}"]`)?.value||'';
    const end=document.querySelector(`.collectionEndDate[data-id="${id}"]`)?.value||'';
    if(!start || !end){
      if(status){status.style.color='#b91c1c';status.textContent=tx('أدخل تاريخ البداية والنهاية.','Enter both start and end dates.');}
      return;
    }
    if(new Date(end+'T00:00:00')<new Date(start+'T00:00:00')){
      if(status){status.style.color='#b91c1c';status.textContent=tx('تاريخ النهاية لا يمكن أن يسبق تاريخ البداية.','End date cannot be earlier than start date.');}
      return;
    }

    btn.disabled=true;btn.textContent=tx('جاري الحفظ...','Saving...');
    try{
      const {error}=await supabaseClient
        .from('collection_years')
        .update({start_date:start,end_date:end,updated_by:state.currentUser.id,updated_at:new Date().toISOString()})
        .eq('id',id);
      if(error) throw error;
      await loadCollectionYears();
      await loadExpectedInterestByCollectionYear();
      if(status){status.style.color='#166534';status.textContent=tx('تم حفظ السنة التحصيلية وتحديث حسابات الفائدة المتوقعة.','Collection year saved and expected-interest calculations updated.');}
      render();
    }catch(e){
      console.error(e);
      if(status){status.style.color='#b91c1c';status.textContent=e?.message||tx('تعذر حفظ السنة التحصيلية.','Unable to save the collection year.');}
      btn.disabled=false;btn.textContent=tx('حفظ','Save');
    }
  });
}


;
function bindCapitalTransfer(){
  state.capitalRecipientUsers=[];
  const back=()=>{state.page='accounts';render();};

  document.getElementById('capitalBackBtn')?.addEventListener('click',back);
  document.getElementById('cancelCapitalTransferBtn')?.addEventListener('click',back);

  const selected=document.getElementById('capitalSelectedUser');
  if(selected) selected.onchange=()=>{
    state.accountUser=selected.value;
    render();
  };

  const type=document.getElementById('capitalTransferType');
  if(type) type.onchange=fillCapitalPartyOptions;

  fillCapitalPartyOptions();
  document.getElementById('capitalFrom')?.addEventListener('change',fillCapitalRecipientOptions);
  const recipientSelect=document.getElementById('capitalTo');
  const signedInUserId=state.currentUser.id;
  supabaseClient.rpc('get_capital_transfer_recipients').then(({data,error})=>{
    if(state.currentUser?.id!==signedInUserId || document.getElementById('capitalTo')!==recipientSelect) return;
    if(error) throw error;
    state.capitalRecipientUsers=(data||[]).map(u=>({id:u.id,username:u.username}));
    fillCapitalRecipientOptions();
  }).catch(error=>{
    if(state.currentUser?.id!==signedInUserId || document.getElementById('capitalTo')!==recipientSelect) return;
    const err=document.getElementById('capitalError');
    if(err) err.textContent=tx('تعذر تحميل أسماء المستلمين. تأكد من تثبيت تحديث Supabase ثم افتح الصفحة مجددًا.','Unable to load recipients. Install the Supabase update and reopen this page.');
    console.error(error);
  });

  document.querySelectorAll('.editCapitalTransferBtn').forEach(b=>b.onclick=()=>{
    const t=(state.capitalTransfers||[]).find(x=>x.id===b.dataset.id);
    if(!canEditCapitalTransfer(t)) return;
    state.pendingEditTransferId=t.id;
    state.pendingDeleteTransferId=null;
    render();
  });

  document.getElementById('cancelEditCapitalBtn')?.addEventListener('click',()=>{
    state.pendingEditTransferId=null;
    render();
  });

  document.getElementById('confirmEditCapitalBtn')?.addEventListener('click',async()=>{
    const amount=Number(document.getElementById('capitalEditAmount')?.value);
    const date=document.getElementById('capitalEditDate')?.value||'';
    const note=document.getElementById('capitalEditNote')?.value||'';
    const reason=document.getElementById('capitalEditReason')?.value||'';
    const err=document.getElementById('capitalEditError');
    if(err) err.textContent='';

    const btn=document.getElementById('confirmEditCapitalBtn');
    btn.disabled=true;
    btn.textContent='جاري الحفظ...';

    const result=await editCapitalTransferDb(state.pendingEditTransferId,amount,date,note,reason);
    if(!result.ok){
      if(err) err.textContent=result.msg;
      btn.disabled=false;
      btn.textContent='حفظ التعديل';
      return;
    }

    state.pendingEditTransferId=null;
    render();
  });

  document.querySelectorAll('.deleteCapitalTransferBtn').forEach(b=>b.onclick=()=>{
    const t=(state.capitalTransfers||[]).find(x=>x.id===b.dataset.id);
    if(!t) return;

    if(!canDeleteCapitalTransfer(t)){
      const err=document.getElementById('capitalError');
      if(err) err.textContent='يمكن حذف الحركة فقط بواسطة المستخدم الذي أنشأها.';
      return;
    }

    state.pendingDeleteTransferId=t.id;
    render();
  });

  const cancelDelete=document.getElementById('cancelDeleteCapitalBtn');
  if(cancelDelete) cancelDelete.onclick=()=>{
    state.pendingDeleteTransferId=null;
    render();
  };

  const confirmDelete=document.getElementById('confirmDeleteCapitalBtn');
  if(confirmDelete) confirmDelete.onclick=async()=>{
    const reason=document.getElementById('capitalDeleteReason')?.value||'';
    const err=document.getElementById('capitalDeleteError');
    if(err) err.textContent='';

    confirmDelete.disabled=true;
    confirmDelete.textContent='جاري الإلغاء...';

    const result=await cancelCapitalTransferDb(state.pendingDeleteTransferId,reason);

    if(!result.ok){
      if(err) err.textContent=result.msg;
      confirmDelete.disabled=false;
      confirmDelete.textContent='تأكيد الإلغاء';
      return;
    }

    state.pendingDeleteTransferId=null;
    render();
  };

  const save=document.getElementById('saveCapitalTransferBtn');
  if(save) save.onclick=async()=>{
    const err=document.getElementById('capitalError');
    if(err) err.textContent='';

    const typeVal=document.getElementById('capitalTransferType').value;
    const from=document.getElementById('capitalFrom').value;
    const to=document.getElementById('capitalTo').value;
    const amount=Number(document.getElementById('capitalAmount').value);
    const date=document.getElementById('capitalDate').value;
    const note=document.getElementById('capitalNote').value.trim();

    if(!Number.isFinite(amount) || amount<=0){
      if(err) err.textContent=tx('أدخل مبلغًا صحيحًا أكبر من صفر.','Enter a valid amount greater than zero.');
      return;
    }
    if(!date){
      if(err) err.textContent=tx('التاريخ مطلوب.','Date is required.');
      return;
    }
    if(from===to){
      if(err) err.textContent=tx('لا يمكن أن يكون الطرف المرسل والمستلم نفس الحساب.','The sender and recipient cannot be the same account.');
      return;
    }

    const fromUser=state.users.find(u=>u.username===from);
    const toUser=(typeVal==='user-to-user' ? (state.capitalRecipientUsers||[]) : state.users).find(u=>u.username===to);

    let dbType;
    let fromUserId=null;
    let toUserId=null;

    if(typeVal==='owner-to-user'){
      dbType='owner_to_user';
      if(!toUser){
        if(err) err.textContent=tx('المستخدم المستلم غير صحيح.','The recipient user is invalid.');
        return;
      }
      toUserId=toUser.id;

    }else if(typeVal==='user-to-owner'){
      dbType='user_to_owner';
      if(!fromUser){
        if(err) err.textContent=tx('المستخدم المرسل غير صحيح.','The sender user is invalid.');
        return;
      }
      fromUserId=fromUser.id;

    }else if(typeVal==='user-to-user'){
      dbType='user_to_user';
      if(!fromUser || !toUser){
        if(err) err.textContent=tx('أحد المستخدمين غير صحيح.','One of the selected users is invalid.');
        return;
      }
      fromUserId=fromUser.id;
      toUserId=toUser.id;

    }else{
      if(err) err.textContent=tx('نوع الحركة غير صحيح.','Invalid movement type.');
      return;
    }

    save.disabled=true;
    save.textContent='جاري التنفيذ...';

    try{
      const {error}=await supabaseClient.rpc('create_capital_movement',{
        p_movement_type:dbType,
        p_from_user_id:fromUserId,
        p_to_user_id:toUserId,
        p_amount:amount,
        p_movement_date:date,
        p_note:note||null
      });

      if(error) throw error;

      // Reload users first because base_capital changes in the database.
      await loadVisibleUsers();

      if(!state.users.some(u=>u.id===state.currentUser.id)){
        state.users.unshift(state.currentUser);
      }

      // Refresh the signed-in user's own profile so dashboard capital is current.
      const refreshedCurrent=state.users.find(u=>u.id===state.currentUser.id);
      if(refreshedCurrent){
        state.currentUser={...state.currentUser,...refreshedCurrent};
      }

      await loadCapitalMovementsFromDatabase();
      await loadCapitalHistoryFromDatabase();

      state.accountUser=state.currentUser.username;
      state.page='capital-movements';
      render();

    }catch(e){
      console.error(e);
      if(err) err.textContent=e?.message||'تعذر تنفيذ حركة رأس المال.';
      save.disabled=false;
      save.textContent='تنفيذ الحركة';
    }
  };
}



;
function bindCapitalMovements(){
  const showAllBtn=document.getElementById('showAllCapitalMovements');
  if(showAllBtn) showAllBtn.onclick=()=>{
    const expanded=showAllBtn.getAttribute('aria-expanded')!=='true';
    document.querySelectorAll('#newCapitalMovementsBody > tr').forEach((row,index)=>{row.hidden=!expanded && index>=5;});
    showAllBtn.setAttribute('aria-expanded',String(expanded));
    showAllBtn.textContent=expanded?tx('إظهار آخر 5 عمليات','Show Latest 5'):tx('إظهار الجميع','Show All');
  };

  document.querySelectorAll('.capitalMovementEditBtn').forEach(b=>b.onclick=()=>{
    const t=(state.capitalTransfers||[]).find(x=>x.id===b.dataset.id);
    if(!canEditCapitalTransfer(t)) return;
    state.pendingEditTransferId=t.id;
    state.accountUser=state.currentUser.username;
    state.page='edit-account-values';
    render();
  });

  document.querySelectorAll('.capitalMovementDeleteBtn').forEach(b=>b.onclick=async()=>{
    const t=(state.capitalTransfers||[]).find(x=>x.id===b.dataset.id);
    if(!t || !canDeleteCapitalTransfer(t)) return;

    const reasonBox=document.createElement('div');
    reasonBox.className='card';
    reasonBox.id='capitalMovementDeletePanel';
    reasonBox.style.marginTop='18px';
    reasonBox.innerHTML=`
      <h3 class="section-title">${tx('إلغاء حركة رأس المال','Cancel Capital Movement')}</h3>
      <div class="summary-row"><span>${tx('من','From')}</span><strong>${t.from}</strong></div>
      <div class="summary-row"><span>${tx('إلى','To')}</span><strong>${t.to}</strong></div>
      <div class="summary-row"><span>${tx('المبلغ','Amount')}</span><strong>${wholeMoney(t.amount)}</strong></div>
      <div class="field" style="margin-top:12px">
        <label>${tx('سبب الإلغاء','Cancellation Reason')}</label>
        <input id="movementDeleteReason" type="text" placeholder="${tx('اكتب سبب الإلغاء','Enter cancellation reason')}">
      </div>
      <div id="movementDeleteError" class="small" style="color:#b91c1c;margin-top:8px"></div>
      <div class="actions">
        <button class="btn btn-danger" id="movementDeleteConfirm">${tx('تأكيد الإلغاء','Confirm Cancellation')}</button>
        <button class="btn btn-secondary" id="movementDeleteCancel">${tx('إلغاء','Cancel')}</button>
      </div>`;

    document.getElementById('capitalMovementDeletePanel')?.remove();
    document.getElementById('content').appendChild(reasonBox);

    document.getElementById('movementDeleteCancel').onclick=()=>reasonBox.remove();
    document.getElementById('movementDeleteConfirm').onclick=async()=>{
      const reason=document.getElementById('movementDeleteReason').value.trim();
      const err=document.getElementById('movementDeleteError');
      const result=await cancelCapitalTransferDb(t.id,reason);
      if(!result.ok){
        err.textContent=result.msg;
        return;
      }
      render();
    };
    reasonBox.scrollIntoView({behavior:'smooth',block:'center'});
  });
}




;
function bindAnnualSettlement(){
  const reload=async()=>{
    const btn=document.getElementById('refreshAnnualSettlement');
    if(btn){btn.disabled=true;btn.textContent=tx('جاري التحديث...','Refreshing...');}
    try{
      await loadAnnualSettlementData();
      render();
    }catch(e){
      console.error(e);
      alert(e?.message||tx('تعذر تحميل تصفية الأرباح.','Unable to load profit settlement.'));
      if(btn){btn.disabled=false;btn.textContent=tx('تحديث','Refresh');}
    }
  };

  document.getElementById('annualSettlementUser')?.addEventListener('change',async e=>{
    state.annualSettlementUserId=e.target.value;
    state.annualSettlementSummary=null;
    state.annualSettlementRecords=[];
    await reload();
  });

  document.getElementById('refreshAnnualSettlement')?.addEventListener('click',reload);

  const forSelect=document.getElementById('annualSettlementFor');
  if(forSelect) forSelect.onchange=()=>{
    const selected=state.users.find(u=>String(u.id)===String(state.annualSettlementUserId));
    const receiver=document.getElementById('annualSettlementReceiver');
    const delivered=document.getElementById('annualSettlementDeliveredBy');
    if(forSelect.value==='user'){
      if(receiver) receiver.value=selected?.username||'';
      if(delivered) delivered.value=selected?.username||'';
    }else{
      if(receiver) receiver.value=tx('المالك','Owner');
      if(delivered) delivered.value=selected?.username||'';
    }
  };

  const save=document.getElementById('saveAnnualSettlement');
  if(save) save.onclick=async()=>{
    const err=document.getElementById('annualSettlementError');
    if(err) err.textContent='';

    const settlementFor=document.getElementById('annualSettlementFor').value;
    const amount=Number(document.getElementById('annualSettlementAmount').value);
    const date=document.getElementById('annualSettlementDate').value;
    const receiver=document.getElementById('annualSettlementReceiver').value.trim();
    const deliveredBy=document.getElementById('annualSettlementDeliveredBy').value.trim();
    const note=document.getElementById('annualSettlementNote').value.trim();

    if(!Number.isFinite(amount)||amount<=0){err.textContent=tx('أدخل مبلغًا صحيحًا.','Enter a valid amount.');return;}
    if(!date){err.textContent=tx('التاريخ مطلوب.','Date is required.');return;}
    if(!receiver){err.textContent=tx('اسم المستلم مطلوب.','Receiver name is required.');return;}
    if(!deliveredBy){err.textContent=tx('اسم مسلّم المبلغ مطلوب.','Delivered-by name is required.');return;}

    save.disabled=true;
    save.textContent=tx('جاري الحفظ...','Saving...');

    try{
      const {error}=await supabaseClient.rpc('create_annual_settlement',{
        p_user_id:state.annualSettlementUserId,
        p_year:Number(date.slice(0,4)),
        p_settlement_for:settlementFor,
        p_amount:amount,
        p_settlement_date:date,
        p_receiver_name:receiver,
        p_delivered_by_name:deliveredBy,
        p_note:note||null
      });
      if(error) throw error;

      await loadAnnualSettlementData();
      render();
    }catch(e){
      console.error(e);
      err.textContent=e?.message||tx('تعذر حفظ التصفية.','Unable to save settlement.');
      save.disabled=false;
      save.textContent=tx('حفظ التصفية','Save Settlement');
    }
  };

  if(!state.annualSettlementSummary && state.annualSettlementUserId){
    loadAnnualSettlementData().then(()=>render()).catch(e=>console.error(e));
  }
}


;
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


