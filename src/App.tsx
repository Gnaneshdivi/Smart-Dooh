import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DOOHProvider } from './context/DOOHContext';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import DigitalSignage from './components/DigitalSignage';
import './App.css';

function App() {
  return (
    <DOOHProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<Navigation />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/signage" element={<DigitalSignage />} />
          </Routes>
        </div>
      </Router>
    </DOOHProvider>
  );
}

export default App; 