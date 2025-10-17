// Main site JavaScript

document.addEventListener('DOMContentLoaded', function () {
  // Highlight active navigation link based on current path
  const path = window.location.pathname.replace(/\/index\.html$/, '/');
  document.querySelectorAll('.site-header nav a').forEach(function (link) {
    const href = link.getAttribute('href');
    if (href === path || (href !== '/' && path.startsWith(href))) {
      link.classList.add('active');
    }
  });
});
