// Initialize Firebase App (already done in firebase_config.js)
const db = firebase.database();
const predictionsRef = db.ref("predictions");

const container = document.getElementById("predictions-container");
const typeFilter = document.getElementById("type-filter");
const latestAnomalyTable = document.getElementById("latest-anomaly-table").querySelector("tbody");

// Chart references
let timeSeriesChart, histogramChart, typeChart, confidenceChart;

// Tab navigation
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and contents
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add active class to current button and corresponding content
        button.classList.add('active');
        document.getElementById(button.dataset.tab).classList.add('active');
    });
});

let allPredictions = [];

// Show loading state
function showLoading() {
    container.innerHTML = "<p class='loading'>Loading predictions...</p>";
    latestAnomalyTable.innerHTML = `
        <tr>
            <td colspan="6" class="loading">Loading data...</td>
        </tr>
    `;
}

// Show error state
function showError(message) {
    container.innerHTML = `<p class='error'>${message}</p>`;
    latestAnomalyTable.innerHTML = `
        <tr>
            <td colspan="6" class="error">${message}</td>
        </tr>
    `;
}

// Initially show loading
showLoading();

// Fetch predictions from Firebase
predictionsRef.on("value", snapshot => {
    try {
        const data = snapshot.val();
        
        // Check if data exists
        if (!data) {
            showError("No prediction data available");
            return;
        }
        
        allPredictions = [];
        
        for (const id in data) {
            allPredictions.push({
                id,
                ...data[id]
            });
        }
        
        // Sort by ETA (soonest first)
        allPredictions.sort((a, b) => new Date(a.eta) - new Date(b.eta));
        
        renderPredictions();
        updateLatestAnomalyTable();
        initializeCharts();
    } catch (error) {
        console.error("Error fetching prediction data:", error);
        showError("Error loading predictions. Please try again later.");
    }
}, error => {
    console.error("Database error:", error);
    showError("Cannot connect to database. Please check your connection.");
});

// Filter change handler
typeFilter.addEventListener("change", renderPredictions);

// Render predictions
function renderPredictions() {
    const filterType = typeFilter.value;
    container.innerHTML = ""; // Clear current display
    
    const filtered = allPredictions.filter(pred => {
        return filterType === "all" || pred.type === filterType;
    });
    
    if (filtered.length === 0) {
        container.innerHTML = "<p class='no-data'>No predictions found.</p>";
        return;
    }
    
    filtered.forEach(pred => {
        const card = document.createElement("div");
        card.className = "anomaly-card";
        
        // Add appropriate class based on type
        card.classList.add(`type-${pred.type}`);
        
        const etaLocal = new Date(pred.eta).toLocaleString();
        const timeToEvent = getTimeToEvent(pred.eta);
        
        card.innerHTML = `
            <h3>Predicted ${capitalize(pred.type)}</h3>
            <div class="confidence-bar">
                <div class="confidence-fill" style="width: ${pred.confidence * 100}%"></div>
                <span>${(pred.confidence * 100).toFixed(1)}%</span>
            </div>
            <p><strong>Location:</strong> ${pred.lat.toFixed(5)}, ${pred.lng.toFixed(5)}</p>
            <p><strong>ETA:</strong> ${etaLocal}</p>
            <p><strong>Time to event:</strong> ${timeToEvent}</p>
            <p class="timestamp"><strong>Predicted on:</strong> ${new Date(pred.timestamp).toLocaleString()}</p>
        `;
        
        container.appendChild(card);
    });
}

function updateLatestAnomalyTable() {
    if (allPredictions.length === 0) {
        latestAnomalyTable.innerHTML = `
            <tr>
                <td colspan="6" class="no-data">No anomalies found</td>
            </tr>
        `;
        return;
    }
    
    // Get the latest prediction
    const latest = allPredictions[0];
    
    // Check if all required properties exist to prevent errors
    if (!latest || !latest.type || !latest.confidence || !latest.lat || !latest.lng || !latest.eta || !latest.timestamp) {
        latestAnomalyTable.innerHTML = `
            <tr>
                <td colspan="6" class="error">Incomplete data format in latest prediction</td>
            </tr>
        `;
        console.error("Incomplete data format:", latest);
        return;
    }
    
    try {
        latestAnomalyTable.innerHTML = `
            <tr class="type-${latest.type}">
                <td>${capitalize(latest.type)}</td>
                <td>${(latest.confidence * 100).toFixed(1)}%</td>
                <td>${latest.lat.toFixed(5)}, ${latest.lng.toFixed(5)}</td>
                <td>${new Date(latest.eta).toLocaleString()}</td>
                <td>${new Date(latest.timestamp).toLocaleString()}</td>
                <td>${latest.additionalData ? latest.additionalData : 'None'}</td>
            </tr>
        `;
    } catch (error) {
        console.error("Error updating latest anomaly table:", error, latest);
        latestAnomalyTable.innerHTML = `
            <tr>
                <td colspan="6" class="error">Error displaying latest anomaly data</td>
            </tr>
        `;
    }
}

