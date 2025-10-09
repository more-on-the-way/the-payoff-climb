// --- UTILITY FUNCTIONS ---

// Calculates the weighted average interest rate of all federal loans
const getWeightedAverageRate = (loans) => {
  const federalLoans = loans.filter(l => l.type === 'Federal' && parseFloat(l.balance) > 0);
  if (federalLoans.length === 0) return 0;
  if (federalLoans.length === 1) return parseFloat(federalLoans[0].rate) / 100;

  const totalBalance = federalLoans.reduce((acc, loan) => acc + parseFloat(loan.balance), 0);
  const weightedSum = federalLoans.reduce((acc, loan) => acc + (parseFloat(loan.balance) * (parseFloat(loan.rate) / 100)), 0);

  return totalBalance > 0 ? weightedSum / totalBalance : 0;
};

// Calculates the total balance of all federal loans
const getTotalFederalBalance = (loans) => {
  return loans.filter(l => l.type === 'Federal').reduce((acc, loan) => acc + parseFloat(loan.balance || 0), 0);
};

// Calculates the monthly payment for a standard amortized loan
const calculateAmortizedPayment = (principal, annualRate, years) => {
  if (principal <= 0 || annualRate < 0 || years <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const numberOfPayments = years * 12;
  if (monthlyRate === 0) return principal / numberOfPayments;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
};

// Gets the poverty guideline based on family size and state
const getPovertyGuideline = (familySize, stateOfResidence) => {
  // 2025 Federal Poverty Guidelines
  const basePovertyLine = 15060;
  const perMember = 5380;
  const multiplier = (stateOfResidence === 'AK' || stateOfResidence === 'HI') ? 1.25 : 1;
  return (basePovertyLine + (Math.max(0, familySize - 1) * perMember)) * multiplier;
};

// Calculates discretionary income for IDR plans
const calculateDiscretionaryIncome = (agi, familySize, stateOfResidence, povertyLineMultiplier = 1.5) => {
  const povertyGuideline = getPovertyGuideline(familySize, stateOfResidence);
  return Math.max(0, agi - (povertyGuideline * povertyLineMultiplier));
};

// Determines the RAP payment percentage based on AGI tier
const getRAPPaymentPercentage = (agi) => {
  if (agi <= 32000) return 0.00;  // 0%
  if (agi <= 40000) return 0.01;  // 1%
  if (agi <= 45000) return 0.02;  // 2%
  if (agi <= 50000) return 0.03;  // 3%
  if (agi <= 60000) return 0.04;  // 4%
  if (agi <= 70000) return 0.05;  // 5%
  if (agi <= 80000) return 0.06;  // 6%
  if (agi <= 90000) return 0.07;  // 7%
  if (agi <= 100000) return 0.08; // 8%
  if (agi <= 125000) return 0.09; // 9%
  return 0.10; // 10% for AGI > $125,000
};

// Determines term length for Standardized Tiered Plan based on balance
const getStandardizedTieredTerm = (balance) => {
  if (balance < 7500) return 10;
  if (balance < 10000) return 12;
  if (balance < 20000) return 15;
  if (balance < 40000) return 20;
  if (balance < 60000) return 25;
  return 30; // $60,000 or more
};

// --- REPAYMENT PLAN CALCULATIONS ---

export const calculatePlans = (financialProfile, loans) => {
  const totalFederalBalance = getTotalFederalBalance(loans);
  if (totalFederalBalance === 0) return {};

  const weightedAverageRate = getWeightedAverageRate(loans);
  const { agi, familySize, stateOfResidence } = financialProfile;

  const plans = {};
  const incomeGrowthRate = 0.03; // 3% annual income growth

  // 1. 10-Year Standard Plan
  const standardMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 10);
  plans['10-Year Standard'] = {
    monthlyPayment: standardMonthly,
    totalPaid: standardMonthly * 120,
    payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)),
  };

  // 2. Graduated Plan - Accurate simulation with payments increasing every 2 years
  {
    let balance = totalFederalBalance;
    let totalPaid = 0;
    const monthlyRate = weightedAverageRate / 12;
    const initialPayment = standardMonthly * 0.5; // Start at 50% of standard
    let monthCount = 0;
    
    for (let period = 0; period < 5; period++) { // 5 periods of 2 years each
      const periodPayment = initialPayment * Math.pow(1.07, period); // 7% increase every 2 years
      
      for (let month = 0; month < 24; month++) {
        if (balance <= 0) break;
        
        const interestCharge = balance * monthlyRate;
        balance += interestCharge;
        balance -= periodPayment;
        totalPaid += periodPayment;
        monthCount++;
      }
      
      if (balance <= 0) break;
    }
    
    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + monthCount);
    
    plans['Graduated'] = {
      monthlyPayment: `Starts at $${initialPayment.toFixed(2)}, increases every 2 years`,
      totalPaid: totalPaid,
      payoffDate: payoffDate,
    };
  }

  // 3. Extended Plan
  if (totalFederalBalance >= 30000) {
    const extendedMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 25);
    plans['Extended'] = {
      monthlyPayment: extendedMonthly,
      totalPaid: extendedMonthly * 300,
      payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 25)),
    };
  }

  // 4. Old IBR - 15% of discretionary income, 25-year forgiveness
  {
    let balance = totalFederalBalance;
    let totalPaid = 0;
    let currentAgi = agi;
    const monthlyRate = weightedAverageRate / 12;
    const maxYears = 25;
    
    for (let year = 0; year < maxYears; year++) {
      const discretionaryIncome = calculateDiscretionaryIncome(currentAgi, familySize, stateOfResidence, 1.5);
      const monthlyPayment = (discretionaryIncome * 0.15) / 12;
      
      for (let month = 0; month < 12; month++) {
        if (balance <= 0) break;
        
        const interestCharge = balance * monthlyRate;
        balance += interestCharge;
        
        const actualPayment = Math.min(monthlyPayment, balance);
        balance -= actualPayment;
        totalPaid += actualPayment;
      }
      
      if (balance <= 0) break;
      currentAgi *= (1 + incomeGrowthRate);
    }
    
    const forgivenessDate = new Date();
    forgivenessDate.setFullYear(forgivenessDate.getFullYear() + (balance <= 0 ? Math.ceil(totalPaid / ((calculateDiscretionaryIncome(agi, familySize, stateOfResidence, 1.5) * 0.15) / 12) / 12) : maxYears));
    
    const initialDiscretionary = calculateDiscretionaryIncome(agi, familySize, stateOfResidence, 1.5);
    const initialMonthlyPayment = (initialDiscretionary * 0.15) / 12;
    
    plans['Old IBR'] = {
      monthlyPayment: initialMonthlyPayment,
      totalPaid: totalPaid,
      forgivenessDate: forgivenessDate,
      isIdr: true,
    };
  }

  // 5. New IBR - 10% of discretionary income, 20-year forgiveness
  {
    let balance = totalFederalBalance;
    let totalPaid = 0;
    let currentAgi = agi;
    const monthlyRate = weightedAverageRate / 12;
    const maxYears = 20;
    
    for (let year = 0; year < maxYears; year++) {
      const discretionaryIncome = calculateDiscretionaryIncome(currentAgi, familySize, stateOfResidence, 1.5);
      const monthlyPayment = (discretionaryIncome * 0.10) / 12;
      
      for (let month = 0; month < 12; month++) {
        if (balance <= 0) break;
        
        const interestCharge = balance * monthlyRate;
        balance += interestCharge;
        
        const actualPayment = Math.min(monthlyPayment, balance);
        balance -= actualPayment;
        totalPaid += actualPayment;
      }
      
      if (balance <= 0) break;
      currentAgi *= (1 + incomeGrowthRate);
    }
    
    const forgivenessDate = new Date();
    forgivenessDate.setFullYear(forgivenessDate.getFullYear() + (balance <= 0 ? Math.ceil(totalPaid / ((calculateDiscretionaryIncome(agi, familySize, stateOfResidence, 1.5) * 0.10) / 12) / 12) : maxYears));
    
    const initialDiscretionary = calculateDiscretionaryIncome(agi, familySize, stateOfResidence, 1.5);
    const initialMonthlyPayment = (initialDiscretionary * 0.10) / 12;
    
    plans['New IBR'] = {
      monthlyPayment: initialMonthlyPayment,
      totalPaid: totalPaid,
      forgivenessDate: forgivenessDate,
      isIdr: true,
    };
  }

  // 6. PAYE - 10% of discretionary income, 20-year forgiveness
  {
    let balance = totalFederalBalance;
    let totalPaid = 0;
    let currentAgi = agi;
    const monthlyRate = weightedAverageRate / 12;
    const maxYears = 20;
    
    for (let year = 0; year < maxYears; year++) {
      const discretionaryIncome = calculateDiscretionaryIncome(currentAgi, familySize, stateOfResidence, 1.5);
      const monthlyPayment = (discretionaryIncome * 0.10) / 12;
      
      for (let month = 0; month < 12; month++) {
        if (balance <= 0) break;
        
        const interestCharge = balance * monthlyRate;
        balance += interestCharge;
        
        const actualPayment = Math.min(monthlyPayment, balance);
        balance -= actualPayment;
        totalPaid += actualPayment;
      }
      
      if (balance <= 0) break;
      currentAgi *= (1 + incomeGrowthRate);
    }
    
    const forgivenessDate = new Date();
    forgivenessDate.setFullYear(forgivenessDate.getFullYear() + (balance <= 0 ? Math.ceil(totalPaid / ((calculateDiscretionaryIncome(agi, familySize, stateOfResidence, 1.5) * 0.10) / 12) / 12) : maxYears));
    
    const initialDiscretionary = calculateDiscretionaryIncome(agi, familySize, stateOfResidence, 1.5);
    const initialMonthlyPayment = (initialDiscretionary * 0.10) / 12;
    
    plans['PAYE'] = {
      monthlyPayment: initialMonthlyPayment,
      totalPaid: totalPaid,
      forgivenessDate: forgivenessDate,
      isIdr: true,
      sunset: new Date('2028-07-01'),
    };
  }

  // 7. RAP - Complete accurate simulation with all RAP rules
  {
    let balance = totalFederalBalance;
    let totalPaid = 0;
    let currentAgi = agi;
    const monthlyRate = weightedAverageRate / 12;
    const maxYears = 30; // RAP has 30-year forgiveness
    const dependentDeduction = 50; // $50 per dependent per year
    const principalReductionGuarantee = 50; // $50 per year minimum principal reduction
    
    const numberOfDependents = Math.max(0, familySize - 1); // Assuming family size includes borrower
    
    for (let year = 0; year < maxYears; year++) {
      // Calculate base payment using AGI tier
      const paymentPercentage = getRAPPaymentPercentage(currentAgi);
      let annualPayment = currentAgi * paymentPercentage;
      
      // Apply dependent deduction
      annualPayment = Math.max(0, annualPayment - (dependentDeduction * numberOfDependents));
      
      const monthlyPayment = annualPayment / 12;
      let yearlyPrincipalReduction = 0;
      
      for (let month = 0; month < 12; month++) {
        if (balance <= 0) break;
        
        // Calculate interest for the month
        const interestCharge = balance * monthlyRate;
        
        // Apply Interest Subsidy - waive unpaid interest
        // (If payment doesn't cover interest, the unpaid interest is waived)
        if (monthlyPayment >= interestCharge) {
          // Payment covers interest and reduces principal
          balance += interestCharge;
          balance -= monthlyPayment;
          yearlyPrincipalReduction += (monthlyPayment - interestCharge);
          totalPaid += monthlyPayment;
        } else {
          // Payment doesn't cover interest - interest is waived (Interest Subsidy)
          // Only the payment amount reduces principal
          balance -= monthlyPayment;
          yearlyPrincipalReduction += monthlyPayment;
          totalPaid += monthlyPayment;
        }
      }
      
      // Apply $50 Principal Reduction Guarantee
      if (yearlyPrincipalReduction < principalReductionGuarantee && balance > 0) {
        const additionalReduction = principalReductionGuarantee - yearlyPrincipalReduction;
        balance -= additionalReduction;
        // Note: This reduction doesn't count toward totalPaid as it's a benefit
      }
      
      if (balance <= 0) break;
      currentAgi *= (1 + incomeGrowthRate);
    }
    
    const forgivenessDate = new Date();
    if (balance <= 0) {
      // Calculate actual payoff time
      const yearsToPayoff = Math.ceil(totalPaid / ((agi * getRAPPaymentPercentage(agi) - (dependentDeduction * numberOfDependents)) / 12) / 12);
      forgivenessDate.setFullYear(forgivenessDate.getFullYear() + yearsToPayoff);
    } else {
      forgivenessDate.setFullYear(forgivenessDate.getFullYear() + maxYears);
    }
    
    // Calculate initial monthly payment for display
    let initialAnnualPayment = agi * getRAPPaymentPercentage(agi);
    initialAnnualPayment = Math.max(0, initialAnnualPayment - (dependentDeduction * numberOfDependents));
    const initialMonthlyPayment = initialAnnualPayment / 12;
    
    plans['RAP'] = {
      monthlyPayment: initialMonthlyPayment,
      totalPaid: totalPaid,
      forgivenessDate: forgivenessDate,
      isIdr: true,
    };
  }

  // 8. ICR - 20% of discretionary income (100% poverty line), 25-year forgiveness
  {
    let balance = totalFederalBalance;
    let totalPaid = 0;
    let currentAgi = agi;
    const monthlyRate = weightedAverageRate / 12;
    const maxYears = 25;
    
    for (let year = 0; year < maxYears; year++) {
      const discretionaryIncome = calculateDiscretionaryIncome(currentAgi, familySize, stateOfResidence, 1.0);
      const icrOption1 = (discretionaryIncome * 0.20) / 12;
      const icrOption2 = calculateAmortizedPayment(balance, weightedAverageRate, 12);
      const monthlyPayment = Math.min(icrOption1, icrOption2);
      
      for (let month = 0; month < 12; month++) {
        if (balance <= 0) break;
        
        const interestCharge = balance * monthlyRate;
        balance += interestCharge;
        
        const actualPayment = Math.min(monthlyPayment, balance);
        balance -= actualPayment;
        totalPaid += actualPayment;
      }
      
      if (balance <= 0) break;
      currentAgi *= (1 + incomeGrowthRate);
    }
    
    const forgivenessDate = new Date();
    forgivenessDate.setFullYear(forgivenessDate.getFullYear() + (balance <= 0 ? Math.ceil(totalPaid / ((calculateDiscretionaryIncome(agi, familySize, stateOfResidence, 1.0) * 0.20) / 12) / 12) : maxYears));
    
    const initialDiscretionary = calculateDiscretionaryIncome(agi, familySize, stateOfResidence, 1.0);
    const icrOption1 = (initialDiscretionary * 0.20) / 12;
    const icrOption2 = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 12);
    const initialMonthlyPayment = Math.min(icrOption1, icrOption2);
    
    plans['ICR'] = {
      monthlyPayment: initialMonthlyPayment,
      totalPaid: totalPaid,
      forgivenessDate: forgivenessDate,
      isIdr: true,
      sunset: new Date('2028-07-01'),
    };
  }

  // 9. Standardized Tiered Plan - Term based on balance with accurate simulation
  {
    const tieredTerm = getStandardizedTieredTerm(totalFederalBalance);
    const tieredMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, tieredTerm);
    const totalMonths = tieredTerm * 12;
    
    const payoffDate = new Date();
    payoffDate.setFullYear(payoffDate.getFullYear() + tieredTerm);
    
    plans['Standardized Tiered Plan'] = {
      monthlyPayment: tieredMonthly,
      totalPaid: tieredMonthly * totalMonths,
      payoffDate: payoffDate,
    };
  }

  return plans;
};