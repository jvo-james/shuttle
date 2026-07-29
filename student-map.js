(function () {
  'use strict';
  const App = window.ShuttleApp;

  function renderRouteChips() {
    const holder = document.getElementById('routeChips');
    if (!holder) return;
    const routes = [{ id: 'all', chip: 'All' }, ...App.routes];
    holder.innerHTML = routes.map((route, index) => `<button class="route-chip ${index === 0 ? 'active' : ''}" data-route-filter="${route.id}" aria-pressed="${index === 0 ? 'true' : 'false'}">${App.escapeHTML(route.chip)}</button>`).join('');
    holder.addEventListener('click', (event) => {
      const button = event.target.closest('[data-route-filter]');
      if (!button) return;
      holder.querySelectorAll('.route-chip').forEach((chip) => {
        const selected = chip === button;
        chip.classList.toggle('active', selected);
        chip.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });
      App.shuttleManager?.setFilter(button.dataset.routeFilter);
    });
  }

  function renderAlerts(state) {
    const alerts = (state.alerts || []).filter((alert) => alert.active);
    const latest = alerts[0];
    const badge = document.getElementById('alertBadge');
    const banner = document.getElementById('serviceBanner');
    if (badge) { badge.textContent = String(alerts.length); badge.hidden = !alerts.length; }
    const showBanner = Boolean(latest && latest.severity && latest.severity !== 'info');
    if (banner) banner.hidden = !showBanner;
    document.body.classList.toggle('has-service-banner', showBanner);
    if (showBanner) {
      document.getElementById('bannerTitle').textContent = latest.headline;
      document.getElementById('bannerText').textContent = latest.details;
    }
    const list = document.getElementById('alertsList');
    if (list) list.innerHTML = alerts.length
      ? alerts.map((alert) => `<article class="alert-item"><span class="alert-severity ${App.escapeHTML(alert.severity || 'info')}">!</span><div><strong>${App.escapeHTML(alert.headline)}</strong><p>${App.escapeHTML(alert.details)}</p><time>${App.formatRelative(alert.createdAt)}</time></div></article>`).join('')
      : '<div class="empty-state">No active service alerts.</div>';
  }

  function setupUI(map) {
    renderRouteChips();
    App.reports.init();
    App.recommendations.init();
    App.registerPWA();

    const topToggle = document.getElementById('topPanelToggle');
    const bottomToggle = document.getElementById('bottomPanelToggle');
    const setTopCollapsed = (collapsed) => {
      document.body.classList.toggle('top-ui-collapsed', collapsed);
      topToggle?.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      topToggle?.setAttribute('aria-label', collapsed ? 'Expand trip planner and route filters' : 'Collapse trip planner and route filters');
      const label = topToggle?.querySelector('.panel-toggle-label');
      if (label) label.textContent = collapsed ? 'Plan trip & filters' : 'Hide trip planner';
    };
    const setBottomCollapsed = (collapsed) => {
      document.body.classList.toggle('bottom-ui-collapsed', collapsed);
      bottomToggle?.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      bottomToggle?.setAttribute('aria-label', collapsed ? 'Expand shuttle recommendation' : 'Collapse shuttle recommendation');
    };
    topToggle?.addEventListener('click', () => setTopCollapsed(!document.body.classList.contains('top-ui-collapsed')));
    bottomToggle?.addEventListener('click', () => setBottomCollapsed(!document.body.classList.contains('bottom-ui-collapsed')));

    const stopToggle = document.getElementById('stopToggleButton');
    const landmarkToggle = document.getElementById('landmarkToggleButton');
    const setStopsVisible = (visible) => {
      App.stopManager?.setVisible(visible);
      stopToggle?.classList.toggle('active', visible);
      document.querySelector('[data-map-action="stops"]')?.classList.toggle('active', visible);
      App.toast(visible ? 'Campus stops shown' : 'Campus stops hidden', visible ? 'Tap a stop to see live arrivals.' : 'Only shuttle vehicles remain visible.', 'success', 1600);
    };

    document.getElementById('recenterButton')?.addEventListener('click', () => App.location.recenter());
    document.getElementById('fitCampusButton')?.addEventListener('click', () => {
      App.shuttleManager.selectedId = null;
      App.routeRenderer.clear();
      document.querySelectorAll('[data-route-filter]').forEach((chip) => {
        const selected = chip.dataset.routeFilter === 'all';
        chip.classList.toggle('active', selected);
        chip.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });
      App.shuttleManager.filter = 'all';
      App.stopManager.setRouteFilter('all');
      App.fitCampus(map);
    });
    stopToggle?.addEventListener('click', () => setStopsVisible(!App.stopManager.visible));
    landmarkToggle?.addEventListener('click', () => {
      const visible = App.landmarkManager?.setVisible(!App.landmarkManager.visible);
      App.toast(visible ? 'Campus landmarks shown' : 'Campus landmarks hidden', visible ? 'Only the selected KNUST landmarks are labelled.' : 'Tap again to restore landmark labels.', 'success', 1600);
    });
    document.getElementById('alertsButton')?.addEventListener('click', () => App.setOverlay(document.getElementById('alertsDrawer'), true));
    document.getElementById('dismissBanner')?.addEventListener('click', () => {
      const banner = document.getElementById('serviceBanner');
      if (banner) banner.hidden = true;
      document.body.classList.remove('has-service-banner');
    });

    document.querySelector('.mobile-map-dock')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-map-action]');
      if (!button) return;
      if (button.dataset.mapAction === 'nearby') document.getElementById('recommendationAction')?.click();
      if (button.dataset.mapAction === 'stops') setStopsVisible(!App.stopManager.visible);
      if (button.dataset.mapAction === 'report') {
        if (App.recommendations.currentShuttleId) App.reports.open(App.recommendations.currentShuttleId);
        else App.toast('No shuttle selected', 'Select a shuttle before submitting a report.', 'warning');
      }
    });

    map.on('click', () => App.closeSheet());
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const loader = document.getElementById('appLoader');
    try {
      const initialCoordinate = App.location?.initialCoordinate?.() || App.config.demoUserLocation;
      const map = await App.createMap('map', {
        center: initialCoordinate,
        zoom: App.config.initialUserZoom,
        minZoom: 9,
        maxZoom: 20
      });
      App.map = map;
      App.addAttribution(map);
      App.landmarkManager.init(map);
      App.stopManager.init(map);
      App.shuttleManager.init(map);
      setupUI(map);
      App.location.init(map);
      App.data.subscribe(renderAlerts);
      setTimeout(() => document.body.classList.add('app-ready'), 180);
      setTimeout(() => loader?.classList.add('hidden'), 650);
      setTimeout(() => App.recommendations.update(), 800);
      App.hydrateRoutePaths().then((updated) => {
        if (updated) App.recommendations.update(false);
      });
    } catch (error) {
      loader?.classList.add('hidden');
      App.renderMapFallback('map', error?.message || 'The light campus map could not load.');
    }
  });
})();
