const tempEl = document.getElementById("temp");
const humidityEl = document.getElementById("humidity");
const pollutionEl = document.getElementById("pollution");
const locationDisplay = document.getElementById("locationDisplay");
const loaderOverlay = document.getElementById("loaderOverlay");

const ctx = document.getElementById('pollutionChart').getContext('2d');
let pollutionChart = null;
let autoUpdateInterval = null;

function getAQIColor(aqi) {
  if (aqi <= 50) return "#22c55e";
  if (aqi <= 100) return "#eab308";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#ef4444";
  if (aqi <= 300) return "#a855f7";
  return "#7f1d1d";
}

function fetchAndDisplayData(lat, lon) {
  // Get temperature + humidity
  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m`)
    .then(res => res.json())
    .then(data => {
      tempEl.innerText = `${data.current.temperature_2m}°C`;
      humidityEl.innerText = `${data.current.relative_humidity_2m}% RH`;
    });

  // Get AQI + Location Name
  fetch(`https://api.waqi.info/feed/geo:${lat};${lon}/?token=76e5c18be7f15ab93056ce19d4bf138e36a88b2c`)
    .then(res => res.json())
    .then(data => {
      if (data.status !== "ok") throw new Error("Invalid AQI data");
      const aqi = data.data.aqi;

      // Get readable location
      fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=260a64dd6cde4288ae57e307fdab46fa`)
        .then(res => res.json())
        .then(locData => {
          const prop = locData.features[0]?.properties || {};
          const locality = prop.suburb || prop.city || prop.town || prop.county || prop.state || "Unknown Location";
          const state = prop.state || "";
          const fullLocation = state && locality !== state ? `${locality}, ${state}` : locality;
          locationDisplay.innerText = `📍 Location: ${fullLocation}`;

          // Remove loader AFTER all data is loaded
          loaderOverlay?.classList.add("fade-out");

          // Build AQI Chart
          if (pollutionChart) pollutionChart.destroy();

          const now = new Date();
          const labels = [];
          const dataPoints = [];
          for (let i = 5; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 5000).toLocaleTimeString();
            labels.push(time);
            dataPoints.push(aqi);
          }

          const color = getAQIColor(aqi);
          pollutionChart = new Chart(ctx, {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                label: 'AQI (Air Quality Index)',
                data: dataPoints,
                borderColor: color,
                backgroundColor: color + "22",
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

          pollutionEl.innerText = `${aqi} AQI`;
          updateAQIAdvice(aqi);

          // Live update every 5s
          if (autoUpdateInterval) clearInterval(autoUpdateInterval);
          autoUpdateInterval = setInterval(() => {
            fetch(`https://api.waqi.info/feed/geo:${lat};${lon}/?token=76e5c18be7f15ab93056ce19d4bf138e36a88b2c`)
              .then(res => res.json())
              .then(data => {
                if (data.status === "ok") {
                  const newAQI = data.data.aqi;
                  const time = new Date().toLocaleTimeString();
                  const newColor = getAQIColor(newAQI);

                  pollutionChart.data.labels.push(time);
                  pollutionChart.data.datasets[0].data.push(newAQI);
                  pollutionChart.data.datasets[0].borderColor = newColor;
                  pollutionChart.data.datasets[0].backgroundColor = newColor + "22";

                  if (pollutionChart.data.labels.length > 20) {
                    pollutionChart.data.labels.shift();
                    pollutionChart.data.datasets[0].data.shift();
                  }

                  pollutionChart.update();
                  pollutionEl.innerText = `${newAQI} AQI`;
                  updateAQIAdvice(newAQI);
                }
              });
          }, 5000);
        });
    })
    .catch(err => {
      console.error("AQI Fetch Error:", err);
      locationDisplay.innerText = `📍 Location: Delhi (Fallback)`;
      updateAQIAdvice(183);
      showErrorAdvice("⚠️ Unable to fetch AQI. Showing default data.");
      loaderOverlay?.classList.add("fade-out");
    });
}

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

function showErrorAdvice(msg) {
  document.getElementById("aqi-level-heading").innerText = "Error fetching AQI";
  document.getElementById("aqi-advice").innerText = msg;
  document.getElementById("aqi-tips").innerHTML = "<li>Please check API key or network.</li>";
  document.getElementById("aqi-advice-box").style.borderLeft = `4px solid #ef4444`;
}

function triggerLocation() {
  loaderOverlay?.classList.remove("fade-out");
  loaderOverlay.style.display = "flex";

  navigator.geolocation.getCurrentPosition(
    pos => {
      document.getElementById("locationModal").style.display = 'none';
      fetchAndDisplayData(pos.coords.latitude, pos.coords.longitude);
    },
    () => {
      alert("⚠️ Location access denied.");
      loaderOverlay?.classList.add("fade-out");
    }
  );
}


// Load on page start
navigator.permissions.query({ name: 'geolocation' }).then(result => {
  if (result.state === 'granted') {
    navigator.geolocation.getCurrentPosition(pos =>
      fetchAndDisplayData(pos.coords.latitude, pos.coords.longitude)
    );
  } else {
    document.getElementById("locationModal").style.display = 'flex';
  }
});

// Detect Button (manual trigger)
document.getElementById("detectBtn").addEventListener("click", triggerLocation);

// Manual search
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
        
          loaderOverlay?.classList.remove("fade-out");
          loaderOverlay.style.display = "flex";
        
          fetchAndDisplayData(loc.geometry.coordinates[1], loc.geometry.coordinates[0]);
        };
        
        suggestions.appendChild(li);
      });
    });
});

document.addEventListener("click", e => {
  if (!e.target.closest(".search-container")) {
    suggestions.innerHTML = "";
  }
});


const micBtn = document.getElementById("micBtn");
const manualInput = document.getElementById("manualLocation");

let recognition;
if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-IN';

  micBtn.addEventListener("click", () => {
    recognition.start();
    micBtn.classList.add("listening");
    micBtn.innerText = "🔴";
  });

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    manualInput.value = transcript;
    manualInput.dispatchEvent(new Event("input"));
  };

  recognition.onerror = function () {
    alert("⚠️ Voice recognition failed.");
  };

  recognition.onend = function () {
    micBtn.classList.remove("listening");
    micBtn.innerText = "🎤";
  };
} else {
  micBtn.style.display = "none";
}

window.addEventListener("DOMContentLoaded", () => {
  navigator.permissions.query({ name: 'geolocation' }).then(result => {
    if (result.state === 'granted') {
      loaderOverlay.style.display = "flex";
      navigator.geolocation.getCurrentPosition(pos =>
        fetchAndDisplayData(pos.coords.latitude, pos.coords.longitude)
      );
    } else if (result.state === 'denied') {
      document.getElementById("locationModal").style.display = 'flex';
      loaderOverlay.style.display = "none";
    } else {
      loaderOverlay.style.display = "none"; // 👈 Prevent loader on prompt
      navigator.geolocation.getCurrentPosition(
        pos => {
          loaderOverlay.style.display = "flex";
          fetchAndDisplayData(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          document.getElementById("locationModal").style.display = 'flex';
        }
      );
    }
  });
});
