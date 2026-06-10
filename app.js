document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const citySearch = document.getElementById('citySearch');
  const cityList = document.getElementById('cityList');
  const btnSelectAll = document.getElementById('btnSelectAll');
  const btnClearAll = document.getElementById('btnClearAll');
  
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
  let selectedCityIds = []; // Active checked cities
  let selectedPathogenId = 'covid19'; // Default selection
  let currentAlertFilter = 'local'; // 'local' or 'all'
  let trendChart = null;

  // Modern functional color palette for multi-city comparisons
  const COLOR_PALETTE = [
    '#2563eb', // Cobalt Blue
    '#dc2626', // Vermillion Red
    '#16a34a', // Emerald Green
    '#ea580c', // Orange
    '#9333ea', // Purple
    '#0d9488', // Teal
    '#db2777', // Magenta
    '#d97706', // Amber
    '#4f46e5', // Indigo
    '#e11d48', // Rose
    '#0891b2', // Cyan
    '#059669', // Mint
    '#ca8a04', // Olive/Gold
    '#7c3aed', // Violet
    '#4b5563', // Zinc/Gray
    '#1e293b'  // Slate
  ];

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
        // Default: Start with ALL cities selected (Aggregate View)
        selectedCityIds = data.metadata.cities.map(c => c.id);
        populateDropdowns();
        populateCityChecklist();
        
        pathogenSelect.value = selectedPathogenId;
        
        // 4. Initialize Chart & Gamification
        initChart();
        setupGamification();
        
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
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
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
    pathogenSelect.innerHTML = '';
    appData.metadata.pathogens.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.text = p.name;
      pathogenSelect.appendChild(option);
    });
  }

  function populateCityChecklist() {
    cityList.innerHTML = '';
    appData.metadata.cities.forEach(city => {
      const label = document.createElement('label');
      label.className = 'flex items-center space-x-2.5 py-1 px-1 rounded hover:bg-[var(--bg-tertiary)] cursor-pointer select-none transition-colors duration-100';
      label.dataset.cityId = city.id;
      label.dataset.cityName = city.name.toLowerCase();
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = city.id;
      checkbox.checked = selectedCityIds.includes(city.id);
      checkbox.className = 'rounded border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--accent-color)] focus:ring-0';
      
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          if (!selectedCityIds.includes(city.id)) {
            selectedCityIds.push(city.id);
          }
        } else {
          selectedCityIds = selectedCityIds.filter(id => id !== city.id);
        }
        updateView();
      });
      
      const span = document.createElement('span');
      span.className = 'font-medium';
      span.innerText = `${getFlagEmoji(city.country)} ${city.name}`;
      
      label.appendChild(checkbox);
      label.appendChild(span);
      cityList.appendChild(label);
    });
  }

  function setupGamification() {
    const questPercent = document.getElementById('shieldPercent');
    const questBar = document.getElementById('shieldBar');
    const questLevel = document.getElementById('shieldLevel');
    const checkboxes = document.querySelectorAll('.quest-item');
    
    checkboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        let totalPoints = 0;
        checkboxes.forEach(item => {
          if (item.checked) {
            totalPoints += parseInt(item.dataset.points);
          }
        });
        
        questPercent.innerText = `${totalPoints}%`;
        questBar.style.width = `${totalPoints}%`;
        
        if (totalPoints >= 75) {
          questLevel.innerText = 'Invincible Gladiator 🏆';
          questLevel.className = 'text-[var(--accent-green)] font-extrabold';
        } else if (totalPoints >= 30) {
          questLevel.innerText = 'Shield Guard 🛡️⚔️';
          questLevel.className = 'text-[var(--accent-yellow)] font-extrabold';
        } else {
          questLevel.innerText = 'Vulnerable Fan 🛡️';
          questLevel.className = 'text-[var(--accent-red)] font-extrabold';
        }
      });
    });
  }

  function bindEvents() {
    pathogenSelect.addEventListener('change', (e) => {
      selectedPathogenId = e.target.value;
      updateView();
    });

    // Local Search Input
    citySearch.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      const labels = cityList.querySelectorAll('label');
      labels.forEach(label => {
        const cityNameText = label.dataset.cityName;
        if (cityNameText.includes(query)) {
          label.style.display = 'flex';
        } else {
          label.style.display = 'none';
        }
      });
    });

    // Select All / Clear All Action Links
    btnSelectAll.addEventListener('click', () => {
      selectedCityIds = appData.metadata.cities.map(c => c.id);
      const checkboxes = cityList.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = true);
      updateView();
    });

    btnClearAll.addEventListener('click', () => {
      selectedCityIds = [];
      const checkboxes = cityList.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => cb.checked = false);
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

    const pathogen = appData.metadata.pathogens.find(p => p.id === selectedPathogenId);
    pathogenDesc.innerText = pathogen.description;

    // 1. Update Layout Details based on selected cities list
    const selectedCitiesCount = selectedCityIds.length;
    
    if (selectedCitiesCount === 0) {
      cityName.innerText = 'No Cities Selected';
      cityCountry.innerText = 'N/A';
      cityFlag.innerText = '⚠️';
      
      metricDailyCases.innerText = '--';
      metricDailyChange.innerText = '--';
      metricCumulative.innerText = '--';
      metricPopulation.innerText = '0';
      metricLocation.innerText = 'Select at least one city in the list.';
      
      activeAlertCount.innerText = '0';
      riskBadge.className = 'flex items-center px-2.5 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] font-bold text-2xs uppercase tracking-wider';
      riskBadge.innerHTML = 'Select Location';
      
      alertsContainer.innerHTML = `
        <div class="py-6 border border-dashed border-[var(--border-color)] text-center text-3xs uppercase tracking-wider font-bold text-[var(--text-muted)]">
          <p>Please check one or more cities to aggregate surveillance alerts.</p>
        </div>
      `;
      if (trendChart) {
        trendChart.data.labels = [];
        trendChart.data.datasets = [];
        trendChart.update();
      }
      return;
    }

    const firstCity = appData.metadata.cities.find(c => c.id === selectedCityIds[0]);

    if (selectedCitiesCount === 1) {
      cityName.innerText = firstCity.name;
      cityCountry.innerText = firstCity.country;
      cityFlag.innerText = getFlagEmoji(firstCity.country);
      metricLocation.innerText = `Coord: ${firstCity.lat.toFixed(2)}°N, ${Math.abs(firstCity.lng).toFixed(2)}°W`;
    } else if (selectedCitiesCount === appData.metadata.cities.length) {
      cityName.innerText = 'All Cities';
      cityCountry.innerText = 'Aggregate';
      cityFlag.innerText = '🌎';
      metricLocation.innerText = 'All 16 World Cup host sites aggregated';
    } else {
      cityName.innerText = `${selectedCitiesCount} Selected Cities`;
      cityCountry.innerText = 'Comparison';
      cityFlag.innerText = '🌎';
      metricLocation.innerText = 'Custom comparative baseline cohort';
    }

    // 2. Aggregate Population and Case Counts
    let aggregatePopulation = 0;
    selectedCityIds.forEach(id => {
      const city = appData.metadata.cities.find(c => c.id === id);
      if (city) {
        aggregatePopulation += city.population;
      }
    });
    metricPopulation.innerText = aggregatePopulation.toLocaleString();

    // Summing daily historical trends
    const numDays = appData.trends[selectedCityIds[0]][selectedPathogenId].length;
    let aggregatedReportedSeries = [];
    
    for (let dayIdx = 0; dayIdx < numDays; dayIdx++) {
      const sampleItem = appData.trends[selectedCityIds[0]][selectedPathogenId][dayIdx];
      const dateStr = sampleItem.date;
      
      let sumCases = 0;
      let sumModel = 0;
      let isHistorical = sampleItem.cases !== null;
      
      selectedCityIds.forEach(cityId => {
        const item = appData.trends[cityId][selectedPathogenId][dayIdx];
        if (item) {
          if (isHistorical) sumCases += item.cases;
          sumModel += item.model_projected;
        }
      });

      aggregatedReportedSeries.push({
        date: dateStr,
        cases: isHistorical ? sumCases : null,
        model_projected: sumModel
      });
    }

    // Latest Metrics calculation
    const historicalOnly = aggregatedReportedSeries.filter(d => d.cases !== null);
    
    if (historicalOnly.length > 0) {
      const latestData = historicalOnly[historicalOnly.length - 1];
      const prevData = historicalOnly[historicalOnly.length - 2];
      
      const sumCasesYesterday = latestData.cases;
      metricDailyCases.innerText = sumCasesYesterday.toLocaleString();

      // Cumulative
      const sumCumulative = historicalOnly.reduce((sum, d) => sum + d.cases, 0);
      metricCumulative.innerText = sumCumulative.toLocaleString();

      // Aggregate Change % Calculation
      if (prevData && prevData.cases > 0) {
        const diff = sumCasesYesterday - prevData.cases;
        const changePct = round(((diff) / prevData.cases) * 100.0, 1);
        
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
      } else {
        metricDailyChange.innerText = 'STABLE (0.0%)';
      }
    } else {
      metricDailyCases.innerText = '--';
      metricDailyChange.innerText = '--';
      metricCumulative.innerText = '--';
    }

    // 3. Alerts & Risk Profile calculation
    updateAlertsSection();
    
    // 4. Update dynamic chart rendering
    updateChartData(aggregatedReportedSeries, pathogen.name);
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
    
    const countriesOfSelectedCities = [
      ...new Set(appData.metadata.cities.filter(c => selectedCityIds.includes(c.id)).map(c => c.country))
    ];
    
    let filteredAlerts = [];
    if (currentAlertFilter === 'local') {
      filteredAlerts = appData.alerts.filter(alert => {
        // City matches active checked cohort
        if (selectedCityIds.includes(alert.city)) return true;
        // Matches national warnings of active cohort countries
        if (alert.city === 'All' && countriesOfSelectedCities.includes(alert.country)) return true;
        // Global alert
        if (alert.city === 'All' && alert.country === 'Global') return true;
        return false;
      });
    } else {
      filteredAlerts = appData.alerts;
    }

    const localAlerts = appData.alerts.filter(alert => 
      selectedCityIds.includes(alert.city) || (alert.city === 'All' && countriesOfSelectedCities.includes(alert.country))
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
      const isCityMatch = selectedCityIds.includes(alert.city);
      
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

      const alertElement = document.createElement('a');
      alertElement.href = alert.link || '#';
      alertElement.target = '_blank';
      alertElement.rel = 'noopener noreferrer';
      alertElement.className = `alert-strip ${alertClass} p-3.5 rounded-sm flex flex-col md:flex-row md:items-start justify-between gap-3 ${highlightBorder} hover:border-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer block`;
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

    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false // Using custom legends in HTML or chart tools
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

  function getCityColor(cityId) {
    const idx = appData.metadata.cities.findIndex(c => c.id === cityId);
    return COLOR_PALETTE[idx % COLOR_PALETTE.length];
  }

  function updateChartData(aggregatedSeries, pathogenName) {
    if (!trendChart) return;

    // Define X-Axis Dates Labels
    const labels = aggregatedSeries.map(d => {
      const dateParts = d.date.split('-');
      if (dateParts.length === 3) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const m = parseInt(dateParts[1]) - 1;
        return `${months[m]} ${parseInt(dateParts[2])}`;
      }
      return d.date;
    });
    
    trendChart.data.labels = labels;
    
    const isDark = document.documentElement.classList.contains('dark');
    const primaryColor = isDark ? '#3b82f6' : '#2563eb';
    const modelLineColor = isDark ? '#52525b' : '#a1a1aa';

    // Clear old datasets
    trendChart.data.datasets = [];

    // CASE 1: Aggregate All View (If all 16 cities selected)
    if (selectedCityIds.length === appData.metadata.cities.length) {
      trendChart.data.datasets.push(
        {
          label: 'All Cities (Reported)',
          data: aggregatedSeries.map(d => d.cases),
          borderColor: primaryColor,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 5,
          fill: false,
          tension: 0.15
        },
        {
          label: 'All Cities (Model Projection)',
          data: aggregatedSeries.map(d => d.model_projected),
          borderColor: modelLineColor,
          borderWidth: 1.5,
          borderDash: [5, 5],
          pointRadius: 0,
          pointHoverRadius: 4,
          fill: false,
          tension: 0.15
        }
      );
    } 
    // CASE 2: Comparative Cohort View
    else {
      // Loop over each selected city and add a distinct line
      selectedCityIds.forEach(cityId => {
        const cityObj = appData.metadata.cities.find(c => c.id === cityId);
        const cityColor = getCityColor(cityId);
        const cityTrends = appData.trends[cityId][selectedPathogenId] || [];
        
        // Add Reported dataset
        trendChart.data.datasets.push({
          label: `${cityObj.name} (Reported)`,
          data: cityTrends.map(d => d.cases),
          borderColor: cityColor,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          fill: false,
          tension: 0.15
        });

        // HIDE projections dataset if more than 2 cities are selected to avoid clutter
        if (selectedCityIds.length <= 2) {
          trendChart.data.datasets.push({
            label: `${cityObj.name} (Model Projection)`,
            data: cityTrends.map(d => d.model_projected),
            borderColor: cityColor,
            borderWidth: 1,
            borderDash: [4, 4],
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: false,
            tension: 0.15
          });
        }
      });
    }

    trendChart.update();
  }

  function updateChartColors() {
    if (!trendChart || !appData) return;

    const isDark = document.documentElement.classList.contains('dark');
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(9, 9, 11, 0.04)';
    const textColor = isDark ? '#a1a1aa' : '#52525b';

    trendChart.options.scales.x.ticks.color = textColor;
    trendChart.options.scales.y.ticks.color = textColor;
    trendChart.options.scales.y.grid.color = gridColor;

    trendChart.options.plugins.tooltip.backgroundColor = isDark ? '#121215' : '#ffffff';
    trendChart.options.plugins.tooltip.titleColor = isDark ? '#fafafa' : '#09090b';
    trendChart.options.plugins.tooltip.bodyColor = isDark ? '#a1a1aa' : '#52525b';
    trendChart.options.plugins.tooltip.borderColor = isDark ? '#27272a' : '#e4e4e7';

    // Refresh display
    updateView();
  }

  function round(value, decimals) {
    return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
  }
});
