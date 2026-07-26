(function () {
  'use strict';

  const App = window.ShuttleApp;

  // Google Maps JavaScript API configuration. You can paste your browser-restricted
  // key here, or enter it once in the in-app setup card. Map ID is optional; leave
  // it blank to use the included Bolt-inspired local map style.
  App.googleMapsConfig = window.SHUTTLE_GOOGLE_MAPS_CONFIG || {
    apiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
    mapId: ''
  };

  const config = App.config;
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel('shuttle-pulse-live') : null;
  const listeners = new Set();

  const defaultState = () => ({
    version: 1,
    shuttles: {
      'SH-01': { id: 'SH-01', number: '01', routeId: 'green-loop', capacity: 'available', status: 'active', speed: 21, source: 'demo', offset: 0.08, updatedAt: Date.now() },
      'SH-03': { id: 'SH-03', number: '03', routeId: 'blue-link', capacity: 'empty', status: 'active', speed: 18, source: 'demo', offset: 0.44, updatedAt: Date.now() },
      'SH-04': { id: 'SH-04', number: '04', routeId: 'gold-line', capacity: 'standing', status: 'active', speed: 16, source: 'demo', offset: 0.72, updatedAt: Date.now() },
      'SH-07': { id: 'SH-07', number: '07', routeId: 'green-loop', capacity: 'full', status: 'active', speed: 19, source: 'demo', offset: 0.58, updatedAt: Date.now() },
      'SH-08': { id: 'SH-08', number: '08', routeId: 'blue-link', capacity: 'available', status: 'active', speed: 23, source: 'demo', offset: 0.15, updatedAt: Date.now() },
      'SH-11': { id: 'SH-11', number: '11', routeId: 'gold-line', capacity: 'available', status: 'active', speed: 17, source: 'demo', offset: 0.31, updatedAt: Date.now() }
    },
    waiting: {},
    reports: [],
    alerts: [{
      id: 'welcome-alert', type: 'Service update', headline: 'Morning service is active',
      details: 'Live demo shuttles are moving around campus. Driver updates appear instantly across tabs.',
      severity: 'info', createdAt: Date.now() - 1000 * 60 * 7, active: true
    }]
  });

  const normalize = (state) => ({ ...defaultState(), ...state, shuttles: { ...defaultState().shuttles, ...(state?.shuttles || {}) } });

  const readLocal = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(config.storageKey));
      return saved ? normalize(saved) : defaultState();
    } catch (_) {
      return defaultState();
    }
  };

  let state = readLocal();
  localStorage.setItem(config.storageKey, JSON.stringify(state));

  const notify = () => listeners.forEach((listener) => listener(structuredClone(state)));
  const writeLocal = (next, broadcast = true) => {
    state = normalize(next);
    localStorage.setItem(config.storageKey, JSON.stringify(state));
    if (broadcast) channel?.postMessage({ type: 'state', state });
    notify();
    App.firebaseBridge?.mirrorState?.(state);
  };

  window.addEventListener('storage', (event) => {
    if (event.key !== config.storageKey || !event.newValue) return;
    try { state = normalize(JSON.parse(event.newValue)); notify(); } catch (_) {}
  });
  channel?.addEventListener('message', (event) => {
    if (event.data?.type !== 'state') return;
    state = normalize(event.data.state);
    localStorage.setItem(config.storageKey, JSON.stringify(state));
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
      writeLocal(draft);
    },
    patchShuttle(id, patch) {
      this.update((draft) => {
        draft.shuttles[id] = { ...(draft.shuttles[id] || { id, number: id.replace(/\D/g, '').slice(-2) || id }), ...patch, updatedAt: Date.now() };
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
        draft.waiting[stopId] = draft.waiting[stopId] || [];
        draft.waiting[stopId] = draft.waiting[stopId].filter((item) => item.expiresAt > Date.now() && item.sessionId !== session.sessionId);
        draft.waiting[stopId].push(session);
      });
    },
    removeWaiting(stopId, sessionId) {
      this.update((draft) => {
        draft.waiting[stopId] = (draft.waiting[stopId] || []).filter((item) => item.sessionId !== sessionId);
      });
    },
    addAlert(alert) {
      this.update((draft) => {
        draft.alerts.unshift({ id: crypto.randomUUID?.() || `a-${Date.now()}`, createdAt: Date.now(), active: true, ...alert });
        draft.alerts = draft.alerts.slice(0, 20);
      });
    },
    resetDemo() { writeLocal(defaultState()); }
  };

  // Optional production bridge. Paste your Firebase web config into window.SHUTTLE_FIREBASE_CONFIG
  // before this file loads. The app remains fully functional in local demo mode without it.
  const firebaseConfig = window.SHUTTLE_FIREBASE_CONFIG || {
    apiKey: '', authDomain: '', databaseURL: '', projectId: '', appId: ''
  };

  App.firebaseBridge = {
    configured: Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL),
    connected: false,
    mirrorState: null
  };

  if (App.firebaseBridge.configured) {
    Promise.all([
      import('https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js')
    ]).then(([appModule, dbModule]) => {
      const firebaseApp = appModule.initializeApp(firebaseConfig);
      const db = dbModule.getDatabase(firebaseApp);
      const stateRef = dbModule.ref(db, 'shuttlePulse/state');
      let receiving = false;
      dbModule.onValue(stateRef, (snapshot) => {
        const remote = snapshot.val();
        if (!remote) {
          dbModule.set(stateRef, state);
          return;
        }
        receiving = true;
        writeLocal(remote, false);
        receiving = false;
        App.firebaseBridge.connected = true;
      });
      App.firebaseBridge.mirrorState = (next) => {
        if (!receiving) dbModule.set(stateRef, next).catch(() => {});
      };
    }).catch((error) => console.warn('Firebase bridge unavailable; using demo mode.', error));
  }
})();