function initializeCharts() {
    if (allPredictions.length === 0) return;

    try {
        createTimeSeriesChart();
        createHistogramChart();
        createTypeChart();
        createConfidenceChart();
    } catch (error) {
        console.error("Error initializing charts:", error);
    }
}

function createTimeSeriesChart() {
    // Group by day
    const days = {};
    
    allPredictions.forEach(pred => {
        const date = new Date(pred.timestamp).toLocaleDateString();
        if (!days[date]) days[date] = 0;
        days[date]++;
    });
    
    const ctx = document.getElementById('timeSeriesChart').getContext('2d');
    
    if (timeSeriesChart) timeSeriesChart.destroy();
    
    timeSeriesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Object.keys(days),
            datasets: [{
                label: 'Predictions per Day',
                data: Object.values(days),
                borderColor: '#3366cc',
                backgroundColor: 'rgba(51, 102, 204, 0.1)',
                tension: 0.4,
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

function createHistogramChart() {
    // Group by month
    const months = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    allPredictions.forEach(pred => {
        const date = new Date(pred.eta);
        const monthYear = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        if (!months[monthYear]) months[monthYear] = 0;
        months[monthYear]++;
    });
    
    const ctx = document.getElementById('histogramChart').getContext('2d');
    
    if (histogramChart) histogramChart.destroy();
    
    histogramChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(months),
            datasets: [{
                label: 'Predictions by Month',
                data: Object.values(months),
                backgroundColor: 'rgba(255, 159, 64, 0.7)',
                borderColor: 'rgba(255, 159, 64, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function createTypeChart() {
    // Count by type
    const types = {fire: 0, flood: 0, obstruction: 0, other: 0};
    
    allPredictions.forEach(pred => {
        if (types[pred.type] !== undefined) {
            types[pred.type]++;
        } else {
            types.other++;
        }
    });
    
    const ctx = document.getElementById('typeChart').getContext('2d');
    
    if (typeChart) typeChart.destroy();
    
    typeChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: Object.keys(types).map(capitalize),
            datasets: [{
                data: Object.values(types),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

function createConfidenceChart() {
    // Group by confidence ranges
    const ranges = {
        "90-100%": 0,
        "80-90%": 0,
        "70-80%": 0,
        "60-70%": 0,
        "50-60%": 0,
        "<50%": 0
    };
    
    allPredictions.forEach(pred => {
        const confidence = pred.confidence * 100;
        if (confidence >= 90) ranges["90-100%"]++;
        else if (confidence >= 80) ranges["80-90%"]++;
        else if (confidence >= 70) ranges["70-80%"]++;
        else if (confidence >= 60) ranges["60-70%"]++;
        else if (confidence >= 50) ranges["50-60%"]++;
        else ranges["<50%"]++;
    });
    
    const ctx = document.getElementById('confidenceChart').getContext('2d');
    
    if (confidenceChart) confidenceChart.destroy();
    
    confidenceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(ranges),
            datasets: [{
                data: Object.values(ranges),
                backgroundColor: [
                    'rgba(46, 204, 113, 0.7)',
                    'rgba(52, 152, 219, 0.7)',
                    'rgba(155, 89, 182, 0.7)',
                    'rgba(241, 196, 15, 0.7)',
                    'rgba(230, 126, 34, 0.7)',
                    'rgba(231, 76, 60, 0.7)'
                ],
                borderColor: [
                    'rgba(46, 204, 113, 1)',
                    'rgba(52, 152, 219, 1)',
                    'rgba(155, 89, 182, 1)',
                    'rgba(241, 196, 15, 1)',
                    'rgba(230, 126, 34, 1)',
                    'rgba(231, 76, 60, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

function getTimeToEvent(etaDate) {
    try {
        const now = new Date();
        const eta = new Date(etaDate);
        const diff = eta - now;
        
        if (diff < 0) return "Past due";
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
            return `${days} day${days !== 1 ? 's' : ''} ${hours} hr${hours !== 1 ? 's' : ''}`;
        } else if (hours > 0) {
            return `${hours} hour${hours !== 1 ? 's' : ''} ${mins} min${mins !== 1 ? 's' : ''}`;
        } else {
            return `${mins} minute${mins !== 1 ? 's' : ''}`;
        }
    } catch (error) {
        console.error("Error calculating time to event:", error);
        return "Unknown";
    }
}

function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Window resize listener to redraw charts for responsiveness
window.addEventListener('resize', () => {
    if (timeSeriesChart) timeSeriesChart.resize();
    if (histogramChart) histogramChart.resize();
    if (typeChart) typeChart.resize();
    if (confidenceChart) confidenceChart.resize();
});