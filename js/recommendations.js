(function () {
  'use strict';
  const App = window.ShuttleApp;

  App.recommendations = {
    selectedDestination: '',
    currentShuttleId: null,
    init() {
      const select = document.getElementById('destinationSelect');
      const clear = document.getElementById('clearDestination');
      if (select) {
        select.innerHTML = '<option value="">Choose a campus stop</option>' + App.stops.map((stop) => `<option value="${stop.id}">${App.escapeHTML(stop.name)}</option>`).join('');
        select.addEventListener('change', () => {
          this.selectedDestination = select.value;
          clear?.classList.toggle('visible', Boolean(select.value));
          if (select.value) {
            const stop = App.stopById(select.value);
            if (App.map) { App.map.panTo(App.toGoogleLatLng(stop.coord)); App.map.setZoom(16.5); }
          }
          this.update();
        });
      }
      clear?.addEventListener('click', () => {
        select.value = '';
        this.selectedDestination = '';
        clear.classList.remove('visible');
        this.update();
      });
      document.getElementById('recommendationAction')?.addEventListener('click', () => {
        if (this.currentShuttleId) App.shuttleManager?.open(this.currentShuttleId);
      });
      document.addEventListener('shuttle:positions-updated', () => {
        if (!this.lastUpdate || Date.now() - this.lastUpdate > 1800) this.update();
      });
      document.addEventListener('shuttle:user-location', () => this.update());
    },
    update() {
      this.lastUpdate = Date.now();
      const title = document.getElementById('recommendationTitle');
      const text = document.getElementById('recommendationText');
      const action = document.getElementById('recommendationAction');
      if (!title || !text) return;
      const origin = App.userLocation || App.config.campusCenter;
      const destination = this.selectedDestination ? App.stopById(this.selectedDestination) : null;
      const shuttles = Object.values(App.runtimeShuttles || {}).filter((shuttle) => shuttle.status === 'active' && shuttle.capacity !== 'out_of_service');
      if (!shuttles.length) {
        title.textContent = 'No active shuttle is visible';
        text.textContent = 'Walking may currently be faster.';
        action.hidden = true;
        return;
      }
      const eligible = destination
        ? shuttles.filter((shuttle) => App.routeById(shuttle.routeId)?.stopIds.includes(destination.id))
        : shuttles;
      if (!eligible.length) {
        title.textContent = `No direct shuttle to ${destination.name}`;
        text.textContent = 'Try a nearby stop or check another route.';
        action.hidden = true;
        return;
      }
      const ranked = eligible.map((shuttle) => {
        const distance = App.distanceKm(origin, shuttle.coord);
        const capacityPenalty = shuttle.capacity === 'full' ? 20 : shuttle.capacity === 'standing' ? 6 : 0;
        return { shuttle, distance, score: distance * 60 + capacityPenalty };
      }).sort((a, b) => a.score - b.score);
      const best = ranked.find((item) => item.shuttle.capacity !== 'full') || ranked[0];
      const nearest = ranked[0];
      const eta = Math.max(1, Math.round((best.distance / Math.max(best.shuttle.speed, 10)) * 60 * 1.35));
      const route = App.routeById(best.shuttle.routeId);
      this.currentShuttleId = best.shuttle.id;
      action.hidden = false;
      if (nearest.shuttle.capacity === 'full' && best.shuttle.id !== nearest.shuttle.id) {
        title.textContent = `Skip full Shuttle ${nearest.shuttle.number}`;
        text.textContent = `Shuttle ${best.shuttle.number} on ${route.name} has space · about ${eta} min away.`;
      } else if (destination) {
        title.textContent = `Take Shuttle ${best.shuttle.number} to ${destination.short}`;
        text.textContent = `${App.capacityStates[best.shuttle.capacity].label} · approximately ${eta} min away.`;
      } else {
        title.textContent = `Shuttle ${best.shuttle.number} is your best nearby option`;
        text.textContent = `${route.name} · ${App.capacityStates[best.shuttle.capacity].label} · about ${eta} min away.`;
      }
    }
  };
})();
