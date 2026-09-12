import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TripDetails from './pages/TripDetails';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/trips/:tripId" element={<TripDetails />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default App;