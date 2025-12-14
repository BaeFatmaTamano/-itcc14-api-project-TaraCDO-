const map = L.map('map').setView([8.483, 124.648], 13); // Centered on Cagayan de Oro
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Add layer control for map views
const baseLayers = {
    "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
    "Satellite": L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}')
};
L.control.layers(baseLayers).addTo(map);

let establishments = [];
let markers = [];
let routingControl = null; // For directions
let currentLocationMarker = null;

// Custom icons for categories (add these images to /static/images/)
const icons = {
    Shopping: L.icon({ iconUrl: '/static/images/shopping.png', iconSize: [25, 25] }),
    Restaurant: L.icon({ iconUrl: '/static/images/restaurant.png', iconSize: [25, 25] }),
    Hotel: L.icon({ iconUrl: '/static/images/hotel.png', iconSize: [25, 25] }),
    Attraction: L.icon({ iconUrl: '/static/images/attraction.png', iconSize: [25, 25] }),
    // Add more as needed, or use default
    default: L.icon({ iconUrl: 'https://leafletjs.com/examples/custom-icons/leaf-green.png', iconSize: [25, 25] })
};

async function loadEstablishments() {
    const response = await fetch('/api/establishments');
    establishments = await response.json();
    displayListings(establishments);
    addMarkers(establishments);
}

function displayListings(list) {
    const listings = document.getElementById('listings');
    listings.innerHTML = '';
    list.forEach(est => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${est.name}</strong> (${est.category})<br>
            <span class="rating">${'★'.repeat(Math.floor(est.rating))}</span> ${est.rating}/5<br>
            ${est.description}
        `;
        li.addEventListener('click', () => {
            map.setView([est.lat, est.lng], 15);
            // Remove previous routing if any
            if (routingControl) map.removeControl(routingControl);
            // Add routing from current location or another point (demo: from map center)
            routingControl = L.Routing.control({
                waypoints: [
                    L.latLng(8.483, 124.648), // Example start (CDO center)
                    L.latLng(est.lat, est.lng)
                ],
                routeWhileDragging: true
            }).addTo(map);
        });
        listings.appendChild(li);
    });
}

function addMarkers(list) {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    list.forEach(est => {
        const icon = icons[est.category] || icons.default;
        const marker = L.marker([est.lat, est.lng], { icon }).addTo(map).bindPopup(`
            <b>${est.name}</b><br>
            <span class="rating">${'★'.repeat(Math.floor(est.rating))}</span> ${est.rating}/5<br>
            ${est.description}<br>
            <button onclick="getDirections(${est.lat}, ${est.lng})">Get Directions</button>
        `);
        markers.push(marker);
    });
}

function getDirections(lat, lng) {
    if (routingControl) map.removeControl(routingControl);
    routingControl = L.Routing.control({
        waypoints: [
            currentLocationMarker ? currentLocationMarker.getLatLng() : L.latLng(8.483, 124.648),
            L.latLng(lat, lng)
        ],
        routeWhileDragging: true
    }).addTo(map);
}

// Geolocation button
document.getElementById('locate-me').addEventListener('click', () => {
  if (navigator.geolocation) {
    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.setView([latitude, longitude], 15);
          if (currentLocationMarker) map.removeLayer(currentLocationMarker);
          currentLocationMarker = L.marker([latitude, longitude]).addTo(map).bindPopup('You are here!').openPopup();
        },
        (error) => {
          let errorMessage = 'Geolocation failed: ';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += 'You denied the request for Geolocation. Please allow location access in your browser settings and try again.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += 'Location information is unavailable. Please ensure your device\'s location services are enabled.';
              break;
            case error.TIMEOUT:
              errorMessage += 'The request to get user location timed out. Please try again.';
              break;
            case error.UNKNOWN_ERROR:
              errorMessage += 'An unknown error occurred. Please try again.';
              break;
            default:
              errorMessage += `Error message: ${error.message} (code: ${error.code})`;
          }
          alert(errorMessage);
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: false, // Changed from true to false
          timeout: 10000,
          maximumAge: 0
        }
      );
    } catch (e) {
      alert(`An unexpected error occurred while trying to get your location: ${e.message}`);
      console.error('Unexpected Geolocation API error:', e);
    }
  } else {
    alert('Geolocation not supported by this browser.');
  }
});

document.getElementById('search').addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    const filtered = establishments.filter(est => est.name.toLowerCase().includes(query));
    displayListings(filtered);
    addMarkers(filtered);
});

document.getElementById('filter').addEventListener('change', (e) => {
    const category = e.target.value;
    const filtered = category ? establishments.filter(est => est.category === category) : establishments;
    displayListings(filtered);
    addMarkers(filtered);
});

loadEstablishments();
