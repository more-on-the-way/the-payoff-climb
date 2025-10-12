// ============================================================================
// LOAN CALCULATIONS MODULE (REVISED OCT 2025)
// Handles federal and private student loan calculations according to the
// "One Big Beautiful Bill Act" (H.R. 1) of 2025.
// ============================================================================

// --- UTILITY FUNCTIONS ---

/**
 * Get federal poverty guideline based on family size and state.
 * Uses 2024 poverty guidelines with Alaska/Hawaii adjustments.
 */
function getPovertyGuideline(familySize, stateOfResidence) {
  const basePovertyLine = 15060;
  const perMember = 5380;
  const multiplier = (stateOfResidence === 'AK' || stateOfResidence === 'HI') ? 1.25 : 1;
  return (basePovertyLine + (Math.max(0, familySize - 1) * perMember)) * multiplier;
}

/**
 * Calculate discretionary income for legacy IDR plans (IBR, PAYE, ICR).
 * Discretionary income = AGI - (poverty guideline × multiplier).
 */
function calculateDiscretionaryIncome(agi, familySize, stateOfResidence, povertyLineMultiplier = 1.5) {
  const povertyGuideline = getPovertyGuideline(familySize, stateOfResidence);
  return Math.max(0, agi - (povertyGuideline * povertyLineMultiplier));
}

/**
 * Calculate standard amortization payment.
 * Uses the standard mortgage/loan amortization formula.
 */
export function calculateAmortizedPayment(principal, annualRate, years) {
  if (principal <= 0 || years <= 0) return 0;
  
  const monthlyRate = annualRate / 12;
  const numberOfPayments = years * 12;
  
  if (monthlyRate <= 0) return principal / numberOfPayments;
  
  // Standard amortization formula: P * [r(1+r)^n] / [(1+r)^n - 1]
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
         (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
}

// --- SIMULATION ENGINES ---

/**
 * Simulates legacy IDR plans (IBR, PAYE, ICR) and the judicially blocked SAVE plan.
 * Features annual income growth and calculates payoff or forgiveness outcomes.
 */
function simulateLegacyIDR({ 
  principal, 
  annualRate, 
  forgivenessYears, 
  initialAgi, 
  familySize, 
  stateOfResidence, 
  povertyMultiplier, 
  paymentPercentage, 
  standardPaymentCap 
}) {
  let balance = principal;
  let totalPaid = 0;
  let currentAgi = initialAgi;
  const monthlyRate = annualRate / 12;
  const forgivenessMonths = forgivenessYears * 12;
  
  // Calculate initial payment to display
  const initialDiscretionary = calculateDiscretionaryIncome(initialAgi, familySize, stateOfResidence, povertyMultiplier);
  const initialMonthlyPayment = Math.min(standardPaymentCap, (initialDiscretionary * paymentPercentage) / 12);

  for (let month = 1; month <= forgivenessMonths; month++) {
    if (balance <= 0) {
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + month - 1);
      return { totalPaid, payoffDate, monthlyPayment: initialMonthlyPayment };
    }

    if (month > 1 && (month - 1) % 12 === 0) {
      currentAgi *= 1.03; // Assume 3% annual income growth
    }
    
    const discretionaryIncome = calculateDiscretionaryIncome(currentAgi, familySize, stateOfResidence, povertyMultiplier);
    const currentMonthlyPayment = Math.min(standardPaymentCap, (discretionaryIncome * paymentPercentage) / 12);
    
    balance += balance * monthlyRate;
    
    const payment = Math.min(currentMonthlyPayment, balance);
    balance -= payment;
    totalPaid += payment;
  }

  const forgivenessDate = new Date();
  forgivenessDate.setFullYear(forgivenessDate.getFullYear() + forgivenessYears);
  return { totalPaid, forgivenessDate, monthlyPayment: initialMonthlyPayment };
}

/**
 * [cite_start]Simulates the new Repayment Assistance Plan (RAP) as defined by H.R. 1. [cite: 92]
 * This model is completely overhauled to reflect the new law's rules.
 */
