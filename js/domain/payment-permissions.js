function paymentActionDeadline(p){
  if(!p) return 0;
  const stamp=p.lastEditedAt || p.createdAt;
  return (stamp ? new Date(stamp).getTime() : 0) + 24*60*60*1000;
}

function privilegedPaymentActionDeadline(p){
  if(!p || !p.createdAt) return 0;
  // للأدمن والمدير: خمسة أيام من created_at الأصلي، والتعديل لا يجدد المهلة.
  return new Date(p.createdAt).getTime() + 5*24*60*60*1000;
}

function paymentActionWindowOpen(p){
  return !!p && Date.now() <= paymentActionDeadline(p);
}

function privilegedPaymentActionWindowOpen(p){
  return !!p && Date.now() <= privilegedPaymentActionDeadline(p);
}

function isPaymentPrivilegedRole(){
  return !!state.currentUser && ['أدمن','مدير مشروع','مدير المشروع'].includes(state.currentUser.role);
}

function lastActivePayment(l){
  if(!l || !Array.isArray(l.payments) || !l.payments.length) return null;
  return l.payments[l.payments.length-1];
}

function canModifyLastPayment(l,p){
  if(!l || !p || !state.currentUser) return false;

  // الأدمن ومدير المشروع: أي دفعة لأي مستخدم خلال 5 أيام من إنشائها،
  // بما في ذلك دفعات القروض التي أصبحت مغلقة/مسددة.
  if(isPaymentPrivilegedRole()) return privilegedPaymentActionWindowOpen(p);

  // المستخدم العادي: نفس القاعدة القديمة، آخر دفعة سجلها فقط وخلال 24 ساعة.
  const last=lastActivePayment(l);
  if(!last || last.id!==p.id) return false;
  if(p.createdById!==state.currentUser.id) return false;
  return paymentActionWindowOpen(p);
}


