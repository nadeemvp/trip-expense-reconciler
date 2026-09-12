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

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;
  if (!trip) return <p>Trip not found</p>;

  return (
    <div style={{ maxWidth: '900px', margin: '20px auto', fontFamily: 'sans-serif' }}>
      <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '20px', padding: '8px 16px', cursor: 'pointer' }}>
        ← Back to Trips
      </button>

      <h1>{trip.name}</h1>
      <p><strong>Base Currency:</strong> {trip.base_currency}</p>
      <p><strong>Members:</strong> {trip.members?.length || 0}</p>

      <hr style={{ margin: '30px 0' }} />

      <h2>Expenses ({expenses.length})</h2>

      {expenses.length === 0 ? (
        <p>No expenses logged yet.</p>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          {expenses.map(expense => (
            <div key={expense.id} style={{ border: '1px solid #ddd', padding: '12px', marginBottom: '10px', borderRadius: '5px' }}>
              <strong>{expense.description}</strong> — {expense.amount} {expense.currency}
              <br />
              <small>Paid by user {expense.paid_by} on {expense.expense_date}</small>
              <br />
              <small>Base currency amount: {expense.base_currency_amount} {trip.base_currency}</small>
            </div>
          ))}
        </div>
      )}

      <button 
        onClick={() => setShowExpenseForm(!showExpenseForm)}
        style={{ padding: '10px 20px', marginBottom: '15px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
      >
        {showExpenseForm ? 'Cancel' : 'Log Expense'}
      </button>

      {showExpenseForm && (
        <form onSubmit={handleLogExpense} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label>Description</label><br />
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              style={{ width: '100%', padding: '8px' }}
              placeholder="e.g., Hotel booking"
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Amount</label><br />
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              style={{ width: '100%', padding: '8px' }}
              placeholder="50"
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Currency</label><br />
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              style={{ width: '100%', padding: '8px' }}
            >
              <option>INR</option>
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
              <option>JPY</option>
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Date</label><br />
            <input
              type="date"
              value={formData.expense_date}
              onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Category</label><br />
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              style={{ width: '100%', padding: '8px' }}
            >
              <option value="accommodation">Accommodation</option>
              <option value="food">Food</option>
              <option value="transport">Transport</option>
              <option value="activities">Activities</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Paid By (User ID)</label><br />
            <input
              type="number"
              value={formData.paid_by}
              onChange={(e) => setFormData({ ...formData, paid_by: e.target.value })}
              style={{ width: '100%', padding: '8px' }}
              placeholder="Leave blank to default to first member"
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Split Among (select members):</label><br />
            {trip.members && trip.members.length > 0 ? (
              trip.members.map(member => (
                <div key={member.id} style={{ marginBottom: '8px' }}>
                  <input
                    type="checkbox"
                    id={`member-${member.id}`}
                    checked={formData.splitBetween.includes(member.id)}
                    onChange={() => handleSplitChange(member.id)}
                  />
                  <label htmlFor={`member-${member.id}`} style={{ marginLeft: '8px' }}>
                    {member.name}
                  </label>
                </div>
              ))
            ) : (
              <p style={{ color: '#999' }}>No members in this trip</p>
            )}
          </div>

          <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}>
            Log Expense
          </button>
        </form>
      )}

      <hr style={{ margin: '30px 0' }} />

      <h2>Settlement Plan</h2>
      <button 
        onClick={() => fetchSettlement()}
        style={{ padding: '10px 20px', marginBottom: '15px', cursor: 'pointer', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '5px' }}
      >
        Calculate Settlement
      </button>

      {settlement.length > 0 && (
        <div style={{ backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '5px' }}>
          <h3>Who Pays Whom:</h3>
          {settlement.map((trans, idx) => (
            <div key={idx} style={{ marginBottom: '10px', padding: '10px', backgroundColor: 'white', borderRadius: '5px' }}>
              <strong>User {trans.from} pays User {trans.to}: {trans.amount.toFixed(2)} {trip.base_currency}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TripDetails;