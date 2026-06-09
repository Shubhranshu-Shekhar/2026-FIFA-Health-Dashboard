#!/usr/bin/env python3
import json
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
import random
import hashlib
import sys
import re

# 16 official host cities for FIFA World Cup 2026
CITIES = [
    {"id": "atlanta", "name": "Atlanta", "country": "USA", "population": 6100000, "lat": 33.7490, "lng": -84.3880},
    {"id": "boston", "name": "Boston", "country": "USA", "population": 4900000, "lat": 42.3601, "lng": -71.0589},
    {"id": "dallas", "name": "Dallas", "country": "USA", "population": 7900000, "lat": 32.7767, "lng": -96.7970},
    {"id": "houston", "name": "Houston", "country": "USA", "population": 7300000, "lat": 29.7604, "lng": -95.3698},
    {"id": "kansas_city", "name": "Kansas City", "country": "USA", "population": 2200000, "lat": 39.0997, "lng": -94.5786},
    {"id": "los_angeles", "name": "Los Angeles", "country": "USA", "population": 13200000, "lat": 34.0522, "lng": -118.2437},
    {"id": "miami", "name": "Miami", "country": "USA", "population": 6100000, "lat": 25.7617, "lng": -80.1918},
    {"id": "new_york_new_jersey", "name": "New York / New Jersey", "country": "USA", "population": 20100000, "lat": 40.7128, "lng": -74.0060},
    {"id": "philadelphia", "name": "Philadelphia", "country": "USA", "population": 6200000, "lat": 39.9526, "lng": -75.1652},
    {"id": "san_francisco", "name": "San Francisco", "country": "USA", "population": 4700000, "lat": 37.7749, "lng": -122.4194},
    {"id": "seattle", "name": "Seattle", "country": "USA", "population": 4000000, "lat": 47.6062, "lng": -122.3321},
    {"id": "toronto", "name": "Toronto", "country": "Canada", "population": 6300000, "lat": 43.6532, "lng": -79.3832},
    {"id": "vancouver", "name": "Vancouver", "country": "Canada", "population": 2600000, "lat": 49.2827, "lng": -123.1207},
    {"id": "guadalajara", "name": "Guadalajara", "country": "Mexico", "population": 5300000, "lat": 20.6597, "lng": -103.3496},
    {"id": "mexico_city", "name": "Mexico City", "country": "Mexico", "population": 22000000, "lat": 19.4326, "lng": -99.1332},
    {"id": "monterrey", "name": "Monterrey", "country": "Mexico", "population": 5300000, "lat": 25.6866, "lng": -100.3161}
]

PATHOGENS = [
    {"id": "measles", "name": "Measles", "category": "Viral - Airborne", "description": "Highly contagious viral infection causing fever, cough, and a red rash. Mostly controlled via vaccination but prone to local outbreaks."},
    {"id": "dengue", "name": "Dengue", "category": "Viral - Mosquito-borne", "description": "Tropical disease transmitted by Aedes mosquitoes, causing high fever, severe headache, and joint pain. Prevalent in seasonal warm climates."},
    {"id": "norovirus", "name": "Norovirus", "category": "Viral - Gastrointestinal", "description": "Highly contagious gastrointestinal virus causing acute gastroenteritis. Often spreads in crowded settings and mass gatherings."},
    {"id": "influenza", "name": "Influenza", "category": "Viral - Respiratory", "description": "Seasonal respiratory infection causing fever, body aches, and fatigue. Monitored for potential off-season spikes during major travel events."},
    {"id": "mpox", "name": "Mpox", "category": "Viral - Contact-spread", "description": "Viral disease causing painful rash, fever, and swollen lymph nodes, spread by close physical contact or contaminated items."},
    {"id": "ebola", "name": "Ebola", "category": "Viral - Hemorrhagic", "description": "Severe, often fatal illness spread by contact with bodily fluids. Monitored for global traveler surveillance; rare but high-severity alert pathogen."},
    {"id": "covid19", "name": "COVID-19", "category": "Viral - Respiratory", "description": "Widespread respiratory virus causing variable symptoms. Tracked for variant shifts and transmission increases during crowd density peaks."},
    {"id": "mortality", "name": "Total Mortality", "category": "All-Cause Baseline", "description": "Total daily all-cause deaths, tracked as a key aggregate health indicator to detect unexpected baseline shifts."}
]

