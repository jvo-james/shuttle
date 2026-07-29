/*
 * Google Maps setup
 * -----------------
 * 1. Create a browser-restricted Google Maps Platform API key.
 * 2. Enable Maps JavaScript API and Routes API for the same project.
 * 3. Paste the key below before deployment.
 *
 * The app uses Google Maps when a valid key is present. During local review,
 * it falls back to the existing light MapLibre map so the prototype remains usable.
 */
window.SHUTTLE_MAPS_CONFIG = Object.freeze({
  provider: 'google',
  googleMapsApiKey: '',
  googleMapsVersion: 'weekly',
  routeCacheHours: 168
});
