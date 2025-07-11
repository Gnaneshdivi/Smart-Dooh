import React, { useEffect, useState, useRef } from 'react';
import { useDOOH } from '../context/DOOHContext';
import CameraCapture from './CameraCapture';

const DigitalSignage: React.FC = () => {
  const { state, actions } = useDOOH();
  const [screenId] = useState(`dooh_screen_${Date.now()}`);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [screenStats, setScreenStats] = useState({
    uptime: 0,
    framesSent: 0,
    lastAnalysis: null as any,
    adStartTime: Date.now()
  });
  const [adDuration, setAdDuration] = useState(0);
  const startTimeRef = useRef(Date.now());
  const lastAdRef = useRef(state.currentAd);

  // Track ad changes and reset duration
  useEffect(() => {
    if (lastAdRef.current !== state.currentAd) {
      console.log(`🔄 Ad changed from ${lastAdRef.current} to ${state.currentAd}`);
      setScreenStats(prev => ({
        ...prev,
        adStartTime: Date.now()
      }));
      setAdDuration(0);
      lastAdRef.current = state.currentAd;
    }
  }, [state.currentAd]);

  // Update current time and ad duration every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      const now = Date.now();
      setScreenStats(prev => ({
        ...prev,
        uptime: Math.floor((now - startTimeRef.current) / 1000)
      }));
      
      // Calculate ad duration from start time
      const duration = Math.floor((now - screenStats.adStartTime) / 1000);
      setAdDuration(duration);
    }, 1000);

    return () => clearInterval(timer);
  }, [screenStats.adStartTime]);

  // Get cameras on component mount
  useEffect(() => {
    actions.getCameras();
  }, []);

  const handleFrameProcessed = (result: any) => {
    setScreenStats(prev => ({
      ...prev,
      framesSent: result.frame_number || prev.framesSent + 1,
      lastAnalysis: result.result
    }));
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAdImageUrl = (adType: string): string => {
    // Updated mapping to include new video assets
    const adMap: Record<string, string> = {
      'man': '/ads/man.gif',           // single male
      'multiple': '/ads/multiple.mp4', // multiple males
      'male': '/ads/man.gif',
      'female': '/ads/female.mp4',     // single female
      'woman': '/ads/woman.gif',       // legacy single female
      'fashion': '/ads/fashion.mp4',   // multiple females
      'neutral': '/ads/neutral.gif', 
        // no audience / mixed
    };
    return adMap[adType] || adMap['neutral'];
  };

  const getAdDisplayName = (adType: string): string => {
    const nameMap: Record<string, string> = {
      'man': 'Male Targeted',
      'multiple': 'Group of Males',
      'male': 'Male Targeted',
      'female': 'Female Targeted',
      'woman': 'Female Targeted',
      'fashion': 'Group of Females',
      'neutral': 'Neutral Content',
    };
    return nameMap[adType] || 'Unknown';
  };

  return (
    <div className="digital-signage" style={{
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: '#000'
    }}>
      {/* Control Bar - Responsive */}
      <div className="signage-controls" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        background: 'rgba(0,0,0,0.8)',
        padding: window.innerHeight > window.innerWidth ? '8px' : '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        zIndex: 1000,
        fontSize: window.innerHeight > window.innerWidth ? '0.7rem' : '0.8rem'
      }}>
        <div className="signage-info" style={{
          display: 'flex',
          gap: window.innerHeight > window.innerWidth ? '8px' : '15px',
          alignItems: 'center',
          flexWrap: 'wrap',
          color: 'white'
        }}>
          <div className={`status-indicator ${state.connected ? 'connected' : ''}`} style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: state.connected ? '#4fc3f7' : '#ff4444'
          }}></div>
          <span>🆔 {screenId.replace('dooh_screen_', 'SCR_')}</span>
          <span>⏰ {currentTime.toLocaleTimeString()}</span>
          <span>📈 {formatUptime(screenStats.uptime)}</span>
          {screenStats.lastAnalysis && (
            <span>👥 {screenStats.lastAnalysis.people_count}</span>
          )}
        </div>

        {/* Camera Controls - Compact for vertical */}
        <div className="camera-controls" style={{
          background: 'rgba(0,0,0,0.7)',
          padding: window.innerHeight > window.innerWidth ? '4px 8px' : '8px 12px',
          borderRadius: '8px',
          border: '1px solid #4fc3f7',
          minWidth: window.innerHeight > window.innerWidth ? '150px' : '200px'
        }}>
          <div style={{ 
            fontSize: window.innerHeight > window.innerWidth ? '0.6rem' : '0.8rem',
            color: '#4fc3f7', 
            marginBottom: '5px' 
          }}>
            📹 Camera
          </div>
          
          {/* Simplified Camera Selector */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={state.currentCamera || 0}
              onChange={(e) => actions.switchCamera(parseInt(e.target.value))}
              disabled={state.loading}
              style={{
                padding: '2px 4px',
                borderRadius: '4px',
                border: '1px solid #4fc3f7',
                backgroundColor: 'rgba(0,0,0,0.8)',
                color: 'white',
                fontSize: window.innerHeight > window.innerWidth ? '0.6rem' : '0.8rem',
                minWidth: '80px'
              }}
            >
              {state.cameras.length === 0 ? (
                <option value="">No cameras</option>
              ) : (
                state.cameras.map((camera: any) => (
                  <option key={camera.index} value={camera.index}>
                    📹 Cam {camera.index + 1}
                  </option>
                ))
              )}
            </select>
            
            <button
              onClick={actions.getCameras}
              disabled={state.loading}
              style={{
                padding: '2px 4px',
                backgroundColor: '#4fc3f7',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: window.innerHeight > window.innerWidth ? '0.6rem' : '0.8rem'
              }}
              title="Refresh cameras"
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* Full Screen Ad Display - Responsive */}
      <div className="ad-display" style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <div className="ad-media-container" style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Dynamic media element (GIF or MP4) */}
          {(() => {
            const src = getAdImageUrl(state.currentAd);
            const isVideo = src.endsWith('.mp4');
            const isVertical = window.innerHeight > window.innerWidth;
            const mediaWidth = state.currentAd === 'neutral'
              ? (isVertical ? '60%' : '30%')
              : (isVertical ? '90%' : '100%');
            const mediaHeight = state.currentAd === 'neutral'
              ? (isVertical ? '40%' : '50%')
              : (isVertical ? '70%' : '100%');

            if (isVideo) {
              return (
                <video
                  src={src}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="ad-media"
                  style={{
                    width: mediaWidth,
                    height: mediaHeight,
                    objectFit: 'contain',
                    transition: 'width 0.3s ease, height 0.3s ease'
                  }}
                />
              );
            }

            return (
              <img
                src={src}
                alt={getAdDisplayName(state.currentAd)}
                className="ad-media"
                style={{
                  width: mediaWidth,
                  height: mediaHeight,
                  objectFit: 'contain',
                  transition: 'width 0.3s ease, height 0.3s ease'
                }}
              />
            );
          })()}
          
          {/* Fallback placeholder if media files don't exist - Responsive */}
          <div className={`ad-fallback ad-placeholder ad-${state.currentAd}`} style={{ 
            display: 'none',
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            textAlign: 'center',
            padding: '20px'
          }}>
            <div className="ad-content">
              <h1 style={{ 
                fontSize: window.innerHeight > window.innerWidth ? '2rem' : '3rem',
                marginBottom: '20px'
              }}>
                📺 {getAdDisplayName(state.currentAd)}
              </h1>
              <p style={{ fontSize: window.innerHeight > window.innerWidth ? '1rem' : '1.2rem' }}>
                Current Ad: <strong>{state.currentAd.toUpperCase()}</strong>
              </p>
              <p style={{ fontSize: window.innerHeight > window.innerWidth ? '1rem' : '1.2rem' }}>
                Duration: <strong>{formatDuration(adDuration)}</strong>
              </p>
              <div className="ad-details" style={{ marginTop: '20px' }}>
                {screenStats.lastAnalysis && (
                  <>
                    <p>👥 People Detected: {screenStats.lastAnalysis.people_count}</p>
                    <p>🎯 Real-time Targeting Active</p>
                  </>
                )}
              </div>
              <div className="ad-file-info" style={{ 
                marginTop: '20px',
                fontSize: window.innerHeight > window.innerWidth ? '0.8rem' : '1rem'
              }}>
                <p>📁 Expected: <code>{getAdImageUrl(state.currentAd)}</code></p>
                <p>🎨 <span className="placeholder-mode">File not found - using placeholder</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden Camera Processing for DOOH screens */}
        <div style={{ position: 'absolute', top: '-1000px', left: '-1000px' }}>
          <CameraCapture 
            enabled={true} // Always enabled for DOOH screens
            selectedCamera={state.currentCamera?.toString()}
            onFrameProcessed={handleFrameProcessed}
            screenId={screenId}
          />
          
          {/* Debug info - will be hidden off-screen */}
          <div style={{ color: 'white', fontSize: '10px', marginTop: '10px' }}>
            DEBUG: currentCamera={state.currentCamera}, cameras={JSON.stringify(state.cameras?.map(c => ({index: c.index, name: c.name, deviceId: c.deviceId?.substring(0, 20) + '...'})) || [])}
          </div>
        </div>

        {/* Real-time Analytics Overlay - Responsive positioning */}
        {screenStats.lastAnalysis && (
          <div style={{
            position: 'absolute',
            bottom: window.innerHeight > window.innerWidth ? '80px' : '20px',
            left: window.innerHeight > window.innerWidth ? '10px' : '20px',
            background: 'rgba(0,0,0,0.9)',
            padding: window.innerHeight > window.innerWidth ? '10px' : '15px',
            borderRadius: '10px',
            fontSize: window.innerHeight > window.innerWidth ? '0.7rem' : '0.9rem',
            color: 'white',
            backdropFilter: 'blur(10px)',
            maxWidth: window.innerHeight > window.innerWidth ? '280px' : '350px',
            border: '2px solid #4fc3f7'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#4fc3f7' }}>
              🔴 LIVE DETECTION
            </div>
            <div>👥 People: <strong>{screenStats.lastAnalysis.people_count}</strong></div>
            <div>⚡ Processing: <strong>{screenStats.lastAnalysis.processing_time_ms}ms</strong></div>
            <div>🎯 Ad: <strong>{screenStats.lastAnalysis.current_ad.toUpperCase()}</strong></div>
            <div>⏱️ Duration: <strong>{formatDuration(adDuration)}</strong></div>
            <div>📊 Frames: <strong>{screenStats.framesSent}</strong></div>
            
            {screenStats.lastAnalysis.tracked_people && screenStats.lastAnalysis.tracked_people.length > 0 && (
              <div style={{ 
                marginTop: '10px', 
                padding: '8px', 
                backgroundColor: 'rgba(76, 195, 247, 0.1)', 
                borderRadius: '5px' 
              }}>
                <div style={{ fontSize: '0.7rem', color: '#4fc3f7', fontWeight: 'bold' }}>
                  👥 DETECTED:
                </div>
                {screenStats.lastAnalysis.tracked_people.slice(0, window.innerHeight > window.innerWidth ? 2 : 3).map((person: any, index: number) => (
                  <div key={index} style={{ 
                    fontSize: '0.7rem', 
                    marginLeft: '10px', 
                    color: '#fff',
                    marginTop: '4px'
                  }}>
                    {person.gender === 'male' ? '👨' : person.gender === 'female' ? '👩' : '👤'} 
                    <strong>{person.gender}</strong> ~{person.age}y 
                    <span style={{ color: '#ffeb3b' }}>{person.emotion}</span> 
                    ({(person.confidence * 100).toFixed(0)}%)
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* System Status - Responsive positioning */}
        <div style={{
          position: 'absolute',
          top: window.innerHeight > window.innerWidth ? '60px' : '20px',
          right: window.innerHeight > window.innerWidth ? '10px' : '20px',
          background: 'rgba(0,0,0,0.8)',
          padding: window.innerHeight > window.innerWidth ? '6px' : '10px',
          borderRadius: '8px',
          fontSize: window.innerHeight > window.innerWidth ? '0.6rem' : '0.8rem',
          color: 'white',
          textAlign: 'right'
        }}>
          <div>🔋 {state.connected ? 'ONLINE' : 'OFFLINE'}</div>
          <div>⏱️ {formatUptime(screenStats.uptime)}</div>
          {window.innerHeight > window.innerWidth && (
            <div style={{ fontSize: '0.5rem', color: '#4fc3f7', marginTop: '2px' }}>
              📱 VERTICAL
            </div>
          )}
        </div>
      </div>

      {/* Error Display - Responsive */}
      {state.error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(244, 67, 54, 0.9)',
          color: 'white',
          padding: '20px',
          borderRadius: '10px',
          fontSize: window.innerHeight > window.innerWidth ? '0.8rem' : '1rem',
          textAlign: 'center',
          maxWidth: '80%',
          zIndex: 2000
        }}>
          <strong>⚠️ Error:</strong> {state.error}
        </div>
      )}
    </div>
  );
};

export default DigitalSignage; 