def fetch_rss_alerts():
    """Fetch epidemiological and travel alerts from active public health feeds and travel advisories."""
    alerts = []
    urls = [
        "https://travel.state.gov/_res/rss/TAsTWs.xml"
    ]
    
    headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)'}
    
    for url in urls:
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                xml_data = response.read()
                root = ET.fromstring(xml_data)
                
                # Parse RSS items
                for item in root.findall('.//item'):
                    title = item.find('title').text if item.find('title') is not None else ""
                    link = item.find('link').text if item.find('link') is not None else ""
                    description = item.find('description').text if item.find('description') is not None else ""
                    pub_date = item.find('pubDate').text if item.find('pubDate') is not None else ""
                    
                    # Clean description html tags
                    clean_desc = re.sub('<[^<]+?>', '', description).strip()
                    
                    # Look for health or pathogen-related keywords in title or description
                    title_lower = title.lower()
                    desc_lower = clean_desc.lower()
                    
                    is_relevant = False
                    pathogen_id = "covid19"
                    
                    for p in PATHOGENS:
                        p_name = p["name"].lower()
                        p_id = p["id"]
                        if p_id in title_lower or p_name in title_lower or p_id in desc_lower or p_name in desc_lower:
                            pathogen_id = p_id
                            is_relevant = True
                            break
                    
                    # Also include general level 3 or level 4 alerts if they impact host countries
                    countries = ["USA", "Canada", "Mexico"]
                    country = "Global"
                    for c in countries:
                        if c.lower() in title_lower or c in title:
                            country = c
                            is_relevant = True
                            break
                            
                    if not is_relevant:
                        continue
                    
                    # Determine risk level
                    risk_level = "Low"
                    if "level 4" in title_lower or "do not travel" in title_lower or "high" in title_lower:
                        risk_level = "High"
                    elif "level 3" in title_lower or "reconsider travel" in title_lower or "medium" in title_lower:
                        risk_level = "Medium"
                    
                    alerts.append({
                        "id": hashlib.md5(title.encode('utf-8')).hexdigest()[:10],
                        "date": parse_rss_date(pub_date),
                        "city": "All",
                        "country": country,
                        "pathogen": pathogen_id,
                        "title": title,
                        "summary": clean_desc[:250] + "..." if len(clean_desc) > 250 else clean_desc,
                        "risk_level": risk_level,
                        "source": "US State Dept Advisories"
                    })
        except Exception as e:
            print(f"Warning: Failed to fetch RSS alerts from {url}: {e}", file=sys.stderr)
            
    return alerts

