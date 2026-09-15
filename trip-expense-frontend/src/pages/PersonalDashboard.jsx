import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

function PersonalDashboard() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [monthlySpend, setMonthlySpend] = useState(0);
  const [chartData, setChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    currency: 'INR',
    category: 'other',
    expense_date: new Date().toISOString().split('T')[0]
  });
  const [recurringFormData, setRecurringFormData] = useState({
    description: '',
    amount: '',
    currency: 'INR',
    category: 'other',
    day_of_month: 1
  });
  const navigate = useNavigate();

  const COLORS = ['#667eea', '#ff9800', '#4caf50', '#f44336', '#2196f3', '#ff5722'];

  useEffect(() => {
    fetchTripData();
  }, [tripId]);

  async function fetchTripData() {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const tripResponse = await axios.get(`http://localhost:3000/trips/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrip(tripResponse.data.trip);

      const expensesResponse = await axios.get(`http://localhost:3000/trips/${tripId}/expenses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const allExpenses = expensesResponse.data.expenses || [];
      setExpenses(allExpenses);
      
      // Calculate this month's spend
      const today = new Date();
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlyTotal = allExpenses
        .filter(e => new Date(e.expense_date) >= currentMonth)
        .reduce((sum, e) => sum + parseFloat(e.base_currency_amount || 0), 0);
      setMonthlySpend(monthlyTotal);

      // Build 30-day trend chart
      buildTrendChart(allExpenses);
      
      // Build category breakdown
      buildCategoryData(allExpenses);
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load trip data');
      console.error(err);
      setLoading(false);
    }
  }

  function buildTrendChart(allExpenses) {
    const last30Days = {};
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      last30Days[dateStr] = 0;
    }

    allExpenses.forEach(exp => {
      const expDate = exp.expense_date.substring(0, 10);
      if (last30Days.hasOwnProperty(expDate)) {
        last30Days[expDate] += parseFloat(exp.base_currency_amount || 0);
      }
    });

    const chartArray = Object.keys(last30Days).map(date => {
      const [year, month, day] = date.split('-');
      return {
        date: `${month}-${day}`,
        fullDate: date,
        amount: Math.round(last30Days[date] * 100) / 100
      };
    });

    setChartData(chartArray);
  }

  function buildCategoryData(allExpenses) {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const categoryTotals = {};
    allExpenses
      .filter(e => new Date(e.expense_date) >= currentMonth)
      .forEach(exp => {
        const cat = exp.category || 'other';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(exp.base_currency_amount || 0);
      });

    const categoryArray = Object.keys(categoryTotals).map(cat => ({
      name: cat.charAt(0).toUpperCase() + cat.slice(1),
      value: Math.round(categoryTotals[cat] * 100) / 100
    }));

    setCategoryData(categoryArray);
  }

  async function handleLogExpense(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const userId = localStorage.getItem('userId');
      
      const payload = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        category: formData.category,
        expense_date: formData.expense_date,
        paid_by: parseInt(userId),
        splitBetween: [parseInt(userId)]
      };

      const response = await axios.post(`http://localhost:3000/trips/${tripId}/expenses`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setExpenses([...expenses, response.data.expense]);
      setFormData({
        description: '',
        amount: '',
        currency: 'INR',
        category: 'other',
        expense_date: new Date().toISOString().split('T')[0]
      });
      setShowExpenseForm(false);
      
      // Recalculate
      const today = new Date();
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const updatedExpenses = [...expenses, response.data.expense];
      const newMonthlyTotal = updatedExpenses
        .filter(e => new Date(e.expense_date) >= currentMonth)
        .reduce((sum, e) => sum + parseFloat(e.base_currency_amount || 0), 0);
      setMonthlySpend(newMonthlyTotal);
      
      buildTrendChart(updatedExpenses);
      buildCategoryData(updatedExpenses);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to log expense');
    }
  }

  async function handleAddRecurring(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      const payload = {
        description: recurringFormData.description,
        amount: parseFloat(recurringFormData.amount),
        currency: recurringFormData.currency,
        category: recurringFormData.category,
        day_of_month: parseInt(recurringFormData.day_of_month)
      };

      await axios.post(`http://localhost:3000/trips/${tripId}/recurring-expenses`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setRecurringFormData({
        description: '',
        amount: '',
        currency: 'INR',
        category: 'other',
        day_of_month: 1
      });
      setShowRecurringForm(false);
      alert('Recurring expense added!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add recurring expense');
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><p>Loading...</p></div>;
  if (error) return <div style={{ color: '#d32f2f', textAlign: 'center', padding: '20px' }}>{error}</div>;
  if (!trip) return <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Trip not found</div>;

  const budgetPercent = trip.monthly_budget ? (monthlySpend / trip.monthly_budget) * 100 : 0;
  const budgetColor = budgetPercent > 100 ? '#d32f2f' : budgetPercent > 80 ? '#ff9800' : '#4caf50';
  const remaining = trip.monthly_budget ? trip.monthly_budget - monthlySpend : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'Arial, sans-serif', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ marginBottom: '30px' }}>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{
              background: '#667eea',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '15px'
            }}
          >
            ← Back to Dashboard
          </button>
          
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '10px 0' }}>{trip.name}</h1>
          <p style={{ color: '#666', fontSize: '15px' }}>Personal Travel Budget Tracker</p>
        </div>

        {/* Budget Card with Alerts */}
        {trip.monthly_budget && (
          <div style={{
            background: 'white',
            border: `3px solid ${budgetColor}`,
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '30px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', margin: 0 }}>
                Monthly Budget: {trip.monthly_budget} {trip.base_currency}
              </h2>
              
              {/* Alert Badges */}
              {budgetPercent > 100 && (
                <div style={{
                  background: '#d32f2f',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontWeight: 'bold',
                  fontSize: '13px'
                }}>
                  ⚠️ OVER BUDGET
                </div>
              )}
              {budgetPercent > 80 && budgetPercent <= 100 && (
                <div style={{
                  background: '#ff9800',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontWeight: 'bold',
                  fontSize: '13px'
                }}>
                  ⚠️ 80% LIMIT REACHED
                </div>
              )}
              {budgetPercent <= 80 && (
                <div style={{
                  background: '#4caf50',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontWeight: 'bold',
                  fontSize: '13px'
                }}>
                  ✅ ON TRACK
                </div>
              )}
            </div>
            
            {/* Progress Bar */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ background: '#e0e0e0', height: '30px', borderRadius: '15px', overflow: 'hidden', marginBottom: '10px' }}>
                <div style={{
                  background: budgetColor,
                  height: '100%',
                  width: `${Math.min(budgetPercent, 100)}%`,
                  transition: 'width 0.3s'
                }} />
              </div>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                <strong>{monthlySpend.toFixed(2)}</strong> of <strong>{trip.monthly_budget}</strong> spent
                ({budgetPercent.toFixed(1)}%)
              </p>
            </div>

            {/* Status Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
              <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>SPENT</p>
                <p style={{ margin: 0, color: budgetColor, fontSize: '20px', fontWeight: 'bold' }}>
                  {monthlySpend.toFixed(2)}
                </p>
              </div>
              <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>REMAINING</p>
                <p style={{ margin: 0, color: remaining > 0 ? '#4caf50' : '#d32f2f', fontSize: '20px', fontWeight: 'bold' }}>
                  {remaining.toFixed(2)}
                </p>
              </div>
              <div style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 8px 0', color: '#999', fontSize: '12px' }}>PERCENTAGE</p>
                <p style={{ margin: 0, color: budgetColor, fontSize: '20px', fontWeight: 'bold' }}>
                  {budgetPercent.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
          
          {/* Spending Trend Chart */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid #ddd'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '15px', margin: '0 0 15px 0' }}>
              📈 Spending Trend (Last 30 Days)
            </h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis 
                    dataKey="date" 
                    fontSize={12}
                    tick={{ fill: '#666' }}
                  />
                  <YAxis 
                    fontSize={12}
                    tick={{ fill: '#666' }}
                  />
                  <Tooltip 
                    contentStyle={{ background: '#fff', border: '1px solid #ddd', borderRadius: '5px' }}
                    formatter={(value) => value.toFixed(2)}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#667eea" 
                    strokeWidth={2}
                    dot={{ fill: '#667eea', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Daily Spending"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ textAlign: 'center', color: '#999' }}>No expense data for chart</p>
            )}
          </div>

          {/* Category Breakdown */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            border: '1px solid #ddd'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', margin: '0 0 15px 0' }}>
              🍰 Spending by Category
            </h3>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value.toFixed(0)}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => value.toFixed(2)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ textAlign: 'center', color: '#999' }}>No category data</p>
            )}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '2px solid #ddd', margin: '30px 0' }} />

        {/* Recent Expenses */}
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>Recent Expenses</h2>
        
        {expenses.length === 0 ? (
          <p style={{ color: '#999' }}>No expenses logged yet.</p>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            {expenses.slice(-10).reverse().map(expense => (
              <div key={expense.id} style={{
                background: 'white',
                border: '1px solid #ddd',
                padding: '12px',
                marginBottom: '8px',
                borderRadius: '5px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <div>
                  <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', color: '#333' }}>{expense.description}</p>
                  <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>{new Date(expense.expense_date).toLocaleDateString()}</p>
                </div>
                <p style={{ margin: 0, fontWeight: 'bold', color: '#667eea', textAlign: 'right' }}>
                  {expense.base_currency_amount} {trip.base_currency}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          <button 
            onClick={() => setShowExpenseForm(!showExpenseForm)}
            style={{
              background: '#4caf50',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 'bold'
            }}
          >
            {showExpenseForm ? '✕ Cancel' : '+ Log Expense'}
          </button>

          <button 
            onClick={() => setShowRecurringForm(!showRecurringForm)}
            style={{
              background: '#2196f3',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 'bold'
            }}
          >
            {showRecurringForm ? '✕ Cancel' : '+ Add Recurring'}
          </button>
        </div>

        {/* Log Expense Form */}
        {showExpenseForm && (
          <div style={{
            background: 'white',
            border: '1px solid #ddd',
            padding: '20px',
            borderRadius: '5px',
            marginBottom: '20px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Log Expense</h3>
            <form onSubmit={handleLogExpense}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box' }}
                  placeholder="e.g., Food"
                />
              </div>

              <div style={{ marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box' }}
                  >
                    <option>INR</option>
                    <option>USD</option>
                    <option>EUR</option>
                    <option>GBP</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Date</label>
                <input
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box' }}
                >
                  <option value="food">Food</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="transport">Transport</option>
                  <option value="activities">Activities</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <button type="submit" style={{
                width: '100%',
                background: '#667eea',
                color: 'white',
                border: 'none',
                padding: '10px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}>
                Log Expense
              </button>
            </form>
          </div>
        )}

        {/* Add Recurring Form */}
        {showRecurringForm && (
          <div style={{
            background: 'white',
            border: '1px solid #ddd',
            padding: '20px',
            borderRadius: '5px',
            marginBottom: '20px'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>Add Recurring Expense</h3>
            <form onSubmit={handleAddRecurring}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Description</label>
                <input
                  type="text"
                  value={recurringFormData.description}
                  onChange={(e) => setRecurringFormData({ ...recurringFormData, description: e.target.value })}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box' }}
                  placeholder="e.g., Monthly Rent"
                />
              </div>

              <div style={{ marginBottom: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={recurringFormData.amount}
                    onChange={(e) => setRecurringFormData({ ...recurringFormData, amount: e.target.value })}
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Currency</label>
                  <select
                    value={recurringFormData.currency}
                    onChange={(e) => setRecurringFormData({ ...recurringFormData, currency: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box' }}
                  >
                    <option>INR</option>
                    <option>USD</option>
                    <option>EUR</option>
                    <option>GBP</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Day of Month</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={recurringFormData.day_of_month}
                  onChange={(e) => setRecurringFormData({ ...recurringFormData, day_of_month: parseInt(e.target.value) })}
                  required
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>Category</label>
                <select
                  value={recurringFormData.category}
                  onChange={(e) => setRecurringFormData({ ...recurringFormData, category: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box' }}
                >
                  <option value="food">Food</option>
                  <option value="accommodation">Accommodation</option>
                  <option value="transport">Transport</option>
                  <option value="activities">Activities</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <button type="submit" style={{
                width: '100%',
                background: '#2196f3',
                color: 'white',
                border: 'none',
                padding: '10px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}>
                Add Recurring Expense
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default PersonalDashboard;
