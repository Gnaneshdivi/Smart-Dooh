import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import axios from 'axios';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

// Types
interface CameraInfo {
  index: number;
  deviceId?: string;
  name: string;
  resolution: string;
  fps: number;
}

interface PersonData {
  id: string;
  gender: string;
  age: number;
  emotion: string;
  confidence: number;
  bbox: number[];
}

interface FrameData {
  timestamp: string;
  people_count: number;
  tracked_people: PersonData[];
  current_ad: string;
  ad_duration: number;
}

interface SystemStats {
  total_frames: number;
  people_detected: number;
  detection_rate: number;
  gender_distribution: Record<string, number>;
  emotion_distribution: Record<string, number>;
  age_range: {
    min: number;
    max: number;
    avg: number;
  };
  timeline: Array<{
    timestamp: string;
    people_count: number;
    dominant_emotion: string;
    dominant_gender: string;
    current_ad: string;
  }>;
}

interface DOOHState {
  connected: boolean;
  cameras: CameraInfo[];
  currentCamera: number;
  cameraRunning: boolean;
  currentAd: string;
  adDuration: number;
  frameData: FrameData | null;
  stats: SystemStats | null;
  loading: boolean;
  error: string | null;
}

type DOOHAction =
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_CAMERAS'; payload: CameraInfo[] }
  | { type: 'SET_CURRENT_CAMERA'; payload: number }
  | { type: 'SET_CAMERA_RUNNING'; payload: boolean }
  | { type: 'SET_CURRENT_AD'; payload: string }
  | { type: 'SET_AD_DURATION'; payload: number }
  | { type: 'SET_FRAME_DATA'; payload: FrameData }
  | { type: 'SET_STATS'; payload: SystemStats }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const initialState: DOOHState = {
  connected: false,
  cameras: [],
  currentCamera: 0,
  cameraRunning: false,
  currentAd: 'neutral',
  adDuration: 0,
  frameData: null,
  stats: null,
  loading: false,
  error: null,
};

