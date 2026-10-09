# Wellspring University — Interactive Campus Web Map

A client-side interactive campus navigation map, building directory, and live GPS field surveyor for **Wellspring University** (Benin City, Edo State, Nigeria).

---

## 🚀 Key Features

* **Dynamic Map Canvas**: Powered by Leaflet.js with dynamic layer toggling (**OpenStreetMap Street**, **Esri Satellite**, **CartoDB Dark Mode**).
* **Live GPS Field Surveyor**: Walk on campus with your phone to capture building entrance coordinates and boundary corners directly to `localStorage`, with one-click `data.js` download.
* **Instant Search & Category Filtering**: Real-time search across names, building codes, and facility tags, synchronized with map pins and the directory drawer.
* **Walking Directions & Distance**: Haversine distance calculator and walking time estimator with animated polyline routing.
* **Mobile-First Responsive Layout**: Full-screen map viewport on mobile with smooth slide-in directory and building detail drawers.

---

## 📁 Project Structure

```
Wellspring Map/
├── index.html              # Main application shell
├── .gitignore              # Git ignore rules
├── css/
│   ├── style.css           # Global tokens, reset, and layout grid
│   └── components.css      # Marker pins, popups, drawer, search, surveyor HUD
└── js/
    ├── data.js             # Campus POI dataset & coordinates configuration
    ├── map.js              # Leaflet initialization, layers, and markers
    ├── search.js           # Instant search and category filter chips
    ├── navigation.js       # Geolocation, Haversine distance & walking HUD
    ├── surveyor.js         # Mobile GPS landmark capture & perimeter logger
    └── app.js              # Main application orchestrator & events
```

---

## 🏃‍♂️ Quick Start (Local Run)

You can open `index.html` directly in any web browser, or run a local web server:

```bash
# Using Python
python3 -m http.server 8000
```
Then visit `http://localhost:8000`.

---

## 🚶‍♂️ How to Map Buildings on Campus

1. Open the app on your mobile phone via your deployed Vercel link or local tunnel.
2. Tap the purple **`[+]`** button and select **"Launch Live GPS Field Surveyor"** (or add `#survey` to the URL).
3. Walk to any building entrance and tap **"Capture Building Here"**.
4. Walk to the perimeter fence corners and tap **"Log Boundary Corner"**.
5. When finished, tap **"Export data.js"** to download the updated dataset file.
