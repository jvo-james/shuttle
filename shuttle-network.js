(function () {
  'use strict';
  const App = window.ShuttleApp;

  const KNUST_STOPS = {
    commercial: { name: 'Commercial Area', lat: 6.6748, lng: -1.5651 },
    library: { name: 'Prempeh II Library', lat: 6.6751, lng: -1.5730 },
    science: { name: 'College of Science Bus Stop', lat: 6.6732, lng: -1.5674 },
    ksb: { name: 'KSB', lat: 6.6691, lng: -1.5681 },
    unity: { name: 'Unity Hall Bus Stop', lat: 6.6761, lng: -1.5694 },
    casely_hayford: { name: 'Casely Hayford Bus Stop', lat: 6.6741, lng: -1.5601 },
    katanga: { name: 'Katanga Bus Stop', lat: 6.6711, lng: -1.5734 },
    brunei: { name: 'Brunei Complex', lat: 6.6786, lng: -1.5711 },
    gaza: { name: 'Gaza', lat: 6.6645, lng: -1.5642 },
    med_village: { name: 'Medical Village', lat: 6.6582, lng: -1.5593 }
  };

  const ROUTES = {
    COMM_KSB: {
      name: 'Commercial ↔ KSB',
      chip: 'Comm ↔ KSB',
      color: '#0b956a',
      forward: { label: 'Commercial → KSB', stops: ['commercial', 'unity', 'science', 'ksb'] },
      return: { label: 'KSB → Commercial', stops: ['ksb', 'casely_hayford', 'unity', 'commercial'] }
    },
    BRUNEI_KSB: {
      name: 'Brunei ↔ KSB',
      chip: 'Brunei ↔ KSB',
      color: '#2f7de1',
      forward: { label: 'Brunei → KSB', stops: ['brunei', 'katanga', 'library', 'science', 'ksb'] },
      return: { label: 'KSB → Brunei', stops: ['ksb', 'casely_hayford', 'library', 'katanga', 'brunei'] }
    },
    COMM_MED: {
      name: 'Commercial ↔ Medical Village',
      chip: 'Comm ↔ Med Village',
      color: '#d38a18',
      forward: { label: 'Commercial → Medical Village', stops: ['commercial', 'unity', 'science', 'gaza', 'med_village'] },
      return: { label: 'Medical Village → Commercial', stops: ['med_village', 'gaza', 'science', 'unity', 'commercial'] }
    },
    KSB_MED: {
      name: 'KSB ↔ Medical Village',
      chip: 'KSB ↔ Med Village',
      color: '#865fce',
      forward: { label: 'KSB → Medical Village', stops: ['ksb', 'science', 'gaza', 'med_village'] },
      return: { label: 'Medical Village → KSB', stops: ['med_village', 'gaza', 'science', 'ksb'] }
    }
  };

  window.KNUST_STOPS = Object.freeze(KNUST_STOPS);
  window.ROUTES = Object.freeze(ROUTES);

  const stopMeta = {
    commercial: { short: 'Commercial Area', code: 'COMM', baseCrowd: 21 },
    library: { short: 'Prempeh II Library', code: 'LIB', baseCrowd: 10 },
    science: { short: 'College of Science', code: 'COS', baseCrowd: 12 },
    ksb: { short: 'KSB', code: 'KSB', baseCrowd: 17 },
    unity: { short: 'Unity Hall', code: 'UNITY', baseCrowd: 15 },
    casely_hayford: { short: 'Casely Hayford', code: 'CASELY', baseCrowd: 11 },
    katanga: { short: 'Katanga', code: 'KAT', baseCrowd: 16 },
    brunei: { short: 'Brunei', code: 'BRUN', baseCrowd: 18 },
    gaza: { short: 'Gaza', code: 'GAZA', baseCrowd: 14 },
    med_village: { short: 'Medical Village', code: 'MED', baseCrowd: 13 }
  };

  App.stops = Object.entries(KNUST_STOPS).map(([id, stop]) => ({
    id,
    ...stop,
    ...stopMeta[id],
    coord: [stop.lng, stop.lat],
    provisional: true
  }));

  const P = (id) => App.stopById(id).coord;

  // Dense, directional road-shaped fallbacks. Google Routes replaces these paths at runtime
  // whenever a valid Maps JavaScript + Routes API key is configured.
  const ROAD_PATH_FALLBACKS = {
    COMM_KSB: {
      forward: [
        P('commercial'), [-1.56565, 6.67515], [-1.56645, 6.67555], [-1.56745, 6.67595], P('unity'),
        [-1.56915, 6.67535], [-1.56855, 6.67465], [-1.56795, 6.67385], P('science'),
        [-1.56762, 6.67235], [-1.56782, 6.67065], P('ksb')
      ],
      return: [
        P('ksb'), [-1.56675, 6.66975], [-1.56470, 6.67080], [-1.56245, 6.67240], P('casely_hayford'),
        [-1.56175, 6.67500], [-1.56450, 6.67535], [-1.56720, 6.67570], P('unity'),
        [-1.56855, 6.67600], [-1.56710, 6.67570], [-1.56600, 6.67525], P('commercial')
      ]
    },
    BRUNEI_KSB: {
      forward: [
        P('brunei'), [-1.57155, 6.67755], [-1.57215, 6.67590], [-1.57275, 6.67370], P('katanga'),
        [-1.57345, 6.67250], [-1.57330, 6.67180], [-1.57315, 6.67335], P('library'),
        [-1.57110, 6.67475], [-1.56910, 6.67420], P('science'), [-1.56762, 6.67180], P('ksb')
      ],
      return: [
        P('ksb'), [-1.56665, 6.66975], [-1.56365, 6.67170], P('casely_hayford'),
        [-1.56200, 6.67510], [-1.56750, 6.67520], P('library'),
        [-1.57315, 6.67365], P('katanga'), [-1.57300, 6.67320], [-1.57230, 6.67590], P('brunei')
      ]
    },
    COMM_MED: {
      forward: [
        P('commercial'), [-1.56575, 6.67520], [-1.56740, 6.67585], P('unity'),
        [-1.56905, 6.67525], [-1.56820, 6.67420], P('science'),
        [-1.56670, 6.67180], [-1.56550, 6.66870], P('gaza'),
        [-1.56280, 6.66235], [-1.56120, 6.66005], P('med_village')
      ],
      return: [
        P('med_village'), [-1.56080, 6.65990], [-1.56245, 6.66220], P('gaza'),
        [-1.56535, 6.66855], [-1.56665, 6.67180], P('science'),
        [-1.56815, 6.67430], [-1.56905, 6.67525], P('unity'),
        [-1.56755, 6.67595], [-1.56615, 6.67545], P('commercial')
      ]
    },
    KSB_MED: {
      forward: [
        P('ksb'), [-1.56780, 6.67085], [-1.56765, 6.67220], P('science'),
        [-1.56655, 6.67085], [-1.56540, 6.66790], P('gaza'),
        [-1.56270, 6.66220], [-1.56090, 6.65985], P('med_village')
      ],
      return: [
        P('med_village'), [-1.56085, 6.65985], [-1.56255, 6.66220], P('gaza'),
        [-1.56535, 6.66800], [-1.56655, 6.67095], P('science'),
        [-1.56765, 6.67210], [-1.56790, 6.67060], P('ksb')
      ]
    }
  };

  App.routes = Object.entries(ROUTES).map(([id, route]) => ({
    id,
    name: route.name,
    chip: route.chip,
    color: route.color,
    directions: {
      forward: {
        id: 'forward',
        routeId: id,
        label: route.forward.label,
        stopIds: route.forward.stops.slice(),
        originId: route.forward.stops[0],
        destinationId: route.forward.stops[route.forward.stops.length - 1],
        path: ROAD_PATH_FALLBACKS[id].forward.map((coord) => coord.slice()),
        pathSource: 'manual-provisional'
      },
      return: {
        id: 'return',
        routeId: id,
        label: route.return.label,
        stopIds: route.return.stops.slice(),
        originId: route.return.stops[0],
        destinationId: route.return.stops[route.return.stops.length - 1],
        path: ROAD_PATH_FALLBACKS[id].return.map((coord) => coord.slice()),
        pathSource: 'manual-provisional'
      }
    }
  }));

  App.routes.forEach((route) => Object.values(route.directions).forEach((direction) => App.getStopProgresses(direction, true)));

  App.hydrateRoutePaths = async () => {
    if (App.routePathHydrationPromise) return App.routePathHydrationPromise;
    App.routePathHydrationPromise = (async () => {
      if (App.activeMapProvider !== 'google' || !window.google?.maps?.importLibrary) return false;
      const cacheKey = 'knustGoogleRoadPathsV1';
      const maxAge = App.config.routeCacheHours * 60 * 60 * 1000;
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey));
        if (cached?.createdAt && Date.now() - cached.createdAt < maxAge && cached.paths) {
          let hydrated = 0;
          App.routes.forEach((route) => Object.values(route.directions).forEach((direction) => {
            const path = cached.paths?.[route.id]?.[direction.id];
            if (Array.isArray(path) && path.length > 2) {
              direction.path = path;
              direction.pathSource = 'google-routes-cache';
              App.getStopProgresses(direction, true);
              hydrated += 1;
            }
          }));
          if (hydrated === 8) {
            document.dispatchEvent(new CustomEvent('routepathsupdated'));
            return true;
          }
        }
      } catch (_) {}

      try {
        const { Route } = await google.maps.importLibrary('routes');
        const paths = {};
        for (const route of App.routes) {
          paths[route.id] = {};
          for (const direction of Object.values(route.directions)) {
            const stopCoords = direction.stopIds.map((id) => App.toLatLngLiteral(App.stopById(id).coord));
            const request = {
              origin: stopCoords[0],
              destination: stopCoords[stopCoords.length - 1],
              intermediates: stopCoords.slice(1, -1).map((location) => ({ location })),
              travelMode: 'DRIVING',
              fields: ['path', 'legs']
            };
            const result = await Route.computeRoutes(request);
            const googlePath = result?.routes?.[0]?.path || [];
            const converted = googlePath.map(App.fromGoogleLatLng).filter(Boolean);
            if (converted.length > 2) {
              direction.path = converted;
              direction.pathSource = 'google-routes-live';
              App.getStopProgresses(direction, true);
              paths[route.id][direction.id] = converted;
            } else {
              paths[route.id][direction.id] = direction.path;
            }
          }
        }
        localStorage.setItem(cacheKey, JSON.stringify({ createdAt: Date.now(), paths }));
        document.dispatchEvent(new CustomEvent('routepathsupdated'));
        return true;
      } catch (error) {
        console.warn('Google road routing was unavailable; using provisional directional polylines.', error);
        return false;
      }
    })();
    return App.routePathHydrationPromise;
  };

  App.findNearestStop = (coord) => App.stops
    .map((stop) => ({ stop, distance: App.distanceKm(coord, stop.coord) }))
    .sort((a, b) => a.distance - b.distance)[0] || null;

  App.planJourney = (originId, destinationId) => {
    if (!originId || !destinationId) return null;
    if (originId === destinationId) return { originId, destinationId, legs: [], transfers: [], distanceKm: 0 };

    const edgesByStop = new Map();
    App.routes.forEach((route) => {
      Object.values(route.directions).forEach((direction) => {
        for (let index = 0; index < direction.stopIds.length - 1; index += 1) {
          const from = direction.stopIds[index];
          const to = direction.stopIds[index + 1];
          const edge = {
            from,
            to,
            routeId: route.id,
            directionId: direction.id,
            distance: App.distanceKm(App.stopById(from)?.coord, App.stopById(to)?.coord)
          };
          if (!edgesByStop.has(from)) edgesByStop.set(from, []);
          edgesByStop.get(from).push(edge);
        }
      });
    });

    const queue = [{ stopId: originId, routeId: '', directionId: '', cost: 0, edges: [] }];
    const best = new Map([[`${originId}||`, 0]]);
    let solution = null;

    while (queue.length) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift();
      if (current.stopId === destinationId) { solution = current; break; }
      (edgesByStop.get(current.stopId) || []).forEach((edge) => {
        const changedVehicle = current.routeId && (current.routeId !== edge.routeId || current.directionId !== edge.directionId);
        const cost = current.cost + edge.distance + 0.025 + (changedVehicle ? 0.55 : 0);
        const key = `${edge.to}|${edge.routeId}|${edge.directionId}`;
        if (cost >= (best.get(key) ?? Infinity)) return;
        best.set(key, cost);
        queue.push({ stopId: edge.to, routeId: edge.routeId, directionId: edge.directionId, cost, edges: [...current.edges, edge] });
      });
    }

    if (!solution) return null;
    const legs = [];
    solution.edges.forEach((edge) => {
      let leg = legs[legs.length - 1];
      if (!leg || leg.routeId !== edge.routeId || leg.directionId !== edge.directionId) {
        leg = { routeId: edge.routeId, directionId: edge.directionId, stopIds: [edge.from], distanceKm: 0 };
        legs.push(leg);
      }
      leg.stopIds.push(edge.to);
      leg.distanceKm += edge.distance;
    });
    return {
      originId,
      destinationId,
      legs,
      transfers: legs.slice(0, -1).map((leg) => leg.stopIds[leg.stopIds.length - 1]),
      distanceKm: legs.reduce((total, leg) => total + leg.distanceKm, 0)
    };
  };

  App.getStopCrowd = (stopId) => {
    const stop = App.stopById(stopId);
    const state = App.data?.getState?.();
    const live = (state?.waiting?.[stopId] || []).filter((session) => session.expiresAt > Date.now()).length;
    const wave = Math.round(2 * Math.sin(Date.now() / 900000 + App.stops.indexOf(stop)));
    return Math.max(0, (stop?.baseCrowd || 0) + live + wave);
  };

  App.stopManager = {
    markers: new Map(),
    visible: true,
    activeRouteId: 'all',
    pickupStopId: '',

    init(map) {
      this.map = map;
      App.stops.forEach((stop, index) => {
        const element = document.createElement('button');
        element.className = 'stop-marker is-entering';
        element.type = 'button';
        element.setAttribute('aria-label', `${stop.name} shuttle stop`);
        element.innerHTML = `
          <span class="stop-icon"><svg viewBox="0 0 32 42" aria-hidden="true">
            <path class="stop-pin-body" d="M16 1C8.3 1 2.5 6.8 2.5 14.2 2.5 24.4 16 40 16 40s13.5-15.6 13.5-25.8C29.5 6.8 23.7 1 16 1Z"/>
            <rect class="stop-pin-panel" x="7" y="7" width="18" height="15" rx="4.5"/>
            <path class="stop-pin-bus" d="M10.5 10.1h11c1.2 0 2.1 1 2.1 2.1v5.2c0 1.1-.8 2-1.8 2.1l1 2h-2.2l-.7-1.8h-7.8l-.7 1.8H9.2l1-2c-1-.1-1.8-1-1.8-2.1v-5.2c0-1.1.9-2.1 2.1-2.1Zm.2 2v3.6h10.6v-3.6H10.7Zm1 4.8a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm8.6 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z"/>
          </svg></span>
          <span class="stop-crowd-count"></span>
          <span class="pickup-flag">PICKUP</span>
          <span class="stop-label">${App.escapeHTML(stop.short)}</span>`;
        element.addEventListener('click', (event) => { event.stopPropagation(); this.open(stop.id); });
        const marker = App.createDomMarker({ map, element, position: stop.coord, anchor: 'bottom' });
        this.markers.set(stop.id, { marker, element });
        setTimeout(() => element.classList.remove('is-entering'), 250 + index * 45);
      });
      this.refreshCrowds();
      this.applyVisibility();
      setInterval(() => this.refreshCrowds(), 15000);
    },

    setVisible(visible) {
      this.visible = Boolean(visible);
      this.applyVisibility();
      return this.visible;
    },

    setRouteFilter(routeId = 'all') {
      this.activeRouteId = routeId === 'all' ? 'all' : App.normalizeRouteId(routeId);
      this.applyVisibility();
    },

    setPickup(stopId = '') {
      this.pickupStopId = stopId;
      this.markers.forEach(({ element }, id) => {
        const selected = id === stopId;
        element.classList.toggle('selected-pickup', selected);
        element.setAttribute('aria-current', selected ? 'location' : 'false');
      });
    },

    applyVisibility() {
      const allowed = this.activeRouteId === 'all'
        ? new Set(App.stops.map((stop) => stop.id))
        : new Set(Object.values(App.routeById(this.activeRouteId)?.directions || {}).flatMap((direction) => direction.stopIds));
      this.markers.forEach(({ marker, element }, stopId) => {
        marker.setVisible(this.visible);
        const muted = this.activeRouteId !== 'all' && !allowed.has(stopId);
        element.classList.toggle('route-muted', muted);
        element.tabIndex = muted ? -1 : 0;
      });
    },

    refreshCrowds() {
      App.stops.forEach((stop) => {
        const entry = this.markers.get(stop.id);
        if (!entry) return;
        const count = App.getStopCrowd(stop.id);
        entry.element.classList.toggle('busy', count >= 17);
        const badge = entry.element.querySelector('.stop-crowd-count');
        if (badge) badge.textContent = count >= 14 ? String(count) : '';
      });
    },

    arrivals(stopId) {
      const target = App.stopById(stopId);
      return Object.values(App.runtimeShuttles || {})
        .filter((shuttle) => shuttle.status === 'active' && shuttle.capacity !== 'out_of_service')
        .filter((shuttle) => Object.values(App.routeById(shuttle.routeId)?.directions || {}).some((direction) => direction.stopIds.includes(stopId)))
        .map((shuttle) => ({ ...shuttle, eta: App.estimateEtaMinutes(shuttle.coord, target.coord, shuttle.speed || 18) }))
        .sort((a, b) => a.eta - b.eta)
        .slice(0, 4);
    },

    open(stopId) {
      const stop = App.stopById(stopId);
      if (!stop) return;
      const arrivals = this.arrivals(stopId);
      const crowd = App.getStopCrowd(stopId);
      const arrivalHTML = arrivals.length ? arrivals.map((shuttle) => {
        const capacity = App.capacityStates[shuttle.capacity] || App.capacityStates.available;
        return `<button class="arrival-row" data-open-shuttle="${shuttle.id}">
          <span class="arrival-route-dot" style="--route-color:${App.routeById(shuttle.routeId)?.color}"></span>
          <div><strong>${App.escapeHTML(App.directionLabel(shuttle.routeId, shuttle.direction))}</strong><small>${App.escapeHTML(capacity.short)} · Vehicle ${App.escapeHTML(shuttle.number)}</small></div>
          <em>${shuttle.eta} min</em>
        </button>`;
      }).join('') : '<div class="empty-state">No active shuttle is approaching this stop right now.</div>';

      App.openSheet(`
        <header class="sheet-stop-header"><span class="sheet-stop-icon">${App.escapeHTML(stop.code)}</span><div><span class="eyebrow">CAMPUS STOP</span><h2 id="sheetTitle">${App.escapeHTML(stop.name)}</h2><p>Live arrivals and estimated crowd level</p></div></header>
        <div class="arrival-list">${arrivalHTML}</div>
        <div class="waiting-card"><div><small>STUDENTS WAITING</small><strong>About ${crowd}</strong></div><button data-wait-stop="${stop.id}">I’m waiting here</button></div>
        <p class="privacy-note">Waiting counts are estimates. Your session expires automatically after 30 minutes.</p>
      `);
    }
  };
})();
