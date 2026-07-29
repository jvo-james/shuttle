(function () {
  'use strict';
  const App = window.ShuttleApp;

  const admin = {
    map: null,
    markers: new Map(),
    state: null,

    async init() {
      await this.initMap();
      this.bindEvents();
      App.data.subscribe((state) => {
        this.state = state;
        this.renderDashboard();
      });
      this.updateClock();
      setInterval(() => this.updateClock(), 1000);
      requestAnimationFrame(() => this.animateMarkers());
    },

    async initMap() {
      try {
        this.map = await App.createMap('adminMap', { center: App.config.campusCenter, zoom: 14.5 });
        App.addAttribution(this.map);
        const drawRoutes = () => {
          const features = App.routes.flatMap((route) => Object.values(route.directions).map((direction) => App.lineFeature(direction.path, { color: route.color })));
          App.upsertGeoJSON(this.map, 'admin-routes', App.featureCollection(features));
        };
        drawRoutes();
        App.addLineLayer(this.map, 'admin-routes-glow', 'admin-routes', { 'line-color': ['get', 'color'], 'line-width': 10, 'line-opacity': .07, 'line-blur': 2 }, { zIndex: 1 });
        App.addLineLayer(this.map, 'admin-routes-line', 'admin-routes', { 'line-color': ['get', 'color'], 'line-width': 3, 'line-opacity': .42, 'line-dasharray': [1.4, 1] }, { zIndex: 2 });
        document.addEventListener('routepathsupdated', drawRoutes);
        App.hydrateRoutePaths().then(drawRoutes);
        App.fitCampus(this.map, { top: 50, right: 50, bottom: 50, left: 50 });
      } catch (error) {
        App.renderMapFallback('adminMap', error?.message || 'The operations map could not load.');
      }
    },

    bindEvents() {
      document.getElementById('adminAlertForm').addEventListener('submit', (event) => {
        event.preventDefault();
        const type = document.getElementById('alertType').value;
        const headline = document.getElementById('alertHeadline').value.trim();
        const details = document.getElementById('alertDetails').value.trim();
        App.data.addAlert({ type, headline, details, severity: type === 'Emergency' ? 'critical' : 'warning' });
        event.currentTarget.reset();
        App.toast('Alert published', 'It is now visible on the student map.', 'success');
      });
      document.getElementById('refreshFleet').addEventListener('click', () => {
        this.renderDashboard();
        App.toast('Fleet refreshed', 'Latest live data loaded.', 'success');
      });
      document.getElementById('resetDemo').addEventListener('click', () => {
        App.data.resetDemo();
        App.toast('Demo reset', 'All shuttle positions and alerts were restored.', 'success');
      });
      document.querySelectorAll('.admin-sidebar nav a').forEach((link) => link.addEventListener('click', () => {
        document.querySelectorAll('.admin-sidebar nav a').forEach((item) => item.classList.toggle('active', item === link));
      }));
    },

    updateClock() {
      const clock = document.getElementById('adminClock');
      if (clock) clock.textContent = App.formatClock();
    },

    runtimeShuttles() {
      const now = Date.now();
      return Object.values(this.state?.shuttles || {}).map((shuttle, index) => {
        if (shuttle.source === 'driver' && shuttle.coord && now - shuttle.updatedAt < 55000) {
          const direction = App.normalizeDirectionId(shuttle.direction || 'forward');
          const directionData = App.directionFor(shuttle.routeId, direction);
          const progress = Number.isFinite(shuttle.progress) ? shuttle.progress : App.closestProgressOnPath(directionData?.path, shuttle.coord);
          const context = App.getTripContext(shuttle.routeId, direction, progress);
          return { ...shuttle, direction, progress, currentStopId: shuttle.currentStopId || context?.currentStop?.id, nextStopId: shuttle.nextStopId || context?.nextStop?.id };
        }
        return App.resolveDemoTrip(shuttle, now, index);
      });
    },

    renderDashboard() {
      if (!this.state) return;
      const shuttles = this.runtimeShuttles();
      const active = shuttles.filter((item) => item.status === 'active' && item.capacity !== 'out_of_service');
      const waiting = App.stops.reduce((sum, stop) => sum + App.getStopCrowd(stop.id), 0);
      const issues = (this.state.alerts || []).filter((alert) => alert.active && alert.severity !== 'info').length;
      document.getElementById('activeShuttleMetric').textContent = active.length;
      document.getElementById('waitMetric').textContent = `${Math.max(3, Math.round(waiting / Math.max(active.length * 6, 1)))} min`;
      document.getElementById('issueMetric').textContent = issues;
      this.renderFleet(shuttles);
      this.renderCrowds();
      this.renderAlerts();
      this.renderRouteHealth(active);
      this.renderMapMarkers(shuttles);
    },

    renderFleet(shuttles) {
      const body = document.getElementById('fleetTableBody');
      body.innerHTML = shuttles.map((shuttle) => {
        const capacity = App.capacityStates[shuttle.capacity] || App.capacityStates.available;
        const context = App.getTripContext(shuttle.routeId, shuttle.direction, shuttle.progress || 0);
        const active = shuttle.status === 'active' && shuttle.capacity !== 'out_of_service';
        return `<tr>
          <td><strong>Shuttle ${App.escapeHTML(shuttle.number)}</strong></td>
          <td>${App.escapeHTML(App.directionLabel(shuttle.routeId, shuttle.direction))}</td>
          <td>${App.escapeHTML(context?.currentStop?.short || 'Between stops')}</td>
          <td>${App.escapeHTML(context?.nextStop?.short || context?.destination?.short || 'Destination')}</td>
          <td><span class="capacity-label" style="--status-color:${capacity.color}">${App.escapeHTML(capacity.short)}</span></td>
          <td><span class="table-status" style="color:${active ? '#147153' : '#8a6969'}">${active ? 'Active' : 'Offline'}</span></td>
        </tr>`;
      }).join('');
    },

    renderCrowds() {
      const crowds = App.stops.map((stop) => ({ ...stop, crowd: App.getStopCrowd(stop.id) })).sort((a, b) => b.crowd - a.crowd).slice(0, 8);
      const max = Math.max(...crowds.map((item) => item.crowd), 1);
      document.getElementById('crowdBars').innerHTML = crowds.map((stop) => `<div class="crowd-row"><strong>${App.escapeHTML(stop.name)}</strong><div class="crowd-track"><div class="crowd-fill" style="--fill:${Math.round((stop.crowd / max) * 100)}%"></div></div><span>${stop.crowd}</span></div>`).join('');
    },

    renderAlerts() {
      const alerts = (this.state.alerts || []).filter((alert) => alert.active).slice(0, 4);
      document.getElementById('recentAlerts').innerHTML = alerts.map((alert) => `<div class="recent-alert"><strong>${App.escapeHTML(alert.headline)}</strong><span>${App.escapeHTML(alert.details)}</span></div>`).join('');
    },

    renderRouteHealth(active) {
      document.getElementById('routeHealth').innerHTML = App.routes.map((route) => {
        const count = active.filter((shuttle) => shuttle.routeId === route.id).length;
        const directions = new Set(active.filter((shuttle) => shuttle.routeId === route.id).map((shuttle) => shuttle.direction)).size;
        return `<div class="route-health-row"><span class="route-health-dot" style="--route-color:${route.color}"></span><div><strong>${App.escapeHTML(route.name)}</strong><small>${directions === 2 ? 'Both directions covered' : directions === 1 ? 'One direction active' : 'No active shuttle'}</small></div><em>${count}</em></div>`;
      }).join('');
    },

    renderMapMarkers(shuttles) {
      if (!this.map?.loaded()) return;
      shuttles.forEach((shuttle) => {
        if (!this.markers.has(shuttle.id)) {
          const element = document.createElement('div');
          element.className = 'admin-shuttle-marker';
          element.innerHTML = '<span><img src="shuttle-vehicle.svg" alt="" /></span>';
          const marker = App.createDomMarker({ map: this.map, element, position: shuttle.coord || App.config.campusCenter, anchor: 'center' });
          this.markers.set(shuttle.id, { marker, element, lastCoord: shuttle.coord || App.config.campusCenter, target: shuttle });
        }
        this.markers.get(shuttle.id).target = shuttle;
      });
    },

    animateMarkers() {
      this.markers.forEach((entry) => {
        const shuttle = entry.target;
        if (!shuttle?.coord) return;
        const coord = App.lerpLngLat(entry.lastCoord, shuttle.coord, .08);
        const bearing = Number.isFinite(shuttle.bearing) ? shuttle.bearing : App.bearing(entry.lastCoord, shuttle.coord);
        entry.lastCoord = coord;
        entry.marker.setPosition(coord);
        const rotator = entry.element.querySelector('span');
        if (rotator) rotator.style.transform = `rotate(${bearing}deg)`;
        entry.element.dataset.destination = App.destinationCode(shuttle.routeId, shuttle.direction);
        entry.element.style.opacity = shuttle.status === 'active' && shuttle.capacity !== 'out_of_service' ? '1' : '.38';
      });
      requestAnimationFrame(() => this.animateMarkers());
    }
  };

  document.addEventListener('DOMContentLoaded', () => admin.init());
})();
