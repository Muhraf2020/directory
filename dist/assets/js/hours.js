// Utility to compute open/closed status for stores based on hours
(function () {
  const days = ['sun','mon','tue','wed','thu','fri','sat'];

  function isOpen(hours) {
    const now = new Date();
    const dow = days[now.getDay()];
    const todaysHours = hours[dow];
    if (!todaysHours) return false;
    const [open, close] = todaysHours;
    const [oH, oM] = open.split(':').map(Number);
    const [cH, cM] = close.split(':').map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const openMins = oH * 60 + oM;
    const closeMins = cH * 60 + cM;
    // Handle overnight hours (e.g., open 22:00, close 02:00).  If the close
    // minutes are earlier than the opening minutes, it means the store closes
    // after midnight. In that case we consider the store open if the current
    // time is after the open time or before the close time on the next day.
    if (closeMins < openMins) {
      return nowMins >= openMins || nowMins <= closeMins;
    }
    return nowMins >= openMins && nowMins <= closeMins;
  }

  function updateStatuses() {
    document.querySelectorAll('.store-card').forEach(card => {
      const hoursStr = card.getAttribute('data-hours');
      if (!hoursStr) return;
      try {
        const hours = JSON.parse(hoursStr);
        const openNow = isOpen(hours);
        const statusEl = card.querySelector('.open-status');
        if (statusEl) {
          statusEl.textContent = openNow ? 'Open Now' : 'Closed';
          statusEl.classList.toggle('open', openNow);
          statusEl.classList.toggle('closed', !openNow);
        }
      } catch (e) {
        // ignore parse errors
      }
    });
  }

  // update initially and every minute
  document.addEventListener('DOMContentLoaded', updateStatuses);
  setInterval(updateStatuses, 60000);
})();
