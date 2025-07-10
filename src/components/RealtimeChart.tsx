import React, { useEffect, useRef } from 'react';

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

interface RealtimeChartProps {
  stats: SystemStats | null;
}

const RealtimeChart: React.FC<RealtimeChartProps> = ({ stats }) => {
  const chartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!stats || !stats.timeline || stats.timeline.length === 0) {
      // Draw "No data" message
      ctx.fillStyle = '#666';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No data available - waiting for analytics...', canvas.width / 2, canvas.height / 2);
      return;
    }

    const timeline = stats.timeline.slice(-20); // Show last 20 data points

    const maxPeople = Math.max(...timeline.map(entry => entry.people_count), 1);
    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;

    // Draw background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(padding, padding, chartWidth, chartHeight);

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + chartWidth, y);
      ctx.stroke();
      
      // Y-axis labels
      ctx.fillStyle = '#ccc';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(
        Math.round(maxPeople - (maxPeople / 5) * i).toString(),
        padding - 5,
        y + 4
      );
    }

    // Vertical grid lines
    const timeSteps = Math.min(timeline.length, 10);
    for (let i = 0; i <= timeSteps; i++) {
      const x = padding + (chartWidth / timeSteps) * i;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
    }

    // Draw the line chart
    if (timeline.length > 1) {
      ctx.strokeStyle = '#4fc3f7';
      ctx.lineWidth = 2;
      ctx.beginPath();

      timeline.forEach((entry, index) => {
        const x = padding + (chartWidth / (timeline.length - 1)) * index;
        const y = padding + chartHeight - (entry.people_count / maxPeople) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw data points
      timeline.forEach((entry, index) => {
        const x = padding + (chartWidth / (timeline.length - 1)) * index;
        const y = padding + chartHeight - (entry.people_count / maxPeople) * chartHeight;
        
        // Draw point
        ctx.fillStyle = '#4fc3f7';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Draw ad type indicator
        const adColors: Record<string, string> = {
          'male': '#2196f3',
          'female': '#e91e63',
          'neutral': '#fff'
        };
        
        ctx.fillStyle = adColors[entry.current_ad] || '#fff';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // Draw axis labels
    ctx.fillStyle = '#ccc';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    
    // X-axis label
    ctx.fillText('Time', canvas.width / 2, canvas.height - 10);
    
    // Y-axis label
    ctx.save();
    ctx.translate(15, canvas.height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('People Count', 0, 0);
    ctx.restore();

    // Draw legend
    const legendY = padding + 20;
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(padding, legendY, 10, 10);
    ctx.fillStyle = '#ccc';
    ctx.fillText('Male Ad', padding + 15, legendY + 8);
    
    ctx.fillStyle = '#e91e63';
    ctx.fillRect(padding + 80, legendY, 10, 10);
    ctx.fillText('Female Ad', padding + 95, legendY + 8);
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(padding + 170, legendY, 10, 10);
    ctx.fillText('Neutral Ad', padding + 185, legendY + 8);

  }, [stats]);

  if (!stats) {
    return (
      <div className="chart-container">
        <div className="loading">
          <i className="fas fa-spinner"></i>
          Loading chart data...
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <canvas
        ref={chartRef}
        style={{
          width: '100%',
          height: '200px',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderRadius: '8px'
        }}
      />
      
      <div style={{ 
        marginTop: '10px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        fontSize: '0.9rem',
        color: '#ccc'
      }}>
        <span>Data points: {stats.timeline?.length || 0}</span>
        <span>Max detected: {stats.timeline ? Math.max(...stats.timeline.map(e => e.people_count), 0) : 0} people</span>
        <span>Latest: {stats.timeline && stats.timeline.length > 0 ? 
          new Date(stats.timeline[stats.timeline.length - 1].timestamp).toLocaleTimeString() : 
          'No data'
        }</span>
      </div>
    </div>
  );
};

export default RealtimeChart; 