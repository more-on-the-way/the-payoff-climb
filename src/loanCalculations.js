// --- UTILITY FUNCTIONS ---

const getPovertyGuideline = (familySize, stateOfResidence) => {
  const basePovertyLine = 15060;
  const perMember = 5380;
  const multiplier = (stateOfResidence === 'AK' || stateOfResidence === 'HI') ? 1.25 : 1;
  return (basePovertyLine + (Math.max(0, familySize - 1) * perMember)) * multiplier;
};

const calculateDiscretionaryIncome = (agi, familySize, stateOfResidence, povertyLineMultiplier = 1.5) => {
  const povertyGuideline = getPovertyGuideline(familySize, stateOfResidence);
  return Math.max(0, agi - (povertyGuideline * povertyLineMultiplier));
};

const calculateAmortizedPayment = (principal, annualRate, years) => {
  if (principal <= 0 || years <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const numberOfPayments = years * 12;
  if (monthlyRate <= 0) return principal / numberOfPayments;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
};

// --- SIMULATION ENGINES ---

/**
 * Simulates a standard IDR plan with annual income growth.
 */
function simulateIDR({ principal, annualRate, forgivenessYears, initialAgi, familySize, stateOfResidence, povertyMultiplier, paymentPercentage }) {
  let balance = principal;
  let totalPaid = 0;
  let currentAgi = initialAgi;
  const monthlyRate = annualRate / 12;

  for (let year = 1; year <= forgivenessYears; year++) {
    const discretionaryIncome = calculateDiscretionaryIncome(currentAgi, familySize, stateOfResidence, povertyMultiplier);
    const monthlyPayment = (discretionaryIncome * paymentPercentage) / 12;

    for (let month = 1; month <= 12; month++) {
      if (balance <= 0) break;
      const interest = balance * monthlyRate;
      const principalPaid = Math.max(0, monthlyPayment - interest);
      
      balance -= principalPaid;
      totalPaid += monthlyPayment;
    }

    if (balance <= 0) {
      return { totalPaid, forgivenessDate: null, monthlyPayment };
    }

    currentAgi *= 1.03; // Apply 3% annual income growth
  }

  return { totalPaid, forgivenessDate: new Date(new Date().setFullYear(new Date().getFullYear() + forgivenessYears)), monthlyPayment: (calculateDiscretionaryIncome(initialAgi, familySize, stateOfResidence, povertyMultiplier) * paymentPercentage) / 12 };
}

/**
 * Simulates the new RAP plan with its unique rules.
 */
function simulateRAP({ principal, annualRate, initialAgi, familySize, stateOfResidence, filingStatus }) {
    let balance = principal;
    let totalPaid = 0;
    let currentAgi = initialAgi;
    const monthlyRate = annualRate / 12;
    const forgivenessYears = 30;

    const getRAPPaymentPercentage = (agi) => {
        if (agi <= 10000) return 0; // Handled by minimum
        if (agi <= 20000) return 0.01; if (agi <= 30000) return 0.02;
        if (agi <= 40000) return 0.03; if (agi <= 50000) return 0.04;
        if (agi <= 60000) return 0.05; if (agi <= 70000) return 0.06;
        if (agi <= 80000) return 0.07; if (agi <= 90000) return 0.08;
        if (agi <= 100000) return 0.09;
        return 0.10;
    };

    const dependents = filingStatus === 'single' ? Math.max(0, familySize - 1) : Math.max(0, familySize - 2);
    
    for (let year = 1; year <= forgivenessYears; year++) {
        const annualPayment = (currentAgi * getRAPPaymentPercentage(currentAgi)) - (dependents * 50);
        const monthlyPayment = Math.max(10, annualPayment / 12);

        for (let month = 1; month <= 12; month++) {
            if (balance <= 0) break;
            const interest = balance * monthlyRate;
            const paymentApplied = Math.min(monthlyPayment, balance + interest);
            
            // Interest Subsidy
            const unpaidInterest = Math.max(0, interest - paymentApplied);
            // Since unpaid interest is waived, it's not added to the balance.

            const principalPaid = Math.max(0, paymentApplied - interest);
            
            let finalPrincipalReduction = principalPaid;
            
            // $50 Principal Reduction Guarantee
            if (principalPaid < 50) {
                 const shortfall = 50 - principalPaid;
                 finalPrincipalReduction += shortfall;
            }

            balance = Math.max(0, balance - finalPrincipalReduction);
            totalPaid += paymentApplied;
        }

        if (balance <= 0) {
            return { totalPaid, forgivenessDate: null, monthlyPayment: Math.max(10, ((initialAgi * getRAPPaymentPercentage(initialAgi)) - (dependents * 50)) / 12) };
        }
        
        currentAgi *= 1.03; // 3% annual income growth
    }

    return { totalPaid, forgivenessDate: new Date(new Date().setFullYear(new Date().getFullYear() + forgivenessYears)), monthlyPayment: Math.max(10, ((initialAgi * getRAPPaymentPercentage(initialAgi)) - (dependents * 50)) / 12) };
}


// --- MAIN CALCULATION FUNCTION ---

export const calculatePlans = (financialProfile, loans) => {
  const totalFederalBalance = loans.filter(l => l.type === 'Federal').reduce((acc, loan) => acc + parseFloat(loan.balance || 0), 0);
  if (totalFederalBalance === 0) return {};

  const weightedAverageRate = loans.reduce((acc, loan) => acc + (parseFloat(loan.balance) * (parseFloat(loan.rate) / 100)), 0) / totalFederalBalance;
  const { agi, familySize, stateOfResidence, filingStatus } = financialProfile;

  const plans = {};

  // 1. 10-Year Standard Plan
  const standardMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 10);
  plans['10-Year Standard'] = {
    monthlyPayment: standardMonthly,
    totalPaid: standardMonthly * 120,
    payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)),
  };

  // 2. Graduated Plan (Accurate Simulation)
  let graduatedBalance = totalFederalBalance;
  let graduatedTotalPaid = 0;
  let graduatedCurrentPayment = standardMonthly * 0.5; // Starts at 50% of standard
  for (let month = 1; month <= 120; month++) {
      if(graduatedBalance <= 0) break;
      const interest = graduatedBalance * (weightedAverageRate / 12);
      const principalPaid = Math.min(graduatedBalance, graduatedCurrentPayment - interest);
      graduatedBalance -= principalPaid;
      graduatedTotalPaid += graduatedCurrentPayment;
      if (month % 24 === 0 && month < 120) { // Increase every 2 years
          graduatedCurrentPayment *= 1.07;
      }
  }
   plans['Graduated'] = {
    monthlyPayment: `Starts at ~$${(standardMonthly * 0.5).toFixed(2)}, increases every 2 years`,
    totalPaid: graduatedTotalPaid,
    payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)),
  };

  // 3. Extended Plan
  if (totalFederalBalance >= 30000) {
    const extendedMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 25);
    plans['Extended'] = {
      monthlyPayment: extendedMonthly,
      totalPaid: extendedMonthly * 300,
      payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 25)),
    };
  }
  
  // 4. Standardized Tiered Plan
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
  plans['Standardized Tiered Plan'] = {
      monthlyPayment: tieredMonthly,
      totalPaid: tieredMonthly * tieredTerm * 12,
      payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + tieredTerm)),
  };

  // 5. Old IBR
  const oldIbrResult = simulateIDR({ principal: totalFederalBalance, annualRate: weightedAverageRate, forgivenessYears: 25, initialAgi: agi, familySize, stateOfResidence, povertyMultiplier: 1.5, paymentPercentage: 0.15 });
  plans['Old IBR'] = { ...oldIbrResult, isIdr: true };
  
  // 6. New IBR
  const newIbrResult = simulateIDR({ principal: totalFederalBalance, annualRate: weightedAverageRate, forgivenessYears: 20, initialAgi: agi, familySize, stateOfResidence, povertyMultiplier: 1.5, paymentPercentage: 0.10 });
  plans['New IBR'] = { ...newIbrResult, isIdr: true };
  
  // 7. PAYE
  const payeResult = simulateIDR({ principal: totalFederalBalance, annualRate: weightedAverageRate, forgivenessYears: 20, initialAgi: agi, familySize, stateOfResidence, povertyMultiplier: 1.5, paymentPercentage: 0.10 });
  plans['PAYE'] = { ...payeResult, isIdr: true, sunset: new Date('2028-07-01') };

  // 8. RAP
  const rapResult = simulateRAP({ principal: totalFederalBalance, annualRate: weightedAverageRate, initialAgi: agi, familySize, stateOfResidence, filingStatus });
  plans['RAP'] = { ...rapResult, isIdr: true };
  
  // 9. ICR
  const icrMonthly = Math.min(
      (calculateDiscretionaryIncome(agi, familySize, stateOfResidence, 1.0) * 0.20) / 12,
      calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 12) // Income factor is complex, this is the cap
  );
  // ICR simulation is complex, using a simplified total paid for now, but with accurate monthly
  plans['ICR'] = {
    monthlyPayment: icrMonthly,
    totalPaid: icrMonthly * 12 * 25, 
    forgivenessDate: new Date(new Date().setFullYear(new Date().getFullYear() + 25)),
    isIdr: true,
    sunset: new Date('2028-07-01'),
  };

  return plans;
};