console.log("Main JavaScript file loaded.");

if (typeof L !== 'undefined') {
    console.log("Leaflet library loaded successfully.");
} else {
    console.error("Leaflet library not found!");
}

let map = null; // Leaflet map instance
let userMarker = null;
let routeLayerGroup = null; // To manage route polylines

// Initialize or update map view
function initOrUpdateMap(lat, lon) {
    // const statusDiv = document.getElementById('statusMessage'); // Not directly needed here
    if (!map) {
        map = L.map('map').setView([lat, lon], 14); // Zoom level 14
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        routeLayerGroup = L.layerGroup().addTo(map); // Layer group for routes
    } else {
        map.setView([lat, lon], 14);
    }

    if (userMarker) {
        userMarker.setLatLng([lat, lon]);
    } else {
        userMarker = L.marker([lat, lon]).addTo(map);
    }
    userMarker.bindPopup('Your Current Location').openPopup();
}

// Fetch and display courses
function fetchAndDisplayCourses(lat, lon, distance) {
    console.log(`Fetching courses for: lat=${lat}, lon=${lon}, distance=${distance}km`);
    
    const statusDiv = document.getElementById('statusMessage');
    const searchBtn = document.getElementById('searchBtn'); // Get search button

    if (routeLayerGroup) {
        routeLayerGroup.clearLayers();
    }

    if (statusDiv) {
        statusDiv.textContent = 'Searching for courses...';
        statusDiv.className = 'alert alert-info mt-2';
        statusDiv.style.display = 'block';
    }
    // searchBtn is already disabled by the caller event listener,
    // but we will ensure it's re-enabled in .finally()

    fetch('/api/recommend_courses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            latitude: lat,
            longitude: lon,
            distance_km: distance
        })
    })
    .then(response => {
        if (!response.ok) {
            // Try to parse error from backend, otherwise use status text
            return response.json().then(errData => {
                throw new Error(errData.error || `Server responded with status: ${response.status}`);
            }).catch(() => { // If parsing errData fails
                throw new Error(`Server responded with status: ${response.status} - ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log("Courses data received:", data);
        if (statusDiv) {
            if (data.courses && data.courses.length > 0) {
                statusDiv.textContent = `Found ${data.courses.length} course(s). Displaying routes.`;
                statusDiv.className = 'alert alert-success mt-2';
                const bounds = []; 
                data.courses.forEach(course => {
                    if (course.coordinates && course.coordinates.length > 0) {
                        const polyline = L.polyline(course.coordinates, { color: 'blue', weight: 5 }) 
                            .bindPopup(`Course ID: ${course.id}<br>Length: ${course.length_km.toFixed(2)} km`)
                            .addTo(routeLayerGroup);
                        bounds.push(polyline.getBounds());
                    }
                });

                if (bounds.length > 0) {
                    const overallBounds = L.featureGroup(bounds.map(b => L.rectangle(b))).getBounds();
                     if (overallBounds.isValid()) {
                        map.fitBounds(overallBounds.pad(0.1)); 
                    }
                } else { // Should not happen if data.courses.length > 0 and coordinates are valid
                     statusDiv.textContent = 'No suitable courses found matching your criteria.';
                     statusDiv.className = 'alert alert-warning mt-2';
                }
                // If server sent a message but also courses (unlikely based on current backend)
                if (data.message && data.courses.length === 0) { 
                    statusDiv.textContent = data.message; // Overwrite success if message present and no courses
                    statusDiv.className = 'alert alert-warning mt-2'; // Use warning for "no courses"
                }

            } else { // No courses found, or specific message from server
                statusDiv.textContent = data.message || 'No suitable courses found matching your criteria.';
                statusDiv.className = 'alert alert-warning mt-2';
            }
        }
    })
    .catch(error => {
        console.error('Error fetching or displaying courses:', error);
        if (statusDiv) {
            statusDiv.textContent = `Error: ${error.message}`;
            statusDiv.className = 'alert alert-danger mt-2';
        }
    })
    .finally(() => { // Re-enable button regardless of success/failure
        if (searchBtn) searchBtn.disabled = false;
    });
}

document.addEventListener('DOMContentLoaded', function () {
    const searchBtn = document.getElementById('searchBtn');
    const distanceInput = document.getElementById('distanceInput');
    const statusDiv = document.getElementById('statusMessage');

    if (searchBtn) {
        searchBtn.addEventListener('click', function () {
            console.log("Search button clicked.");
            const distanceString = distanceInput.value;
            
            if (!distanceString) {
                alert("Please enter your desired distance.");
                 if (statusDiv) {
                    statusDiv.textContent = 'Please enter your desired distance.';
                    statusDiv.className = 'alert alert-warning mt-2';
                    statusDiv.style.display = 'block';
                }
                return;
            }
            
            const distance = parseFloat(distanceString);

            if (isNaN(distance) || distance <= 0) {
                alert("Please enter a valid distance (positive number).");
                if (statusDiv) {
                    statusDiv.textContent = 'Please enter a valid distance (positive number).';
                    statusDiv.className = 'alert alert-warning mt-2';
                    statusDiv.style.display = 'block';
                }
                return;
            }
            
            if (statusDiv) {
                statusDiv.textContent = 'Getting your location...';
                statusDiv.className = 'alert alert-info mt-2';
                statusDiv.style.display = 'block';
            }
            searchBtn.disabled = true; // Disable button before async operations

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function (position) {
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        console.log("User Location - Latitude:", lat, "Longitude:", lon);
                        
                        initOrUpdateMap(lat, lon);
                        fetchAndDisplayCourses(lat, lon, distance); 
                        // Button re-enabled in fetchAndDisplayCourses.finally()
                    },
                    function (error) {
                        console.error("Error getting location:", error);
                        let userMessage = "Could not get location. ";
                        switch (error.code) {
                            case error.PERMISSION_DENIED: userMessage += "Permission denied."; break;
                            case error.POSITION_UNAVAILABLE: userMessage += "Position unavailable."; break;
                            case error.TIMEOUT: userMessage += "Timeout getting location."; break;
                            default: userMessage += "Unknown error."; break;
                        }
                        if (statusDiv) {
                            statusDiv.textContent = userMessage;
                            statusDiv.className = 'alert alert-danger mt-2';
                            statusDiv.style.display = 'block';
                        }
                        // alert(userMessage); // Replaced by statusDiv message
                        if (searchBtn) searchBtn.disabled = false; // Re-enable on geolocation error
                    }
                );
            } else {
                const userMessage = "Geolocation is not supported by this browser.";
                if (statusDiv) {
                    statusDiv.textContent = userMessage;
                    statusDiv.className = 'alert alert-warning mt-2'; // Warning for this case
                    statusDiv.style.display = 'block';
                }
                // alert(userMessage); // Replaced by statusDiv message
                if (searchBtn) searchBtn.disabled = false; // Re-enable if no geolocation support
            }
        });
    } else {
        console.error("Search button not found.");
    }
     if (!distanceInput) {
        console.error("Distance input field not found.");
    }
    if (!statusDiv) {
        console.error("Status message div not found.");
    }
});
