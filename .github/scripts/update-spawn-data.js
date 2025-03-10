const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Lista źródeł do pobrania
const sources = [
  {
    url: 'https://pokemonrevolution.net/spawns/land_spawns.json',
    filename: 'land_spawns.json'
  },
  {
    url: 'https://pokemonrevolution.net/spawns/surf_spawns.json',
    filename: 'surf_spawns.json'
  }
];

// Upewnij się, że katalog data istnieje
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Funkcja pobierająca dane z jednego źródła
async function fetchSource(source) {
  try {
    console.log(`Pobieranie danych z ${source.url}...`);
    const response = await axios.get(source.url);
    
    const filePath = path.join(dataDir, source.filename);
    fs.writeFileSync(filePath, JSON.stringify(response.data, null, 2));
    
    console.log(`Zapisano dane do ${source.filename}`);
    return true;
  } catch (error) {
    console.error(`Błąd pobierania danych z ${source.url}:`, error.message);
    return false;
  }
}

// Główna funkcja pobierająca wszystkie dane
async function fetchAllData() {
  console.log('Rozpoczęcie aktualizacji danych...');
  
  const results = await Promise.all(sources.map(fetchSource));
  
  if (results.every(Boolean)) {
    console.log('Wszystkie dane zostały pomyślnie zaktualizowane');
  } else {
    console.warn('Niektóre źródła danych nie zostały zaktualizowane');
    // Nie kończymy procesu błędem, aby GitHub Action mógł kontynuować
  }
}

fetchAllData();
