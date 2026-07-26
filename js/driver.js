(function () {
  'use strict';
  const App = window.ShuttleApp;

  const driver = {
    map: null,
    marker: null,
    routePolyline: null,
    watchId: null,
    simulationTimer: null,
    tripActive: false,
    selectedShuttleId: 'SH-07',
    selectedRouteId: 'green-loop',
    capacity: 'available',
    previousCoord: null,
    previousTime: 0,
    simulationProgress: 0,

    async init() {
      this.populateControls();
      this.renderCapacityButtons();
      this.bindEvents();
      await this.initMap();
      this.restoreTrip();
    },
    populateControls() {
      const state = App.data.getState();
      const shuttleSelect = document.getElementById('driverShuttleSelect');
      const routeSelect = document.getElementById('driverRouteSelect');
      shuttleSelect.innerHTML = Object.values(state.shuttles).map((shuttle) => `<option value="${shuttle.id}">Shuttle ${App.escapeHTML(shuttle.number)}</option>`).join('');
      routeSelect.innerHTML = App.routes.map((route) => `<option value="${route.id}">${App.escapeHTML(route.name)}</option>`).join('');
      shuttleSelect.value = this.selectedShuttleId;
      routeSelect.value = this.selectedRouteId;
    },
    renderCapacityButtons() {
      const holder = document.getElementById('capacityButtons');
      holder.innerHTML = Object.entries(App.capacityStates).map(([value, state]) => `
        <button class="capacity-button ${value === this.capacity ? 'active' : ''}" data-capacity="${value}" style="--status-color:${state.color}">
          <i></i><span><strong>${App.escapeHTML(state.label)}</strong><small>${App.escapeHTML(state.description)}</small></span>
        </button>`).join('');
    },
    async initMap() {
      try {
        await App.loadGoogleMaps();
        this.map = App.createGoogleMap('driverMap', {
          center: App.config.campusCenter,
          zoom: 15.3,
          minZoom: 13.5,
          maxZoom: 20
        });
        this.drawRoute();
        const element = document.createElement('div');
        element.className = 'driver-pin';
        element.innerHTML = '<span class="driver-bus-rotator"><img src="assets/icons/shuttle.svg" alt="" /></span>';
        this.marker = App.createHtmlMapMarker({
          map: this.map,
          element,
          position: App.config.campusCenter,
          anchor: 'center',
          zIndex: 60
        });
      } catch (error) {
        App.renderGoogleMapsSetup('driverMap', error?.message || 'Google Maps could not load.');
      }
    },
    drawRoute() {
      const route = App.routeById(this.selectedRouteId);
      if (!route || !this.map) return;
      if (!this.routePolyline) this.routePolyline = App.createRoutePolyline(this.map, route.path, route.color);
      else {
        this.routePolyline.setPath(route.path);
        this.routePolyline.setColor(route.color);
        this.routePolyline.setVisible(true);
      }
      App.fitCoordinates(this.map, route.path, 42);
      this.updateNextStop(1);
    },
    bindEvents() {
      document.getElementById('driverShuttleSelect').addEventListener('change', (event) => { this.selectedShuttleId = event.target.value; });
      document.getElementById('driverRouteSelect').addEventListener('change', (event) => {
        this.selectedRouteId = event.target.value;
        this.drawRoute();
      });
      document.getElementById('startTripButton').addEventListener('click', () => this.startTrip());
      document.getElementById('endTripButton').addEventListener('click', () => this.endTrip());
      document.getElementById('capacityButtons').addEventListener('click', (event) => {
        const button = event.target.closest('[data-capacity]');
        if (!button) return;
        this.capacity = button.dataset.capacity;
        document.querySelectorAll('.capacity-button').forEach((item) => item.classList.toggle('active', item === button));
        if (this.tripActive) App.data.patchShuttle(this.selectedShuttleId, { capacity: this.capacity, status: this.capacity === 'out_of_service' ? 'out_of_service' : 'active' });
        App.toast('Capacity updated', App.capacityStates[this.capacity].label, 'success');
      });
      document.querySelectorAll('[data-incident]').forEach((button) => button.addEventListener('click', () => this.reportIncident(button.dataset.incident)));
      window.addEventListener('beforeunload', () => this.persistTrip());
    },
    restoreTrip() {
      try {
        const saved = JSON.parse(sessionStorage.getItem('driverTrip'));
        if (!saved?.active) return;
        this.selectedShuttleId = saved.shuttleId;
        this.selectedRouteId = saved.routeId;
        this.capacity = saved.capacity;
        document.getElementById('driverShuttleSelect').value = this.selectedShuttleId;
        document.getElementById('driverRouteSelect').value = this.selectedRouteId;
        this.renderCapacityButtons();
        this.drawRoute();
        setTimeout(() => this.startTrip(true), 350);
      } catch (_) {}
    },
    persistTrip() {
      sessionStorage.setItem('driverTrip', JSON.stringify({ active: this.tripActive, shuttleId: this.selectedShuttleId, routeId: this.selectedRouteId, capacity: this.capacity }));
    },
    startTrip(restored = false) {
      if (this.tripActive) return;
      this.tripActive = true;
      document.getElementById('startTripButton').hidden = true;
      document.getElementById('endTripButton').hidden = false;
      document.getElementById('driverTripStatus').textContent = 'Trip active';
      document.getElementById('driverStatusOrb').classList.add('active');
      document.getElementById('mapLiveBadge').classList.remove('muted');
      document.getElementById('mapLiveBadge').innerHTML = '<i></i> Live';
      document.getElementById('driverShuttleSelect').disabled = true;
      document.getElementById('driverRouteSelect').disabled = true;
      this.persistTrip();
      this.beginLocationSharing();
      if (!restored) App.toast('Trip started', 'Your shuttle is now visible on the student map.', 'success');
    },
    beginLocationSharing() {
      const options = { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 };
      let fallbackStarted = false;
      const fallback = () => {
        if (fallbackStarted || !this.tripActive) return;
        fallbackStarted = true;
        document.getElementById('locationSource').textContent = 'Route simulator';
        document.getElementById('gpsStatus').textContent = 'Demo movement';
        this.simulationTimer = setInterval(() => this.simulatePosition(), 900);
        this.simulatePosition();
      };
      if (!navigator.geolocation) { fallback(); return; }
      document.getElementById('gpsStatus').textContent = 'Requesting GPS…';
      this.watchId = navigator.geolocation.watchPosition((position) => {
        const coord = [position.coords.longitude, position.coords.latitude];
        const withinCampus = coord[0] > -1.62 && coord[0] < -1.52 && coord[1] > 6.62 && coord[1] < 6.72;
        if (!withinCampus) { fallback(); return; }
        document.getElementById('locationSource').textContent = 'Phone GPS';
        document.getElementById('gpsStatus').textContent = `Accuracy ±${Math.round(position.coords.accuracy)} m`;
        this.publishPosition(coord, Number.isFinite(position.coords.heading) ? position.coords.heading : null, position.coords.speed);
      }, fallback, options);
      setTimeout(() => { if (!this.previousCoord) fallback(); }, 9000);
    },
    simulatePosition() {
      const route = App.routeById(this.selectedRouteId);
      if (!route) return;
      this.simulationProgress = (this.simulationProgress + 0.006) % 1;
      const point = App.positionAlongPath(route.path, this.simulationProgress);
      this.publishPosition(point.coord, point.bearing, 5.5, point.nextIndex);
    },
    publishPosition(coord, heading, speedMetersPerSecond, nextIndex = 1) {
      const now = Date.now();
      let speed = Number.isFinite(speedMetersPerSecond) ? Math.max(0, speedMetersPerSecond * 3.6) : 18;
      if (this.previousCoord && this.previousTime && !Number.isFinite(speedMetersPerSecond)) {
        speed = App.distanceKm(this.previousCoord, coord) / ((now - this.previousTime) / 3600000);
      }
      const bearing = Number.isFinite(heading) ? heading : App.bearing(this.previousCoord || coord, coord);
      this.previousCoord = coord;
      this.previousTime = now;
      this.marker?.setPosition(coord);
      const rotator = this.marker?.getElement().querySelector('.driver-bus-rotator');
      if (rotator) rotator.style.transform = `rotate(${bearing}deg)`;
      this.map?.panTo(App.toGoogleLatLng(coord));
      App.data.patchShuttle(this.selectedShuttleId, {
        routeId: this.selectedRouteId,
        capacity: this.capacity,
        status: this.capacity === 'out_of_service' ? 'out_of_service' : 'active',
        source: 'driver',
        coord,
        bearing,
        speed: Math.round(App.clamp(speed || 18, 0, 65)),
        nextIndex
      });
      this.updateNextStop(nextIndex);
    },
    updateNextStop(nextIndex) {
      const route = App.routeById(this.selectedRouteId);
      const stopId = route?.stopIds[nextIndex % route.stopIds.length] || route?.stopIds[1];
      document.getElementById('driverNextStop').textContent = App.stopById(stopId)?.name || '—';
    },
    endTrip() {
      this.tripActive = false;
      if (this.watchId !== null) navigator.geolocation?.clearWatch(this.watchId);
      clearInterval(this.simulationTimer);
      this.watchId = null;
      this.simulationTimer = null;
      App.data.patchShuttle(this.selectedShuttleId, { status: 'out_of_service', capacity: 'out_of_service', source: 'driver', speed: 0 });
      document.getElementById('startTripButton').hidden = false;
      document.getElementById('endTripButton').hidden = true;
      document.getElementById('driverTripStatus').textContent = 'Trip inactive';
      document.getElementById('gpsStatus').textContent = 'GPS ready';
      document.getElementById('driverStatusOrb').classList.remove('active');
      document.getElementById('mapLiveBadge').classList.add('muted');
      document.getElementById('mapLiveBadge').innerHTML = '<i></i> Offline';
      document.getElementById('driverShuttleSelect').disabled = false;
      document.getElementById('driverRouteSelect').disabled = false;
      this.persistTrip();
      App.toast('Trip ended', 'The shuttle has been marked out of service.', 'warning');
    },
    reportIncident(type) {
      if (!this.tripActive) {
        App.toast('Start a trip first', 'Incident alerts need an active shuttle assignment.', 'warning');
        return;
      }
      const route = App.routeById(this.selectedRouteId);
      const urgent = type === 'Emergency' || type === 'Road blocked';
      App.data.addAlert({ type, headline: `${type} on ${route.name}`, details: `Shuttle ${this.selectedShuttleId.replace('SH-', '')} reported ${type.toLowerCase()}. Expect delays while operations responds.`, severity: urgent ? 'critical' : 'warning' });
      if (type === 'Mechanical issue' || type === 'Emergency') {
        this.capacity = 'out_of_service';
        App.data.patchShuttle(this.selectedShuttleId, { capacity: 'out_of_service', status: 'out_of_service' });
        this.renderCapacityButtons();
      }
      App.toast('Incident sent', 'Students and operations can now see the alert.', urgent ? 'warning' : 'success');
    }
  };

  document.addEventListener('DOMContentLoaded', () => driver.init());
})();
