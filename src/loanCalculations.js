// ============================================================================
// LOAN CALCULATIONS MODULE
// Handles all federal and private student loan repayment calculations
// ============================================================================

// --- UTILITY FUNCTIONS ---

/**
 * Get federal poverty guideline based on family size and state
 * Uses 2024 poverty guidelines with Alaska/Hawaii adjustments
 */
function getPovertyGuideline(familySize, stateOfResidence) {
  const basePovertyLine = 15060;
  const perMember = 5380;
  const multiplier = (stateOfResidence === 'AK' || stateOfResidence === 'HI') ? 1.25 : 1;
  return (basePovertyLine + (Math.max(0, familySize - 1) * perMember)) * multiplier;
}

/**
 * Calculate discretionary income for IDR plans
 * Discretionary income = AGI - (poverty guideline × multiplier)
 */
function calculateDiscretionaryIncome(agi, familySize, stateOfResidence, povertyLineMultiplier = 1.5) {
  const povertyGuideline = getPovertyGuideline(familySize, stateOfResidence);
  return Math.max(0, agi - (povertyGuideline * povertyLineMultiplier));
}

/**
 * Calculate standard amortization payment (exported for external use)
 * Uses the standard mortgage/loan amortization formula
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
 * Simulates standard IDR plans (IBR, PAYE, ICR)
 * Features:
 * - Annual income growth (3%)
 * - Payment cap at 10-year standard amount
 * - Monthly interest accrual
 * - Returns payoff or forgiveness results
 */
function simulateIDR({ 
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
  
  // Calculate initial payment with cap
  const initialDiscretionary = calculateDiscretionaryIncome(initialAgi, familySize, stateOfResidence, povertyMultiplier);
  const initialMonthlyPayment = Math.min(standardPaymentCap, (initialDiscretionary * paymentPercentage) / 12);

  for (let month = 1; month <= forgivenessMonths; month++) {
    // Check if loan is paid off early
    if (balance <= 0) {
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + month - 1);
      return { totalPaid, payoffDate, monthlyPayment: initialMonthlyPayment };
    }

    // Apply annual income growth (3% per year)
    if (month > 1 && (month - 1) % 12 === 0) {
      currentAgi *= 1.03;
    }
    
    // Recalculate payment based on current income
    const discretionaryIncome = calculateDiscretionaryIncome(currentAgi, familySize, stateOfResidence, povertyMultiplier);
    const currentMonthlyPayment = Math.min(standardPaymentCap, (discretionaryIncome * paymentPercentage) / 12);
    
    // Apply interest
    const interest = balance * monthlyRate;
    balance += interest;
    
    // Make payment (cannot exceed remaining balance)
    const payment = Math.min(currentMonthlyPayment, balance);
    balance -= payment;
    totalPaid += payment;
  }

  // Reached forgiveness period
  return { 
    totalPaid, 
    forgivenessDate: new Date(new Date().setFullYear(new Date().getFullYear() + forgivenessYears)), 
    monthlyPayment: initialMonthlyPayment 
  };
}

/**
 * Simulates the Repayment Assistance Plan (RAP)
 * Features:
 * - Tiered payment percentage based on AGI
 * - $50 deduction per dependent
 * - $10 minimum monthly payment
 * - Interest subsidy (unpaid interest waived)
 * - $50 principal reduction guarantee
 * - 30-year forgiveness timeline
 */
function simulateRAP({ 
  principal, 
  annualRate, 
  initialAgi, 
  familySize, 
  stateOfResidence, 
  filingStatus, 
  standardPaymentCap 
}) {
  let balance = principal;
  let totalPaid = 0;
  let currentAgi = initialAgi;
  const monthlyRate = annualRate / 12;
  const forgivenessMonths = 30 * 12;

  /**
   * RAP payment percentage lookup table
   * Returns the percentage of AGI to be paid annually
   */
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

  // Calculate dependents (single: family - 1, married: family - 2)
  const dependents = filingStatus === 'single' 
    ? Math.max(0, familySize - 1) 
    : Math.max(0, familySize - 2);
  
  // Calculate initial payment
  const initialAnnualPayment = (initialAgi * getRAPPaymentPercentage(initialAgi)) - (dependents * 50);
  const initialMonthlyPayment = Math.min(standardPaymentCap, Math.max(10, initialAnnualPayment / 12));
  
  for (let month = 1; month <= forgivenessMonths; month++) {
    // Check if loan is paid off early
    if (balance <= 0) {
      const payoffDate = new Date();
      payoffDate.setMonth(payoffDate.getMonth() + month - 1);
      return { totalPaid, payoffDate, monthlyPayment: initialMonthlyPayment };
    }

    // Apply annual income growth (3% per year)
    if (month > 1 && (month - 1) % 12 === 0) {
      currentAgi *= 1.03;
    }
    
    // Calculate current payment
    const annualPayment = (currentAgi * getRAPPaymentPercentage(currentAgi)) - (dependents * 50);
    const monthlyPayment = Math.min(standardPaymentCap, Math.max(10, annualPayment / 12));

    // Calculate interest
    const interest = balance * monthlyRate;
    const principalBeforePayment = balance;

    // Interest Subsidy: If payment < interest, unpaid interest is waived
    if (monthlyPayment < interest) {
      // Interest subsidy applies - don't add any interest to balance
    } else {
      // Normal case - add interest before payment
      balance += interest;
    }
    
    // Make payment
    const paymentApplied = Math.min(monthlyPayment, balance);
    balance -= paymentApplied;
    totalPaid += paymentApplied;
    
    // Calculate how much principal was reduced
    const principalPaid = principalBeforePayment + ((monthlyPayment < interest) ? interest : 0) - balance;

    // $50 Principal Reduction Guarantee
    if (principalPaid < 50) {
      const shortfall = 50 - principalPaid;
      balance = Math.max(0, balance - shortfall);
    }
  }
  
  // Reached forgiveness period
  return { 
    totalPaid, 
    forgivenessDate: new Date(new Date().setFullYear(new Date().getFullYear() + 30)), 
    monthlyPayment: initialMonthlyPayment 
  };
}

