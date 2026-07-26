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
        await App.loadGoogleMaps();
        this.map = App.createGoogleMap('adminMap', {
          center: App.config.campusCenter,
          zoom: 14.9,
          minZoom: 13.3,
          maxZoom: 20
        });
        App.fitCampus(this.map, 38);
      } catch (error) {
        App.renderGoogleMapsSetup('adminMap', error?.message || 'Google Maps could not load.');
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
        App.toast('Fleet refreshed', 'Latest local live data loaded.', 'success');
      });
      document.querySelectorAll('.admin-sidebar nav a').forEach((link) => link.addEventListener('click', () => {
        document.querySelectorAll('.admin-sidebar nav a').forEach((item) => item.classList.toggle('active', item === link));
      }));
    },
    updateClock() {
      const clock = document.getElementById('adminClock');
      if (clock) clock.textContent = App.formatClock();
    },
    renderDashboard() {
      if (!this.state) return;
      const shuttles = Object.values(this.state.shuttles || {});
      const active = shuttles.filter((item) => item.status === 'active' && item.capacity !== 'out_of_service');
      const waiting = App.stops.reduce((sum, stop) => sum + App.getStopCrowd(stop.id), 0);
      const issues = (this.state.alerts || []).filter((alert) => alert.active && alert.severity !== 'info').length;
      document.getElementById('activeShuttleMetric').textContent = active.length;
      document.getElementById('waitingMetric').textContent = waiting;
      document.getElementById('waitMetric').textContent = `${Math.max(3, Math.round(waiting / Math.max(active.length * 5, 1)))} min`;
      document.getElementById('issueMetric').textContent = issues;
      this.renderFleet(shuttles);
      this.renderCrowds();
      this.renderAlerts();
      this.renderMapMarkers();
    },
    renderFleet(shuttles) {
      const body = document.getElementById('fleetTableBody');
      body.innerHTML = shuttles.map((shuttle) => {
        const capacity = App.capacityStates[shuttle.capacity] || App.capacityStates.available;
        const route = App.routeById(shuttle.routeId);
        const active = shuttle.status === 'active' && shuttle.capacity !== 'out_of_service';
        return `<tr>
          <td><strong>Shuttle ${App.escapeHTML(shuttle.number)}</strong></td>
          <td>${App.escapeHTML(route?.name || 'Unassigned')}</td>
          <td><span class="capacity-label" style="--status-color:${capacity.color}">${App.escapeHTML(capacity.label)}</span></td>
          <td>${Math.round(shuttle.speed || 0)} km/h</td>
          <td>${App.formatRelative(shuttle.updatedAt)}</td>
          <td><span class="table-status" style="color:${active ? '#147153' : '#8a6969'}">${active ? 'Active' : 'Offline'}</span></td>
        </tr>`;
      }).join('');
    },
    renderCrowds() {
      const crowds = App.stops.map((stop) => ({ ...stop, crowd: App.getStopCrowd(stop.id) })).sort((a, b) => b.crowd - a.crowd).slice(0, 6);
      const max = Math.max(...crowds.map((item) => item.crowd), 1);
      document.getElementById('crowdBars').innerHTML = crowds.map((stop) => `
        <div class="crowd-row"><strong>${App.escapeHTML(stop.name)}</strong><div class="crowd-track"><div class="crowd-fill" style="--fill:${Math.round((stop.crowd / max) * 100)}%"></div></div><span>${stop.crowd}</span></div>`).join('');
    },
    renderAlerts() {
      const alerts = (this.state.alerts || []).filter((alert) => alert.active).slice(0, 4);
      document.getElementById('recentAlerts').innerHTML = alerts.map((alert) => `<div class="recent-alert"><strong>${App.escapeHTML(alert.headline)}</strong><span>${App.escapeHTML(alert.details)}</span></div>`).join('');
    },
    renderMapMarkers() {
      if (!this.map || !this.state) return;
      Object.values(this.state.shuttles || {}).forEach((shuttle) => {
        if (this.markers.has(shuttle.id)) return;
        const route = App.routeById(shuttle.routeId) || App.routes[0];
        const element = document.createElement('div');
        element.className = 'admin-shuttle-marker';
        element.style.setProperty('--route-color', route.color);
        element.innerHTML = '<span><img src="assets/icons/shuttle.svg" alt="" /></span>';
        const marker = App.createHtmlMapMarker({
          map: this.map,
          element,
          position: App.config.campusCenter,
          anchor: 'center',
          zIndex: 30
        });
        this.markers.set(shuttle.id, { marker, element, lastCoord: App.config.campusCenter });
      });
    },
    animateMarkers() {
      if (this.state) {
        const now = Date.now();
        Object.values(this.state.shuttles || {}).forEach((shuttle, index) => {
          const entry = this.markers.get(shuttle.id);
          const route = App.routeById(shuttle.routeId);
          if (!entry || !route) return;
          let point;
          if (shuttle.source === 'driver' && shuttle.coord && now - shuttle.updatedAt < 45000) {
            const coord = App.lerpLngLat(entry.lastCoord, shuttle.coord, 0.08);
            point = { coord, bearing: Number.isFinite(shuttle.bearing) ? shuttle.bearing : App.bearing(entry.lastCoord, shuttle.coord) };
          } else {
            point = App.positionAlongPath(route.path, ((now / 1000) / (190 + index * 12) + (shuttle.offset || 0)) % 1);
          }
          entry.lastCoord = point.coord;
          entry.marker.setPosition(point.coord);
          const rotator = entry.element.querySelector('span');
          if (rotator) rotator.style.transform = `rotate(${point.bearing}deg)`;
          entry.element.style.setProperty('--route-color', route.color);
          entry.element.style.opacity = shuttle.status === 'active' && shuttle.capacity !== 'out_of_service' ? '1' : '.42';
        });
      }
      requestAnimationFrame(() => this.animateMarkers());
    }
  };

  document.addEventListener('DOMContentLoaded', () => admin.init());
})();
