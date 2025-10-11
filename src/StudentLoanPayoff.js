import React, { useState, useMemo } from 'react';
import { PlusCircle, XCircle, AlertTriangle } from 'lucide-react';
import { calculatePlans, calculatePrivateLoanPayoff, calculateAmortizedPayment, calculateAcceleratedPayoff, calculateTargetYearPayment } from './loanCalculations';

// --- Reusable UI Components ---
const Card = ({ children, className = '', ...props }) => (
  <div className={`bg-white rounded-2xl shadow-lg p-6 sm:p-8 ${className}`} {...props}>
    {children}
  </div>
);

const Input = ({ label, id, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input id={id} {...props} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
  </div>
);

const Select = ({ label, id, children, ...props }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <select id={id} {...props} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
      {children}
    </select>
  </div>
);

const ResultsCard = ({ title, plan, warning }) => {
  const formatCurrency = (num) => typeof num === 'number' ? `${num.toFixed(2)}` : num;
  const formatDate = (date) => date ? date.toLocaleDateString() : 'N/A';

  const dateToUse = plan.isIdr ? (plan.forgivenessDate || plan.payoffDate) : plan.payoffDate;
  const dateLabel = plan.isIdr ? (plan.forgivenessDate ? 'Forgiveness Date:' : 'Payoff Date:') : 'Payoff Date:';

  return (
    <div className="bg-gray-50 rounded-lg p-4 border flex flex-col">
      <h3 className="font-bold text-lg text-indigo-700">{title}</h3>
      {warning && <p className="text-xs text-yellow-700 my-1 flex items-center gap-1"><AlertTriangle size={14}/> {warning}</p>}
      <div className="mt-2 space-y-1 text-sm flex-grow">
        <p><span className="font-semibold">Monthly Payment:</span> {formatCurrency(plan.monthlyPayment)}</p>
        <p><span className="font-semibold">Total Paid:</span> {formatCurrency(plan.totalPaid)}</p>
        <p><span className="font-semibold">{dateLabel}</span> {formatDate(dateToUse)}</p>
        {plan.totalInterest != null && <p><span className="font-semibold">Total Interest:</span> {formatCurrency(plan.totalInterest)}</p>}
      </div>
    </div>
  );
};

// --- Main Application Component ---
export default function StudentLoanPayoff() {
  // Financial Profile State
  const [agi, setAgi] = useState('50000');
  const [familySize, setFamilySize] = useState('1');
  const [stateOfResidence, setStateOfResidence] = useState('MO');
  const [filingStatus, setFilingStatus] = useState('single');
  
  // Loan State
  const [loans, setLoans] = useState([]);
  const [plansToTakeNewLoan, setPlansToTakeNewLoan] = useState(null);
  
  // Refinancing State
  const [refinanceRate, setRefinanceRate] = useState('');
  const [refinanceTerm, setRefinanceTerm] = useState('');
  const [refinanceComparisonMode, setRefinanceComparisonMode] = useState('lowestPayment');
  const [customPlanSelection, setCustomPlanSelection] = useState('');
  
  // Federal Acceleration State (Phase 3)
  const [federalExtraPayment, setFederalExtraPayment] = useState('');
  const [federalTargetYear, setFederalTargetYear] = useState('');
  const [federalCalcMode, setFederalCalcMode] = useState('extra'); // 'extra' or 'target'
  const [selectedAccelerationPlan, setSelectedAccelerationPlan] = useState('');
  
  // Private Acceleration State (Phase 3)
  const [extraPayment, setExtraPayment] = useState('');
  const [privateCalcMode, setPrivateCalcMode] = useState('extra'); // 'extra' or 'target'
  const [privateTargetYear, setPrivateTargetYear] = useState('');

  // Loan Management Functions
  const addLoan = () => setLoans([...loans, { 
    id: Date.now(), 
    type: null, 
    balance: '', 
    rate: '', 
    originationDate: '', 
    term: '' 
  }]);
  
  const removeLoan = (id) => setLoans(loans.filter(loan => loan.id !== id));
  
  const updateLoan = (id, field, value) => setLoans(loans.map(loan => 
    loan.id === id ? { ...loan, [field]: value } : loan
  ));

  // Computed Values
  const federalLoans = useMemo(() => 
    loans.filter(l => l.type === 'Federal' && parseFloat(l.balance) > 0 && parseFloat(l.rate) >= 0), 
    [loans]
  );
  
  const privateLoans = useMemo(() => 
    loans.filter(l => l.type === 'Private' && parseFloat(l.balance) > 0 && parseFloat(l.rate) >= 0 && parseFloat(l.term) > 0), 
    [loans]
  );
  
  const totalFederalBalance = useMemo(() => 
    federalLoans.reduce((acc, loan) => acc + parseFloat(loan.balance || 0), 0), 
    [federalLoans]
  );
  
  const totalPrivateBalance = useMemo(() => 
    privateLoans.reduce((acc, loan) => acc + parseFloat(loan.balance || 0), 0), 
    [privateLoans]
  );

  const showContaminationQuestion = useMemo(() => 
    federalLoans.some(l => l.originationDate === 'before_2014' || l.originationDate === 'after_2014'), 
    [federalLoans]
  );

  // Federal Loan Plan Eligibility
  const eligiblePlans = useMemo(() => {
    const financialProfile = { agi: parseFloat(agi), familySize: parseInt(familySize), stateOfResidence, filingStatus };
    if (!financialProfile.agi || federalLoans.length === 0) return { plans: {}, contaminationWarning: false };

    const allPlans = calculatePlans(financialProfile, federalLoans);
    let filteredPlans = {};
    
    const isGrandfathered = federalLoans.some(l => l.originationDate === 'before_2014' || l.originationDate === 'after_2014');
    const isNewBorrower = federalLoans.every(l => l.originationDate === 'after_2026');
    const contaminationTriggered = isGrandfathered && plansToTakeNewLoan === 'yes';

    if (isNewBorrower || contaminationTriggered) {
      if (allPlans['RAP']) filteredPlans['RAP'] = allPlans['RAP'];
      if (allPlans['Standardized Tiered Plan']) filteredPlans['Standardized Tiered Plan'] = allPlans['Standardized Tiered Plan'];
      return { plans: filteredPlans, contaminationWarning: contaminationTriggered };
    }

    if (isGrandfathered) {
      const hasPre2014 = federalLoans.some(l => l.originationDate === 'before_2014');
      const hasOnlyPost2014 = federalLoans.every(l => l.originationDate === 'after_2014' || l.originationDate === 'after_2026');

      for (const planName in allPlans) {
        const plan = allPlans[planName];
        if (plan.sunset && new Date() >= plan.sunset) continue;
        
        if (planName === 'New IBR' && !hasOnlyPost2014) continue;
        if (planName === 'Old IBR' && hasOnlyPost2014) continue;

        filteredPlans[planName] = plan;
      }
    }
    return { plans: filteredPlans, contaminationWarning: false };
  }, [agi, familySize, stateOfResidence, filingStatus, federalLoans, plansToTakeNewLoan]);

  // Private Loan Calculation
  const privateLoanResults = useMemo(() => {
    if (privateLoans.length === 0) return null;
    return calculatePrivateLoanPayoff(
      privateLoans,
      privateCalcMode,
      parseFloat(extraPayment || 0),
      parseInt(privateTargetYear || 0)
    );
  }, [privateLoans, privateCalcMode, extraPayment, privateTargetYear]);

  // Refinancing Calculation
  const refinanceResults = useMemo(() => {
    if (!refinanceRate || !refinanceTerm || totalFederalBalance === 0) return null;
    const monthlyPayment = calculateAmortizedPayment(totalFederalBalance, parseFloat(refinanceRate) / 100, parseFloat(refinanceTerm));
    const totalPaid = monthlyPayment * parseFloat(refinanceTerm) * 12;
    const payoffDate = new Date();
    payoffDate.setFullYear(payoffDate.getFullYear() + parseFloat(refinanceTerm));
    return { 
      monthlyPayment, 
      totalPaid, 
      totalInterest: totalPaid - totalFederalBalance,
      payoffDate 
    };
  }, [refinanceRate, refinanceTerm, totalFederalBalance]);

  // Get Best Federal Plan for Comparison
  const bestFederalPlan = useMemo(() => {
    if (!refinanceResults || Object.keys(eligiblePlans.plans).length === 0) return null;
    
    const plans = eligiblePlans.plans;
    
    // Custom mode - use user's selection
    if (refinanceComparisonMode === 'custom' && customPlanSelection) {
      return { name: customPlanSelection, plan: plans[customPlanSelection] };
    }
    
    // Lowest Monthly Payment mode
    if (refinanceComparisonMode === 'lowestPayment') {
      let lowestPlan = null;
      let lowestPayment = Infinity;
      
      for (const [name, plan] of Object.entries(plans)) {
        const payment = typeof plan.monthlyPayment === 'number' ? plan.monthlyPayment : 0;
        if (payment > 0 && payment < lowestPayment) {
          lowestPayment = payment;
          lowestPlan = { name, plan };
        }
      }
      return lowestPlan;
    }
    
    // Lowest Total Cost mode
    if (refinanceComparisonMode === 'lowestTotal') {
      let lowestPlan = null;
      let lowestTotal = Infinity;
      
      for (const [name, plan] of Object.entries(plans)) {
        const total = typeof plan.totalPaid === 'number' ? plan.totalPaid : Infinity;
        if (total < lowestTotal) {
          lowestTotal = total;
          lowestPlan = { name, plan };
        }
      }
      return lowestPlan;
    }
    
    return null;
  }, [refinanceResults, eligiblePlans.plans, refinanceComparisonMode, customPlanSelection]);

  // Get ALL available federal plans for acceleration (Phase 3)
  const allFederalPlans = useMemo(() => {
    if (Object.keys(eligiblePlans.plans).length === 0) return [];
    return Object.keys(eligiblePlans.plans);
  }, [eligiblePlans.plans]);

  // Calculate federal acceleration results (Phase 3)
  const federalAcceleratedResults = useMemo(() => {
    if (!selectedAccelerationPlan) return null;
    
    const selectedPlan = eligiblePlans.plans[selectedAccelerationPlan];
    if (!selectedPlan) return null;
    
    // Calculate weighted average rate
    const weightedAvgRate = federalLoans.reduce(
      (acc, loan) => acc + (parseFloat(loan.balance) * parseFloat(loan.rate) / 100), 0
    ) / totalFederalBalance;
    
    // Mode 1: Extra Payment
    if (federalCalcMode === 'extra') {
      if (!federalExtraPayment || parseFloat(federalExtraPayment) <= 0) return null;
      
      return calculateAcceleratedPayoff(
        totalFederalBalance,
        weightedAvgRate,
        selectedPlan,
        parseFloat(federalExtraPayment),
        selectedPlan.isIdr || false
      );
    }
    
    // Mode 2: Target Year
    if (federalCalcMode === 'target') {
      if (!federalTargetYear || parseInt(federalTargetYear) <= new Date().getFullYear()) return null;
      
      const basePayment = typeof selectedPlan.monthlyPayment === 'number' ? selectedPlan.monthlyPayment : 0;
      
      const targetResult = calculateTargetYearPayment(
        totalFederalBalance,
        weightedAvgRate,
        basePayment,
        parseInt(federalTargetYear)
      );
      
      if (targetResult.error) return { error: targetResult.error, alreadyMeetsTarget: targetResult.alreadyMeetsTarget };
      
      // Calculate baseline for comparison
      const baseline = {
        monthlyPayment: basePayment,
        totalPaid: selectedPlan.totalPaid,
        totalInterest: selectedPlan.totalInterest || (selectedPlan.totalPaid - totalFederalBalance),
        payoffDate: selectedPlan.forgivenessDate || selectedPlan.payoffDate
      };
      
      // Calculate savings
      const interestSaved = baseline.totalInterest - targetResult.accelerated.totalInterest;
      const baselineDate = baseline.payoffDate;
      const targetDate = targetResult.accelerated.payoffDate;
      const monthsSaved = Math.round((baselineDate - targetDate) / (1000 * 60 * 60 * 24 * 30.44));
      const yearsSaved = Math.floor(Math.abs(monthsSaved) / 12);
      const remainingMonths = Math.abs(monthsSaved) % 12;
      
      return {
        baseline,
        accelerated: targetResult.accelerated,
        savings: {
          interestSaved,
          monthsSaved: Math.abs(monthsSaved),
          yearsSaved,
          remainingMonths
        },
        requiredExtraPayment: targetResult.requiredExtraPayment
      };
    }
    
    return null;
  }, [selectedAccelerationPlan, federalCalcMode, federalExtraPayment, federalTargetYear, totalFederalBalance, federalLoans, eligiblePlans.plans]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900">The Payoff Climb</h1>
          <p className="mt-2 text-lg text-gray-600">Your journey to student loan freedom</p>
        </div>

        {/* Financial Profile */}
        <Card>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Your Financial Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="Adjusted Gross Income (AGI)" 
              id="agi" 
              type="number" 
              placeholder="50000" 
              value={agi} 
              onChange={(e) => setAgi(e.target.value)} 
            />
            <Input 
              label="Family Size" 
              id="familySize" 
              type="number" 
              min="1" 
              value={familySize} 
              onChange={(e) => setFamilySize(e.target.value)} 
            />
            <Select 
              label="State of Residence" 
              id="state" 
              value={stateOfResidence} 
              onChange={(e) => setStateOfResidence(e.target.value)}
            >
              <option value="AL">Alabama</option>
              <option value="AK">Alaska</option>
              <option value="AZ">Arizona</option>
              <option value="AR">Arkansas</option>
              <option value="CA">California</option>
              <option value="CO">Colorado</option>
              <option value="CT">Connecticut</option>
              <option value="DE">Delaware</option>
              <option value="DC">District Of Columbia</option>
              <option value="FL">Florida</option>
              <option value="GA">Georgia</option>
              <option value="HI">Hawaii</option>
              <option value="ID">Idaho</option>
              <option value="IL">Illinois</option>
              <option value="IN">Indiana</option>
              <option value="IA">Iowa</option>
              <option value="KS">Kansas</option>
              <option value="KY">Kentucky</option>
              <option value="LA">Louisiana</option>
              <option value="ME">Maine</option>
              <option value="MD">Maryland</option>
              <option value="MA">Massachusetts</option>
              <option value="MI">Michigan</option>
              <option value="MN">Minnesota</option>
              <option value="MS">Mississippi</option>
              <option value="MO">Missouri</option>
              <option value="MT">Montana</option>
              <option value="NE">Nebraska</option>
              <option value="NV">Nevada</option>
              <option value="NH">New Hampshire</option>
              <option value="NJ">New Jersey</option>
              <option value="NM">New Mexico</option>
              <option value="NY">New York</option>
              <option value="NC">North Carolina</option>
              <option value="ND">North Dakota</option>
              <option value="OH">Ohio</option>
              <option value="OK">Oklahoma</option>
              <option value="OR">Oregon</option>
              <option value="PA">Pennsylvania</option>
              <option value="RI">Rhode Island</option>
              <option value="SC">South Carolina</option>
              <option value="SD">South Dakota</option>
              <option value="TN">Tennessee</option>
              <option value="TX">Texas</option>
              <option value="UT">Utah</option>
              <option value="VT">Vermont</option>
              <option value="VA">Virginia</option>
              <option value="WA">Washington</option>
              <option value="WV">West Virginia</option>
              <option value="WI">Wisconsin</option>
              <option value="WY">Wyoming</option>
            </Select>
            <Select 
              label="Filing Status" 
              id="filingStatus" 
              value={filingStatus} 
              onChange={(e) => setFilingStatus(e.target.value)}
            >
              <option value="single">Single</option>
              <option value="jointly">Married Filing Jointly</option>
              <option value="separately">Married Filing Separately</option>
            </Select>
          </div>
        </Card>

        {/* Loan Input */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">Your Loans</h2>
            <button 
              onClick={addLoan} 
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
            >
              <PlusCircle size={20} /> Add Loan
            </button>
          </div>
          <div className="space-y-6">
            {loans.length === 0 && (
              <p className="text-gray-500 text-center py-4">Add a loan to get started.</p>
            )}
            {loans.map((loan, index) => (
              <div key={loan.id} className="bg-gray-100 p-4 rounded-lg border">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-700">Loan #{index + 1}</h3>
                  <button 
                    onClick={() => removeLoan(loan.id)} 
                    className="text-red-600 hover:text-red-800"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
                
                {!loan.type && (
                  <div className="flex gap-4">
                    <button 
                      onClick={() => updateLoan(loan.id, 'type', 'Federal')} 
                      className="flex-1 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Federal Loan
                    </button>
                    <button 
                      onClick={() => updateLoan(loan.id, 'type', 'Private')} 
                      className="flex-1 py-2 px-4 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Private Loan
                    </button>
                  </div>
                )}

                {loan.type === 'Federal' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Loan Balance ($)" 
                      id={`balance-${loan.id}`} 
                      type="number" 
                      placeholder="30000" 
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
                    <Select 
                      label="Loan Origination Date" 
                      id={`origination-${loan.id}`} 
                      value={loan.originationDate} 
                      onChange={(e) => updateLoan(loan.id, 'originationDate', e.target.value)}
                    >
                      <option value="">Select a timeframe</option>
                      <option value="before_2014">My first loan was before July 1, 2014</option>
                      <option value="after_2014">My first loan was on or after July 1, 2014</option>
                      <option value="after_2026">My first loan will be on or after July 1, 2026</option>
                    </Select>
                  </div>
                )}

                {loan.type === 'Private' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input 
                      label="Loan Balance ($)" 
                      id={`balance-${loan.id}`} 
                      type="number" 
                      placeholder="30000" 
                      value={loan.balance} 
                      onChange={(e) => updateLoan(loan.id, 'balance', e.target.value)} 
                    />
                    <Input 
                      label="Interest Rate (%)" 
                      id={`rate-${loan.id}`} 
                      type="number" 
                      placeholder="7.2" 
                      value={loan.rate} 
                      onChange={(e) => updateLoan(loan.id, 'rate', e.target.value)} 
                    />
                    <Input 
                      label="Remaining Term (Years)" 
                      id={`term-${loan.id}`} 
                      type="number" 
                      placeholder="10" 
                      value={loan.term} 
                      onChange={(e) => updateLoan(loan.id, 'term', e.target.value)} 
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Contamination Warning Question */}
        {showContaminationQuestion && (
          <Card className="bg-yellow-50 border border-yellow-200">
            <h3 className="font-semibold text-gray-800 mb-2">Future Federal Loans</h3>
            <p className="text-sm text-gray-600 mb-4">
              This question is required because you have loans from before July 1, 2026.
            </p>
            <Select 
              label="Are you planning to take out any new federal loans on or after July 1, 2026?" 
              id="contamination-check" 
              value={plansToTakeNewLoan || ''} 
              onChange={(e) => setPlansToTakeNewLoan(e.target.value)}
            >
              <option value="">Please select an option</option>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </Select>
          </Card>
        )}

        {/* Federal Loan Repayment Plans */}
        {federalLoans.length > 0 && Object.keys(eligiblePlans.plans).length > 0 && (
          <Card>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Federal Loan Repayment Plans</h2>
              <p className="text-sm text-gray-600">
                Based on a total federal balance of ${totalFederalBalance.toLocaleString()}
              </p>
            </div>
            {eligiblePlans.contaminationWarning && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md flex items-center gap-3">
                <AlertTriangle size={24} />
                <div>
                  <h3 className="font-bold">Important Warning</h3>
                  <p>
                    Because you plan to take out new loans after July 1, 2026, your plan options for ALL your loans are now limited.
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(eligiblePlans.plans).map(([name, plan]) => (
                <ResultsCard 
                  key={name} 
                  title={name} 
                  plan={plan} 
                  warning={plan.sunset && `▲ This plan ends on ${new Date(plan.sunset).toLocaleDateString()}.`}
                />
              ))}
            </div>
          </Card>
        )}
        
        {/* Federal Loan Acceleration Strategy - Phase 3 */}
        {federalLoans.length > 0 && allFederalPlans.length > 0 && (
          <Card>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Federal Loan Acceleration Strategy
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              See how extra payments or a target payoff year can help you become debt-free faster.
            </p>
            
            <div className="bg-green-50 p-6 rounded-xl border border-green-200">
              {/* Mode Toggle */}
              <div className="mb-6 bg-white p-4 rounded-lg border border-green-300">
                <p className="text-sm font-semibold text-gray-700 mb-3">Calculate based on:</p>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="federalCalcMode"
                      value="extra"
                      checked={federalCalcMode === 'extra'}
                      onChange={(e) => setFederalCalcMode(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">Extra Payment Amount</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="federalCalcMode"
                      value="target"
                      checked={federalCalcMode === 'target'}
                      onChange={(e) => setFederalCalcMode(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">Target Payoff Year</span>
                  </label>
                </div>
              </div>

              {/* Plan Selector and Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Select
                  label="Apply to this plan:"
                  id="accelerationPlan"
                  value={selectedAccelerationPlan}
                  onChange={(e) => setSelectedAccelerationPlan(e.target.value)}
                >
                  <option value="">Select a plan</option>
                  {allFederalPlans.map(planName => (
                    <option key={planName} value={planName}>{planName}</option>
                  ))}
                </Select>
                
                {federalCalcMode === 'extra' ? (
                  <Input
                    label="Extra Monthly Payment ($)"
                    id="federalExtra"
                    type="number"
                    placeholder="200"
                    value={federalExtraPayment}
                    onChange={(e) => setFederalExtraPayment(e.target.value)}
                  />
                ) : (
                  <Input
                    label="Target Payoff Year"
                    id="federalTargetYear"
                    type="number"
                    placeholder="2030"
                    value={federalTargetYear}
                    onChange={(e) => setFederalTargetYear(e.target.value)}
                  />
                )}
              </div>

              {/* Error Display */}
              {federalAcceleratedResults?.error && (
                <div className={`p-4 rounded-lg mb-6 ${
                  federalAcceleratedResults.alreadyMeetsTarget 
                    ? 'bg-yellow-100 border border-yellow-300 text-yellow-800' 
                    : 'bg-red-100 border border-red-300 text-red-800'
                }`}>
                  <p className="text-sm font-semibold">{federalAcceleratedResults.error}</p>
                </div>
              )}

              {/* Comparison Display */}
              {federalAcceleratedResults && !federalAcceleratedResults.error && (
                <div>
                  {/* Side-by-side comparison cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Baseline Card */}
                    <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
                      <h3 className="font-bold text-lg text-gray-700 mb-3">Current Plan</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-semibold">Monthly Payment:</span> ${typeof federalAcceleratedResults.baseline.monthlyPayment === 'number' ? federalAcceleratedResults.baseline.monthlyPayment.toFixed(2) : federalAcceleratedResults.baseline.monthlyPayment}</p>
                        <p><span className="font-semibold">Total Paid:</span> ${federalAcceleratedResults.baseline.totalPaid.toFixed(2)}</p>
                        <p><span className="font-semibold">{federalAcceleratedResults.baseline.isForgivenessDate ? 'Forgiveness Date:' : 'Payoff Date:'}</span> {federalAcceleratedResults.baseline.payoffDate.toLocaleDateString()}</p>
                        <p><span className="font-semibold">Total Interest:</span> ${federalAcceleratedResults.baseline.totalInterest.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    {/* Accelerated Card */}
                    <div className="bg-white rounded-lg p-4 border-2 border-green-400">
                      <h3 className="font-bold text-lg text-green-700 mb-3">
                        {federalCalcMode === 'extra' ? 'With Extra Payment' : 'To Meet Target'}
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-semibold">Monthly Payment:</span> ${federalAcceleratedResults.accelerated.monthlyPayment.toFixed(2)}</p>
                        <p><span className="font-semibold">Total Paid:</span> ${federalAcceleratedResults.accelerated.totalPaid.toFixed(2)}</p>
                        <p><span className="font-semibold">Payoff Date:</span> {federalAcceleratedResults.accelerated.payoffDate.toLocaleDateString()}</p>
                        <p><span className="font-semibold">Total Interest:</span> ${federalAcceleratedResults.accelerated.totalInterest.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Savings Summary */}
                  <div className="bg-green-100 rounded-lg p-4 border border-green-300 mb-4">
                    <h4 className="font-bold text-green-800 mb-2">
                      {federalCalcMode === 'extra' ? 'Savings Summary' : 'Target Achievement'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {federalCalcMode === 'target' && federalAcceleratedResults.requiredExtraPayment && (
                        <p><span className="font-semibold">Required Extra Payment:</span> <span className="text-green-700 font-bold">${federalAcceleratedResults.requiredExtraPayment.toFixed(2)}/month</span></p>
                      )}
                      <p><span className="font-semibold">Interest Saved:</span> <span className="text-green-700 font-bold">${federalAcceleratedResults.savings.interestSaved.toFixed(2)}</span></p>
                      <p><span className="font-semibold">Time Saved:</span> <span className="text-green-700 font-bold">
                        {federalAcceleratedResults.savings.yearsSaved} {federalAcceleratedResults.savings.yearsSaved === 1 ? 'year' : 'years'}
                        {federalAcceleratedResults.savings.remainingMonths > 0 && `, ${federalAcceleratedResults.savings.remainingMonths} ${federalAcceleratedResults.savings.remainingMonths === 1 ? 'month' : 'months'}`}
                      </span></p>
                    </div>
                  </div>

                  {/* Special Note for IDR Plans */}
                  {federalAcceleratedResults.accelerated.paidOffBeforeForgiveness && (
                    <div className="bg-blue-100 rounded-lg p-4 border border-blue-300">
                      <p className="text-sm text-blue-800">
                        <span className="font-semibold">Note:</span> You'll pay off your loans before reaching forgiveness eligibility. Your extra payments will save you money and time.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
        
        {/* Private Loan Payoff Strategy - Phase 3 Enhanced */}
        {privateLoans.length > 0 && (
          <Card>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Private Loan Payoff Strategy</h2>
            <p className="text-sm text-gray-600 mb-2">
              Based on a total private balance of ${totalPrivateBalance.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Strategy: Debt Avalanche (paying highest interest rate first)
            </p>
            
            <div className="bg-green-50 p-6 rounded-xl border border-green-200">
              {/* Mode Toggle */}
              <div className="mb-6 bg-white p-4 rounded-lg border border-green-300">
                <p className="text-sm font-semibold text-gray-700 mb-3">Calculate based on:</p>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="privateCalcMode"
                      value="extra"
                      checked={privateCalcMode === 'extra'}
                      onChange={(e) => setPrivateCalcMode(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">Extra Payment Amount</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="privateCalcMode"
                      value="target"
                      checked={privateCalcMode === 'target'}
                      onChange={(e) => setPrivateCalcMode(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">Target Payoff Year</span>
                  </label>
                </div>
              </div>

              {/* Input Field - Conditional based on mode */}
              {privateCalcMode === 'extra' ? (
                <Input 
                  label="Extra Monthly Payment ($)" 
                  id="extraPayment" 
                  type="number" 
                  placeholder="200" 
                  value={extraPayment} 
                  onChange={(e) => setExtraPayment(e.target.value)} 
                />
              ) : (
                <Input 
                  label="Target Payoff Year" 
                  id="privateTargetYear" 
                  type="number" 
                  placeholder="2030" 
                  value={privateTargetYear} 
                  onChange={(e) => setPrivateTargetYear(e.target.value)} 
                />
              )}

              {/* Error Display */}
              {privateLoanResults?.error && (
                <div className={`mt-4 p-4 rounded-lg ${
                  privateLoanResults.alreadyMeetsTarget 
                    ? 'bg-yellow-100 border border-yellow-300 text-yellow-800' 
                    : 'bg-red-100 border border-red-300 text-red-800'
                }`}>
                  <p className="text-sm font-semibold">{privateLoanResults.error}</p>
                </div>
              )}

              {/* Comparison Display */}
              {privateLoanResults && !privateLoanResults.error && (
                <div className="mt-6">
                  {/* Side-by-side comparison cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Baseline Card */}
                    <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
                      <h3 className="font-bold text-lg text-gray-700 mb-3">Minimum Payments Only</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-semibold">Monthly Payment:</span> ${privateLoanResults.baseline.monthlyPayment.toFixed(2)}</p>
                        <p><span className="font-semibold">Total Paid:</span> ${privateLoanResults.baseline.totalPaid.toFixed(2)}</p>
                        <p><span className="font-semibold">Payoff Date:</span> {privateLoanResults.baseline.payoffDate.toLocaleDateString()}</p>
                        <p><span className="font-semibold">Total Interest:</span> ${privateLoanResults.baseline.totalInterest.toFixed(2)}</p>
                      </div>
                    </div>
                    
                    {/* Accelerated Card */}
                    <div className="bg-white rounded-lg p-4 border-2 border-green-400">
                      <h3 className="font-bold text-lg text-green-700 mb-3">
                        {privateCalcMode === 'extra' ? 'With Extra Payment' : 'To Meet Target'}
                      </h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-semibold">Monthly Payment:</span> ${privateLoanResults.accelerated.monthlyPayment.toFixed(2)}</p>
                        <p><span className="font-semibold">Total Paid:</span> ${privateLoanResults.accelerated.totalPaid.toFixed(2)}</p>
                        <p><span className="font-semibold">Payoff Date:</span> {privateLoanResults.accelerated.payoffDate.toLocaleDateString()}</p>
                        <p><span className="font-semibold">Total Interest:</span> ${privateLoanResults.accelerated.totalInterest.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Savings Summary */}
                  {(parseFloat(extraPayment || 0) > 0 || privateCalcMode === 'target') && (
                    <div className="bg-green-100 rounded-lg p-4 border border-green-300">
                      <h4 className="font-bold text-green-800 mb-2">
                        {privateCalcMode === 'extra' ? 'Savings Summary' : 'Target Achievement'}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {privateCalcMode === 'target' && privateLoanResults.requiredExtraPayment && (
                          <p><span className="font-semibold">Required Extra Payment:</span> <span className="text-green-700 font-bold">${privateLoanResults.requiredExtraPayment.toFixed(2)}/month</span></p>
                        )}
                        <p><span className="font-semibold">Interest Saved:</span> <span className="text-green-700 font-bold">${privateLoanResults.savings.interestSaved.toFixed(2)}</span></p>
                        <p><span className="font-semibold">Time Saved:</span> <span className="text-green-700 font-bold">
                          {privateLoanResults.savings.yearsSaved} {privateLoanResults.savings.yearsSaved === 1 ? 'year' : 'years'}
                          {privateLoanResults.savings.remainingMonths > 0 && `, ${privateLoanResults.savings.remainingMonths} ${privateLoanResults.savings.remainingMonths === 1 ? 'month' : 'months'}`}
                        </span></p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          <Card>
        )}

        {/* Strategic Tools - Refinancing */}
        {federalLoans.length > 0 && (
          <Card>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Strategic Tools</h2>
            <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-red-800 mb-4">Refinancing Simulator</h3>
              
              {/* Comparison Mode Selector */}
              <div className="mb-6 bg-white p-4 rounded-lg border border-red-300">
                <p className="text-sm font-semibold text-gray-700 mb-3">Compare refinancing based on:</p>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="comparisonMode"
                      value="lowestPayment"
                      checked={refinanceComparisonMode === 'lowestPayment'}
                      onChange={(e) => setRefinanceComparisonMode(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">Lowest Monthly Payment</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="comparisonMode"
                      value="lowestTotal"
                      checked={refinanceComparisonMode === 'lowestTotal'}
                      onChange={(e) => setRefinanceComparisonMode(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">Lowest Total Cost</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="comparisonMode"
                      value="custom"
                      checked={refinanceComparisonMode === 'custom'}
                      onChange={(e) => setRefinanceComparisonMode(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">Custom Plan</span>
                  </label>
                  {refinanceComparisonMode === 'custom' && (
                    <div className="ml-6 mt-2">
                      <select
                        value={customPlanSelection}
                        onChange={(e) => setCustomPlanSelection(e.target.value)}
                        className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="">Select a plan to compare</option>
                        {Object.keys(eligiblePlans.plans).map(planName => (
                          <option key={planName} value={planName}>{planName}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Input 
                  label="New Interest Rate (%)" 
                  id="refiRate" 
                  type="number" 
                  placeholder="5.0" 
                  value={refinanceRate} 
                  onChange={(e) => setRefinanceRate(e.target.value)} 
                />
                <Input 
                  label="New Term (Years)" 
                  id="refiTerm" 
                  type="number" 
                  placeholder="10" 
                  value={refinanceTerm} 
                  onChange={(e) => setRefinanceTerm(e.target.value)} 
                />
              </div>

              {/* Side-by-Side Comparison */}
              {refinanceResults && bestFederalPlan && (
                <div className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Federal Plan Card */}
                    <div className="bg-blue-50 border-2 border-blue-400 rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">🛡️</span>
                        <h4 className="font-bold text-blue-900">Your Federal Option</h4>
                      </div>
                      <p className="text-xs text-blue-700 mb-3 font-semibold">Protected</p>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-semibold">Plan:</span> {bestFederalPlan.name}</p>
                        <p><span className="font-semibold">Monthly Payment:</span> ${typeof bestFederalPlan.plan.monthlyPayment === 'number' ? bestFederalPlan.plan.monthlyPayment.toFixed(2) : bestFederalPlan.plan.monthlyPayment}</p>
                        <p><span className="font-semibold">Total Paid:</span> ${bestFederalPlan.plan.totalPaid.toFixed(2)}</p>
                        <p><span className="font-semibold">Payoff Date:</span> {(bestFederalPlan.plan.forgivenessDate || bestFederalPlan.plan.payoffDate).toLocaleDateString()}</p>
                        {bestFederalPlan.plan.totalInterest != null && (
                          <p><span className="font-semibold">Total Interest:</span> ${bestFederalPlan.plan.totalInterest.toFixed(2)}</p>
                        )}
                      </div>
                    </div>

                    {/* Refinanced Plan Card */}
                    <div className="bg-red-50 border-2 border-red-400 rounded-lg p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">⚠️</span>
                        <h4 className="font-bold text-red-900">Refinanced Option</h4>
                      </div>
                      <p className="text-xs text-red-700 mb-3 font-semibold">Unprotected</p>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-semibold">Plan:</span> Private Refinance</p>
                        <p><span className="font-semibold">Monthly Payment:</span> ${refinanceResults.monthlyPayment.toFixed(2)}</p>
                        <p><span className="font-semibold">Total Paid:</span> ${refinanceResults.totalPaid.toFixed(2)}</p>
                        <p><span className="font-semibold">Payoff Date:</span> {refinanceResults.payoffDate.toLocaleDateString()}</p>
                        <p><span className="font-semibold">Total Interest:</span> ${refinanceResults.totalInterest.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Warning */}
              <div className="bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-md">
                <h4 className="font-bold text-lg mb-2">⚠️ WARNING: Irreversible Decision</h4>
                <p className="text-sm mb-3">
                  Refinancing federal loans into a private loan means you <strong>permanently lose access to:</strong>
                </p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>✗ Income-Driven Repayment Plans (IBR, PAYE, ICR, RAP)</li>
                  <li>✗ Loan Forgiveness Programs (PSLF, IDR forgiveness)</li>
                  <li>✗ Federal Forbearance and Deferment Options</li>
                  <li>✗ Income-Based Payment Adjustments</li>
                  <li>✗ Death and Disability Discharge</li>
                </ul>
                <p className="text-sm mt-3 font-bold">
                  This decision CANNOT be reversed. Once you refinance to a private loan, you can never get these federal protections back.
                </p>
              </div>
            </div>
          </Card>
        )}
      <Card>
    </div>
  );
}
