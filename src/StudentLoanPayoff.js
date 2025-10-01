import React, { useState, useEffect } from 'react';
import { Award, ArrowRight, BarChart3, DollarSign, X, Target, Zap, ShieldCheck, Download, Save, Trash2, Calendar, TrendingDown, ChevronsRight, Calculator, SlidersHorizontal, Trophy } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Reusable UI Components ---

const formatCurrency = (amt) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amt);
const formatDate = (months) => {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

// --- Feature Components (Views) ---

const RefinanceCalculator = ({ results, onBack }) => {
    const [newRate, setNewRate] = useState('');
    const [newTerm, setNewTerm] = useState('10');
    const [refiResults, setRefiResults] = useState(null);

    const calculateRefinance = () => {
        if (!newRate || !results) return;
        const totalBalance = results.inputLoans.reduce((sum, l) => sum + parseFloat(l.balance), 0);
        const monthlyRate = parseFloat(newRate) / 100 / 12;
        const termMonths = parseInt(newTerm) * 12;
        const newPayment = (totalBalance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -termMonths));
        const totalPaid = newPayment * termMonths;
        const totalInterest = totalPaid - totalBalance;
        const originalInterest = results.avalanche.totalInterest;
        const savings = originalInterest - totalInterest;
        setRefiResults({ newPayment, totalInterest, savings });
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Refinance Simulator</h2>
                <button onClick={onBack} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300">Back to Results</button>
            </div>
            <p className="text-gray-600 mb-6">See if refinancing your loans to a new rate and term could save you money.</p>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
                <input type="number" placeholder="New Interest Rate (%)" value={newRate} onChange={e => setNewRate(e.target.value)} className="px-3 py-2 border rounded-lg" />
                <select value={newTerm} onChange={e => setNewTerm(e.target.value)} className="px-3 py-2 border rounded-lg">
                    <option value="5">5 Years</option><option value="7">7 Years</option><option value="10">10 Years</option><option value="15">15 Years</option><option value="20">20 Years</option>
                </select>
                <button onClick={calculateRefinance} className="bg-blue-600 text-white py-2 rounded-lg font-semibold">Calculate Savings</button>
            </div>
            {refiResults && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-blue-50 rounded-lg"><p className="text-sm text-gray-600">New Monthly Payment</p><p className="text-2xl font-bold">{formatCurrency(refiResults.newPayment)}</p></div>
                    <div className="p-4 bg-red-50 rounded-lg"><p className="text-sm text-gray-600">New Total Interest</p><p className="text-2xl font-bold">{formatCurrency(refiResults.totalInterest)}</p></div>
                    <div className={`p-4 rounded-lg ${refiResults.savings > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                        <p className="text-sm text-gray-600">Potential Savings</p>
                        <p className={`text-2xl font-bold ${refiResults.savings > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(refiResults.savings)}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const IDRCalculator = ({ onBack }) => {
    const [income, setIncome] = useState('');
    const [familySize, setFamilySize] = useState(1);
    const [idrResults, setIdrResults] = useState(null);

    const calculateIDR = () => {
        if (!income) return;
        const povertyLine = 15060 + (familySize - 1) * 5380;
        const discretionaryIncome = Math.max(0, parseFloat(income) - povertyLine * 1.5);
        const payments = {
            ibr: discretionaryIncome * 0.1 / 12,
            paye: discretionaryIncome * 0.1 / 12,
            rap: discretionaryIncome * 0.1 / 12, // Placeholder for the new 2026 plan
        };
        setIdrResults(payments);
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold">IDR Payment Estimator</h2><button onClick={onBack} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300">Back to Results</button></div>
            <p className="text-gray-600 mb-6">Estimate your monthly payment under various Income-Driven Repayment plans. Note: The SAVE plan has been eliminated; a new plan is expected in 2026.</p>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
                <input type="number" placeholder="Adjusted Gross Income ($)" value={income} onChange={e => setIncome(e.target.value)} className="px-3 py-2 border rounded-lg" />
                <input type="number" placeholder="Family Size" value={familySize} onChange={e => setFamilySize(Math.max(1, parseInt(e.target.value)))} className="px-3 py-2 border rounded-lg" />
                <button onClick={calculateIDR} className="bg-blue-600 text-white py-2 rounded-lg font-semibold">Estimate Payments</button>
            </div>
            {idrResults && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-4 bg-gray-50 rounded-lg"><p className="font-bold">IBR</p><p className="text-2xl">{formatCurrency(idrResults.ibr)}/mo</p></div>
                    <div className="p-4 bg-gray-50 rounded-lg"><p className="font-bold">PAYE</p><p className="text-2xl">{formatCurrency(idrResults.paye)}/mo</p></div>
                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300"><p className="font-bold">New Plan (Est. 2026)</p><p className="text-2xl">{formatCurrency(idrResults.rap)}/mo</p></div>
                </div>
            )}
        </div>
    );
};

const MonthlyBreakdown = ({ results, onBack }) => {
    return (
        <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold">Month-by-Month Breakdown</h2><button onClick={onBack} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300">Back to Results</button></div>
            <p className="text-gray-600 mb-6">Here is your actionable payment plan based on the Avalanche method.</p>
            <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 sticky top-0"><tr><th className="p-2">Month</th><th className="p-2">Principal Paid</th><th className="p-2">Interest Paid</th><th className="p-2">Remaining Balance</th></tr></thead>
                    <tbody>
                        {results.avalanche.breakdown.map((row, i) => (
                            <tr key={i} className="border-b">
                                <td className="p-2">{row.month}</td>
                                <td className="p-2 text-green-600">{formatCurrency(row.principal)}</td>
                                <td className="p-2 text-red-600">{formatCurrency(row.interest)}</td>
                                <td className="p-2 font-semibold">{formatCurrency(row.balance)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ScenarioManager = ({ scenarios, onBack, onDelete, onLoad }) => (
    <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold">Saved Scenarios</h2><button onClick={onBack} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300">Back to Results</button></div>
        {scenarios.length === 0 ? <p>You have no saved scenarios.</p> : (
            <div className="space-y-4">
                {scenarios.map(s => (
                    <div key={s.id} className="border rounded-lg p-4 grid grid-cols-5 gap-4 items-center">
                        <h3 className="font-bold col-span-2">{s.name}</h3>
                        <div className="text-sm"><strong>Payoff:</strong> {formatDate(s.results.avalanche.months)}</div>
                        <div className="text-sm"><strong>Interest:</strong> {formatCurrency(s.results.avalanche.totalInterest)}</div>
                        <div className="flex gap-2 justify-end">
                            <button onClick={() => onLoad(s)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><ChevronsRight size={18} /></button>
                            <button onClick={() => onDelete(s.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
);

const ProgressTracker = ({ activeScenario, onBack, onUpdateBalance }) => {
    const [paymentAmounts, setPaymentAmounts] = useState({});

    if (!activeScenario) {
        return <div className="bg-white rounded-2xl shadow-xl p-6 text-center"><p className="text-gray-600">Please calculate and save a scenario to start tracking your progress.</p><button onClick={onBack} className="mt-4 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300">Back to Results</button></div>
    }

    const initialTotal = activeScenario.initialTotalBalance;
    const currentTotal = activeScenario.loans.reduce((sum, l) => sum + parseFloat(l.balance), 0);
    const percentPaid = initialTotal > 0 ? ((initialTotal - currentTotal) / initialTotal) * 100 : 0;

    const handlePayment = (loanId) => {
        const amount = parseFloat(paymentAmounts[loanId]);
        if (!isNaN(amount) && amount > 0) {
            onUpdateBalance(loanId, amount);
            setPaymentAmounts({...paymentAmounts, [loanId]: ''});
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold">Progress Tracker</h2><button onClick={onBack} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300">Back</button></div>
            <div className="mb-6">
                <h3 className="text-lg font-semibold">Total Progress for "{activeScenario.name}"</h3>
                <div className="w-full bg-gray-200 rounded-full h-4 mt-2"><div className="bg-green-500 h-4 rounded-full" style={{ width: `${percentPaid}%` }}></div></div>
                <div className="flex justify-between text-sm mt-1"><span>{formatCurrency(initialTotal - currentTotal)} Paid</span><span>{formatCurrency(currentTotal)} Remaining</span></div>
            </div>
            <div className="space-y-4">
                {activeScenario.loans.map(loan => (
                    <div key={loan.id} className="border p-4 rounded-lg">
                        <div className="flex justify-between items-center"><h4 className="font-semibold">{loan.name}</h4><span className="font-bold">{formatCurrency(loan.balance)}</span></div>
                        <div className="flex gap-2 mt-2">
                            <input type="number" placeholder="Log payment" value={paymentAmounts[loan.id] || ''} onChange={e => setPaymentAmounts({...paymentAmounts, [loan.id]: e.target.value})} className="flex-grow px-3 py-2 border rounded-lg text-sm" />
                            <button onClick={() => handlePayment(loan.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">Log</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Application Component ---

export default function StudentLoanPayoff() {
  const [view, setView] = useState('input');
  const [loans, setLoans] = useState([{ id: Date.now(), name: '', balance: '', rate: '', minPayment: '', inGrace: false, graceMonths: '' }]);
  const [extraPayment, setExtraPayment] = useState('');
  const [targetYears, setTargetYears] = useState('');
  const [paymentMode, setPaymentMode] = useState('extra');
  const [results, setResults] = useState(null);
  const [scenarios, setScenarios] = useState([]);
  const [activeScenario, setActiveScenario] = useState(null);
  const [forgivenessPlan, setForgivenessPlan] = useState({ active: false, type: 'PSLF', made: '', required: '120' });
  
  const updateLoan = (id, field, value) => {
    setLoans(loans.map(l => l.id === id ? { ...l, [field]: value } : l));
  };
  const addLoan = () => setLoans([...loans, { id: Date.now(), name: '', balance: '', rate: '', minPayment: '', inGrace: false, graceMonths: '' }]);
  const removeLoan = (id) => { if (loans.length > 1) setLoans(loans.filter(l => l.id !== id)); };

  const calculateStrategy = (loanData, extra = 0) => {
    let month = 0, totalInterest = 0;
    let remaining = loanData.map(l => ({ ...l, balance: parseFloat(l.balance), rate: parseFloat(l.rate) / 100, minPayment: parseFloat(l.minPayment) }));
    const breakdown = [];
    while (remaining.some(l => l.balance > 0) && month < 600) {
        month++; let monthPrincipal = 0; let monthInterest = 0;
        remaining.forEach(loan => {
            if (loan.balance <= 0) return;
            const interest = loan.balance * (loan.rate / 12);
            monthInterest += interest; totalInterest += interest; loan.balance += interest;
        });
        remaining.forEach(loan => {
            if (loan.balance <= 0) return;
            const payment = Math.min(loan.minPayment, loan.balance);
            loan.balance -= payment; monthPrincipal += payment;
        });
        let availableExtra = extra;
        for (const loan of remaining) {
            if (loan.balance > 0 && availableExtra > 0) {
                const extraApplied = Math.min(availableExtra, loan.balance);
                loan.balance -= extraApplied; monthPrincipal += extraApplied; availableExtra -= extraApplied;
            }
        }
        breakdown.push({ month, principal: monthPrincipal, interest: monthInterest, balance: remaining.reduce((sum, l) => sum + Math.max(0, l.balance), 0) });
    }
    return { months: month, totalInterest, years: Math.floor(month / 12), breakdown };
  };

  const calculatePayoff = () => {
    const validLoans = loans.filter(l => parseFloat(l.balance) > 0 && parseFloat(l.rate) >= 0 && parseFloat(l.minPayment) > 0);
    if (validLoans.length === 0) { alert("Please enter at least one valid loan."); return; }

    const loansWithAccrued = validLoans.map(l => {
        let accruedInterest = 0;
        if (l.inGrace && parseFloat(l.graceMonths) > 0) {
            accruedInterest = parseFloat(l.balance) * (parseFloat(l.rate) / 100 / 12) * parseFloat(l.graceMonths);
        }
        return { ...l, balance: parseFloat(l.balance) + accruedInterest, originalBalance: parseFloat(l.balance), accruedInterest };
    });

    let extra = parseFloat(extraPayment) || 0;
    // ... Target year calculation logic ...
    
    const avalanche = calculateStrategy([...loansWithAccrued].sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate)), extra);
    const snowball = calculateStrategy([...loansWithAccrued].sort((a, b) => parseFloat(a.balance) - parseFloat(b.balance)), extra);
    setResults({ avalanche, snowball, extraPaymentAmount: extra, inputLoans: loansWithAccrued });
    setView('results');
  };
  
  const handleSaveScenario = () => {
    const name = prompt("Enter a name for this scenario (e.g., 'Aggressive Plan'):");
    if (name && results) {
        const newScenario = {
            id: Date.now(), name, results,
            loans: JSON.parse(JSON.stringify(results.inputLoans)),
            initialTotalBalance: results.inputLoans.reduce((sum, l) => sum + l.balance, 0)
        };
        setScenarios([...scenarios, newScenario]);
        setActiveScenario(newScenario);
        alert(`Scenario "${name}" saved!`);
    }
  };

  const exportToCSV = () => {
    if (!results) return;
    let csvContent = "data:text/csv;charset=utf-8,Month,Principal,Interest,Remaining Balance\n";
    results.avalanche.breakdown.forEach(row => {
        csvContent += `${row.month},${row.principal},${row.interest},${row.balance}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "payoff_plan.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdateBalance = (loanId, amount) => {
    const updatedLoans = activeScenario.loans.map(l => 
        l.id === loanId ? {...l, balance: Math.max(0, l.balance - amount)} : l
    );
    const updatedScenario = {...activeScenario, loans: updatedLoans};
    setActiveScenario(updatedScenario);
    setScenarios(scenarios.map(s => s.id === activeScenario.id ? updatedScenario : s));
  };
  
  const renderView = () => {
    switch (view) {
        case 'input': return renderInputView();
        case 'results': return renderResultsView();
        case 'refinance': return <RefinanceCalculator results={results} onBack={() => setView('results')} />;
        case 'idr': return <IDRCalculator onBack={() => setView('results')} />;
        case 'breakdown': return <MonthlyBreakdown results={results} onBack={() => setView('results')} />;
        case 'scenarios': return <ScenarioManager scenarios={scenarios} onBack={() => setView('results')} onDelete={(id) => setScenarios(scenarios.filter(s => s.id !== id))} onLoad={(s) => {setActiveScenario(s); setView('progress')}} />;
        case 'progress': return <ProgressTracker activeScenario={activeScenario} onBack={() => setView('results')} onUpdateBalance={handleUpdateBalance} />;
        default: return renderInputView();
    }
  };
  
  const renderInputView = () => (
    <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
        {loans.map((loan, i) => (
          <div key={loan.id} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center"><h3 className="font-semibold text-lg">Loan #{i + 1}</h3>{loans.length > 1 && <button onClick={() => removeLoan(loan.id)} className="text-red-500 text-sm hover:underline">Remove</button>}</div>
            <div className="grid md:grid-cols-2 gap-4 mt-3">
                <input type="text" placeholder="Loan Name (e.g., 'FedLoan')" value={loan.name} onChange={(e) => updateLoan(loan.id, 'name', e.target.value)} className="px-3 py-2 border rounded-lg" />
                <input type="number" placeholder="Current Balance ($)" value={loan.balance} onChange={(e) => updateLoan(loan.id, 'balance', e.target.value)} className="px-3 py-2 border rounded-lg" />
                <input type="number" placeholder="Interest Rate (%)" value={loan.rate} onChange={(e) => updateLoan(loan.id, 'rate', e.target.value)} className="px-3 py-2 border rounded-lg" />
                <input type="number" placeholder="Minimum Monthly Payment ($)" value={loan.minPayment} onChange={(e) => updateLoan(loan.id, 'minPayment', e.target.value)} className="px-3 py-2 border rounded-lg" />
            </div>
            <div className="mt-4 pt-4 border-t"><label className="flex items-center space-x-3"><input type="checkbox" checked={loan.inGrace} onChange={e => updateLoan(loan.id, 'inGrace', e.target.checked)} className="h-4 w-4 rounded" /><span className="text-sm font-medium">Is this loan currently in a grace period?</span></label>
                {loan.inGrace && <input type="number" placeholder="Months remaining in grace period" value={loan.graceMonths} onChange={e => updateLoan(loan.id, 'graceMonths', e.target.value)} className="w-full mt-2 px-3 py-2 border rounded-lg text-sm" />}
            </div>
          </div>
        ))}
        <button onClick={addLoan} className="w-full py-2 border-2 border-dashed rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 font-medium">+ Add Another Loan</button>
        <div className="p-4 bg-gray-50 rounded-lg"><label className="flex items-center space-x-3"><input type="checkbox" checked={forgivenessPlan.active} onChange={e => setForgivenessPlan({...forgivenessPlan, active: e.target.checked})} className="h-5 w-5 rounded"/><span className="font-semibold">Track Public Service Loan Forgiveness (PSLF)?</span></label>
            {forgivenessPlan.active && (
                <div className="mt-4 grid md:grid-cols-2 gap-4 border-t pt-4">
                    <input type="number" placeholder="Qualifying payments made" value={forgivenessPlan.made} onChange={e => setForgivenessPlan({...forgivenessPlan, made: e.target.value})} className="px-3 py-2 border rounded-lg"/>
                    <input type="number" placeholder="Payments required (usually 120)" value={forgivenessPlan.required} onChange={e => setForgivenessPlan({...forgivenessPlan, required: e.target.value})} className="px-3 py-2 border rounded-lg"/>
                </div>
            )}
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-3">How do you want to accelerate your payoff?</h3>
            <div className="flex gap-4 mb-4"><button onClick={() => setPaymentMode('extra')} className={`flex-1 py-2 rounded-lg ${paymentMode === 'extra' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Pay an Extra Amount</button><button onClick={() => setPaymentMode('target')} className={`flex-1 py-2 rounded-lg ${paymentMode === 'target' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Set a Target Payoff Year</button></div>
            <input type="number" placeholder={paymentMode === 'extra' ? "Extra monthly payment ($)" : "Pay off in how many years?"} value={paymentMode === 'extra' ? extraPayment : targetYears} onChange={(e) => paymentMode === 'extra' ? setExtraPayment(e.target.value) : setTargetYears(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <button onClick={calculatePayoff} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700">Calculate My Payoff Plan <ArrowRight className="inline ml-2 w-5 h-5" /></button>
    </div>
  );

  const renderResultsView = () => (
    <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-xl p-4">
            <div className="flex flex-wrap gap-2 items-center">
                <button onClick={() => setView('scenarios')} className="flex items-center px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200"><SlidersHorizontal size={16} className="mr-2"/>Manage Scenarios</button>
                <button onClick={() => setView('progress')} className="flex items-center px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200" disabled={!activeScenario}><Trophy size={16} className="mr-2"/>Track Progress</button>
                <button onClick={() => setView('breakdown')} className="flex items-center px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200"><BarChart3 size={16} className="mr-2"/>Monthly Plan</button>
                <button onClick={() => setView('refinance')} className="flex items-center px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200"><Calculator size={16} className="mr-2"/>Refinance Sim</button>
                <button onClick={() => setView('idr')} className="flex items-center px-3 py-2 rounded-lg text-sm bg-gray-100 hover:bg-gray-200"><DollarSign size={16} className="mr-2"/>IDR Estimator</button>
                <div className="flex-grow"></div>
                <button onClick={handleSaveScenario} className="flex items-center px-3 py-2 rounded-lg text-sm bg-green-600 text-white hover:bg-green-700"><Save size={16} className="mr-2"/>Save Scenario</button>
                <button onClick={exportToCSV} className="flex items-center px-3 py-2 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700"><Download size={16} className="mr-2"/>Export</button>
            </div>
        </div>
        {results.inputLoans.some(l => l.accruedInterest > 0) && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded-r-lg">
                <p className="font-bold">Grace Period Interest</p>
                <p>A total of {formatCurrency(results.inputLoans.reduce((sum, l) => sum + l.accruedInterest, 0))} in interest was accrued during grace periods and added to your starting balance.</p>
            </div>
        )}
        <ForgivenessTracker plan={forgivenessPlan} />
        <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border-2 border-blue-200">
                <h3 className="text-xl font-bold mb-1">Avalanche Method</h3><p className="text-sm text-gray-600 mb-4">Pays highest interest first.</p>
                <div className="space-y-3"><div className="p-3 bg-blue-50 rounded-lg flex justify-between items-center"><span className="text-sm">Debt-Free Date</span><span className="font-bold text-blue-600">{formatDate(results.avalanche.months)}</span></div><div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center"><span className="text-sm">Total Interest Paid</span><span className="font-semibold text-red-600">{formatCurrency(results.avalanche.totalInterest)}</span></div></div>
            </div>
            <div className="bg-white rounded-2xl p-6 border-2 border-purple-200">
                <h3 className="text-xl font-bold mb-1">Snowball Method</h3><p className="text-sm text-gray-600 mb-4">Pays smallest balance first.</p>
                <div className="space-y-3"><div className="p-3 bg-purple-50 rounded-lg flex justify-between items-center"><span className="text-sm">Debt-Free Date</span><span className="font-bold text-purple-600">{formatDate(results.snowball.months)}</span></div><div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center"><span className="text-sm">Total Interest Paid</span><span className="font-semibold text-red-600">{formatCurrency(results.snowball.totalInterest)}</span></div></div>
            </div>
        </div>
        <button onClick={() => setView('input')} className="w-full bg-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-300">Start a New Calculation</button>
    </div>
  );

  return (
      <div className="min-h-screen bg-gray-50 p-4">
          <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8 pt-6">
                  <h1 className="text-5xl font-bold text-gray-900">The Payoff Climb</h1>
                  <p className="text-gray-600 text-lg mt-2">Your Complete Student Loan Planning Suite</p>
              </div>
              {renderView()}
          </div>
      </div>
  );
}

