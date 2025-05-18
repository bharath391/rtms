// Firebase configuration
const firebaseConfig = {
  apiKey: "",
  authDomain: "rtms-3916a.firebaseapp.com",
  databaseURL: "https://rtms-3916a-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "rtms-3916a",
  storageBucket: "rtms-3916a.firebasestorage.app",
  messagingSenderId: "519590589108",
  appId: "1:519590589108:web:5126df29e4919dbdbd1de1",
  measurementId: "G-34JCV6BBYW"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Initialize the map
const map = L.map('map').setView([12.9716, 77.5946], 13); // Default Bangalore
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 18,
}).addTo(map);

// Global variables
const markers = [];
const anomalyLog = document.getElementById('anomaly-log');
const loadingElement = document.getElementById('loading');
const emptyLogElement = document.getElementById('empty-log');

// Statistics counters
let fireCount = 0;
let waterCount = 0;
let crackCount = 0;
let obstacleCount = 0;

// Function to add an anomaly to the log and map
function addAnomaly(anomaly, updateStats = true) {
  if (!anomaly.lat || !anomaly.lng || !anomaly.type) {
      console.error("Incomplete anomaly data:", anomaly);
      return;
  }

  // Create marker on map
  const marker = L.marker([anomaly.lat, anomaly.lng]).addTo(map)
      .bindPopup(`<b>${anomaly.type}</b><br>${anomaly.timestamp}`);
  markers.push(marker);

  // Center map on most recent anomaly
  map.setView([anomaly.lat, anomaly.lng], 15);

  // Update statistics only if specified
  if (updateStats) {
      updateStatistics(anomaly.type);
  }

  // Create anomaly entry in log
  const entry = document.createElement('div');
  entry.className = `anomaly ${anomaly.type}`;

  // Format date
  const date = new Date(anomaly.timestamp_ms || Date.parse(anomaly.timestamp));
  const formattedTime = date.toLocaleString();

  // Determine icon based on type
  let icon = '';
  let typeDisplay = '';
  
  switch(anomaly.type) {
      case 'fire':
          icon = '<i class="fas fa-fire anomaly-icon"></i>';
          typeDisplay = '<span class="anomaly-type fire">Fire Detected</span>';
          break;
      case 'water':
          icon = '<i class="fas fa-water anomaly-icon"></i>';
          typeDisplay = '<span class="anomaly-type water">Water Detected</span>';
          break;
      case 'crack':
          icon = '<i class="fas fa-puzzle-piece anomaly-icon"></i>';
          typeDisplay = '<span class="anomaly-type crack">Crack Detected</span>';
          break;
      case 'obstacle':
          icon = '<i class="fas fa-exclamation-triangle anomaly-icon"></i>';
          typeDisplay = '<span class="anomaly-type obstacle">Obstacle Detected</span>';
          break;
      default:
          icon = '<i class="fas fa-exclamation-circle anomaly-icon"></i>';
          typeDisplay = '<span class="anomaly-type">Unknown Anomaly</span>';
  }

  entry.innerHTML = `
      ${icon}
      <div>${typeDisplay} at coordinates ${anomaly.lat.toFixed(5)}, ${anomaly.lng.toFixed(5)}</div>
      <div class="anomaly-time">${formattedTime}</div>
      <div class="anomaly-location">Severity: ${anomaly.severity || 'Medium'}</div>
  `;

  anomalyLog.prepend(entry);

  // Limit displayed anomalies to 5
  const anomalies = anomalyLog.getElementsByClassName('anomaly');
  if (anomalies.length > 5) {
      anomalyLog.removeChild(anomalies[anomalies.length - 1]);
  }
}

// Function to update statistics counters
function updateStatistics(type) {
  switch(type) {
      case 'fire':
          fireCount++;
          document.getElementById('fire-count').textContent = fireCount;
          break;
      case 'water':
          waterCount++;
          document.getElementById('water-count').textContent = waterCount;
          break;
      case 'crack':
          crackCount++;
          document.getElementById('crack-count').textContent = crackCount;
          break;
      case 'obstacle':
          obstacleCount++;
          document.getElementById('obstacle-count').textContent = obstacleCount;
          break;
  }
}

// Function to process alerts from ESP32 and store them as anomalies
function processAlerts(alerts) {
  if (!alerts) return;

  const { fire, water, crack, obstacle, gps } = alerts;
  
  // Use default coordinates for testing if GPS is missing or invalid
  const lat = (gps && gps.lat !== 0) ? gps.lat : 12.9716; // Default to Bangalore
  const lng = (gps && gps.lng !== 0) ? gps.lng : 77.5946; // Default to Bangalore
  
  const timestamp = new Date().toISOString();
  const timestamp_ms = Date.now();

  // Process each type of alert
  if (fire === true) {
      storeAnomaly('fire', lat, lng, timestamp, timestamp_ms);
  }
  
  if (water === true) {
      storeAnomaly('water', lat, lng, timestamp, timestamp_ms);
  }
  
  if (crack === true) {
      storeAnomaly('crack', lat, lng, timestamp, timestamp_ms);
  }
  
  if (obstacle === true) {
      storeAnomaly('obstacle', lat, lng, timestamp, timestamp_ms);
  }
}

