(function () {
  'use strict';

  const App = (window.ShuttleApp = window.ShuttleApp || {});

  App.config = {
    campusCenter: [-1.5716, 6.6752],
    campusBounds: [[-1.585, 6.663], [-1.555, 6.687]],
    defaultZoom: 15.7,
    storageKey: 'shuttlePulseStateV1',
    sessionKey: 'shuttlePulseSessionV1',
    googleMapsStorageKey: 'shuttlePulseGoogleMapsConfigV1'
  };

  App.capacityStates = {
    empty: { label: 'Empty', short: 'Empty', color: '#38bdf8', icon: '○', description: 'Plenty of room' },
    available: { label: 'Seats available', short: 'Available', color: '#19ad79', icon: '✓', description: 'Seats are available' },
    standing: { label: 'Standing room only', short: 'Standing', color: '#e8a131', icon: '↟', description: 'Likely standing room' },
    full: { label: 'Full', short: 'Full', color: '#e25454', icon: '!', description: 'No space available' },
    out_of_service: { label: 'Out of service', short: 'Offline', color: '#7b8581', icon: '×', description: 'Not accepting passengers' }
  };

  App.boltGoogleMapStyle = [
    { elementType: 'geometry', stylers: [{ color: '#f2f4f3' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#68736f' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#f2f4f3' }, { weight: 3 }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
    { featureType: 'landscape.man_made', elementType: 'geometry.fill', stylers: [{ color: '#e4e7e5' }] },
    { featureType: 'landscape.natural', elementType: 'geometry.fill', stylers: [{ color: '#edf1ee' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e6e9e7' }, { weight: 0.7 }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#7a8581' }] },
    { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#dce1de' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#dce7ec' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#77909a' }] }
  ];

  App.escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);

  App.clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  App.lerp = (start, end, t) => start + (end - start) * t;
  App.lerpLngLat = (a, b, t) => [App.lerp(a[0], b[0], t), App.lerp(a[1], b[1], t)];
  App.toRadians = (degrees) => (degrees * Math.PI) / 180;
  App.toDegrees = (radians) => (radians * 180) / Math.PI;

  App.distanceKm = (a, b) => {
    if (!a || !b) return Infinity;
    const R = 6371;
    const dLat = App.toRadians(b[1] - a[1]);
    const dLng = App.toRadians(b[0] - a[0]);
    const lat1 = App.toRadians(a[1]);
    const lat2 = App.toRadians(b[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  App.bearing = (a, b) => {
    if (!a || !b) return 0;
    const lat1 = App.toRadians(a[1]);
    const lat2 = App.toRadians(b[1]);
    const dLng = App.toRadians(b[0] - a[0]);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (App.toDegrees(Math.atan2(y, x)) + 360) % 360;
  };

  App.pathSegments = (path) => {
    const segments = [];
    let total = 0;
    for (let i = 0; i < path.length - 1; i += 1) {
      const length = App.distanceKm(path[i], path[i + 1]);
      total += length;
      segments.push({ from: path[i], to: path[i + 1], length, cumulative: total });
    }
    return { segments, total };
  };

  App.positionAlongPath = (path, progress) => {
    if (!path || path.length < 2) return { coord: App.config.campusCenter, bearing: 0, nextIndex: 0 };
    const closed = path[0][0] === path[path.length - 1][0] && path[0][1] === path[path.length - 1][1]
      ? path
      : [...path, path[0]];
    const { segments, total } = App.pathSegments(closed);
    const target = (((progress % 1) + 1) % 1) * total;
    const segment = segments.find((item) => target <= item.cumulative) || segments[segments.length - 1];
    const previous = segment.cumulative - segment.length;
    const t = segment.length ? (target - previous) / segment.length : 0;
    return {
      coord: App.lerpLngLat(segment.from, segment.to, t),
      bearing: App.bearing(segment.from, segment.to),
      nextIndex: Math.min(segments.indexOf(segment) + 1, closed.length - 1)
    };
  };

  App.formatRelative = (timestamp) => {
    if (!timestamp) return 'just now';
    const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds} sec ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hr ago`;
  };

  App.formatClock = (date = new Date()) => new Intl.DateTimeFormat('en-GH', {
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date);

  App.routeById = (routeId) => (App.routes || []).find((route) => route.id === routeId);
  App.stopById = (stopId) => (App.stops || []).find((stop) => stop.id === stopId);
  App.toGoogleLatLng = (coord) => ({ lat: Number(coord[1]), lng: Number(coord[0]) });
  App.fromGoogleLatLng = (latLng) => [latLng.lng(), latLng.lat()];

  App.readGoogleMapsConfig = () => {
    const direct = window.SHUTTLE_GOOGLE_MAPS_CONFIG || App.googleMapsConfig;
    if (direct?.apiKey && direct.apiKey !== 'YOUR_GOOGLE_MAPS_API_KEY') return direct;
    try {
      const stored = JSON.parse(localStorage.getItem(App.config.googleMapsStorageKey));
      return stored || direct || {};
    } catch (_) {
      return direct || {};
    }
  };

  App.saveGoogleMapsConfig = (config) => {
    localStorage.setItem(App.config.googleMapsStorageKey, JSON.stringify({
      apiKey: String(config.apiKey || '').trim(),
      mapId: String(config.mapId || '').trim()
    }));
  };

  let googleMapsPromise = null;
  App.loadGoogleMaps = () => {
    if (window.google?.maps) return Promise.resolve(window.google.maps);
    if (googleMapsPromise) return googleMapsPromise;
    const config = App.readGoogleMapsConfig();
    if (!config.apiKey || config.apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
      return Promise.reject(Object.assign(new Error('A Google Maps JavaScript API key is required.'), { code: 'MISSING_GOOGLE_MAPS_KEY' }));
    }
    googleMapsPromise = new Promise((resolve, reject) => {
      const callbackName = `__shuttleMapsReady_${Date.now()}`;
      const script = document.createElement('script');
      const timer = setTimeout(() => reject(new Error('Google Maps took too long to load.')), 18000);
      window[callbackName] = () => {
        clearTimeout(timer);
        delete window[callbackName];
        resolve(window.google.maps);
      };
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(config.apiKey)}&v=weekly&loading=async&callback=${callbackName}`;
      script.onerror = () => {
        clearTimeout(timer);
        delete window[callbackName];
        googleMapsPromise = null;
        reject(new Error('Google Maps could not load. Check the API key, billing and website restrictions.'));
      };
      document.head.appendChild(script);
    });
    return googleMapsPromise;
  };

  App.renderGoogleMapsSetup = (containerOrId, errorMessage = '') => {
    const container = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
    if (!container) return;
    document.body.classList.add('maps-unconfigured');
    const current = App.readGoogleMapsConfig();
    container.classList.add('map-setup-host');
    container.innerHTML = `
      <section class="google-map-setup" aria-label="Google Maps setup">
        <div class="map-setup-icon">G</div>
        <div class="map-setup-copy">
          <span class="eyebrow">ONE-TIME MAP SETUP</span>
          <h2>Connect Google Maps</h2>
          <p>${App.escapeHTML(errorMessage || 'Add a browser-restricted Google Maps JavaScript API key. The key is saved only in this browser.')}</p>
        </div>
        <form class="map-setup-form">
          <label><span>Google Maps API key</span><input name="apiKey" type="password" autocomplete="off" value="${App.escapeHTML(current.apiKey || '')}" placeholder="AIza…" required /></label>
          <label><span>Map ID <em>optional</em></span><input name="mapId" autocomplete="off" value="${App.escapeHTML(current.mapId || '')}" placeholder="Use for Cloud map styling" /></label>
          <button class="primary-button wide" type="submit">Save and load Google Maps</button>
        </form>
        <small>For production, restrict the key to your domain and enable Maps JavaScript API billing.</small>
      </section>`;
    container.querySelector('.map-setup-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      App.saveGoogleMapsConfig({ apiKey: data.get('apiKey'), mapId: data.get('mapId') });
      location.reload();
    });
  };

  App.createGoogleMap = (containerOrId, options = {}) => {
    const container = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
    const config = App.readGoogleMapsConfig();
    const mapOptions = {
      center: App.toGoogleLatLng(options.center || App.config.campusCenter),
      zoom: options.zoom || App.config.defaultZoom,
      minZoom: options.minZoom || 13,
      maxZoom: options.maxZoom || 20,
      disableDefaultUI: true,
      clickableIcons: false,
      keyboardShortcuts: false,
      gestureHandling: options.gestureHandling || 'greedy',
      backgroundColor: '#eef2f0',
      mapTypeId: 'roadmap',
      restriction: options.restriction || undefined
    };
    if (config.mapId) mapOptions.mapId = config.mapId;
    else mapOptions.styles = App.boltGoogleMapStyle;
    const map = new google.maps.Map(container, mapOptions);
    container.classList.add('google-map-ready');
    return map;
  };

  App.ensureHtmlMapMarkerClass = () => {
    if (App.HtmlMapMarker) return App.HtmlMapMarker;
    App.HtmlMapMarker = class extends google.maps.OverlayView {
      constructor({ map, position, element, anchor = 'center', zIndex = 10 }) {
        super();
        this.position = new google.maps.LatLng(position[1], position[0]);
        this.content = element;
        this.anchor = anchor;
        this.zIndex = zIndex;
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'google-html-marker';
        this.wrapper.style.zIndex = String(zIndex);
        this.wrapper.appendChild(element);
        this.setMap(map);
      }
      onAdd() {
        this.getPanes().overlayMouseTarget.appendChild(this.wrapper);
      }
      draw() {
        const pixel = this.getProjection()?.fromLatLngToDivPixel(this.position);
        if (!pixel) return;
        this.wrapper.style.left = `${pixel.x}px`;
        this.wrapper.style.top = `${pixel.y}px`;
        this.wrapper.style.transform = this.anchor === 'bottom' ? 'translate(-50%, -100%)' : 'translate(-50%, -50%)';
      }
      onRemove() {
        this.wrapper.remove();
      }
      setPosition(coord) {
        this.position = new google.maps.LatLng(coord[1], coord[0]);
        this.draw();
        return this;
      }
      getPosition() {
        return [this.position.lng(), this.position.lat()];
      }
      setVisible(visible) {
        this.wrapper.style.display = visible ? '' : 'none';
      }
      setZIndex(zIndex) {
        this.zIndex = zIndex;
        this.wrapper.style.zIndex = String(zIndex);
      }
      remove() {
        this.setMap(null);
      }
      getElement() {
        return this.content;
      }
    };
    return App.HtmlMapMarker;
  };

  App.createHtmlMapMarker = (options) => {
    const MarkerClass = App.ensureHtmlMapMarkerClass();
    return new MarkerClass(options);
  };

  App.createRoutePolyline = (map, path = [], color = '#17a875') => {
    const googlePath = path.map(App.toGoogleLatLng);
    const glow = new google.maps.Polyline({
      map, path: googlePath, strokeColor: color, strokeOpacity: 0.14, strokeWeight: 13,
      geodesic: true, clickable: false, zIndex: 4
    });
    const line = new google.maps.Polyline({
      map, path: googlePath, strokeColor: color, strokeOpacity: 0.94, strokeWeight: 5,
      geodesic: true, clickable: false, zIndex: 5
    });
    return {
      glow, line,
      setPath(nextPath) {
        const converted = nextPath.map(App.toGoogleLatLng);
        glow.setPath(converted);
        line.setPath(converted);
      },
      setColor(nextColor) {
        glow.setOptions({ strokeColor: nextColor });
        line.setOptions({ strokeColor: nextColor });
      },
      setVisible(visible) {
        glow.setVisible(visible);
        line.setVisible(visible);
      },
      remove() {
        glow.setMap(null);
        line.setMap(null);
      }
    };
  };

  App.fitCoordinates = (map, coordinates, padding = 40) => {
    if (!map || !coordinates?.length) return;
    const bounds = new google.maps.LatLngBounds();
    coordinates.forEach((coord) => bounds.extend(App.toGoogleLatLng(coord)));
    map.fitBounds(bounds, padding);
  };

  App.fitCampus = (map, padding = 40) => {
    const [[west, south], [east, north]] = App.config.campusBounds;
    const bounds = new google.maps.LatLngBounds({ lat: south, lng: west }, { lat: north, lng: east });
    map.fitBounds(bounds, padding);
  };

  App.toast = (title, message = '', type = 'default', duration = 3200) => {
    const region = document.getElementById('toastRegion');
    if (!region) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<div>${type === 'success' ? '✓' : type === 'warning' ? '!' : type === 'error' ? '×' : '•'}</div><div><strong>${App.escapeHTML(title)}</strong>${message ? `<span>${App.escapeHTML(message)}</span>` : ''}</div>`;
    region.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 220);
    }, duration);
  };

  App.setOverlay = (element, open) => {
    if (!element) return;
    element.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.classList.toggle('overlay-open', open);
  };

  App.openSheet = (html) => {
    const sheet = document.getElementById('detailSheet');
    const content = document.getElementById('sheetContent');
    if (!sheet || !content) return;
    content.innerHTML = html;
    App.setOverlay(sheet, true);
  };

  App.closeSheet = () => App.setOverlay(document.getElementById('detailSheet'), false);
  App.openModal = (id) => App.setOverlay(document.getElementById(id), true);
  App.closeModal = (id) => App.setOverlay(document.getElementById(id), false);

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-sheet]')) App.closeSheet();
    if (event.target.closest('[data-close-modal]')) App.closeModal('reportModal');
    if (event.target.closest('[data-close-drawer]')) App.setOverlay(document.getElementById('alertsDrawer'), false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      App.closeSheet();
      App.closeModal('reportModal');
      App.setOverlay(document.getElementById('alertsDrawer'), false);
    }
  });

  App.registerPWA = () => {
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    }
    let installPrompt = null;
    const button = document.getElementById('installButton');
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      installPrompt = event;
      if (button) button.hidden = false;
    });
    button?.addEventListener('click', async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      button.hidden = true;
    });
  };
})();
