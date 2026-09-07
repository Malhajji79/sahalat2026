function bindAccounts(){
  const analyticsPermissionBtn=document.getElementById('toggleAdminAnalyticsBtn');
  if(analyticsPermissionBtn){
    analyticsPermissionBtn.onclick=async()=>{
      const status=document.getElementById('analyticsPermissionStatus');
      const next=!state.adminAnalyticsEnabled;
      analyticsPermissionBtn.disabled=true;
      if(status){
        status.style.color='#475569';
        status.textContent=tx('جاري حفظ الصلاحية...','Saving access setting...');
      }
      try{
        const {error}=await supabaseClient
          .from('system_settings')
          .update({admin_analytics_enabled:next,updated_by:state.currentUser?.id||null})
          .eq('id',state.systemSettingsId);
        if(error) throw error;
        state.adminAnalyticsEnabled=next;
        if(status){
          status.style.color='#166534';
          status.textContent=next?tx('تمت إضافة لوحة التحليلات لحساب الأدمن.','Analytics access was granted to Admin.'):tx('تم إخفاء لوحة التحليلات عن حساب الأدمن.','Analytics access was removed from Admin.');
        }
        setTimeout(()=>render(),500);
      }catch(e){
        console.error(e);
        analyticsPermissionBtn.disabled=false;
        if(status){
          status.style.color='#b91c1c';
          status.textContent=e?.message||tx('تعذر تعديل الصلاحية.','Unable to update access setting.');
        }
      }
    };
  }

  const sel=document.getElementById('accountUserSelect');
  if(sel) sel.onchange=()=>{
    state.accountUser=sel.value;
    render();
  };

  const edit=document.getElementById('editAccountValues');
  if(edit) edit.onclick=()=>{
    state.page='edit-account-values';
    render();
  };
}


