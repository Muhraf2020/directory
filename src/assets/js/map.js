// Map initialization for city pages using Leaflet
// Requires Leaflet library loaded separately

document.addEventListener('DOMContentLoaded', function () {
  const mapEl = document.getElementById('map');
  if (!mapEl || typeof L === 'undefined') return;

  // cityCenter and storeMarkers should be defined in the page inline script
  const center = window.cityCenter || [0, 0];
  const map = L.map(mapEl).setView(center, 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);

  if (Array.isArray(window.storeMarkers)) {
    window.storeMarkers.forEach(function (store, idx) {
      const marker = L.marker(store.coords).addTo(map);
      marker.bindPopup('<strong>' + store.name + '</strong><br>' + store.address);
      // When a marker is clicked, scroll to the corresponding store card and open the popup
      marker.on('click', function () {
        if (store.id) {
          const cardEl = document.getElementById('store-' + store.id);
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
      store.marker = marker;
    });
  }

  // Scroll to marker when clicking "Show on Map" links
  document.querySelectorAll('.show-on-map').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const idx = parseInt(this.getAttribute('data-idx'), 10);
      const store = window.storeMarkers && window.storeMarkers[idx];
      if (store && store.marker) {
        store.marker.openPopup();
        map.setView(store.coords, 14);
        // Smooth scroll to the associated card when clicking show on map
        if (store.id) {
          const cardEl = document.getElementById('store-' + store.id);
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    });
  });
});
