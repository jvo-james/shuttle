(function () {
  'use strict';

  const App = (window.ShuttleApp = window.ShuttleApp || {});
  const mapsConfig = window.SHUTTLE_MAPS_CONFIG || {};

  App.config = {
    campusCenter: [-1.5665, 6.6707],
    campusBounds: [[-1.5920, 6.6460], [-1.5450, 6.6920]],
    defaultZoom: 15.25,
    initialUserZoom: 15,
    demoUserLocation: [-1.56925, 6.6760],
    mapStyle: 'https://tiles.openfreemap.org/styles/positron',
    storageKey: 'shuttlePulseStateV3',
    sessionKey: 'shuttlePulseSessionV3',
    mapProvider: mapsConfig.provider || 'google',
    googleMapsApiKey: mapsConfig.googleMapsApiKey || '',
    googleMapsVersion: mapsConfig.googleMapsVersion || 'weekly',
    routeCacheHours: Number(mapsConfig.routeCacheHours || 168),
    geofence: {
      arrivalRadiusM: 34,
      departureRadiusM: 58,
      approachRadiusM: 115,
      minReadings: 3,
      minDwellMs: 1600
    }
  };

  App.googleLightStyle = [
    { elementType: 'geometry', stylers: [{ color: '#f4f4f4' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#59645f' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }, { weight: 3 }] },
    { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ visibility: 'off' }] },
    { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#f4f4f4' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#f4f4f4' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#e4f1e8' }] },
    { featureType: 'poi.park', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.school', elementType: 'geometry', stylers: [{ visibility: 'on' }, { color: '#eef1ef' }] },
    { featureType: 'poi.school', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e8ecea' }, { weight: 0.7 }] },
    { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#718079' }] },
    { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dce9ed' }] },
    { featureType: 'water', elementType: 'labels.text', stylers: [{ visibility: 'off' }] }
  ];

  App.capacityStates = {
    empty: { label: 'Plenty of space', short: 'Plenty of space', color: '#38a3ff', description: 'Most seats are free' },
    available: { label: 'Seats available', short: 'Seats available', color: '#14a673', description: 'Seats are available' },
    standing: { label: 'Standing room', short: 'Standing room', color: '#e69b24', description: 'Very few seats remain' },
    full: { label: 'Full', short: 'Full', color: '#e25555', description: 'No space available' },
    out_of_service: { label: 'Out of service', short: 'Offline', color: '#7b8581', description: 'Not accepting passengers' }
  };

  App.escapeHTML = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);

  App.clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  App.lerp = (start, end, t) => start + (end - start) * t;
  App.lerpLngLat = (a, b, t) => [App.lerp(a[0], b[0], t), App.lerp(a[1], b[1], t)];
  App.toRadians = (degrees) => (degrees * Math.PI) / 180;
  App.toDegrees = (radians) => (radians * 180) / Math.PI;
  App.toLatLngLiteral = (coord) => ({ lat: Number(coord?.[1]), lng: Number(coord?.[0]) });
  App.fromGoogleLatLng = (value) => {
    if (!value) return null;
    const lat = typeof value.lat === 'function' ? value.lat() : value.lat;
    const lng = typeof value.lng === 'function' ? value.lng() : value.lng;
    return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) ? [Number(lng), Number(lat)] : null;
  };

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

  App.pathSegments = (path = []) => {
    const segments = [];
    let total = 0;
    for (let index = 0; index < path.length - 1; index += 1) {
      const from = path[index];
      const to = path[index + 1];
      const length = App.distanceKm(from, to);
      total += length;
      segments.push({ from, to, length, cumulative: total, index });
    }
    return { segments, total };
  };

  App.positionAlongPath = (path, progress) => {
    if (!path || path.length < 2) return { coord: App.config.campusCenter, bearing: 0, nextPathIndex: 1 };
    const { segments, total } = App.pathSegments(path);
    const target = App.clamp(progress, 0, 1) * total;
    const segment = segments.find((item) => target <= item.cumulative) || segments[segments.length - 1];
    const previous = segment.cumulative - segment.length;
    const t = segment.length ? (target - previous) / segment.length : 0;
    return {
      coord: App.lerpLngLat(segment.from, segment.to, t),
      bearing: App.bearing(segment.from, segment.to),
      nextPathIndex: segment.index + 1
    };
  };

  App.splitPathAtProgress = (path, progress) => {
    if (!path || path.length < 2) return { completed: path || [], remaining: path || [] };
    const point = App.positionAlongPath(path, progress);
    const completed = path.slice(0, point.nextPathIndex);
    const remaining = path.slice(point.nextPathIndex);
    completed.push(point.coord);
    remaining.unshift(point.coord);
    return { completed, remaining };
  };

  App.closestProgressOnPath = (path, coord) => {
    if (!path || path.length < 2 || !coord) return 0;
    const { segments, total } = App.pathSegments(path);
    let best = { distance: Infinity, progress: 0 };
    let previousDistance = 0;
    segments.forEach((segment) => {
      const ax = segment.from[0];
      const ay = segment.from[1];
      const bx = segment.to[0];
      const by = segment.to[1];
      const dx = bx - ax;
      const dy = by - ay;
      const denominator = dx * dx + dy * dy || 1;
      const t = App.clamp(((coord[0] - ax) * dx + (coord[1] - ay) * dy) / denominator, 0, 1);
      const projected = [ax + dx * t, ay + dy * t];
      const distance = App.distanceKm(coord, projected);
      if (distance < best.distance) best = { distance, progress: (previousDistance + segment.length * t) / Math.max(total, 0.0001) };
      previousDistance += segment.length;
    });
    return App.clamp(best.progress, 0, 1);
  };

  App.lineFeature = (coordinates, properties = {}) => ({
    type: 'Feature',
    properties,
    geometry: { type: 'LineString', coordinates }
  });
  App.featureCollection = (features = []) => ({ type: 'FeatureCollection', features });

  const routeAliases = {
    'commercial-ksb': 'COMM_KSB',
    'brunei-ksb': 'BRUNEI_KSB',
    'commercial-medical': 'COMM_MED',
    'ksb-medical': 'KSB_MED'
  };
  App.normalizeRouteId = (routeId) => routeAliases[routeId] || routeId;
  App.normalizeDirectionId = (directionId) => ({ outbound: 'forward', inbound: 'return' }[directionId] || directionId || 'forward');
  App.routeById = (routeId) => (App.routes || []).find((route) => route.id === App.normalizeRouteId(routeId));
  App.stopById = (stopId) => (App.stops || []).find((stop) => stop.id === stopId);
  App.directionFor = (routeId, directionId) => App.routeById(routeId)?.directions?.[App.normalizeDirectionId(directionId)] || null;
  App.oppositeDirection = (directionId) => App.normalizeDirectionId(directionId) === 'forward' ? 'return' : 'forward';
  App.directionLabel = (routeId, directionId) => App.directionFor(routeId, directionId)?.label || App.routeById(routeId)?.name || 'Campus shuttle';
  App.destinationCode = (routeId, directionId) => {
    const direction = App.directionFor(routeId, directionId);
    return App.stopById(direction?.destinationId)?.code || 'BUS';
  };

  App.getStopProgresses = (direction, force = false) => {
    if (!direction) return [];
    if (direction.stopProgresses && !force) return direction.stopProgresses;
    direction.stopProgresses = direction.stopIds.map((stopId) => App.closestProgressOnPath(direction.path, App.stopById(stopId)?.coord));
    if (direction.stopProgresses.length) {
      direction.stopProgresses[0] = 0;
      direction.stopProgresses[direction.stopProgresses.length - 1] = 1;
    }
    return direction.stopProgresses;
  };

  App.getTripContext = (routeId, directionId, progress) => {
    const direction = App.directionFor(routeId, directionId);
    if (!direction) return null;
    const normalizedProgress = App.clamp(Number(progress || 0), 0, 1);
    const progresses = App.getStopProgresses(direction);
    let nextIndex = progresses.findIndex((value) => value > normalizedProgress + 0.004);
    if (nextIndex === -1) nextIndex = direction.stopIds.length - 1;
    let completedIndex = Math.max(-1, nextIndex - 1);
    if (normalizedProgress <= 0.008) completedIndex = -1;
    const nearestStopIndex = progresses.reduce((best, value, index) => {
      const distance = Math.abs(value - normalizedProgress);
      return distance < best.distance ? { index, distance } : best;
    }, { index: 0, distance: Infinity }).index;
    const currentStop = completedIndex >= 0 ? App.stopById(direction.stopIds[completedIndex]) : App.stopById(direction.stopIds[0]);
    const nextStop = App.stopById(direction.stopIds[nextIndex]);
    const destination = App.stopById(direction.destinationId);
    return { direction, progresses, nextIndex, completedIndex, nearestStopIndex, currentStop, nextStop, destination };
  };

  App.resolveDemoTrip = (shuttle, now = Date.now(), index = 0) => {
    const durationSeconds = Number(shuttle.durationSeconds || 210 + index * 13);
    const phase = (((now / 1000) / durationSeconds) + Number(shuttle.offset || 0)) % 2;
    const initialDirection = App.normalizeDirectionId(shuttle.direction || 'forward');
    const direction = phase < 1 ? initialDirection : App.oppositeDirection(initialDirection);
    const progress = phase < 1 ? phase : phase - 1;
    const directionData = App.directionFor(shuttle.routeId, direction);
    const point = App.positionAlongPath(directionData?.path || [App.config.campusCenter, App.config.campusCenter], progress);
    const context = App.getTripContext(shuttle.routeId, direction, progress);
    const nextDistance = context?.nextStop ? App.distanceKm(point.coord, context.nextStop.coord) * 1000 : Infinity;
    const tripStatus = nextDistance <= App.config.geofence.arrivalRadiusM
      ? `At ${context.nextStop?.short || 'stop'}`
      : nextDistance <= App.config.geofence.approachRadiusM
        ? `Approaching ${context.nextStop?.short || 'stop'}`
        : `En route to ${context.nextStop?.short || 'next stop'}`;
    return {
      ...shuttle,
      routeId: App.normalizeRouteId(shuttle.routeId),
      direction,
      progress,
      coord: point.coord,
      bearing: point.bearing,
      currentStopId: context?.currentStop?.id,
      nextStopId: context?.nextStop?.id,
      destinationId: context?.destination?.id,
      tripStatus
    };
  };

  App.estimateEtaMinutes = (from, to, speedKmh = 18) => Math.max(1, Math.round((App.distanceKm(from, to) / Math.max(speedKmh, 7)) * 60 * 1.25));

  App.formatRelative = (timestamp) => {
    if (!timestamp) return 'just now';
    const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds} sec ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    return `${Math.floor(minutes / 60)} hr ago`;
  };

  App.formatClock = (date = new Date()) => new Intl.DateTimeFormat('en-GH', {
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(date);

  let googleLoadPromise = null;
  App.hasGoogleMapsKey = () => {
    const key = String(App.config.googleMapsApiKey || '').trim();
    return Boolean(key && !/YOUR_|PASTE_|REPLACE_/i.test(key));
  };

  App.loadGoogleMaps = () => {
    if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
    if (googleLoadPromise) return googleLoadPromise;
    googleLoadPromise = new Promise((resolve, reject) => {
      const callback = `__shuttleMapsReady_${Date.now()}`;
      const script = document.createElement('script');
      const params = new URLSearchParams({
        key: App.config.googleMapsApiKey,
        v: App.config.googleMapsVersion,
        loading: 'async',
        callback
      });
      const timeout = setTimeout(() => {
        delete window[callback];
        reject(new Error('Google Maps took too long to load.'));
      }, 18000);
      window[callback] = () => {
        clearTimeout(timeout);
        delete window[callback];
        resolve(window.google.maps);
      };
      script.async = true;
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.onerror = () => {
        clearTimeout(timeout);
        delete window[callback];
        reject(new Error('Google Maps could not be loaded.'));
      };
      document.head.appendChild(script);
    });
    return googleLoadPromise;
  };

  class GoogleMapAdapter {
    constructor(raw) {
      this.provider = 'google';
      this.raw = raw;
      this._sources = new Map();
      this._lineLayers = new Map();
      this._lineObjects = new Map();
      this._ready = true;
    }
    loaded() { return true; }
    on(event, handler) { return this.raw.addListener(event, handler); }
    once(event, handler) { return google.maps.event.addListenerOnce(this.raw, event, handler); }
    getZoom() { return Number(this.raw.getZoom() || App.config.defaultZoom); }
    easeTo(options = {}) {
      if (options.center) this.raw.panTo(App.toLatLngLiteral(options.center));
      if (Number.isFinite(options.zoom)) this.raw.setZoom(options.zoom);
      if (Array.isArray(options.offset) && (options.offset[0] || options.offset[1])) {
        setTimeout(() => this.raw.panBy(-options.offset[0], -options.offset[1]), 120);
      }
    }
    fitCoordinates(coordinates, padding = 70, maxZoom = 16.4) {
      const bounds = new google.maps.LatLngBounds();
      coordinates.forEach((coord) => bounds.extend(App.toLatLngLiteral(coord)));
      const value = typeof padding === 'number' ? padding : padding;
      this.raw.fitBounds(bounds, value);
      google.maps.event.addListenerOnce(this.raw, 'idle', () => {
        if (this.raw.getZoom() > maxZoom) this.raw.setZoom(maxZoom);
      });
    }
  }

  class MapLibreAdapter {
    constructor(raw) {
      this.provider = 'maplibre';
      this.raw = raw;
    }
    loaded() { return this.raw.loaded(); }
    on(event, handler) { return this.raw.on(event, handler); }
    once(event, handler) { return this.raw.once(event, handler); }
    getZoom() { return this.raw.getZoom(); }
    easeTo(options) { return this.raw.easeTo(options); }
    fitCoordinates(coordinates, padding = 70, maxZoom = 16.4) {
      const bounds = coordinates.reduce((box, coord) => box.extend(coord), new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
      this.raw.fitBounds(bounds, { padding, maxZoom, duration: 650 });
    }
  }

  App.createMap = async (container, options = {}) => {
    const element = typeof container === 'string' ? document.getElementById(container) : container;
    if (!element) throw new Error('Map container was not found.');

    if (App.config.mapProvider === 'google' && App.hasGoogleMapsKey()) {
      try {
        await App.loadGoogleMaps();
        const { Map: GoogleMap, ColorScheme, RenderingType } = await google.maps.importLibrary('maps');
        const raw = new GoogleMap(element, {
          center: App.toLatLngLiteral(options.center || App.config.campusCenter),
          zoom: options.zoom ?? App.config.defaultZoom,
          minZoom: options.minZoom ?? 12.5,
          maxZoom: options.maxZoom ?? 19.5,
          mapTypeId: 'roadmap',
          colorScheme: ColorScheme?.LIGHT,
          renderingType: RenderingType?.RASTER || 'RASTER',
          styles: App.googleLightStyle,
          disableDefaultUI: true,
          clickableIcons: false,
          gestureHandling: 'greedy',
          backgroundColor: '#f4f4f4',
          keyboardShortcuts: true
        });
        await new Promise((resolve) => google.maps.event.addListenerOnce(raw, 'idle', resolve));
        App.activeMapProvider = 'google';
        return new GoogleMapAdapter(raw);
      } catch (error) {
        console.warn('Google Maps unavailable; using light fallback map.', error);
      }
    }

    if (!window.maplibregl) throw new Error('No map provider is available. Add a Google Maps key or check the internet connection.');
    const raw = new maplibregl.Map({
      container: element,
      style: options.style || App.config.mapStyle,
      center: options.center || App.config.campusCenter,
      zoom: options.zoom ?? App.config.defaultZoom,
      minZoom: options.minZoom ?? 12.5,
      maxZoom: options.maxZoom ?? 19.5,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      cooperativeGestures: false,
      fadeDuration: 0
    });
    raw.dragPan.enable();
    raw.dragRotate.enable();
    raw.scrollZoom.enable();
    raw.boxZoom.enable();
    raw.doubleClickZoom.enable();
    raw.touchZoomRotate.enable();
    raw.keyboard.enable();
    const adapter = new MapLibreAdapter(raw);
    await App.waitForMap(adapter);
    App.activeMapProvider = 'maplibre';
    return adapter;
  };

  App.waitForMap = (map) => new Promise((resolve, reject) => {
    if (!map) { reject(new Error('Map was not created.')); return; }
    if (map.provider === 'google' || map.loaded()) { resolve(map); return; }
    const timer = setTimeout(() => reject(new Error('The map took too long to load.')), 18000);
    map.once('load', () => { clearTimeout(timer); resolve(map); });
    map.once('error', (event) => {
      if (event?.error?.message?.includes('style')) {
        clearTimeout(timer);
        reject(event.error);
      }
    });
  });

  App.addAttribution = (map) => {
    if (map?.provider === 'maplibre') map.raw.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
  };

  function anchorTransform(anchor) {
    const values = {
      center: 'translate(-50%, -50%)',
      bottom: 'translate(-50%, -100%)',
      top: 'translate(-50%, 0)',
      left: 'translate(0, -50%)',
      right: 'translate(-100%, -50%)'
    };
    return values[anchor] || values.center;
  }

  App.createDomMarker = ({ map, element, position, anchor = 'center', offset = [0, 0] }) => {
    if (map.provider === 'google') {
      class DomOverlay extends google.maps.OverlayView {
        constructor() {
          super();
          this.coord = position;
          this.visible = true;
          this.holder = document.createElement('div');
          this.holder.className = 'google-dom-marker';
          this.holder.style.position = 'absolute';
          this.holder.style.willChange = 'transform';
          this.holder.appendChild(element);
          this.setMap(map.raw);
        }
        onAdd() { this.getPanes().overlayMouseTarget.appendChild(this.holder); }
        draw() {
          const point = this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(this.coord[1], this.coord[0]));
          if (!point) return;
          this.holder.style.left = `${point.x + Number(offset[0] || 0)}px`;
          this.holder.style.top = `${point.y + Number(offset[1] || 0)}px`;
          this.holder.style.transform = anchorTransform(anchor);
          this.holder.style.display = this.visible ? '' : 'none';
        }
        onRemove() { this.holder.remove(); }
        setPosition(coord) { this.coord = coord; this.draw(); }
        setVisible(visible) { this.visible = Boolean(visible); this.draw(); }
        getElement() { return element; }
        remove() { this.setMap(null); }
      }
      return new DomOverlay();
    }

    const marker = new maplibregl.Marker({ element, anchor, offset }).setLngLat(position).addTo(map.raw);
    marker.getElement = () => element;
    marker.setPosition = (coord) => marker.setLngLat(coord);
    marker.setVisible = (visible) => { element.hidden = !visible; };
    return marker;
  };

  App.fitCoordinates = (map, coordinates, padding = 70, maxZoom = 16.4) => {
    if (!map || !coordinates?.length) return;
    map.fitCoordinates(coordinates, padding, maxZoom);
  };

  App.fitCampus = (map, padding = { top: 160, right: 90, bottom: 130, left: 90 }) => {
    const coordinates = [
      [App.config.campusBounds[0][0], App.config.campusBounds[0][1]],
      [App.config.campusBounds[1][0], App.config.campusBounds[1][1]]
    ];
    App.fitCoordinates(map, coordinates, padding, 15.4);
  };

  function paintValue(value, properties, fallback) {
    if (Array.isArray(value) && value[0] === 'get') return properties?.[value[1]] ?? fallback;
    return value ?? fallback;
  }

  function redrawGoogleLayer(map, layerId) {
    const layer = map._lineLayers.get(layerId);
    if (!layer) return;
    (map._lineObjects.get(layerId) || []).forEach((polyline) => polyline.setMap(null));
    const data = map._sources.get(layer.source) || App.featureCollection([]);
    const objects = [];
    (data.features || []).forEach((feature) => {
      if (feature.geometry?.type !== 'LineString' || feature.geometry.coordinates.length < 2) return;
      const paint = layer.paint || {};
      const color = paintValue(paint['line-color'], feature.properties, '#10936b');
      const width = Number(paintValue(paint['line-width'], feature.properties, 4));
      const opacity = Number(paintValue(paint['line-opacity'], feature.properties, 1));
      const dash = paint['line-dasharray'];
      const options = {
        map: map.raw,
        path: feature.geometry.coordinates.map(App.toLatLngLiteral),
        strokeColor: color,
        strokeWeight: width,
        strokeOpacity: dash ? 0 : opacity,
        geodesic: false,
        clickable: false,
        zIndex: Number(layer.layout?.zIndex || 1)
      };
      if (dash) {
        options.icons = [{
          icon: { path: 'M 0,-1 0,1', strokeOpacity: opacity, strokeColor: color, scale: Math.max(1.2, width / 3) },
          offset: '0',
          repeat: `${Math.max(9, width * 2.5)}px`
        }];
      }
      objects.push(new google.maps.Polyline(options));
    });
    map._lineObjects.set(layerId, objects);
  }

  App.upsertGeoJSON = (map, sourceId, data) => {
    if (map.provider === 'google') {
      map._sources.set(sourceId, data);
      map._lineLayers.forEach((layer, layerId) => { if (layer.source === sourceId) redrawGoogleLayer(map, layerId); });
      return;
    }
    const source = map.raw.getSource(sourceId);
    if (source) source.setData(data);
    else map.raw.addSource(sourceId, { type: 'geojson', data });
  };

  App.addLineLayer = (map, id, source, paint = {}, layout = {}) => {
    if (map.provider === 'google') {
      if (!map._lineLayers.has(id)) map._lineLayers.set(id, { source, paint, layout });
      redrawGoogleLayer(map, id);
      return;
    }
    if (map.raw.getLayer(id)) return;
    map.raw.addLayer({
      id,
      type: 'line',
      source,
      layout: { 'line-cap': 'round', 'line-join': 'round', ...layout },
      paint
    });
  };

  App.setUserAccuracyCircle = (map, coord, radiusMeters = 45) => {
    if (!map || !coord) return;
    if (map.provider === 'google') {
      if (!map._userAccuracyCircle) {
        map._userAccuracyCircle = new google.maps.Circle({
          map: map.raw,
          center: App.toLatLngLiteral(coord),
          radius: radiusMeters,
          fillColor: '#2f80ed',
          fillOpacity: 0.08,
          strokeColor: '#2f80ed',
          strokeOpacity: 0.18,
          strokeWeight: 1,
          clickable: false,
          zIndex: 1
        });
      } else {
        map._userAccuracyCircle.setCenter(App.toLatLngLiteral(coord));
        map._userAccuracyCircle.setRadius(Math.max(20, Number(radiusMeters || 45)));
      }
      return;
    }
    App.upsertGeoJSON(map, 'user-accuracy', App.featureCollection([{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: coord } }]));
    if (!map.raw.getLayer('user-accuracy-circle')) {
      map.raw.addLayer({
        id: 'user-accuracy-circle', type: 'circle', source: 'user-accuracy',
        paint: { 'circle-radius': 54, 'circle-color': '#2f80ed', 'circle-opacity': 0.08, 'circle-stroke-color': '#2f80ed', 'circle-stroke-opacity': 0.13, 'circle-stroke-width': 1 }
      });
    }
  };

  App.setOverlay = (element, open) => {
    if (!element) return;
    element.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.classList.toggle('overlay-open', Boolean(open));
  };

  App.openSheet = (html) => {
    const sheet = document.getElementById('detailSheet');
    const content = document.getElementById('sheetContent');
    if (!sheet || !content) return;
    content.innerHTML = html;
    App.setOverlay(sheet, true);
  };
  App.closeSheet = () => App.setOverlay(document.getElementById('detailSheet'), false);

  App.toast = (title, message = '', tone = 'success', duration = 2600) => {
    const region = document.getElementById('toastRegion');
    if (!region) return;
    const item = document.createElement('div');
    item.className = `toast ${tone}`;
    item.innerHTML = `<div><strong>${App.escapeHTML(title)}</strong><span>${App.escapeHTML(message)}</span></div>`;
    region.appendChild(item);
    setTimeout(() => item.classList.add('leaving'), Math.max(500, duration - 260));
    setTimeout(() => item.remove(), duration);
  };

  App.renderMapFallback = (containerId, message) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<div class="map-fallback"><div class="map-fallback-icon">↻</div><h2>Map unavailable</h2><p>${App.escapeHTML(message || 'Check your connection and reload the page.')}</p><button class="primary-button" onclick="location.reload()">Reload map</button></div>`;
  };

  App.progressHTML = (routeId, directionId, progress, activeStopId = '') => {
    const context = App.getTripContext(routeId, directionId, progress);
    if (!context) return '';
    const activeIndex = Math.max(0, context.direction.stopIds.indexOf(activeStopId) >= 0
      ? context.direction.stopIds.indexOf(activeStopId)
      : context.nextIndex);
    return `<div class="route-progress vertical" aria-label="Route progress">${context.direction.stopIds.map((stopId, index) => {
      const stop = App.stopById(stopId);
      const state = index < activeIndex ? 'complete' : index === activeIndex ? 'current' : 'upcoming';
      const symbol = state === 'complete' ? '✓' : state === 'current' ? '●' : '○';
      return `<div class="route-progress-step ${state}"><span aria-hidden="true">${symbol}</span><strong>${App.escapeHTML(stop?.short || '')}</strong></div>`;
    }).join('')}</div>`;
  };

  class GeofenceTracker {
    constructor(options = {}) {
      this.options = { ...App.config.geofence, ...options };
      this.candidateStopId = '';
      this.candidateSince = 0;
      this.candidateReadings = 0;
      this.confirmedStopId = '';
      this.lastDepartedStopId = '';
      this.departedAt = 0;
      this.terminalLockId = '';
      this.turnIssuedForTerminal = '';
    }

    update({ coord, routeId, directionId, progress = 0, timestamp = Date.now() }) {
      const direction = App.directionFor(routeId, directionId);
      if (!direction || !coord) return { status: 'En route', shouldTurn: false };
      const context = App.getTripContext(routeId, directionId, progress);
      const candidateIds = direction.stopIds;
      const nearest = candidateIds.map((id) => ({ id, distanceM: App.distanceKm(coord, App.stopById(id)?.coord) * 1000 }))
        .sort((a, b) => a.distanceM - b.distanceM)[0];
      const nextStopId = context?.nextStop?.id || direction.destinationId;
      const nextStop = App.stopById(nextStopId);
      const nextDistanceM = nextStop ? App.distanceKm(coord, nextStop.coord) * 1000 : Infinity;
      let status = `En route to ${nextStop?.short || 'next stop'}`;
      let phase = 'en_route';
      let shouldTurn = false;

      if (this.confirmedStopId) {
        const confirmed = App.stopById(this.confirmedStopId);
        const distanceM = confirmed ? App.distanceKm(coord, confirmed.coord) * 1000 : Infinity;
        if (distanceM > this.options.departureRadiusM) {
          this.lastDepartedStopId = this.confirmedStopId;
          this.departedAt = timestamp;
          this.confirmedStopId = '';
          this.candidateStopId = '';
          this.candidateReadings = 0;
          status = `Departed ${confirmed?.short || 'stop'}`;
          phase = 'departed';
          if (this.terminalLockId === confirmed?.id) {
            this.terminalLockId = '';
            this.turnIssuedForTerminal = '';
          }
        } else {
          const isTerminal = confirmed?.id === direction.destinationId || confirmed?.id === direction.originId;
          if (confirmed?.id === direction.destinationId && this.turnIssuedForTerminal !== confirmed.id) {
            this.terminalLockId = confirmed.id;
            this.turnIssuedForTerminal = confirmed.id;
            shouldTurn = true;
            status = `Turning around at ${confirmed.short}`;
            phase = 'turning';
          } else {
            status = `At ${confirmed?.short || 'stop'}`;
            phase = isTerminal && this.terminalLockId ? 'turning' : 'at_stop';
          }
        }
      } else if (nearest && nearest.distanceM <= this.options.arrivalRadiusM) {
        if (this.candidateStopId !== nearest.id) {
          this.candidateStopId = nearest.id;
          this.candidateSince = timestamp;
          this.candidateReadings = 1;
        } else {
          this.candidateReadings += 1;
        }
        const dwellReached = timestamp - this.candidateSince >= this.options.minDwellMs;
        if (this.candidateReadings >= this.options.minReadings && dwellReached) {
          this.confirmedStopId = nearest.id;
          status = `At ${App.stopById(nearest.id)?.short || 'stop'}`;
          phase = 'at_stop';
          if (nearest.id === direction.destinationId && this.turnIssuedForTerminal !== nearest.id) {
            this.terminalLockId = nearest.id;
            this.turnIssuedForTerminal = nearest.id;
            shouldTurn = true;
            status = `Turning around at ${App.stopById(nearest.id)?.short || 'terminal'}`;
            phase = 'turning';
          }
        } else {
          status = `Approaching ${App.stopById(nearest.id)?.short || 'stop'}`;
          phase = 'approaching';
        }
      } else if (nextDistanceM <= this.options.approachRadiusM) {
        this.candidateStopId = nextStopId;
        this.candidateSince ||= timestamp;
        this.candidateReadings = 0;
        status = `Approaching ${nextStop?.short || 'next stop'}`;
        phase = 'approaching';
      } else if (this.lastDepartedStopId && timestamp - this.departedAt < 6000) {
        status = `Departed ${App.stopById(this.lastDepartedStopId)?.short || 'stop'}`;
        phase = 'departed';
      } else {
        this.candidateStopId = '';
        this.candidateReadings = 0;
        this.candidateSince = 0;
      }

      return {
        status,
        phase,
        shouldTurn,
        atStopId: this.confirmedStopId,
        nextStopId,
        nearestDistanceM: nearest?.distanceM ?? Infinity,
        terminalLockId: this.terminalLockId
      };
    }
  }
  App.GeofenceTracker = GeofenceTracker;

  App.registerPWA = () => {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./shuttle-service-worker.js').catch(() => {});
  };

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-close-sheet]')) App.closeSheet();
    if (event.target.closest('[data-close-modal]')) App.setOverlay(document.getElementById('reportModal'), false);
    if (event.target.closest('[data-close-drawer]')) App.setOverlay(document.getElementById('alertsDrawer'), false);
  });
})();
