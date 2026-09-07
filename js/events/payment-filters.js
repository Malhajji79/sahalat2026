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

  const apply=()=>{
    const loan=loanInput.value.trim();
    const date=dateInput.value;
    const recorder=recorderInput.value;

    const filtered=allRows.filter(r=>{
      const loanOk=!loan || String(r.loanId).includes(loan);
      const dateOk=!date || paymentFilterDate(r)===date;
      const recorderOk=!recorder || r.by===recorder;
      return loanOk&&dateOk&&recorderOk;
    });

    body.innerHTML=paymentsTableRows(filtered);
    countKpi.textContent=String(filtered.length);
    totalKpi.textContent=wholeMoney(filtered.reduce((s,r)=>s+Number(r.amount||0),0));
    summary.textContent=(loan||date||recorder)
      ? `${tx('النتائج المطابقة','Matching results')}: ${arNum(filtered.length)} ${tx('من','of')} ${arNum(allRows.length)} ${tx('دفعة','payments')}`
      : `${tx('عرض جميع الدفعات','Show all payments')}: ${arNum(allRows.length)}`;
  };

  loanInput.addEventListener('input',apply);
  dateInput.addEventListener('change',apply);
  recorderInput.addEventListener('change',apply);
  clearBtn.onclick=()=>{
    loanInput.value='';
    dateInput.value='';
    recorderInput.value='';
    apply();
  };
}


