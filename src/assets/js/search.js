// Simple client‑side search/filter for state pages

document.addEventListener('DOMContentLoaded', function () {
  const input = document.getElementById('city-search');
  const list = document.getElementById('city-list');
  if (!input || !list) return;
  const items = Array.from(list.querySelectorAll('.city-card'));
  input.addEventListener('input', function () {
    const q = this.value.trim().toLowerCase();
    items.forEach(function (card) {
      const name = card.getAttribute('data-name').toLowerCase();
      if (name.includes(q)) {
        card.style.display = '';
      } else {
        card.style.display = 'none';
      }
    });
  });
});
