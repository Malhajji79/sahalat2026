async function loadSystemSettings(){
  const {data,error}=await supabaseClient
    .from('system_settings')
    .select('id,max_loan_amount,max_loan_months,user_share_percent,owner_share_percent,admin_analytics_enabled,updated_by,updated_at')
    .order('id',{ascending:true})
    .limit(1)
    .maybeSingle();

  if(error) throw error;
  if(!data) throw new Error('إعدادات النظام غير موجودة في جدول system_settings.');

  state.systemSettingsId=data.id;
  state.maxLoan=Number(data.max_loan_amount||0);
  state.maxMonths=Number(data.max_loan_months||0);
  state.userSharePercent=Number(data.user_share_percent||0);
  state.ownerSharePercent=Number(data.owner_share_percent||0);
  state.adminAnalyticsEnabled=data.admin_analytics_enabled===true;

  if(state.maxLoan<=0) throw new Error('الحد الأعلى للقرض في إعدادات النظام غير صحيح.');
  if(state.maxMonths<=0) throw new Error('الحد الأعلى لمدة القرض في إعدادات النظام غير صحيح.');
  if(state.userSharePercent<0 || state.ownerSharePercent<0){
    throw new Error('نسب توزيع الفائدة في إعدادات النظام غير صحيحة.');
  }
}