function doohReducer(state: DOOHState, action: DOOHAction): DOOHState {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };
    case 'SET_CAMERAS':
      return { ...state, cameras: action.payload };
    case 'SET_CURRENT_CAMERA':
      return { ...state, currentCamera: action.payload };
    case 'SET_CAMERA_RUNNING':
      return { ...state, cameraRunning: action.payload };
    case 'SET_CURRENT_AD':
      return { ...state, currentAd: action.payload };
    case 'SET_AD_DURATION':
      return { ...state, adDuration: action.payload };
    case 'SET_FRAME_DATA':
      return { ...state, frameData: action.payload };
    case 'SET_STATS':
      return { ...state, stats: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

interface DOOHContextType {
  state: DOOHState;
  actions: {
    getCameras: () => Promise<void>;
    switchCamera: (index: number) => Promise<void>;
    startCamera: () => Promise<void>;
    stopCamera: () => Promise<void>;
    forceAdChange: (adType: string) => Promise<void>;
    getStats: () => Promise<void>;
  };
}

const DOOHContext = createContext<DOOHContextType | undefined>(undefined);

interface DOOHProviderProps {
  children: ReactNode;
}

export function DOOHProvider({ children }: DOOHProviderProps) {
  const [state, dispatch] = useReducer(doohReducer, initialState);
  const [websocket, setWebsocket] = React.useState<WebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('Connected to DOOH WebSocket');
      dispatch({ type: 'SET_CONNECTED', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
    };

    ws.onclose = () => {
      console.log('Disconnected from DOOH WebSocket');
      dispatch({ type: 'SET_CONNECTED', payload: false });
    };

    ws.onerror = (error: Event) => {
      console.error('WebSocket connection error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to connect to server' });
    };

    // Handle incoming messages
    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);
        
        switch (data.type) {
          case 'frame_data':
            dispatch({ type: 'SET_FRAME_DATA', payload: data.data });
            dispatch({ type: 'SET_CURRENT_AD', payload: data.data.current_ad });
            dispatch({ type: 'SET_AD_DURATION', payload: data.data.ad_duration });
            break;
          case 'ad_change':
            dispatch({ type: 'SET_CURRENT_AD', payload: data.data.ad });
            break;
          case 'connection':
            dispatch({ type: 'SET_CURRENT_AD', payload: data.data.current_ad });
            dispatch({ type: 'SET_CAMERA_RUNNING', payload: data.data.camera_running });
            break;
          case 'heartbeat':
            // Keep connection alive
            break;
          default:
            console.log('Unhandled message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    setWebsocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  // Actions
  const getCameras = async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      console.log('🔧 DEBUG: Starting camera enumeration...');
      
      // First, request camera permissions to get device labels and IDs
      try {
        console.log('🔧 DEBUG: Requesting camera permissions...');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log('🔧 DEBUG: Camera permissions granted');
        
        // Stop the temporary stream immediately
        stream.getTracks().forEach(track => track.stop());
        console.log('🔧 DEBUG: Temporary permission stream stopped');
      } catch (permError) {
        console.warn('⚠️ Camera permission denied or not available:', permError);
      }
      
      // Get real camera devices from the browser
      const devices = await navigator.mediaDevices.enumerateDevices();
      console.log('🔧 DEBUG: All media devices:', devices);
      
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      console.log('🔧 DEBUG: Video input devices:', videoDevices);
      
      const cameras = videoDevices.map((device, index) => ({
        index: index,
        deviceId: device.deviceId,
        name: device.label || `Camera ${index + 1}`,
        resolution: '640x480', // Default resolution
        fps: 30
      }));
      
      console.log('🎥 Detected cameras with device IDs:', cameras);
      
      // Validate that we have at least one camera with a device ID
      const camerasWithDeviceId = cameras.filter(cam => cam.deviceId && cam.deviceId !== '');
      if (camerasWithDeviceId.length === 0) {
        console.warn('⚠️ No cameras found with valid device IDs');
      }
      
      // Update local state with real cameras
      dispatch({ type: 'SET_CAMERAS', payload: cameras });
      dispatch({ type: 'SET_CURRENT_CAMERA', payload: 0 });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      console.log('🔧 DEBUG: Updated state with cameras, currentCamera set to 0');
      
      // Still call backend for consistency (but ignore camera list)
      try {
        const response = await axios.get(`${API_BASE_URL}/api/cameras`);
        console.log('📡 Backend camera response:', response.data);
      } catch (backendError) {
        console.warn('Backend camera call failed, but frontend detection succeeded');
      }
      
    } catch (error) {
      console.error('Error getting cameras:', error);
      
      // Fallback: try backend if browser detection fails
      try {
        const response = await axios.get(`${API_BASE_URL}/api/cameras`);
        dispatch({ type: 'SET_CAMERAS', payload: response.data.cameras });
        dispatch({ type: 'SET_CURRENT_CAMERA', payload: response.data.current_camera });
        dispatch({ type: 'SET_ERROR', payload: null });
        console.log('🔧 DEBUG: Using backend fallback cameras');
      } catch (fallbackError) {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to get cameras: No cameras detected' });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const switchCamera = async (index: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      console.log('🔧 DEBUG: Switching to camera index:', index);
      console.log('🔧 DEBUG: Available cameras before switch:', state.cameras);
      
      await axios.post(`${API_BASE_URL}/api/cameras/${index}/switch`);
      dispatch({ type: 'SET_CURRENT_CAMERA', payload: index });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      console.log('🔧 DEBUG: Camera switched successfully to index:', index);
      console.log('🔧 DEBUG: New currentCamera value:', index);
    } catch (error) {
      console.error('Error switching camera:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to switch camera' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const startCamera = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/camera/start`);
      dispatch({ type: 'SET_CAMERA_RUNNING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      console.error('Error starting camera:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to start camera' });
    }
  };

  const stopCamera = async () => {
    try {
      await axios.post(`${API_BASE_URL}/api/camera/stop`);
      dispatch({ type: 'SET_CAMERA_RUNNING', payload: false });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      console.error('Error stopping camera:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to stop camera' });
    }
  };

  const forceAdChange = async (adType: string) => {
    try {
      await axios.post(`${API_BASE_URL}/api/ads/${adType}/force`);
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      console.error('Error forcing ad change:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to change ad' });
    }
  };

  const getStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stats`);
      console.log('Received stats response:', response.data);
      
      // Extract stats from nested response structure
      const statsData = response.data.stats || response.data;
      dispatch({ type: 'SET_STATS', payload: statsData });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (error) {
      console.error('Error getting stats:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to get stats' });
    }
  };

  const contextValue: DOOHContextType = {
    state,
    actions: {
      getCameras,
      switchCamera,
      startCamera,
      stopCamera,
      forceAdChange,
      getStats,
    },
  };

  return (
    <DOOHContext.Provider value={contextValue}>
      {children}
    </DOOHContext.Provider>
  );
}

export function useDOOH() {
  const context = useContext(DOOHContext);
  if (context === undefined) {
    throw new Error('useDOOH must be used within a DOOHProvider');
  }
  return context;
} 