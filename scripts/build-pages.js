const fs = require('fs');
const path = require('path');

// Helper to ensure directory exists
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

// Load JSON data
const states = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'states.json'), 'utf8'));
const cities = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'cities.json'), 'utf8'));
const stores = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'stores.json'), 'utf8'));

// Root output directory
const distDir = path.join(__dirname, '..', 'dist');

// Base path for GitHub Pages project sites.
// Example: if your repo is directory-site, your site URL is
// https://USERNAME.github.io/directory-site/  → BASE_PATH should be "directory-site".
const basePath = process.env.BASE_PATH || '';

const normalizedBase = (() => {
  if (!basePath) return '';
  const trimmed = basePath.replace(/^\/+|\/+$/g, '');
  return '/' + trimmed;
})();

// Prefix helper for links/assets (e.g., prefix('about/') → '/directory-site/about/' or '/about/')
function prefix(sub = '') {
  const clean = sub.replace(/^\/+/, '');
  if (!clean) return normalizedBase + '/';
  return `${normalizedBase}/${clean}`;
}

// Remove dist directory if exists
if (fs.existsSync(distDir)) {
  fs.rmdirSync(distDir, { recursive: true });
}
ensureDir(distDir);

// Copy static and asset files
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  fs.readdirSync(src).forEach(entry => {
    const srcPath = path.join(src, entry);
    const destPath = path.join(dest, entry);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Copy assets
copyDir(path.join(__dirname, '..', 'src', 'assets'), path.join(distDir, 'assets'));
// Copy static (robots.txt, favicon etc)
copyDir(path.join(__dirname, '..', 'src', 'static'), distDir);

// Read layout template
const layoutTemplate = fs.readFileSync(path.join(__dirname, '..', 'src', 'templates', '_layout.html'), 'utf8');

// Helper to slugify state names (lowercase, spaces to dashes)
function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[']/g, '');
}

// Compute totals
const totalStates = states.length;
const totalCities = cities.length;
const totalStores = stores.length;

// Aggregate appliance/category counts across all stores.
// Some data files may use a nested `appliances` object while others may use
// `categories`. Normalise by checking both keys. Each property contains
// booleans for whether a store carries that appliance type. These totals
// are used on the home page to demonstrate proof of coverage.
const categoryTotals = {
  refrigerators: 0,
  washers_dryers: 0,
  stoves_ranges: 0,
  dishwashers: 0
};
stores.forEach(store => {
  const cats = store.categories || store.appliances || {};
  if (cats.refrigerators) categoryTotals.refrigerators++;
  if (cats.washers_dryers) categoryTotals.washers_dryers++;
  if (cats.stoves_ranges) categoryTotals.stoves_ranges++;
  if (cats.dishwashers) categoryTotals.dishwashers++;
});

// Build data maps for quick lookup
const stateMap = {};
states.forEach(st => {
  stateMap[st.code] = st;
});
// Group cities by state
const citiesByState = {};
cities.forEach(city => {
  const arr = citiesByState[city.state] || (citiesByState[city.state] = []);
  arr.push(city);
});
// Group stores by (state, city)
const storesByCity = {};
stores.forEach(store => {
  const key = `${store.state}|${store.city_slug}`;
  const arr = storesByCity[key] || (storesByCity[key] = []);
  arr.push(store);
});

// Helper to render the layout with provided sections
function renderPage({ title, canonical, ogTitle, ogDescription, header, content, footer, jsonLd = '', extraScripts = '' }) {
  return layoutTemplate
    .replace(/{{title}}/g, title)
    .replace(/{{canonical}}/g, canonical)
    .replace(/{{ogTitle}}/g, ogTitle)
    .replace(/{{ogDescription}}/g, ogDescription)
    .replace(/{{header}}/g, header)
    .replace(/{{content}}/g, content)
    .replace(/{{footer}}/g, footer)
    .replace(/{{jsonLd}}/g, jsonLd)
    .replace(/{{extraScripts}}/g, extraScripts)
    .replace(/{{gaId}}/g, 'G-XXXXXXX')
    .replace(/{{base}}/g, normalizedBase);
}

// Generate header and footer markup (common across pages)
function buildHeader() {
  return `
<header class="site-header">
  <div class="container">
    <a href="${prefix('')}" class="logo">Scratch &amp; Dent Locator</a>
    <nav class="site-nav">
      <a href="${prefix('')}">Home</a>
      <a href="${prefix('scratch-and-dent-appliances/')}">Browse States</a>
      <a href="${prefix('advertise-with-us/')}">Advertise</a>
      <a href="${prefix('about/')}">About</a>
      <a href="${prefix('contact/')}">Contact</a>
      <a href="${prefix('stores/new/')}" class="btn-add">Add Your Store</a>
    </nav>
  </div>
</header>`;
}

function buildFooter() {
  const popular = [...states].sort((a,b) => b.stores_count - a.stores_count).slice(0, 5);
  const popularLinks = popular.map(st => `<li><a href="${prefix('scratch-and-dent-appliances/' + slugify(st.name) + '/')}">${st.name}</a></li>`).join('');
  const stateLinks = states.sort((a,b) => a.name.localeCompare(b.name)).map(st => `<li><a href="${prefix('scratch-and-dent-appliances/' + slugify(st.name) + '/')}">${st.name}</a></li>`).join('');
  return `
<footer>
  <div class="container footer-inner">
    <div>
      <h4>Quick Links</h4>
      <ul>
        <li><a href="${prefix('')}">Home</a></li>
        <li><a href="${prefix('scratch-and-dent-appliances/')}">Browse States</a></li>
        <li><a href="${prefix('advertise-with-us/')}">Advertise</a></li>
        <li><a href="${prefix('about/')}">About</a></li>
        <li><a href="${prefix('contact/')}">Contact</a></li>
        <li><a href="${prefix('stores/new/')}">Add Your Store</a></li>
      </ul>
    </div>
    <div>
      <h4>Popular States</h4>
      <ul>${popularLinks}</ul>
    </div>
    <div>
      <h4>Browse by State</h4>
      <ul>${stateLinks}</ul>
    </div>
  </div>
</footer>`;
}

const headerHtml = buildHeader();
const footerHtml = buildFooter();

// Build Home Page
function buildHome() {
  const statsHtml = `\n    <div class="stats">\n      <div class="stat"><h2>${totalStates}</h2><p>States</p></div>\n      <div class="stat"><h2>${totalCities}</h2><p>Cities</p></div>\n      <div class="stat"><h2>${totalStores}</h2><p>Stores</p></div>\n    </div>`;
  // Top states cards (8)
  const topStates = [...states].sort((a,b) => b.stores_count - a.stores_count).slice(0, 8);
  const cards = topStates.map(st => {
    const url = prefix(`scratch-and-dent-appliances/${slugify(st.name)}/`);
    return `\n      <div class="card">\n        <h3>${st.name}</h3>\n        <p>${st.cities_count} cities, ${st.stores_count} stores</p>\n        <p><a href="${url}">Browse ${st.name}</a></p>\n      </div>`;
  }).join('');
  const benefits = `\n  <section class="container">\n    <h2>Why Shop Scratch &amp; Dent?</h2>\n    <p>Buying scratch and dent appliances can save you money and keep still-perfectly working products out of landfills. Our directory helps you discover local warehouses and outlets offering deep discounts on gently blemished appliances.</p>\n    <div class="grid grid-3">\n      <div class="card"><h3>Big Savings</h3><p>Find deals with savings of 30–70% off retail prices on refrigerators, washers &amp; dryers, ranges and more.</p></div>\n      <div class="card"><h3>Support Local</h3><p>Shop local businesses and outlets in your state and city – keeping money in your community.</p></div>\n      <div class="card"><h3>Reduce Waste</h3><p>Give slightly imperfect appliances a second life and help reduce unnecessary waste.</p></div>\n    </div>\n  </section>`;
  const content = `\n  <section class="hero">\n    <div class="container">\n      <h1>Discover Discount Appliances Near You</h1>\n      <p>Browse our scratch &amp; dent directory to find great deals on appliances in your state.</p>\n      ${statsHtml}\n    </div>\n  </section>\n  <section class="container">\n    <h2>Browse Top States</h2>\n    <div class="grid grid-3">${cards}</div>\n  </section>\n  <section class="container">\n    <h2>Popular Appliance Categories</h2>\n    <div class="grid grid-4">\n      <div class="card category-card"><h3>Refrigerators</h3><p>${categoryTotals.refrigerators} stores</p></div>\n      <div class="card category-card"><h3>Washers &amp; Dryers</h3><p>${categoryTotals.washers_dryers} stores</p></div>\n      <div class="card category-card"><h3>Stoves &amp; Ranges</h3><p>${categoryTotals.stoves_ranges} stores</p></div>\n      <div class="card category-card"><h3>Dishwashers</h3><p>${categoryTotals.dishwashers} stores</p></div>\n    </div>\n  </section>\n  ${benefits}`;
  // JSON-LD for home (WebSite + Organization)
  const jsonLd = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Scratch & Dent Locator",
    "url": "https://example.com/",
    "description": "Directory of scratch and dent appliance stores across the United States."
  })}</script>`;
  const html = renderPage({
    title: 'Scratch & Dent Appliance Directory',
    canonical: prefix(''),
    ogTitle: 'Scratch & Dent Appliance Directory',
    ogDescription: 'Find discounted scratch and dent appliances in your state and city.',
    header: headerHtml,
    content: content,
    footer: footerHtml,
    jsonLd: jsonLd,
    extraScripts: ''
  });
  const outDir = path.join(distDir);
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
}

// Build state index page (/scratch-and-dent-appliances/)
function buildStatesIndex() {
  // Alphabetical grouping
  const statesSorted = [...states].sort((a,b) => a.name.localeCompare(b.name));
  const sections = {};
  statesSorted.forEach(st => {
    const letter = st.name[0].toUpperCase();
    const arr = sections[letter] || (sections[letter] = []);
    arr.push(st);
  });
  const navLetters = Object.keys(sections).sort();
  const navHtml = navLetters.map(l => `<a href="#${l}">${l}</a>`).join(' | ');
  const sectionsHtml = navLetters.map(l => {
    const listHtml = sections[l].map(st => {
      const url = prefix(`scratch-and-dent-appliances/${slugify(st.name)}/`);
      return `<li><a href="${url}">${st.name}</a> – ${st.cities_count} cities, ${st.stores_count} stores</li>`;
    }).join('');
    return `<h3 id="${l}">${l}</h3><ul>${listHtml}</ul>`;
  }).join('');
  const content = `\n  <div class="container">\n    <h1>Browse States</h1>\n    <p>Explore scratch &amp; dent appliance outlets across the nation. Select a state to see participating cities and stores.</p>\n    <p>${navHtml}</p>\n    ${sectionsHtml}\n  </div>`;
  const jsonLd = `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": statesSorted.map((st, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "name": st.name,
      "url": prefix(`scratch-and-dent-appliances/${slugify(st.name)}/`)
    }))
  })}</script>`;
  const html = renderPage({
    title: 'Browse States – Scratch & Dent Locator',
    canonical: prefix('scratch-and-dent-appliances/'),
    ogTitle: 'Browse States',
    ogDescription: 'Select your state to find scratch and dent appliance stores.',
    header: headerHtml,
    content: content,
    footer: footerHtml,
    jsonLd: jsonLd,
    extraScripts: ''
  });
  const outDir = path.join(distDir, 'scratch-and-dent-appliances');
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
}

// Build pages for each state (/scratch-and-dent-appliances/{state}/)
function buildStatePages() {
  states.forEach(st => {
    const stateSlug = slugify(st.name);
    const stateCities = citiesByState[st.code] || [];
    // Sort cities by name
    const sortedCities = [...stateCities].sort((a,b) => a.name.localeCompare(b.name));
    const totalStoresInState = st.stores_count;
    const intro = `<p>${st.name} has ${stateCities.length} participating cities and ${totalStoresInState} scratch &amp; dent appliance stores in our directory. Use the search box to find your city below.</p>`;
    const searchBox = `<div class="search-input"><input type="text" id="city-search" placeholder="Find cities in ${st.name}" aria-label="Find cities in ${st.name}"></div>`;
    const cityCards = sortedCities.map(city => {
      const url = prefix(`scratch-and-dent-appliances/${stateSlug}/${city.slug}/`);
      return `<div class="card city-card" data-name="${city.name}" id="${city.slug}"><h3>${city.name}</h3><p>${city.stores_count} stores</p><p><a href="${url}">View stores</a></p></div>`;
    }).join('');
    const content = `\n  <div class="container">\n    <h1>${st.name} Scratch &amp; Dent Appliance Stores</h1>\n    ${intro}\n    ${searchBox}\n    <div id="city-list" class="grid grid-3">${cityCards}</div>\n  </div>`;
    const jsonLd = `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `${st.name} cities`,
      "itemListElement": sortedCities.map((city, idx) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "name": `${city.name}, ${st.code}`,
        "url": prefix(`scratch-and-dent-appliances/${stateSlug}/${city.slug}/`)
      }))
    })}</script>`;
    const html = renderPage({
      title: `${st.name} Scratch & Dent Appliance Stores`,
      canonical: prefix(`scratch-and-dent-appliances/${stateSlug}/`),
      ogTitle: `${st.name} Scratch & Dent Appliance Stores`,
      ogDescription: `Find scratch and dent appliance outlets in ${st.name}.`,
      header: headerHtml,
      content: content,
      footer: footerHtml,
      jsonLd: jsonLd,
      extraScripts: `<script src="${prefix('assets/js/search.js')}" defer></script>`
    });
    const outDir = path.join(distDir, 'scratch-and-dent-appliances', stateSlug);
    ensureDir(outDir);
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
  });
}

// Build city pages (/scratch-and-dent-appliances/{state}/{city}/)
function buildCityPages() {
  cities.forEach(city => {
    const st = stateMap[city.state];
    const stateSlug = slugify(st.name);
    const citySlug = city.slug;
    const cityStores = storesByCity[`${city.state}|${city.slug}`] || [];
    // Sort stores: featured first
    const sortedStores = [...cityStores].sort((a,b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    // Compute KPIs: number of stores, #delivery, #install
    const numStores = sortedStores.length;
    let deliveryCount = 0;
    let installCount = 0;
    sortedStores.forEach(store => {
      if (store.services.delivery) deliveryCount++;
      if (store.services.install) installCount++;
    });
    const kpiChips = `\n      <div class="kpi">\n        <span class="chip">${numStores} stores</span>\n        <span class="chip">${deliveryCount} offer delivery</span>\n        <span class="chip">${installCount} offer install</span>\n      </div>`;
    const intro = `<p>Looking for discount appliances in ${city.name}, ${st.code}? Save big on refrigerators, washers and dryers, ranges and more when you shop scratch &amp; dent. Expect savings from 30–70% off full retail prices at the stores listed below.</p>`;
    // Build quick navigation list and store cards. Use store.id as anchor targets so
    // users can quickly jump to any listing. Normalise the appliance category
    // object – data may use `categories` or `appliances` for the same
    // information.
    const quickLinks = sortedStores.map(store => `<li><a href="#store-${store.id}">${store.name}</a></li>`).join('');
    const quickNavSection = `\n    <nav class="quick-nav" aria-label="Quick navigation"><h2>Quick Navigation</h2><ul>${quickLinks}</ul></nav>`;

    const storeCards = sortedStores.map((store, idx) => {
      const cats = store.categories || store.appliances || {};
      const appliances = [];
      if (cats.refrigerators) appliances.push('Refrigerators');
      if (cats.washers_dryers) appliances.push('Washers & Dryers');
      if (cats.stoves_ranges) appliances.push('Stoves & Ranges');
      if (cats.dishwashers) appliances.push('Dishwashers');
      const services = [];
      if (store.services && store.services.delivery) services.push('Delivery');
      if (store.services && store.services.install) services.push('Install');
      return `\n        <div class="card store-card" id="store-${store.id}" data-hours='${JSON.stringify(store.hours)}'>\n          <h3>${store.name} ${store.featured ? '<span class="badge featured">Featured</span>' : ''}</h3>\n          <p>${store.address}</p>\n          <p><a href="tel:${store.phone}">${store.phone}</a> | <a href="${store.website}" target="_blank" rel="noopener">Website</a></p>\n          <p>Products: ${appliances.join(', ') || 'N/A'}</p>\n          <p>Services: ${services.join(', ') || 'None'}</p>\n          <p>Status: <span class="open-status">Checking…</span></p>\n          <p><a href="#" class="show-on-map" data-idx="${idx}">Show on map</a></p>\n        </div>`;
    }).join('');
    // Map data script: embed city center and store markers array
    const mapScript = `<script>window.cityCenter = [${city.center[0]}, ${city.center[1]}];\nwindow.storeMarkers = ${JSON.stringify(sortedStores.map(s => ({ id: s.id, name: s.name, address: s.address, coords: s.coords })))};</script>`;
    const content = `\n  <div class="container">\n    <h1>${city.name}, ${st.code}</h1>\n    ${intro}\n    ${kpiChips}\n    ${quickNavSection}\n    <div id="map" class="map-container" aria-label="Map of stores"></div>\n    <div class="grid grid-3">${storeCards}</div>\n  </div>`;
    // JSON-LD for city page (LocalBusiness list)
    const jsonLdItems = sortedStores.map(store => ({
      "@type": "LocalBusiness",
      "name": store.name,
      "image": undefined,
      "telephone": store.phone,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": store.address,
        "addressLocality": city.name,
        "addressRegion": city.state,
        "addressCountry": "US"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": store.coords[0],
        "longitude": store.coords[1]
      },
      "url": store.website
    }));
    const jsonLd = `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `${city.name}, ${st.code} scratch & dent stores`,
      "itemListElement": jsonLdItems
    })}</script>`;
    const html = renderPage({
      title: `${city.name}, ${st.code} Scratch & Dent Appliance Stores`,
      canonical: prefix(`scratch-and-dent-appliances/${stateSlug}/${citySlug}/`),
      ogTitle: `${city.name}, ${st.code} Scratch & Dent Appliance Stores`,
      ogDescription: `Discover discount appliance outlets in ${city.name}, ${st.code}.`,
      header: headerHtml,
      content: content,
      footer: footerHtml,
      jsonLd: jsonLd,
      extraScripts: `${mapScript}<script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js" integrity="sha256-DtkscE02c5HqYbeNT9+7yAL+PUE0uAt2E11tdgkYfCY=" crossorigin=""></script><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" integrity="sha256-sA+4dM+b3kDCejM27C1lRs7Uib6kVrknv0N1tEYtA38=" crossorigin=""/><script src="${prefix('assets/js/map.js')}" defer></script><script src="${prefix('assets/js/hours.js')}" defer></script>`
    });
    const outDir = path.join(distDir, 'scratch-and-dent-appliances', stateSlug, citySlug);
    ensureDir(outDir);
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
  });
}

// Build advertise page (/advertise-with-us/)
function buildAdvertisePage() {
  const pricingCards = [
    { title: 'Monthly Plan', price: '$19/mo', features: ['List your store', 'Priority placement', 'Cancel anytime'] },
    { title: 'Annual Plan', price: '$199/yr', features: ['List your store', 'Featured badge', 'Email support'] },
    { title: 'Lifetime Plan', price: '$499 one-time', features: ['Lifetime listing', 'Top of results', 'Dedicated support'] }
  ];
  const cardsHtml = pricingCards.map(card => {
    const features = card.features.map(f => `<li>${f}</li>`).join('');
    return `<div class="pricing-card"><h3>${card.title}</h3><p class="price">${card.price}</p><ul>${features}</ul><p><a class="btn" href="mailto:info@example.com?subject=Advertise">Get Started</a></p></div>`;
  }).join('');
  const faq = `\n  <h2>Frequently Asked Questions</h2>\n  <p><strong>How do I pay?</strong> Once you sign up, we'll send you an invoice via email. No payment is processed on this site.</p>\n  <p><strong>Can I try it free?</strong> Yes! Use our <a href="${prefix('stores/new/')}">free listing</a> option to get started, then upgrade any time.</p>`;
  const content = `\n  <div class="container">\n    <h1>Advertise With Us</h1>\n    <p>Reach motivated customers looking for discount appliances. Choose a plan that fits your business.</p>\n    <div class="pricing-grid">${cardsHtml}</div>\n    ${faq}\n  </div>`;
  const html = renderPage({
    title: 'Advertise With Us – Scratch & Dent Locator',
    canonical: prefix('advertise-with-us/'),
    ogTitle: 'Advertise With Us',
    ogDescription: 'Promote your scratch & dent appliance store to our visitors.',
    header: headerHtml,
    content: content,
    footer: footerHtml,
    jsonLd: '',
    extraScripts: ''
  });
  const outDir = path.join(distDir, 'advertise-with-us');
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
}

