// --- UTILITY FUNCTIONS ---
function getPovertyGuideline(familySize, stateOfResidence) {
  const basePovertyLine = 15060;
  const perMember = 5380;
  const multiplier = (stateOfResidence === 'AK' || stateOfResidence === 'HI') ? 1.25 : 1;
  return (basePovertyLine + (Math.max(0, familySize - 1) * perMember)) * multiplier;
}

function calculateDiscretionaryIncome(agi, familySize, stateOfResidence, povertyLineMultiplier = 1.5) {
  const povertyGuideline = getPovertyGuideline(familySize, stateOfResidence);
  return Math.max(0, agi - (povertyGuideline * povertyLineMultiplier));
}

function calculateAmortizedPayment(principal, annualRate, years) {
  if (principal <= 0 || years <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const numberOfPayments = years * 12;
  if (monthlyRate <= 0) return principal / numberOfPayments;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
}

// --- SIMULATION ENGINES ---

function simulateIDR({ principal, annualRate, forgivenessYears, initialAgi, familySize, stateOfResidence, povertyMultiplier, paymentPercentage }) {
  let balance = principal;
  let totalPaid = 0;
  let currentAgi = initialAgi;
  const monthlyRate = annualRate / 12;
  const forgivenessMonths = forgivenessYears * 12;

  for (let month = 1; month <= forgivenessMonths; month++) {
    if (balance <= 0) {
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + month - 1);
      return { totalPaid, payoffDate, monthlyPayment: (calculateDiscretionaryIncome(initialAgi, familySize, stateOfResidence, povertyMultiplier) * paymentPercentage) / 12 };
    }

    if (month > 1 && (month - 1) % 12 === 0) {
      currentAgi *= 1.03; // 3% annual income growth
    }

    const discretionaryIncome = calculateDiscretionaryIncome(currentAgi, familySize, stateOfResidence, povertyMultiplier);
    const monthlyPayment = (discretionaryIncome * paymentPercentage) / 12;

    const interest = balance * monthlyRate;
    const principalPaid = monthlyPayment - interest;

    balance += interest; // Accrue interest
    balance -= monthlyPayment; // Apply payment
    totalPaid += monthlyPayment;

    if (balance < 0) balance = 0;
  }

  return { totalPaid, forgivenessDate: new Date(new Date().setFullYear(new Date().getFullYear() + forgivenessYears)), monthlyPayment: (calculateDiscretionaryIncome(initialAgi, familySize, stateOfResidence, povertyMultiplier) * paymentPercentage) / 12 };
}

function simulateRAP({ principal, annualRate, initialAgi, familySize, stateOfResidence, filingStatus }) {
  let balance = principal;
  let totalPaid = 0;
  let currentAgi = initialAgi;
  const monthlyRate = annualRate / 12;
  const forgivenessMonths = 30 * 12;

  const getRAPPaymentPercentage = (agi) => {
      if (agi <= 10000) return 0;
      if (agi <= 20000) return 0.01; 
      if (agi <= 30000) return 0.02;
      if (agi <= 40000) return 0.03; 
      if (agi <= 50000) return 0.04;
      if (agi <= 60000) return 0.05; 
      if (agi <= 70000) return 0.06;
      if (agi <= 80000) return 0.07; 
      if (agi <= 90000) return 0.08;
      if (agi <= 100000) return 0.09;
      return 0.10;
  };

  const dependents = filingStatus === 'single' ? Math.max(0, familySize - 1) : Math.max(0, familySize - 2);

  for (let month = 1; month <= forgivenessMonths; month++) {
    if (balance <= 0) {
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + month - 1);
      return { totalPaid, payoffDate, monthlyPayment: Math.max(10, ((initialAgi * getRAPPaymentPercentage(initialAgi)) - (dependents * 50)) / 12) };
    }

    if (month > 1 && (month - 1) % 12 === 0) {
        currentAgi *= 1.03;
    }
    
    const annualPayment = (currentAgi * getRAPPaymentPercentage(currentAgi)) - (dependents * 50);
    const monthlyPayment = Math.max(10, annualPayment / 12);
    const interest = balance * monthlyRate;
    const paymentApplied = Math.min(monthlyPayment, balance + interest);
    
    const principalPaid = Math.max(0, paymentApplied - interest);
    let finalPrincipalReduction = principalPaid;
    
    if (principalPaid < 50) {
         const shortfall = 50 - principalPaid;
         balance -= shortfall; // Apply principal reduction guarantee
    }

    balance += interest; // Accrue Interest
    balance -= paymentApplied; // Apply Payment
    
    if (balance < 0) balance = 0;
    totalPaid += paymentApplied;
  }

  return { totalPaid, forgivenessDate: new Date(new Date().setFullYear(new Date().getFullYear() + 30)), monthlyPayment: Math.max(10, ((initialAgi * getRAPPaymentPercentage(initialAgi)) - (dependents * 50)) / 12) };
}

