import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, Target, Award, Save, Download, RefreshCw, BarChart3, FileText, ChevronLeft, PlusCircle, XCircle } from 'lucide-react';

// --- Reusable UI Components ---
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

// --- Main Application Component ---
export default function StudentLoanPayoff() {
  const [view, setView] = useState('input'); // 'input', 'results', etc.

  // Financial Profile State
  const [agi, setAgi] = useState('');
  const [familySize, setFamilySize] = useState('1');
  const [stateOfResidence, setStateOfResidence] = useState('CA');
  const [filingStatus, setFilingStatus] = useState('single');

  // Loans State
  const [loans, setLoans] = useState([]);
  const [plansToTakeNewLoan, setPlansToTakeNewLoan] = useState(null); // null, 'yes', or 'no'

  // --- State Management Functions ---
  const addLoan = () => {
    setLoans(prevLoans => [
      ...prevLoans,
      {
        id: Date.now(),
        type: null,
        name: '',
        balance: '',
        rate: '',
        minPayment: '',
        originationDate: '',
        lender: '',
        term: ''
      },
    ]);
  };

  const removeLoan = (id) => {
    setLoans(loans.filter((l) => l.id !== id));
  };

  const updateLoan = (id, field, value) => {
    setLoans(loans.map((l) => (l.id === id ? { ...l, [field]: value } : l)));
  };

  const setLoanType = (id, type) => {
    setLoans(loans.map((l) => (l.id === id ? { ...l, type } : l)));
  };

  // --- Derived State & Logic ---
  const showNewLoanQuestion = useMemo(() => {
    const pre2026FederalLoanExists = loans.some(
      (loan) => loan.type === 'Federal' && (loan.originationDate === 'before-2014' || loan.originationDate === 'on-or-after-2014')
    );
    return pre2026FederalLoanExists;
  }, [loans]);

  // Placeholder for calculation logic
  const handleCalculate = () => {
    console.log({
      agi,
      familySize,
      stateOfResidence,
      filingStatus,
      loans,
      plansToTakeNewLoan,
    });
    alert("Calculation logic not implemented yet. Check the console for current state.");
  };

  // --- Render Logic ---
  return (
    <div className="min-h-screen bg-gray-100 font-sans p-4 sm:p-6 lg:p-8">
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
                    <div className="flex justify-between items-start mb-4">
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
                        <Input
                          label="Loan Balance ($)"
                          id={`balance-${loan.id}`}
                          type="number"
                          placeholder="e.g., 25000"
                          value={loan.balance}
                          onChange={(e) => updateLoan(loan.id, 'balance', e.target.value)}
                        />
                        <Input
                          label="Interest Rate (%)"
                          id={`rate-${loan.id}`}
                          type="number"
                          placeholder="e.g., 5.5"
                          value={loan.rate}
                          onChange={(e) => updateLoan(loan.id, 'rate', e.target.value)}
                        />
                        {loan.type === 'Federal' && (
                          <Select
                            label="Loan Origination Date"
                            id={`origination-${loan.id}`}
                            value={loan.originationDate}
                            onChange={(e) => updateLoan(loan.id, 'originationDate', e.target.value)}
                          >
                            <option value="">Select a date range</option>
                            <option value="before-2014">First loan before July 1, 2014</option>
                            <option value="on-or-after-2014">First loan on or after July 1, 2014</option>
                            <option value="after-2026">First loan on or after July 1, 2026</option>
                          </Select>
                        )}
                        {loan.type === 'Private' && (
                          <Input
                            label="Remaining Term (years)"
                            id={`term-${loan.id}`}
                            type="number"
                            placeholder="e.g., 10"
                            value={loan.term}
                            onChange={(e) => updateLoan(loan.id, 'term', e.target.value)}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {showNewLoanQuestion && (
              <section>
                <Card className="bg-amber-50 border border-amber-200">
                  <h3 className="font-semibold text-gray-800 mb-2">Future Loans</h3>
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

            <div className="pt-6 border-t-2 border-gray-200">
              <Button onClick={handleCalculate} className="w-full text-lg" size="lg">
                <Calculator className="w-6 h-6" />
                Calculate Payoff Plan
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // NOTE: The other views (results, scenarios, etc.) are not implemented here
  // as the focus was on rebuilding the input form.
  // The original calculation and view-switching logic would need to be re-integrated.
}