function simulateRAP({ 
  principal, 
  annualRate, 
  initialAgi, 
  familySize, 
  filingStatus 
}) {
  let balance = principal;
  let totalPaid = 0;
  let currentAgi = initialAgi;
  const monthlyRate = annualRate / 12;
  const forgivenessMonths = 360; [cite_start]// RAP forgiveness is 30 years [cite: 119]

  [cite_start]// Helper to calculate annual RAP payment based on tiered AGI structure [cite: 107]
  const getRAPAnnualPayment = (agi) => {
    if (agi <= 10000) return 120;
    if (agi <= 20000) return agi * 0.01;
    if (agi <= 30000) return agi * 0.02;
    if (agi <= 40000) return agi * 0.03;
    if (agi <= 50000) return agi * 0.04;
    if (agi <= 60000) return agi * 0.05;
    if (agi <= 70000) return agi * 0.06;
    if (agi <= 80000) return agi * 0.07;
    if (agi <= 90000) return agi * 0.08;
    if (agi <= 100000) return agi * 0.09;
    return agi * 0.10;
  };
  
  const dependents = filingStatus === 'single' 
    ? Math.max(0, familySize - 1) 
    : Math.max(0, familySize - 2);
  
  // Calculate initial payment for display
  const initialAnnualPayment = getRAPAnnualPayment(initialAgi) - (dependents * 50); [cite_start]// [cite: 105]
  const initialMonthlyPayment = Math.max(10, initialAnnualPayment / 12); [cite_start]// Minimum payment is $10 [cite: 119]

  for (let month = 1; month <= forgivenessMonths; month++) {
    if (balance <= 0) {
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + month - 1);
      return { totalPaid, payoffDate, monthlyPayment: initialMonthlyPayment };
    }

    if (month > 1 && (month - 1) % 12 === 0) {
      currentAgi *= 1.03;
    }
    
    const annualPayment = getRAPAnnualPayment(currentAgi) - (dependents * 50);
    const monthlyPayment = Math.max(10, annualPayment / 12);

    const interest = balance * monthlyRate;
    const principalBeforePayment = balance;

    [cite_start]// RAP Interest Subsidy: Unpaid interest is not charged [cite: 119]
    if (monthlyPayment < interest) {
      // Balance does not increase
    } else {
      balance += interest;
    }
    
    const paymentApplied = Math.min(monthlyPayment, balance);
    balance -= paymentApplied;
    totalPaid += paymentApplied;
    
    [cite_start]// RAP Principal Matching ($50 Rule) [cite: 119]
    const principalPaid = principalBeforePayment - balance + (monthlyPayment < interest ? interest : 0);
    if (principalPaid < 50) {
      const shortfall = 50 - principalPaid;
      balance = Math.max(0, balance - shortfall);
    }
  }
  
  const forgivenessDate = new Date();
  forgivenessDate.setFullYear(forgivenessDate.getFullYear() + 30);
  return { totalPaid, forgivenessDate, monthlyPayment: initialMonthlyPayment };
}

// --- ACCELERATED & TARGET PAYOFF ---

/**
 * Simulates an accelerated payoff for any loan plan.
 */
