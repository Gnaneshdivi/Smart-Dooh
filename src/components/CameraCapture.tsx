import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDOOH } from '../context/DOOHContext';

interface CameraCaptureProps {
  enabled: boolean;
  onFrameProcessed?: (result: any) => void;
  screenId?: string;
  selectedCamera?: string; // Add camera device ID support
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ 
  enabled, 
  onFrameProcessed,
  screenId = 'default_screen',
  selectedCamera // Add selectedCamera prop
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [lastResult, setLastResult] = useState<any>(null);
  
  const { state } = useDOOH();

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    // Prevent multiple connections
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('🔌 WebSocket already connected, skipping...');
      return;
    }
    
    try {
      const wsUrl = import.meta.env.VITE_WS_URL || `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}/ws`;
      
      console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connected for frame streaming');
        setWsConnected(true);
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', message.type);
          
          switch (message.type) {
            case 'connection':
              console.log('🎉 Connected to DOOH Analytics:', message.data.message);
              break;
              
            case 'frame_processed':
              const result = message.data.result;
              const procTime = message.data.processing_time_ms;
              
              setProcessingTime(procTime);
              setLastResult(result);
              
              console.log(`✅ Frame #${message.data.frame_number} processed in ${procTime}ms:`, {
                people: result.people_count,
                ad: result.current_ad
              });
              
              if (onFrameProcessed) {
                onFrameProcessed({
                  result,
                  processing_time_ms: procTime,
                  frame_number: message.data.frame_number
                });
              }
              break;
              
            case 'ad_change':
              console.log('🎯 Ad changed:', message.data);
              break;
              
            case 'error':
              console.error('❌ WebSocket error:', message.data.error);
              setError(`Processing error: ${message.data.error}`);
              break;
              
            case 'heartbeat_ack':
              console.log('💓 Heartbeat acknowledged');
              break;
              
            default:
              console.log('📥 Unknown message type:', message.type);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setWsConnected(false);
        wsRef.current = null;
        
        // Only auto-reconnect if enabled and not a manual close
        if (enabled && event.code !== 1000) {
          console.log('🔄 Auto-reconnecting in 3 seconds...');
          setTimeout(() => {
            if (enabled) { // Check again after timeout
              connectWebSocket();
            }
          }, 3000);
        }
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('WebSocket connection failed');
        setWsConnected(false);
      };
      
      wsRef.current = ws;
      
    } catch (e) {
      console.error('Failed to create WebSocket connection:', e);
      setError('Failed to establish WebSocket connection');
    }
  }, [enabled]); // Only depend on enabled

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    if (wsRef.current) {
      console.log('🔌 Closing WebSocket connection');
      wsRef.current.close(1000, 'Component disabled');
      wsRef.current = null;
      setWsConnected(false);
    }
  }, []);

  // Frame capture and WebSocket streaming
  const captureAndSendFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isStreaming || !wsConnected || !wsRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    try {
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64 with high quality
      const frameData = canvas.toDataURL('image/jpeg', 0.8);

      // Send frame via WebSocket
      const frameMessage = {
        type: 'frame',
        data: {
          frame_data: frameData,
          timestamp: new Date().toISOString(),
          camera_id: 'frontend_camera',
          screen_id: screenId
        }
      };

      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(frameMessage));
        setFrameCount(prev => prev + 1);
        
        console.log(`📤 Frame #${frameCount + 1} sent to backend (${canvas.width}x${canvas.height})`);
      } else {
        console.warn('⚠️ WebSocket not ready, skipping frame');
      }

    } catch (err) {
      console.error('❌ Error capturing/sending frame:', err);
      setError('Frame capture failed');
    }
  }, [isStreaming, wsConnected, frameCount, screenId]);

  // Send heartbeat every 30 seconds
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'heartbeat',
        data: { timestamp: new Date().toISOString() }
      }));
    }
  }, []);

  // Stop current camera stream
  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const currentStream = videoRef.current.srcObject as MediaStream;
      currentStream.getTracks().forEach(track => {
        track.stop();
        console.log('🔴 Stopped camera track');
      });
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  // Start camera with specified device
  const startCamera = useCallback(async (cameraDevice?: string) => {
    try {
      setError(null);
      const deviceToUse = cameraDevice || selectedCamera;
      console.log('🔧 DEBUG: Starting camera with device:', deviceToUse);
      console.log('🔧 DEBUG: Available cameras:', state.cameras);
      console.log('🔧 DEBUG: Current state.currentCamera:', state.currentCamera);
      
      // Stop existing camera first
      stopCamera();
      
      // Wait a bit for camera to fully release
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Build video constraints with camera selection
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 }
      };
      
      // Add device ID if specific camera selected
      if (deviceToUse && deviceToUse !== 'default' && deviceToUse !== '0') {
        // Try to get the actual device ID from the camera index
        const cameraIndex = parseInt(deviceToUse);
        console.log('🔧 DEBUG: Parsed camera index:', cameraIndex);
        
        if (!isNaN(cameraIndex) && state.cameras && state.cameras[cameraIndex]) {
          const selectedCameraInfo = state.cameras[cameraIndex];
          console.log('🔧 DEBUG: Selected camera info:', selectedCameraInfo);
          
          if (selectedCameraInfo.deviceId && selectedCameraInfo.deviceId.length > 5) {
            videoConstraints.deviceId = { exact: selectedCameraInfo.deviceId };
            console.log('🎯 Using specific camera device ID:', selectedCameraInfo.deviceId);
          } else {
            console.warn('⚠️ No valid deviceId found for camera index:', cameraIndex, 'deviceId:', selectedCameraInfo.deviceId);
            // Try using facingMode based on camera index
            if (cameraIndex === 0) {
              videoConstraints.facingMode = 'user';
              console.log('🎯 Using front camera (facingMode: user)');
            } else {
              videoConstraints.facingMode = 'environment';
              console.log('🎯 Using back camera (facingMode: environment)');
            }
          }
        } else if (typeof deviceToUse === 'string' && deviceToUse.length > 10) {
          // Assume it's already a device ID string
          videoConstraints.deviceId = { exact: deviceToUse };
          console.log('🎯 Using direct device ID string:', deviceToUse);
        } else {
          console.warn('⚠️ Invalid camera index or no cameras available:', { cameraIndex, camerasLength: state.cameras?.length });
          // Fallback to different facingMode based on index
          if (cameraIndex === 1) {
            videoConstraints.facingMode = 'environment';
            console.log('🎯 Fallback: Using environment camera for index 1');
          } else {
            videoConstraints.facingMode = 'user';
            console.log('🎯 Fallback: Using user camera for index 0');
          }
        }
      } else {
        // Default camera (index 0)
        if (state.cameras && state.cameras[0] && state.cameras[0].deviceId && state.cameras[0].deviceId.length > 5) {
          videoConstraints.deviceId = { exact: state.cameras[0].deviceId };
          console.log('🎯 Using default camera with device ID:', state.cameras[0].deviceId);
        } else {
          videoConstraints.facingMode = 'user';
          console.log('🎯 Using default user-facing camera (index 0 or default)');
        }
      }
      
      console.log('🎥 Final camera constraints:', JSON.stringify(videoConstraints, null, 2));
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints
      });

      // Log the actual track being used
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        console.log('✅ Camera started with actual settings:', {
          deviceId: settings.deviceId,
          label: videoTrack.label,
          width: settings.width,
          height: settings.height
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
        console.log('✅ Camera video element updated successfully');
        
        // Small delay to ensure camera is fully ready before resuming frame streaming
        setTimeout(() => {
          console.log('🎬 Camera ready - frame streaming should resume automatically');
        }, 500);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown camera error';
      setError(`Camera access failed: ${errorMessage}`);
      console.error('❌ Camera access error:', err);
      setIsStreaming(false);
    }
  }, [selectedCamera, screenId, state.cameras, stopCamera]);

  // Log when selectedCamera prop changes
  useEffect(() => {
    console.log('🔧 DEBUG: CameraCapture selectedCamera prop changed to:', selectedCamera);
    console.log('🔧 DEBUG: CameraCapture enabled:', enabled);
    console.log('🔧 DEBUG: CameraCapture state.cameras:', state.cameras);
  }, [selectedCamera, enabled, state.cameras]);

  // Combined effect: Handle enabled state and camera switching
  useEffect(() => {
    if (enabled) {
      console.log('🟢 CameraCapture enabled/camera changed for screen:', screenId, 'Camera:', selectedCamera);
      
      // Start WebSocket
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        connectWebSocket();
      }
      
      // Start Camera (this will handle camera switching automatically)
      startCamera();
      
    } else {
      console.log('🔴 CameraCapture disabled');
      
      // Stop camera
      stopCamera();
      
      // Stop intervals
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Disconnect WebSocket
      disconnectWebSocket();
      setFrameCount(0);
      setLastResult(null);
    }

    return () => {
      // Cleanup function
      stopCamera();
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      disconnectWebSocket();
    };
  }, [enabled, screenId, selectedCamera]); // Restart when enabled, screenId, or selectedCamera changes

  // Effect: Start frame streaming when both camera and WebSocket are ready
  useEffect(() => {
    if (isStreaming && wsConnected && enabled) {
      console.log('🎬 Starting frame streaming (1 frame/second) - isStreaming:', isStreaming, 'wsConnected:', wsConnected);
      
      // Clear any existing interval first
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Send frames every 1 second as specified
      intervalRef.current = setInterval(captureAndSendFrame, 1000);
      
      // Send heartbeat every 30 seconds
      const heartbeatInterval = setInterval(sendHeartbeat, 30000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        clearInterval(heartbeatInterval);
      };
    } else {
      console.log('🔴 Frame streaming stopped - isStreaming:', isStreaming, 'wsConnected:', wsConnected, 'enabled:', enabled);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [isStreaming, wsConnected, enabled, captureAndSendFrame, sendHeartbeat]);

  return (
    <div className="camera-capture">
      <div className="camera-container" style={{ position: 'relative' }}>
        <video
          ref={videoRef}
          style={{
            width: '100%',
            maxWidth: '320px',
            height: 'auto',
            borderRadius: '8px',
            backgroundColor: '#000',
            border: wsConnected ? '2px solid #4fc3f7' : '2px solid #666'
          }}
          playsInline
          muted
        />
        
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
        
        {/* Status Overlay */}
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '0.8rem',
          fontFamily: 'monospace'
        }}>
          {isStreaming && wsConnected ? (
            <div>
              <span style={{ color: '#4fc3f7' }}>
                🔴 LIVE • {frameCount} frames
              </span>
              <br />
              <span style={{ color: '#81c784' }}>
                📡 WebSocket Connected
              </span>
              {processingTime > 0 && (
                <>
                  <br />
                  <span style={{ color: '#ffb74d' }}>
                    ⚡ {processingTime}ms processing
                  </span>
                </>
              )}
            </div>
          ) : isStreaming ? (
            <span style={{ color: '#ff9800' }}>
              📹 Camera ON • WebSocket connecting...
            </span>
          ) : wsConnected ? (
            <span style={{ color: '#ff9800' }}>
              📡 Connected • Camera starting...
            </span>
          ) : (
            <span style={{ color: '#666' }}>
              📷 System OFF
            </span>
          )}
        </div>

        {/* Screen ID Display */}
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(76, 195, 247, 0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.7rem',
          fontWeight: 'bold'
        }}>
          Screen: {screenId}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          marginTop: '10px',
          padding: '12px',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          border: '1px solid #f44336',
          borderRadius: '6px',
          color: '#f44336',
          fontSize: '0.9rem'
        }}>
          <strong>⚠️ Error:</strong> {error}
        </div>
      )}

      {/* Connection Status */}
      <div style={{
        marginTop: '10px',
        padding: '12px',
        backgroundColor: 'rgba(76, 195, 247, 0.1)',
        border: `1px solid ${wsConnected ? '#4fc3f7' : '#666'}`,
        borderRadius: '6px',
        fontSize: '0.85rem'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '8px',
          alignItems: 'center'
        }}>
          <div>
            <strong>📹 Camera:</strong> {isStreaming ? '✅ Active' : '❌ Inactive'}
          </div>
          <div>
            <strong>📡 WebSocket:</strong> {wsConnected ? '✅ Connected' : '❌ Disconnected'}
          </div>
          <div>
            <strong>📊 Frames Sent:</strong> {frameCount}
          </div>
          <div>
            <strong>⚡ Processing:</strong> {processingTime > 0 ? `${processingTime}ms` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Last Result Display */}
      {lastResult && (
        <div style={{
          marginTop: '10px',
          padding: '12px',
          backgroundColor: 'rgba(129, 199, 132, 0.1)',
          border: '1px solid #81c784',
          borderRadius: '6px',
          fontSize: '0.85rem'
        }}>
          <strong>📈 Last Analysis:</strong>
          <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <div>👥 People: {lastResult.people_count}</div>
            <div>🎯 Current Ad: {lastResult.current_ad}</div>
            <div>⏱️ Processed: {lastResult.processing_time_ms}ms</div>
            <div>📝 Frame: #{lastResult.frame_number}</div>
          </div>
          
          {lastResult.tracked_people && lastResult.tracked_people.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <strong>Detected People:</strong>
              {lastResult.tracked_people.map((person: any, index: number) => (
                <div key={index} style={{ 
                  fontSize: '0.75rem', 
                  color: '#666',
                  marginLeft: '10px'
                }}>
                  {index + 1}. {person.gender} (~{person.age}y) {person.emotion} ({(person.confidence * 100).toFixed(1)}%)
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* System Info */}
      <div style={{
        marginTop: '10px',
        padding: '8px',
        backgroundColor: 'rgba(158, 158, 158, 0.1)',
        borderRadius: '4px',
        fontSize: '0.75rem',
        color: '#666'
      }}>
        <strong>Real-time DOOH System</strong>
        <br />
        • Sends 1 frame/second via WebSocket
        <br />
        • AI analysis: Gender, Age, Emotion detection
        <br />
        • Immediate ad targeting on detection
        <br />
        • Screen ID: {screenId}
      </div>
    </div>
  );
};

export default CameraCapture; 