import React, { useState, useEffect } from 'react';
import { useDOOH } from '../context/DOOHContext';
import StatsCards from './StatsCards';
import RealtimeChart from './RealtimeChart';
import CameraControls from './CameraControls';

const Dashboard: React.FC = () => {
  const { state, actions } = useDOOH();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    // Fetch initial stats
    fetchStats();
    
    // Set up interval to refresh stats
    const interval = setInterval(fetchStats, 5000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/stats');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>🎯 DOOH Analytics Dashboard</h1>
        <div className="system-status">
          <div className={`status-indicator ${state.connected ? 'connected' : ''}`}></div>
          <span>{state.connected ? 'System Online' : 'System Offline'}</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <h2>📊 System Statistics</h2>
          <StatsCards stats={stats} loading={state.loading} />
        </div>

        <div className="dashboard-section">
          <h2>📈 Real-time Analytics</h2>
          <RealtimeChart stats={stats} />
        </div>

        <div className="dashboard-section">
          <h2>📹 Camera Management</h2>
          <CameraControls 
            cameras={state.cameras}
            currentCamera={state.currentCamera}
            cameraRunning={false}
            loading={state.loading}
            onSwitchCamera={actions.switchCamera}
            onStartCamera={() => {}}
            onStopCamera={() => {}}
            onRefreshCameras={actions.getCameras}
          />
        </div>
      </div>

      {state.error && (
        <div className="error-banner">
          <strong>Error:</strong> {state.error}
        </div>
      )}
    </div>
  );
};

export default Dashboard; 