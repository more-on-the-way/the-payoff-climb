// --- UTILITY FUNCTIONS ---

function getPovertyGuideline(familySize, stateOfResidence) {
  const basePovertyLine = 15060;
  const perMember = 5380;
  const multiplier = (stateOfResidence === 'AK' || stateOfResidence === 'HI') ? 1.25 : 1;
  return (basePovertyLine + (Math.max(0, familySize - 1) * perMember)) * multiplier;
};

export function calculateAmortizedPayment(principal, annualRate, years) {
  if (principal <= 0 || years <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const numberOfPayments = years * 12;
  if (monthlyRate <= 0) return principal / numberOfPayments;
  return principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
};

// --- NEW: PRIVATE LOAN CALCULATION ---
export function calculatePrivateLoanPayoff(loans, extraPayment = 0) {
    if (!loans || loans.length === 0) return null;

    let totalPrincipal = loans.reduce((acc, loan) => acc + parseFloat(loan.balance || 0), 0);
    let totalMinPayment = 0;

    const loansCopy = loans.map(l => {
        const principal = parseFloat(l.balance || 0);
        const annualRate = parseFloat(l.rate || 0) / 100;
        const years = parseFloat(l.term || 0);
        const monthlyPayment = calculateAmortizedPayment(principal, annualRate, years);
        totalMinPayment += monthlyPayment;
        return {
            id: l.id,
            balance: principal,
            originalBalance: principal,
            monthlyRate: annualRate / 12,
            minPayment: monthlyPayment,
            rate: l.rate,
        };
    }).sort((a, b) => b.monthlyRate - a.monthlyRate);

    let totalPaid = 0;
    let months = 0;
    let totalBalance = totalPrincipal;

    while (totalBalance > 0 && months < 600) {
        months++;
        let paymentPool = totalMinPayment + extraPayment;
        let interestForMonth = 0;

        loansCopy.forEach(loan => {
            if (loan.balance > 0) {
                interestForMonth += loan.balance * loan.monthlyRate;
            }
        });
        
        totalPaid += Math.min(paymentPool, totalBalance + interestForMonth);
        totalBalance += interestForMonth - paymentPool;
        
        if (totalBalance < 0) totalBalance = 0;

        // Simplified balance update for display purposes
        let remainingPayment = totalMinPayment + extraPayment;
        loansCopy.forEach(loan => {
           if (loan.balance > 0) {
               const interest = loan.balance * loan.monthlyRate;
               const paymentForLoan = Math.min(loan.balance + interest, remainingPayment);
               loan.balance -= (paymentForLoan - interest);
               remainingPayment -= paymentForLoan;
               if (loan.balance < 0) loan.balance = 0;
           }
        });
    }

    const payoffDate = new Date();
    payoffDate.setMonth(payoffDate.getMonth() + months);

    return {
        monthlyPayment: totalMinPayment + extraPayment,
        totalPaid: totalPaid,
        payoffDate: payoffDate,
        totalInterest: totalPaid - totalPrincipal,
    };
}

// --- FEDERAL SIMULATION ENGINES ---
// (Your existing, correct federal loan functions go here)
// Make sure the full, correct calculatePlans function is present below this line.
