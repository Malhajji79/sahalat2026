function analyticsLoanCountLabel(n){
  const count=Number(n||0);
  return state.lang==='en' ? (count===1?'loan':'loans') : 'قرض';
}
function analyticsBar(value,max,label){
  const pct=max>0?Math.max(0,Math.min(100,value/max*100)):0;
  return `<div style="min-width:180px"><div style="height:10px;background:#e5e7eb;border-radius:999px;overflow:hidden"><div style="height:100%;width:${pct}%;background:#16a34a;border-radius:999px"></div></div><div class="small muted" style="margin-top:4px">${label}</div></div>`;
}

function analyticsDonut(items,title){
  const total=items.reduce((s,x)=>s+Number(x.value||0),0);
  if(total<=0) return `<div class="muted">${tx('لا توجد بيانات كافية للرسم.','Not enough data to display the chart.')}</div>`;
  const palette=['#166534','#22c55e','#86efac','#0f766e','#14b8a6','#84cc16','#4d7c0f','#a3e635'];
  let offset=0;
  const rings=items.map((x,i)=>{const pct=Number(x.value||0)/total*100;const el=`<circle cx="60" cy="60" r="45" fill="none" stroke="${palette[i%palette.length]}" stroke-width="18" pathLength="100" stroke-dasharray="${pct} ${100-pct}" stroke-dashoffset="${-offset}" transform="rotate(-90 60 60)"/>`;offset+=pct;return el;}).join('');
  return `<div style="display:grid;grid-template-columns:minmax(170px,.8fr) minmax(220px,1.2fr);gap:18px;align-items:center">
    <div style="text-align:center"><svg viewBox="0 0 120 120" style="width:170px;max-width:100%">${rings}<circle cx="60" cy="60" r="32" fill="white"/><text x="60" y="57" text-anchor="middle" font-size="11" font-weight="800" fill="#166534">${title}</text><text x="60" y="72" text-anchor="middle" font-size="12" font-weight="900" fill="#111827">${wholeMoney(total)}</text></svg></div>
    <div style="display:grid;gap:8px">${items.map((x,i)=>`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${palette[i%palette.length]};margin-left:7px"></span>${x.label}</span><strong>${percentDisplay(Number(x.value||0)/total*100,1)}</strong></div>`).join('')}</div>
  </div>`;
}
function analyticsScoreBars(ranked){
  return `<div style="display:grid;gap:11px">${ranked.map(x=>`<div style="display:grid;grid-template-columns:minmax(150px,.8fr) minmax(220px,2fr) 60px;gap:10px;align-items:center"><strong style="font-size:clamp(.95rem,1.25vw,1.12rem)">${x.u.username}</strong><div style="height:16px;background:#e5e7eb;border-radius:999px;overflow:hidden"><div style="height:100%;width:${Math.max(0,Math.min(100,x.e.score))}%;background:${x.e.score>=80?'#16a34a':x.e.score>=60?'#ca8a04':'#dc2626'}"></div></div><strong class="analytics-number">${percentDisplay(x.e.score,0)}</strong></div>`).join('')}</div>`;
}
