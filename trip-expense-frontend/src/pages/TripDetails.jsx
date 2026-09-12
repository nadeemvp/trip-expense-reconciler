import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function TripDetails() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [settlement, setSettlement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    currency: 'INR',
    category: 'other',
    expense_date: new Date().toISOString().split('T')[0],
    paid_by: '',
    splitBetween: []
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

      const tripData = tripResponse.data.trip;
      const membersData = tripResponse.data.members || [];
      setTrip({
        ...tripData,
        members: membersData
      });

      const expensesResponse = await axios.get(`http://localhost:3000/trips/${tripId}/expenses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setExpenses(expensesResponse.data.expenses || []);
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load trip data');
      console.error(err);
      setLoading(false);
    }
  }

  function handleSplitChange(userId) {
    if (formData.splitBetween.includes(userId)) {
      setFormData({
        ...formData,
        splitBetween: formData.splitBetween.filter(id => id !== userId)
      });
    } else {
      setFormData({
        ...formData,
        splitBetween: [...formData.splitBetween, userId]
      });
    }
  }

  async function handleLogExpense(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      const paidBy = formData.paid_by ? parseInt(formData.paid_by) : (trip.members?.[0]?.id || 1);

      const payload = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        category: formData.category,
        expense_date: formData.expense_date,
        paid_by: paidBy,
        splitBetween: formData.splitBetween.map(id => parseInt(id))
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
        expense_date: new Date().toISOString().split('T')[0],
        paid_by: '',
        splitBetween: []
      });
      setShowExpenseForm(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to log expense');
    }
  }

  async function fetchSettlement() {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/trips/${tripId}/settlement`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettlement(response.data.settlement || []);
    } catch (err) {
      alert('Failed to calculate settlement');
      console.error(err);
    }
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><p>Loading...</p></div>;
  if (error) return <div style={{ color: '#d32f2f', textAlign: 'center', padding: '20px' }}>{error}</div>;
  if (!trip) return <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Trip not found</div>;

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
            ← Back to Trips
          </button>
          
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', color: '#333', margin: '10px 0' }}>{trip.name}</h1>
          <div style={{ display: 'flex', gap: '30px', color: '#666', fontSize: '15px' }}>
            <p><strong>Base Currency:</strong> {trip.base_currency}</p>
            <p><strong>Members:</strong> {trip.members?.length || 0}</p>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '2px solid #ddd', margin: '30px 0' }} />

        {/* Expenses Section */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '20px' }}>
            Expenses ({expenses.length})
          </h2>

          {expenses.length === 0 ? (
            <p style={{ color: '#999', fontSize: '15px' }}>No expenses logged yet.</p>
          ) : (
            <div style={{ marginBottom: '20px' }}>
              {expenses.map(expense => (
                <div key={expense.id} style={{
                  background: 'white',
                  border: '1px solid #ddd',
                  padding: '15px',
                  marginBottom: '10px',
                  borderRadius: '5px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', margin: '0 0 8px 0' }}>
                    {expense.description}
                  </p>
                  <p style={{ color: '#666', fontSize: '14px', margin: '5px 0' }}>
                    💰 {expense.amount} {expense.currency}
                  </p>
                  <p style={{ color: '#999', fontSize: '13px', margin: '5px 0' }}>
                    Paid by user {expense.paid_by} on {new Date(expense.expense_date).toLocaleDateString()}
                  </p>
                  <p style={{ color: '#667eea', fontSize: '13px', fontWeight: 'bold', margin: '5px 0' }}>
                    Base currency: {expense.base_currency_amount} {trip.base_currency}
                  </p>
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
              fontWeight: 'bold',
              transition: 'background 0.3s'
            }}
            onMouseEnter={(e) => e.target.style.background = '#45a049'}
            onMouseLeave={(e) => e.target.style.background = '#4caf50'}
          >
            {showExpenseForm ? '✕ Cancel' : '+ Log Expense'}
          </button>

          {/* Expense Form */}
          {showExpenseForm && (
            <div style={{
              background: 'white',
              border: '1px solid #ddd',
              padding: '20px',
              borderRadius: '5px',
              marginTop: '20px'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>New Expense</h3>
              <form onSubmit={handleLogExpense}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box', fontSize: '14px' }}
                    placeholder="e.g., Hotel booking"
                  />
                </div>

                <div style={{ marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box', fontSize: '14px' }}
                      placeholder="50"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box', fontSize: '14px' }}
                    >
                      <option>INR</option>
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                      <option>JPY</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>Date</label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box', fontSize: '14px' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box', fontSize: '14px' }}
                  >
                    <option value="accommodation">Accommodation</option>
                    <option value="food">Food</option>
                    <option value="transport">Transport</option>
                    <option value="activities">Activities</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '5px' }}>Paid By (User ID)</label>
                  <input
                    type="number"
                    value={formData.paid_by}
                    onChange={(e) => setFormData({ ...formData, paid_by: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '5px', boxSizing: 'border-box', fontSize: '14px' }}
                    placeholder="Leave blank to default"
                  />
                </div>

                <div style={{ marginBottom: '20px', background: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '10px' }}>Split Among:</label>
                  {trip.members && trip.members.length > 0 ? (
                    trip.members.map(member => (
                      <div key={member.id} style={{ marginBottom: '8px' }}>
                        <input
                          type="checkbox"
                          id={`member-${member.id}`}
                          checked={formData.splitBetween.includes(member.id)}
                          onChange={() => handleSplitChange(member.id)}
                          style={{ marginRight: '8px', cursor: 'pointer' }}
                        />
                        <label htmlFor={`member-${member.id}`} style={{ cursor: 'pointer', color: '#333' }}>
                          {member.name}
                        </label>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#999' }}>No members in this trip</p>
                  )}
                </div>

                <button 
                  type="submit"
                  style={{
                    width: '100%',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: 'bold'
                  }}
                >
                  Log Expense
                </button>
              </form>
            </div>
          )}
        </div>

        <hr style={{ border: 'none', borderTop: '2px solid #ddd', margin: '30px 0' }} />

        {/* Settlement Section */}
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#333', marginBottom: '20px' }}>Settlement Plan</h2>
          
          <button 
            onClick={() => fetchSettlement()}
            style={{
              background: '#ff9800',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 'bold',
              marginBottom: '20px'
            }}
            onMouseEnter={(e) => e.target.style.background = '#e68900'}
            onMouseLeave={(e) => e.target.style.background = '#ff9800'}
          >
            Calculate Settlement
          </button>

          {settlement.length > 0 && (
            <div style={{
              background: '#fff3e0',
              border: '2px solid #ff9800',
              padding: '20px',
              borderRadius: '5px'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '15px' }}>Who Pays Whom:</h3>
              {settlement.map((trans, idx) => (
                <div key={idx} style={{
                  background: 'white',
                  padding: '12px',
                  marginBottom: '10px',
                  borderRadius: '5px',
                  borderLeft: '4px solid #ff9800'
                }}>
                  <p style={{ color: '#333', fontSize: '15px', margin: 0 }}>
                    <strong>User {trans.from}</strong> pays <strong>User {trans.to}</strong>
                  </p>
                  <p style={{ color: '#ff9800', fontSize: '16px', fontWeight: 'bold', margin: '5px 0 0 0' }}>
                    {trans.amount.toFixed(2)} {trip.base_currency}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TripDetails;