const tempEl = document.getElementById("temp");
const humidityEl = document.getElementById("humidity");
const pollutionEl = document.getElementById("pollution");
const locationDisplay = document.getElementById("locationDisplay");

// Chart Setup
const ctx = document.getElementById('pollutionChart').getContext('2d');
const pollutionChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [],
    datasets: [{
      label: 'AQI (Air Quality Index)',
      data: [],
      borderColor: '#e11d48',
      backgroundColor: 'rgba(225, 29, 72, 0.1)',
      tension: 0.4,
      fill: true
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
        suggestedMax: 300
      }
    }
  }
});

// ✅ Fetch Weather + AQI + Real Location Name
function fetchAndDisplayData(lat, lon) {
  // Temperature + Humidity
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`)
    .then(res => res.json())
    .then(data => {
      tempEl.innerText = `${data.current.temperature_2m}°C`;
      humidityEl.innerText = `${data.current.relative_humidity_2m}% RH`;
    });

  // AQI + Location
  fetch(`https://api.waqi.info/feed/geo:${lat};${lon}/?token=demo`)
    .then(res => res.json())
    .then(data => {
      if (data.status !== "ok") throw new Error("Invalid AQI data");
      const aqi = data.data.aqi;

      // Real readable location via Geoapify
      fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=260a64dd6cde4288ae57e307fdab46fa`)
        .then(res => res.json())
        .then(locData => {
          const prop = locData.features[0]?.properties || {};
          const locality = prop.suburb || prop.city || prop.town || prop.county || prop.state || "Unknown Location";
          const state = prop.state || "";
          const fullLocation = state && locality !== state ? `${locality}, ${state}` : locality;
          locationDisplay.innerText = `📍 Location: ${fullLocation}`;
          updateChart(aqi);
        });
    })
    .catch(err => {
      const fallbackAQI = 183;
      locationDisplay.innerText = `📍 Location: Delhi (Fallback)`;
      updateChart(fallbackAQI);
      showErrorAdvice("⚠️ Unable to fetch AQI. Showing default data.");
    });
}


function triggerLocation() {
  navigator.geolocation.getCurrentPosition(
    pos => {
      document.getElementById("locationModal").style.display = 'none';
      fetchAndDisplayData(pos.coords.latitude, pos.coords.longitude);
    },
    err => {
      alert("❌ Location access denied or not available.");
    }
  );
}

// ✅ Update Chart + Display AQI
function updateChart(aqi) {
  const time = new Date().toLocaleTimeString();
  const adjustedAQI = Math.max(0, aqi + Math.round(Math.random() * 10 - 5));

  if (pollutionChart.data.labels.length > 10) {
    pollutionChart.data.labels.shift();
    pollutionChart.data.datasets[0].data.shift();
  }

  pollutionChart.data.labels.push(time);
  pollutionChart.data.datasets[0].data.push(adjustedAQI);
  pollutionChart.update();

  pollutionEl.innerText = `${adjustedAQI} AQI`;
  updateAQIAdvice(adjustedAQI);
}

// ✅ AQI Health Advisory Logic
function updateAQIAdvice(aqi) {
  const box = document.getElementById("aqi-advice-box");
  const heading = document.getElementById("aqi-level-heading");
  const adviceEl = document.getElementById("aqi-advice");
  const tips = document.getElementById("aqi-tips");

  let level = "", message = "", color = "", tipsHTML = "";

  if (aqi <= 50) {
    level = "🟢 Good"; color = "#22c55e"; message = "Air quality is clean and healthy."; tipsHTML = `<li>✅ Great time for outdoor activity.</li>`;
  } else if (aqi <= 100) {
    level = "🟡 Moderate"; color = "#eab308"; message = "Acceptable, but sensitive groups may feel mild effects."; tipsHTML = `<li>😷 Sensitive people should avoid long outdoor exposure.</li>`;
  } else if (aqi <= 150) {
    level = "🟠 Unhealthy for Sensitive Groups"; color = "#f97316"; message = "Limit outdoor activity if you have asthma or allergies."; tipsHTML = `<li>👵 Elderly and children should remain indoors.</li>`;
  } else if (aqi <= 200) {
    level = "🔴 Unhealthy"; color = "#ef4444"; message = "Everyone may experience health effects."; tipsHTML = `<li>🚫 Avoid outdoor exercise or travel.</li>`;
  } else if (aqi <= 300) {
    level = "🟣 Very Unhealthy"; color = "#a855f7"; message = "Serious health risks. Avoid any exposure."; tipsHTML = `<li>❗ Stay indoors with filtration.</li>`;
  } else {
    level = "⚫ Hazardous"; color = "#7f1d1d"; message = "Health emergency. Stay indoors completely."; tipsHTML = `<li>🚨 Do not go outside.</li>`;
  }

  heading.innerText = `${level} – ${aqi} AQI`;
  heading.style.color = color;
  adviceEl.innerText = message;
  box.style.borderLeft = `4px solid ${color}`;
  tips.innerHTML = tipsHTML;
}

// ✅ Error Fallback for AQI
function showErrorAdvice(msg) {
  document.getElementById("aqi-level-heading").innerText = "Error fetching AQI";
  document.getElementById("aqi-advice").innerText = msg;
  document.getElementById("aqi-tips").innerHTML = "<li>Please check API key or network.</li>";
  document.getElementById("aqi-advice-box").style.borderLeft = `4px solid #ef4444`;
}

// ✅ On Page Load — Ask for Location
navigator.permissions.query({ name: 'geolocation' }).then(result => {
  if (result.state === 'granted') {
    navigator.geolocation.getCurrentPosition(pos =>
      fetchAndDisplayData(pos.coords.latitude, pos.coords.longitude)
    );
  } else {
    document.getElementById("locationModal").style.display = 'flex';
  }
});

// ✅ "Detect My Location" Button
document.getElementById("detectBtn").addEventListener("click", () => {
  navigator.geolocation.getCurrentPosition(
    pos => {
      document.getElementById("locationModal").style.display = 'none';
      fetchAndDisplayData(pos.coords.latitude, pos.coords.longitude);
    },
    () => alert("⚠️ Location access denied.")
  );
});

// ✅ Geoapify Manual Search
const GEOAPIFY_KEY = "260a64dd6cde4288ae57e307fdab46fa";
const input = document.getElementById("manualLocation");
const suggestions = document.getElementById("suggestions");

input.addEventListener("input", () => {
  const query = input.value.trim();
  if (query.length < 2) return suggestions.innerHTML = "";

  fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&limit=5&apiKey=${GEOAPIFY_KEY}`)
    .then(res => res.json())
    .then(data => {
      suggestions.innerHTML = "";
      data.features.forEach(loc => {
        const li = document.createElement("li");
        li.textContent = loc.properties.formatted;
        li.onclick = () => {
          input.value = loc.properties.formatted;
          suggestions.innerHTML = "";
          fetchAndDisplayData(loc.geometry.coordinates[1], loc.geometry.coordinates[0]);
        };
        suggestions.appendChild(li);
      });
    });
});



// Hide suggestions outside click
document.addEventListener("click", e => {
  if (!e.target.closest(".search-container")) {
    suggestions.innerHTML = "";
  }
});