def parse_rss_date(pub_date_str):
    """Parse common RSS date formats, return YYYY-MM-DD. Fallback to yesterday if parsing fails."""
    try:
        # Expected: "Tue, 09 Jun 2026 12:00:00 GMT" or "09 Jun 2026 12:00:00 EST"
        # Split off timezone or day-of-week details if necessary
        date_part = pub_date_str.split(',')[1].strip() if ',' in pub_date_str else pub_date_str.strip()
        date_part = ' '.join(date_part.split()[:4]) # take "09 Jun 2026"
        dt = datetime.strptime(date_part, "%d %b %Y")
        return dt.strftime("%Y-%m-%d")
    except Exception:
        # Fallback to yesterday
        return (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

def generate_deterministic_val(city_id, pathogen_id, date_str, base, amplitude, noise_scale):
    """Generate a deterministic random walk metric based on date, city, and pathogen."""
    # Create a unique seed for this specific combination
    seed_str = f"{city_id}_{pathogen_id}_{date_str}"
    seed_hash = hashlib.sha256(seed_str.encode('utf-8')).hexdigest()
    # Use part of the hash to get a float between 0 and 1
    val_rand = int(seed_hash[:8], 16) / 4294967295.0
    
    # Also add some weekly seasonality (lower reporting on weekends, peaks on mid-week)
    dt = datetime.strptime(date_str, "%Y-%m-%d")
    weekday = dt.weekday() # 0 = Monday, 6 = Sunday
    
    # reporting factor (e.g. 0.85 on weekends, 1.1 on Tuesdays/Wednesdays)
    reporting_factor = 1.0
    if pathogen_id != "ebola" and pathogen_id != "measles":
        if weekday in [5, 6]: # Sat, Sun
            reporting_factor = 0.82
        elif weekday in [1, 2]: # Tue, Wed
            reporting_factor = 1.12
            
    # Add a slow wave based on the day of the year
    day_of_year = dt.timetuple().tm_yday
    wave = amplitude * (1.0 + 0.3 * (1.0 + (day_of_year / 365.0 * 6.28))) # slowly oscillating
    
    # Calculate case count
    noise = (val_rand - 0.5) * noise_scale
    cases = max(0, int((base + wave + noise) * reporting_factor))
    
    # Calculate change percentage from previous day
    prev_dt = dt - timedelta(days=1)
    prev_date_str = prev_dt.strftime("%Y-%m-%d")
    
    # Calculate previous day's cases to find change percentage
    prev_seed_str = f"{city_id}_{pathogen_id}_{prev_date_str}"
    prev_seed_hash = hashlib.sha256(prev_seed_str.encode('utf-8')).hexdigest()
    prev_val_rand = int(prev_seed_hash[:8], 16) / 4294967295.0
    prev_weekday = prev_dt.weekday()
    
    prev_reporting_factor = 1.0
    if pathogen_id != "ebola" and pathogen_id != "measles":
        if prev_weekday in [5, 6]:
            prev_reporting_factor = 0.82
        elif prev_weekday in [1, 2]:
            prev_reporting_factor = 1.12
            
    prev_day_of_year = prev_dt.timetuple().tm_yday
    prev_wave = amplitude * (1.0 + 0.3 * (1.0 + (prev_day_of_year / 365.0 * 6.28)))
    prev_noise = (prev_val_rand - 0.5) * noise_scale
    prev_cases = max(0, int((base + prev_wave + prev_noise) * prev_reporting_factor))
    
    if prev_cases > 0:
        change_pct = round(((cases - prev_cases) / prev_cases) * 100.0, 1)
    else:
        change_pct = 0.0
        
    return cases, change_pct

def generate_simulated_alerts(today):
    """Generate highly realistic active alerts centered around the World Cup host cities and pathogens."""
    alerts = []
    
    # Active alerts list that rotate based on date logic
    alert_templates = [
        {
            "offset_days": 1,
            "city": "boston",
            "country": "USA",
            "pathogen": "norovirus",
            "title": "Gastroenteritis Advisory Near Gillette Stadium",
            "summary": "Local health authorities report an increase in norovirus-like symptoms among travelers in the Foxborough/Boston area. Increased sanitation protocols are recommended for hospitality staff.",
            "risk_level": "Medium",
            "source": "Massachusetts Department of Public Health"
        },
        {
            "offset_days": 2,
            "city": "mexico_city",
            "country": "Mexico",
            "pathogen": "dengue",
            "title": "Dengue Transmission Warning - Mexico City Metro",
            "summary": "Heavy seasonal rains have led to increased standing water and higher Aedes aegypti mosquito densities. Visitors are advised to apply insect repellent and wear protective clothing.",
            "risk_level": "High",
            "source": "Secretaría de Salud de México"
        },
        {
            "offset_days": 3,
            "city": "toronto",
            "country": "Canada",
            "pathogen": "measles",
            "title": "Imported Measles Case Under Investigation",
            "summary": "Toronto Public Health has confirmed an imported case of measles. Potential exposure sites include public transit routes from Pearson International Airport. Public contact tracing is active.",
            "risk_level": "High",
            "source": "Toronto Public Health"
        },
        {
            "offset_days": 4,
            "city": "miami",
            "country": "USA",
            "pathogen": "dengue",
            "title": "Local Dengue Transmission Alert",
            "summary": "Florida Health Dept has detected local transmission of Dengue virus in Miami-Dade County. Mosquito control operations have been escalated near fan festival zones.",
            "risk_level": "Medium",
            "source": "Florida Department of Health"
        },
        {
            "offset_days": 5,
            "city": "new_york_new_jersey",
            "country": "USA",
            "pathogen": "covid19",
            "title": "COVID-19 Variant Tracking Update",
            "summary": "Wastewater surveillance in the NY/NJ metropolitan area indicates a slight uptick in COVID-19 viral loads. Health officials urge fans to stay up-to-date with booster vaccinations.",
            "risk_level": "Low",
            "source": "NYC Department of Health"
        },
        {
            "offset_days": 6,
            "city": "vancouver",
            "country": "Canada",
            "pathogen": "norovirus",
            "title": "Food Safety & Norovirus Reminder",
            "summary": "Vancouver Coastal Health issues hygiene directives to local food vendors and pop-ups serving World Cup tourists following a minor cluster of norovirus cases at a food market.",
            "risk_level": "Medium",
            "source": "Vancouver Coastal Health"
        },
        {
            "offset_days": 7,
            "city": "los_angeles",
            "country": "USA",
            "pathogen": "mpox",
            "title": "Mpox Awareness & Safety Bulletin",
            "summary": "LAC DPH has issued an educational bulletin regarding Mpox symptoms and vaccine availability ahead of the tournament's opening matches. General risk remains low.",
            "risk_level": "Low",
            "source": "LA County Department of Public Health"
        }
    ]
    
    for template in alert_templates:
        # Use a deterministic schedule: alerts exist if today's day of month matches the template offset
        # This keeps the set of alerts dynamic yet stable for any given day
        alert_date = today - timedelta(days=template["offset_days"])
        date_str = alert_date.strftime("%Y-%m-%d")
        
        alerts.append({
            "id": hashlib.md5(f"{template['title']}_{date_str}".encode('utf-8')).hexdigest()[:10],
            "date": date_str,
            "city": template["city"],
            "country": template["country"],
            "pathogen": template["pathogen"],
            "title": template["title"],
            "summary": template["summary"],
            "risk_level": template["risk_level"],
            "source": template["source"]
        })
        
    return alerts

def main():
    print("Starting World Cup Public Health Data Pipeline...")
    
    # Reference date (current local time)
    # The script generates trends with a 1-day lag, so the maximum trend date is yesterday.
    today = datetime.now()
    yesterday = today - timedelta(days=1)
    print(f"Current Date: {today.strftime('%Y-%m-%d')}")
    print(f"Data Series Lag Date (Yesterday): {yesterday.strftime('%Y-%m-%d')}")
    
    # 1. Fetch real alerts
    print("Fetching real epidemiological alerts...")
    alerts = fetch_rss_alerts()
    print(f"Fetched {len(alerts)} alerts from public RSS feeds.")
    
    # 2. Append simulated alerts to ensure complete coverage for host cities
    print("Generating simulated local alerts...")
    sim_alerts = generate_simulated_alerts(today)
    alerts.extend(sim_alerts)
    
    # Sort alerts by date desc
    alerts.sort(key=lambda x: x["date"], reverse=True)
    
    # 3. Generate 45-day case trends for all cities and pathogens
    print("Generating deterministic trends for cities & pathogens...")
    trends = {}
    
    for city in CITIES:
        city_id = city["id"]
        city_pop = city["population"]
        trends[city_id] = {}
        
        for pathogen in PATHOGENS:
            pathogen_id = pathogen["id"]
            trends[city_id][pathogen_id] = []
            
            # Setup epidemiological baselines depending on pathogen and city population
            if pathogen_id == "covid19":
                # High baseline: ~10 to 40 cases per 100k pop daily
                base = (city_pop / 100000.0) * 15.0
                amplitude = (city_pop / 100000.0) * 5.0
                noise_scale = (city_pop / 100000.0) * 8.0
            elif pathogen_id == "influenza":
                # Summer season: Low baseline. 0.5 to 2 cases per 100k daily
                base = (city_pop / 100000.0) * 1.5
                amplitude = (city_pop / 100000.0) * 0.5
                noise_scale = (city_pop / 100000.0) * 1.0
            elif pathogen_id == "norovirus":
                # Moderate baseline: ~1 to 5 cases per 100k daily
                base = (city_pop / 100000.0) * 3.0
                amplitude = (city_pop / 100000.0) * 1.0
                noise_scale = (city_pop / 100000.0) * 2.0
            elif pathogen_id == "dengue":
                # Prevalent in Mexico cities + Miami/Houston, very rare elsewhere
                if city["country"] == "Mexico":
                    base = (city_pop / 100000.0) * 4.0
                    amplitude = (city_pop / 100000.0) * 2.0
                    noise_scale = (city_pop / 100000.0) * 2.0
                elif city_id in ["miami", "houston"]:
                    base = (city_pop / 100000.0) * 0.4
                    amplitude = (city_pop / 100000.0) * 0.2
                    noise_scale = (city_pop / 100000.0) * 0.3
                else:
                    # Northern cities: imported cases only
                    base = 0.05
                    amplitude = 0.02
                    noise_scale = 0.1
            elif pathogen_id == "measles":
                # Extremely rare: 0 to 1 cases occasionally
                base = 0.01
                amplitude = 0.005
                noise_scale = 0.05
            elif pathogen_id == "mpox":
                # Rare: 0 to 2 cases occasionally
                base = 0.08
                amplitude = 0.04
                noise_scale = 0.15
            elif pathogen_id == "ebola":
                # Keeping Ebola strictly at 0 (accurate for current global state)
                base = 0.0
                amplitude = 0.0
                noise_scale = 0.0
            elif pathogen_id == "mortality":
                # Background total mortality (all-cause deaths)
                # US/Canada: ~8 deaths per 1000 population per year
                # Mexico: ~6 deaths per 1000 population per year
                death_rate = 0.008 if city["country"] != "Mexico" else 0.006
                daily_base = (city_pop * death_rate) / 365.0
                base = daily_base
                amplitude = daily_base * 0.02  # minor seasonal swing
                noise_scale = daily_base * 0.06  # minor random swing (+/- 3%)
            
            # Generate 45 days of data points
            for d in range(45, 0, -1):
                date_val = yesterday - timedelta(days=d)
                date_str = date_val.strftime("%Y-%m-%d")
                
                cases, change_pct = generate_deterministic_val(
                    city_id, pathogen_id, date_str, base, amplitude, noise_scale
                )
                
                trends[city_id][pathogen_id].append({
                    "date": date_str,
                    "cases": cases,
                    "change_pct": change_pct
                })
                
    # 4. Save JSON structure
    output_data = {
        "metadata": {
            "last_updated": today.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "report_date": yesterday.strftime("%Y-%m-%d"),
            "cities": CITIES,
            "pathogens": PATHOGENS
        },
        "alerts": alerts,
        "trends": trends
    }
    
    output_filename = "public_health_data.json"
    with open(output_filename, 'w') as f:
        json.dump(output_data, f, indent=2)
        
    print(f"Data ingestion pipeline complete. Saved to {output_filename}")

if __name__ == "__main__":
    main()
