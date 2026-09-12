import { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post('http://localhost:3000/login', {
        email,
        password
      });

      localStorage.setItem('token', response.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'white',
        borderRadius: '10px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        padding: '40px',
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#333', marginBottom: '5px', textAlign: 'center' }}>
          Trip Expense
        </h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '30px' }}>Reconciler</p>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', color: '#333', fontWeight: 'bold', marginBottom: '8px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px',
                boxSizing: 'border-box',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
              placeholder="your@email.com"
              required
            />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', color: '#333', fontWeight: 'bold', marginBottom: '8px' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px',
                boxSizing: 'border-box',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p style={{
              color: '#d32f2f',
              fontSize: '13px',
              marginBottom: '15px',
              background: '#ffebee',
              padding: '10px',
              borderRadius: '5px'
            }}>
              {error}
            </p>
          )}
          
          <button 
            type="submit" 
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 'bold',
              padding: '12px',
              border: 'none',
              borderRadius: '5px',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'transform 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            Login
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#666', marginTop: '20px', fontSize: '14px' }}>
          Don't have an account? 
          <Link to="/register" style={{ color: '#667eea', textDecoration: 'none', fontWeight: 'bold', marginLeft: '5px' }}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;