/**
 * Simulates an accelerated payoff for a federal loan plan
 * Features:
 * - Takes a baseline plan and an extra monthly payment
 * - Recalculates payoff date and total cost
 * - Determines if the loan is paid off before forgiveness
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
  const maxMonths = 600; // Safety break at 50 years

  while (balance > 0 && month < maxMonths) {
    month++;
    
    // Add interest for the month
    const interest = balance * monthlyRate;
    balance += interest;
    
    // Make the accelerated payment
    const payment = Math.min(totalMonthlyPayment, balance);
    balance -= payment;
    totalPaid += payment;
  }

  const payoffDate = new Date();
  payoffDate.setMonth(payoffDate.getMonth() + month);

  // Compare payoff date with original forgiveness date
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

  // Now, use the accelerated payoff logic to get the full picture
  const payoffResult = calculateAcceleratedPayoff(principal, annualRate, { monthlyPayment: basePayment, totalPaid: Infinity }, requiredExtraPayment, false);

  return {
    ...payoffResult,
    requiredExtraPayment
  };
};

// --- MAIN FEDERAL LOAN CALCULATION FUNCTION ---

/**
 * Calculate all available repayment plans for federal loans
 * Returns an object with plan names as keys and plan details as values
 */
export const calculatePlans = (financialProfile, loans) => {
  // Calculate total balance and weighted average interest rate
  const totalFederalBalance = loans.reduce((acc, loan) => acc + parseFloat(loan.balance || 0), 0);
  if (totalFederalBalance === 0) return {};

  const weightedAverageRate = loans.reduce(
    (acc, loan) => acc + (parseFloat(loan.balance || 0) * (parseFloat(loan.rate || 0) / 100)), 
    0
  ) / totalFederalBalance;
  
  const { agi, familySize, stateOfResidence, filingStatus } = financialProfile;
  const plans = {};

  // --- STANDARD PLANS ---

  // 10-Year Standard Plan
  const standardMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 10);
  plans['10-Year Standard'] = { 
    monthlyPayment: standardMonthly, 
    totalPaid: standardMonthly * 120, 
    payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)) 
  };

  // Graduated Repayment Plan (simplified)
  plans['Graduated'] = { 
    monthlyPayment: `Starts at ~$${(standardMonthly * 0.75).toFixed(2)}, increases every 2 years`, 
    totalPaid: standardMonthly * 120 * 1.1, 
    payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)) 
  };

  // Extended Repayment Plan (requires $30k+ balance)
  if (totalFederalBalance >= 30000) {
    const extendedMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 25);
    plans['Extended'] = { 
      monthlyPayment: extendedMonthly, 
      totalPaid: extendedMonthly * 300, 
      payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + 25)) 
    };
  }
  
  // Standardized Tiered Plan (term based on balance)
  const getStandardizedTieredTerm = (balance) => {
    if (balance < 7500) return 10;
    if (balance < 10000) return 12;
    if (balance < 20000) return 15;
    if (balance < 40000) return 20;
    if (balance < 60000) return 25;
    return 30;
  };
  
  const tieredTerm = getStandardizedTieredTerm(totalFederalBalance);
  const tieredMonthly = calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, tieredTerm);
  plans['Standardized Tiered Plan'] = { 
    monthlyPayment: tieredMonthly, 
    totalPaid: tieredMonthly * tieredTerm * 12, 
    payoffDate: new Date(new Date().setFullYear(new Date().getFullYear() + tieredTerm)) 
  };

  // --- INCOME-DRIVEN REPAYMENT (IDR) PLANS ---

  // Old IBR (15% payment, 25-year forgiveness, 150% poverty line)
  const oldIbrResult = simulateIDR({ 
    principal: totalFederalBalance, 
    annualRate: weightedAverageRate, 
    forgivenessYears: 25, 
    initialAgi: agi, 
    familySize, 
    stateOfResidence, 
    povertyMultiplier: 1.5, 
    paymentPercentage: 0.15, 
    standardPaymentCap: standardMonthly 
  });
  plans['Old IBR'] = { ...oldIbrResult, isIdr: true };
  
  // New IBR (10% payment, 20-year forgiveness, 150% poverty line)
  const newIbrResult = simulateIDR({ 
    principal: totalFederalBalance, 
    annualRate: weightedAverageRate, 
    forgivenessYears: 20, 
    initialAgi: agi, 
    familySize, 
    stateOfResidence, 
    povertyMultiplier: 1.5, 
    paymentPercentage: 0.10, 
    standardPaymentCap: standardMonthly 
  });
  plans['New IBR'] = { ...newIbrResult, isIdr: true };
  
  // PAYE (10% payment, 20-year forgiveness, 150% poverty line, sunsets 2028)
  const payeResult = simulateIDR({ 
    principal: totalFederalBalance, 
    annualRate: weightedAverageRate, 
    forgivenessYears: 20, 
    initialAgi: agi, 
    familySize, 
    stateOfResidence, 
    povertyMultiplier: 1.5, 
    paymentPercentage: 0.10, 
    standardPaymentCap: standardMonthly 
  });
  plans['PAYE'] = { ...payeResult, isIdr: true, sunset: new Date('2028-07-01') };

  // RAP (Repayment Assistance Plan - tiered payment, 30-year forgiveness)
  const rapResult = simulateRAP({ 
    principal: totalFederalBalance, 
    annualRate: weightedAverageRate, 
    initialAgi: agi, 
    familySize, 
    stateOfResidence, 
    filingStatus, 
    standardPaymentCap: standardMonthly 
  });
  plans['RAP'] = { ...rapResult, isIdr: true };
  
  // ICR (20% payment, 25-year forgiveness, 100% poverty line, sunsets 2028)
  const icrMonthly = Math.min(
    (calculateDiscretionaryIncome(agi, familySize, stateOfResidence, 1.0) * 0.20) / 12,
    calculateAmortizedPayment(totalFederalBalance, weightedAverageRate, 12)
  );
  const icrResult = simulateIDR({ 
    principal: totalFederalBalance, 
    annualRate: weightedAverageRate, 
    forgivenessYears: 25, 
    initialAgi: agi, 
    familySize, 
    stateOfResidence, 
    povertyMultiplier: 1.0, 
    paymentPercentage: 0.20, 
    standardPaymentCap: standardMonthly 
  });
  plans['ICR'] = { 
    ...icrResult, 
    monthlyPayment: Math.min(icrMonthly, standardMonthly), 
    isIdr: true, 
    sunset: new Date('2028-07-01')
  };

  return plans;
};

