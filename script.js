
function showTab(id) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// Fake water data (simulate API)
function updateStats() {
  document.getElementById("temp").innerText = (20 + Math.random() * 10).toFixed(1) + "°C";
  document.getElementById("turbidity").innerText = (1 + Math.random() * 5).toFixed(2);
  const pollution = (Math.random() * 100).toFixed(0);
  document.getElementById("pollution").innerText = pollution + "%";
  updateChart(pollution);
}

// Chart.js setup
const ctx = document.getElementById("chart").getContext("2d");
const chart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [{
      label: "Pollution Index",
      data: [],
      borderColor: "#1e3a8a",
      tension: 0.4
    }]
  },
  options: {
    scales: {
      y: { beginAtZero: true, max: 100 }
    }
  }
});

function updateChart(data) {
  const now = new Date().toLocaleTimeString();
  if (chart.data.labels.length > 10) {
    chart.data.labels.shift();
    chart.data.datasets[0].data.shift();
  }
  chart.data.labels.push(now);
  chart.data.datasets[0].data.push(data);
  chart.update();
}

function askAI() {
  const q = document.getElementById("question").value.toLowerCase();
  let reply = "Water looks safe today.";
  if (q.includes("turbidity")) reply = "High turbidity may indicate dirt or pollution.";
  if (q.includes("drink")) reply = "Avoid drinking directly from source. Use filter.";
  if (q.includes("safe")) reply = "Water is safe if pollution index < 50.";
  document.getElementById("aiReply").innerText = reply;
}

function handleReport(e) {
  e.preventDefault();
  document.getElementById("reportStatus").innerText = "✅ Report submitted (simulated)";
  e.target.reset();
}

setInterval(updateStats, 5000);
updateStats();
