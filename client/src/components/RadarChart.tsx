import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from 'chart.js';
import { AXES, AXIS_LABELS_IT } from '@shared/schema';

ChartJS.register(
  RadarController,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface RadarChartProps {
  lightData: Record<string, number>;
  darkData: Record<string, number>;
  lightLabel?: string;
  darkLabel?: string;
}

export default function RadarChart({ 
  lightData, 
  darkData, 
  lightLabel = 'Squadra Chiara',
  darkLabel = 'Squadra Scura'
}: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy previous chart if exists
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const labels = AXES.map(axis => AXIS_LABELS_IT[axis]);
    const lightValues = AXES.map(axis => lightData[axis] || 0);
    const darkValues = AXES.map(axis => darkData[axis] || 0);

    const config: ChartConfiguration<'radar'> = {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: lightLabel,
            data: lightValues,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderColor: 'rgba(255, 255, 255, 0.8)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(255, 255, 255, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(255, 255, 255, 1)',
          },
          {
            label: darkLabel,
            data: darkValues,
            backgroundColor: 'rgba(11, 77, 255, 0.2)',
            borderColor: 'rgba(11, 77, 255, 0.8)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(11, 77, 255, 1)',
            pointBorderColor: '#0B4DFF',
            pointHoverBackgroundColor: '#0B4DFF',
            pointHoverBorderColor: 'rgba(11, 77, 255, 1)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        scales: {
          r: {
            beginAtZero: true,
            max: 5,
            ticks: {
              stepSize: 1,
              color: '#666',
              backdropColor: 'transparent',
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.1)',
            },
            pointLabels: {
              color: '#121212',
              font: {
                size: 13,
                weight: 500,
              },
            },
          },
        },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              padding: 16,
              usePointStyle: true,
              font: {
                size: 13,
              },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(18, 18, 18, 0.9)',
            padding: 12,
            titleFont: {
              size: 14,
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.r.toFixed(1)}`;
              }
            }
          },
        },
      },
    };

    chartRef.current = new ChartJS(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [lightData, darkData, lightLabel, darkLabel]);

  return (
    <div className="flex justify-center items-center p-6">
      <div className="relative w-full max-w-md">
        <canvas ref={canvasRef} data-testid="radar-chart"></canvas>
      </div>
    </div>
  );
}
