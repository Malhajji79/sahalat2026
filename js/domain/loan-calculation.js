const RATES = {
1:3.00,2:3.60,3:5.40,4:7.20,5:9.00,6:10.80,7:12.60,8:14.40,9:16.20,10:18.00,11:19.80,12:20.00,
13:20.58,14:21.17,15:21.75,16:22.33,17:22.92,18:23.50,19:24.08,20:24.67,21:25.25,22:25.83,23:26.42,24:27.00,
25:27.58,26:28.17,27:28.75,28:29.33,29:29.92,30:30.50,31:31.08,32:31.67,33:32.25,34:32.83,35:33.42,36:34.00
};



function calcLoan(amount, months, generalDiscount, userDiscount, adminDiscount, sharePercentages){
  // نحفظ الحساب الدقيق داخليًا، لكن العرض والسداد الدوري يكونان بالريال الصحيح فقط.
  const baseRate = RATES[months] || 0;
  const baseInterest = amount * baseRate/100;
  const afterGeneral = baseInterest * (1-generalDiscount/100);
  const userShare = Number(sharePercentages?.user ?? (state.userSharePercent||40)) / 100;
  const ownerShare = Number(sharePercentages?.owner ?? (state.ownerSharePercent||60)) / 100;
  const userGross = afterGeneral * userShare;
  const adminGross = afterGeneral * ownerShare;
  const userNet = userGross * (1-userDiscount/100);
  const adminNet = adminGross * (1-adminDiscount/100);
  const finalInterest = userNet + adminNet;
  const total = amount + finalInterest;

  // القسط الدوري بدون كسور: نأخذ الريال الصحيح.
  const installmentExact = months ? total/months : 0;
  const installment = whole(installmentExact);

  // مجموع الأقساط الصحيحة، ثم الفرق الحقيقي يذهب إلى مستحق التصفية الأخير.
  const scheduledWholePayments = installment * months;
  const settlementDue = Math.max(0, total - scheduledWholePayments);

  return {
    baseRate,baseInterest,afterGeneral,userGross,adminGross,userNet,adminNet,
    finalInterest,total,installmentExact,installment,scheduledWholePayments,settlementDue
  };
}



