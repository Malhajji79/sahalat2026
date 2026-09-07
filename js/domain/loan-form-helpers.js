function clampPct(v){v=Number(v||0);return Math.min(100,Math.max(0,v));}

function loanTypeToDb(type){
  return type==='قرض عادي' ? 'normal'
    : type==='قرض مجاني' ? 'free'
    : type==='قرض دراسة' ? 'study'
    : type==='قرض مكيفات' ? 'ac'
    : null;
}


function refreshLoanForm(){
  const type=document.getElementById('loanType').value;
  const gd=document.getElementById('generalDiscount');
  const ud=document.getElementById('userDiscount');
  const ad=document.getElementById('adminDiscount');

  if(type==='قرض عادي'){
    // الخصم العام ثابت 0%، بينما خصم المستخدم والأدمن قابلان للإدخال
    gd.value=0;
    gd.disabled=true;
    ud.disabled=false;
    ad.disabled=false;
  }else if(type==='قرض مجاني'){
    gd.value=100;ud.value=100;ad.value=100;
    gd.disabled=ud.disabled=ad.disabled=true;
  }else{
    gd.disabled=ud.disabled=ad.disabled=false;
  }

  const amount=Number(document.getElementById('amount').value||0);
  const months=Number(document.getElementById('months').value||0);
  const r=calcLoan(amount,months,clampPct(gd.value),clampPct(ud.value),clampPct(ad.value));

  document.getElementById('sBaseRate').textContent=percentDisplay(r.baseRate);
  document.getElementById('sBaseInterest').textContent=wholeMoney(r.baseInterest);
  document.getElementById('sAfterGeneral').textContent=wholeMoney(r.afterGeneral);
  document.getElementById('sUserNet').textContent=wholeMoney(r.userNet);
  document.getElementById('sAdminNet').textContent=wholeMoney(r.adminNet);
  document.getElementById('sFinalInterest').textContent=wholeMoney(r.finalInterest);
  document.getElementById('sTotal').textContent=wholeMoney(r.total);
  document.getElementById('sInstallment').textContent=wholeMoney(r.installment);
  document.getElementById('sSettlementDue').textContent=money(r.settlementDue);
}