// Build Add Store page (/stores/new/)
function buildAddStorePage() {
  // Build hours selectors: We'll produce select options for times in 30 min increments
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let min of [0, 30]) {
      const h = String(hour).padStart(2, '0');
      const m = String(min).padStart(2, '0');
      times.push(`${h}:${m}`);
    }
  }
  const options = times.map(t => `<option value="${t}">${t}</option>`).join('');
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const hoursRows = days.map(day => {
    return `<tr><th>${day}</th><td><select name="hours_${day.toLowerCase()}_open">${options}</select></td><td><select name="hours_${day.toLowerCase()}_close">${options}</select></td></tr>`;
  }).join('');
  const content = `\n  <div class="container">\n    <h1>Add Your Store</h1>\n    <p>Submit your scratch &amp; dent appliance store. Your submission will be reviewed before appearing in our directory.</p>\n    <form method="POST" action="https://formspree.io/f/maypkyzk">\n      <div class="form-group">\n        <label for="business-name">Business Name</label>\n        <input type="text" id="business-name" name="business_name" required></div>\n      <div class="form-group">\n        <label for="state">State</label>\n        <select id="state" name="state" required>${states.map(s => `<option value="${s.code}">${s.name}</option>`).join('')}</select></div>\n      <div class="form-group">\n        <label for="city">City</label>\n        <input type="text" id="city" name="city" required></div>\n      <div class="form-group">\n        <label for="address">Address</label>\n        <input type="text" id="address" name="address" required></div>\n      <div class="form-group">\n        <label for="phone">Phone</label>\n        <input type="tel" id="phone" name="phone" required></div>\n      <div class="form-group">\n        <label for="website">Website</label>\n        <input type="url" id="website" name="website"></div>\n      <h2>Store Hours</h2>\n      <table class="hours-table">\n        <thead><tr><th>Day</th><th>Open</th><th>Close</th></tr></thead>\n        <tbody>${hoursRows}</tbody>\n      </table>\n      <div class="form-group">\n        <label for="message">Additional Information</label>\n        <textarea id="message" name="message" rows="4"></textarea></div>\n      <button type="submit">Submit</button>\n    </form>\n  </div>`;
  const html = renderPage({
    title: 'Add Your Store – Scratch & Dent Locator',
    canonical: prefix('stores/new/'),
    ogTitle: 'Add Your Store',
    ogDescription: 'Submit your scratch and dent appliance store to be listed in our directory.',
    header: headerHtml,
    content: content,
    footer: footerHtml,
    jsonLd: '',
    extraScripts: ''
  });
  const outDir = path.join(distDir, 'stores', 'new');
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
}

