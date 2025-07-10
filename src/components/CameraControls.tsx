import React from 'react';

interface CameraInfo {
  index: number;
  name: string;
  resolution: string;
  fps: number;
}

interface CameraControlsProps {
  cameras: CameraInfo[];
  currentCamera: number;
  cameraRunning: boolean;
  loading: boolean;
  onSwitchCamera: (index: number) => void;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onRefreshCameras: () => void;
}

const CameraControls: React.FC<CameraControlsProps> = ({
  cameras,
  currentCamera,
  cameraRunning,
  loading,
  onSwitchCamera,
  onStartCamera,
  onStopCamera,
  onRefreshCameras,
}) => {
  const handleCameraChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndex = parseInt(event.target.value);
    if (!isNaN(selectedIndex)) {
      onSwitchCamera(selectedIndex);
    }
  };

  return (
    <div>
      {/* Camera Selection */}
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="camera-select" style={{ display: 'block', marginBottom: '5px', color: '#4fc3f7' }}>
          Select Camera:
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            id="camera-select"
            className="camera-select"
            value={currentCamera}
            onChange={handleCameraChange}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {cameras.length === 0 ? (
              <option value="">No cameras found</option>
            ) : (
              cameras.map((camera) => (
                <option key={camera.index} value={camera.index}>
                  {camera.name} ({camera.resolution} @ {camera.fps}fps)
                </option>
              ))
            )}
          </select>
          <button
            className="control-button"
            onClick={onRefreshCameras}
            disabled={loading}
            title="Refresh camera list"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Camera Status */}
      <div style={{ marginBottom: '15px' }}>
        <div style={{ color: '#ccc', marginBottom: '5px' }}>
          Status: <span style={{ color: cameraRunning ? '#44ff44' : '#ff4444' }}>
            {cameraRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
        <div style={{ color: '#ccc' }}>
          Current Camera: {currentCamera}
        </div>
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          className="control-button"
          onClick={onStartCamera}
          disabled={loading || cameraRunning}
          style={{ 
            backgroundColor: cameraRunning ? '#666' : '#4fc3f7',
            cursor: cameraRunning ? 'not-allowed' : 'pointer'
          }}
        >
          Start Camera
        </button>
        <button
          className="control-button"
          onClick={onStopCamera}
          disabled={loading || !cameraRunning}
          style={{ 
            backgroundColor: !cameraRunning ? '#666' : '#ff4444',
            cursor: !cameraRunning ? 'not-allowed' : 'pointer'
          }}
        >
          Stop Camera
        </button>
      </div>

      {/* Camera Grid Display */}
      {cameras.length > 0 && (
        <div className="camera-grid">
          {cameras.map((camera) => (
            <div
              key={camera.index}
              className={`camera-card ${camera.index === currentCamera ? 'active' : ''}`}
              onClick={() => onSwitchCamera(camera.index)}
            >
              <div className="camera-name">{camera.name}</div>
              <div className="camera-resolution">{camera.resolution}</div>
              <div style={{ fontSize: '0.8rem', color: '#999' }}>{camera.fps} FPS</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CameraControls; 