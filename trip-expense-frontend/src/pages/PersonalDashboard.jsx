import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function PersonalDashboard() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [monthlySpend, setMonthlySpend] = useState(0);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    currency: 'INR',
    category: 'other',
    expense_date: new Date().toISOString().split('T')[0]
  });
  const navigate = useNavigate();

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
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load trip data');
      console.error(err);
      setLoading(false);
    }
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
      
      // Recalculate monthly spend
      const today = new Date();
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const updatedExpenses = [...expenses, response.data.expense];
      const newMonthlyTotal = updatedExpenses
        .filter(e => new Date(e.expense_date) >= currentMonth)
        .reduce((sum, e) => sum + parseFloat(e.base_currency_amount || 0), 0);
      setMonthlySpend(newMonthlyTotal);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to log expense');
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
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
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

        {/* Budget Card */}
        {trip.monthly_budget && (
          <div style={{
            background: 'white',
            border: `3px solid ${budgetColor}`,
            padding: '20px',
            borderRadius: '8px',
            marginBottom: '30px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>
              Monthly Budget: {trip.monthly_budget} {trip.base_currency}
            </h2>
            
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

            {/* Status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
                <p style={{ margin: '0 0 5px 0', color: '#999', fontSize: '13px' }}>Remaining</p>
                <p style={{ margin: 0, color: budgetColor, fontSize: '18px', fontWeight: 'bold' }}>
                  {remaining.toFixed(2)} {trip.base_currency}
                </p>
              </div>
              <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
                <p style={{ margin: '0 0 5px 0', color: '#999', fontSize: '13px' }}>Status</p>
                <p style={{ margin: 0, color: budgetColor, fontSize: '18px', fontWeight: 'bold' }}>
                  {budgetPercent > 100 ? '⚠️ Over Budget' : budgetPercent > 80 ? '⚠️ 80%+' : '✅ On Track'}
                </p>
              </div>
            </div>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: '2px solid #ddd', margin: '30px 0' }} />

        {/* Expenses */}
        <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>Recent Expenses</h2>
        
        {expenses.length === 0 ? (
          <p style={{ color: '#999' }}>No expenses logged yet.</p>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            {expenses.slice(-10).map(expense => (
              <div key={expense.id} style={{
                background: 'white',
                border: '1px solid #ddd',
                padding: '12px',
                marginBottom: '8px',
                borderRadius: '5px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', color: '#333' }}>{expense.description}</p>
                    <p style={{ margin: 0, fontSize: '13px', color: '#999' }}>{new Date(expense.expense_date).toLocaleDateString()}</p>
                  </div>
                  <p style={{ margin: 0, fontWeight: 'bold', color: '#667eea', textAlign: 'right' }}>
                    {expense.base_currency_amount} {trip.base_currency}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

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

        {showExpenseForm && (
          <div style={{
            background: 'white',
            border: '1px solid #ddd',
            padding: '20px',
            borderRadius: '5px',
            marginTop: '20px'
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
      </div>
    </div>
  );
}

export default PersonalDashboard;