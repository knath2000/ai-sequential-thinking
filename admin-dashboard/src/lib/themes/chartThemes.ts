export const liquidGlassChartTheme = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top' as const,
      labels: {
        color: 'rgba(255, 255, 255, 0.9)',
        font: {
          family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif',
          size: 12,
          weight: '500'
        },
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 20
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(12px)',
      titleColor: 'rgba(255, 255, 255, 0.95)',
      bodyColor: 'rgba(255, 255, 255, 0.85)',
      borderColor: 'rgba(255, 255, 255, 0.2)',
      borderWidth: 1,
      cornerRadius: 12,
      displayColors: false
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
        lineWidth: 1
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.7)',
        font: {
          family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif'
        }
      }
    },
    y: {
      grid: {
        color: 'rgba(255, 255, 255, 0.1)',
        lineWidth: 1
      },
      ticks: {
        color: 'rgba(255, 255, 255, 0.7)',
        font: {
          family: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif'
        }
      }
    }
  }
};

// Glassmorphic gradient generator for chart backgrounds
export const generateGlassGradient = (ctx: CanvasRenderingContext2D, colors: string[]) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  colors.forEach((color, index) => {
    gradient.addColorStop(index / (colors.length - 1), color);
  });
  return gradient;
};