export const calculateAcceleratedPayoff = (principal, annualRate, baselinePlan, extraPayment, isIdrPlan) => {
  if (extraPayment <= 0) {
    return {
      monthlyPayment: baselinePlan.monthlyPayment,
      totalPaid: baselinePlan.totalPaid,
      payoffDate: baselinePlan.forgivenessDate || baselinePlan.payoffDate,
      totalInterest: baselinePlan.totalPaid - principal
    };
  }

  let balance = principal;
  const monthlyRate = annualRate / 12;
  const basePayment = typeof baselinePlan.monthlyPayment === 'number' ? baselinePlan.monthlyPayment : 0;
  const totalMonthlyPayment = basePayment + extraPayment;
  
  let totalPaid = 0;
  let month = 0;
  const maxMonths = 600; // 50 years

  while (balance > 0 && month < maxMonths) {
    month++;
    balance += balance * monthlyRate;
    const payment = Math.min(totalMonthlyPayment, balance);
    balance -= payment;
    totalPaid += payment;
  }

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + month);

  const paidOffBeforeForgiveness = isIdrPlan && baselinePlan.forgivenessDate && payoffDate < baselinePlan.forgivenessDate;

  return {
    baseline: {
      monthlyPayment: basePayment,
      totalPaid: baselinePlan.totalPaid,
      payoffDate: baselinePlan.forgivenessDate || baselinePlan.payoffDate,
      totalInterest: baselinePlan.totalPaid - principal,
      isForgivenessDate: !!baselinePlan.forgivenessDate
    },
    accelerated: {
      monthlyPayment: totalMonthlyPayment,
      totalPaid: totalPaid,
      payoffDate: payoffDate,
      totalInterest: totalPaid - principal,
    },
    savings: {
      interestSaved: (baselinePlan.totalPaid - principal) - (totalPaid - principal),
    },
    paidOffBeforeForgiveness: paidOffBeforeForgiveness
  };
};

/**
 * Calculates the required monthly payment to pay off a loan by a target year.
 */
export const calculateTargetYearPayment = (principal, annualRate, basePayment, targetYear) => {
  const currentYear = new Date().getFullYear();
  const termYears = targetYear - currentYear;

  if (termYears <= 0) {
    return { error: "Target year must be in the future." };
  }

  const requiredTotalPayment = calculateAmortizedPayment(principal, annualRate, termYears);
  
  if (basePayment >= requiredTotalPayment) {
    return { 
      error: "Your current payment plan already meets or beats this target year.",
      alreadyMeetsTarget: true 
    };
  }
  
  const requiredExtraPayment = requiredTotalPayment - basePayment;
  const payoffResult = calculateAcceleratedPayoff(principal, annualRate, { monthlyPayment: basePayment, totalPaid: Infinity }, requiredExtraPayment, false);

  return {
    ...payoffResult,
    requiredExtraPayment
  };
};

// --- MAIN FEDERAL LOAN CALCULATION FUNCTION ---

/**
 * Calculates all available repayment plans for federal loans under H.R. 1.
 */
