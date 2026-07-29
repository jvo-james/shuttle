(function () {
  'use strict';
  const App = window.ShuttleApp;

  App.recommendations = {
    destinationId: '',
    pickupMode: 'auto',
    manualPickupId: '',
    nearestPickupId: '',
    currentShuttleId: null,
    currentPlan: null,

    init() {
      const pickupSelect = document.getElementById('pickupSelect');
      const destinationSelect = document.getElementById('destinationSelect');
      if (!pickupSelect || !destinationSelect) return;

      destinationSelect.innerHTML = '<option value="">Select destination</option>' + App.stops
        .map((stop) => `<option value="${stop.id}">${App.escapeHTML(stop.name)}</option>`).join('');
      this.refreshNearestPickup();

      pickupSelect.addEventListener('change', () => {
        this.pickupMode = pickupSelect.value === 'auto' ? 'auto' : 'manual';
        this.manualPickupId = this.pickupMode === 'manual' ? pickupSelect.value : '';
        document.getElementById('pickupPrompt').textContent = this.pickupMode === 'auto' ? 'Nearest pickup stop' : 'Pickup stop';
        App.location?.setPickupStop?.(this.pickupStopId());
        this.update(true);
      });

      destinationSelect.addEventListener('change', () => {
        this.destinationId = destinationSelect.value;
        document.getElementById('clearDestination')?.classList.toggle('visible', Boolean(destinationSelect.value));
        this.update(true);
      });

      document.getElementById('clearDestination')?.addEventListener('click', () => {
        destinationSelect.value = '';
        this.destinationId = '';
        this.currentPlan = null;
        document.getElementById('clearDestination')?.classList.remove('visible');
        this.update(true);
      });

      document.getElementById('recommendationAction')?.addEventListener('click', () => {
        if (this.currentShuttleId) App.shuttleManager?.select(this.currentShuttleId, true);
        else destinationSelect.focus();
      });
      document.getElementById('recommendationCard')?.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        if (this.currentShuttleId) App.shuttleManager?.select(this.currentShuttleId, true);
      });
      setInterval(() => this.update(false), 3500);
    },

    refreshNearestPickup() {
      const pickupSelect = document.getElementById('pickupSelect');
      if (!pickupSelect) return;
      const nearest = App.findNearestStop(App.userLocation || App.config.demoUserLocation);
      this.nearestPickupId = nearest?.stop?.id || 'unity';
      const currentValue = this.pickupMode === 'manual' ? this.manualPickupId : 'auto';
      pickupSelect.innerHTML = `<option value="auto">${App.escapeHTML(nearest?.stop?.name || 'Unity Hall Bus Stop')}</option>` +
        App.stops.map((stop) => `<option value="${stop.id}">${App.escapeHTML(stop.name)}</option>`).join('');
      pickupSelect.value = currentValue && [...pickupSelect.options].some((option) => option.value === currentValue) ? currentValue : 'auto';
      App.location?.setPickupStop?.(this.pickupStopId());
      this.update(false);
    },

    pickupStopId() {
      return this.pickupMode === 'manual' && this.manualPickupId ? this.manualPickupId : this.nearestPickupId;
    },

    buildPlan() {
      const pickupId = this.pickupStopId();
      if (!this.destinationId || !pickupId) return null;
      return App.planJourney(pickupId, this.destinationId);
    },

    firstLeg(plan) { return plan?.legs?.[0] || null; },

    waitDistanceKm(shuttle, leg) {
      if (!leg) return this.waitDistanceToStop(shuttle, this.pickupStopId());
      const boardingStopId = leg.stopIds[0];
      const desiredDirection = App.directionFor(leg.routeId, leg.directionId);
      const desiredProgresses = App.getStopProgresses(desiredDirection);
      const boardingIndex = desiredDirection?.stopIds.indexOf(boardingStopId) ?? -1;
      const boardingProgress = boardingIndex >= 0 ? desiredProgresses[boardingIndex] : 0;
      const desiredLength = App.pathSegments(desiredDirection?.path || []).total;

      if (shuttle.routeId === leg.routeId && shuttle.direction === leg.directionId) {
        const delta = boardingProgress >= (shuttle.progress || 0)
          ? boardingProgress - (shuttle.progress || 0)
          : (1 - (shuttle.progress || 0)) + boardingProgress;
        return Math.max(0.02, delta * desiredLength);
      }

      const currentDirection = App.directionFor(shuttle.routeId, shuttle.direction);
      const currentLength = App.pathSegments(currentDirection?.path || []).total;
      return Math.max(0.02, (1 - (shuttle.progress || 0)) * currentLength + boardingProgress * desiredLength + 0.2);
    },

    waitDistanceToStop(shuttle, stopId) {
      const route = App.routeById(shuttle.routeId);
      const currentDirection = App.directionFor(shuttle.routeId, shuttle.direction);
      if (!route || !currentDirection || !stopId) return Infinity;
      const currentProgress = App.clamp(Number(shuttle.progress || 0), 0, 1);
      const currentLength = App.pathSegments(currentDirection.path || []).total;
      let best = Infinity;

      Object.values(route.directions).forEach((direction) => {
        const index = direction.stopIds.indexOf(stopId);
        if (index < 0) return;
        const progresses = App.getStopProgresses(direction);
        const stopProgress = progresses[index] ?? 0;
        const directionLength = App.pathSegments(direction.path || []).total;
        let distance;

        if (direction.id === currentDirection.id && stopProgress >= currentProgress) {
          distance = (stopProgress - currentProgress) * currentLength;
        } else if (direction.id !== currentDirection.id) {
          distance = (1 - currentProgress) * currentLength + stopProgress * directionLength;
        } else {
          const opposite = Object.values(route.directions).find((item) => item.id !== currentDirection.id);
          const oppositeLength = App.pathSegments(opposite?.path || []).total;
          distance = (1 - currentProgress) * currentLength + oppositeLength + stopProgress * directionLength;
        }
        best = Math.min(best, distance);
      });

      return Number.isFinite(best) ? Math.max(0.02, best) : Infinity;
    },

    servesStop(shuttle, stopId) {
      return Object.values(App.routeById(shuttle.routeId)?.directions || {}).some((direction) => direction.stopIds.includes(stopId));
    },

    canServe(shuttle, plan) {
      const leg = this.firstLeg(plan);
      if (!leg) return false;
      return shuttle.routeId === leg.routeId;
    },

    score(shuttle, plan) {
      const leg = this.firstLeg(plan);
      const pickup = App.stopById(this.pickupStopId());
      const walkingDistance = this.pickupMode === 'manual' ? 0 : App.distanceKm(App.userLocation || App.config.demoUserLocation, pickup?.coord);
      const waitDistance = this.waitDistanceKm(shuttle, leg);
      const directionPenalty = leg && shuttle.direction !== leg.directionId ? 0.85 : 0;
      const capacityPenalty = shuttle.capacity === 'full' ? 8 : shuttle.capacity === 'standing' ? 1.8 : 0;
      return walkingDistance * 1.35 + waitDistance + directionPenalty + capacityPenalty;
    },

    capacityPresentation(state) {
      if (state === 'empty' || state === 'available') return { label: 'High availability', tone: 'high' };
      if (state === 'standing') return { label: 'Nearly full', tone: 'medium' };
      if (state === 'full') return { label: 'Full', tone: 'low' };
      return { label: 'Unavailable', tone: 'neutral' };
    },

    setCard(values) {
      const fields = {
        recommendationEyebrow: values.eyebrow || 'BEST SHUTTLE',
        recommendationTitle: values.title,
        recommendationCurrent: values.current,
        recommendationNext: values.next,
        recommendationEta: values.eta,
        recommendationCapacity: values.capacity,
        recommendationVehicle: values.vehicle,
        recommendationReason: values.reason,
        recommendationAction: values.action || 'View route'
      };
      Object.entries(fields).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
      });

      const capacity = document.getElementById('recommendationCapacity');
      if (capacity) {
        capacity.classList.remove('high', 'medium', 'low', 'neutral');
        capacity.classList.add(values.capacityTone || 'neutral');
      }

      const bottomSummary = document.getElementById('bottomToggleSummary');
      if (bottomSummary) bottomSummary.textContent = `${values.title || 'Shuttle update'}${values.eta && values.eta !== '—' ? ` · ${values.eta}` : ''}`;
    },

    update(fromSelection = false) {
      const shuttles = Object.values(App.runtimeShuttles || {}).filter((shuttle) => shuttle.status === 'active' && shuttle.capacity !== 'out_of_service');
      const plan = this.buildPlan();
      this.currentPlan = plan;
      const pickupId = this.pickupStopId();
      const pickupStop = App.stopById(pickupId);
      const candidates = this.destinationId
        ? shuttles.filter((shuttle) => this.canServe(shuttle, plan))
        : shuttles.filter((shuttle) => this.servesStop(shuttle, pickupId));
      const card = document.getElementById('recommendationCard');
      if (!card) return;

      if (this.destinationId && plan && !plan.legs.length) {
        this.currentShuttleId = null;
        this.setCard({
          eyebrow: 'YOU ARE THERE',
          title: `You are already at ${App.stopById(this.destinationId)?.short || 'your destination'}`,
          current: pickupStop?.short || 'Pickup stop',
          next: 'No shuttle needed', eta: '0 min', capacity: 'Not needed', capacityTone: 'neutral',
          vehicle: 'Walking is the quickest option', reason: 'Pickup and destination are the same stop', action: 'Choose another stop'
        });
        return;
      }

      if (!candidates.length) {
        this.currentShuttleId = null;
        this.setCard({
          eyebrow: this.destinationId ? 'NO MATCH RIGHT NOW' : 'NEXT INCOMING',
          title: this.destinationId ? 'No matching shuttle is active right now' : `No shuttle is approaching ${pickupStop?.short || 'your pickup stop'}`,
          current: pickupStop?.short || 'Pickup stop',
          next: this.destinationId ? 'Check service alerts' : 'Zoom out to explore', eta: '—', capacity: 'Unavailable', capacityTone: 'neutral',
          vehicle: this.destinationId ? 'Try another route shortly' : 'Select a destination for tailored results',
          reason: this.destinationId ? 'Try another route or check again shortly' : 'The map will not move automatically',
          action: this.destinationId ? 'Choose destination' : 'Choose destination'
        });
        return;
      }

      const best = candidates.slice().sort((a, b) => {
        if (!this.destinationId) {
          const capacityA = a.capacity === 'full' ? 6 : a.capacity === 'standing' ? 1.3 : 0;
          const capacityB = b.capacity === 'full' ? 6 : b.capacity === 'standing' ? 1.3 : 0;
          return (this.waitDistanceToStop(a, pickupId) + capacityA) - (this.waitDistanceToStop(b, pickupId) + capacityB);
        }
        return this.score(a, plan) - this.score(b, plan);
      })[0];

      this.currentShuttleId = best.id;
      const context = App.getTripContext(best.routeId, best.direction, best.progress || 0);
      const firstLeg = this.firstLeg(plan);
      const boardingStop = App.stopById(firstLeg?.stopIds?.[0] || pickupId);
      const waitDistance = this.destinationId ? this.waitDistanceKm(best, firstLeg) : this.waitDistanceToStop(best, pickupId);
      const etaValue = Math.max(1, Math.round((waitDistance / Math.max(best.speed || 18, 8)) * 60 * 1.2));
      const capacity = this.capacityPresentation(best.capacity);
      const nearStop = App.stopById(best.atStopId || best.currentStopId) || context?.currentStop || context?.nextStop;
      const isDirect = !plan?.transfers?.length;

      if (!this.destinationId) {
        this.setCard({
          eyebrow: 'NEXT INCOMING',
          title: App.directionLabel(best.routeId, best.direction),
          current: nearStop?.short || 'Between stops',
          next: boardingStop?.short || 'Nearest pickup stop',
          eta: `${etaValue} min`,
          capacity: capacity.label,
          capacityTone: capacity.tone,
          vehicle: `Vehicle: Shuttle ${best.number} · Select a destination for a tailored trip`,
          reason: `Next active shuttle reaching ${boardingStop?.short || 'your nearest stop'}`,
          action: 'View shuttle'
        });
      } else {
        const reason = `${isDirect ? 'Fastest direct route' : `Best connection via ${App.stopById(plan.transfers[0])?.short || 'transfer stop'}`} • ${capacity.label}`;
        this.setCard({
          eyebrow: 'BEST SHUTTLE',
          title: App.directionLabel(best.routeId, best.direction),
          current: nearStop?.short || 'Between stops',
          next: context?.nextStop?.short || context?.destination?.short || 'Destination',
          eta: `${etaValue} min`,
          capacity: capacity.label,
          capacityTone: capacity.tone,
          vehicle: `Vehicle: Shuttle ${best.number}${boardingStop ? ` · Board at ${boardingStop.short}` : ''}`,
          reason,
          action: 'View route'
        });
      }

      card.style.setProperty('--route-color', App.routeById(best.routeId)?.color || '#0b956a');
      App.location?.updateNearbyState?.();

      if (fromSelection && this.destinationId) {
        document.querySelectorAll('[data-route-filter]').forEach((chip) => {
          const selected = chip.dataset.routeFilter === best.routeId;
          chip.classList.toggle('active', selected);
          chip.setAttribute('aria-pressed', selected ? 'true' : 'false');
        });
        App.shuttleManager.filter = best.routeId;
        App.stopManager?.setRouteFilter(best.routeId);
        App.routeRenderer?.showRoute(best.routeId, true);
      }
    }
  };
})();
