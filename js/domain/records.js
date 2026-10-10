function visibleLoansForCurrentUser(){
  if(['أدمن','مدير مشروع'].includes(state.currentUser.role)) return state.loans;
  return state.loans.filter(l=>{
    const assigned=(l.assignedUser||l.createdBy);
    if(assigned!==state.currentUser.username) return false;
    if(l.status==='نشط' || l.status==='مغلق') return true;
    if(l.status.includes('بانتظار') && l.createdBy===state.currentUser.username) return true;
    return false;
  });
}


function pendingEarlySettlementLoans(){
  return state.loans.filter(l=>l.earlySettlementRequest);
}



;
function paymentLogRows(){
  const rows = [];
  const scopedLoans = ['أدمن','مدير مشروع'].includes(state.currentUser.role)
    ? state.loans
    : state.loans.filter(l=>(l.assignedUser||l.createdBy)===state.currentUser.username);
  scopedLoans.forEach(l=>{
    (l.payments||[]).forEach(p=>{
      rows.push({
        loanId:l.id,
        beneficiary:l.beneficiary,
        amount:p.amount,
        by:p.createdBy||'—',
        at:p.createdAt,
        paymentDate:p.paymentDate||'',
        note:p.note||''
      });
    });
  });
  rows.sort((a,b)=>String(b.paymentDate||b.at||'').localeCompare(String(a.paymentDate||a.at||'')));
  return rows;
}

function paymentDisplayDate(r){
  if(r.paymentDate) return dateDisplay(r.paymentDate);
  return dateTimeDisplay(r.at);
}

function paymentFilterDate(r){
  if(r.paymentDate) return String(r.paymentDate).slice(0,10);
  if(r.at){
    const d=new Date(r.at);
    if(!Number.isNaN(d.getTime())){
      const y=d.getFullYear();
      const m=String(d.getMonth()+1).padStart(2,'0');
      const day=String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}`;
    }
  }
  return '';
}


;
function currentCollectionWindow(){
  const now=new Date();
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const day=today.getDate();

  // دورة التحصيل الشهرية المعتمدة: من 26 إلى 5 من الشهر التالي.
  if(day>=26){
    return {
      start:new Date(today.getFullYear(),today.getMonth(),26),
      end:new Date(today.getFullYear(),today.getMonth()+1,5)
    };
  }
  if(day<=5){
    return {
      start:new Date(today.getFullYear(),today.getMonth()-1,26),
      end:new Date(today.getFullYear(),today.getMonth(),5)
    };
  }
  return null;
}

function hasPaymentInCurrentCollectionWindow(loan){
  const window=currentCollectionWindow();
  if(!window) return false;

  return (loan.payments||[]).some(p=>{
    const raw=p.date||p.paymentDate||p.payment_date;
    if(!raw) return false;

    // Parse Gregorian YYYY-MM-DD locally to avoid timezone date shifts.
    const m=String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(!m) return false;
    const paymentDate=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
    return paymentDate>=window.start && paymentDate<=window.end;
  });
}


