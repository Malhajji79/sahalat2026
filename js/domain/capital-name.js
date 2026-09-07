function capitalNameMatches(a,b){
  const norm=v=>String(v||'').trim().toLowerCase().replace(/\./g,'').replace(/\s+/g,' ');
  return norm(a)===norm(b);
}

