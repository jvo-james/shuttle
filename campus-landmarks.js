(function () {
  'use strict';
  const App = window.ShuttleApp;

  const CACHE_KEY = 'shuttlePulseCampusLandmarksV2';
  const CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
  const CAMPUS_QUERY_BOUNDS = { south: 6.6460, west: -1.5920, north: 6.6920, east: -1.5450 };
  const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];
  const GENERIC_WORDS = new Set(['the','knust','kwame','nkrumah','university','of','and','for','building','block','complex','department','centre','center','area']);

  function normalize(value = '') {
    return String(value)
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[’‘]/g, "'")
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/\bkwame nkrumah university of science and technology\b/g, ' knust ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim().replace(/\s+/g, ' ');
  }

  function usefulTokens(value) {
    return normalize(value).split(' ').filter((token) => token.length > 1 && !GENERIC_WORDS.has(token));
  }

  function candidateNames(tags = {}) {
    return [tags.name, tags.official_name, tags.short_name, tags.loc_name, tags.old_name, tags.alt_name]
      .flatMap((value) => String(value || '').split(';'))
      .map((value) => value.trim()).filter(Boolean);
  }

  function similarity(left, right) {
    const a = normalize(left);
    const b = normalize(right);
    if (!a || !b) return 0;
    if (a === b) return 100;
    if ((a.includes(b) || b.includes(a)) && Math.min(a.length, b.length) >= 7) return 88;
    const at = new Set(usefulTokens(a));
    const bt = new Set(usefulTokens(b));
    if (!at.size || !bt.size) return 0;
    const common = [...at].filter((token) => bt.has(token)).length;
    const union = new Set([...at, ...bt]).size;
    const coverage = common / Math.max(1, Math.min(at.size, bt.size));
    const jaccard = common / Math.max(1, union);
    return Math.round(58 * coverage + 38 * jaccard);
  }

  function featureCoordinate(element) {
    const lat = Number(element.lat ?? element.center?.lat);
    const lon = Number(element.lon ?? element.center?.lon);
    return Number.isFinite(lat) && Number.isFinite(lon) ? [lon, lat] : null;
  }

  function iconFor(category) {
    return ({ academic: 'A', residence: 'H', medical: '+', transport: '↔', finance: '$', worship: '✦', recreation: '●', services: '■', civic: '◆' })[category] || '◆';
  }

  function buildElement(landmark) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `campus-landmark landmark-${landmark.category} landmark-priority-${landmark.priority}`;
    button.setAttribute('aria-label', landmark.name);
    button.title = landmark.name;
    button.innerHTML = `<span class="landmark-pin" aria-hidden="true"><b>${App.escapeHTML(iconFor(landmark.category))}</b></span><span class="landmark-name">${App.escapeHTML(landmark.shortName || landmark.name)}</span>`;
    return button;
  }

  function suppressGenericPoiLabels(map) {
    if (map?.provider !== 'maplibre') return;
    const layers = map.raw.getStyle()?.layers || [];
    layers.forEach((layer) => {
      if (layer.type !== 'symbol') return;
      const id = String(layer.id || '').toLowerCase();
      if (/poi|amenity|shop|airport|transit|housenumber|building.*label|park.*label/.test(id)) {
        try { map.raw.setLayoutProperty(layer.id, 'visibility', 'none'); } catch (_) {}
      }
    });
  }

  async function fetchOpenStreetMapFeatures() {
    const b = CAMPUS_QUERY_BOUNDS;
    const bbox = `${b.south},${b.west},${b.north},${b.east}`;
    const query = `[out:json][timeout:28];(
      nwr["name"]["building"](${bbox});
      nwr["name"]["amenity"](${bbox});
      nwr["name"]["office"](${bbox});
      nwr["name"]["leisure"](${bbox});
      nwr["name"]["tourism"](${bbox});
      nwr["name"]["shop"](${bbox});
      nwr["name"]["highway"](${bbox});
      nwr["name"]["public_transport"](${bbox});
      nwr["name"]["place"](${bbox});
      nwr["name"]["landuse"](${bbox});
      nwr["name"]["man_made"](${bbox});
    );out center tags;`;
    let lastError = null;
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
          body: `data=${encodeURIComponent(query)}`
        });
        if (!response.ok) throw new Error(`OpenStreetMap lookup returned ${response.status}`);
        const data = await response.json();
        return (data.elements || []).filter((item) => item.tags?.name && featureCoordinate(item));
      } catch (error) { lastError = error; }
    }
    throw lastError || new Error('Campus landmark lookup was unavailable.');
  }

  function resolveCatalog(features) {
    const resolved = {};
    const claimed = new Set();
    App.campusLandmarks.forEach((landmark) => {
      if (landmark.coord) return;
      const searchNames = [landmark.name, ...(landmark.aliases || [])];
      let best = null;
      features.forEach((feature) => {
        const key = `${feature.type}:${feature.id}`;
        const names = candidateNames(feature.tags);
        let score = 0;
        searchNames.forEach((wanted) => names.forEach((actual) => { score = Math.max(score, similarity(wanted, actual)); }));
        if (claimed.has(key)) score -= 8;
        if (!best || score > best.score) best = { feature, score, key };
      });
      const minimum = landmark.priority <= 2 ? 70 : 76;
      if (best && best.score >= minimum) {
        resolved[landmark.id] = featureCoordinate(best.feature);
        claimed.add(best.key);
      }
    });
    return resolved;
  }

  App.landmarkManager = {
    map: null,
    markers: new Map(),
    visible: true,
    resolvedCount: 0,

    init(map) {
      this.map = map;
      suppressGenericPoiLabels(map);
      App.campusLandmarks.forEach((landmark) => {
        if (landmark.coord) this.upsert(landmark, landmark.coord, 'local');
      });
      this.restoreCache();
      this.applyVisibility();
      const zoomEvent = map.provider === 'google' ? 'zoom_changed' : 'zoomend';
      map.on(zoomEvent, () => this.applyVisibility());
      this.resolveRemote();
    },

    upsert(landmark, coord, source = 'osm') {
      if (!Array.isArray(coord) || coord.length !== 2) return;
      const existing = this.markers.get(landmark.id);
      if (existing) {
        if (source === 'osm' && existing.source !== 'local') existing.marker.setPosition(coord);
        return;
      }
      const element = buildElement(landmark);
      const marker = App.createDomMarker({ map: this.map, element, position: coord, anchor: 'bottom' });
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        this.map.easeTo({ center: coord, zoom: Math.max(16.6, this.map.getZoom()), duration: 520 });
        App.toast(landmark.name, 'Campus landmark', 'success', 1800);
      });
      this.markers.set(landmark.id, { landmark, marker, element, coord, source });
      this.resolvedCount = this.markers.size;
      this.updateToggleMetadata();
    },

    restoreCache() {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (!cached?.createdAt || Date.now() - cached.createdAt > CACHE_MAX_AGE) return;
        App.campusLandmarks.forEach((landmark) => {
          const coord = cached.coords?.[landmark.id];
          if (coord) this.upsert(landmark, coord, 'cache');
        });
      } catch (_) {}
    },

    async resolveRemote() {
      try {
        const features = await fetchOpenStreetMapFeatures();
        const coords = resolveCatalog(features);
        App.campusLandmarks.forEach((landmark) => {
          if (coords[landmark.id]) this.upsert(landmark, coords[landmark.id], 'osm');
        });
        localStorage.setItem(CACHE_KEY, JSON.stringify({ createdAt: Date.now(), coords }));
        this.applyVisibility();
        document.dispatchEvent(new CustomEvent('campuslandmarksready', { detail: { resolved: this.markers.size, total: App.campusLandmarks.length } }));
      } catch (error) {
        console.warn('Live campus landmark matching was unavailable; using locally anchored landmarks.', error);
      }
    },

    setVisible(visible) {
      this.visible = Boolean(visible);
      this.applyVisibility();
      return this.visible;
    },

    applyVisibility() {
      if (!this.map) return;
      const zoom = this.map.getZoom();
      const maxPriority = zoom >= 17.35 ? 4 : zoom >= 16.25 ? 3 : zoom >= 15.15 ? 2 : 1;
      this.markers.forEach(({ landmark, marker, element }) => {
        const show = this.visible && landmark.priority <= maxPriority && zoom >= 13.7;
        marker.setVisible(show);
        element.classList.toggle('icon-only', zoom < 14.9 || (landmark.priority >= 3 && zoom < 16.8) || (landmark.priority === 4 && zoom < 17.8));
      });
      this.updateToggleMetadata();
    },

    updateToggleMetadata() {
      const button = document.getElementById('landmarkToggleButton');
      if (!button) return;
      button.classList.toggle('active', this.visible);
      button.dataset.count = String(this.markers.size);
      button.title = `${this.visible ? 'Hide' : 'Show'} campus landmarks · ${this.markers.size} located`;
      button.setAttribute('aria-label', `${this.visible ? 'Hide' : 'Show'} selected campus landmarks`);
    }
  };
})();
