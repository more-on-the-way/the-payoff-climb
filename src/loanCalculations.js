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

// Simulates income-driven repayment over time with income growth
const simulateIDRPayment = (initialAgi, familySize, stateOfResidence, initialBalance, annualRate, paymentPercentage, povertyMultiplier, maxYears, incomeGrowthRate = 0.03) => {
  let balance = initialBalance;
  let totalPaid = 0;
  let currentAgi = initialAgi;
  const monthlyRate = annualRate / 12;
  
  for (let year = 0; year < maxYears; year++) {
    // Calculate discretionary income for this year
    const discretionaryIncome = calculateDiscretionaryIncome(currentAgi, familySize, stateOfResidence, povertyMultiplier);
    const monthlyPayment = (discretionaryIncome * paymentPercentage) / 12;
    
    // Process 12 months of payments
    for (let month = 0; month < 12; month++) {
      if (balance <= 0) break;
      
      // Add interest
      const interestCharge = balance * monthlyRate;
      balance += interestCharge;
      
      // Make payment
      const actualPayment = Math.min(monthlyPayment, balance);
      balance -= actualPayment;
      totalPaid += actualPayment;
    }
    
    // Stop if loan is paid off
    if (balance <= 0) {
      const payoffDate = new Date();
      payoffDate.setFullYear(payoffDate.getFullYear() + year);
      payoffDate.setMonth(payoffDate.getMonth() + Math.ceil((balance + totalPaid) / monthlyPayment));
      return { 
        totalPaid, 
        forgivenessDate: payoffDate, 
        monthlyPayment: (discretionaryIncome * paymentPercentage) / 12,
        paidOff: true 
      };
    }
    
    // Increase income for next year
    currentAgi *= (1 + incomeGrowthRate);
  }
  
  // Loan not fully paid - forgiveness applies
  const forgivenessDate = new Date();
  forgivenessDate.setFullYear(forgivenessDate.getFullYear() + maxYears);
  
  // Calculate initial monthly payment for display
  const initialDiscretionary = calculateDiscretionaryIncome(initialAgi, familySize, stateOfResidence, povertyMultiplier);
  const initialMonthlyPayment = (initialDiscretionary * paymentPercentage) / 12;
  
  return { 
    totalPaid, 
    forgivenessDate, 
    monthlyPayment: initialMonthlyPayment,
    paidOff: false 
  };
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

  // 1. 10-Year Standard Plan
  const standardMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 10);
  plans['10-Year Standard'] = {
    monthlyPayment: standardMonthly,
    totalPaid: standardMonthly * 120,
    payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)),
  };

  // 2. Graduated Plan (Real calculation with 2-year increases)
  // Payments start at about 50% of standard and increase by ~7% every 2 years
  let graduatedBalance = totalFederalBalance;
  let graduatedTotalPaid = 0;
  const monthlyRate = weightedAverageRate / 12;
  const initialGraduatedPayment = standardMonthly * 0.5; // Start at 50% of standard
  
  for (let period = 0; period < 5; period++) { // 5 periods of 2 years each = 10 years
    const periodPayment = initialGraduatedPayment * Math.pow(1.07, period); // 7% increase every 2 years
    
    for (let month = 0; month < 24; month++) { // 24 months per period
      const interestCharge = graduatedBalance * monthlyRate;
      graduatedBalance += interestCharge;
      graduatedBalance -= periodPayment;
      graduatedTotalPaid += periodPayment;
      
      if (graduatedBalance <= 0) break;
    }
    if (graduatedBalance <= 0) break;
  }
  
  plans['Graduated'] = {
    monthlyPayment: `Starts at ${initialGraduatedPayment.toFixed(2)}, increases every 2 years`,
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

  // --- Income-Driven Repayment (IDR) Plans with Income Growth Simulation ---

  // 4. Old IBR (For pre-2014 borrowers) - 15% of discretionary income, 25-year forgiveness
  const oldIbrResult = simulateIDRPayment(
    agi, 
    familySize, 
    stateOfResidence, 
    totalFederalBalance, 
    weightedAverageRate, 
    0.15, // 15% of discretionary income
    1.5,  // 150% of poverty line
    25    // 25 years
  );
  plans['Old IBR'] = {
    monthlyPayment: oldIbrResult.monthlyPayment,
    totalPaid: oldIbrResult.totalPaid,
    forgivenessDate: oldIbrResult.forgivenessDate,
    isIdr: true,
  };

  // 5. New IBR (For post-2014 borrowers) - 10% of discretionary income, 20-year forgiveness
  const newIbrResult = simulateIDRPayment(
    agi, 
    familySize, 
    stateOfResidence, 
    totalFederalBalance, 
    weightedAverageRate, 
    0.10, // 10% of discretionary income
    1.5,  // 150% of poverty line
    20    // 20 years
  );
  plans['New IBR'] = {
    monthlyPayment: newIbrResult.monthlyPayment,
    totalPaid: newIbrResult.totalPaid,
    forgivenessDate: newIbrResult.forgivenessDate,
    isIdr: true,
  };

  // 6. PAYE (For post-2014 borrowers) - 10% of discretionary income, 20-year forgiveness
  const payeResult = simulateIDRPayment(
    agi, 
    familySize, 
    stateOfResidence, 
    totalFederalBalance, 
    weightedAverageRate, 
    0.10, // 10% of discretionary income
    1.5,  // 150% of poverty line
    20    // 20 years
  );
  plans['PAYE'] = {
    monthlyPayment: payeResult.monthlyPayment,
    totalPaid: payeResult.totalPaid,
    forgivenessDate: payeResult.forgivenessDate,
    isIdr: true,
    sunset: new Date('2028-07-01'),
  };

  // 7. RAP (SAVE) Plan - 5% of discretionary income (simplified for undergrad)
  const rapResult = simulateIDRPayment(
    agi, 
    familySize, 
    stateOfResidence, 
    totalFederalBalance, 
    weightedAverageRate, 
    0.05, // 5% of discretionary income
    2.25, // 225% of poverty line
    20    // 20 years
  );
  plans['RAP'] = {
    monthlyPayment: rapResult.monthlyPayment,
    totalPaid: rapResult.totalPaid,
    forgivenessDate: rapResult.forgivenessDate,
    isIdr: true,
  };

  // 8. ICR Plan - Lesser of 20% of discretionary income or fixed payment over 12 years
  const icrDiscretionary = calculateDiscretionaryIncome(agi, familySize, stateOfResidence, 1.0);
  const icrMonthlyOption1 = (icrDiscretionary * 0.20) / 12;
  const icrMonthlyOption2 = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 12);
  const icrInitialPayment = Math.min(icrMonthlyOption1, icrMonthlyOption2);
  
  // Simulate ICR with income growth
  const icrResult = simulateIDRPayment(
    agi, 
    familySize, 
    stateOfResidence, 
    totalFederalBalance, 
    weightedAverageRate, 
    0.20, // 20% of discretionary income
    1.0,  // 100% of poverty line
    25    // 25 years
  );
  
  plans['ICR'] = {
    monthlyPayment: icrInitialPayment,
    totalPaid: icrResult.totalPaid,
    forgivenessDate: icrResult.forgivenessDate,
    isIdr: true,
    sunset: new Date('2028-07-01'),
  };

  // 9. Standardized Tiered Plan - Term based on balance
  const tieredTerm = getStandardizedTieredTerm(totalFederalBalance);
  const tieredMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, tieredTerm);
  plans['Standardized Tiered Plan'] = {
    monthlyPayment: tieredMonthly,
    totalPaid: tieredMonthly * (tieredTerm * 12),
    payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + tieredTerm)),
  };

  return plans;
};