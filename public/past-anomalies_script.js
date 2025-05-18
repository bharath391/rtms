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

// Global variables
let anomalies = [];
const itemsPerPage = 10;
let currentPage = 1;
let filteredAnomalies = [];
let modalMap = null;

// DOM elements
const anomalyTable = document.getElementById('anomaly-table');
const anomalyData = document.getElementById('anomaly-data');
const paginationContainer = document.getElementById('pagination');
const typeFilter = document.getElementById('type-filter');
const dateFilter = document.getElementById('date-filter');
const emptyState = document.getElementById('empty-state');
const mapModal = document.getElementById('map-modal');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.getElementById('modal-close');

// Load anomalies from Firebase
function loadAnomalies() {
  db.ref("anomaly_history").orderByChild("timestamp").limitToLast(30).once("value")
    .then(snapshot => {
      anomalies = [];
      
      snapshot.forEach(childSnapshot => {
        const anomaly = childSnapshot.val();
        anomaly.id = childSnapshot.key;
        anomalies.push(anomaly);
      });
      
      // Initially sort by newest first
      anomalies.sort((a, b) => b.timestamp_ms - a.timestamp_ms);
      
      filteredAnomalies = [...anomalies];
      displayAnomalies();
    })
    .catch(error => {
      console.error("Error loading anomalies:", error);
    });
}

// Display anomalies with pagination
function displayAnomalies() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAnomalies = filteredAnomalies.slice(startIndex, endIndex);
  
  anomalyData.innerHTML = '';
  
  if (currentAnomalies.length === 0) {
    anomalyTable.style.display = 'none';
    emptyState.style.display = 'block';
    paginationContainer.style.display = 'none';
    return;
  }
  
  anomalyTable.style.display = 'table';
  emptyState.style.display = 'none';
  paginationContainer.style.display = 'flex';
  
  currentAnomalies.forEach(anomaly => {
    const row = document.createElement('tr');
    
    // Format date and time
    const date = new Date(anomaly.timestamp_ms || Date.parse(anomaly.timestamp));
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Format location
    const location = anomaly.lat && anomaly.lng 
      ? `${anomaly.lat.toFixed(5)}, ${anomaly.lng.toFixed(5)}`
      : 'Unknown';
    
    // Generate type class and label
    let typeClass = '';
    let typeLabel = '';
    
    switch (anomaly.type) {
      case 'fire':
        typeClass = 'type-fire';
        typeLabel = 'Fire Detection';
        break;
      case 'water':
        typeClass = 'type-water';
        typeLabel = 'Water Detection';
        break;
      case 'crack':
        typeClass = 'type-crack';
        typeLabel = 'Crack Detection';
        break;
      case 'obstacle':
        typeClass = 'type-obstacle';
        typeLabel = 'Obstacle Detection';
        break;
      default:
        typeClass = '';
        typeLabel = anomaly.type || 'Unknown';
    }
    
    // Status column now contains the Resolve button instead of text
    const statusColumn = anomaly.resolved 
      ? 'Resolved' 
      : `<button class="resolve-anomaly" data-id="${anomaly.id}">
           <i class="fas fa-check"></i> Resolve
         </button>`;
    
    row.innerHTML = `
      <td><span class="anomaly-type ${typeClass}">${typeLabel}</span></td>
      <td>${formattedDate}<br>${formattedTime}</td>
      <td>${location}</td>
      <td>${statusColumn}</td>
      <td>
        <button class="view-map" data-id="${anomaly.id}">
          <i class="fas fa-map-marker-alt"></i> View Map
        </button>
      </td>
    `;
    
    anomalyData.appendChild(row);
  });
  
  // Setup pagination
  setupPagination();
  
  // Add event listeners to view map buttons
  document.querySelectorAll('.view-map').forEach(button => {
    button.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      openMapModal(id);
    });
  });
  
  // Add event listeners to resolve buttons
  document.querySelectorAll('.resolve-anomaly').forEach(button => {
    button.addEventListener('click', function() {
      const id = this.getAttribute('data-id');
      resolveAnomaly(id);
    });
  });
}

