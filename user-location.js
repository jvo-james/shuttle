(function () {
  'use strict';
  const App = window.ShuttleApp;
  const LOCATION_STORAGE_KEY = 'shuttlePulseLastLocationV1';

  App.location = {
    map: null,
    marker: null,
    watchId: null,
    hasRealLocation: false,
    initialFocusDone: false,
    pickupStopId: '',

    initialCoordinate() {
      try {
        const stored = JSON.parse(localStorage.getItem(LOCATION_STORAGE_KEY) || 'null');
        const coord = stored?.coord;
        if (Array.isArray(coord) && Number.isFinite(coord[0]) && Number.isFinite(coord[1])) return coord;
      } catch (_) {}
      return App.config.demoUserLocation;
    },

    init(map) {
      this.map = map;
      App.userLocation = this.initialCoordinate();
      this.createMarker(App.userLocation);
      this.initWalkingPath();
      this.focus(App.userLocation, 420);
      App.recommendations?.refreshNearestPickup?.();
      this.request({ focus: true, watch: true });
      setInterval(() => this.updateNearbyState(), 4000);
    },

    createMarker(coord) {
      const element = document.createElement('div');
      element.className = 'user-location-marker';
      element.innerHTML = '<span class="user-heading-cone"></span><span class="user-pulse"></span><span class="user-core"></span>';
      this.marker = App.createDomMarker({ map: this.map, element, position: coord, anchor: 'center' });
      App.setUserAccuracyCircle(this.map, coord, 45);
    },

    initWalkingPath() {
      App.upsertGeoJSON(this.map, 'walking-path', App.featureCollection([]));
      App.addLineLayer(this.map, 'walking-path-glow', 'walking-path', {
        'line-color': '#ffffff',
        'line-width': 7,
        'line-opacity': 0.78
      }, { zIndex: 8 });
      App.addLineLayer(this.map, 'walking-path-dash', 'walking-path', {
        'line-color': '#6b35b5',
        'line-width': 3.2,
        'line-opacity': 0.95,
        'line-dasharray': [0.8, 1.3]
      }, { zIndex: 9 });
    },

    setPickupStop(stopId) {
      this.pickupStopId = stopId || '';
      App.stopManager?.setPickup?.(this.pickupStopId);
      this.updateWalkingPath();
    },

    updateWalkingPath() {
      if (!this.map) return;
      const stop = App.stopById(this.pickupStopId);
      const user = App.userLocation;
      if (!stop || !user) {
        App.upsertGeoJSON(this.map, 'walking-path', App.featureCollection([]));
        return;
      }
      const distanceKm = App.distanceKm(user, stop.coord);
      const dx = stop.coord[0] - user[0];
      const dy = stop.coord[1] - user[1];
      const midpoint = [
        user[0] + dx * 0.52 - dy * 0.045,
        user[1] + dy * 0.52 + dx * 0.045
      ];
      App.upsertGeoJSON(this.map, 'walking-path', App.featureCollection([
        App.lineFeature([user, midpoint, stop.coord], {
          mode: 'walk',
          distanceMeters: Math.round(distanceKm * 1000)
        })
      ]));
    },

    persist(coord) {
      try {
        localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify({ coord, updatedAt: Date.now() }));
      } catch (_) {}
    },

    update(coord, accuracy = 45, heading = null, options = {}) {
      if (!Array.isArray(coord) || !Number.isFinite(coord[0]) || !Number.isFinite(coord[1])) return;
      App.userLocation = coord;
      this.marker?.setPosition(coord);
      App.setUserAccuracyCircle(this.map, coord, accuracy);
      const cone = this.marker?.getElement()?.querySelector('.user-heading-cone');
      if (cone && Number.isFinite(heading)) cone.style.transform = `translate(-50%, -100%) rotate(${heading}deg)`;
      if (options.real) {
        this.hasRealLocation = true;
        this.persist(coord);
      }
      if (options.focus) this.focus(coord, options.duration || 700);
      App.recommendations?.refreshNearestPickup?.();
      this.updateWalkingPath();
      this.updateNearbyState();
    },

    focus(coord, duration = 700) {
      this.map?.easeTo({ center: coord, zoom: App.config.initialUserZoom, duration });
    },

    request({ focus = false, watch = false, force = false, fromControl = false } = {}) {
      if (!navigator.geolocation) {
        if (fromControl) App.toast('Location unavailable', 'This browser does not support GPS location.', 'warning');
        return;
      }

      const button = document.getElementById('recenterButton');
      if (fromControl) button?.classList.add('locating');

      const success = (position) => {
        const coord = [position.coords.longitude, position.coords.latitude];
        const shouldFocus = focus && (force || !this.initialFocusDone);
        this.update(coord, position.coords.accuracy, position.coords.heading, {
          real: true,
          focus: shouldFocus,
          duration: force ? 760 : 680
        });
        if (shouldFocus) this.initialFocusDone = true;
        button?.classList.remove('locating');
        if (fromControl) App.toast('Location centered', 'Showing your latest high-accuracy position.', 'success', 1700);
      };

      const error = () => {
        button?.classList.remove('locating');
        if (fromControl) {
          this.focus(App.userLocation || App.config.demoUserLocation, 620);
          App.toast('Could not refresh GPS', 'Using your last known location. Check location permission and try again.', 'warning', 2400);
        }
      };

      navigator.geolocation.getCurrentPosition(success, error, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: force ? 0 : 10000
      });

      if (watch && this.watchId === null) {
        this.watchId = navigator.geolocation.watchPosition((position) => {
          const coord = [position.coords.longitude, position.coords.latitude];
          const shouldFocus = focus && !this.initialFocusDone;
          this.update(coord, position.coords.accuracy, position.coords.heading, {
            real: true,
            focus: shouldFocus,
            duration: 680
          });
          if (shouldFocus) this.initialFocusDone = true;
        }, () => {}, {
          enableHighAccuracy: true,
          maximumAge: 4000,
          timeout: 12000
        });
      }
    },

    recenter() {
      this.request({ focus: true, force: true, fromControl: true });
    },

    updateNearbyState() {
      const state = document.getElementById('nearbyEmptyState');
      if (!state || !App.userLocation) return;
      const shuttles = Object.values(App.runtimeShuttles || {}).filter((shuttle) => shuttle.status === 'active' && shuttle.capacity !== 'out_of_service');
      if (!shuttles.length) {
        state.hidden = true;
        return;
      }
      const nearby = shuttles.some((shuttle) => App.distanceKm(App.userLocation, shuttle.coord || shuttle.displayCoord) <= 2);
      state.hidden = nearby;
    }
  };
})();
