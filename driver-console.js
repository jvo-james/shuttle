(function () {
  'use strict';
  const App = window.ShuttleApp;

  const driver = {
    map: null,
    marker: null,
    stopMarkers: [],
    watchId: null,
    simulationTimer: null,
    tripActive: false,
    selectedShuttleId: 'SH-07',
    selectedRouteId: 'COMM_KSB',
    selectedDirection: 'forward',
    capacity: 'available',
    scheduleStatus: 'On time',
    progress: 0,
    previousCoord: null,
    previousTime: 0,
    currentCoord: null,
    currentTripStatus: 'En route',
    turnInProgress: false,
    turnaroundUntil: 0,
    geofence: new App.GeofenceTracker(),

    async init() {
      this.populateControls();
      this.renderCapacityButtons();
      this.bindEvents();
      await this.initMap();
      this.restoreTrip();
      this.updateTripUI();
      App.hydrateRoutePaths().then(() => this.drawRoute(false));
      document.addEventListener('routepathsupdated', () => this.drawRoute(false));
    },

    populateControls() {
      const state = App.data.getState();
      const shuttleSelect = document.getElementById('driverShuttleSelect');
      const routeSelect = document.getElementById('driverRouteSelect');
      shuttleSelect.innerHTML = Object.values(state.shuttles).map((shuttle) => `<option value="${shuttle.id}">Shuttle ${App.escapeHTML(shuttle.number)}</option>`).join('');
      routeSelect.innerHTML = App.routes.map((route) => `<option value="${route.id}">${App.escapeHTML(route.name)}</option>`).join('');
      shuttleSelect.value = this.selectedShuttleId;
      routeSelect.value = this.selectedRouteId;
      this.populateDirectionSelect();
    },

    populateDirectionSelect() {
      const select = document.getElementById('driverDirectionSelect');
      const route = App.routeById(this.selectedRouteId);
      if (!select || !route) return;
      select.innerHTML = Object.values(route.directions).map((direction) => `<option value="${direction.id}">${App.escapeHTML(direction.label)}</option>`).join('');
      if (!route.directions[this.selectedDirection]) this.selectedDirection = 'forward';
      select.value = this.selectedDirection;
    },

    renderCapacityButtons() {
      const holder = document.getElementById('capacityButtons');
      holder.innerHTML = Object.entries(App.capacityStates).map(([value, state]) => `
        <button class="capacity-button ${value === this.capacity ? 'active' : ''}" data-capacity="${value}" style="--status-color:${state.color}">
          <i></i><span><strong>${App.escapeHTML(state.label)}</strong><small>${App.escapeHTML(state.description)}</small></span>
        </button>`).join('');
      const state = App.capacityStates[this.capacity] || App.capacityStates.available;
      const field = document.getElementById('driverCapacityStatus');
      if (field) field.textContent = state.label;
    },

    async initMap() {
      try {
        this.map = await App.createMap('driverMap', { center: App.config.campusCenter, zoom: 14.8 });
        App.addAttribution(this.map);
        App.upsertGeoJSON(this.map, 'driver-completed', App.featureCollection([]));
        App.upsertGeoJSON(this.map, 'driver-remaining', App.featureCollection([]));
        App.addLineLayer(this.map, 'driver-completed-line', 'driver-completed', { 'line-color': '#abbab5', 'line-width': 5, 'line-opacity': .72 }, { zIndex: 2 });
        App.addLineLayer(this.map, 'driver-remaining-glow', 'driver-remaining', { 'line-color': ['get', 'color'], 'line-width': 13, 'line-opacity': .16, 'line-blur': 2 }, { zIndex: 3 });
        App.addLineLayer(this.map, 'driver-remaining-line', 'driver-remaining', { 'line-color': ['get', 'color'], 'line-width': 5.5, 'line-opacity': .96 }, { zIndex: 4 });
        const element = document.createElement('div');
        element.className = 'driver-pin';
        element.innerHTML = '<span class="driver-bus-rotator"><img src="shuttle-vehicle.svg" alt="" /></span>';
        this.marker = App.createDomMarker({ map: this.map, element, position: App.config.campusCenter, anchor: 'center' });
        this.drawRoute(true);
      } catch (error) {
        App.renderMapFallback('driverMap', error?.message || 'The driver map could not load.');
      }
    },

    clearStopMarkers() {
      this.stopMarkers.forEach((marker) => marker.remove());
      this.stopMarkers = [];
    },

    drawRoute(fit = false) {
      if (!this.map?.loaded()) return;
      const route = App.routeById(this.selectedRouteId);
      const direction = App.directionFor(this.selectedRouteId, this.selectedDirection);
      if (!route || !direction) return;
      const split = App.splitPathAtProgress(direction.path, this.progress);
      App.upsertGeoJSON(this.map, 'driver-completed', App.featureCollection([App.lineFeature(split.completed, { color: route.color })]));
      App.upsertGeoJSON(this.map, 'driver-remaining', App.featureCollection([App.lineFeature(split.remaining, { color: route.color })]));
      this.clearStopMarkers();
      direction.stopIds.forEach((stopId, index) => {
        const element = document.createElement('div');
        element.className = 'driver-route-stop';
        element.style.setProperty('--route-color', route.color);
        element.classList.toggle('completed', index < (App.getTripContext(this.selectedRouteId, this.selectedDirection, this.progress)?.nextIndex || 0));
        const marker = App.createDomMarker({ map: this.map, element, position: App.stopById(stopId).coord, anchor: 'center' });
        this.stopMarkers.push(marker);
      });
      if (fit) App.fitCoordinates(this.map, direction.path, { top: 55, right: 55, bottom: 55, left: 55 }, 15.7);
    },

    bindEvents() {
      document.getElementById('driverShuttleSelect').addEventListener('change', (event) => { this.selectedShuttleId = event.target.value; this.persistTrip(); });
      document.getElementById('driverRouteSelect').addEventListener('change', (event) => {
        this.selectedRouteId = App.normalizeRouteId(event.target.value);
        this.selectedDirection = 'forward';
        this.progress = 0;
        this.geofence = new App.GeofenceTracker();
        this.populateDirectionSelect();
        this.drawRoute(true);
        this.updateTripUI();
        this.persistTrip();
      });
      document.getElementById('driverDirectionSelect').addEventListener('change', (event) => {
        this.selectedDirection = App.normalizeDirectionId(event.target.value);
        this.progress = 0;
        this.geofence = new App.GeofenceTracker();
        this.drawRoute(true);
        this.updateTripUI();
        this.persistTrip();
      });
      document.getElementById('startTripButton').addEventListener('click', () => this.startTrip(false));
      document.getElementById('endTripButton').addEventListener('click', () => this.endTrip());
      document.getElementById('capacityButtons').addEventListener('click', (event) => {
        const button = event.target.closest('[data-capacity]');
        if (!button) return;
        this.capacity = button.dataset.capacity;
        this.renderCapacityButtons();
        if (this.tripActive) App.data.patchShuttle(this.selectedShuttleId, { capacity: this.capacity, status: this.capacity === 'out_of_service' ? 'out_of_service' : 'active' });
        this.updateTripUI();
        this.persistTrip();
      });
      document.querySelectorAll('[data-incident]').forEach((button) => button.addEventListener('click', () => this.reportIncident(button.dataset.incident)));
      window.addEventListener('beforeunload', () => this.persistTrip());
    },

    restoreTrip() {
      try {
        const saved = JSON.parse(sessionStorage.getItem('driverTripV3'));
        if (!saved?.active) return;
        this.selectedShuttleId = saved.shuttleId;
        this.selectedRouteId = App.normalizeRouteId(saved.routeId);
        this.selectedDirection = App.normalizeDirectionId(saved.direction);
        this.capacity = saved.capacity || 'available';
        this.scheduleStatus = saved.scheduleStatus || 'On time';
        this.progress = Number(saved.progress || 0);
        document.getElementById('driverShuttleSelect').value = this.selectedShuttleId;
        document.getElementById('driverRouteSelect').value = this.selectedRouteId;
        this.populateDirectionSelect();
        this.renderCapacityButtons();
        this.drawRoute(true);
        setTimeout(() => this.startTrip(true), 300);
      } catch (_) {}
    },

    persistTrip() {
      sessionStorage.setItem('driverTripV3', JSON.stringify({
        active: this.tripActive,
        shuttleId: this.selectedShuttleId,
        routeId: this.selectedRouteId,
        direction: this.selectedDirection,
        capacity: this.capacity,
        scheduleStatus: this.scheduleStatus,
        progress: this.progress
      }));
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
      ['driverShuttleSelect', 'driverRouteSelect', 'driverDirectionSelect'].forEach((id) => { document.getElementById(id).disabled = true; });
      this.persistTrip();
      this.beginLocationSharing();
      if (!restored) App.toast('Trip started', `${App.directionLabel(this.selectedRouteId, this.selectedDirection)} is now live.`, 'success');
    },

    beginLocationSharing() {
      let fallbackStarted = false;
      const fallback = () => {
        if (fallbackStarted || !this.tripActive) return;
        fallbackStarted = true;
        document.getElementById('locationSource').textContent = 'Route simulator';
        document.getElementById('gpsStatus').textContent = 'Demo movement';
        this.simulationTimer = setInterval(() => this.simulatePosition(), 850);
        this.simulatePosition();
      };
      if (!navigator.geolocation) { fallback(); return; }
      document.getElementById('gpsStatus').textContent = 'Requesting GPS…';
      this.watchId = navigator.geolocation.watchPosition((position) => {
        const coord = [position.coords.longitude, position.coords.latitude];
        const withinCampusArea = coord[0] > -1.62 && coord[0] < -1.51 && coord[1] > 6.61 && coord[1] < 6.73;
        if (!withinCampusArea) { fallback(); return; }
        if (fallbackStarted && this.simulationTimer) {
          clearInterval(this.simulationTimer);
          this.simulationTimer = null;
          fallbackStarted = false;
        }
        document.getElementById('locationSource').textContent = 'Phone GPS';
        document.getElementById('gpsStatus').textContent = `Accuracy ±${Math.round(position.coords.accuracy)} m`;
        const direction = App.directionFor(this.selectedRouteId, this.selectedDirection);
        this.progress = App.closestProgressOnPath(direction.path, coord);
        this.publishPosition(coord, Number.isFinite(position.coords.heading) ? position.coords.heading : null, position.coords.speed);
      }, fallback, { enableHighAccuracy: true, maximumAge: 3000, timeout: 8000 });
      setTimeout(() => { if (!this.previousCoord) fallback(); }, 8500);
    },

    simulatePosition() {
      if (!this.tripActive) return;
      const direction = App.directionFor(this.selectedRouteId, this.selectedDirection);
      if (!direction) return;
      if (this.turnInProgress || Date.now() < this.turnaroundUntil) {
        const terminal = App.stopById(direction.originId);
        const coord = this.currentCoord || terminal?.coord || App.positionAlongPath(direction.path, this.progress).coord;
        this.publishPosition(coord, this.markerBearing || 0, 0);
        return;
      }
      if (this.progress < 1) this.progress = Math.min(1, this.progress + 0.006);
      const point = App.positionAlongPath(direction.path, this.progress);
      this.publishPosition(point.coord, point.bearing, this.progress >= 1 ? 0 : 5.2);
    },

    beginTurnaround(terminalId) {
      if (this.turnInProgress) return;
      this.turnInProgress = true;
      this.turnaroundUntil = Date.now() + 3200;
      const terminal = App.stopById(terminalId);
      this.currentTripStatus = `Turning around at ${terminal?.short || 'terminal'}`;
      document.getElementById('turnaroundMessage').textContent = this.currentTripStatus;
      this.updateTripUI();
      App.data.patchShuttle(this.selectedShuttleId, { tripStatus: this.currentTripStatus, speed: 0, atStopId: terminalId });
      setTimeout(() => {
        if (!this.tripActive) return;
        this.selectedDirection = App.oppositeDirection(this.selectedDirection);
        this.progress = 0;
        this.turnInProgress = false;
        document.getElementById('driverDirectionSelect').value = this.selectedDirection;
        const nextContext = App.getTripContext(this.selectedRouteId, this.selectedDirection, 0);
        this.currentTripStatus = `Turning around at ${terminal?.short || 'terminal'}`;
        this.drawRoute(true);
        this.updateTripUI();
        App.data.patchShuttle(this.selectedShuttleId, {
          direction: this.selectedDirection,
          progress: 0,
          currentStopId: terminalId,
          nextStopId: nextContext?.nextStop?.id,
          tripStatus: this.currentTripStatus,
          atStopId: terminalId
        });
        setTimeout(() => {
          if (this.tripActive) document.getElementById('turnaroundMessage').textContent = 'Direction changed automatically';
        }, 900);
      }, 3200);
    },

    publishPosition(coord, heading, speedMetersPerSecond) {
      const now = Date.now();
      let speed = Number.isFinite(speedMetersPerSecond) ? Math.max(0, speedMetersPerSecond * 3.6) : 18;
      if (this.previousCoord && this.previousTime && !Number.isFinite(speedMetersPerSecond)) speed = App.distanceKm(this.previousCoord, coord) / ((now - this.previousTime) / 3600000);
      const bearing = Number.isFinite(heading) ? heading : App.bearing(this.previousCoord || coord, coord);
      this.previousCoord = coord;
      this.previousTime = now;
      this.currentCoord = coord;
      this.markerBearing = bearing;
      this.marker?.setPosition(coord);
      const rotator = this.marker?.getElement()?.querySelector('.driver-bus-rotator');
      if (rotator) rotator.style.transform = `rotate(${bearing}deg)`;
      this.map?.easeTo({ center: coord, duration: 350 });

      const geofenceState = this.geofence.update({
        coord,
        routeId: this.selectedRouteId,
        directionId: this.selectedDirection,
        progress: this.progress,
        timestamp: now
      });
      this.currentTripStatus = this.turnInProgress ? this.currentTripStatus : geofenceState.status;
      const context = App.getTripContext(this.selectedRouteId, this.selectedDirection, this.progress);
      const currentStopId = geofenceState.atStopId || context?.currentStop?.id;
      const nextStopId = context?.nextStop?.id;

      App.data.patchShuttle(this.selectedShuttleId, {
        routeId: this.selectedRouteId,
        direction: this.selectedDirection,
        progress: this.progress,
        capacity: this.capacity,
        status: this.capacity === 'out_of_service' ? 'out_of_service' : 'active',
        source: 'driver',
        coord,
        bearing,
        speed: Math.round(App.clamp(speed || 18, 0, 65)),
        currentStopId,
        nextStopId,
        atStopId: geofenceState.atStopId || '',
        tripStatus: this.currentTripStatus,
        scheduleStatus: this.scheduleStatus
      });

      if (geofenceState.shouldTurn && !this.turnInProgress) this.beginTurnaround(geofenceState.atStopId || context?.destination?.id);
      this.drawRoute(false);
      this.updateTripUI();
      this.persistTrip();
    },

    updateTripUI() {
      const context = App.getTripContext(this.selectedRouteId, this.selectedDirection, this.progress);
      const capacity = App.capacityStates[this.capacity] || App.capacityStates.available;
      document.getElementById('driverDirectionLabel').textContent = App.directionLabel(this.selectedRouteId, this.selectedDirection);
      document.getElementById('driverCurrentStatus').textContent = this.currentTripStatus || 'En route';
      document.getElementById('driverNextStop').textContent = context?.nextStop?.name || context?.destination?.name || 'Destination';
      document.getElementById('driverCapacityStatus').textContent = capacity.label;
      document.getElementById('driverScheduleStatus').textContent = this.scheduleStatus;
      document.getElementById('driverProgress').textContent = `${Math.round(this.progress * 100)}%`;
      if (!this.tripActive && !this.turnInProgress) document.getElementById('turnaroundMessage').textContent = 'Ready to begin';
    },

    endTrip() {
      this.tripActive = false;
      if (this.watchId !== null) navigator.geolocation?.clearWatch(this.watchId);
      clearInterval(this.simulationTimer);
      this.watchId = null;
      this.simulationTimer = null;
      this.turnInProgress = false;
      App.data.patchShuttle(this.selectedShuttleId, { status: 'out_of_service', capacity: 'out_of_service', source: 'driver', speed: 0, tripStatus: 'Trip ended' });
      document.getElementById('startTripButton').hidden = false;
      document.getElementById('endTripButton').hidden = true;
      document.getElementById('driverTripStatus').textContent = 'Trip inactive';
      document.getElementById('gpsStatus').textContent = 'GPS ready';
      document.getElementById('driverStatusOrb').classList.remove('active');
      document.getElementById('mapLiveBadge').classList.add('muted');
      document.getElementById('mapLiveBadge').innerHTML = '<i></i> Offline';
      ['driverShuttleSelect', 'driverRouteSelect', 'driverDirectionSelect'].forEach((id) => { document.getElementById(id).disabled = false; });
      this.persistTrip();
      this.updateTripUI();
      App.toast('Trip ended', 'The shuttle has been marked out of service.', 'warning');
    },

    reportIncident(type) {
      if (!this.tripActive) {
        App.toast('Start a trip first', 'Incident alerts need an active shuttle assignment.', 'warning');
        return;
      }
      const urgent = type === 'Emergency' || type === 'Road blocked';
      if (type === 'Heavy traffic' || type === 'Road blocked') this.scheduleStatus = 'Delayed';
      App.data.addAlert({
        type,
        headline: `${type}: ${App.directionLabel(this.selectedRouteId, this.selectedDirection)}`,
        details: `Shuttle ${this.selectedShuttleId.replace('SH-', '')} reported ${type.toLowerCase()}. Expect delays while operations responds.`,
        severity: urgent ? 'critical' : 'warning'
      });
      if (type === 'Mechanical issue' || type === 'Emergency') {
        this.capacity = 'out_of_service';
        App.data.patchShuttle(this.selectedShuttleId, { capacity: 'out_of_service', status: 'out_of_service' });
        this.renderCapacityButtons();
      }
      this.updateTripUI();
      App.toast('Incident sent', 'Students and operations can now see the alert.', urgent ? 'warning' : 'success');
    }
  };

  document.addEventListener('DOMContentLoaded', () => driver.init());
})();