// --- MAIN EXPORTED FUNCTION ---

export const calculatePlans = (financialProfile, loans) => {
  const totalFederalBalance = loans.reduce((acc, loan) => acc + parseFloat(loan.balance || 0), 0);
  if (totalFederalBalance === 0) return {};

  const weightedAverageRate = loans.reduce((acc, loan) => acc + (parseFloat(loan.balance || 0) * (parseFloat(loan.rate || 0) / 100)), 0) / totalFederalBalance;
  const { agi, familySize, stateOfResidence, filingStatus } = financialProfile;

  const plans = {};

  // Standard Plans
  const standardMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 10);
  plans['10-Year Standard'] = { monthlyPayment: standardMonthly, totalPaid: standardMonthly * 120, payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)) };

  let graduatedBalance = totalFederalBalance;
  let graduatedTotalPaid = 0;
  let graduatedCurrentPayment = standardMonthly; // This will be adjusted in the loop
  for (let year = 0; year < 10; year++) {
    const paymentMultiplier = Math.floor(year / 2);
    graduatedCurrentPayment = Math.min(standardMonthly * Math.pow(1.2, paymentMultiplier), standardMonthly * 3);
    for (let month = 0; month < 12; month++) {
      if (graduatedBalance <= 0) break;
      const interest = graduatedBalance * (weightedAverageRate / 12);
      graduatedBalance += interest;
      const payment = Math.min(graduatedCurrentPayment, graduatedBalance);
      graduatedBalance -= payment;
      graduatedTotalPaid += payment;
    }
  }
  plans['Graduated'] = { monthlyPayment: `Starts at ~$${(standardMonthly * 0.7).toFixed(2)}, increases every 2 years`, totalPaid: graduatedTotalPaid, payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)) };

  if (totalFederalBalance >= 30000) {
    const extendedMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 25);
    plans['Extended'] = { monthlyPayment: extendedMonthly, totalPaid: extendedMonthly * 300, payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 25)) };
  }

  const getStandardizedTieredTerm = (balance) => {
    if (balance < 7500) return 10; 
    if (balance < 10000) return 12;
    if (balance < 20000) return 15; 
    if (balance < 40000) return 20;
    if (balance < 60000) return 25;
    return 30;
  }
  const tieredTerm = getStandardizedTieredTerm(totalFederalBalance);
  const tieredMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, tieredTerm);
  plans['Standardized Tiered Plan'] = { monthlyPayment: tieredMonthly, totalPaid: tieredMonthly * tieredTerm * 12, payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + tieredTerm)) };

  // IDR Plans
  const oldIbrResult = simulateIDR({ principal: totalFederalBalance, annualRate: weightedAverageRate, forgivenessYears: 25, initialAgi: agi, familySize, stateOfResidence, povertyMultiplier: 1.5, paymentPercentage: 0.15 });
  plans['Old IBR'] = { ...oldIbrResult, isIdr: true };

  const newIbrResult = simulateIDR({ principal: totalFederalBalance, annualRate: weightedAverageRate, forgivenessYears: 20, initialAgi: agi, familySize, stateOfResidence, povertyMultiplier: 1.5, paymentPercentage: 0.10 });
  plans['New IBR'] = { ...newIbrResult, isIdr: true };

  const payeResult = simulateIDR({ principal: totalFederalBalance, annualRate: weightedAverageRate, forgivenessYears: 20, initialAgi: agi, familySize, stateOfResidence, povertyMultiplier: 1.5, paymentPercentage: 0.10 });
  plans['PAYE'] = { ...payeResult, isIdr: true, sunset: new Date('2028-07-01') };

  const rapResult = simulateRAP({ principal: totalFederalBalance, annualRate: weightedAverageRate, initialAgi: agi, familySize, stateOfResidence, filingStatus });
  plans['RAP'] = { ...rapResult, isIdr: true };

  const icrMonthly = Math.min(
    (calculateDiscretionaryIncome(agi, familySize, stateOfResidence, 1.0) * 0.20) / 12,
    calculateAmortizedPayment(totalFederalBalance, weightedAverageRate * 1.2, 12)
  );
  const icrResult = simulateIDR({ principal: totalFederalBalance, annualRate: weightedAverageRate, forgivenessYears: 25, initialAgi: agi, familySize, stateOfResidence, povertyMultiplier: 1.0, paymentPercentage: 0.20 });
  plans['ICR'] = { monthlyPayment: icrMonthly, totalPaid: icrResult.totalPaid, forgivenessDate: icrResult.forgivenessDate, isIdr: true, sunset: new Date('2028-07-01')};

  return plans;
};