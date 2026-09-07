function dbCapitalTypeToUi(type){
  return type==='owner_to_user' ? 'owner-to-user'
    : type==='user_to_owner' ? 'user-to-owner'
    : type==='user_to_user' ? 'user-to-user'
    : type==='edit' ? 'edit'
    : type==='delete' ? 'delete'
    : type;
}

function dbCapitalTypeLabel(type){
  return type==='owner_to_user' ? 'إضافة من المالك'
    : type==='user_to_owner' ? 'خصم إلى المالك'
    : type==='user_to_user' ? 'تحويل بين مستخدمين'
    : type==='edit' ? 'تعديل حركة رأس مال'
    : type==='delete' ? 'إلغاء حركة رأس مال'
    : type;
}

function mapDbCapitalMovement(m, usersById){
  const fromUser = m.from_user_id ? usersById.get(m.from_user_id) : null;
  const toUser = m.to_user_id ? usersById.get(m.to_user_id) : null;
  const creator = usersById.get(m.created_by);

  return {
    id: m.id,
    dbId: m.id,
    entryKind: m.movement_type==='delete' ? 'deletion'
      : m.movement_type==='edit' ? 'edit'
      : 'transfer',
    status: m.status,
    date: m.movement_date,
    from: m.from_user_id ? (fromUser?.username || 'مستخدم آخر') : 'المالك',
    to: m.to_user_id ? (toUser?.username || 'مستخدم آخر') : 'المالك',
    fromUserId: m.from_user_id,
    toUserId: m.to_user_id,
    amount: Number(m.amount||0),
    type: dbCapitalTypeToUi(m.movement_type),
    dbType: m.movement_type,
    typeLabel: dbCapitalTypeLabel(m.movement_type),
    note: m.note||'',
    createdBy: creator?.username || (m.created_by===state.currentUser?.id ? state.currentUser.username : 'مستخدم آخر'),
    createdById: m.created_by,
    lastEditedById: m.last_edited_by,
    lastEditedAt: m.last_edited_at,
    deletedById: m.deleted_by,
    deletedAt: m.deleted_at,
    deleteReason: m.delete_reason||'',
    relatedMovementId: m.related_movement_id,
    createdAt: m.created_at
  };
}

async function loadCapitalMovementsFromDatabase(){
  const {data,error}=await supabaseClient
    .from('capital_movements')
    .select(`
      id,movement_type,from_user_id,to_user_id,amount,movement_date,note,status,
      related_movement_id,created_by,last_edited_by,last_edited_at,
      deleted_by,deleted_at,delete_reason,created_at
    `)
    .order('created_at',{ascending:true});

  if(error) throw error;

  const usersById=new Map(state.users.map(u=>[u.id,u]));
  if(state.currentUser && !usersById.has(state.currentUser.id)){
    usersById.set(state.currentUser.id,state.currentUser);
  }

  state.capitalTransfers=(data||[]).map(m=>mapDbCapitalMovement(m,usersById));
}


async function loadCapitalHistoryFromDatabase(){
  const {data,error}=await supabaseClient
    .from('capital_movement_history')
    .select('id,source_seq,to_name,from_name,deduct_amount,add_amount,movement_date,recorded_name,source_name,imported_at')
    .eq('source_name','Update Total')
    .order('source_seq',{ascending:true});

  if(error){
    console.error('capital_movement_history load error:',error);
    throw error;
  }

  state.capitalHistory=(data||[]).map(r=>({
    id:r.id,
    seq:Number(r.source_seq||0),
    to:r.to_name||'—',
    from:r.from_name||'—',
    deduct:Number(r.deduct_amount||0),
    add:Number(r.add_amount||0),
    date:r.movement_date||'',
    name:r.recorded_name||'—',
    source:r.source_name||'Update Total'
  }));
}


