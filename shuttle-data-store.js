(function () {
  'use strict';
  const App = window.ShuttleApp;
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('shuttle-pulse-live-v3') : null;
  const listeners = new Set();

  const makeDefaultState = () => ({
    version: 3,
    shuttles: {
      'SH-01': { id: 'SH-01', number: '01', routeId: 'COMM_KSB', direction: 'forward', capacity: 'available', status: 'active', speed: 19, source: 'demo', offset: 0.08, durationSeconds: 220, updatedAt: Date.now() },
      'SH-03': { id: 'SH-03', number: '03', routeId: 'COMM_KSB', direction: 'return', capacity: 'empty', status: 'active', speed: 18, source: 'demo', offset: 0.54, durationSeconds: 235, updatedAt: Date.now() },
      'SH-04': { id: 'SH-04', number: '04', routeId: 'BRUNEI_KSB', direction: 'forward', capacity: 'standing', status: 'active', speed: 16, source: 'demo', offset: 0.76, durationSeconds: 245, updatedAt: Date.now() },
      'SH-07': { id: 'SH-07', number: '07', routeId: 'COMM_MED', direction: 'forward', capacity: 'available', status: 'active', speed: 20, source: 'demo', offset: 0.23, durationSeconds: 270, updatedAt: Date.now() },
      'SH-08': { id: 'SH-08', number: '08', routeId: 'KSB_MED', direction: 'return', capacity: 'available', status: 'active', speed: 22, source: 'demo', offset: 0.62, durationSeconds: 240, updatedAt: Date.now() },
      'SH-11': { id: 'SH-11', number: '11', routeId: 'BRUNEI_KSB', direction: 'return', capacity: 'full', status: 'active', speed: 17, source: 'demo', offset: 0.19, durationSeconds: 255, updatedAt: Date.now() }
    },
    waiting: {},
    reports: [],
    alerts: [{
      id: 'welcome-alert',
      type: 'Service update',
      headline: 'Campus shuttle service is active',
      details: 'Live demo shuttles are moving on the four main destination routes.',
      severity: 'info',
      createdAt: Date.now() - 1000 * 60 * 7,
      active: true
    }]
  });

  const normalizeShuttle = (shuttle = {}) => ({
    ...shuttle,
    routeId: App.normalizeRouteId(shuttle.routeId || 'COMM_KSB'),
    direction: App.normalizeDirectionId(shuttle.direction || 'forward')
  });

  const normalize = (value) => {
    const fallback = makeDefaultState();
    if (!value || !value.shuttles) return fallback;
    const shuttles = { ...fallback.shuttles };
    Object.entries(value.shuttles || {}).forEach(([id, shuttle]) => { shuttles[id] = normalizeShuttle({ ...shuttles[id], ...shuttle, id }); });
    return {
      ...fallback,
      ...value,
      version: 3,
      shuttles,
      waiting: value.waiting || {},
      reports: value.reports || [],
      alerts: value.alerts || fallback.alerts
    };
  };

  const read = () => {
    try { return normalize(JSON.parse(localStorage.getItem(App.config.storageKey))); }
    catch (_) { return makeDefaultState(); }
  };

  let state = read();
  localStorage.setItem(App.config.storageKey, JSON.stringify(state));

  const notify = () => listeners.forEach((listener) => listener(structuredClone(state)));
  const write = (next, broadcast = true) => {
    state = normalize(next);
    localStorage.setItem(App.config.storageKey, JSON.stringify(state));
    if (broadcast) channel?.postMessage({ type: 'state', state });
    notify();
  };

  window.addEventListener('storage', (event) => {
    if (event.key !== App.config.storageKey || !event.newValue) return;
    try { state = normalize(JSON.parse(event.newValue)); notify(); } catch (_) {}
  });

  channel?.addEventListener('message', (event) => {
    if (event.data?.type !== 'state') return;
    state = normalize(event.data.state);
    localStorage.setItem(App.config.storageKey, JSON.stringify(state));
    notify();
  });

  App.data = {
    getState: () => structuredClone(state),
    subscribe(listener) {
      listeners.add(listener);
      listener(structuredClone(state));
      return () => listeners.delete(listener);
    },
    update(mutator) {
      const draft = structuredClone(state);
      mutator(draft);
      write(draft);
    },
    patchShuttle(id, patch) {
      this.update((draft) => {
        draft.shuttles[id] = normalizeShuttle({
          ...(draft.shuttles[id] || { id, number: id.replace(/\D/g, '').slice(-2) || id }),
          ...patch,
          updatedAt: Date.now()
        });
      });
    },
    addReport(report) {
      this.update((draft) => {
        draft.reports.unshift({ id: crypto.randomUUID?.() || `r-${Date.now()}`, createdAt: Date.now(), ...report });
        draft.reports = draft.reports.slice(0, 100);
      });
    },
    setWaiting(stopId, session) {
      this.update((draft) => {
        draft.waiting[stopId] = (draft.waiting[stopId] || []).filter((item) => item.expiresAt > Date.now() && item.sessionId !== session.sessionId);
        draft.waiting[stopId].push(session);
      });
    },
    removeWaiting(stopId, sessionId) {
      this.update((draft) => { draft.waiting[stopId] = (draft.waiting[stopId] || []).filter((item) => item.sessionId !== sessionId); });
    },
    addAlert(alert) {
      this.update((draft) => {
        draft.alerts.unshift({ id: crypto.randomUUID?.() || `a-${Date.now()}`, createdAt: Date.now(), active: true, ...alert });
        draft.alerts = draft.alerts.slice(0, 30);
      });
    },
    resetDemo() { write(makeDefaultState()); }
  };
})();
