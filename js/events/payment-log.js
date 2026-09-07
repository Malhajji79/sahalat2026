function paymentLogRows(){
  const rows = [];
  const scopedLoans = ['أدمن','مدير مشروع','مدير المشروع'].includes(state.currentUser.role)
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

