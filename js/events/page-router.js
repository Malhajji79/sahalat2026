function renderPage(){
  const c = document.getElementById('content');
  const title = document.getElementById('pageTitle');
  if(state.page==='dashboard'){title.textContent=t('dashboard'); c.innerHTML=dashboardView();}
  if(state.page==='loans'){title.textContent=t('loans'); c.innerHTML=loansView(); bindLoanActions(); bindLoanFilters();}
  if(state.page==='loan-details'){title.textContent=t('loanDetails'); c.innerHTML=loanDetailsView(); bindLoanDetails();}
  if(state.page==='loan-approval'){title.textContent=t('loanApproval'); c.innerHTML=loanApprovalView(); bindLoanApproval();}
  if(state.page==='record-payment'){title.textContent=t('recordPayment'); c.innerHTML=recordPaymentView(); bindRecordPayment();}
  if(state.page==='payment-action'){title.textContent=state.paymentActionMode==='edit'?t('editPayment'):t('deletePayment'); c.innerHTML=paymentActionView(); bindPaymentAction();}
  if(state.page==='repayment-period-request'){title.textContent=t('repaymentPeriod'); c.innerHTML=repaymentPeriodRequestView(); bindRepaymentPeriodRequest();}
  if(state.page==='new-loan'){
    if(state.currentUser.role==='أدمن'){
      state.page='loans';
      title.textContent=t('loans');
      c.innerHTML=loansView();
      bindLoanActions();
    }else{
      title.textContent=t('addNewLoan');
      c.innerHTML=newLoanView();
      bindLoanForm();
    }
  }
  if(state.page==='payments'){title.textContent=t('payments'); c.innerHTML=paymentsView(); bindPaymentsFilters();}
  if(state.page==='analytics'){
    if(!canAccessAnalytics()){
      state.page='dashboard';
      title.textContent=t('dashboard');
      c.innerHTML=dashboardView();
    }else{
      title.textContent=t('analytics');
      c.innerHTML=analyticsView();
      bindAnalytics();
    }
  }
  if(state.page==='collection-years'){
    if(!['أدمن','مدير مشروع','مدير المشروع'].includes(state.currentUser.role)){
      state.page='dashboard';
      title.textContent=t('dashboard');
      c.innerHTML=dashboardView();
    }else{
      title.textContent=t('collectionYears');
      c.innerHTML=collectionYearsView();
      bindCollectionYears();
    }
  }
  if(state.page==='accounts'){
    if(state.currentUser.role==='مستخدم'){
      state.page='dashboard';
      title.textContent=t('dashboard');
      c.innerHTML=dashboardView();
    }else{
      title.textContent=t('accounts');
      c.innerHTML=accountsView();
      bindAccounts();
    }
  }
  if(state.page==='edit-account-values'){
    if(state.currentUser.role==='أدمن'){
      state.page='dashboard';
      title.textContent=t('dashboard');
      c.innerHTML=dashboardView();
    }else{
      title.textContent='تعديل رأس المال';
      c.innerHTML=capitalTransferView();
      bindCapitalTransfer();
    }
  }
  if(state.page==='early-reviews'){title.textContent=t('repaymentPeriod'); c.innerHTML=earlyReviewsView(); bindEarlyReviews();}
  if(state.page==='repayment-period-admin-review'){title.textContent=t('repaymentPeriod'); c.innerHTML=repaymentPeriodAdminReviewView(); bindRepaymentPeriodAdminReview();}
  if(state.page==='capital-movements'){title.textContent=t('capitalMovements'); c.innerHTML=capitalMovementsView(); bindCapitalMovements();}
  if(state.page==='annual-settlement'){
    if(state.currentUser.role!=='مدير مشروع'){
      state.page='dashboard';
      title.textContent=t('dashboard');
      c.innerHTML=dashboardView();
    }else{
      title.textContent=t('annualSettlement');
      c.innerHTML=annualSettlementView();
      bindAnnualSettlement();
    }
  }
  if(state.page==='admin'){
    if(state.currentUser.role!=='أدمن'){
      state.page='dashboard';
      title.textContent=t('dashboard');
      c.innerHTML=dashboardView();
    }else{
      title.textContent=t('administration');
      c.innerHTML=adminView();
      bindAdmin();
    }
  }
}


