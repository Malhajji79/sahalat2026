function canManageUsers(){ return state.currentUser?.role === 'أدمن'; }
function canChangeLimits(){ return ['أدمن','مدير مشروع'].includes(state.currentUser?.role); }

function canAccessAnalytics(){
  if(!state.currentUser) return false;
  if(state.currentUser.role==='مدير مشروع' || state.currentUser.role==='مدير المشروع') return true;
  if(state.currentUser.role==='أدمن') return state.adminAnalyticsEnabled===true;
  return false;
}

