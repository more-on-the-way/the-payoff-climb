import React, { useState, useEffect } from 'react';
import { Award, ArrowRight, BarChart3, DollarSign, X, Target, Zap, ShieldCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Reusable UI Components ---

const AchievementModal = ({ achievement, onClose }) => {
  if (!achievement) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X /></button>
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
          <Award className="w-12 h-12 text-white" />
        </div>
        <h2 className="text-3xl font-bold mb-2">Milestone Reached!</h2>
        <p className="text-lg text-gray-800">{achievement.title}</p>
        <p className="text-sm text-gray-600 mt-1">{achievement.message}</p>
        <button onClick={onClose} className="mt-6 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-semibold">Keep Going!</button>
      </div>
    </div>
  );
};

const Dashboard = ({ results, onBack }) => {
  const chartData = results.avalanche.breakdown.map((monthData, index) => ({
    month: monthData.month,
    Avalanche: monthData.balance,
    Snowball: results.snowball.breakdown[index]?.balance || 0,
  }));
  return (
    <div className="bg-white rounded-2xl shadow-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Payoff Dashboard</h2>
        <button onClick={onBack} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300">Back to Results</button>
      </div>
      <p className="text-gray-600 mb-6">This chart visualizes your debt balance decreasing over time with each payoff strategy.</p>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" label={{ value: 'Months', position: 'insideBottom', offset: -5 }} />
            <YAxis tickFormatter={(tick) => `$${(tick / 1000)}k`} />
            <Tooltip formatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)} />
            <Legend />
            <Line type="monotone" dataKey="Avalanche" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Snowball" stroke="#8b5cf6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const ImpactCalculator = ({ results, calculateStrategy }) => {
    const [extraPayment, setExtraPayment] = useState(50);
    const [impact, setImpact] = useState(null);
    useEffect(() => {
        if (results && extraPayment > 0) {
            const newExtraAmount = results.extraPaymentAmount + extraPayment;
            const newPlan = calculateStrategy([...results.inputLoans].sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate)), newExtraAmount);
            const monthsSaved = results.avalanche.months - newPlan.months;
            const interestSaved = results.avalanche.totalInterest - newPlan.totalInterest;
            if (monthsSaved > 0) setImpact({ months: monthsSaved, interest: interestSaved }); else setImpact(null);
        }
    }, [extraPayment, results, calculateStrategy]);
    return (
        <div className="bg-white rounded-2xl p-6 border-2 border-dashed border-yellow-500">
            <h3 className="text-xl font-bold mb-2">See Your Impact</h3>
            <p className="text-sm text-gray-600 mb-4">Discover how a small increase in your payment can make a huge difference.</p>
            <div className="flex items-center gap-4">
                <span className="font-medium">Adding an extra</span>
                <input type="number" value={extraPayment} onChange={(e) => setExtraPayment(Number(e.target.value))} className="w-24 px-3 py-2 border rounded-lg text-center font-bold text-lg"/>
                <span className="font-medium">per month could:</span>
            </div>
            {impact && <div className="mt-4 p-4 bg-green-50 rounded-lg text-center"><p className="text-green-800">Get you debt-free <strong className="text-xl">{impact.months}</strong> months sooner and save <strong className="text-xl">${impact.interest.toFixed(0)}</strong> in interest.</p></div>}
        </div>
    );
};

const RecommendationCard = ({ goal }) => {
    const recommendations = {
        saveMoney: {
            title: "Recommendation: The Avalanche Method", icon: Target, color: "blue",
            text: "Since your goal is to save the most money, the Avalanche method is your best bet. By focusing extra payments on your highest-interest loan, you'll minimize the total interest paid over time."
        },
        quickWins: {
            title: "Recommendation: The Snowball Method", icon: Zap, color: "purple",
            text: "Because you're focused on motivation, the Snowball method is perfect. Paying off your smallest loans first will give you quick, satisfying wins that build momentum to keep you going."
        }
    };
    const recommendation = recommendations[goal];
    const Icon = recommendation.icon;

    return (
        <div className={`bg-white rounded-2xl p-6 border-2 border-${recommendation.color}-200`}>
            <div className="flex items-center mb-2">
                <Icon className={`w-6 h-6 mr-3 text-${recommendation.color}-600`} />
                <h3 className="text-xl font-bold">{recommendation.title}</h3>
            </div>
            <p className="text-gray-700">{recommendation.text}</p>
        </div>
    );
};

