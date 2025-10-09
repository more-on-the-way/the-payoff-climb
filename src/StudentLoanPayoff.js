import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, Target, Award, Save, Download, RefreshCw, BarChart3, FileText, ChevronLeft, PlusCircle, XCircle } from 'lucide-react';

const Card = ({ children, className = '', ...props }) => (
  <div className={`bg-white rounded-2xl shadow-lg p-6 sm:p-8 ${className}`} {...props}>
    {children}
  </div>
);

const Input = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      id={id}
      {...props}
      className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    />
  </div>
);

const Select = ({ label, id, children, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select
      id={id}
      {...props}
      className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    >
      {children}
    </select>
  </div>
);

const Button = ({ onClick, children, variant = 'primary', className = '', ...props }) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-sm hover:shadow-md',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-indigo-500',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    ghost: 'bg-transparent text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500',
  };
  return (
    <button onClick={onClick} className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};


export default function StudentLoanPayoff() {
  const [view, setView] = useState('input');

  // Financial Profile State
  const [agi, setAgi] = useState('');
  const [familySize, setFamilySize] = useState('1');
  const [stateOfResidence, setStateOfResidence] = useState('CA');
  const [filingStatus, setFilingStatus] = useState('single');

  // Loans State
  const [loans, setLoans] = useState([]);
  const [plansToTakeNewLoan, setPlansToTakeNewLoan] = useState(null); // null, 'yes', or 'no'

  // Payoff Strategy State
  const [goalMode, setGoalMode] = useState('extra');
  const [extraPayment, setExtraPayment] = useState('');
  const [targetYears, setTargetYears] = useState('');

  // PSLF State
  const [trackPSLF, setTrackPSLF] = useState(false);
  const [pslfPaymentsMade, setPslfPaymentsMade] = useState('');
  const [pslfPaymentsRequired, setPslfPaymentsRequired] = useState('120');

  // Results and Scenarios State
  const [results, setResults] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [activeScenario, setActiveScenario] = useState(null);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [compareScenarios, setCompareScenarios] = useState([]);

  // Other Tool States
  const [refinanceRate, setRefinanceRate] = useState('');
  const [refinanceTerm, setRefinanceTerm] = useState('');
  const [idrAGI, setIdrAGI] = useState('');
  const [idrFamilySize, setIdrFamilySize] = useState('1');

  const addLoan = () => {
    setLoans([...loans, {
      id: Date.now(),
      type: null,
      name: '',
      balance: '',
      rate: '',
      minPayment: '',
      originationDate: '',
      term: '',
      gracePeriod: false,
      graceMonths: '',
      lender: ''
    }]);
  };

  const removeLoan = (id) => {
    if (loans.length > 0) {
      setLoans(loans.filter(l => l.id !== id));
    }
  };

  const updateLoan = (id, field, value) => {
    setLoans(loans.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const setLoanType = (id, type) => {
    setLoans(loans.map(l => l.id === id ? { ...l, type: type } : l));
  };

  const calculateGraceInterest = (loan) => {
    if (!loan.gracePeriod || !loan.graceMonths) return 0;
    const monthlyRate = parseFloat(loan.rate) / 100 / 12;
    const balance = parseFloat(loan.balance);
    const months = parseInt(loan.graceMonths);
    return balance * monthlyRate * months;
  };

  const calculatePayoffPlan = (loansData, extra, method) => {
    let loansCopy = loansData.map(l => ({
      ...l,
      balance: parseFloat(l.balance) + calculateGraceInterest(l),
      rate: parseFloat(l.rate),
      minPayment: parseFloat(l.minPayment)
    }));

    if (method === 'avalanche') {
      loansCopy.sort((a, b) => b.rate - a.rate);
    } else {
      loansCopy.sort((a, b) => a.balance - b.balance);
    }

    let totalInterest = 0;
    let month = 0;
    const monthlyData = [];

    while (loansCopy.some(l => l.balance > 0) && month < 600) {
      month++;
      let extraRemaining = extra;
      let monthlyPrincipal = 0;
      let monthlyInterest = 0;

      loansCopy.forEach(loan => {
        if (loan.balance > 0) {
          const interest = loan.balance * (loan.rate / 100 / 12);
          monthlyInterest += interest;
          totalInterest += interest;

          let payment = loan.minPayment;
          if (extraRemaining > 0 && loansCopy.filter(l => l.balance > 0)[0].id === loan.id) {
            payment += extraRemaining;
            extraRemaining = 0;
          }

          const principal = Math.min(payment - interest, loan.balance);
          monthlyPrincipal += principal;
          loan.balance = Math.max(0, loan.balance - principal);
        }
      });

      const totalRemaining = loansCopy.reduce((sum, l) => sum + l.balance, 0);
      monthlyData.push({
        month,
        principal: monthlyPrincipal,
        interest: monthlyInterest,
        remaining: totalRemaining
      });
    }

    return { months: month, totalInterest, monthlyData };
  };

  const calculateRequiredExtra = (loansData, years) => {
    const targetMonths = years * 12;
    let low = 0;
    let high = 10000;
    let result = 0;

    while (high - low > 0.5) {
      const mid = (low + high) / 2;
      const { months } = calculatePayoffPlan(loansData, mid, 'avalanche');

      if (months <= targetMonths) {
        result = mid;
        high = mid;
      } else {
        low = mid;
      }
    }

    return Math.ceil(result);
  };

  const handleCalculate = () => {
    const validLoans = loans.filter(l =>
      l.balance && l.rate && l.minPayment && l.type &&
      parseFloat(l.balance) > 0 && parseFloat(l.rate) >= 0 && parseFloat(l.minPayment) >= 0
    );

    if (validLoans.length === 0) {
      alert('Please add at least one valid loan with all required fields.');
      return;
    }

    let extra = 0;
    let calculatedExtra = null;

    if (goalMode === 'extra') {
      extra = parseFloat(extraPayment) || 0;
    } else {
      const years = parseFloat(targetYears);
      if (years > 0) {
        extra = calculateRequiredExtra(validLoans, years);
        calculatedExtra = extra;
      }
    }

    const avalanche = calculatePayoffPlan(validLoans, extra, 'avalanche');
    const snowball = calculatePayoffPlan(validLoans, extra, 'snowball');

    const totalMinPayment = validLoans.reduce((sum, l) => sum + parseFloat(l.minPayment), 0);
    const totalBalance = loans.reduce((sum, l) => sum + parseFloat(l.balance || 0) + calculateGraceInterest(l), 0);

    setResults({
      avalanche,
      snowball,
      extra,
      calculatedExtra,
      targetYears: goalMode === 'target' ? parseFloat(targetYears) : null,
      totalMinPayment,
      totalBalance,
      loans: validLoans
    });

    setMonthlyBreakdown(avalanche.monthlyData);
    setView('results');
  };

  const saveScenario = () => {
    if (!results) {
      alert('No results to save. Please calculate a plan first.');
      return;
    }
    setShowSaveDialog(true);
  };

  const confirmSaveScenario = () => {
    if (!scenarioName.trim()) {
      alert('Please enter a name for this scenario.');
      return;
    }

    const currentTime = Date.now();
    const newScenario = {
      id: currentTime,
      name: scenarioName.trim(),
      date: new Date().toLocaleDateString(),
      resultsData: {
        avalancheMonths: results.avalanche.months,
        avalancheTotalInterest: results.avalanche.totalInterest,
        snowballMonths: results.snowball.months,
        snowballTotalInterest: results.snowball.totalInterest,
        extra: results.extra,
        calculatedExtra: results.calculatedExtra,
        targetYears: results.targetYears,
        totalMinPayment: results.totalMinPayment,
        totalBalance: results.totalBalance
      },
      savedLoans: loans.map(l => ({
        loanId: l.id,
        loanName: l.name,
        loanBalance: l.balance,
        loanRate: l.rate,
        loanMinPayment: l.minPayment,
        currentBalance: parseFloat(l.balance || 0) + calculateGraceInterest(l)
      }))
    };

    const updatedScenarios = [...scenarios, newScenario];
    setScenarios(updatedScenarios);
    setShowSaveDialog(false);
    setScenarioName('');
    alert('Scenario saved successfully!');
  };

  const loadScenario = (scenario) => {
    const reconstructedScenario = {
      id: scenario.id,
      name: scenario.name,
      date: scenario.date,
      results: scenario.resultsData,
      loans: scenario.savedLoans.map(l => ({
        id: l.loanId,
        name: l.loanName,
        balance: l.loanBalance,
        rate: l.loanRate,
        minPayment: l.minPayment,
        currentBalance: l.currentBalance
      }))
    };
    setActiveScenario(reconstructedScenario);
    setView('progress');
  };

  const deleteScenario = (id) => {
    const updatedScenarios = scenarios.filter(s => s.id !== id);
    setScenarios(updatedScenarios);
    setCompareScenarios(compareScenarios.filter(cId => cId !== id));
  };

  const toggleCompare = (id) => {
    if (compareScenarios.includes(id)) {
      setCompareScenarios(compareScenarios.filter(cId => cId !== id));
    } else {
      if (compareScenarios.length < 3) {
        setCompareScenarios([...compareScenarios, id]);
      } else {
        alert('You can compare up to 3 scenarios at once');
      }
    }
  };

  const logPayment = (loanId, amount) => {
    if (!activeScenario) return;

    const updatedLoans = activeScenario.loans.map(l => {
      if (l.id === loanId) {
        const payment = parseFloat(amount) || 0;
        const monthlyRate = parseFloat(l.rate) / 100 / 12;
        const interestAccrued = l.currentBalance * monthlyRate;
        const principalPaid = Math.max(0, payment - interestAccrued);
        const newBalance = Math.max(0, l.currentBalance + interestAccrued - payment);

        return {
          ...l,
          currentBalance: newBalance,
          lastPaymentDate: new Date().toLocaleDateString(),
          lastInterestAccrued: interestAccrued,
          lastPrincipalPaid: principalPaid
        };
      }
      return l;
    });

    setActiveScenario({ ...activeScenario, loans: updatedLoans });
  };

  const exportToCSV = () => {
    if (!monthlyBreakdown || monthlyBreakdown.length === 0) {
      alert('No data to export. Please calculate a plan first.');
      return;
    }

    let csv = 'Month,Principal Paid,Interest Paid,Remaining Balance\n';
    monthlyBreakdown.forEach(row => {
      csv += `${row.month},${row.principal.toFixed(2)},${row.interest.toFixed(2)},${row.remaining.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'payoff-plan.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const calculateRefinance = () => {
    if (!results || !refinanceRate || !refinanceTerm) return null;

    const rate = parseFloat(refinanceRate) / 100 / 12;
    const months = parseFloat(refinanceTerm) * 12;
    const principal = results.totalBalance;

    const payment = principal * (rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1);
    const totalPaid = payment * months;
    const totalInterest = totalPaid - principal;

    const currentTotal = results.totalMinPayment * results.avalanche.months + results.avalanche.totalInterest;
    const savings = currentTotal - totalPaid;

    return { payment, totalInterest, totalPaid, savings };
  };

  const calculateIDR = () => {
    if (!idrAGI) return null;

    const agiValue = parseFloat(idrAGI);
    const familySizeValue = parseInt(idrFamilySize);
    const povertyLine = 15060 + (familySizeValue - 1) * 5380;

    const ibr = Math.max(0, (agiValue - 1.5 * povertyLine) * 0.15 / 12);
    const paye = Math.max(0, (agiValue - 1.5 * povertyLine) * 0.10 / 12);
    const newPlan = Math.max(0, (agiValue - 2.25 * povertyLine) * 0.05 / 12);

    return { ibr, paye, newPlan };
  };

  const showNewLoanQuestionConditional = useMemo(() => {
    return loans.some(
      (loan) => loan.type === 'Federal' && (loan.originationDate === 'before-2014' || loan.originationDate === 'on-or-after-2014')
    );
  }, [loans]);

  if (view === 'input') {
    return (
      <div className="min-h-screen bg-gray-50 font-sans p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 tracking-tight">
              Student Loan Payoff Calculator
            </h1>
            <p className="text-md text-gray-600 mt-2">
              Plan your path to financial freedom.
            </p>
          </header>

          <Card>
            <div className="space-y-8">
              {/* Financial Profile Section */}
              <section>
                <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-3 mb-6">
                  Your Financial Profile
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <Input
                    label="Adjusted Gross Income (AGI)"
                    id="agi"
                    type="number"
                    placeholder="e.g., 50000"
                    value={agi}
                    onChange={(e) => setAgi(e.target.value)}
                  />
                  <Input
                    label="Family Size"
                    id="familySize"
                    type="number"
                    placeholder="e.g., 1"
                    value={familySize}
                    onChange={(e) => setFamilySize(e.target.value)}
                  />
                  <Select
                    label="State of Residence"
                    id="state"
                    value={stateOfResidence}
                    onChange={(e) => setStateOfResidence(e.target.value)}
                  >
                    <option value="AL">Alabama</option><option value="AK">Alaska</option><option value="AZ">Arizona</option><option value="AR">Arkansas</option><option value="CA">California</option><option value="CO">Colorado</option><option value="CT">Connecticut</option><option value="DE">Delaware</option><option value="FL">Florida</option><option value="GA">Georgia</option><option value="HI">Hawaii</option><option value="ID">Idaho</option><option value="IL">Illinois</option><option value="IN">Indiana</option><option value="IA">Iowa</option><option value="KS">Kansas</option><option value="KY">Kentucky</option><option value="LA">Louisiana</option><option value="ME">Maine</option><option value="MD">Maryland</option><option value="MA">Massachusetts</option><option value="MI">Michigan</option><option value="MN">Minnesota</option><option value="MS">Mississippi</option><option value="MO">Missouri</option><option value="MT">Montana</option><option value="NE">Nebraska</option><option value="NV">Nevada</option><option value="NH">New Hampshire</option><option value="NJ">New Jersey</option><option value="NM">New Mexico</option><option value="NY">New York</option><option value="NC">North Carolina</option><option value="ND">North Dakota</option><option value="OH">Ohio</option><option value="OK">Oklahoma</option><option value="OR">Oregon</option><option value="PA">Pennsylvania</option><option value="RI">Rhode Island</option><option value="SC">South Carolina</option><option value="SD">South Dakota</option><option value="TN">Tennessee</option><option value="TX">Texas</option><option value="UT">Utah</option><option value="VT">Vermont</option><option value="VA">Virginia</option><option value="WA">Washington</option><option value="WV">West Virginia</option><option value="WI">Wisconsin</option><option value="WY">Wyoming</option>
                  </Select>
                  <Select
                    label="Tax Filing Status"
                    id="filingStatus"
                    value={filingStatus}
                    onChange={(e) => setFilingStatus(e.target.value)}
                  >
                    <option value="single">Single</option>
                    <option value="marriedFilingJointly">Married Filing Jointly</option>
                    <option value="marriedFilingSeparately">Married Filing Separately</option>
                  </Select>
                </div>
              </section>

              {/* Loans Section */}
              <section>
                <div className="flex justify-between items-center border-b-2 border-gray-200 pb-3 mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900">Your Loans</h2>
                  <Button onClick={addLoan} variant="primary">
                    <PlusCircle size={20} />
                    Add Loan
                  </Button>
                </div>
                <div className="space-y-4">
                  {loans.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-500">Add a loan to get started.</p>
                    </div>
                  )}
                  {loans.map((loan, index) => (
                    <div key={loan.id} className="bg-gray-50 p-6 rounded-lg border border-gray-200 relative">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">
                          Loan #{index + 1}
                          {loan.type && (
                            <span className={`ml-3 text-xs font-medium px-2.5 py-0.5 rounded-full ${
                              loan.type === 'Federal' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {loan.type}
                            </span>
                          )}
                        </h3>
                        <button onClick={() => removeLoan(loan.id)} className="text-red-500 hover:text-red-700">
                          <XCircle size={20} />
                        </button>
                      </div>

                      {!loan.type ? (
                        <div className="flex flex-col sm:flex-row gap-4 p-4 items-center justify-center">
                          <p className="font-medium text-gray-700">What type of loan is this?</p>
                          <Button onClick={() => setLoanType(loan.id, 'Federal')} className="w-full sm:w-auto">Federal</Button>
                          <Button onClick={() => setLoanType(loan.id, 'Private')} className="w-full sm:w-auto" variant="secondary">Private</Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                          <div className="md:col-span-2">
                            <Input
                              label="Loan Name (Optional)"
                              id={`name-${loan.id}`}
                              type="text"
                              placeholder="e.g., 'My Grad Loan'"
                              value={loan.name}
                              onChange={(e) => updateLoan(loan.id, 'name', e.target.value)}
                            />
                          </div>
                          <Input
                            label="Current Balance ($)"
                            id={`balance-${loan.id}`}
                            type="number"
                            placeholder="25000"
                            value={loan.balance}
                            onChange={(e) => updateLoan(loan.id, 'balance', e.target.value)}
                          />
                          <Input
                            label="Interest Rate (%)"
                            id={`rate-${loan.id}`}
                            type="number"
                            placeholder="5.5"
                            value={loan.rate}
                            onChange={(e) => updateLoan(loan.id, 'rate', e.target.value)}
                          />
                          {loan.type === 'Federal' ? (
                            <>
                              <Select
                                label="Loan Origination Date"
                                id={`origination-${loan.id}`}
                                value={loan.originationDate}
                                onChange={(e) => updateLoan(loan.id, 'originationDate', e.target.value)}
                              >
                                <option value="">Select a date range</option>
                                <option value="before-2014">My first loan was before July 1, 2014</option>
                                <option value="on-or-after-2014">My first loan was on or after July 1, 2014</option>
                                <option value="after-2026">My first loan will be on or after July 1, 2026</option>
                              </Select>
                              <Input
                                label="Minimum Monthly Payment ($)"
                                id={`minPayment-${loan.id}`}
                                type="number"
                                placeholder="250"
                                value={loan.minPayment}
                                onChange={(e) => updateLoan(loan.id, 'minPayment', e.target.value)}
                              />
                            </>
                          ) : ( // Private Loan
                            <>
                              <Input
                                label="Remaining Term (years)"
                                id={`term-${loan.id}`}
                                type="number"
                                placeholder="e.g., 10"
                                value={loan.term}
                                onChange={(e) => updateLoan(loan.id, 'term', e.target.value)}
                              />
                               <Input
                                label="Minimum Monthly Payment ($)"
                                id={`minPayment-${loan.id}`}
                                type="number"
                                placeholder="250"
                                value={loan.minPayment}
                                onChange={(e) => updateLoan(loan.id, 'minPayment', e.target.value)}
                              />
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {showNewLoanQuestionConditional && (
                <section>
                  <Card className="bg-amber-50 border border-amber-200">
                    <h3 className="font-semibold text-gray-800 mb-2">Future Federal Loans</h3>
                    <p className="text-gray-700 mb-3">Are you planning to take out any new federal loans on or after July 1, 2026?</p>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setPlansToTakeNewLoan('yes')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                          plansToTakeNewLoan === 'yes'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setPlansToTakeNewLoan('no')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                          plansToTakeNewLoan === 'no'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        No
                      </button>
                    </div>
                  </Card>
                </section>
              )}

              {/* Payoff Strategy Section */}
              <section>
                 <h2 className="text-2xl font-semibold text-gray-900 border-b-2 border-gray-200 pb-3 mb-6">
                  Payoff Strategy
                </h2>
                <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                  <h3 className="font-semibold text-gray-800 mb-4">How do you want to pay off your loans?</h3>

                  <div className="flex gap-4 mb-4">
                    <button
                      onClick={() => setGoalMode('extra')}
                      className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                        goalMode === 'extra'
                          ? 'bg-green-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300'
                      }`}
                    >
                      Pay an Extra Amount
                    </button>
                    <button
                      onClick={() => setGoalMode('target')}
                      className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                        goalMode === 'target'
                          ? 'bg-green-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300'
                      }`}
                    >
                    Set Target Payoff Year
                    </button>
                  </div>

                  {goalMode === 'extra' ? (
                    <Input
                      label="Extra Monthly Payment ($)"
                      id="extra-payment"
                      type="number"
                      placeholder="e.g., 100"
                      value={extraPayment}
                      onChange={(e) => setExtraPayment(e.target.value)}
                    />
                  ) : (
                    <Input
                      label="Target Years to Payoff"
                      id="target-years"
                      type="number"
                      placeholder="e.g., 5"
                      value={targetYears}
                      onChange={(e) => setTargetYears(e.target.value)}
                    />
                  )}
                </div>
              </section>

              {/* PSLF Section */}
              <section>
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                  <label className="flex items-center gap-2 mb-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trackPSLF}
                      onChange={(e) => setTrackPSLF(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-semibold text-gray-800">Track Public Service Loan Forgiveness (PSLF)?</span>
                  </label>

                  {trackPSLF && (
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <Input
                        label="Qualifying Payments Made"
                        id="pslf-made"
                        type="number"
                        placeholder="e.g., 24"
                        value={pslfPaymentsMade}
                        onChange={(e) => setPslfPaymentsMade(e.target.value)}
                      />
                      <Input
                        label="Payments Required"
                        id="pslf-required"
                        type="number"
                        placeholder="e.g., 120"
                        value={pslfPaymentsRequired}
                        onChange={(e) => setPslfPaymentsRequired(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </section>

              <div className="pt-8">
                <Button onClick={handleCalculate} className="w-full text-lg py-3">
                  <Calculator className="w-6 h-6" />
                  Calculate Payoff Plan
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

if (view === 'results') {
    const totalPayment = results.totalMinPayment + results.extra;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <button
              onClick={() => setView('input')}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to Input
            </button>

            {showSaveDialog && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                  <h3 className="text-xl font-bold mb-4">Save Scenario</h3>
                  <input
                    type="text"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    placeholder="Enter scenario name"
                    className="w-full px-4 py-2 border rounded-lg mb-4"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={confirmSaveScenario}
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowSaveDialog(false);
                        setScenarioName('');
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <h1 className="text-3xl font-bold text-gray-900 mb-6">Your Payoff Plan</h1>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <button onClick={() => setView('scenarios')} className="bg-indigo-100 hover:bg-indigo-200 p-4 rounded-xl text-center transition">
                <Save className="w-6 h-6 mx-auto mb-2 text-indigo-600" />
                <div className="font-semibold text-sm">Manage Scenarios</div>
              </button>
              <button onClick={() => setView('progress')} className="bg-green-100 hover:bg-green-200 p-4 rounded-xl text-center transition">
                <Target className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <div className="font-semibold text-sm">Track Progress</div>
              </button>
              <button onClick={() => setView('breakdown')} className="bg-blue-100 hover:bg-blue-200 p-4 rounded-xl text-center transition">
                <FileText className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <div className="font-semibold text-sm">Monthly Plan</div>
              </button>
              <button onClick={() => setView('refinance')} className="bg-purple-100 hover:bg-purple-200 p-4 rounded-xl text-center transition">
                <RefreshCw className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <div className="font-semibold text-sm">Refinance Sim</div>
              </button>
              <button onClick={() => setView('idr')} className="bg-yellow-100 hover:bg-yellow-200 p-4 rounded-xl text-center transition">
                <BarChart3 className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
                <div className="font-semibold text-sm">IDR Estimator</div>
              </button>
              <button onClick={saveScenario} className="bg-pink-100 hover:bg-pink-200 p-4 rounded-xl text-center transition">
                <Save className="w-6 h-6 mx-auto mb-2 text-pink-600" />
                <div className="font-semibold text-sm">Save Scenario</div>
              </button>
              <button onClick={exportToCSV} className="bg-orange-100 hover:bg-orange-200 p-4 rounded-xl text-center transition">
                <Download className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                <div className="font-semibold text-sm">Export</div>
              </button>
            </div>

            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-6 rounded-xl mb-8">
              <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
              <div className="flex items-center justify-center gap-4 text-2xl font-bold">
                <span>${results.totalMinPayment.toFixed(2)}</span>
                <span>+</span>
                <span>${results.extra.toFixed(2)}</span>
                <span>=</span>
                <span className="text-3xl">${(results.totalMinPayment + results.extra).toFixed(2)}/mo</span>
              </div>
            </div>

            {results.calculatedExtra && (
              <div className="bg-green-100 border-l-4 border-green-600 p-6 rounded-lg mb-8">
                <p className="text-lg font-semibold text-green-900">
                  To pay off your loans in {results.targetYears} years, you need an extra monthly payment of ${results.calculatedExtra.toFixed(2)}
                </p>
              </div>
            )}

            {trackPSLF && pslfPaymentsMade && pslfPaymentsRequired && (
              <div className="bg-blue-100 p-6 rounded-xl mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">PSLF Progress</h3>
                <div className="w-full bg-gray-300 rounded-full h-6 mb-2">
                  <div
                    className="bg-blue-600 h-6 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                    style={{ width: `${(parseInt(pslfPaymentsMade) / parseInt(pslfPaymentsRequired)) * 100}%` }}
                  >
                    {Math.round((parseInt(pslfPaymentsMade) / parseInt(pslfPaymentsRequired)) * 100)}%
                  </div>
                </div>
                <p className="text-gray-700">
                  {parseInt(pslfPaymentsRequired) - parseInt(pslfPaymentsMade)} payments remaining
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Est. Forgiveness: {new Date(Date.now() + (parseInt(pslfPaymentsRequired) - parseInt(pslfPaymentsMade)) * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                </p>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-xl border-2 border-red-200">
                <h3 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6" />
                  Avalanche Method
                </h3>
                <p className="text-sm text-gray-700 mb-4">Highest interest rate first - Save the most money</p>
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Debt-Free Date</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {new Date(Date.now() + results.avalanche.months * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{results.avalanche.months} months</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Total Interest Paid</div>
                    <div className="text-2xl font-bold text-red-600">
                      ${results.avalanche.totalInterest.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border-2 border-blue-200">
                <h3 className="text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6" />
                  Snowball Method
                </h3>
                <p className="text-sm text-gray-700 mb-4">Smallest balance first - Build momentum with quick wins</p>
                <div className="space-y-3">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Debt-Free Date</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {new Date(Date.now() + results.snowball.months * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{results.snowball.months} months</div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-sm text-gray-600">Total Interest Paid</div>
                    <div className="text-2xl font-bold text-blue-600">
                      ${results.snowball.totalInterest.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'scenarios') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <button onClick={() => setView('results')} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6">
              <ChevronLeft className="w-5 h-5" />
              Back to Results
            </button>

            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Saved Scenarios</h2>
              {compareScenarios.length > 0 && (
                <button
                  onClick={() => setView('compare')}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                  Compare Selected ({compareScenarios.length})
                </button>
              )}
            </div>

            {scenarios.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Save className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No saved scenarios yet. Save one from the results page!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {scenarios.map(scenario => (
                  <div key={scenario.id} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={compareScenarios.includes(scenario.id)}
                          onChange={() => toggleCompare(scenario.id)}
                          className="w-5 h-5 mt-1"
                        />
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{scenario.name}</h3>
                          <p className="text-sm text-gray-600">Saved on {scenario.date}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadScenario(scenario)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deleteScenario(scenario.id)}
                          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-xs text-gray-600">Total Balance</div>
                        <div className="font-semibold">${scenario.resultsData.totalBalance.toFixed(2)}</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-xs text-gray-600">Extra Payment</div>
                        <div className="font-semibold">${scenario.resultsData.extra.toFixed(2)}</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="text-xs text-gray-600">Payoff Months</div>
                        <div className="font-semibold">{scenario.resultsData.avalancheMonths}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'compare') {
    const selectedScenarios = scenarios.filter(s => compareScenarios.includes(s.id));

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <button onClick={() => setView('scenarios')} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6">
              <ChevronLeft className="w-5 h-5" />
              Back to Scenarios
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">Scenario Comparison</h2>

            {selectedScenarios.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No scenarios selected. Go back and select scenarios to compare.</p>
              </div>
            ) : (
              <div>
                <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${selectedScenarios.length}, minmax(0, 1fr))` }}>
                  {selectedScenarios.map(scenario => (
                    <div key={scenario.id} className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200">
                      <h3 className="font-bold text-xl text-gray-900 mb-4">{scenario.name}</h3>
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Total Debt</div>
                          <div className="text-2xl font-bold text-gray-900">${scenario.resultsData.totalBalance.toFixed(2)}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Number of Loans</div>
                          <div className="text-2xl font-bold text-teal-600">{scenario.savedLoans.length}</div>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Average Interest Rate</div>
                          <div className="text-2xl font-bold text-orange-600">
                            {(scenario.savedLoans.reduce((sum, l) => sum + parseFloat(l.loanRate), 0) / scenario.savedLoans.length).toFixed(2)}%
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Monthly Payment</div>
                          <div className="text-2xl font-bold text-indigo-600">
                            ${(scenario.resultsData.totalMinPayment + scenario.resultsData.extra).toFixed(2)}
                          </div>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                          <div className="text-sm text-gray-600 mb-1">Avalanche Payoff</div>
                          <div className="text-xl font-bold text-green-600">{scenario.resultsData.avalancheMonths} months</div>
                          <div className="text-sm text-gray-700 mt-1">
                            Interest: ${scenario.resultsData.avalancheTotalInterest.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'progress') {
    if (!activeScenario) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <button onClick={() => setView('results')} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6">
                <ChevronLeft className="w-5 h-5" />
                Back to Results
              </button>
              <div className="text-center py-12 text-gray-500">
                <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No active scenario. Load one from the Scenario Manager!</p>
                <button
                  onClick={() => setView('scenarios')}
                  className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition"
                >
                  Go to Scenarios
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const totalInitial = activeScenario.results.totalBalance;
    const totalCurrent = activeScenario.loans.reduce((sum, l) => sum + l.currentBalance, 0);
    const percentPaid = ((totalInitial - totalCurrent) / totalInitial) * 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setView('results')} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800">
                <ChevronLeft className="w-5 h-5" />
                Back to Results
              </button>
              <button
                onClick={() => {
                  setActiveScenario(null);
                  setView('results');
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm"
              >
                Clear Progress Tracker
              </button>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">Progress Tracker</h2>
            <p className="text-gray-600 mb-6">Tracking: {activeScenario.name}</p>

            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-xl mb-8">
              <h3 className="text-lg font-semibold mb-4">Overall Progress</h3>
              <div className="w-full bg-white bg-opacity-30 rounded-full h-8 mb-3">
                <div
                  className="bg-white h-8 rounded-full flex items-center justify-center text-green-900 font-bold transition-all duration-500"
                  style={{ width: `${Math.min(percentPaid, 100)}%` }}
                >
                  {percentPaid.toFixed(1)}%
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span>Paid: ${(totalInitial - totalCurrent).toFixed(2)}</span>
                <span>Remaining: ${totalCurrent.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-4">
              {activeScenario.loans.map((loan, idx) => (
                <div key={loan.id} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-bold text-lg mb-3">{loan.name || `Loan ${idx + 1}`}</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-600">Original Balance</div>
                      <div className="font-semibold">${parseFloat(loan.balance).toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Current Balance</div>
                      <div className="font-semibold text-green-600">${loan.currentBalance.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Interest Rate</div>
                      <div className="font-semibold">{loan.rate}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">Monthly Interest</div>
                      <div className="font-semibold text-orange-600">${(loan.currentBalance * parseFloat(loan.rate) / 100 / 12).toFixed(2)}</div>
                    </div>
                  </div>
                  {loan.lastPaymentDate && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-4 text-sm">
                      <div className="font-semibold text-blue-900 mb-1">Last Payment: {loan.lastPaymentDate}</div>
                      <div className="text-gray-700">Interest Accrued: ${loan.lastInterestAccrued.toFixed(2)}</div>
                      <div className="text-gray-700">Principal Paid: ${loan.lastPrincipalPaid.toFixed(2)}</div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Payment amount"
                      id={`payment-${loan.id}`}
                      className="flex-1 px-4 py-2 border rounded-lg"
                    />
                    <button
                      onClick={() => {
                        const input = document.getElementById(`payment-${loan.id}`);
                        logPayment(loan.id, input.value);
                        input.value = '';
                      }}
                      className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                      Log Payment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'breakdown') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <button onClick={() => setView('results')} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6">
              <ChevronLeft className="w-5 h-5" />
              Back to Results
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">Monthly Payment Breakdown (Avalanche)</h2>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-indigo-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left">Month</th>
                    <th className="px-4 py-3 text-right">Principal Paid</th>
                    <th className="px-4 py-3 text-right">Interest Paid</th>
                    <th className="px-4 py-3 text-right">Remaining Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyBreakdown.slice(0, 120).map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="px-4 py-3 font-semibold">{row.month}</td>
                      <td className="px-4 py-3 text-right">${row.principal.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">${row.interest.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-semibold">${row.remaining.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {monthlyBreakdown.length > 120 && (
              <p className="text-center text-gray-600 mt-4">
                Showing first 120 months of {monthlyBreakdown.length} total months
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'refinance') {
    const refinanceResults = calculateRefinance();

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <button onClick={() => setView('results')} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6">
              <ChevronLeft className="w-5 h-5" />
              Back to Results
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">Refinance Simulator</h2>

            <div className="bg-purple-50 p-6 rounded-xl border border-purple-200 mb-6">
              <h3 className="font-semibold text-gray-800 mb-4">New Loan Terms</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">New Interest Rate (%)</label>
                  <input
                    type="number"
                    value={refinanceRate}
                    onChange={(e) => setRefinanceRate(e.target.value)}
                    placeholder="e.g., 4.5"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">New Term (Years)</label>
                  <input
                    type="number"
                    value={refinanceTerm}
                    onChange={(e) => setRefinanceTerm(e.target.value)}
                    placeholder="e.g., 10"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            {refinanceResults && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6 rounded-xl">
                  <h3 className="text-lg font-semibold mb-4">Refinanced Plan</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm opacity-90">New Monthly Payment</div>
                      <div className="text-3xl font-bold">${refinanceResults.payment.toFixed(2)}</div>
                    </div>
                    <div>
                      <div className="text-sm opacity-90">Total Interest</div>
                      <div className="text-3xl font-bold">${refinanceResults.totalInterest.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                <div className={`p-6 rounded-xl border-2 ${
                  refinanceResults.savings > 0
                    ? 'bg-green-50 border-green-300'
                    : 'bg-red-50 border-red-300'
                }`}>
                  <h3 className="font-bold text-lg mb-2">
                    {refinanceResults.savings > 0 ? 'Potential Savings' : 'Increased Cost'}
                  </h3>
                  <p className="text-3xl font-bold mb-2">
                    ${Math.abs(refinanceResults.savings).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-700">
                    {refinanceResults.savings > 0
                      ? 'You would save this much compared to your current plan'
                      : 'This refinance would cost you more than your current plan'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (view === 'idr') {
    const idrResults = calculateIDR();

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <button onClick={() => setView('results')} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-6">
              <ChevronLeft className="w-5 h-5" />
              Back to Results
            </button>

            <h2 className="text-2xl font-bold text-gray-900 mb-6">Income-Driven Repayment Estimator</h2>

            <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 mb-6">
              <h3 className="font-semibold text-gray-800 mb-4">Your Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Adjusted Gross Income (AGI)</label>
                  <input
                    type="number"
                    value={idrAGI}
                    onChange={(e) => setIdrAGI(e.target.value)}
                    placeholder="e.g., 50000"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Family Size</label>
                  <input
                    type="number"
                    value={idrFamilySize}
                    onChange={(e) => setIdrFamilySize(e.target.value)}
                    min="1"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>

            {idrResults && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-xl">
                  <h3 className="text-lg font-semibold mb-4">IBR (Income-Based Repayment)</h3>
                  <div className="text-4xl font-bold mb-2">${idrResults.ibr.toFixed(2)}/mo</div>
                  <p className="text-sm opacity-90">15% of discretionary income</p>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-6 rounded-xl">
                  <h3 className="text-lg font-semibold mb-4">PAYE (Pay As You Earn)</h3>
                  <div className="text-4xl font-bold mb-2">${idrResults.paye.toFixed(2)}/mo</div>
                  <p className="text-sm opacity-90">10% of discretionary income</p>
                </div>

                <div className="bg-gradient-to-r from-purple-500 to-pink-600 text-white p-6 rounded-xl">
                  <h3 className="text-lg font-semibold mb-4">SAVE Plan</h3>
                  <div className="text-4xl font-bold mb-2">${idrResults.newPlan.toFixed(2)}/mo</div>
                  <p className="text-sm opacity-90">5% of discretionary income</p>
                </div>

                {results && (
                  <div className="bg-gray-100 p-6 rounded-xl">
                    <h4 className="font-semibold mb-3">Comparison to Current Plan</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Your Current Monthly Payment:</span>
                        <span className="font-semibold">${(results.totalMinPayment + results.extra).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lowest IDR Option (SAVE):</span>
                        <span className="font-semibold">${idrResults.newPlan.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}