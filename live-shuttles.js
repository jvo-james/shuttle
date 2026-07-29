(function () {
  'use strict';
  const App = window.ShuttleApp;
  const empty = () => App.featureCollection([]);

  App.routeRenderer = {
    map: null,
    ready: false,
    mode: 'clear',
    routeId: '',
    shuttleId: '',

    init(map) {
      this.map = map;
      App.upsertGeoJSON(map, 'route-overview', empty());
      App.upsertGeoJSON(map, 'route-completed', empty());
      App.upsertGeoJSON(map, 'route-remaining', empty());
      App.addLineLayer(map, 'route-overview-glow', 'route-overview', { 'line-color': ['get', 'color'], 'line-width': 12, 'line-opacity': 0.11, 'line-blur': 2 }, { zIndex: 2 });
      App.addLineLayer(map, 'route-overview-line', 'route-overview', { 'line-color': ['get', 'color'], 'line-width': 4.5, 'line-opacity': 0.72, 'line-dasharray': [1.2, 1] }, { zIndex: 3 });
      App.addLineLayer(map, 'route-completed-line', 'route-completed', { 'line-color': '#aab6b1', 'line-width': 5, 'line-opacity': 0.66 }, { zIndex: 4 });
      App.addLineLayer(map, 'route-remaining-glow', 'route-remaining', { 'line-color': ['get', 'color'], 'line-width': 13, 'line-opacity': 0.16, 'line-blur': 2 }, { zIndex: 5 });
      App.addLineLayer(map, 'route-remaining-line', 'route-remaining', { 'line-color': ['get', 'color'], 'line-width': 5.5, 'line-opacity': 0.98 }, { zIndex: 6 });
      this.ready = true;
      document.addEventListener('routepathsupdated', () => {
        if (this.mode === 'route' && this.routeId) this.showRoute(this.routeId, false);
        if (this.mode === 'progress' && this.shuttleId && App.runtimeShuttles?.[this.shuttleId]) this.showProgress(App.runtimeShuttles[this.shuttleId], false);
      });
    },

    clear() {
      if (!this.ready) return;
      this.mode = 'clear';
      this.routeId = '';
      this.shuttleId = '';
      ['route-overview', 'route-completed', 'route-remaining'].forEach((id) => App.upsertGeoJSON(this.map, id, empty()));
    },

    showRoute(routeId, fit = true) {
      if (!this.ready) return;
      const route = App.routeById(routeId);
      if (!route) { this.clear(); return; }
      this.mode = 'route';
      this.routeId = route.id;
      this.shuttleId = '';
      const features = Object.values(route.directions).map((direction) => App.lineFeature(direction.path, { color: route.color, direction: direction.id }));
      App.upsertGeoJSON(this.map, 'route-overview', App.featureCollection(features));
      App.upsertGeoJSON(this.map, 'route-completed', empty());
      App.upsertGeoJSON(this.map, 'route-remaining', empty());
      if (fit) App.fitCoordinates(this.map, Object.values(route.directions).flatMap((direction) => direction.path), window.innerWidth < 700 ? 96 : { top: 195, right: 110, bottom: 175, left: 110 }, 15.8);
    },

    showProgress(shuttle, fit = false) {
      if (!this.ready || !shuttle) return;
      const route = App.routeById(shuttle.routeId);
      const direction = App.directionFor(shuttle.routeId, shuttle.direction);
      if (!route || !direction) return;
      this.mode = 'progress';
      this.routeId = route.id;
      this.shuttleId = shuttle.id;
      const split = App.splitPathAtProgress(direction.path, shuttle.progress || 0);
      App.upsertGeoJSON(this.map, 'route-overview', empty());
      App.upsertGeoJSON(this.map, 'route-completed', App.featureCollection([App.lineFeature(split.completed, { color: route.color })]));
      App.upsertGeoJSON(this.map, 'route-remaining', App.featureCollection([App.lineFeature(split.remaining, { color: route.color })]));
      if (fit) App.fitCoordinates(this.map, direction.path, window.innerWidth < 700 ? 112 : { top: 195, right: 135, bottom: 185, left: 135 }, 16);
    }
  };

  App.shuttleManager = {
    map: null,
    markers: new Map(),
    state: null,
    filter: 'all',
    selectedId: null,
    lastSheetRender: 0,
    lastRouteRender: 0,

    init(map) {
      this.map = map;
      App.routeRenderer.init(map);
      App.data.subscribe((state) => { this.state = state; this.syncMarkers(); });
      document.addEventListener('click', (event) => this.handleDocumentClick(event));
      requestAnimationFrame(() => this.animate());
    },

    createMarker(shuttle) {
      const element = document.createElement('button');
      element.className = 'shuttle-marker is-entering';
      element.type = 'button';
      element.setAttribute('aria-label', `Open shuttle ${shuttle.number}`);
      element.innerHTML = `
        <span class="capacity-led"></span>
        <span class="bus-rotator">
          <svg class="shuttle-svg" viewBox="0 0 48 76" aria-hidden="true">
            <path class="heading-pointer" d="M24-6 17.5 4h13L24-6Z"/>
            <rect class="wheel" x="1" y="15" width="6" height="14" rx="3"/><rect class="wheel" x="41" y="15" width="6" height="14" rx="3"/>
            <rect class="wheel" x="1" y="48" width="6" height="14" rx="3"/><rect class="wheel" x="41" y="48" width="6" height="14" rx="3"/>
            <path class="bus-body" d="M13 2.5h22c5.4 0 9 4.4 9 9.7v51.6c0 5.3-3.6 9.7-9 9.7H13c-5.4 0-9-4.4-9-9.7V12.2c0-5.3 3.6-9.7 9-9.7Z"/>
            <path class="front-window" d="M11 7h26c1.6 0 2.8 1.4 2.6 3l-1.6 12c-.2 1.3-1.3 2.2-2.6 2.2H12.6c-1.3 0-2.4-.9-2.6-2.2L8.4 10c-.2-1.6 1-3 2.6-3Z"/>
            <rect class="route-stripe" x="9" y="31" width="30" height="14" rx="2"/>
            <rect class="rear-window" x="10" y="51" width="28" height="15" rx="5"/>
            <text class="vehicle-number" x="24" y="41" text-anchor="middle">${App.escapeHTML(shuttle.number)}</text>
          </svg>
        </span>
        <span class="destination-tag">BUS</span>`;
      element.addEventListener('click', (event) => { event.stopPropagation(); this.select(shuttle.id, true); });
      const marker = App.createDomMarker({ map: this.map, element, position: App.config.campusCenter, anchor: 'center' });
      this.markers.set(shuttle.id, { marker, element, runtime: null, displayCoord: App.config.campusCenter.slice(), displayBearing: 0 });
      setTimeout(() => element.classList.remove('is-entering'), 280 + this.markers.size * 70);
    },

    syncMarkers() {
      if (!this.state) return;
      Object.values(this.state.shuttles || {}).forEach((shuttle) => { if (!this.markers.has(shuttle.id)) this.createMarker(shuttle); });
    },

    animate() {
      if (this.state) {
        const runtime = {};
        const now = Date.now();
        Object.values(this.state.shuttles || {}).forEach((shuttle, index) => {
          const entry = this.markers.get(shuttle.id);
          if (!entry) return;
          const freshDriver = shuttle.source === 'driver' && shuttle.coord && now - shuttle.updatedAt < 55000;
          let live;
          if (freshDriver) {
            const direction = App.normalizeDirectionId(shuttle.direction);
            const directionData = App.directionFor(shuttle.routeId, direction);
            const progress = Number.isFinite(shuttle.progress) ? shuttle.progress : App.closestProgressOnPath(directionData?.path, shuttle.coord);
            const context = App.getTripContext(shuttle.routeId, direction, progress);
            live = {
              ...shuttle,
              routeId: App.normalizeRouteId(shuttle.routeId),
              direction,
              progress,
              currentStopId: shuttle.currentStopId || context?.currentStop?.id,
              nextStopId: shuttle.nextStopId || context?.nextStop?.id,
              destinationId: context?.destination?.id
            };
          } else {
            live = App.resolveDemoTrip(shuttle, now, index);
          }

          entry.displayCoord = App.lerpLngLat(entry.displayCoord || live.coord, live.coord, freshDriver ? 0.08 : 0.24);
          const movementBearing = App.bearing(entry.displayCoord, live.coord);
          const targetBearing = Number.isFinite(live.bearing) ? live.bearing : movementBearing;
          let delta = ((targetBearing - entry.displayBearing + 540) % 360) - 180;
          entry.displayBearing = (entry.displayBearing + delta * 0.14 + 360) % 360;
          live.displayCoord = entry.displayCoord;
          runtime[shuttle.id] = live;
          entry.runtime = live;
          entry.marker.setPosition(entry.displayCoord);

          const route = App.routeById(live.routeId);
          const capacity = App.capacityStates[live.capacity] || App.capacityStates.available;
          entry.element.style.setProperty('--route-color', route?.color || '#0b956a');
          entry.element.style.setProperty('--capacity-color', capacity.color);
          const rotator = entry.element.querySelector('.bus-rotator');
          if (rotator) rotator.style.transform = `rotate(${entry.displayBearing}deg)`;
          const tag = entry.element.querySelector('.destination-tag');
          if (tag) tag.textContent = App.destinationCode(live.routeId, live.direction);
          const visible = live.status === 'active' && live.capacity !== 'out_of_service' && (this.filter === 'all' || live.routeId === this.filter);
          entry.marker.setVisible(visible);
          entry.element.classList.toggle('selected', this.selectedId === shuttle.id);
          entry.element.classList.toggle('full', live.capacity === 'full');
        });
        App.runtimeShuttles = runtime;
        if (this.selectedId && runtime[this.selectedId]) {
          if (now - this.lastRouteRender > 120) {
            App.routeRenderer.showProgress(runtime[this.selectedId]);
            this.lastRouteRender = now;
          }
          if (now - this.lastSheetRender > 1000 && document.getElementById('detailSheet')?.getAttribute('aria-hidden') === 'false') this.renderSheet(runtime[this.selectedId]);
        }
      }
      requestAnimationFrame(() => this.animate());
    },

    setFilter(routeId) {
      this.filter = routeId === 'all' ? 'all' : App.normalizeRouteId(routeId);
      this.selectedId = null;
      this.markers.forEach(({ element }) => element.classList.remove('selected'));
      App.stopManager?.setRouteFilter(this.filter);
      if (this.filter === 'all') { App.routeRenderer.clear(); App.fitCampus(this.map); }
      else App.routeRenderer.showRoute(this.filter, true);
      App.recommendations?.update?.();
    },

    select(shuttleId, focus = false) {
      const shuttle = App.runtimeShuttles?.[shuttleId];
      if (!shuttle) return;
      this.selectedId = shuttleId;
      this.filter = shuttle.routeId;
      document.querySelectorAll('[data-route-filter]').forEach((chip) => {
        const selected = chip.dataset.routeFilter === shuttle.routeId;
        chip.classList.toggle('active', selected);
        chip.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });
      App.stopManager?.setRouteFilter(shuttle.routeId);
      App.routeRenderer.showProgress(shuttle, focus);
      this.markers.forEach(({ element }, id) => element.classList.toggle('selected', id === shuttleId));
      if (focus) this.map.easeTo({ center: shuttle.coord, zoom: Math.max(this.map.getZoom(), 15.8), duration: 650, offset: [0, 72] });
      this.renderSheet(shuttle);
    },

    renderSheet(shuttle) {
      const route = App.routeById(shuttle.routeId);
      const context = App.getTripContext(shuttle.routeId, shuttle.direction, shuttle.progress || 0);
      const capacity = App.capacityStates[shuttle.capacity] || App.capacityStates.available;
      const nextStop = App.stopById(shuttle.nextStopId) || context?.nextStop;
      const currentStop = App.stopById(shuttle.atStopId || shuttle.currentStopId) || context?.currentStop;
      const eta = nextStop ? App.estimateEtaMinutes(shuttle.coord, nextStop.coord, shuttle.speed || 18) : 1;
      const activeStopId = shuttle.atStopId || shuttle.nextStopId || context?.nextStop?.id;
      this.lastSheetRender = Date.now();
      App.openSheet(`
        <header class="shuttle-sheet-heading">
          <div class="sheet-route-icon" style="--route-color:${route?.color}"><span>${App.escapeHTML(App.destinationCode(shuttle.routeId, shuttle.direction))}</span></div>
          <div><span class="eyebrow">LIVE SHUTTLE</span><h2 id="sheetTitle">${App.escapeHTML(App.directionLabel(shuttle.routeId, shuttle.direction))}</h2><p>Vehicle: Shuttle ${App.escapeHTML(shuttle.number)} · updated ${App.formatRelative(shuttle.updatedAt)}</p></div>
        </header>
        <div class="shuttle-live-status">${App.escapeHTML(shuttle.tripStatus || `En route to ${nextStop?.short || 'next stop'}`)}</div>
        <div class="trip-stat-grid">
          <article><small>CURRENTLY NEAR</small><strong>${App.escapeHTML(currentStop?.name || 'Between stops')}</strong></article>
          <article><small>NEXT STOP</small><strong>${App.escapeHTML(nextStop?.name || context?.destination?.name || 'Destination')}</strong></article>
          <article><small>ESTIMATED ARRIVAL</small><strong>${eta} min</strong></article>
          <article><small>CAPACITY</small><strong style="color:${capacity.color}">${App.escapeHTML(capacity.label)}</strong></article>
        </div>
        <section class="sheet-progress-card"><div><span class="eyebrow">ROUTE PROGRESS</span><strong>${Math.round((shuttle.progress || 0) * 100)}% complete</strong></div>${App.progressHTML(shuttle.routeId, shuttle.direction, shuttle.progress || 0, activeStopId)}</section>
        <div class="sheet-actions">
          <button class="secondary-button" data-view-route="${shuttle.routeId}">View full route</button>
          <button class="primary-button" data-report-shuttle="${shuttle.id}">Report an issue</button>
        </div>
      `);
    },

    handleDocumentClick(event) {
      const open = event.target.closest('[data-open-shuttle]');
      if (open) { this.select(open.dataset.openShuttle, true); return; }
      const routeButton = event.target.closest('[data-view-route]');
      if (routeButton) {
        App.closeSheet();
        this.selectedId = null;
        this.filter = App.normalizeRouteId(routeButton.dataset.viewRoute);
        document.querySelectorAll('[data-route-filter]').forEach((chip) => {
          const selected = chip.dataset.routeFilter === this.filter;
          chip.classList.toggle('active', selected);
          chip.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
        App.routeRenderer.showRoute(this.filter, true);
        App.stopManager?.setRouteFilter(this.filter);
        return;
      }
      const report = event.target.closest('[data-report-shuttle]');
      if (report) App.reports?.open(report.dataset.reportShuttle);
    }
  };
})();
