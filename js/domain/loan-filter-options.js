function loanFilterOptions(){
  const scoped=visibleLoansForCurrentUser();
  const creators=[...new Set(scoped.map(l=>l.createdBy).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ar'));
  const types=[...new Set(scoped.map(l=>l.type).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'ar'));
  return {creators,types};
}

