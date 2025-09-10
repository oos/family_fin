// Common chart configuration for consistent axis visibility
export const getChartConfig = (type = 'bar') => {
  const baseConfig = {
    margin: { top: 20, right: 30, left: 50, bottom: 20 },
    xAxis: {
      tick: { fontSize: 12 },
      interval: 0
    },
    yAxis: {
      tick: { fontSize: 12 },
      width: 90,
      interval: 0
    }
  };

  if (type === 'line') {
    return {
      ...baseConfig,
      margin: { top: 20, right: 30, left: 50, bottom: 20 }
    };
  }

  return baseConfig;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatNumber = (amount) => {
  return new Intl.NumberFormat('en-IE').format(amount);
};
