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
    base_currency: 'INR'
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
      const response = await axios.post('http://localhost:3000/trips', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Add the new trip to the list
      setTrips([...trips, response.data.trip]);
      setFormData({ name: '', base_currency: 'INR' });
      setShowCreateForm(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create trip');
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/login');
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: '800px', margin: '20px auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>My Trips</h1>
        <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer' }}>Logout</button>
      </div>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {trips.length === 0 ? (
        <p>No trips yet. Create one to get started!</p>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          {trips.map(trip => (
            <div key={trip.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '10px', borderRadius: '5px', cursor: 'pointer' }}
              onClick={() => navigate(`/trips/${trip.id}`)}>
              <h3>{trip.name}</h3>
              <p>Base Currency: {trip.base_currency}</p>
            </div>
          ))}
        </div>
      )}

      <button 
        onClick={() => setShowCreateForm(!showCreateForm)}
        style={{ padding: '10px 20px', marginBottom: '15px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
      >
        {showCreateForm ? 'Cancel' : 'Create New Trip'}
      </button>

      {showCreateForm && (
        <form onSubmit={handleCreateTrip} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
          <div style={{ marginBottom: '10px' }}>
            <label>Trip Name</label><br />
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Base Currency</label><br />
            <select
              value={formData.base_currency}
              onChange={(e) => setFormData({ ...formData, base_currency: e.target.value })}
              style={{ width: '100%', padding: '8px' }}
            >
              <option>INR</option>
              <option>USD</option>
              <option>EUR</option>
              <option>GBP</option>
              <option>JPY</option>
            </select>
          </div>
          <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px' }}>
            Create Trip
          </button>
        </form>
      )}
    </div>
  );
}

export default Dashboard;