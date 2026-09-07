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

