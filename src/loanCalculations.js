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

  // 2. Graduated Plan (Simplified)
  // Real calculation is complex. This is a simplified average.
  const graduatedMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 10) * 1.25;
  plans['Graduated'] = {
    monthlyPayment: `Starts lower, ends higher (avg. ~${graduatedMonthly.toFixed(2)})`,
    totalPaid: totalFederalBalance * (1 + weightedAverageRate * 0.6 * 10), // Approximation
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

  // --- Income-Driven Repayment (IDR) Plans ---
  const discretionaryIncomeOldIBR = calculateDiscretionaryIncome(agi, familySize, stateOfResidence, 1.5);
  const discretionaryIncomeNewPlans = calculateDiscretionaryIncome(agi, familySize, stateOfResidence, 2.25);

  // 4. Old IBR (For pre-2014 borrowers)
  const oldIbrMonthly = (discretionaryIncomeOldIBR * 0.15) / 12;
  plans['Old IBR'] = {
    monthlyPayment: oldIbrMonthly,
    totalPaid: oldIbrMonthly * 12 * 25, // Simplified, doesn't account for changing income
    forgivenessDate: new Date(new Date().setFullYear(new Date().getFullYear() + 25)),
    isIdr: true,
  };

  // 5. New IBR (For post-2014 borrowers)
  const newIbrMonthly = (discretionaryIncomeNewPlans * 0.10) / 12;
  plans['New IBR'] = {
    monthlyPayment: newIbrMonthly,
    totalPaid: newIbrMonthly * 12 * 20,
    forgivenessDate: new Date(new Date().setFullYear(new Date().getFullYear() + 20)),
    isIdr: true,
  };

  // 6. PAYE (For post-2014 borrowers)
  const payeMonthly = (discretionaryIncomeNewPlans * 0.10) / 12;
  plans['PAYE'] = {
    monthlyPayment: payeMonthly,
    totalPaid: payeMonthly * 12 * 20,
    forgivenessDate: new Date(new Date().setFullYear(new Date().getFullYear() + 20)),
    isIdr: true,
    sunset: new Date('2028-07-01'),
  };

  // 7. RAP (SAVE) Plan - Simplified
  // Real SAVE calculation is more complex (e.g., 5% for undergrad, 10% for grad)
  const rapMonthly = (discretionaryIncomeNewPlans * 0.05) / 12; // Assuming undergrad loans
  plans['RAP'] = {
    monthlyPayment: rapMonthly,
    totalPaid: rapMonthly * 12 * 20,
    forgivenessDate: new Date(new Date().setFullYear(new Date().getFullYear() + 20)),
    isIdr: true,
  };

  // 8. ICR Plan
  const icrDiscretionary = calculateDiscretionaryIncome(agi, familySize, stateOfResidence, 1.0);
  const icrMonthlyOption1 = (icrDiscretionary * 0.20) / 12;
  const icrMonthlyOption2 = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 12) * 1.0; // Income-adjusted
  plans['ICR'] = {
    monthlyPayment: Math.min(icrMonthlyOption1, icrMonthlyOption2),
    totalPaid: Math.min(icrMonthlyOption1, icrMonthlyOption2) * 12 * 25,
    forgivenessDate: new Date(new Date().setFullYear(new Date().getFullYear() + 25)),
    isIdr: true,
    sunset: new Date('2028-07-01'),
  };

  // 9. Standardized Tiered Plan (Simplified)
  const tieredMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 20); // Simplified term
  plans['Standardized Tiered Plan'] = {
    monthlyPayment: tieredMonthly,
    totalPaid: tieredMonthly * 240,
    payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 20)),
  };

  return plans;
};