(function () {
  'use strict';
  const App = window.ShuttleApp;

  App.stops = [
    { id: 'unity', name: 'Unity Hall', short: 'Unity', coord: [-1.5682, 6.6764], baseCrowd: 13 },
    { id: 'katanga', name: 'Katanga', short: 'Katanga', coord: [-1.5750, 6.6759], baseCrowd: 17 },
    { id: 'library', name: 'Main Library', short: 'Library', coord: [-1.5712, 6.6738], baseCrowd: 9 },
    { id: 'paa-joe', name: 'Paa Joe Stadium', short: 'Paa Joe', coord: [-1.5780, 6.6800], baseCrowd: 6 },
    { id: 'commercial', name: 'Commercial Area', short: 'Commercial', coord: [-1.5765, 6.6708], baseCrowd: 21 },
    { id: 'engineering', name: 'Engineering', short: 'Engineering', coord: [-1.5670, 6.6715], baseCrowd: 11 },
    { id: 'science', name: 'College of Science', short: 'Science', coord: [-1.5642, 6.6741], baseCrowd: 8 },
    { id: 'ayeduase', name: 'Ayeduase Gate', short: 'Ayeduase', coord: [-1.5588, 6.6820], baseCrowd: 15 },
    { id: 'ksb', name: 'KSB', short: 'KSB', coord: [-1.5671, 6.6793], baseCrowd: 12 },
    { id: 'independence', name: 'Independence Hall', short: 'Independence', coord: [-1.5726, 6.6780], baseCrowd: 7 }
  ];

  const stop = (id) => App.stops.find((item) => item.id === id);

  App.routes = [
    {
      id: 'green-loop', name: 'Green Loop', color: '#17a875',
      stopIds: ['commercial', 'katanga', 'independence', 'library', 'engineering', 'commercial']
    },
    {
      id: 'blue-link', name: 'Blue Link', color: '#3d7cf3',
      stopIds: ['ayeduase', 'ksb', 'unity', 'science', 'engineering', 'library', 'ayeduase']
    },
    {
      id: 'gold-line', name: 'Gold Line', color: '#e4a12f',
      stopIds: ['paa-joe', 'katanga', 'commercial', 'library', 'unity', 'ksb', 'paa-joe']
    }
  ].map((route) => ({ ...route, path: route.stopIds.map((id) => stop(id).coord) }));

  App.getStopCrowd = (stopId) => {
    const item = stop(stopId);
    const state = App.data?.getState();
    const live = (state?.waiting?.[stopId] || []).filter((session) => session.expiresAt > Date.now()).length;
    const wave = Math.round(3 * Math.sin(Date.now() / 900000 + App.stops.indexOf(item)));
    return Math.max(0, (item?.baseCrowd || 0) + live + wave);
  };

  App.stopManager = {
    markers: new Map(),
    init(map) {
      this.map = map;
      App.stops.forEach((item) => {
        const el = document.createElement('button');
        el.className = 'stop-marker';
        el.type = 'button';
        el.setAttribute('aria-label', `${item.name} shuttle stop`);
        el.innerHTML = '<span class="stop-pin"><i class="stop-icon"></i></span>';
        el.addEventListener('click', (event) => {
          event.stopPropagation();
          this.open(item.id);
        });
        const marker = App.createHtmlMapMarker({ map, element: el, position: item.coord, anchor: 'bottom', zIndex: 20 });
        this.markers.set(item.id, { marker, element: el });
      });
      this.refreshCrowds();
      setInterval(() => this.refreshCrowds(), 15000);
    },
    refreshCrowds() {
      App.stops.forEach((item) => {
        const entry = this.markers.get(item.id);
        if (!entry) return;
        const count = App.getStopCrowd(item.id);
        entry.element.classList.toggle('busy', count >= 15);
        entry.element.dataset.count = count;
      });
    },
    arrivals(stopId) {
      const destination = stop(stopId);
      const shuttles = Object.values(App.runtimeShuttles || {});
      return shuttles
        .filter((shuttle) => shuttle.status === 'active' && App.routeById(shuttle.routeId)?.stopIds.includes(stopId))
        .map((shuttle) => ({ ...shuttle, eta: Math.max(1, Math.round((App.distanceKm(shuttle.coord, destination.coord) / Math.max(shuttle.speed, 8)) * 60 * 1.35)) }))
        .sort((a, b) => a.eta - b.eta)
        .slice(0, 3);
    },
    open(stopId) {
      const item = stop(stopId);
      if (!item) return;
      const crowd = App.getStopCrowd(stopId);
      const arrivals = this.arrivals(stopId);
      const arrivalHTML = arrivals.length ? arrivals.map((shuttle) => {
        const capacity = App.capacityStates[shuttle.capacity] || App.capacityStates.available;
        return `<div class="arrival-row"><span class="arrival-bus">${App.escapeHTML(shuttle.number)}</span><div><strong>Shuttle ${App.escapeHTML(shuttle.number)} · ${App.escapeHTML(capacity.short)}</strong><small>${App.escapeHTML(App.routeById(shuttle.routeId)?.name || 'Campus route')}</small></div><em>${shuttle.eta} min</em></div>`;
      }).join('') : '<div class="confidence-note">No active shuttle is currently approaching this stop.</div>';
      App.openSheet(`
        <div class="stop-sheet-header"><span class="stop-sheet-icon"><img src="assets/icons/bus-stop.svg" alt="" /></span><div><span class="eyebrow">CAMPUS STOP</span><h2 id="sheetTitle">${App.escapeHTML(item.name)}</h2><p>Live arrivals and estimated crowd level</p></div></div>
        <div class="arrival-list">${arrivalHTML}</div>
        <div class="waiting-card"><div><small>STUDENTS WAITING</small><strong>Approximately ${crowd}</strong></div><button data-wait-stop="${item.id}">I’m waiting here</button></div>
        <div class="confidence-note">For privacy, only an estimated total is shown. Waiting sessions expire automatically after 30 minutes.</div>
      `);
    }
  };
})();
