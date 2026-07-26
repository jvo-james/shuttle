# ShuttlePulse — KNUST Shuttle Tracker

A responsive, map-first campus shuttle tracker built with HTML, CSS, vanilla JavaScript, Google Maps JavaScript API and optional Firebase Realtime Database.

## Main experience

- Opens directly on a full-screen Google Map
- Bolt-inspired, low-clutter visual styling
- Bright blue user-location pulse, heading cone and GPS accuracy halo
- Original top-view shuttle SVG markers based on the supplied visual direction
- Smooth `requestAnimationFrame` shuttle movement and direction rotation
- Five capacity states: Empty, Seats available, Standing room only, Full and Out of service
- Clickable shuttle cards with route, capacity, speed, ETA and update age
- KNUST stop markers, live crowd estimates and “I’m waiting here” reporting
- Route filtering and thick rounded route polylines
- Student reports, recommendations and service alerts
- Driver GPS sharing with a campus-route simulator fallback
- Admin fleet map, crowd estimates and alert publishing
- Cross-tab demo updates and optional Firebase synchronization
- Responsive layouts and installable PWA shell

## 1. Add Google Maps

Google Maps requires your own browser API key. The app never substitutes a hand-drawn map.

You have two setup choices.

### Easy setup in the app

Run the project, open any map page, and enter your Google Maps key in the setup card. It is saved only in that browser’s Local Storage.

### Permanent setup in the source

Open `js/firebase-config.js` and replace:

```js
App.googleMapsConfig = window.SHUTTLE_GOOGLE_MAPS_CONFIG || {
  apiKey: 'YOUR_GOOGLE_MAPS_API_KEY',
  mapId: ''
};
```

Enable the **Maps JavaScript API**, attach a billing account, and restrict the browser key to your localhost and production domains.

The optional `mapId` is for Google Cloud-based map styling. When it is left blank, the project applies the included Bolt-inspired JSON style: pale land, white roads, subtle buildings, muted labels and hidden generic POIs.

Official setup guide: https://developers.google.com/maps/documentation/javascript/get-api-key

Cloud styling guide: https://developers.google.com/maps/documentation/javascript/cloud-customization

## 2. Run the project

Geolocation and service workers require HTTPS or localhost. Do not open the files directly with `file://`.

```bash
cd shuttle-tracker
python -m http.server 8080
```

Open `http://localhost:8080`.

## Demo logins

- Driver: `driver@knust.edu.gh` / `demo123`
- Admin: `admin@knust.edu.gh` / `admin123`

Open the student, driver and admin pages in separate tabs. Start a driver trip or change capacity to see updates appear across the tabs.

## Connect Firebase for separate phones

The app works locally with Local Storage and `BroadcastChannel`. For real-time synchronization between separate devices, set the Firebase web configuration before `js/firebase-config.js` loads:

```html
<script>
window.SHUTTLE_FIREBASE_CONFIG = {
  apiKey: 'YOUR_FIREBASE_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  databaseURL: 'https://YOUR_PROJECT-default-rtdb.firebaseio.com',
  projectId: 'YOUR_PROJECT',
  appId: 'YOUR_APP_ID'
};
</script>
```

Add it to `index.html`, `driver.html` and `admin.html` above the `firebase-config.js` script. Replace the demo login and permissive prototype data model with Firebase Authentication and secure database rules before production.

## Production notes

- Verify all stop coordinates and official routes with KNUST Transport.
- Google Maps map tiles require an internet connection even when the PWA shell is cached.
- Browser geolocation requires user permission and works best over HTTPS.
- Restrict both Google and Firebase keys to the services and domains they need.
- Never publish student names, IDs or individual positions in crowd reports.
- The supplied top-view shuttle SVG is an original project asset. The watermarked Shutterstock preview is not bundled.
