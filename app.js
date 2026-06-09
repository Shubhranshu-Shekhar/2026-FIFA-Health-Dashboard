document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const citySelect = document.getElementById('citySelect');
  const pathogenSelect = document.getElementById('pathogenSelect');
  const cityName = document.getElementById('cityName');
  const cityFlag = document.getElementById('cityFlag');
  const cityCountry = document.getElementById('cityCountry');
  const reportDate = document.getElementById('reportDate');
  const activeAlertCount = document.getElementById('activeAlertCount');
  const riskBadge = document.getElementById('riskBadge');
  const metricDailyCases = document.getElementById('metricDailyCases');
  const metricDailyChange = document.getElementById('metricDailyChange');
  const metricCumulative = document.getElementById('metricCumulative');
  const metricPopulation = document.getElementById('metricPopulation');
  const metricLocation = document.getElementById('metricLocation');
  const pathogenDesc = document.getElementById('pathogenDesc');
  const alertsContainer = document.getElementById('alertsContainer');
  const alertFilterLocal = document.getElementById('alertFilterLocal');
  const alertFilterAll = document.getElementById('alertFilterAll');
  const themeToggle = document.getElementById('themeToggle');

  // Application State
  let appData = null;
  let selectedCityId = 'boston'; // Default selection
  let selectedPathogenId = 'covid19'; // Default selection
  let currentAlertFilter = 'local'; // 'local' or 'all'
  let trendChart = null;

  // Initialize App
  init();

  function init() {
    // 1. Theme Configuration
    setupTheme();

    // 2. Fetch Data
    fetch('public_health_data.json')
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to load JSON file');
        }
        return res.json();
      })
      .then(data => {
        appData = data;
        
        // Update report date in metadata
        reportDate.innerText = `Report Date: ${data.metadata.report_date}`;
        
        // 3. Populate Selection Lists
        populateDropdowns();
        
        // 4. Set Initial Values & Setup Chart.js
        citySelect.value = selectedCityId;
        pathogenSelect.value = selectedPathogenId;
        
        // Initialize Chart
        initChart();
        
        // 5. Update UI
        updateView();
        
        // 6. Bind Event Listeners
        bindEvents();
        
        // Initialize Lucide Icons
        if (window.lucide) {
          window.lucide.createIcons();
        }
      })
      .catch(err => {
        console.error('Error loading public health data:', err);
        alertsContainer.innerHTML = `
          <div class="p-3 border border-red-500 text-red-500 text-xs flex items-center space-x-2 bg-red-500/5">
            <i data-lucide="alert-octagon" class="w-4 h-4 flex-shrink-0"></i>
            <span>Error loading passive surveillance data. Data aggregate offline.</span>
          </div>
        `;
        if (window.lucide) {
          window.lucide.createIcons();
        }
      });
  }

  function setupTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }

  function toggleTheme() {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    if (trendChart) {
      updateChartColors();
    }
  }

  function populateDropdowns() {
    citySelect.innerHTML = '';
    appData.metadata.cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city.id;
      option.text = `${city.name} (${city.country})`;
      citySelect.appendChild(option);
    });

    pathogenSelect.innerHTML = '';
    appData.metadata.pathogens.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.text = p.name;
      pathogenSelect.appendChild(option);
    });
  }

  function bindEvents() {
    citySelect.addEventListener('change', (e) => {
      selectedCityId = e.target.value;
      updateView();
    });

    pathogenSelect.addEventListener('change', (e) => {
      selectedPathogenId = e.target.value;
      updateView();
    });

    alertFilterLocal.addEventListener('click', () => {
      currentAlertFilter = 'local';
      alertFilterLocal.className = 'text-3xs font-bold uppercase px-2 py-1 bg-[var(--text-primary)] text-[var(--bg-primary)] transition-all';
      alertFilterAll.className = 'text-3xs font-bold uppercase px-2 py-1 bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all';
      updateAlertsSection();
    });

    alertFilterAll.addEventListener('click', () => {
      currentAlertFilter = 'all';
      alertFilterAll.className = 'text-3xs font-bold uppercase px-2 py-1 bg-[var(--text-primary)] text-[var(--bg-primary)] transition-all';
      alertFilterLocal.className = 'text-3xs font-bold uppercase px-2 py-1 bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all';
      updateAlertsSection();
    });

    themeToggle.addEventListener('click', toggleTheme);
  }

  function updateView() {
    if (!appData) return;

    const city = appData.metadata.cities.find(c => c.id === selectedCityId);
    const pathogen = appData.metadata.pathogens.find(p => p.id === selectedPathogenId);

    cityName.innerText = city.name;
    cityCountry.innerText = city.country;
    cityFlag.innerText = getFlagEmoji(city.country);
    pathogenDesc.innerText = pathogen.description;

    const cityTrends = appData.trends[selectedCityId];
    const series = cityTrends[selectedPathogenId] || [];

    // Filter historical points to find latest metrics
    const historicalSeries = series.filter(item => item.cases !== null);

    if (historicalSeries.length > 0) {
      const latestData = historicalSeries[historicalSeries.length - 1];
      const dailyCasesVal = latestData.cases;
      const changePct = latestData.change_pct;

      metricDailyCases.innerText = dailyCasesVal.toLocaleString();
      
      // Minimal, functional styling of trend badge
      if (selectedPathogenId === 'ebola' && dailyCasesVal === 0) {
        metricDailyChange.innerText = 'STABLE (0)';
        metricDailyChange.className = 'inline-flex items-center text-3xs font-bold uppercase px-1.5 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)] bg-[var(--bg-tertiary)]';
      } else {
        if (changePct > 0) {
          metricDailyChange.innerText = `+${changePct}% vs yesterday`;
          metricDailyChange.className = 'inline-flex items-center text-3xs font-bold uppercase px-1.5 py-0.5 rounded border border-[var(--accent-red)]/30 text-[var(--accent-red)] bg-[var(--accent-red)]/5';
        } else if (changePct < 0) {
          metricDailyChange.innerText = `${changePct}% vs yesterday`;
          metricDailyChange.className = 'inline-flex items-center text-3xs font-bold uppercase px-1.5 py-0.5 rounded border border-[var(--accent-green)]/30 text-[var(--accent-green)] bg-[var(--accent-green)]/5';
        } else {
          metricDailyChange.innerText = 'STABLE (0.0%)';
          metricDailyChange.className = 'inline-flex items-center text-3xs font-bold uppercase px-1.5 py-0.5 rounded border border-[var(--border-color)] text-[var(--text-secondary)] bg-[var(--bg-tertiary)]';
        }
      }

      // Calculate Cumulative (historical period)
      const totalCases = historicalSeries.reduce((sum, item) => sum + item.cases, 0);
      metricCumulative.innerText = totalCases.toLocaleString();
    } else {
      metricDailyCases.innerText = '--';
      metricDailyChange.innerText = '--';
      metricCumulative.innerText = '--';
    }

    metricPopulation.innerText = city.population.toLocaleString();
    metricLocation.innerText = `Coord: ${city.lat.toFixed(2)}°N, ${Math.abs(city.lng).toFixed(2)}°W`;

    updateAlertsSection();
    updateChart(series, pathogen.name);
  }

  function getFlagEmoji(country) {
    switch(country) {
      case 'USA': return '🇺🇸';
      case 'Canada': return '🇨🇦';
      case 'Mexico': return '🇲🇽';
      default: return '🌎';
    }
  }

  function updateAlertsSection() {
    if (!appData) return;
    
    const city = appData.metadata.cities.find(c => c.id === selectedCityId);
    
    let filteredAlerts = [];
    if (currentAlertFilter === 'local') {
      filteredAlerts = appData.alerts.filter(alert => {
        if (alert.city === selectedCityId) return true;
        if (alert.city === 'All' && alert.country === city.country) return true;
        if (alert.city === 'All' && alert.country === 'Global') return true;
        return false;
      });
    } else {
      filteredAlerts = appData.alerts;
    }

    const localAlerts = appData.alerts.filter(alert => 
      alert.city === selectedCityId || (alert.city === 'All' && alert.country === city.country)
    );
    activeAlertCount.innerText = localAlerts.length;

    calculateRiskLevel(localAlerts);

    alertsContainer.innerHTML = '';
    
    if (filteredAlerts.length === 0) {
      alertsContainer.innerHTML = `
        <div class="py-6 border border-dashed border-[var(--border-color)] text-center text-3xs uppercase tracking-wider font-bold text-[var(--text-muted)] flex flex-col items-center justify-center space-y-2">
          <i data-lucide="info" class="w-5 h-5 text-[var(--text-muted)]"></i>
          <p>No active public health alerts.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    filteredAlerts.forEach(alert => {
      const isPathogenMatch = alert.pathogen === selectedPathogenId;
      const isCityMatch = alert.city === selectedCityId;
      
      const highlightBorder = isPathogenMatch && isCityMatch
        ? 'border-l-4 border-l-[var(--accent-color)] border border-[var(--border-color)] bg-[var(--bg-primary)]'
        : 'border-l-2 border border-[var(--border-color)]';
      
      let badgeStyle = 'border-blue-500/20 text-blue-500 bg-blue-500/5';
      let icon = 'info';
      let alertClass = 'low';
      
      if (alert.risk_level === 'High') {
        badgeStyle = 'border-[var(--accent-red)]/20 text-[var(--accent-red)] bg-[var(--accent-red)]/5';
        icon = 'alert-triangle';
        alertClass = 'high';
      } else if (alert.risk_level === 'Medium') {
        badgeStyle = 'border-[var(--accent-yellow)]/20 text-[var(--accent-yellow)] bg-[var(--accent-yellow)]/5';
        icon = 'alert-circle';
        alertClass = 'medium';
      }

      let cityBadgeText = alert.city === 'All' ? `${alert.country} (National)` : appData.metadata.cities.find(x => x.id === alert.city)?.name || alert.city;

      const alertElement = document.createElement('div');
      alertElement.className = `alert-strip ${alertClass} p-3.5 rounded-sm flex flex-col md:flex-row md:items-start justify-between gap-3 ${highlightBorder}`;
      alertElement.innerHTML = `
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="inline-flex items-center text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wider border ${badgeStyle}">
              <i data-lucide="${icon}" class="w-2.5 h-2.5 mr-1"></i>
              ${alert.risk_level}
            </span>
            <span class="text-[9px] text-[var(--text-secondary)] border border-[var(--border-color)] bg-[var(--bg-tertiary)] font-bold px-1.5 py-0.5 rounded-sm">
              ${cityBadgeText}
            </span>
            <span class="text-[9px] text-[var(--accent-color)] border border-[var(--accent-color)]/20 bg-[var(--accent-color)]/5 font-bold px-1.5 py-0.5 rounded-sm uppercase">
              ${alert.pathogen}
            </span>
          </div>
          <h4 class="font-bold text-xs text-[var(--text-primary)]">${alert.title}</h4>
          <p class="text-[10px] text-[var(--text-secondary)] leading-relaxed">${alert.summary}</p>
        </div>
        <div class="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start flex-shrink-0 text-right text-3xs font-bold uppercase border-t md:border-t-0 border-[var(--border-color)] pt-1.5 md:pt-0 gap-1 text-[var(--text-muted)]">
          <span>${alert.date}</span>
          <span class="text-[var(--accent-color)]">${alert.source}</span>
        </div>
      `;
      alertsContainer.appendChild(alertElement);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function calculateRiskLevel(localAlerts) {
    let severityScore = 0;
    
    localAlerts.forEach(a => {
      if (a.risk_level === 'High') severityScore += 3;
      else if (a.risk_level === 'Medium') severityScore += 2;
      else severityScore += 1;
    });

    if (appData) {
      const cityTrends = appData.trends[selectedCityId];
      const series = cityTrends[selectedPathogenId] || [];
      const historical = series.filter(item => item.cases !== null);
      if (historical.length > 0) {
        const latestData = historical[historical.length - 1];
        if (latestData.change_pct > 15.0 && latestData.cases > 10) {
          severityScore += 1;
        }
      }
    }

    if (severityScore >= 4) {
      riskBadge.className = 'flex items-center px-2.5 py-1 rounded border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/5 text-[var(--accent-red)] font-bold text-2xs uppercase tracking-wider';
      riskBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full mr-2 bg-[var(--accent-red)]"></span>High Warning';
    } else if (severityScore >= 1) {
      riskBadge.className = 'flex items-center px-2.5 py-1 rounded border border-[var(--accent-yellow)]/30 bg-[var(--accent-yellow)]/5 text-[var(--accent-yellow)] font-bold text-2xs uppercase tracking-wider';
      riskBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full mr-2 bg-[var(--accent-yellow)]"></span>Medium Alert';
    } else {
      riskBadge.className = 'flex items-center px-2.5 py-1 rounded border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/5 text-[var(--accent-green)] font-bold text-2xs uppercase tracking-wider';
      riskBadge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full mr-2 bg-[var(--accent-green)]"></span>Low Risk Profile';
    }
  }

  function initChart() {
    const ctx = document.getElementById('trendChart').getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(9, 9, 11, 0.04)';
    const textColor = isDark ? '#a1a1aa' : '#52525b';
    const primaryColor = isDark ? '#3b82f6' : '#2563eb';
    const modelLineColor = isDark ? '#52525b' : '#a1a1aa';

    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Reported Cases',
            data: [],
            borderColor: primaryColor,
            borderWidth: 2,
            pointBackgroundColor: primaryColor,
            pointBorderColor: isDark ? '#09090b' : '#ffffff',
            pointBorderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 5,
            fill: false,
            tension: 0.15
          },
          {
            label: 'Model Projection',
            data: [],
            borderColor: modelLineColor,
            borderWidth: 1.5,
            borderDash: [5, 5],
            pointBackgroundColor: modelLineColor,
            pointBorderColor: isDark ? '#09090b' : '#ffffff',
            pointBorderWidth: 1,
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: false,
            tension: 0.15
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false // We use our custom legend in HTML
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: isDark ? '#121215' : '#ffffff',
            titleColor: isDark ? '#fafafa' : '#09090b',
            bodyColor: isDark ? '#a1a1aa' : '#52525b',
            borderColor: isDark ? '#27272a' : '#e4e4e7',
            borderWidth: 1,
            padding: 8,
            cornerRadius: 4,
            font: {
              family: 'Inter, sans-serif',
              size: 11
            },
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += Math.round(context.parsed.y).toLocaleString() + ' cases';
                } else {
                  label += 'No passive reports';
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: textColor,
              font: {
                family: 'Inter, sans-serif',
                size: 9,
                weight: 'bold'
              },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 6
            }
          },
          y: {
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor,
              font: {
                family: 'Inter, sans-serif',
                size: 9,
                weight: 'bold'
              },
              callback: function(value) {
                if (value >= 1000) {
                  return (value / 1000).toFixed(0) + 'k';
                }
                return value;
              }
            }
          }
        }
      }
    });
  }

  function updateChart(series, pathogenName) {
    if (!trendChart || series.length === 0) return;

    const labels = series.map(d => {
      const dateParts = d.date.split('-');
      if (dateParts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const m = parseInt(dateParts[1]) - 1;
        return `${months[m]} ${parseInt(dateParts[2])}`;
      }
      return d.date;
    });
    
    // Observed Reported Cases stops when d.cases is null (in the future)
    const reportedPoints = series.map(d => d.cases);
    // Model baseline runs for all points
    const modelPoints = series.map(d => d.model_projected);

    trendChart.data.labels = labels;
    
    // Dataset 0: Observed reported cases
    trendChart.data.datasets[0].data = reportedPoints;
    
    // Dataset 1: Model forecast
    trendChart.data.datasets[1].data = modelPoints;
    
    trendChart.update();
  }

  function updateChartColors() {
    if (!trendChart) return;

    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(9, 9, 11, 0.04)';
    const textColor = isDark ? '#a1a1aa' : '#52525b';
    const primaryColor = isDark ? '#3b82f6' : '#2563eb';
    const modelLineColor = isDark ? '#52525b' : '#a1a1aa';

    trendChart.options.scales.x.ticks.color = textColor;
    trendChart.options.scales.y.ticks.color = textColor;
    trendChart.options.scales.y.grid.color = gridColor;

    trendChart.data.datasets[0].borderColor = primaryColor;
    trendChart.data.datasets[0].pointBackgroundColor = primaryColor;
    trendChart.data.datasets[0].pointBorderColor = isDark ? '#09090b' : '#ffffff';

    trendChart.data.datasets[1].borderColor = modelLineColor;
    trendChart.data.datasets[1].pointBackgroundColor = modelLineColor;
    trendChart.data.datasets[1].pointBorderColor = isDark ? '#09090b' : '#ffffff';

    trendChart.options.plugins.tooltip.backgroundColor = isDark ? '#121215' : '#ffffff';
    trendChart.options.plugins.tooltip.titleColor = isDark ? '#fafafa' : '#09090b';
    trendChart.options.plugins.tooltip.bodyColor = isDark ? '#a1a1aa' : '#52525b';
    trendChart.options.plugins.tooltip.borderColor = isDark ? '#27272a' : '#e4e4e7';

    trendChart.update();
  }
});
