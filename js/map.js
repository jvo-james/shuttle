(function () {
  'use strict';
  const App = window.ShuttleApp;

  function renderRouteChips() {
    const holder = document.getElementById('routeChips');
    if (!holder) return;
    const routes = [{ id: 'all', name: 'All shuttles' }, ...App.routes];
    holder.innerHTML = routes.map((route, index) => `<button class="route-chip ${index === 0 ? 'active' : ''}" data-route-filter="${route.id}">${App.escapeHTML(route.name)}</button>`).join('');
    holder.addEventListener('click', (event) => {
      const button = event.target.closest('[data-route-filter]');
      if (!button) return;
      holder.querySelectorAll('.route-chip').forEach((chip) => chip.classList.toggle('active', chip === button));
      App.shuttleManager.setFilter(button.dataset.routeFilter);
    });
  }

  function renderAlerts(state) {
    const alerts = (state.alerts || []).filter((alert) => alert.active);
    const latest = alerts[0];
    const badge = document.getElementById('alertBadge');
    if (badge) {
      badge.textContent = alerts.length;
      badge.style.display = alerts.length ? '' : 'none';
    }
    if (latest) {
      document.getElementById('bannerTitle').textContent = latest.headline;
      document.getElementById('bannerText').textContent = latest.details;
    }
    const list = document.getElementById('alertsList');
    if (list) list.innerHTML = alerts.length ? alerts.map((alert) => `
      <article class="alert-item"><span class="alert-item-icon"><img src="assets/icons/warning.svg" alt="" /></span><div><strong>${App.escapeHTML(alert.headline)}</strong><p>${App.escapeHTML(alert.details)}</p><time>${App.formatRelative(alert.createdAt)}</time></div></article>`).join('') : '<p>No active service alerts.</p>';
  }

  function setupUI(map) {
    renderRouteChips();
    App.reports.init();
    App.recommendations.init();
    App.registerPWA();
    document.getElementById('recenterButton')?.addEventListener('click', () => App.location.recenter());
    document.getElementById('fitCampusButton')?.addEventListener('click', () => App.fitCampus(map, 48));
    document.getElementById('alertsButton')?.addEventListener('click', () => App.setOverlay(document.getElementById('alertsDrawer'), true));
    document.getElementById('dismissBanner')?.addEventListener('click', () => document.getElementById('serviceBanner')?.remove());
    map.addListener('click', () => App.closeSheet());
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const loader = document.getElementById('appLoader');
    try {
      await App.loadGoogleMaps();
      const map = App.createGoogleMap('map', {
        center: App.config.campusCenter,
        zoom: App.config.defaultZoom,
        minZoom: 13.5,
        maxZoom: 20
      });
      App.map = map;
      App.stopManager.init(map);
      App.shuttleManager.init(map);
      App.location.init(map);
      setupUI(map);
      App.data.subscribe(renderAlerts);
      setTimeout(() => loader?.classList.add('hidden'), 450);
      setTimeout(() => App.recommendations.update(), 900);
    } catch (error) {
      loader?.classList.add('hidden');
      App.renderGoogleMapsSetup('map', error?.message || 'Google Maps could not load.');
    }
  });
})();
