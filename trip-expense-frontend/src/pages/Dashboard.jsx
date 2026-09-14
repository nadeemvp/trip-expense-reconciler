import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Dashboard() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    base_currency: 'INR',
    trip_type: 'group',
    monthly_budget: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrips();
  }, []);

  async function fetchTrips() {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/trips', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrips(response.data.trips || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to load trips');
      setLoading(false);
    }
  }

  async function handleCreateTrip(e) {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        name: formData.name,
        base_currency: formData.base_currency,
        trip_type: formData.trip_type,
        monthly_budget: formData.trip_type === 'personal' ? parseFloat(formData.monthly_budget) : null
      };

      const response = await axios.post('http://localhost:3000/trips', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTrips([...trips, response.data.trip]);
      setFormData({ name: '', base_currency: 'INR', trip_type: 'group', monthly_budget: '' });
      setShowCreateForm(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create trip');
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userId');
    navigate('/login');
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><p>Loading...</p></div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', margin: '0 0 5px 0' }}>My Trips</h1>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>Welcome, {localStorage.getItem('userName')}</p>
          </div>
          <button 
            onClick={handleLogout}
            style={{
              background: '#d32f2f',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
            onMouseEnter={(e) => e.target.style.background = '#b71c1c'}
            onMouseLeave={(e) => e.target.style.background = '#d32f2f'}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px 20px' }}>
        {error && (
          <div style={{ background: '#ffebee', border: '1px solid #ef5350', color: '#c62828', padding: '12px', borderRadius: '5px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {/* Create Trip Button */}
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            background: '#667eea',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '25px'
          }}
          onMouseEnter={(e) => e.target.style.background = '#5568d3'}
          onMouseLeave={(e) => e.target.style.background = '#667eea'}
        >
          {showCreateForm ? '✕ Cancel' : '+ Create New Trip'}
        </button>

        {/* Create Trip Form */}
        {showCreateForm && (
          <div style={{
            background: 'white',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '25px',
            marginBottom: '30px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#333', marginBottom: '20px' }}>Create New Trip</h2>
            <form onSubmit={handleCreateTrip}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>Trip Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    boxSizing: 'border-box',
                    fontSize: '14px'
                  }}
                  placeholder="e.g., Paris Trip 2026"
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>Trip Type</label>
                <select
                  value={formData.trip_type || 'group'}
                  onChange={(e) => setFormData({ ...formData, trip_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    boxSizing: 'border-box',
                    fontSize: '14px'
                  }}
                >
                  <option value="group">Group Trip (with friends)</option>
                  <option value="personal">Personal Tracker (solo travel/abroad)</option>
                </select>
                <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>
                  {formData.trip_type === 'personal' ? 'Track your personal spending and budget' : 'Split expenses with friends'}
                </p>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>Base Currency</label>
                <select
                  value={formData.base_currency}
                  onChange={(e) => setFormData({ ...formData, base_currency: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '5px',
                    boxSizing: 'border-box',
                    fontSize: '14px'
                  }}
                >
                  <option>INR</option>
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                  <option>JPY</option>
                </select>
              </div>

              {formData.trip_type === 'personal' && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', color: '#333', marginBottom: '8px' }}>Monthly Budget</label>
                  <input
                    type="number"
                    value={formData.monthly_budget}
                    onChange={(e) => setFormData({ ...formData, monthly_budget: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '5px',
                      boxSizing: 'border-box',
                      fontSize: '14px'
                    }}
                    placeholder="e.g., 50000"
                  />
                  <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>
                    Set your monthly spending limit in {formData.base_currency}
                  </p>
                </div>
              )}

              <button 
                type="submit"
                style={{
                  width: '100%',
                  background: '#4caf50',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 'bold'
                }}
                onMouseEnter={(e) => e.target.style.background = '#45a049'}
                onMouseLeave={(e) => e.target.style.background = '#4caf50'}
              >
                Create Trip
              </button>
            </form>
          </div>
        )}

        {/* Trips Grid */}
        {trips.length === 0 ? (
          <div style={{
            background: '#e3f2fd',
            border: '2px solid #2196f3',
            borderRadius: '8px',
            padding: '30px',
            textAlign: 'center'
          }}>
            <p style={{ color: '#1565c0', fontSize: '16px', margin: 0 }}>
              No trips yet. Create one to get started!
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {trips.map(trip => (
              <div 
                key={trip.id}
                onClick={() => navigate(trip.trip_type === 'personal' ? `/personal/${trip.id}` : `/trips/${trip.id}`)}
                style={{
                  background: 'white',
                  border: trip.trip_type === 'personal' ? '3px solid #ff9800' : '3px solid #667eea',
                  borderRadius: '8px',
                  padding: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  transform: 'translateY(0)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#333', margin: '0 0 5px 0' }}>
                    {trip.name}
                  </h3>
                  <span style={{
                    background: trip.trip_type === 'personal' ? '#fff3e0' : '#f3f4ff',
                    color: trip.trip_type === 'personal' ? '#ff9800' : '#667eea',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    {trip.trip_type === 'personal' ? 'PERSONAL' : 'GROUP'}
                  </span>
                </div>
                
                <p style={{ margin: '8px 0', fontSize: '14px', color: '#666' }}>
                  <strong>Currency:</strong> {trip.base_currency}
                </p>

                {trip.trip_type === 'personal' && trip.monthly_budget && (
                  <p style={{ margin: '8px 0', fontSize: '14px', color: '#666' }}>
                    <strong>Budget:</strong> {trip.monthly_budget} {trip.base_currency}/month
                  </p>
                )}
                
                <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#999' }}>
                  Click to view details
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;