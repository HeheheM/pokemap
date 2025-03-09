# Pokemon Revolution Map

Interactive map for Pokemon Revolution Online game, showing all locations and bosses with the ability to create your own routes.

![Pokemon Revolution Map](map.png)

## Description

This web application provides a detailed map of the Pokemon Revolution Online world, allowing players to:
- Browse all regions (Kanto, Johto, Hoenn, Sinnoh, etc.)
- Locate bosses and track their status (killed/available)
- Create and save your own routes
- Manage profiles with different settings
- Search for specific locations

## Features

### Map Browsing
- Zoom in/out and map panning
- Automatic centering on selected locations
- Filtering bosses by regions

### Route System
- Create your own routes between bosses
- Save and load routes
- Export and import routes in JSON format

### Boss Tracking System
- Mark bosses as killed
- Automatic tracking of boss cooldowns
- Weekly limits (20 kills per week)

### Profile System
- Ability to create multiple player profiles
- Each profile maintains its own:
  - Routes
  - Boss status
  - Camera position
  - Weekly kill limits

### Search
- Quick search for locations or bosses
- Search by name or region

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/HeheheM/pokemap.git
   ```

2. Open the project folder:
   ```
   cd pokemap
   ```

3. Use a local server:
   ```
   python -m http.server 8000
   ```

4. Visit the page in your browser at `http://localhost:8000`

## Project Files

- `index.html` - Main page structure
- `style.css` - CSS styles
- `script.js` - Main script handling the map
- `profile-manager.js` - Profile management system
- `i18n.js` - Internationalization (multi-language support)
- `locations.json` - Location data
- `bosses.json` - Boss data
- `language.json` - Interface translations
- `map.png` - World map image

## Contact

For questions or suggestions regarding the project, contact us through GitHub Issues or Discord(noriaki).

---

**Note:** This map is an unofficial tool and is not affiliated with the creators of Pokemon Revolution Online.
