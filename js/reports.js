(function () {
  'use strict';
  const App = window.ShuttleApp;
  const reportValues = [
    ['empty', 'Plenty of room inside'],
    ['available', 'Seats are currently available'],
    ['standing', 'Only standing room remains'],
    ['full', 'The shuttle cannot take more passengers'],
    ['passed_without_stopping', 'It passed the stop without boarding'],
    ['out_of_service', 'The shuttle is not operating']
  ];

  App.reports = {
    init() {
      const options = document.getElementById('reportOptions');
      if (options) {
        options.innerHTML = reportValues.map(([value, description], index) => {
          const status = App.capacityStates[value] || { label: value.replaceAll('_', ' '), color: '#7c8884' };
          return `<label class="report-option" style="--status-color:${status.color}"><input type="radio" name="condition" value="${value}" ${index === 1 ? 'checked' : ''} /><i></i><span><strong>${App.escapeHTML(status.label)}</strong><small>${App.escapeHTML(description)}</small></span></label>`;
        }).join('');
      }
      document.getElementById('reportForm')?.addEventListener('submit', (event) => this.submit(event));
      document.addEventListener('click', (event) => {
        const reportButton = event.target.closest('[data-report-shuttle]');
        if (reportButton) this.open(reportButton.dataset.reportShuttle);
        const waitingButton = event.target.closest('[data-wait-stop]');
        if (waitingButton) this.waitAtStop(waitingButton.dataset.waitStop, waitingButton);
      });
    },
    open(shuttleId) {
      document.getElementById('reportShuttleId').value = shuttleId;
      const shuttle = App.runtimeShuttles[shuttleId] || App.data.getState().shuttles[shuttleId];
      document.getElementById('reportTitle').textContent = `What are you seeing on Shuttle ${shuttle?.number || ''}?`;
      App.openModal('reportModal');
    },
    submit(event) {
      event.preventDefault();
      const shuttleId = document.getElementById('reportShuttleId').value;
      const value = new FormData(event.currentTarget).get('condition');
      const shuttle = App.runtimeShuttles[shuttleId];
      const distance = App.distanceKm(App.userLocation, shuttle?.coord);
      const proximityScore = distance < 0.05 ? 4 : distance < 0.15 ? 2 : 0;
      App.data.addReport({ shuttleId, value, proximityScore, coord: App.userLocation || null });
      App.closeModal('reportModal');
      App.toast('Report received', proximityScore ? 'Your nearby report has a higher confidence weight.' : 'It will be combined with other recent reports.', 'success');
      App.shuttleManager?.open(shuttleId);
    },
    waitAtStop(stopId, button) {
      const stop = App.stopById(stopId);
      const distance = App.distanceKm(App.userLocation, stop?.coord);
      const existingSession = sessionStorage.getItem(`waiting:${stopId}`);
      if (existingSession) {
        App.data.removeWaiting(stopId, existingSession);
        sessionStorage.removeItem(`waiting:${stopId}`);
        button.textContent = 'I’m waiting here';
        App.toast('Waiting status removed', `You are no longer counted at ${stop.name}.`, 'success');
      } else {
        const sessionId = crypto.randomUUID?.() || `wait-${Date.now()}`;
        App.data.setWaiting(stopId, {
          sessionId,
          createdAt: Date.now(),
          expiresAt: Date.now() + 30 * 60 * 1000,
          verifiedNearStop: distance < 0.12
        });
        sessionStorage.setItem(`waiting:${stopId}`, sessionId);
        button.textContent = 'Stop waiting';
        App.toast('You are counted', `The anonymous crowd estimate for ${stop.name} has been updated.`, 'success');
      }
      App.stopManager?.refreshCrowds();
      setTimeout(() => App.stopManager?.open(stopId), 80);
    }
  };
})();