// Resolve anomaly
function resolveAnomaly(id) {
  if (confirm("Are you sure you want to mark this anomaly as resolved? This will remove it from the database.")) {
    // Delete from Firebase
    db.ref(`anomaly_history/${id}`).remove()
      .then(() => {
        // Remove from local arrays
        anomalies = anomalies.filter(anomaly => anomaly.id !== id);
        filteredAnomalies = filteredAnomalies.filter(anomaly => anomaly.id !== id);
        
        // Display updated list
        displayAnomalies();
        
        // Show success message
        showNotification("Anomaly resolved successfully!");
      })
      .catch(error => {
        console.error("Error resolving anomaly:", error);
        showNotification("Error resolving anomaly. Please try again.", "error");
      });
  }
}

// Show notification
function showNotification(message, type = "success") {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  // Remove after 3 seconds
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}

// Setup pagination controls
function setupPagination() {
  const totalPages = Math.ceil(filteredAnomalies.length / itemsPerPage);
  paginationContainer.innerHTML = '';
  
  if (totalPages <= 1) {
    return;
  }
  
  // Previous button
  if (currentPage > 1) {
    const prevButton = document.createElement('button');
    prevButton.innerHTML = '&laquo;';
    prevButton.addEventListener('click', () => {
      currentPage--;
      displayAnomalies();
    });
    paginationContainer.appendChild(prevButton);
  }
  
  // Page buttons
  for (let i = 1; i <= totalPages; i++) {
    const pageButton = document.createElement('button');
    pageButton.textContent = i;
    
    if (i === currentPage) {
      pageButton.classList.add('active');
    }
    
    pageButton.addEventListener('click', () => {
      currentPage = i;
      displayAnomalies();
    });
    
    paginationContainer.appendChild(pageButton);
  }
  
  // Next button
  if (currentPage < totalPages) {
    const nextButton = document.createElement('button');
    nextButton.innerHTML = '&raquo;';
    nextButton.addEventListener('click', () => {
      currentPage++;
      displayAnomalies();
    });
    paginationContainer.appendChild(nextButton);
  }
}

// Open map modal
function openMapModal(id) {
  const anomaly = anomalies.find(a => a.id === id);
  
  if (!anomaly || !anomaly.lat || !anomaly.lng) {
    alert('Location data not available');
    return;
  }
  
  modalTitle.textContent = `${anomaly.type.charAt(0).toUpperCase() + anomaly.type.slice(1)} Anomaly Location`;
  mapModal.style.display = 'flex';
  
  // Initialize map if not already done
  if (!modalMap) {
    modalMap = L.map('modal-map').setView([anomaly.lat, anomaly.lng], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(modalMap);
  } else {
    modalMap.setView([anomaly.lat, anomaly.lng], 15);
  }
  
  // Clear existing markers and add new one
  modalMap.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      modalMap.removeLayer(layer);
    }
  });
  
  const marker = L.marker([anomaly.lat, anomaly.lng]).addTo(modalMap)
    .bindPopup(`<b>${anomaly.type}</b><br>${anomaly.timestamp}`).openPopup();
  
  // Force map redraw since it's in a modal
  setTimeout(() => {
    modalMap.invalidateSize();
  }, 100);
}

// Close map modal
function closeMapModal() {
  mapModal.style.display = 'none';
}

// Apply filters
function applyFilters() {
  const typeValue = typeFilter.value;
  const dateValue = dateFilter.value;
  
  // Filter by type
  if (typeValue === 'all') {
    filteredAnomalies = [...anomalies];
  } else {
    filteredAnomalies = anomalies.filter(anomaly => anomaly.type === typeValue);
  }
  
  // Sort by date
  if (dateValue === 'newest') {
    filteredAnomalies.sort((a, b) => b.timestamp_ms - a.timestamp_ms);
  } else {
    filteredAnomalies.sort((a, b) => a.timestamp_ms - b.timestamp_ms);
  }
  
  // Reset to first page and display
  currentPage = 1;
  displayAnomalies();
}

// Event listeners
typeFilter.addEventListener('change', applyFilters);
dateFilter.addEventListener('change', applyFilters);
modalClose.addEventListener('click', closeMapModal);

// Load anomalies when page loads
document.addEventListener('DOMContentLoaded', loadAnomalies);