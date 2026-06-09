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
          <div class="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs flex items-center space-x-2">
            <i data-lucide="alert-octagon" class="w-5 h-5 flex-shrink-0"></i>
            <span>Error loading passive surveillance data. Please check if public_health_data.json is compiled.</span>
          </div>
        `;
        if (window.lucide) {
          window.lucide.createIcons();
        }
      });
  }

  function setupTheme() {
    // Check local storage or default to dark
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
    // Update chart colors on theme toggle
    if (trendChart) {
      updateChartColors();
    }
  }

  function populateDropdowns() {
    // Populate Cities Select
    citySelect.innerHTML = '';
    appData.metadata.cities.forEach(city => {
      const option = document.createElement('option');
      option.value = city.id;
      option.text = `${city.name} (${city.country})`;
      citySelect.appendChild(option);
    });

    // Populate Pathogens Select
    pathogenSelect.innerHTML = '';
    appData.metadata.pathogens.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.text = p.name;
      pathogenSelect.appendChild(option);
    });
  }

  function bindEvents() {
    // Dropdowns
    citySelect.addEventListener('change', (e) => {
      selectedCityId = e.target.value;
      updateView();
    });

    pathogenSelect.addEventListener('change', (e) => {
      selectedPathogenId = e.target.value;
      updateView();
    });

    // Alert Filters
    alertFilterLocal.addEventListener('click', () => {
      currentAlertFilter = 'local';
      alertFilterLocal.classList.add('bg-indigo-500', 'text-white');
      alertFilterLocal.classList.remove('bg-[var(--bg-primary)]', 'text-[var(--text-secondary)]', 'border', 'border-[var(--border-glass)]');
      
      alertFilterAll.classList.remove('bg-indigo-500', 'text-white');
      alertFilterAll.classList.add('bg-[var(--bg-primary)]', 'text-[var(--text-secondary)]', 'border', 'border-[var(--border-glass)]');
      updateAlertsSection();
    });

    alertFilterAll.addEventListener('click', () => {
      currentAlertFilter = 'all';
      alertFilterAll.classList.add('bg-indigo-500', 'text-white');
      alertFilterAll.classList.remove('bg-[var(--bg-primary)]', 'text-[var(--text-secondary)]', 'border', 'border-[var(--border-glass)]');
      
      alertFilterLocal.classList.remove('bg-indigo-500', 'text-white');
      alertFilterLocal.classList.add('bg-[var(--bg-primary)]', 'text-[var(--text-secondary)]', 'border', 'border-[var(--border-glass)]');
      updateAlertsSection();
    });

    // Theme Toggle
    themeToggle.addEventListener('click', toggleTheme);
  }

  function updateView() {
    if (!appData) return;

    // Get Active City Info
    const city = appData.metadata.cities.find(c => c.id === selectedCityId);
    const pathogen = appData.metadata.pathogens.find(p => p.id === selectedPathogenId);

    // Update Dashboard Header
    cityName.innerText = city.name;
    cityCountry.innerText = city.country;
    cityFlag.innerText = getFlagEmoji(city.country);
    
    // Update Pathogen Desc Info box
    pathogenDesc.innerText = pathogen.description;

    // Retrieve Trends
    const cityTrends = appData.trends[selectedCityId];
    const series = cityTrends[selectedPathogenId] || [];

    // Latest Day Metrics
    if (series.length > 0) {
      const latestData = series[series.length - 1];
      const dailyCasesVal = latestData.cases;
      const changePct = latestData.change_pct;

      // Formatting daily cases
      metricDailyCases.innerText = dailyCasesVal.toLocaleString();
      
      // Formatting change badge
      if (selectedPathogenId === 'ebola' && dailyCasesVal === 0) {
        metricDailyChange.innerText = 'Stable (0)';
        metricDailyChange.className = 'inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20';
      } else {
        if (changePct > 0) {
          metricDailyChange.innerText = `+${changePct}% vs yesterday`;
          metricDailyChange.className = 'inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-500 border border-red-500/20';
        } else if (changePct < 0) {
          metricDailyChange.innerText = `${changePct}% vs yesterday`;
          metricDailyChange.className = 'inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
        } else {
          metricDailyChange.innerText = 'Stable (0.0%)';
          metricDailyChange.className = 'inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20';
        }
      }

      // Calculate Cumulative (last 45 days)
      const totalCases = series.reduce((sum, item) => sum + item.cases, 0);
      metricCumulative.innerText = totalCases.toLocaleString();
    } else {
      metricDailyCases.innerText = '--';
      metricDailyChange.innerText = '--';
      metricCumulative.innerText = '--';
    }

    // Population
    metricPopulation.innerText = city.population.toLocaleString();
    metricLocation.innerText = `Coord: ${city.lat.toFixed(2)}°N, ${Math.abs(city.lng).toFixed(2)}°W`;

    // Update Alerts List & Risk Profile
    updateAlertsSection();
    
    // Update Chart
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
    
    // Filter alerts
    let filteredAlerts = [];
    if (currentAlertFilter === 'local') {
      filteredAlerts = appData.alerts.filter(alert => {
        // Matches current city exactly
        if (alert.city === selectedCityId) return true;
        // Matches country if it is a general alert
        if (alert.city === 'All' && alert.country === city.country) return true;
        // Matches global alert
        if (alert.city === 'All' && alert.country === 'Global') return true;
        
        return false;
      });
    } else {
      // Show everything
      filteredAlerts = appData.alerts;
    }

    // Update active alert counter (only for current city context)
    const localAlerts = appData.alerts.filter(alert => 
      alert.city === selectedCityId || (alert.city === 'All' && alert.country === city.country)
    );
    activeAlertCount.innerText = localAlerts.length;

    // Update Risk Level Indicator based on local alerts and metrics
    calculateRiskLevel(localAlerts);

    // Build Alerts list HTML
    alertsContainer.innerHTML = '';
    
    if (filteredAlerts.length === 0) {
      alertsContainer.innerHTML = `
        <div class="py-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center space-y-2">
          <i data-lucide="info" class="w-8 h-8 text-[var(--text-muted)] opacity-60"></i>
          <p>No active public health alerts for this selection.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    filteredAlerts.forEach(alert => {
      const isPathogenMatch = alert.pathogen === selectedPathogenId;
      const isCityMatch = alert.city === selectedCityId;
      
      const cardBorder = isPathogenMatch && isCityMatch
        ? 'border-2 border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
        : 'border border-[var(--border-glass)]';
      
      let badgeStyle = 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      let icon = 'info';
      
      if (alert.risk_level === 'High') {
        badgeStyle = 'bg-red-500/10 text-red-500 border-red-500/20';
        icon = 'alert-triangle';
      } else if (alert.risk_level === 'Medium') {
        badgeStyle = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
        icon = 'alert-circle';
      }

      // Format City Badge text
      let cityBadgeText = '';
      if (alert.city === 'All') {
        cityBadgeText = `${alert.country} (National)`;
      } else {
        const c = appData.metadata.cities.find(x => x.id === alert.city);
        cityBadgeText = c ? c.name : alert.city;
      }

      const alertElement = document.createElement('div');
      alertElement.className = `glass-card p-4 rounded-xl flex flex-col md:flex-row md:items-start justify-between gap-3 ${cardBorder} transition-all duration-300`;
      alertElement.innerHTML = `
        <div class="space-y-1.5 flex-grow">
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${badgeStyle}">
              <i data-lucide="${icon}" class="w-3 h-3 mr-1"></i>
              ${alert.risk_level}
            </span>
            <span class="text-[10px] bg-slate-500/10 text-[var(--text-secondary)] border border-[var(--border-glass)] font-semibold px-2 py-0.5 rounded-full">
              ${cityBadgeText}
            </span>
            <span class="text-[10px] bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-semibold px-2 py-0.5 rounded-full uppercase">
              ${alert.pathogen}
            </span>
          </div>
          <h4 class="font-bold text-sm text-[var(--text-primary)]">${alert.title}</h4>
          <p class="text-xs text-[var(--text-secondary)] leading-relaxed">${alert.summary}</p>
        </div>
        <div class="flex flex-row md:flex-col items-start md:items-end justify-between md:justify-start flex-shrink-0 text-right mt-1 gap-1 border-t md:border-t-0 border-[var(--border-glass)] pt-2 md:pt-0">
          <span class="text-[10px] font-semibold text-[var(--text-muted)]">${alert.date}</span>
          <span class="text-[10px] font-bold text-indigo-500">${alert.source}</span>
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
    
    // High alert is score 3, Medium is 2, Low is 1
    localAlerts.forEach(a => {
      if (a.risk_level === 'High') severityScore += 3;
      else if (a.risk_level === 'Medium') severityScore += 2;
      else severityScore += 1;
    });

    // Also look at latest change rate of the selected pathogen
    if (appData) {
      const cityTrends = appData.trends[selectedCityId];
      const series = cityTrends[selectedPathogenId] || [];
      if (series.length > 0) {
        const latestData = series[series.length - 1];
        if (latestData.change_pct > 15.0 && latestData.cases > 10) {
          severityScore += 1; // minor risk upgrade
        }
      }
    }

    // Determine badge style
    if (severityScore >= 4) {
      // High Risk Profile
      riskBadge.className = 'flex items-center px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 font-bold text-xs danger-ring';
      riskBadge.innerHTML = '<span class="w-2.5 h-2.5 rounded-full mr-2 bg-red-500 animate-pulse"></span>High Warning';
    } else if (severityScore >= 1) {
      // Medium Risk
      riskBadge.className = 'flex items-center px-3 py-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-500 font-bold text-xs';
      riskBadge.innerHTML = '<span class="w-2.5 h-2.5 rounded-full mr-2 bg-amber-500 animate-pulse"></span>Medium Alert';
    } else {
      // Low Risk
      riskBadge.className = 'flex items-center px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 font-bold text-xs';
      riskBadge.innerHTML = '<span class="w-2.5 h-2.5 rounded-full mr-2 bg-emerald-500"></span>Low Risk Profile';
    }
  }

  function initChart() {
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    // Get colors based on theme
    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const primaryColor = isDark ? '#6366f1' : '#4f46e5';

    // Chart Configuration
    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: '',
          data: [],
          borderColor: primaryColor,
          borderWidth: 3,
          pointBackgroundColor: primaryColor,
          pointBorderColor: isDark ? '#0f172a' : '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 2,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: isDark ? '#f8fafc' : '#0f172a',
            bodyColor: isDark ? '#94a3b8' : '#475569',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 12,
            font: {
              family: 'Inter, sans-serif'
            },
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y.toLocaleString() + ' daily reports';
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
                size: 10
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
                size: 10
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
      // Format label e.g., "Jun 8"
      const dateParts = d.date.split('-');
      if (dateParts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const m = parseInt(dateParts[1]) - 1;
        return `${months[m]} ${parseInt(dateParts[2])}`;
      }
      return d.date;
    });
    
    const dataPoints = series.map(d => d.cases);

    // Update Dataset Details
    trendChart.data.labels = labels;
    trendChart.data.datasets[0].label = pathogenName;
    trendChart.data.datasets[0].data = dataPoints;

    // Apply gradient fill below curve
    const isDark = document.documentElement.classList.contains('dark');
    const ctx = document.getElementById('trendChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    
    if (isDark) {
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
      gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
    } else {
      gradient.addColorStop(0, 'rgba(79, 70, 229, 0.35)');
      gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');
    }
    
    trendChart.data.datasets[0].backgroundColor = gradient;
    trendChart.update();
  }

  function updateChartColors() {
    if (!trendChart) return;

    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)';
    const textColor = isDark ? '#94a3b8' : '#475569';
    const primaryColor = isDark ? '#6366f1' : '#4f46e5';

    // Update colors in scales
    trendChart.options.scales.x.ticks.color = textColor;
    trendChart.options.scales.y.ticks.color = textColor;
    trendChart.options.scales.y.grid.color = gridColor;

    // Update dataset colors
    trendChart.data.datasets[0].borderColor = primaryColor;
    trendChart.data.datasets[0].pointBackgroundColor = primaryColor;
    trendChart.data.datasets[0].pointBorderColor = isDark ? '#0f172a' : '#ffffff';

    // Tooltip colors
    trendChart.options.plugins.tooltip.backgroundColor = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
    trendChart.options.plugins.tooltip.titleColor = isDark ? '#f8fafc' : '#0f172a';
    trendChart.options.plugins.tooltip.bodyColor = isDark ? '#94a3b8' : '#475569';
    trendChart.options.plugins.tooltip.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)';

    // Update chart background gradient
    const ctx = document.getElementById('trendChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    if (isDark) {
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.45)');
      gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');
    } else {
      gradient.addColorStop(0, 'rgba(79, 70, 229, 0.35)');
      gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');
    }
    trendChart.data.datasets[0].backgroundColor = gradient;
    trendChart.update();
  }
});
