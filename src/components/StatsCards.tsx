import React from 'react';

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

interface StatsCardsProps {
  stats: SystemStats | null;
  loading: boolean;
}

const StatsCards: React.FC<StatsCardsProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="dashboard-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="dashboard-card">
            <div className="loading">
              <i className="fas fa-spinner"></i>
              Loading...
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="error-message">No statistics available</div>
        </div>
      </div>
    );
  }

  const getTotalGenderDetections = () => {
    if (!stats || !stats.gender_distribution) return 0;
    return Object.values(stats.gender_distribution).reduce((sum, count) => sum + count, 0);
  };

  const getTotalEmotionDetections = () => {
    if (!stats || !stats.emotion_distribution) return 0;
    return Object.values(stats.emotion_distribution).reduce((sum, count) => sum + count, 0);
  };

  const getMostCommonGender = () => {
    if (!stats || !stats.gender_distribution) return 'None';
    const genders = Object.entries(stats.gender_distribution);
    if (genders.length === 0) return 'None';
    
    return genders.reduce((max, current) => 
      current[1] > max[1] ? current : max
    )[0];
  };

  const getMostCommonEmotion = () => {
    if (!stats || !stats.emotion_distribution) return 'None';
    const emotions = Object.entries(stats.emotion_distribution);
    if (emotions.length === 0) return 'None';
    
    return emotions.reduce((max, current) => 
      current[1] > max[1] ? current : max
    )[0];
  };

  return (
    <div className="dashboard-grid">
      {/* Total Frames */}
      <div className="dashboard-card">
        <h3 className="card-title">
          <i className="fas fa-film"></i>
          Total Frames
        </h3>
        <div className="metric-value">{(stats.total_frames || 0).toLocaleString()}</div>
        <div className="metric-label">Frames Processed</div>
      </div>

      {/* Detection Rate */}
      <div className="dashboard-card">
        <h3 className="card-title">
          <i className="fas fa-percentage"></i>
          Detection Rate
        </h3>
        <div className="metric-value">{stats.detection_rate || 0}%</div>
        <div className="metric-label">
          {stats.people_detected || 0} frames with people detected
        </div>
      </div>

      {/* Gender Distribution */}
      <div className="dashboard-card">
        <h3 className="card-title">
          <i className="fas fa-venus-mars"></i>
          Gender Analysis
        </h3>
        <div className="metric-value">{getTotalGenderDetections()}</div>
        <div className="metric-label">Total Gender Detections</div>
        
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '1.1rem', color: '#4fc3f7', marginBottom: '5px' }}>
            Most Common: {getMostCommonGender()}
          </div>
          {stats.gender_distribution && Object.entries(stats.gender_distribution).map(([gender, count]) => (
            <div key={gender} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '2px',
              fontSize: '0.9rem'
            }}>
              <span style={{ textTransform: 'capitalize' }}>{gender}:</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Emotion Distribution */}
      <div className="dashboard-card">
        <h3 className="card-title">
          <i className="fas fa-smile"></i>
          Emotion Analysis
        </h3>
        <div className="metric-value">{getTotalEmotionDetections()}</div>
        <div className="metric-label">Total Emotion Detections</div>
        
        <div style={{ marginTop: '10px' }}>
          <div style={{ fontSize: '1.1rem', color: '#4fc3f7', marginBottom: '5px' }}>
            Most Common: {getMostCommonEmotion()}
          </div>
          {stats.emotion_distribution && Object.entries(stats.emotion_distribution).map(([emotion, count]) => (
            <div key={emotion} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '2px',
              fontSize: '0.9rem'
            }}>
              <span style={{ textTransform: 'capitalize' }}>{emotion}:</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Age Statistics */}
      <div className="dashboard-card">
        <h3 className="card-title">
          <i className="fas fa-birthday-cake"></i>
          Age Analysis
        </h3>
        <div className="metric-value">{Math.round(stats.age_range?.avg || 0)}</div>
        <div className="metric-label">Average Age</div>
        
        <div style={{ marginTop: '10px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '5px',
            fontSize: '0.9rem'
          }}>
            <span>Min Age:</span>
            <span>{stats.age_range?.min || 0} years</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '5px',
            fontSize: '0.9rem'
          }}>
            <span>Max Age:</span>
            <span>{stats.age_range?.max || 0} years</span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            fontSize: '0.9rem'
          }}>
            <span>Range:</span>
            <span>{(stats.age_range?.max || 0) - (stats.age_range?.min || 0)} years</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-card">
        <h3 className="card-title">
          <i className="fas fa-clock"></i>
          Recent Activity
        </h3>
        <div className="metric-value">{stats.timeline?.length || 0}</div>
        <div className="metric-label">Recent Data Points</div>
        
        <div style={{ marginTop: '10px', maxHeight: '150px', overflowY: 'auto' }}>
          {stats.timeline && stats.timeline.slice(-5).reverse().map((entry, index) => (
            <div key={index} style={{ 
              backgroundColor: 'rgba(255,255,255,0.05)', 
              padding: '8px', 
              marginBottom: '5px', 
              borderRadius: '5px',
              fontSize: '0.8rem'
            }}>
              <div style={{ fontWeight: 'bold', color: '#4fc3f7' }}>
                {entry.people_count} people - {entry.current_ad} ad
              </div>
              <div style={{ color: '#ccc' }}>
                {entry.dominant_gender} · {entry.dominant_emotion}
              </div>
              <div style={{ color: '#999', fontSize: '0.7rem' }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsCards; 