const ForgivenessTracker = ({ plan }) => {
    if (!plan.active || !plan.made || !plan.required) return null;
    const made = parseInt(plan.made);
    const required = parseInt(plan.required);
    if (isNaN(made) || isNaN(required) || required === 0) return null;
    const remaining = Math.max(0, required - made);
    const progress = Math.min(100, (made / required) * 100);
    const forgivenessDate = new Date();
    forgivenessDate.setMonth(forgivenessDate.getMonth() + remaining);

    return (
        <div className="bg-white rounded-2xl p-6 border-2 border-green-200">
            <div className="flex items-center mb-3">
                <ShieldCheck className="w-6 h-6 mr-3 text-green-600" />
                <h3 className="text-xl font-bold">{plan.type} Forgiveness Progress</h3>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4"><div className="bg-green-500 h-4 rounded-full" style={{ width: `${progress}%` }}></div></div>
            <div className="flex justify-between text-sm mt-2">
                <span>{made} of {required} Payments Made</span>
                <span className="font-bold">{progress.toFixed(1)}%</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Payments Remaining</p>
                    <p className="text-2xl font-bold text-green-800">{remaining}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-gray-600">Est. Forgiveness Date</p>
                    <p className="text-2xl font-bold text-green-800">{forgivenessDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                </div>
            </div>
        </div>
    );
};

// --- Main Application Component ---

export default function StudentLoanPayoff() {
  const [view, setView] = useState('input');
  const [loans, setLoans] = useState([{ id: 1, name: '', balance: '', rate: '', minPayment: '', accruedInterest: '' }]);
  const [extraPayment, setExtraPayment] = useState('');
  const [targetYears, setTargetYears] = useState('');
  const [paymentMode, setPaymentMode] = useState('extra');
  const [results, setResults] = useState(null);
  const [subView, setSubView] = useState('main');
  const [achievement, setAchievement] = useState(null);
  const [achievedMilestones, setAchievedMilestones] = useState([]);
  const [userGoal, setUserGoal] = useState('saveMoney');
  const [forgivenessPlan, setForgivenessPlan] = useState({ active: false, type: 'PSLF', made: '', required: '120' });

  const updateLoan = (id, field, value) => {
    setLoans(loans.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const addLoan = () => {
    setLoans([...loans, { id: Date.now(), name: '', balance: '', rate: '', minPayment: '', accruedInterest: '' }]);
  };

  const removeLoan = (id) => {
    if (loans.length > 1) {
      setLoans(loans.filter(l => l.id !== id));
    }
  };

  const calculateStrategy = (loanData, extra = 0) => {
    let month = 0, totalInterest = 0;
    let remaining = loanData.map(l => ({...l, balance: parseFloat(l.balance) + (parseFloat(l.accruedInterest) || 0), rate: parseFloat(l.rate) / 100, minPayment: parseFloat(l.minPayment)}));
    const breakdown = [];
    while (remaining.some(l => l.balance > 0) && month < 600) {
        month++; let availableExtra = extra;
        remaining.forEach(loan => {
            if (loan.balance <= 0) return;
            const interest = loan.balance * (loan.rate / 12);
            totalInterest += interest;
            loan.balance += interest;
        });
        remaining.forEach(loan => {
            if (loan.balance <= 0) return;
            const payment = Math.min(loan.minPayment, loan.balance);
            loan.balance -= payment;
        });
        for (const loan of remaining) {
            if (loan.balance > 0 && availableExtra > 0) {
                const extraApplied = Math.min(availableExtra, loan.balance);
                loan.balance -= extraApplied;
                availableExtra -= extraApplied;
            }
        }
        breakdown.push({month, balance: remaining.reduce((sum, l) => sum + Math.max(0, l.balance), 0)});
    }
    return { months: month, totalInterest, years: Math.floor(month / 12), breakdown };
  };

  const calculatePayoff = () => {
    const validLoans = loans.filter(l => parseFloat(l.balance) > 0 && parseFloat(l.rate) >= 0 && parseFloat(l.minPayment) > 0);
    if (validLoans.length === 0) return;
    let extra = parseFloat(extraPayment) || 0;
    if (paymentMode === 'target' && targetYears) {
        const totalBalance = validLoans.reduce((s, l) => s + parseFloat(l.balance), 0);
        const totalMinPayment = validLoans.reduce((s, l) => s + parseFloat(l.minPayment), 0);
        const requiredPayment = totalBalance / (parseInt(targetYears) * 12);
        extra = Math.max(0, requiredPayment - totalMinPayment);
    }
    const avalanche = calculateStrategy([...validLoans].sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate)), extra);
    const snowball = calculateStrategy([...validLoans].sort((a, b) => parseFloat(a.balance) - parseFloat(b.balance)), extra);
    setResults({avalanche, snowball, extraPaymentAmount: extra, inputLoans: JSON.parse(JSON.stringify(validLoans)), initialTotalBalance: validLoans.reduce((s, l) => s + parseFloat(l.balance), 0)});
    setView('results'); setSubView('main'); setAchievedMilestones([]);
  };

  const handleForgivenessChange = (field, value) => {
    setForgivenessPlan(prev => ({ ...prev, [field]: value }));
  };
  
  const formatCurrency = (amt) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amt);
  const formatDate = (months) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
          <AchievementModal achievement={achievement} onClose={() => setAchievement(null)} />
          <div className="max-w-6xl mx-auto">
              <div className="text-center mb-8 pt-6">
                  <h1 className="text-4xl font-bold text-gray-900">The Payoff Climb</h1>
                  <p className="text-gray-600 text-lg mt-2">Your Personalized Student Loan Payoff Planner</p>
              </div>

              {view === 'input' && (
                  <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 space-y-6">
                      {loans.map((loan, i) => (
                        <div key={loan.id} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex justify-between items-center">
                            <h3 className="font-semibold text-lg">Loan #{i + 1}</h3>
                            {loans.length > 1 && <button onClick={() => removeLoan(loan.id)} className="text-red-500 text-sm hover:underline">Remove</button>}
                          </div>
                          <div className="grid md:grid-cols-2 gap-4 mt-3">
                              <input type="text" placeholder="Loan Name (e.g., 'FedLoan')" value={loan.name} onChange={(e) => updateLoan(loan.id, 'name', e.target.value)} className="px-3 py-2 border rounded-lg" />
                              <input type="number" placeholder="Current Balance ($)" value={loan.balance} onChange={(e) => updateLoan(loan.id, 'balance', e.target.value)} className="px-3 py-2 border rounded-lg" />
                              <input type="number" placeholder="Interest Rate (%)" value={loan.rate} onChange={(e) => updateLoan(loan.id, 'rate', e.target.value)} className="px-3 py-2 border rounded-lg" />
                              <input type="number" placeholder="Minimum Monthly Payment ($)" value={loan.minPayment} onChange={(e) => updateLoan(loan.id, 'minPayment', e.target.value)} className="px-3 py-2 border rounded-lg" />
                          </div>
                        </div>
                      ))}
                      <button onClick={addLoan} className="w-full py-2 border-2 border-dashed rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 font-medium">+ Add Another Loan</button>
                      
                      <div className="p-4 bg-gray-50 rounded-lg">
                          <h3 className="font-semibold mb-3">What's your main goal?</h3>
                          <div className="flex gap-4">
                              <button onClick={() => setUserGoal('saveMoney')} className={`flex-1 py-3 rounded-lg text-center font-medium ${userGoal === 'saveMoney' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white hover:bg-gray-100'}`}>Save the Most Money</button>
                              <button onClick={() => setUserGoal('quickWins')} className={`flex-1 py-3 rounded-lg text-center font-medium ${userGoal === 'quickWins' ? 'bg-purple-600 text-white shadow-lg' : 'bg-white hover:bg-gray-100'}`}>Get Quick Wins for Motivation</button>
                          </div>
                      </div>

                      <div className="p-4 bg-gray-50 rounded-lg">
                          <label className="flex items-center space-x-3 cursor-pointer">
                              <input type="checkbox" checked={forgivenessPlan.active} onChange={(e) => handleForgivenessChange('active', e.target.checked)} className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500"/>
                              <span className="font-semibold">Track Student Loan Forgiveness? (Premium Feature)</span>
                          </label>
                          {forgivenessPlan.active && (
                              <div className="mt-4 grid md:grid-cols-3 gap-4 border-t pt-4">
                                  <select value={forgivenessPlan.type} onChange={(e) => handleForgivenessChange('type', e.target.value)} className="px-3 py-2 border rounded-lg">
                                      <option>PSLF</option><option>IDR</option>
                                  </select>
                                  <input type="number" placeholder="Payments made" value={forgivenessPlan.made} onChange={(e) => handleForgivenessChange('made', e.target.value)} className="px-3 py-2 border rounded-lg"/>
                                  <input type="number" placeholder="Payments required" value={forgivenessPlan.required} onChange={(e) => handleForgivenessChange('required', e.target.value)} className="px-3 py-2 border rounded-lg"/>
                              </div>
                          )}
                      </div>
                      
                       <div className="p-4 bg-blue-50 rounded-lg">
                          <h3 className="font-semibold mb-3">How do you want to accelerate your payoff?</h3>
                          <div className="flex gap-4 mb-4">
                              <button onClick={() => setPaymentMode('extra')} className={`flex-1 py-2 rounded-lg ${paymentMode === 'extra' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Pay an Extra Amount</button>
                              <button onClick={() => setPaymentMode('target')} className={`flex-1 py-2 rounded-lg ${paymentMode === 'target' ? 'bg-blue-600 text-white' : 'bg-white'}`}>Set a Target Payoff Year</button>
                          </div>
                          <input type="number" placeholder={paymentMode === 'extra' ? "Extra monthly payment ($)" : "Pay off in how many years?"} value={paymentMode === 'extra' ? extraPayment : targetYears} onChange={(e) => paymentMode === 'extra' ? setExtraPayment(e.target.value) : setTargetYears(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <button onClick={calculatePayoff} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700">Calculate My Payoff Plan <ArrowRight className="inline ml-2 w-5 h-5" /></button>
                  </div>
              )}

              {view === 'results' && results && (
                  subView === 'dashboard' ? ( <Dashboard results={results} onBack={() => setSubView('main')} /> ) : (
                      <div className="space-y-6">
                          <div className="bg-white rounded-2xl shadow-xl p-4">
                              <div className="flex flex-wrap gap-2">
                                  <button onClick={() => setSubView('dashboard')} className="flex items-center px-4 py-2 rounded-lg font-medium text-sm bg-purple-600 text-white hover:bg-purple-700"><BarChart3 className="w-4 h-4 mr-2" /> View Dashboard</button>
                                  {/* Future premium buttons can go here */}
                              </div>
                          </div>
                          
                          <RecommendationCard goal={userGoal} />
                          <ForgivenessTracker plan={forgivenessPlan} />
                          <ImpactCalculator results={results} calculateStrategy={calculateStrategy} />
                          
                          <div className="grid md:grid-cols-2 gap-6">
                              <div className="bg-white rounded-2xl p-6 border-2 border-blue-200">
                                  <h3 className="text-xl font-bold mb-1">Avalanche Method</h3>
                                  <p className="text-sm text-gray-600 mb-4">Pays highest interest first.</p>
                                  <div className="space-y-3">
                                    <div className="p-3 bg-blue-50 rounded-lg flex justify-between items-center"><span className="text-sm">Debt-Free Date</span><span className="font-bold text-blue-600">{formatDate(results.avalanche.months)}</span></div>
                                    <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center"><span className="text-sm">Total Interest Paid</span><span className="font-semibold text-red-600">{formatCurrency(results.avalanche.totalInterest)}</span></div>
                                  </div>
                              </div>
                              <div className="bg-white rounded-2xl p-6 border-2 border-purple-200">
                                  <h3 className="text-xl font-bold mb-1">Snowball Method</h3>
                                  <p className="text-sm text-gray-600 mb-4">Pays smallest balance first.</p>
                                  <div className="space-y-3">
                                    <div className="p-3 bg-purple-50 rounded-lg flex justify-between items-center"><span className="text-sm">Debt-Free Date</span><span className="font-bold text-purple-600">{formatDate(results.snowball.months)}</span></div>
                                    <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center"><span className="text-sm">Total Interest Paid</span><span className="font-semibold text-red-600">{formatCurrency(results.snowball.totalInterest)}</span></div>
                                  </div>
                              </div>
                          </div>
                          <button onClick={() => setView('input')} className="w-full bg-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-300">Start a New Calculation</button>
                      </div>
                  )
              )}
          </div>
      </div>
  );
}
