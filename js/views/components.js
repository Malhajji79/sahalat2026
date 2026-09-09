function metricCard(title, value, note=''){
  return html`<div class="card"><div class="muted">${title}</div><div class="kpi" style="font-size:21px">${value}</div>${note?html`<div class="small muted" style="margin-top:7px">${note}</div>`:''}</div>`;
}



;
function analyticsLoanCountLabel(n){
  const count=Number(n||0);
  return state.lang==='en' ? (count===1?'loan':'loans') : 'قرض';
}
function analyticsBar(value,max,label){
  const pct=max>0?Math.max(0,Math.min(100,value/max*100)):0;
  return html`<div style="min-width:180px"><div style="height:10px;background:#e5e7eb;border-radius:999px;overflow:hidden"><div style="height:100%;width:${pct}%;background:#16a34a;border-radius:999px"></div></div><div class="small muted" style="margin-top:4px">${label}</div></div>`;
}

function analyticsDonut(items,title){
  const total=items.reduce((s,x)=>s+Number(x.value||0),0);
  if(total<=0) return html`<div class="muted">${tx('لا توجد بيانات كافية للرسم.','Not enough data to display the chart.')}</div>`;
  const palette=['#166534','#22c55e','#86efac','#0f766e','#14b8a6','#84cc16','#4d7c0f','#a3e635'];
  let offset=0;
  const rings=htmlJoin(items.map((x,i)=>{const pct=Number(x.value||0)/total*100;const el=html`<circle cx="60" cy="60" r="45" fill="none" stroke="${palette[i%palette.length]}" stroke-width="18" pathLength="100" stroke-dasharray="${pct} ${100-pct}" stroke-dashoffset="${-offset}" transform="rotate(-90 60 60)"/>`;offset+=pct;return el;}));
  return html`<div style="display:grid;grid-template-columns:minmax(170px,.8fr) minmax(220px,1.2fr);gap:18px;align-items:center">
    <div style="text-align:center"><svg viewBox="0 0 120 120" style="width:170px;max-width:100%">${rings}<circle cx="60" cy="60" r="32" fill="white"/><text x="60" y="57" text-anchor="middle" font-size="11" font-weight="800" fill="#166534">${title}</text><text x="60" y="72" text-anchor="middle" font-size="12" font-weight="900" fill="#111827">${wholeMoney(total)}</text></svg></div>
    <div style="display:grid;gap:8px">${htmlJoin(items.map((x,i)=>html`<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${palette[i%palette.length]};margin-left:7px"></span>${x.label}</span><strong>${percentDisplay(Number(x.value||0)/total*100,1)}</strong></div>`))}</div>
  </div>`;
}
function analyticsScoreBars(ranked){
  return html`<div style="display:grid;gap:11px">${htmlJoin(ranked.map(x=>html`<div style="display:grid;grid-template-columns:minmax(150px,.8fr) minmax(220px,2fr) 60px;gap:10px;align-items:center"><strong style="font-size:clamp(.95rem,1.25vw,1.12rem)">${x.u.username}</strong><div style="height:16px;background:#e5e7eb;border-radius:999px;overflow:hidden"><div style="height:100%;width:${Math.max(0,Math.min(100,x.e.score))}%;background:${x.e.score>=80?'#16a34a':x.e.score>=60?'#ca8a04':'#dc2626'}"></div></div><strong class="analytics-number">${percentDisplay(x.e.score,0)}</strong></div>`))}</div>`;
}

;
function adminUsersFinancialSummaryTable(){
  const users=state.users.filter(u=>u.role!=='أدمن');

  // Keep all users in the calculations, even when inactive columns are hidden.
  const userMetrics=users.map(u=>({
    user:u,
    metric:getUserAccountMetrics(u.username),
    inactive:u.status!=='نشط'
  })).filter(x=>x.metric);

  const rows=[
    [tx('المبلغ الأساسي','Base Capital'),'baseCapital','money'],
    [tx('مجموع المبلغ المقرض','Total Lent'),'totalLent','money'],
    [tx('المبلغ المحصل','Total Collected'),'totalCollected','money'],
    [tx('المبلغ المتوفر في البنك','Available Bank Balance'),'bankAfterCollection','money'],
    [tx('حق المستخدم المستهدف','Target User Share'),'targetUserRight','money'],
    [tx('حق المستخدم المحقق','Realized User Share'),'realizedUserRight','money'],
    [tx('حق المالك المستهدف','Target Owner Share'),'targetOwnerRight','money'],
    [tx('حق المالك المحقق','Realized Owner Share'),'realizedOwnerRight','money'],
    [tx('المبلغ المحول للمستخدم','Transferred to User'),'transferredUser','money'],
    [tx('المبلغ المحول للمالك','Transferred to Owner'),'transferredOwner','money'],
    [tx('عدد القروض النشطة','Active Loans'),'activeCount','count'],
    [tx('مجموع التحصيل الشهري المتوقع','Expected Monthly Collection'),'expectedMonthlyCollection','money'],
    [tx('المبلغ المتوقع للتصفية النهائية','Expected Final Settlement'),'finalSettlementTotal','money']
  ];

  const format=(value,type)=>type==='count'
    ? String(Math.round(Number(value||0)))
    : wholeMoney(Number(value||0));

  const valueStyle=(value,type)=>{
    if(type==='count') return '';
    return Number(value||0)<0 ? 'color:#b91c1c;font-weight:800' : '';
  };

  const inactiveCount=userMetrics.filter(x=>x.inactive).length;

  return html`
    <div class="card" style="margin-top:20px;padding:0;overflow:hidden">
      <div style="padding:14px 18px;background:#ecfdf5;border-bottom:1px solid #d1fae5;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <div style="font-weight:900;font-size:clamp(18px,1.5vw,22px);color:#166534">
          ${tx('الملخص المالي للمستخدمين','Users Financial Summary')}
        </div>
        ${inactiveCount?html`
          <button
            id="toggleInactiveFinancialUsersBtn"
            class="btn btn-secondary"
            type="button"
            aria-expanded="false"
            onclick="toggleInactiveFinancialUsers()"
            style="font-weight:900">
            ${tx('إظهار المستخدمين غير النشطين','Show Inactive Users')}
          </button>`:''}
      </div>

      <div class="table-wrap" style="border:0;border-radius:0">
        <table class="admin-financial-summary" style="min-width:1550px">
          <thead>
            <tr>
              <th style="position:sticky;right:0;z-index:3;background:#f8fafc;min-width:210px">${tx('البيان','Item')}</th>
              ${htmlJoin(userMetrics.map(x=>html`
                <th
                  class="${x.inactive?'inactive-financial-user':''}"
                  style="min-width:150px;text-align:center;${x.inactive?'display:none;background:#f8fafc;color:#64748b':''}">
                  ${x.user.username}${x.inactive?html`<div class="small" style="margin-top:3px">${tx('غير نشط','Inactive')}</div>`:''}
                </th>`))}
              <th style="min-width:165px;text-align:center;background:#dcfce7;color:#14532d;font-size:20px;font-weight:900">${tx('المجاميع','Totals')}</th>
            </tr>
          </thead>
          <tbody>
            ${htmlJoin(rows.map(([label,key,type])=>{
              // IMPORTANT: totals always include active + inactive users.
              const total=userMetrics.reduce((sum,x)=>sum+Number(x.metric?.[key]||0),0);
              return html`<tr>
                <td style="position:sticky;right:0;z-index:2;background:#fff;font-weight:700;white-space:nowrap">${label}</td>
                ${htmlJoin(userMetrics.map(x=>html`
                  <td
                    class="${x.inactive?'inactive-financial-user':''}"
                    style="text-align:center;white-space:nowrap;${x.inactive?'display:none;background:#fafafa;':''}${valueStyle(x.metric?.[key],type)}">
                    ${format(x.metric?.[key],type)}
                  </td>`))}
                <td style="text-align:center;font-size:19px;font-weight:900;white-space:nowrap;background:#dcfce7;color:${type!=='count'&&total<0?'#b91c1c':'#14532d'}">${format(total,type)}</td>
              </tr>`;
            }))}
          </tbody>
        </table>
      </div>

      <div class="small muted" style="padding:10px 16px;border-top:1px solid var(--border)">
        ${tx('المستخدمون غير النشطين مخفيون افتراضيًا لتسهيل القراءة، بينما تبقى مبالغهم محسوبة بالكامل ضمن عمود المجاميع.','Inactive users are hidden by default for easier reading, while their amounts remain fully included in the Totals column.')}
      </div>
    </div>`;
}


