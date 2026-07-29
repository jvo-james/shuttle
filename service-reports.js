(function () {
  'use strict';
  const App = window.ShuttleApp;

  const options = [
    { value: 'Full shuttle', detail: 'Capacity shown on the map is incorrect', color: '#e25555' },
    { value: 'Shuttle delayed', detail: 'The shuttle has not moved for a while', color: '#e69b24' },
    { value: 'Wrong direction', detail: 'The displayed destination looks incorrect', color: '#8a62d6' },
    { value: 'Unsafe driving', detail: 'Report a safety concern to operations', color: '#d64747' }
  ];

  App.reports = {
    init() {
      const holder = document.getElementById('reportOptions');
      if (holder) holder.innerHTML = options.map((option, index) => `<label class="report-option"><input type="radio" name="reportType" value="${App.escapeHTML(option.value)}" ${index === 0 ? 'checked' : ''}/><i style="--status-color:${option.color}"></i><span><strong>${App.escapeHTML(option.value)}</strong><small>${App.escapeHTML(option.detail)}</small></span></label>`).join('');
      document.getElementById('reportForm')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const shuttleId = document.getElementById('reportShuttleId').value;
        const type = new FormData(event.currentTarget).get('reportType');
        App.data.addReport({ shuttleId, type, status: 'new' });
        App.setOverlay(document.getElementById('reportModal'), false);
        App.toast('Report submitted', 'Operations will review your report.', 'success');
      });
      document.addEventListener('click', (event) => {
        const wait = event.target.closest('[data-wait-stop]');
        if (!wait) return;
        const stopId = wait.dataset.waitStop;
        const sessionId = sessionStorage.getItem('waitingSessionId') || (crypto.randomUUID?.() || `w-${Date.now()}`);
        sessionStorage.setItem('waitingSessionId', sessionId);
        App.data.setWaiting(stopId, { sessionId, expiresAt: Date.now() + 30 * 60 * 1000 });
        wait.textContent = 'You’re counted';
        wait.disabled = true;
        App.stopManager?.refreshCrowds();
        App.toast('Waiting count updated', 'Your anonymous count expires in 30 minutes.', 'success');
      });
    },
    open(shuttleId) {
      document.getElementById('reportShuttleId').value = shuttleId || '';
      App.setOverlay(document.getElementById('reportModal'), true);
    }
  };
})();