export const calculatePlans = (financialProfile, loans) => {
  const totalFederalBalance = loans.reduce((acc, loan) => acc + parseFloat(loan.balance || 0), 0);
  if (totalFederalBalance === 0) return {};

  const weightedAverageRate = loans.reduce(
    (acc, loan) => acc + (parseFloat(loan.balance || 0) * (parseFloat(loan.rate || 0) / 100)), 
    0
  ) / totalFederalBalance;
  
  const { agi, familySize, stateOfResidence, filingStatus } = financialProfile;
  const plans = {};

  // --- STANDARD & LEGACY PLANS (Grandfathered for current borrowers) ---

  const standardMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 10);
  plans['10-Year Standard'] = { 
    monthlyPayment: standardMonthly, 
    totalPaid: standardMonthly * 120, 
    totalInterest: (standardMonthly * 120) - totalFederalBalance,
    payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)) 
  };

  [cite_start]// Standardized Repayment Plan (for new borrowers post-July 1, 2026, if they fail to select a plan) [cite: 139]
  const getStandardizedTerm = (balance) => {
    if (balance < 25000) return 10;
    // Note: The article is not exhaustive on tiers, this is an interpretation.
    if (balance < 40000) return 15;
    if (balance < 100000) return 20;
    return 25;
  };
  const tieredTerm = getStandardizedTerm(totalFederalBalance);
  const tieredMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, tieredTerm);
  plans['Standardized Repayment'] = { 
    monthlyPayment: tieredMonthly, 
    totalPaid: tieredMonthly * tieredTerm * 12, 
    totalInterest: (tieredMonthly * tieredTerm * 12) - totalFederalBalance,
    payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + tieredTerm)) 
  };

  // --- INCOME-DRIVEN REPAYMENT (IDR) PLANS ---
  
  [cite_start]// SAVE Plan (Judicially Blocked) [cite: 31]
  const saveResult = simulateLegacyIDR({ 
    principal: totalFederalBalance, 
    annualRate: weightedAverageRate, 
    forgivenessYears: 20, 
    initialAgi: agi, 
    familySize, 
    stateOfResidence, 
    povertyMultiplier: 2.25, // SAVE's more generous poverty exclusion
    paymentPercentage: 0.05, // Using 5% for undergrad debt as most generous case
    standardPaymentCap: standardMonthly 
  });
  plans['SAVE'] = { 
    ...saveResult, 
    totalInterest: saveResult.totalPaid - totalFederalBalance,
    isIdr: true, 
    status: 'Judicially Blocked',
    [cite_start]sunset: new Date('2028-07-01T00:00:00Z') // [cite: 128]
  };
  
  [cite_start]// Old IBR (for borrowers before July 1, 2014) [cite: 161]
  [cite_start]// NOTE: Partial Financial Hardship requirement was eliminated July 4, 2025 [cite: 157]
  const oldIbrResult = simulateLegacyIDR({ 
    principal: totalFederalBalance, annualRate: weightedAverageRate, forgivenessYears: 25, 
    initialAgi: agi, familySize, stateOfResidence, 
    povertyMultiplier: 1.5, paymentPercentage: 0.15, standardPaymentCap: standardMonthly 
  });
  plans['Old IBR'] = { ...oldIbrResult, totalInterest: oldIbrResult.totalPaid - totalFederalBalance, isIdr: true };
  
  [cite_start]// New IBR (for borrowers on or after July 1, 2014) [cite: 161]
  const newIbrResult = simulateLegacyIDR({ 
    principal: totalFederalBalance, annualRate: weightedAverageRate, forgivenessYears: 20, 
    initialAgi: agi, familySize, stateOfResidence, 
    povertyMultiplier: 1.5, paymentPercentage: 0.10, standardPaymentCap: standardMonthly 
  });
  plans['New IBR'] = { ...newIbrResult, totalInterest: newIbrResult.totalPaid - totalFederalBalance, isIdr: true };
  
  [cite_start]// PAYE (Sunsetting July 1, 2028) [cite: 128]
  const payeResult = simulateLegacyIDR({ 
    principal: totalFederalBalance, annualRate: weightedAverageRate, forgivenessYears: 20, 
    initialAgi: agi, familySize, stateOfResidence, 
    povertyMultiplier: 1.5, paymentPercentage: 0.10, standardPaymentCap: standardMonthly 
  });
  plans['PAYE'] = { ...payeResult, totalInterest: payeResult.totalPaid - totalFederalBalance, isIdr: true, sunset: new Date('2028-07-01T00:00:00Z') };

  [cite_start]// Repayment Assistance Plan (RAP) - The new default IDR plan under H.R. 1 [cite: 92]
  const rapResult = simulateRAP({ 
    principal: totalFederalBalance, annualRate: weightedAverageRate,
    initialAgi: agi, familySize, filingStatus 
  });
  plans['RAP'] = { ...rapResult, totalInterest: rapResult.totalPaid - totalFederalBalance, isIdr: true };
  
  [cite_start]// ICR (Sunsetting July 1, 2028) [cite: 128]
  const icrResult = simulateLegacyIDR({ 
    principal: totalFederalBalance, annualRate: weightedAverageRate, forgivenessYears: 25, 
    initialAgi: agi, familySize, stateOfResidence, 
    povertyMultiplier: 1.0, paymentPercentage: 0.20, standardPaymentCap: standardMonthly 
  });
  plans['ICR'] = { 
    ...icrResult, 
    totalInterest: icrResult.totalPaid - totalFederalBalance,
    monthlyPayment: Math.min(icrResult.monthlyPayment, standardMonthly), 
    isIdr: true, 
    sunset: new Date('2028-07-01T00:00:00Z')
  };

  return plans;
};

// --- PRIVATE LOAN CALCULATIONS ---