// Function to store anomaly in Firebase
function storeAnomaly(type, lat, lng, timestamp, timestamp_ms) {
  console.log(`Storing ${type} anomaly at ${lat},${lng}`);
  
  // Create anomaly object
  const anomaly = {
      type,
      lat,
      lng,
      timestamp,
      timestamp_ms,
      resolved: false,
      severity: calculateSeverity(type)
  };

  console.log("Created anomaly object:", anomaly);

  // Store in anomaly_history node
  const newAnomalyRef = db.ref('anomaly_history').push();
  newAnomalyRef.set(anomaly)
      .then(() => {
          console.log(`Successfully stored anomaly in history: ${type}`);
      })
      .catch(error => {
          console.error("Error storing anomaly in history:", error);
      });

  // Also add to the anomalies node for current display
  db.ref('anomalies').push().set(anomaly)
      .then(() => {
          console.log(`Successfully stored anomaly in current display: ${type}`);
      })
      .catch(error => {
          console.error("Error storing anomaly in current display:", error);
      });

  // Display the anomaly on the dashboard
  addAnomaly(anomaly);
}

// Function to calculate severity based on type and random factor
function calculateSeverity(type) {
  const severities = ['Low', 'Medium', 'High', 'Critical'];
  let baseIndex;
  
  // Different types have different baseline severities
  switch(type) {
      case 'fire':
          baseIndex = 2; // Fires start at High
          break;
      case 'water':
          baseIndex = 1; // Water starts at Medium
          break;
      case 'crack':
          baseIndex = 1; // Cracks start at Medium
          break;
      case 'obstacle':
          baseIndex = 0; // Obstacles start at Low
          break;
      default:
          baseIndex = 1;
  }
  
  // Add some randomness, but keep within bounds
  const randomOffset = Math.floor(Math.random() * 2) - 0.5; // -0.5, 0, or 0.5
  const severityIndex = Math.max(0, Math.min(3, Math.floor(baseIndex + randomOffset)));
  
  return severities[severityIndex];
}

// Load initial anomalies
function loadInitialAnomalies() {
  console.log("Loading initial anomalies...");
  db.ref('anomaly_history').orderByChild('timestamp').limitToLast(5).once('value')
      .then(snapshot => {
          console.log("Received anomaly history snapshot");
          const anomalies = [];
          
          snapshot.forEach(childSnapshot => {
              anomalies.push(childSnapshot.val());
          });
          
          console.log("Loaded anomalies:", anomalies);
          loadingElement.style.display = 'none';
          
          if (anomalies.length === 0) {
              console.log("No anomalies found in history");
              emptyLogElement.style.display = 'block';
          } else {
              // Sort by newest first and display
              anomalies.sort((a, b) => {
                  const timeA = a.timestamp_ms || Date.parse(a.timestamp);
                  const timeB = b.timestamp_ms || Date.parse(b.timestamp);
                  return timeB - timeA;
              });
              
              console.log("Displaying sorted anomalies:", anomalies);
              anomalies.forEach(anomaly => {
                  addAnomaly(anomaly, false); // Do not update stats during initial load
              });
          }
      })
      .catch(error => {
          console.error("Error loading initial anomalies:", error);
          loadingElement.style.display = 'none';
      });
}

// Initialize statistics
function initializeStatistics() {
  db.ref('anomaly_history').once('value')
      .then(snapshot => {
          fireCount = 0;
          waterCount = 0;
          crackCount = 0;
          obstacleCount = 0;
          
          snapshot.forEach(childSnapshot => {
              const anomaly = childSnapshot.val();
              switch(anomaly.type) {
                  case 'fire':
                      fireCount++;
                      break;
                  case 'water':
                      waterCount++;
                      break;
                  case 'crack':
                      crackCount++;
                      break;
                  case 'obstacle':
                      obstacleCount++;
                      break;
              }
          });
          
          // Update DOM with initial counts
          document.getElementById('fire-count').textContent = fireCount;
          document.getElementById('water-count').textContent = waterCount;
          document.getElementById('crack-count').textContent = crackCount;
          document.getElementById('obstacle-count').textContent = obstacleCount;
      })
      .catch(error => {
          console.error("Error initializing statistics:", error);
      });
}

// Run initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeStatistics();
  loadInitialAnomalies();
  
  // Listen for new alerts from ESP32
  db.ref('alerts').on('value', snapshot => {
      const alerts = snapshot.val();
      console.log("Received alerts data:", alerts);
      if (alerts) {
          processAlerts(alerts);
      } else {
          console.log("No alerts data received or data is null");
      }
  });
});