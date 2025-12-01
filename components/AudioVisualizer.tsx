import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  volume: number; // 0-255
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isActive, volume }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let baseRadius = 60;
    
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Dynamic radius based on volume
      const normalizedVol = Math.max(0, volume / 255); // 0 to 1
      const currentRadius = baseRadius + (normalizedVol * 60);

      // Draw active "speaking" glow
      if (isActive) {
        // Outer glow
        const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius, centerX, centerY, currentRadius * 1.5);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.8)'); // Purple-500
        gradient.addColorStop(0.5, 'rgba(236, 72, 153, 0.4)'); // Pink-500
        gradient.addColorStop(1, 'rgba(236, 72, 153, 0)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, currentRadius * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Inner Orb
        ctx.beginPath();
        ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#d946ef'; // Fuchsia-500
        ctx.fill();
      } else {
        // Idle state
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#475569'; // Slate-600
        ctx.fill();
      }
      
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, [isActive, volume]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={400} 
      className="w-64 h-64 md:w-80 md:h-80"
    />
  );
};

export default AudioVisualizer;
