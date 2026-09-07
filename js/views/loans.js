function loansView(){
  const scopedLoans = visibleLoansForCurrentUser();
  const {creators,types}=loanFilterOptions();

  const isManager=['مدير مشروع','مدير المشروع'].includes(state.currentUser?.role);
  const activeLoans=scopedLoans
    .filter(l=>l.status==='نشط')
    .sort((a,b)=>{
      const aPaid=hasPaymentInCurrentCollectionWindow(a);
      const bPaid=hasPaymentInCurrentCollectionWindow(b);

      // Manager view priority:
      // 1) Loans created by the manager that have NOT paid in the current 26→5 window.
      // 2) Other unpaid loans.
      // 3) Loans that paid in the current window (green rows) at the bottom.
      if(isManager){
        const aOwnUnpaid=!aPaid && (String(a.createdById||'')===String(state.currentUser?.id||''));
        const bOwnUnpaid=!bPaid && (String(b.createdById||'')===String(state.currentUser?.id||''));
        const aRank=aOwnUnpaid?0:(!aPaid?1:2);
        const bRank=bOwnUnpaid?0:(!bPaid?1:2);
        if(aRank!==bRank) return aRank-bRank;
        return 0;
      }

      const aPaidRank=aPaid?1:0;
      const bPaidRank=bPaid?1:0;
      if(aPaidRank!==bPaidRank) return aPaidRank-bPaidRank;
      return 0;
    });
  const otherLoans=scopedLoans.filter(l=>l.status!=='نشط' && l.status!=='مغلق');
  const closedLoans=scopedLoans.filter(l=>l.status==='مغلق').sort((a,b)=>{
    const aPaid=hasPaymentInCurrentCollectionWindow(a)?1:0;
    const bPaid=hasPaymentInCurrentCollectionWindow(b)?1:0;
    if(aPaid!==bPaid) return aPaid-bPaid;
    return 0;
  });

  const loanRows=(loans)=>loans.map(l=>{
    const paid = Number(l.paid||0);
    const remaining = Math.max(0, Number(l.total||0)-paid);
    const paidInWindow=hasPaymentInCurrentCollectionWindow(l);
    return `<tr class="${paidInWindow?'loan-paid-current-window':''}" data-loan-id="${l.id}" data-loan-creator="${String(l.createdBy||'').replace(/"/g,'&quot;')}" data-loan-type="${String(l.type||'').replace(/"/g,'&quot;')}">
      <td><button class="btn btn-secondary openLoan" data-id="${l.id}">${l.id}</button></td>
      <td>${l.beneficiary}</td>
      <td>${l.createdBy || '—'}</td>
      <td>${displayLoanType(l.type)}</td>
      <td>${wholeMoney(l.amount)}</td>
      <td>${wholeMoney(paid)}</td>
      <td>${wholeMoney(remaining)}</td>
      <td><span class="status ${l.status==='نشط'?'active':l.status==='مغلق'?'active':l.status.includes('بانتظار')?'pending':'rejected'}">${displayLoanStatus(l.status)}</span></td>
      <td>
        ${(state.currentUser.role==='أدمن' && l.status.includes('بانتظار'))?`<button class="btn btn-success reviewLoan" data-id="${l.id}">${tx('مراجعة واعتماد','Review & Approve')}</button>`:''}
        ${(state.currentUser.role!=='أدمن' && l.status==='نشط')?`<button class="btn ${paidInWindow?'btn-success':'btn-primary'} payLoan" data-id="${l.id}">${tx('تسجيل دفعة','Record Payment')}</button>`:''}
        ${(!l.status.includes('بانتظار') && l.status!=='نشط')?'—':''}
      </td>
    </tr>`;
  }).join('');

  const tableHead=`<table><thead><tr><th>${tx('رقم القرض','Loan No.')}</th><th>${tx('المستفيد','Beneficiary')}</th><th>${tx('أنشأه','Created By')}</th><th>${tx('النوع','Type')}</th><th>${tx('المبلغ','Amount')}</th><th>${tx('المدفوع','Paid')}</th><th>${tx('المتبقي','Remaining')}</th><th>${tx('الحالة','Status')}</th><th>${tx('إجراء','Action')}</th></tr></thead>`;

  return `
    

    <div class="card" style="margin-bottom:16px">
      <div class="toolbar" style="margin:0">
        <div class="field" style="margin:0;min-width:220px;flex:1">
          <label>${tx('المنشئ','Creator')}</label>
          <select id="loanCreatorFilter">
            <option value="">${tx('الكل','All')}</option>
            ${creators.map(x=>`<option value="${x}">${x}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="margin:0;min-width:220px;flex:1">
          <label>${tx('النوع','Type')}</label>
          <select id="loanTypeFilter">
            <option value="">${tx('الكل','All')}</option>
            ${types.map(x=>`<option value="${x}">${x}</option>`).join('')}
          </select>
        </div>
        <div style="align-self:flex-end">
          <button class="btn btn-secondary" id="clearLoanFilters" type="button">${tx('مسح الفلاتر','Clear Filters')}</button>
        </div>
      </div>
      <div class="small muted" id="loanFilterSummary" style="margin-top:10px">${tx('عرض جميع القروض:','Showing all loans:')} ${scopedLoans.length}</div>
    </div>

    <div class="toolbar">
      <div class="muted">${tx('سجل القروض الحقيقي','Loan Register')}</div>
      ${state.currentUser.role!=='أدمن'?`<button class="btn btn-primary" onclick="state.page='new-loan';render()">+ ${tx('قرض جديد','New Loan')}</button>`:''}
    </div>

    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:14px 16px;background:#ecfdf5;border-bottom:1px solid #d1fae5;font-weight:800;color:#166534">
        ${tx('القروض النشطة','Active Loans')} <span class="small" id="activeLoansCount">(${activeLoans.length})</span>
      </div>
      <div class="table-wrap">
        ${tableHead}<tbody id="activeLoansBody">
          ${activeLoans.length?loanRows(activeLoans):`<tr class="empty-row"><td colspan="9" class="muted">${tx('لا توجد قروض نشطة.','No active loans.')}</td></tr>`}
        </tbody></table>
      </div>
    </div>

    ${otherLoans.length?`
      <div style="height:16px"></div>
      <div class="card" style="padding:0;overflow:hidden" id="otherLoansSection">
        <div style="padding:14px 16px;background:#fff7ed;border-bottom:1px solid #fed7aa;font-weight:800;color:#9a3412">
          ${tx('قروض بانتظار الإجراء','Loans Awaiting Action')} <span class="small" id="otherLoansCount">(${otherLoans.length})</span>
        </div>
        <div class="table-wrap">
          ${tableHead}<tbody id="otherLoansBody">${loanRows(otherLoans)}</tbody></table>
        </div>
      </div>
    `:''}

    <div style="height:22px;border-bottom:2px solid var(--border);margin-bottom:22px"></div>

    <div class="card" style="padding:0;overflow:hidden">
      <div style="padding:14px 16px;background:#f8fafc;border-bottom:1px solid var(--border);font-weight:800;color:#475569">
        ${tx('القروض المغلقة','Closed Loans')} <span class="small" id="closedLoansCount">(${closedLoans.length})</span>
      </div>
      <div class="table-wrap">
        ${tableHead}<tbody id="closedLoansBody">
          ${closedLoans.length?loanRows(closedLoans):`<tr class="empty-row"><td colspan="9" class="muted">${tx('لا توجد قروض مغلقة.','No closed loans.')}</td></tr>`}
        </tbody></table>
      </div>
    </div>`;
}

