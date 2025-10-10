// --- UTILITY FUNCTIONS ---

function getPovertyGuideline(familySize, stateOfResidence) {
  const basePovertyLine = 15060;
  const perMember = 5380;
  const multiplier = (stateOfResidence === 'AK' || stateOfResidence === 'HI') ? 1.25 : 1;
  return (basePovertyLine + (Math.max(0, familySize - 1) * perMember)) * multiplier;
};

function calculateDiscretionaryIncome(agi, familySize, stateOfResidence, povertyLineMultiplier = 1.5) {
  const povertyGuideline = getPovertyGuideline(familySize, stateOfResidence);
  return Math.max(0, agi - (povertyGuideline * povertyLineMultiplier));
};

function calculateAmortizedPayment(principal, annualRate, years) {
  if (principal <= 0 || years <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const numberOfPayments = years * 12;
  if (monthlyRate <= 0) return principal / numberOfPayments;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
};

// --- SIMULATION ENGINES ---

function simulateIDR({ principal, annualRate, forgivenessYears, initialAgi, familySize, stateOfResidence, povertyMultiplier, paymentPercentage, standardPaymentCap }) {
  let balance = principal;
  let totalPaid = 0;
  let currentAgi = initialAgi;
  const monthlyRate = annualRate / 12;
  const forgivenessMonths = forgivenessYears * 12;
  
  const initialDiscretionary = calculateDiscretionaryIncome(initialAgi, familySize, stateOfResidence, povertyMultiplier);
  const initialMonthlyPayment = Math.min(standardPaymentCap, (initialDiscretionary * paymentPercentage) / 12);

  for (let month = 1; month <= forgivenessMonths; month++) {
    if (balance <= 0) {
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + month - 1);
      return { totalPaid, payoffDate, monthlyPayment: initialMonthlyPayment };
    }

    if (month > 1 && (month - 1) % 12 === 0) {
      currentAgi *= 1.03; // Apply 3% annual income growth
    }
    
    const discretionaryIncome = calculateDiscretionaryIncome(currentAgi, familySize, stateOfResidence, povertyMultiplier);
    const currentMonthlyPayment = Math.min(standardPaymentCap, (discretionaryIncome * paymentPercentage) / 12);
    
    const interest = balance * monthlyRate;
    balance += interest;
    
    const payment = Math.min(currentMonthlyPayment, balance);
    balance -= payment;
    totalPaid += payment;
  }

  return { totalPaid, forgivenessDate: new Date(new Date().setFullYear(new Date().getFullYear() + forgivenessYears)), monthlyPayment: initialMonthlyPayment };
}

function simulateRAP({ principal, annualRate, initialAgi, familySize, stateOfResidence, filingStatus, standardPaymentCap }) {
    let balance = principal;
    let totalPaid = 0;
    let currentAgi = initialAgi;
    const monthlyRate = annualRate / 12;
    const forgivenessMonths = 30 * 12;

    const getRAPPaymentPercentage = (agi) => {
        if (agi <= 10000) return 0;
        if (agi <= 20000) return 0.01; if (agi <= 30000) return 0.02;
        if (agi <= 40000) return 0.03; if (agi <= 50000) return 0.04;
        if (agi <= 60000) return 0.05; if (agi <= 70000) return 0.06;
        if (agi <= 80000) return 0.07; if (agi <= 90000) return 0.08;
        if (agi <= 100000) return 0.09;
        return 0.10;
    };

    const dependents = filingStatus === 'single' ? Math.max(0, familySize - 1) : Math.max(0, familySize - 2);
    const initialAnnualPayment = (initialAgi * getRAPPaymentPercentage(initialAgi)) - (dependents * 50);
    const initialMonthlyPayment = Math.min(standardPaymentCap, Math.max(10, initialAnnualPayment / 12));
    
    for (let month = 1; month <= forgivenessMonths; month++) {
        if (balance <= 0) {
            const payoffDate = new Date();
            payoffDate.setMonth(payoffDate.getMonth() + month - 1);
            return { totalPaid, payoffDate, monthlyPayment: initialMonthlyPayment };
        }

        if (month > 1 && (month - 1) % 12 === 0) {
            currentAgi *= 1.03;
        }
        
        const annualPayment = (currentAgi * getRAPPaymentPercentage(currentAgi)) - (dependents * 50);
        const monthlyPayment = Math.min(standardPaymentCap, Math.max(10, annualPayment / 12));

        const interest = balance * monthlyRate;
        const principalBeforePayment = balance;

        if (monthlyPayment < interest) {
            // Interest Subsidy: Unpaid interest is waived
        } else {
            balance += interest;
        }
        
        const paymentApplied = Math.min(monthlyPayment, balance);
        balance -= paymentApplied;
        totalPaid += paymentApplied;
        
        const principalPaid = principalBeforePayment + ( (monthlyPayment < interest) ? interest : 0 ) - balance;

        // $50 Principal Reduction Guarantee
        if (principalPaid < 50) {
             const shortfall = 50 - principalPaid;
             balance = Math.max(0, balance - shortfall);
        }
    }
    
    return { totalPaid, forgivenessDate: new Date(new Date().setFullYear(new Date().getFullYear() + 30)), monthlyPayment: initialMonthlyPayment };
}

