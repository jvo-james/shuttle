(function () {
  'use strict';
  const App = window.ShuttleApp;

  App.runtimeShuttles = {};

  App.shuttleManager = {
    markers: new Map(),
    selectedId: null,
    activeRouteFilter: 'all',
    routePolyline: null,
    state: null,
    init(map) {
      this.map = map;
      this.state = App.data.getState();
      App.data.subscribe((state) => {
        this.state = state;
        this.syncMarkers();
      });
      this.syncMarkers();
      this.animate();
    },
    createMarker(shuttle) {
      const route = App.routeById(shuttle.routeId) || App.routes[0];
      const capacity = App.capacityStates[shuttle.capacity] || App.capacityStates.available;
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'shuttle-marker';
      element.style.setProperty('--route-color', route.color);
      element.style.setProperty('--capacity-color', capacity.color);
      element.setAttribute('aria-label', `Shuttle ${shuttle.number}, ${capacity.label}`);
      element.innerHTML = `
        <span class="route-ring"><span class="bus-rotator"><img class="bus-glyph" src="assets/icons/shuttle.svg" alt="" /></span></span>
        <span class="capacity-badge" aria-hidden="true">${App.escapeHTML(capacity.icon)}</span>
        <span class="shuttle-number">SH ${App.escapeHTML(shuttle.number)}</span>`;
      element.addEventListener('click', (event) => {
        event.stopPropagation();
        this.open(shuttle.id);
      });
      const marker = App.createHtmlMapMarker({
        map: this.map,
        element,
        position: App.config.campusCenter,
        anchor: 'center',
        zIndex: 45
      });
      this.markers.set(shuttle.id, { marker, element, lastCoord: App.config.campusCenter, shuttle });
    },
    syncMarkers() {
      const shuttles = Object.values(this.state?.shuttles || {});
      shuttles.forEach((shuttle) => {
        if (!this.markers.has(shuttle.id)) this.createMarker(shuttle);
        const entry = this.markers.get(shuttle.id);
        const route = App.routeById(shuttle.routeId) || App.routes[0];
        const capacity = App.capacityStates[shuttle.capacity] || App.capacityStates.available;
        entry.shuttle = shuttle;
        entry.element.style.setProperty('--route-color', route.color);
        entry.element.style.setProperty('--capacity-color', capacity.color);
        entry.element.classList.toggle('selected', this.selectedId === shuttle.id);
        entry.marker.setZIndex(this.selectedId === shuttle.id ? 80 : 45);
        entry.marker.setVisible(this.activeRouteFilter === 'all' || shuttle.routeId === this.activeRouteFilter);
        entry.element.setAttribute('aria-label', `Shuttle ${shuttle.number}, ${capacity.label}`);
        const badge = entry.element.querySelector('.capacity-badge');
        if (badge) {
          badge.textContent = capacity.icon;
          badge.title = capacity.label;
        }
      });
      [...this.markers.keys()].forEach((id) => {
        if (!this.state.shuttles[id]) {
          this.markers.get(id).marker.remove();
          this.markers.delete(id);
        }
      });
    },
    animate() {
      const frame = () => {
        const now = Date.now();
        Object.values(this.state?.shuttles || {}).forEach((shuttle, index) => {
          const route = App.routeById(shuttle.routeId);
          const entry = this.markers.get(shuttle.id);
          if (!route || !entry) return;

          let coord;
          let bearing;
          let nextIndex;
          const isFreshDriver = shuttle.source === 'driver' && shuttle.coord && now - shuttle.updatedAt < 45000;
          if (isFreshDriver) {
            const target = shuttle.coord;
            const current = entry.lastCoord || target;
            coord = App.lerpLngLat(current, target, 0.075);
            bearing = Number.isFinite(shuttle.bearing) ? shuttle.bearing : App.bearing(current, target);
            nextIndex = Number.isFinite(shuttle.nextIndex) ? shuttle.nextIndex : 1;
          } else {
            const cycleSeconds = 185 + index * 12;
            const progress = ((now / 1000) / cycleSeconds + (shuttle.offset || 0)) % 1;
            const point = App.positionAlongPath(route.path, progress);
            coord = point.coord;
            bearing = point.bearing;
            nextIndex = point.nextIndex;
          }

          entry.lastCoord = coord;
          entry.marker.setPosition(coord);
          entry.element.querySelector('.bus-rotator')?.style.setProperty('transform', `rotate(${bearing}deg)`);
          const stale = shuttle.source === 'driver' && now - shuttle.updatedAt > 60000;
          entry.element.classList.toggle('stale', stale || shuttle.status !== 'active');
          entry.element.classList.toggle('out-of-service', shuttle.status === 'out_of_service' || shuttle.capacity === 'out_of_service');
          App.runtimeShuttles[shuttle.id] = { ...shuttle, coord, bearing, nextIndex, updatedAt: isFreshDriver ? shuttle.updatedAt : now };
        });
        document.dispatchEvent(new CustomEvent('shuttle:positions-updated'));
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },
    setFilter(routeId) {
      this.activeRouteFilter = routeId;
      this.syncMarkers();
      if (routeId === 'all') this.clearRouteLine();
      else this.showRoute(routeId);
    },
    clearRouteLine() {
      this.routePolyline?.setVisible(false);
    },
    showRoute(routeId) {
      const route = App.routeById(routeId);
      if (!route || !this.map) return;
      if (!this.routePolyline) this.routePolyline = App.createRoutePolyline(this.map, route.path, route.color);
      else {
        this.routePolyline.setPath(route.path);
        this.routePolyline.setColor(route.color);
        this.routePolyline.setVisible(true);
      }
      App.fitCoordinates(this.map, route.path, { top: 210, right: 70, bottom: 150, left: 70 });
    },
    reportSummary(shuttleId) {
      const reports = (this.state?.reports || []).filter((report) => report.shuttleId === shuttleId && Date.now() - report.createdAt < 3 * 60 * 1000);
      if (!reports.length) return 'No recent student reports. Driver status is currently being shown.';
      const counts = reports.reduce((acc, report) => ({ ...acc, [report.value]: (acc[report.value] || 0) + 1 }), {});
      const [value, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      const label = App.capacityStates[value]?.label || value.replaceAll('_', ' ');
      return `Reported as “${label}” by ${count} nearby student${count === 1 ? '' : 's'} within the last 3 minutes.`;
    },
    open(shuttleId) {
      const shuttle = App.runtimeShuttles[shuttleId] || this.state?.shuttles?.[shuttleId];
      if (!shuttle) return;
      this.selectedId = shuttleId;
      this.syncMarkers();
      const route = App.routeById(shuttle.routeId);
      const capacity = App.capacityStates[shuttle.capacity] || App.capacityStates.available;
      const nextStopId = route?.stopIds?.[shuttle.nextIndex % route.stopIds.length] || route?.stopIds?.[1];
      const nextStop = App.stopById(nextStopId);
      const routeStops = (route?.stopIds || []).slice(0, 4).map((id) => App.stopById(id)?.short).filter(Boolean);
      const routeFlow = routeStops.map((name, index) => `${index ? '<i></i>' : ''}<span>${App.escapeHTML(name)}</span>`).join('');
      const eta = nextStop ? Math.max(1, Math.round((App.distanceKm(shuttle.coord, nextStop.coord) / Math.max(shuttle.speed, 8)) * 60 * 1.35)) : 4;
      App.openSheet(`
        <div class="sheet-title-row">
          <div><span class="eyebrow">LIVE SHUTTLE</span><h2 id="sheetTitle">Shuttle ${App.escapeHTML(shuttle.number)}</h2><p>${App.escapeHTML(route?.name || 'Campus route')}</p></div>
          <span class="status-pill" style="--status-color:${capacity.color}">${App.escapeHTML(capacity.label)}</span>
        </div>
        <div class="sheet-route"><div class="route-flow">${routeFlow}</div></div>
        <div class="sheet-metrics">
          <div class="sheet-metric"><small>Speed</small><strong>${Math.round(shuttle.speed || 0)} km/h</strong></div>
          <div class="sheet-metric"><small>${App.escapeHTML(nextStop?.short || 'Next stop')}</small><strong>${eta} min</strong></div>
          <div class="sheet-metric"><small>Updated</small><strong>${App.formatRelative(shuttle.updatedAt)}</strong></div>
        </div>
        <div class="confidence-note">${App.escapeHTML(this.reportSummary(shuttleId))}</div>
        <div class="sheet-actions">
          <button class="route-action" data-view-route="${route?.id || ''}">View full route</button>
          <button class="primary-button" data-report-shuttle="${shuttle.id}">Report condition</button>
        </div>
      `);
    }
  };

  document.addEventListener('click', (event) => {
    const routeButton = event.target.closest('[data-view-route]');
    if (routeButton?.dataset.viewRoute) {
      App.shuttleManager.showRoute(routeButton.dataset.viewRoute);
      App.closeSheet();
    }
  });
})();
