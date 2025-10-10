import React, { useState, useMemo } from 'react';
import { PlusCircle, XCircle, AlertTriangle } from 'lucide-react';
import { calculatePlans, calculatePrivateLoanPayoff, calculateAmortizedPayment } from './loanCalculations';

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
  const formatCurrency = (num) => typeof num === 'number' ? `$${num.toFixed(2)}` : num;
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
  
  // Extra Payment State
  const [extraPayment, setExtraPayment] = useState('');

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
    return calculatePrivateLoanPayoff(privateLoans, parseFloat(extraPayment || 0));
  }, [privateLoans, extraPayment]);

  // Refinancing Calculation
  const refinanceResults = useMemo(() => {
    if (!refinanceRate || !refinanceTerm || totalFederalBalance === 0) return null;
    const monthlyPayment = calculateAmortizedPayment(totalFederalBalance, parseFloat(refinanceRate) / 100, parseFloat(refinanceTerm));
    const totalPaid = monthlyPayment * parseFloat(refinanceTerm) * 12;
    return { monthlyPayment, totalPaid, totalInterest: totalPaid - totalFederalBalance };
  }, [refinanceRate, refinanceTerm, totalFederalBalance]);

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
                  warning={plan.sunset && `This plan ends on ${new Date(plan.sunset).toLocaleDateString()}.`}
                />
              ))}
            </div>
          </Card>
        )}
        
        {/* Private Loan Payoff Strategy */}
        {privateLoans.length > 0 && (
          <Card>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Private Loan Payoff Strategy</h2>
            <p className="text-sm text-gray-600 mb-6">
              Based on a total private balance of ${totalPrivateBalance.toLocaleString()}
            </p>
            <div className="bg-green-50 p-6 rounded-xl border border-green-200">
              <h3 className="font-semibold text-gray-800 mb-4">Aggressive Payoff Simulator</h3>
              <Input 
                label="Extra Monthly Payment ($)" 
                id="extraPayment" 
                type="number" 
                placeholder="0" 
                value={extraPayment} 
                onChange={(e) => setExtraPayment(e.target.value)} 
              />
            </div>
            {privateLoanResults && (
              <div className="mt-6">
                <ResultsCard title="Private Loan Payoff" plan={privateLoanResults} />
              </div>
            )}
          </Card>
        )}

        {/* Strategic Tools - Refinancing */}
        {federalLoans.length > 0 && (
          <Card>
            <h2 className="text-2xl font-semibold text-gray-800 mb-6">Strategic Tools</h2>
            <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-red-800 mb-4">Refinancing Simulator</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {refinanceResults && (
                <div className="mt-4">
                  <ResultsCard title="Refinanced Loan" plan={refinanceResults} />
                </div>
              )}
              <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-800 p-4 rounded-md">
                <h4 className="font-bold">Warning: Irreversible Decision</h4>
                <p className="text-sm">
                  Refinancing federal loans into a private loan means you <strong>permanently lose access</strong> to 
                  all federal benefits, including income-driven repayment plans and all loan forgiveness programs (like PSLF).
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