// --- MAIN CALCULATION FUNCTION ---
export const calculatePlans = (financialProfile, loans) => {
  const totalFederalBalance = loans.reduce((acc, loan) => acc + parseFloat(loan.balance || 0), 0);
  if (totalFederalBalance === 0) return {};

  const weightedAverageRate = loans.reduce((acc, loan) => acc + (parseFloat(loan.balance || 0) * (parseFloat(loan.rate || 0) / 100)), 0) / totalFederalBalance;
  const { agi, familySize, stateOfResidence, filingStatus } = financialProfile;

  const plans = {};

  const standardMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 10);
  plans['10-Year Standard'] = { monthlyPayment: standardMonthly, totalPaid: standardMonthly * 120, payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)) };

  // Simplified Graduated for display purposes
  plans['Graduated'] = { monthlyPayment: `Starts at ~$${(standardMonthly * 0.75).toFixed(2)}, increases every 2 years`, totalPaid: standardMonthly * 120 * 1.1, payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)) };

  if (totalFederalBalance >= 30000) {
    const extendedMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 25);
    plans['Extended'] = { monthlyPayment: extendedMonthly, totalPaid: extendedMonthly * 300, payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 25)) };
  }
  
  const getStandardizedTieredTerm = (balance) => {
    if (balance < 7500) return 10; if (balance < 10000) return 12;
    if (balance < 20000) return 15; if (balance < 40000) return 20;
    if (balance < 60000) return 25;
    return 30;
  }
  const tieredTerm = getStandardizedTieredTerm(totalFederalBalance);
  const tieredMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, tieredTerm);
  plans['Standardized Tiered Plan'] = { monthlyPayment: tieredMonthly, totalPaid: tieredMonthly * tieredTerm * 12, payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + tieredTerm)) };

  // IDR Plans
  const oldIbrResult = simulateIDR({ principal: totalFederalBalance, annualRate: weightedAverageRate, forgivenessYears: 25, initialAgi: agi, familySize, stateOfResidence, povertyMultiplier: 1.5, paymentPercentage: 0.15, standardPaymentCap: standardMonthly });
  plans['Old IBR'] = { ...oldIbrResult, isIdr: true };
  
  const newIbrResult = simulateIDR({ principal: totalFederalBalance, annualRate: weightedAverageRate, forgivenessYears: 20, initialAgi: agi, familySize, stateOfResidence, povertyMultiplier: 1.5, paymentPercentage: 0.10, standardPaymentCap: standardMonthly });
  plans['New IBR'] = { ...newIbrResult, isIdr: true };
  
  const payeResult = simulateIDR({ principal: totalFederalBalance, annualRate: weightedAverageRate, forgivenessYears: 20, initialAgi: agi, familySize, stateOfResidence, povertyMultiplier: 1.5, paymentPercentage: 0.10, standardPaymentCap: standardMonthly });
  plans['PAYE'] = { ...payeResult, isIdr: true, sunset: new Date('2028-07-01') };

  const rapResult = simulateRAP({ principal: totalFederalBalance, annualRate: weightedAverageRate, initialAgi: agi, familySize, stateOfResidence, filingStatus, standardPaymentCap: standardMonthly });
  plans['RAP'] = { ...rapResult, isIdr: true };
  
  const icrMonthly = Math.min(
      (calculateDiscretionaryIncome(agi, familySize, stateOfResidence, 1.0) * 0.20) / 12,
      calculateAmortizedPayment(totalFederalBalance, weightedAverageRate * 1.2, 12)
  );
  const icrResult = simulateIDR({ principal: totalFederalBalance, annualRate: weightedAverageRate, forgivenessYears: 25, initialAgi: agi, familySize, stateOfResidence, povertyMultiplier: 1.0, paymentPercentage: 0.20, standardPaymentCap: standardMonthly });
  plans['ICR'] = { ...icrResult, monthlyPayment: Math.min(icrMonthly, standardMonthly), isIdr: true, sunset: new Date('2028-07-01')};

  return plans;
};