// Build About page (/about/)
function buildAboutPage() {
  const content = `\n  <div class="container">\n    <h1>About Scratch &amp; Dent Locator</h1>\n    <p>We created this directory to help bargain hunters and environmentally conscious shoppers discover scratch &amp; dent appliance outlets across the United States. We believe great deals shouldn’t come at the expense of the planet, and slightly imperfect appliances deserve a second chance.</p>\n    <p>This project is maintained by a small team of volunteers. If you’d like to contribute information or suggest a store, please <a href="${prefix('contact/')}">get in touch</a>.</p>\n  </div>`;
  const html = renderPage({
    title: 'About – Scratch & Dent Locator',
    canonical: prefix('about/'),
    ogTitle: 'About Scratch & Dent Locator',
    ogDescription: 'Learn more about the Scratch & Dent Locator project and team.',
    header: headerHtml,
    content: content,
    footer: footerHtml,
    jsonLd: '',
    extraScripts: ''
  });
  const outDir = path.join(distDir, 'about');
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
}

// Build Contact page (/contact/)
function buildContactPage() {
  const content = `\n  <div class="container">\n    <h1>Contact Us</h1>\n    <p>Have a question or suggestion? We’d love to hear from you. Email us or browse the directory to discover stores near you.</p>\n    <p><a class="btn" href="mailto:info@example.com?subject=Contact">Email Us</a></p>\n    <p>Not seeing your city? <a href="${prefix('stores/new/')}">Suggest a Store</a> or <a href="${prefix('scratch-and-dent-appliances/')}">Browse Directory</a> for nearby options.</p>\n  </div>`;
  const html = renderPage({
    title: 'Contact – Scratch & Dent Locator',
    canonical: prefix('contact/'),
    ogTitle: 'Contact Scratch & Dent Locator',
    ogDescription: 'Get in touch with the Scratch & Dent Locator team.',
    header: headerHtml,
    content: content,
    footer: footerHtml,
    jsonLd: '',
    extraScripts: ''
  });
  const outDir = path.join(distDir, 'contact');
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
}

