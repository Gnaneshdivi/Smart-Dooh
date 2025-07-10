import React, { useEffect, useState } from 'react';
import { useDOOH } from '../context/DOOHContext';
import CameraControls from './CameraControls';
import CameraCapture from './CameraCapture';
import StatsCards from './StatsCards';
import RealtimeChart from './RealtimeChart';

const Dashboard: React.FC = () => {
  const { state, actions } = useDOOH();
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [frontendCameraEnabled, setFrontendCameraEnabled] = useState(true);
  const [lastFrameResult, setLastFrameResult] = useState<any>(null);
  const [screenId] = useState(`dashboard_${Date.now()}`);
  const [connectionStats, setConnectionStats] = useState({
    totalFramesSent: 0,
    avgProcessingTime: 0,
    lastProcessingTime: 0,
    adChanges: 0
  });

  useEffect(() => {
    // Load initial data
    actions.getCameras(); // Re-enable camera detection
    actions.getStats();

    // Set up auto-refresh for stats
    const interval = setInterval(() => {
      actions.getStats();
    }, 5000); // Refresh every 5 seconds

    setRefreshInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  const handleForceAdChange = (adType: string) => {
    actions.forceAdChange(adType);
  };

  const handleFrameProcessed = (result: any) => {
    setLastFrameResult(result);
    
    // Update connection stats
    setConnectionStats(prev => ({
      totalFramesSent: result.frame_number || prev.totalFramesSent + 1,
      avgProcessingTime: result.processing_time_ms 
        ? Math.round((prev.avgProcessingTime + result.processing_time_ms) / 2)
        : prev.avgProcessingTime,
      lastProcessingTime: result.processing_time_ms || prev.lastProcessingTime,
      adChanges: result.result?.current_ad !== state.currentAd 
        ? prev.adChanges + 1 
        : prev.adChanges
    }));
    
    // Refresh stats after frame processing
    actions.getStats();
  };

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">REWARDSY DOOH ANALYTICS</h1>
          <p style={{ color: '#ccc', fontSize: '1.1rem' }}>Real-time Digital Out-of-Home Intelligence Platform</p>
          <div style={{ 
            marginTop: '10px', 
            display: 'flex', 
            gap: '20px', 
            fontSize: '0.9rem',
            color: '#4fc3f7'
          }}>
            <span>📍 Screen ID: {screenId}</span>
            <span>🎯 AI-Powered Targeting</span>
            <span>📡 WebSocket Streaming</span>
          </div>
        </div>
        
        <div className="dashboard-status">
          <div className={`status-indicator ${state.connected ? 'connected' : ''}`}></div>
          <span>{state.connected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
        <StatsCards stats={state.stats} loading={state.loading} />
        
        {/* Real-time Performance Card */}
        <div className="dashboard-card" style={{ minHeight: '120px' }}>
          <h3 className="card-title">
            <i className="fas fa-tachometer-alt"></i>
            Performance
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.9rem' }}>
            <div>
              <div style={{ color: '#4fc3f7', fontWeight: 'bold' }}>{connectionStats.totalFramesSent}</div>
              <div style={{ color: '#ccc', fontSize: '0.8rem' }}>Frames Sent</div>
            </div>
            <div>
              <div style={{ color: '#81c784', fontWeight: 'bold' }}>{connectionStats.lastProcessingTime}ms</div>
              <div style={{ color: '#ccc', fontSize: '0.8rem' }}>Last Processing</div>
            </div>
            <div>
              <div style={{ color: '#ffb74d', fontWeight: 'bold' }}>{connectionStats.avgProcessingTime}ms</div>
              <div style={{ color: '#ccc', fontSize: '0.8rem' }}>Avg Processing</div>
            </div>
            <div>
              <div style={{ color: '#f06292', fontWeight: 'bold' }}>{connectionStats.adChanges}</div>
              <div style={{ color: '#ccc', fontSize: '0.8rem' }}>Ad Changes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        
        {/* Camera Selection & Controls */}
        <div className="dashboard-card">
          <h3 className="card-title">
            <i className="fas fa-video"></i>
            Camera Selection
          </h3>
          <CameraControls
            cameras={state.cameras}
            currentCamera={state.currentCamera}
            cameraRunning={false} // Frontend camera only
            loading={state.loading}
            onSwitchCamera={actions.switchCamera}
            onStartCamera={() => {}} // No backend camera
            onStopCamera={() => {}} // No backend camera  
            onRefreshCameras={actions.getCameras}
          />
          <div style={{ 
            marginTop: '10px', 
            padding: '8px', 
            backgroundColor: 'rgba(76, 195, 247, 0.1)',
            borderRadius: '5px',
            fontSize: '0.85rem'
          }}>
            <strong>📝 Note:</strong> Camera selection affects frontend camera source for analysis. 
            Backend camera is disabled for privacy.
          </div>
        </div>

        {/* Real-time Camera Streaming */}
        <div className="dashboard-card">
          <h3 className="card-title">
            <i className="fas fa-camera"></i>
            Real-time Camera Analysis
          </h3>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={frontendCameraEnabled}
                onChange={(e) => setFrontendCameraEnabled(e.target.checked)}
                style={{ transform: 'scale(1.2)' }}
              />
              <span style={{ fontWeight: 'bold' }}>Enable Real-time Processing</span>
            </label>
            <p style={{ color: '#ccc', fontSize: '0.9rem', marginTop: '5px' }}>
              {frontendCameraEnabled ? 
                '✅ Streaming 1 frame/second to AI backend for analysis' : 
                '⏸️ Camera streaming disabled'
              }
            </p>
          </div>
          
          {frontendCameraEnabled ? (
            <CameraCapture 
              enabled={frontendCameraEnabled}
              selectedCamera={state.currentCamera?.toString()}
              onFrameProcessed={(result: {result: any, processing_time_ms: number, frame_number: number}) => {
                setLastFrameResult(result.result);
                setConnectionStats(prev => ({
                  ...prev,
                  totalFramesSent: prev.totalFramesSent + 1,
                  lastProcessingTime: result.processing_time_ms,
                  avgProcessingTime: (prev.avgProcessingTime + result.processing_time_ms) / 2
                }));
              }}
              screenId={screenId}
            />
          ) : (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '10px',
              border: '2px dashed rgba(255, 255, 255, 0.2)'
            }}>
              <i className="fas fa-camera-slash" style={{ fontSize: '2rem', color: '#666', marginBottom: '10px' }}></i>
              <p style={{ color: '#888', margin: 0 }}>Camera analysis disabled</p>
              <button 
                onClick={() => setFrontendCameraEnabled(true)}
                style={{
                  marginTop: '10px',
                  padding: '8px 16px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Enable Camera
              </button>
            </div>
          )}
          
          {/* Connection Statistics */}
          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '5px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#4CAF50' }}>
              <i className="fas fa-chart-line"></i> Connection Stats
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem' }}>
              <div>
                <strong>📊 Frames Sent:</strong> {connectionStats.totalFramesSent}
              </div>
              <div>
                <strong>⚡ Last Processing:</strong> {connectionStats.lastProcessingTime.toFixed(1)}ms
              </div>
              <div>
                <strong>📈 Avg Processing:</strong> {connectionStats.avgProcessingTime.toFixed(1)}ms  
              </div>
              <div>
                <strong>🎯 Current Ad:</strong> {lastFrameResult?.current_ad || state.currentAd}
              </div>
            </div>
          </div>

          {/* Toggle Camera Button */}
          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <button
              onClick={() => setFrontendCameraEnabled(!frontendCameraEnabled)}
              style={{
                padding: '10px 20px',
                backgroundColor: frontendCameraEnabled ? '#f44336' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto'
              }}
            >
              <i className={`fas ${frontendCameraEnabled ? 'fa-stop' : 'fa-play'}`}></i>
              {frontendCameraEnabled ? 'Stop Camera Analysis' : 'Start Camera Analysis'}
            </button>
          </div>
        </div>

        {/* Current Ad Display */}
        <div className="dashboard-card">
          <h3 className="card-title">
            <i className="fas fa-bullhorn"></i>
            Current Advertisement
          </h3>
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ 
                fontSize: '1.8rem', 
                fontWeight: 'bold', 
                color: '#4fc3f7',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                {state.currentAd === 'man' ? '👨 MALE TARGETED' : 
                 state.currentAd === 'woman' ? '👩 FEMALE TARGETED' : 
                 '⚪ NEUTRAL CONTENT'}
              </div>
              <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                Active for {Math.floor(state.adDuration / 60)}m {Math.floor(state.adDuration % 60)}s
              </div>
              {lastFrameResult && (
                <div style={{ 
                  marginTop: '10px', 
                  padding: '8px', 
                  backgroundColor: 'rgba(76, 195, 247, 0.1)',
                  borderRadius: '5px',
                  fontSize: '0.85rem'
                }}>
                  Last Analysis: {lastFrameResult.result?.people_count || 0} people • 
                  Processed in {lastFrameResult.processing_time_ms || 0}ms
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="control-button"
                onClick={() => handleForceAdChange('man')}
                disabled={state.loading}
                style={{ 
                  backgroundColor: state.currentAd === 'man' ? '#1976d2' : '#4fc3f7',
                  opacity: state.currentAd === 'man' ? 1 : 0.8
                }}
              >
                👨 Male Content
              </button>
              <button
                className="control-button"
                onClick={() => handleForceAdChange('woman')}
                disabled={state.loading}
                style={{ 
                  backgroundColor: state.currentAd === 'woman' ? '#c2185b' : '#e91e63',
                  opacity: state.currentAd === 'woman' ? 1 : 0.8
                }}
              >
                👩 Female Content
              </button>
              <button
                className="control-button"
                onClick={() => handleForceAdChange('neutral')}
                disabled={state.loading}
                style={{ 
                  backgroundColor: state.currentAd === 'neutral' ? '#424242' : '#666',
                  opacity: state.currentAd === 'neutral' ? 1 : 0.8
                }}
              >
                ⚪ Neutral Content
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Detection Results */}
        <div className="dashboard-card">
          <h3 className="card-title">
            <i className="fas fa-users"></i>
            Live Detection Results
          </h3>
          {state.frameData ? (
            <div>
              <div style={{ 
                fontSize: '2.5rem', 
                fontWeight: 'bold', 
                color: '#4fc3f7',
                textAlign: 'center',
                marginBottom: '10px'
              }}>
                {state.frameData.people_count}
              </div>
              <div style={{ 
                textAlign: 'center', 
                color: '#ccc', 
                fontSize: '1.1rem',
                marginBottom: '15px'
              }}>
                People Currently Detected
              </div>
              
              {state.frameData.tracked_people.length > 0 && (
                <div style={{ marginTop: '15px' }}>
                  <h4 style={{ color: '#4fc3f7', marginBottom: '10px' }}>Detected Individuals:</h4>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {state.frameData.tracked_people.map((person: any, index: number) => (
                      <div key={index} style={{
                        padding: '8px',
                        margin: '5px 0',
                        backgroundColor: 'rgba(76, 195, 247, 0.1)',
                        borderRadius: '5px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.9rem'
                      }}>
                        <div>
                          <span style={{ fontWeight: 'bold' }}>
                            {person.gender === 'male' ? '👨' : person.gender === 'female' ? '👩' : '👤'} 
                            {person.gender.charAt(0).toUpperCase() + person.gender.slice(1)}
                          </span>
                          <span style={{ color: '#ccc', marginLeft: '10px' }}>
                            ~{person.age}y • {person.emotion}
                          </span>
                        </div>
                        <div style={{ 
                          color: person.confidence > 0.8 ? '#81c784' : 
                                person.confidence > 0.6 ? '#ffb74d' : '#f06292',
                          fontWeight: 'bold'
                        }}>
                          {(person.confidence * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
              <i className="fas fa-camera" style={{ fontSize: '2rem', marginBottom: '10px' }}></i>
              <div>No live data available</div>
              <div style={{ fontSize: '0.8rem', marginTop: '5px' }}>
                Enable camera to start real-time analysis
              </div>
            </div>
          )}
        </div>

        {/* System Information */}
        <div className="dashboard-card">
          <h3 className="card-title">
            <i className="fas fa-info-circle"></i>
            System Information
          </h3>
          <div style={{ display: 'grid', gap: '12px', fontSize: '0.9rem' }}>
            <div style={{ 
              padding: '10px', 
              backgroundColor: 'rgba(76, 195, 247, 0.1)',
              borderRadius: '5px'
            }}>
              <strong>🎯 AI Analysis Features:</strong>
              <div style={{ marginTop: '5px', color: '#ccc', fontSize: '0.8rem' }}>
                • Advanced gender detection (5+ facial features)
                <br />
                • Age estimation (texture & structure analysis)
                <br />
                • Emotion recognition (facial expression mapping)
                <br />
                • Real-time confidence scoring
              </div>
            </div>
            
            <div style={{ 
              padding: '10px', 
              backgroundColor: 'rgba(129, 199, 132, 0.1)',
              borderRadius: '5px'
            }}>
              <strong>📡 Communication Protocol:</strong>
              <div style={{ marginTop: '5px', color: '#ccc', fontSize: '0.8rem' }}>
                • WebSocket real-time streaming
                <br />
                • 1 frame/second processing rate
                <br />
                • Ad targeting every 5 frames
                <br />
                • Auto-reconnection on disconnect
              </div>
            </div>
            
            <div style={{ 
              padding: '10px', 
              backgroundColor: 'rgba(255, 183, 77, 0.1)',
              borderRadius: '5px'
            }}>
              <strong>🔒 Privacy & Performance:</strong>
              <div style={{ marginTop: '5px', color: '#ccc', fontSize: '0.8rem' }}>
                • Local camera processing only
                <br />
                • No data storage on frames
                <br />
                • Analytics logging for insights
                <br />
                • Production-ready architecture
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Chart */}
        <div className="dashboard-card" style={{ gridColumn: 'span 2' }}>
          <h3 className="card-title">
            <i className="fas fa-chart-line"></i>
            Real-time Analytics
          </h3>
          <RealtimeChart stats={state.stats} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 