// --- PRIVATE LOAN CALCULATIONS ---

/**
 * Calculates private loan payoff using Debt Avalanche, enhanced for both Extra Payment and Target Year modes.
 */
export const calculatePrivateLoanPayoff = (privateLoans, calcMode, extraPayment = 0, targetYear) => {
  if (!privateLoans || privateLoans.length === 0) return null;

  // --- Shared Setup and Baseline Calculation ---
  let totalOriginalBalance = 0;
  const loansWithPayments = privateLoans.map(loan => {
    const balance = parseFloat(loan.balance);
    const annualRate = parseFloat(loan.rate) / 100;
    const termYears = parseFloat(loan.term);
    totalOriginalBalance += balance;
    const minPayment = calculateAmortizedPayment(balance, annualRate, termYears);
    return {
      id: loan.id,
      balance,
      annualRate,
      monthlyRate: annualRate / 12,
      minPayment
    };
  });
  const totalMinPayment = loansWithPayments.reduce((sum, loan) => sum + loan.minPayment, 0);

  // Helper function to run the simulation
  const runSimulation = (monthlyPayment) => {
    const loans = loansWithPayments.map(l => ({ ...l, currentBalance: l.balance }));
    const sortedLoans = [...loans].sort((a, b) => b.annualRate - a.annualRate);
    
    let month = 0;
    let totalPaid = 0;
    const maxMonths = 600; // 50 year safety limit
    
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

  // Calculate baseline results (minimum payments only)
  const baseline = runSimulation(totalMinPayment);
  
  // --- Mode-Specific Calculations ---
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
    finalResult = runSimulation(requiredTotalPayment);

  } else { // Default to 'extra' payment mode
    const totalPayment = totalMinPayment + parseFloat(extraPayment || 0);
    finalResult = runSimulation(totalPayment);
  }

  // --- Final Output ---
  const savings = {
    interestSaved: baseline.totalInterest - finalResult.totalInterest,
    monthsSaved: Math.round((baseline.payoffDate - finalResult.payoffDate) / (1000 * 60 * 60 * 24 * 30.44))
  };
  savings.yearsSaved = Math.floor(savings.monthsSaved / 12);
  savings.remainingMonths = savings.monthsSaved % 12;

  return {
    baseline,
    accelerated: finalResult,
    savings,
    requiredExtraPayment,
  };
};
