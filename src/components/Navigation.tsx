import React from 'react';
import { Link } from 'react-router-dom';

const Navigation: React.FC = () => {
  return (
    <div className="navigation">
      <h1 className="nav-brand">REWARDSY</h1>
      <p className="nav-tagline">Digital Out-of-Home Analytics Platform</p>
      
      <div className="nav-buttons">
        <Link to="/dashboard" className="nav-button">
          <i className="fas fa-chart-bar"></i>
          <span>Analytics Dashboard</span>
        </Link>
        
        <Link to="/signage" className="nav-button">
          <i className="fas fa-tv"></i>
          <span>Digital Signage</span>
        </Link>
      </div>
    </div>
  );
};

export default Navigation; 