(function () {
  'use strict';
  const App = window.ShuttleApp;

  App.location = {
    marker: null,
    accuracyCircle: null,
    watchId: null,
    hasRealLocation: false,
    firstFix: true,
    lastHeading: 0,
    init(map) {
      this.map = map;
      App.userLocation = null;
      const options = { enableHighAccuracy: true, timeout: 12000, maximumAge: 5000 };
      if (!navigator.geolocation) {
        App.toast('Location unavailable', 'This browser does not support live location.', 'warning');
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => this.update(position),
        (error) => this.handleError(error),
        options
      );
      this.watchId = navigator.geolocation.watchPosition(
        (position) => this.update(position),
        () => {},
        options
      );
      window.addEventListener('deviceorientationabsolute', (event) => {
        if (Number.isFinite(event.alpha)) this.setHeading((360 - event.alpha) % 360);
      }, { passive: true });
    },
    createMarker(coord, heading = 0) {
      const element = document.createElement('div');
      element.className = 'user-marker';
      element.innerHTML = `
        <span class="user-heading-cone" aria-hidden="true"></span>
        <span class="user-pulse" aria-hidden="true"></span>
        <span class="user-core" aria-hidden="true"></span>`;
      element.style.setProperty('--heading', `${heading}deg`);
      this.element = element;
      this.marker = App.createHtmlMapMarker({ map: this.map, element, position: coord, anchor: 'center', zIndex: 100 });
      this.accuracyCircle = new google.maps.Circle({
        map: this.map,
        center: App.toGoogleLatLng(coord),
        radius: 30,
        strokeColor: '#2d7dff',
        strokeOpacity: 0.2,
        strokeWeight: 1,
        fillColor: '#2d7dff',
        fillOpacity: 0.085,
        clickable: false,
        zIndex: 1
      });
    },
    update(position) {
      const coord = [position.coords.longitude, position.coords.latitude];
      App.userLocation = coord;
      this.hasRealLocation = true;
      const heading = Number.isFinite(position.coords.heading) ? position.coords.heading : this.lastHeading;
      if (!this.marker) this.createMarker(coord, heading);
      else this.marker.setPosition(coord);
      this.setHeading(heading);
      this.accuracyCircle?.setCenter(App.toGoogleLatLng(coord));
      this.accuracyCircle?.setRadius(App.clamp(position.coords.accuracy || 30, 12, 180));
      this.element?.classList.toggle('low-accuracy', (position.coords.accuracy || 0) > 80);
      if (this.firstFix) {
        this.firstFix = false;
        this.map.panTo(App.toGoogleLatLng(coord));
        this.map.setZoom(17.1);
        App.toast('You are on the map', `Location accuracy ±${Math.round(position.coords.accuracy || 0)} m.`, 'success');
      }
      document.dispatchEvent(new CustomEvent('shuttle:user-location', { detail: coord }));
    },
    setHeading(heading) {
      if (!Number.isFinite(heading)) return;
      this.lastHeading = heading;
      this.element?.style.setProperty('--heading', `${heading}deg`);
      this.element?.classList.toggle('has-heading', Number.isFinite(heading));
    },
    handleError(error) {
      const denied = error?.code === 1;
      App.toast(
        denied ? 'Turn on location access' : 'Could not find your location',
        denied ? 'Allow location for this site, then tap the location button.' : 'Check GPS and try again.',
        'warning',
        5200
      );
    },
    recenter() {
      if (this.hasRealLocation && App.userLocation) {
        this.map.panTo(App.toGoogleLatLng(App.userLocation));
        this.map.setZoom(Math.max(this.map.getZoom() || 0, 17.1));
        App.toast('Location centred', 'The blue pulse shows your current position.', 'success');
        return;
      }
      navigator.geolocation?.getCurrentPosition(
        (position) => this.update(position),
        (error) => this.handleError(error),
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    }
  };
})();
