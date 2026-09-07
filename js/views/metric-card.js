function metricCard(title, value, note=''){
  return `<div class="card"><div class="muted">${title}</div><div class="kpi" style="font-size:21px">${value}</div>${note?`<div class="small muted" style="margin-top:7px">${note}</div>`:''}</div>`;
}


