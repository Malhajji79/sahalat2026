function analyticsView(){
  const users=analyticsUsers();
  const mode=state.analyticsMode||'year';
  const periods=analyticsPeriods(mode);
  const periodRows=periods.map(p=>{
    const loans=state.loans.filter(l=>['active','closed'].includes(l.dbStatus) && analyticsPeriodMatch(analyticsLoanDate(l),p,mode));
    return {label:p.label,count:loans.length,amount:loans.reduce((s,l)=>s+Number(l.amount||0),0)};
  });
  const maxPeriod=Math.max(1,...periodRows.map(x=>x.amount));
  const ranked=users.map(u=>({u,m:getUserAccountMetrics(u.username),e:analyticsEffectiveness(u)})).sort((a,b)=>b.e.score-a.e.score);
  const maxLent=Math.max(1,...ranked.map(x=>x.m?.totalLent||0));
  const maxCollected=Math.max(1,...ranked.map(x=>x.m?.totalCollected||0));
  const totalLent=ranked.reduce((s,x)=>s+Number(x.m?.totalLent||0),0);
  const totalCollected=ranked.reduce((s,x)=>s+Number(x.m?.totalCollected||0),0);
  const avgScore=ranked.length?ranked.reduce((s,x)=>s+x.e.score,0)/ranked.length:0;
  return `
  <div class="analytics-dashboard" dir="${state.lang==='en'?'ltr':'rtl'}">
  <div class="notice" style="background:#ecfdf5;color:#166534">${tx('لوحة مقارنة إدارية. التحليلات السنوية ونصف السنوية مبنية على حدود السنوات التحصيلية المعتمدة. مؤشر الفعالية يعطي الوزن الأكبر للتحصيل الفعلي مقارنة بالتحصيل المتوقع خلال آخر 6 أشهر.','Administrative comparison dashboard. Annual and semiannual analytics are based on the approved collection-year boundaries. The effectiveness score gives the greatest weight to actual collections versus expected collections over the last 6 months.')}</div>
  <div class="grid cards">
    ${metricCard(tx('إجمالي المبالغ المقرضة','Total Amount Lent'),wholeMoney(totalLent))}
    ${metricCard(tx('إجمالي المبالغ المحصلة','Total Amount Collected'),wholeMoney(totalCollected))}
    ${metricCard(tx('متوسط فعالية المستخدمين','Average User Effectiveness'),percentDisplay(avgScore,0))}
    ${metricCard(tx('عدد المستخدمين','Number of Users'),arNum(users.length))}
  </div>
  <div class="card" style="margin-top:18px">
    <div class="toolbar" style="margin:0"><h3 style="margin:0">${tx('نمو القروض حسب السنة التحصيلية','Loan Growth by Collection Year')}</h3><div class="actions"><button class="btn ${mode==='year'?'btn-primary':'btn-secondary'} analyticsMode" data-mode="year">${tx('سنوي','Annual')}</button><button class="btn ${mode==='half'?'btn-primary':'btn-secondary'} analyticsMode" data-mode="half">${tx('نصف سنوي','Semiannual')}</button></div></div>
    <div style="display:grid;gap:12px;margin-top:16px">${periodRows.map((r,idx)=>{const prev=idx?periodRows[idx-1].amount:0;const growth=prev?((r.amount-prev)/prev*100):null;return `<div style="display:grid;grid-template-columns:minmax(130px,.5fr) minmax(260px,2fr) minmax(120px,.5fr);gap:12px;align-items:center"><strong class="analytics-number">${r.label}</strong>${analyticsBar(r.amount,maxPeriod,`${wholeMoney(r.amount)} — ${arNum(r.count)} ${analyticsLoanCountLabel(r.count)}`)}<span style="font-weight:800;color:${growth===null?'#64748b':growth>=0?'#15803d':'#b91c1c'}">${growth===null?'—':(growth>=0?'+':'')+percentDisplay(growth,1)}</span></div>`}).join('')}</div>
  </div>
  <div class="card" style="margin-top:18px;padding:0;overflow:hidden">
    <div style="padding:16px 18px;font-weight:800;font-size:18px;background:#ecfdf5;color:#166534">${tx('ترتيب فعالية المستخدمين','User Effectiveness Ranking')}</div>
    <div class="table-wrap"><table style="min-width:1200px"><thead><tr><th>${tx('الترتيب','Rank')}</th><th>${tx('المستخدم','User')}</th><th>${tx('مؤشر الفعالية','Effectiveness Score')}</th><th>${tx('التحصيل / المتوقع (6 أشهر)','Collected / Expected (6 Months)')}</th><th>${tx('نسبة إغلاق القروض','Loan Closure Rate')}</th><th>${tx('إجمالي المقرض','Total Lent')}</th><th>${tx('إجمالي المحصل','Total Collected')}</th><th>${tx('القروض النشطة','Active Loans')}</th></tr></thead><tbody>
    ${ranked.map((x,i)=>`<tr><td><strong class="analytics-number">${arNum(i+1)}</strong></td><td><strong>${x.u.username}</strong></td><td><strong style="font-size:18px;color:${x.e.score>=80?'#15803d':x.e.score>=60?'#a16207':'#b91c1c'}">${percentDisplay(x.e.score,0)}</strong></td><td>${percentDisplay(x.e.collectionRate,0)}<div class="small muted">${wholeMoney(x.e.actual6)} / ${wholeMoney(x.e.expected6)}</div></td><td>${percentDisplay(x.e.closeRate,0)}</td><td>${wholeMoney(x.m.totalLent)}${analyticsBar(x.m.totalLent,maxLent,'')}</td><td>${wholeMoney(x.m.totalCollected)}${analyticsBar(x.m.totalCollected,maxCollected,'')}</td><td class="analytics-number">${arNum(x.m.activeCount)}</td></tr>`).join('')}
    </tbody></table></div>
  </div>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:18px;margin-top:18px">
    <div class="card">
      <h3 style="margin-top:0">${tx('توزيع المحفظة النشطة بين المستخدمين','Active Portfolio Distribution by User')}</h3>
      <div class="small muted" style="margin-bottom:12px">${tx('نسبة كل مستخدم من إجمالي مبالغ القروض النشطة.','Each user’s share of total active-loan amounts.')}</div>
      ${analyticsDonut(ranked.map(x=>({label:x.u.username,value:state.loans.filter(l=>l.assignedUserId===x.u.id&&l.dbStatus==='active').reduce((s,l)=>s+Number(l.amount||0),0)})).filter(x=>x.value>0),tx('المحفظة','Portfolio'))}
    </div>
    <div class="card">
      <h3 style="margin-top:0">${tx('مقارنة مؤشر الفعالية','Effectiveness Score Comparison')}</h3>
      <div class="small muted" style="margin-bottom:16px">${tx('مقارنة مرئية سريعة لأداء المستخدمين وفق التحصيل والإغلاق والنشاط.','Quick visual comparison of user performance based on collections, closures, and activity.')}</div>
      ${analyticsScoreBars(ranked)}
    </div>
  </div>
  <div class="card" style="margin-top:18px">
    <h3 style="margin-top:0">${tx('مؤشرات إدارية مقترحة','Suggested Management Indicators')}</h3>
    <div class="grid cards">
      ${metricCard(tx('أعلى فعالية','Highest Effectiveness'),ranked[0]?ranked[0].u.username+' — '+percentDisplay(ranked[0].e.score,0):'—')}
      ${metricCard(tx('أعلى تحصيل آخر 6 أشهر','Highest Collections – Last 6 Months'),ranked.length?[...ranked].sort((a,b)=>b.e.actual6-a.e.actual6)[0].u.username:'—')}
      ${metricCard(tx('أكبر محفظة نشطة','Largest Active Portfolio'),ranked.length?[...ranked].sort((a,b)=>b.m.activeLent-a.m.activeLent)[0].u.username:'—')}
      ${metricCard(tx('أعلى نسبة إغلاق','Highest Closure Rate'),ranked.length?[...ranked].sort((a,b)=>b.e.closeRate-a.e.closeRate)[0].u.username:'—')}
    </div>
  </div>
  </div>`;
}
