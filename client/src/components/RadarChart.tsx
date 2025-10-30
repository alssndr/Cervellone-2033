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

interface RadarDataset {
  data: Record<string, number>;
  label: string;
  color: string; // hex color like '#fc0fc0' or '#0000ff'
  visible?: boolean;
}

interface RadarChartProps {
  lightData: Record<string, number>;
  darkData: Record<string, number>;
  lightLabel?: string;
  darkLabel?: string;
  additionalDatasets?: RadarDataset[];
  hasSelections?: boolean; // Disables animations when true
}

export default function RadarChart({ 
  lightData, 
  darkData, 
  lightLabel = 'Squadra Chiara',
  darkLabel = 'Squadra Scura',
  additionalDatasets = [],
  hasSelections = false
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

    // Helper to convert hex to rgba
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Determine if team datasets should be visible
    // Hide team datasets if there are any additional datasets (player data)
    const showTeamDatasets = additionalDatasets.length === 0;

    // Build datasets array
    const datasets: any[] = [];

    // Team datasets (only if no players selected)
    if (showTeamDatasets) {
      datasets.push(
        {
          label: lightLabel,
          data: lightValues,
          backgroundColor: 'rgba(252, 15, 192, 0.2)',
          borderColor: 'rgba(252, 15, 192, 0.8)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(252, 15, 192, 1)',
          pointBorderColor: '#fc0fc0',
          pointHoverBackgroundColor: '#fc0fc0',
          pointHoverBorderColor: 'rgba(252, 15, 192, 1)',
        },
        {
          label: darkLabel,
          data: darkValues,
          backgroundColor: 'rgba(0, 0, 255, 0.2)',
          borderColor: 'rgba(0, 0, 255, 0.8)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(0, 0, 255, 1)',
          pointBorderColor: '#0000ff',
          pointHoverBackgroundColor: '#0000ff',
          pointHoverBorderColor: 'rgba(0, 0, 255, 1)',
        }
      );
    }

    // Additional datasets (player data)
    additionalDatasets.forEach(dataset => {
      if (dataset.visible !== false) {
        const values = AXES.map(axis => dataset.data[axis] || 0);
        datasets.push({
          label: dataset.label,
          data: values,
          backgroundColor: hexToRgba(dataset.color, 0.2),
          borderColor: hexToRgba(dataset.color, 0.8),
          borderWidth: 2,
          pointBackgroundColor: dataset.color,
          pointBorderColor: dataset.color,
          pointHoverBackgroundColor: dataset.color,
          pointHoverBorderColor: dataset.color,
        });
      }
    });

    const config: ChartConfiguration<'radar'> = {
      type: 'radar',
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: hasSelections ? false : {
          duration: 750,
          easing: 'easeInOutQuart'
        },
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
  }, [lightData, darkData, lightLabel, darkLabel, additionalDatasets, hasSelections]);

  return (
    <div className="flex justify-center items-center p-6">
      <div className="relative w-full max-w-md">
        <canvas ref={canvasRef} data-testid="radar-chart"></canvas>
      </div>
    </div>
  );
}
