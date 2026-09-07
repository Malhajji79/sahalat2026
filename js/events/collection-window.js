function currentCollectionWindow(){
  const now=new Date();
  const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const day=today.getDate();

  // دورة التحصيل الشهرية المعتمدة: من 26 إلى 5 من الشهر التالي.
  if(day>=26){
    return {
      start:new Date(today.getFullYear(),today.getMonth(),26),
      end:new Date(today.getFullYear(),today.getMonth()+1,5)
    };
  }
  if(day<=5){
    return {
      start:new Date(today.getFullYear(),today.getMonth()-1,26),
      end:new Date(today.getFullYear(),today.getMonth(),5)
    };
  }
  return null;
}

function hasPaymentInCurrentCollectionWindow(loan){
  const window=currentCollectionWindow();
  if(!window) return false;

  return (loan.payments||[]).some(p=>{
    const raw=p.date||p.paymentDate||p.payment_date;
    if(!raw) return false;

    // Parse Gregorian YYYY-MM-DD locally to avoid timezone date shifts.
    const m=String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(!m) return false;
    const paymentDate=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
    return paymentDate>=window.start && paymentDate<=window.end;
  });
}