// Helper function to run the simulation for private loans
const runPrivateSimulation = (monthlyPayment, loansWithPayments, totalOriginalBalance) => {
  const loans = loansWithPayments.map(l => ({ ...l, currentBalance: l.balance }));
  const sortedLoans = [...loans].sort((a, b) => b.annualRate - a.annualRate); // Avalanche method
  
  let month = 0;
  let totalPaid = 0;
  const maxMonths = 600; 
  
  while (month < maxMonths) {
    month++;
    const remainingLoans = sortedLoans.filter(l => l.currentBalance > 0);
    if (remainingLoans.length === 0) break;
    
    remainingLoans.forEach(l => { l.currentBalance += l.currentBalance * l.monthlyRate; });
    
    let paymentRemaining = monthlyPayment;
    sortedLoans.forEach(l => {
      if (l.currentBalance <= 0) return;
      const minPay = Math.min(l.minPayment, l.currentBalance);
      l.currentBalance -= minPay;
      paymentRemaining -= minPay;
      totalPaid += minPay;
    });
    
    // Apply extra payment to highest interest loan first (Avalanche)
    if (paymentRemaining > 0) {
      for (const loan of sortedLoans) {
        if (paymentRemaining <= 0) break;
        if (loan.currentBalance > 0) {
          const extraPay = Math.min(paymentRemaining, loan.currentBalance);
          loan.currentBalance -= extraPay;
          paymentRemaining -= extraPay;
          totalPaid += extraPay;
        }
      }
    }
  }
  
  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + month - 1);
  const totalInterest = totalPaid - totalOriginalBalance;
  
  return { monthlyPayment, totalPaid, totalInterest, payoffDate };
};

/**
 * Calculates private loan payoff using Debt Avalanche strategy.
 */
export const calculatePrivateLoanPayoff = (privateLoans, calcMode, extraPayment = 0, targetYear) => {
  if (!privateLoans || privateLoans.length === 0) return null;

  let totalOriginalBalance = 0;
  const loansWithPayments = privateLoans.map(loan => {
    const balance = parseFloat(loan.balance);
    const annualRate = parseFloat(loan.rate) / 100;
    const termYears = parseFloat(loan.term);
    totalOriginalBalance += balance;
    const minPayment = calculateAmortizedPayment(balance, annualRate, termYears);
    return { id: loan.id, balance, annualRate, monthlyRate: annualRate / 12, minPayment };
  });
  const totalMinPayment = loansWithPayments.reduce((sum, loan) => sum + loan.minPayment, 0);

  const baseline = runPrivateSimulation(totalMinPayment, loansWithPayments, totalOriginalBalance);
  
  let finalResult;
  let requiredExtraPayment = null;

  if (calcMode === 'target') {
    const currentYear = new Date().getFullYear();
    const termYears = targetYear - currentYear;
    if (!targetYear || termYears <= 0) return { error: "Target year must be in the future." };
    
    const weightedAvgRate = loansWithPayments.reduce((acc, loan) => acc + (loan.balance * loan.annualRate), 0) / totalOriginalBalance;
    const requiredTotalPayment = calculateAmortizedPayment(totalOriginalBalance, weightedAvgRate, termYears);
    
    if (totalMinPayment >= requiredTotalPayment) {
      return { error: "Your minimum payments already meet this target.", alreadyMeetsTarget: true };
    }
    
    requiredExtraPayment = requiredTotalPayment - totalMinPayment;
    finalResult = runPrivateSimulation(requiredTotalPayment, loansWithPayments, totalOriginalBalance);

  } else { // 'extra' payment mode
    const totalPayment = totalMinPayment + parseFloat(extraPayment || 0);
    finalResult = runPrivateSimulation(totalPayment, loansWithPayments, totalOriginalBalance);
  }

  const savings = {
    interestSaved: baseline.totalInterest - finalResult.totalInterest,
    monthsSaved: Math.round((baseline.payoffDate - finalResult.payoffDate) / (1000 * 60 * 60 * 24 * 30.44))
  };

  return { baseline, accelerated: finalResult, savings, requiredExtraPayment };
};