// Build search.json for client search of states and cities
function buildSearchJson() {
  const entries = [];
  states.forEach(st => {
    entries.push({ id: `state-${st.code}`, title: st.name, type: 'state', url: prefix(`scratch-and-dent-appliances/${slugify(st.name)}/`) });
  });
  cities.forEach(city => {
    const st = stateMap[city.state];
    entries.push({ id: `city-${city.state}-${city.slug}`, title: `${city.name}, ${city.state}`, type: 'city', url: prefix(`scratch-and-dent-appliances/${slugify(st.name)}/${city.slug}/`) });
  });
  fs.writeFileSync(path.join(distDir, 'search.json'), JSON.stringify(entries, null, 2));
}

// Build sitemap.xml
function buildSitemap() {
  const urls = [];
  const today = new Date().toISOString().split('T')[0];
  // Home
  urls.push({ loc: prefix(''), lastmod: today });
  // States index
  urls.push({ loc: prefix('scratch-and-dent-appliances/'), lastmod: today });
  // State pages and city pages
  states.forEach(st => {
    const stateSlug = slugify(st.name);
    urls.push({ loc: prefix(`scratch-and-dent-appliances/${stateSlug}/`), lastmod: today });
  });
  cities.forEach(city => {
    const st = stateMap[city.state];
    const stateSlug = slugify(st.name);
    urls.push({ loc: prefix(`scratch-and-dent-appliances/${stateSlug}/${city.slug}/`), lastmod: today });
  });
  // Other pages
  urls.push({ loc: prefix('advertise-with-us/'), lastmod: today });
  urls.push({ loc: prefix('stores/new/'), lastmod: today });
  urls.push({ loc: prefix('about/'), lastmod: today });
  urls.push({ loc: prefix('contact/'), lastmod: today });
  const xmlEntries = urls.map(u => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xmlEntries}\n</urlset>`;
  fs.writeFileSync(path.join(distDir, 'sitemap.xml'), xml);
}

// Build robots.txt
function buildRobots() {
  const robots = `User-agent: *\nAllow: /\nSitemap: ${prefix('sitemap.xml')}`;
  fs.writeFileSync(path.join(distDir, 'robots.txt'), robots);
}

function main() {
  buildHome();
  buildStatesIndex();
  buildStatePages();
  buildCityPages();
  buildAdvertisePage();
  buildAddStorePage();
  buildAboutPage();
  buildContactPage();
  buildSearchJson();
  buildSitemap();
  buildRobots();
  console.log('Pages built successfully.');
}

main();
