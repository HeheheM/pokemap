let allPokemonData = [];
let pokemonIcons = [];
let uniquePokemonNames = new Set();
let currentPokemonName = null; // Track current Pokemon being displayed

async function initPokemonSearch() {
    console.log("Inicjalizacja funkcjonalności wyszukiwania Pokemonów...");
    
    try {
        // Załaduj dane Pokemonów
        await loadPokemonData();
        
        // Pobierz referencje do elementów HTML
        const searchInput = document.getElementById('pokemon-search');
        const resultsContainer = document.getElementById('pokemon-search-results');
        
        // Sprawdź czy elementy istnieją
        if (!searchInput || !resultsContainer) {
            console.error("Nie znaleziono elementów HTML dla wyszukiwarki Pokemonów");
            return;
        }
        
        // Ustaw nasłuchiwanie zdarzeń
        setupPokemonSearchEvents(searchInput, resultsContainer);
        
        // Zastosuj tłumaczenia
        if (window.i18n) {
            const title = document.querySelector('.pokemon-search-container h3');
            if (title) {
                title.textContent = window.i18n.t('pokesearch.pokemonTitle');
            }
            
            if (searchInput) {
                searchInput.placeholder = window.i18n.t('pokesearch.pokemonPlaceholder');
            }
            
            // Register for language changes
            window.i18n.onLanguageChange((newLang) => {
                console.log("Language changed to: " + newLang + ", updating Pokemon panel...");
                
                // If there's a Pokemon panel open, update its text
                if (currentPokemonName) {
                    const locationsPanel = document.querySelector('.pokemon-locations-panel');
                    if (locationsPanel) {
                        // Get the current Pokemon and refresh the panel
                        refreshPokemonPanel(currentPokemonName);
                    }
                }
            });
        }
        
        console.log("Inicjalizacja wyszukiwania Pokemonów zakończona pomyślnie.");
    } catch (error) {
        console.error("Błąd inicjalizacji wyszukiwania Pokemonów:", error);
    }
}

// Helper functions to create icons for Pokemon locations
function createDaytimeIconsHTML(daytimeArray) {
    if (!daytimeArray || daytimeArray.length !== 3) return '';
    
    let html = '';
    if (daytimeArray[0]) {
        html += `<img src="resources/morning.png" class="pokemon-location-icon" title="${window.i18n ? window.i18n.t('pokemon.morning') : 'Rano'}" alt="Morning">`;
    }
    if (daytimeArray[1]) {
        html += `<img src="resources/day.png" class="pokemon-location-icon" title="${window.i18n ? window.i18n.t('pokemon.day') : 'Dzień'}" alt="Day">`;
    }
    if (daytimeArray[2]) {
        html += `<img src="resources/night.png" class="pokemon-location-icon" title="${window.i18n ? window.i18n.t('pokemon.night') : 'Noc'}" alt="Night">`;
    }
    
    return html;
}

function createTierIconHTML(tier) {
    if (!tier) return '';
    return `<img src="resources/${tier.toLowerCase()}.png" class="pokemon-location-icon" title="${tier}" alt="${tier}" onerror="this.style.display='none'">`;
}

function createItemIconHTML(item) {
    if (!item) return '';
    return `<img src="resources/items/${item}.png" class="pokemon-location-icon pokemon-item-icon" title="${item}" alt="${item}" onerror="this.style.display='none'">`;
}

function createLocationIconsHTML(pokemonLocation) {
    let iconsHTML = '';
    
    // Add tier icon
    iconsHTML += createTierIconHTML(pokemonLocation.Tier);
    
    // Add item icon
    iconsHTML += createItemIconHTML(pokemonLocation.Item);
    
    // Add daytime icons
    iconsHTML += createDaytimeIconsHTML(pokemonLocation.Daytime);
    
    return iconsHTML;
}

// New function to refresh the Pokemon panel when language changes
function refreshPokemonPanel(pokemonName) {
    // Preserve currently displayed Pokemon
    currentPokemonName = pokemonName;
    
    // Get all locations for the current Pokemon
    const locations = allPokemonData.filter(entry => entry.Pokemon === pokemonName);
    
    if (locations.length === 0) {
        return;
    }
    
    // Get the existing panel
    const locationsPanel = document.querySelector('.pokemon-locations-panel');
    if (!locationsPanel) {
        return;
    }
    
    // Get the Pokemon image from first location
    const monsterID = locations[0].MonsterID;
    const pokemonImageSrc = `resources/pokemons/${monsterID}.png`;
    
    // Prepare locations with map availability info
    const locationsWithAvailability = locations.map(loc => {
        const mapLoc = findMapLocation(loc.Map);
        const isOnMap = mapLoc && mapLoc.map_pos;
        return {
            location: loc,
            isOnMap: isOnMap,
            mapLoc: mapLoc
        };
    });
    
    // Sort locations - available on map first
    locationsWithAvailability.sort((a, b) => {
        if (a.isOnMap && !b.isOnMap) return -1;
        if (!a.isOnMap && b.isOnMap) return 1;
        return a.location.Map.localeCompare(b.location.Map);
    });
    
    // Update the panel content with new language
    locationsPanel.innerHTML = `
        <div class="pokemon-locations-header">
            <h3>
                <img src="${pokemonImageSrc}" alt="${pokemonName}" onerror="this.src='resources/pokemons/default-poke.png'">
                ${pokemonName}
            </h3>
            <span class="close-locations-panel">&times;</span>
        </div>
        <div class="pokemon-locations-content">
            <p class="pokemon-locations-title">${window.i18n ? window.i18n.t("pokesearch.locationsTitle") : "Ten Pokemon występuje w tych lokalizacjach:"}</p>
            <ul class="pokemon-locations-list">
                ${locationsWithAvailability.map(item => {
                    return `<li data-location="${item.location.Map}" class="${item.isOnMap ? '' : 'not-on-map'}" title="${item.isOnMap ? window.i18n ? window.i18n.t("pokesearch.clickToCenter") : 'Kliknij aby wycentrować mapę' : window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Lokalizacja nie znajduje się na mapie'}">
                        <div class="pokemon-location-name">${item.location.Map}</div>
                        <div class="pokemon-location-icons">${createLocationIconsHTML(item.location)}</div>
                    </li>`;
                }).join('')}
            </ul>
        </div>
    `;
    
    // Add event listener to the close button
    locationsPanel.querySelector('.close-locations-panel').addEventListener('click', function() {
        locationsPanel.remove();
        currentPokemonName = null; // Clear current Pokemon when panel is closed
        clearOnlyPokemonIcons();
    });
    
    // Add event listeners to location items
    locationsPanel.querySelectorAll('.pokemon-locations-list li').forEach(item => {
        item.addEventListener('click', function() {
            const locationName = this.dataset.location;
            const locationInfo = locationsWithAvailability.find(l => l.location.Map === locationName);
            
            if (locationInfo && locationInfo.isOnMap) {
                centerMapOnLocation(locationInfo.mapLoc);
                // Don't clear other icons, just highlight this one with an animation
                highlightPokemonLocation(locationInfo.location, locationInfo.mapLoc);
            } else {
                alert(window.i18n ? window.i18n.t("pokesearch.locationNotFound") : "Lokalizacja nie została znaleziona na mapie");
            }
        });
    });
    
    // Enable mouse wheel scrolling on the locations content
    const locationsContent = locationsPanel.querySelector('.pokemon-locations-content');
    locationsContent.addEventListener('wheel', function(e) {
        // Completely stop the event from affecting the map
        e.stopPropagation();
        e.preventDefault();
        
        // Calculate the scroll amount based on delta
        const delta = e.deltaY || e.detail || e.wheelDelta;
        const scrollAmount = delta > 0 ? 40 : -40;
        
        // Apply the scroll
        this.scrollTop += scrollAmount;
        
        // Return false to be extra sure the event doesn't bubble
        return false;
    }, { passive: false });  // The passive: false is crucial for preventDefault to work
}

async function loadPokemonData() {
    try {
        // Załaduj spawny lądowe
        let landData = [];
        try {
            const landResponse = await fetch('data/land_spawns.json');
            if (!landResponse.ok) {
                throw new Error(`Błąd HTTP! status: ${landResponse.status}`);
            }
            landData = await landResponse.json();
            console.log(`Załadowano ${landData.length} spawnów lądowych`);
        } catch (error) {
            console.error("Błąd ładowania danych lądowych:", error);
        }
        
        // Załaduj spawny wodne
        let surfData = [];
        try {
            const surfResponse = await fetch('data/surf_spawns.json');
            if (!surfResponse.ok) {
                throw new Error(`Błąd HTTP! status: ${surfResponse.status}`);
            }
            surfData = await surfResponse.json();
            console.log(`Załadowano ${surfData.length} spawnów wodnych`);
        } catch (error) {
            console.error("Błąd ładowania danych wodnych:", error);
        }
        
        // Połącz dane
        allPokemonData = [...landData, ...surfData];
        
        // Dodaj logowanie lokalizacji bez mapy
        const locationsWithoutMap = allPokemonData.filter(entry => !entry.Map);
        if (locationsWithoutMap.length > 0) {
            console.warn(`Znaleziono ${locationsWithoutMap.length} wpisów bez określonej mapy`);
        }
        
        // Wyodrębnij unikalne nazwy Pokemonów do autouzupełniania
        uniquePokemonNames = new Set();
        allPokemonData.forEach(entry => {
            if (entry.Pokemon) {
                uniquePokemonNames.add(entry.Pokemon);
            }
        });
        
        console.log(`Załadowano dane dla ${uniquePokemonNames.size} unikalnych Pokemonów występujących w ${allPokemonData.length} lokalizacjach.`);
        
    } catch (error) {
        console.error("Błąd ładowania danych Pokemonów:", error);
        throw error;
    }
}

function setupPokemonSearchEvents(searchInput, resultsContainer) {
    // Ta funkcja pozostaje bez zmian
    searchInput.addEventListener('input', function() {
        const searchText = this.value.toLowerCase();
        
        if (searchText.length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }
        
        // Filtruj nazwy Pokemonów, które pasują do wyszukiwania
        const matchingPokemon = Array.from(uniquePokemonNames)
            .filter(name => name.toLowerCase().includes(searchText))
            .sort();
        
        // Wyświetl wyniki
        resultsContainer.innerHTML = '';
        
        if (matchingPokemon.length === 0) {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.textContent = window.i18n ? window.i18n.t('pokesearch.noPokemonFound') : 'Nie znaleziono Pokemona';
            resultsContainer.appendChild(resultItem);
        } else {
            matchingPokemon.slice(0, 10).forEach(pokemonName => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                resultItem.textContent = pokemonName;
                
                resultItem.addEventListener('click', function() {
                    searchInput.value = pokemonName;
                    resultsContainer.style.display = 'none';
                    displayPokemonLocations(pokemonName);
                });
                
                resultsContainer.appendChild(resultItem);
            });
        }
        
        resultsContainer.style.display = 'block';
    });
    
    searchInput.addEventListener('click', function() {
        if (this.value.length >= 2) {
            const event = new Event('input');
            this.dispatchEvent(event);
        }
    });
    
    document.addEventListener('click', function(e) {
        if (!resultsContainer.contains(e.target) && e.target !== searchInput) {
            resultsContainer.style.display = 'none';
        }
    });
}

function displayPokemonLocations(pokemonName) {
    clearOnlyPokemonIcons(); // Clear previous icons
    
    console.log(`Szukam lokalizacji dla Pokemona: ${pokemonName}`);
    
    // Save the current Pokemon name
    currentPokemonName = pokemonName;
    
    // Pobierz wszystkie lokalizacje, w których występuje ten Pokemon
    const locations = allPokemonData.filter(entry => entry.Pokemon === pokemonName);
    
    if (locations.length === 0) {
        alert(window.i18n ? window.i18n.t("pokesearch.noPokemonFound") : `Nie znaleziono lokalizacji dla ${pokemonName}`);
        return;
    }
    
    console.log(`Znaleziono ${locations.length} lokalizacji dla ${pokemonName}`);
    
    // Remove any existing panel before creating a new one
    const existingPanel = document.querySelector('.pokemon-locations-panel');
    if (existingPanel) {
        existingPanel.remove();
    }
    
    // Create new locations panel
    const locationsPanel = document.createElement('div');
    locationsPanel.className = 'pokemon-locations-panel';
    document.getElementById('map-container').appendChild(locationsPanel);
    
    // Get the Pokemon image
    const monsterID = locations[0].MonsterID;
    const pokemonImageSrc = `resources/pokemons/${monsterID}.png`;
    
    // Prepare locations with map availability info for sorting
    const locationsWithAvailability = locations.map(loc => {
        const mapLoc = findMapLocation(loc.Map);
        const isOnMap = mapLoc && mapLoc.map_pos;
        return {
            location: loc,
            isOnMap: isOnMap,
            mapLoc: mapLoc
        };
    });
    
    // Sort locations - available on map first
    locationsWithAvailability.sort((a, b) => {
        if (a.isOnMap && !b.isOnMap) return -1;
        if (!a.isOnMap && b.isOnMap) return 1;
        return a.location.Map.localeCompare(b.location.Map);
    });
    
    // Create the panel content
    locationsPanel.innerHTML = `
        <div class="pokemon-locations-header">
            <h3>
                <img src="${pokemonImageSrc}" alt="${pokemonName}" onerror="this.src='resources/pokemons/default-poke.png'">
                ${pokemonName}
            </h3>
            <span class="close-locations-panel">&times;</span>
        </div>
        <div class="pokemon-locations-content">
            <p class="pokemon-locations-title">${window.i18n ? window.i18n.t("pokesearch.locationsTitle") : "Ten Pokemon występuje w tych lokalizacjach:"}</p>
            <ul class="pokemon-locations-list">
                ${locationsWithAvailability.map(item => {
                    return `<li data-location="${item.location.Map}" class="${item.isOnMap ? '' : 'not-on-map'}" title="${item.isOnMap ? window.i18n ? window.i18n.t("pokesearch.clickToCenter") : 'Kliknij aby wycentrować mapę' : window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Lokalizacja nie znajduje się na mapie'}">
                        <div class="pokemon-location-name">${item.location.Map}</div>
                        <div class="pokemon-location-icons">${createLocationIconsHTML(item.location)}</div>
                    </li>`;
                }).join('')}
            </ul>
        </div>
    `;
    
    // Add event listener to the close button
    locationsPanel.querySelector('.close-locations-panel').addEventListener('click', function() {
        locationsPanel.remove();
        currentPokemonName = null; // Clear current Pokemon when panel is closed
        clearOnlyPokemonIcons();
    });
    
    // Add event listeners to location items
    locationsPanel.querySelectorAll('.pokemon-locations-list li').forEach(item => {
        item.addEventListener('click', function() {
            const locationName = this.dataset.location;
            const locationInfo = locationsWithAvailability.find(l => l.location.Map === locationName);
            
            if (locationInfo && locationInfo.isOnMap) {
                centerMapOnLocation(locationInfo.mapLoc);
                // Don't clear other icons, just highlight this one
                highlightPokemonLocation(locationInfo.location, locationInfo.mapLoc);
            } else {
                alert(window.i18n ? window.i18n.t("pokesearch.locationNotFound") : "Lokalizacja nie została znaleziona na mapie");
            }
        });
    });
    
    // Also show all Pokemon icons on the map
    displayAllPokemonIcons(pokemonName, locations);
    
    // Enable mouse wheel scrolling on the locations content
    const locationsContent = locationsPanel.querySelector('.pokemon-locations-content');
    locationsContent.addEventListener('wheel', function(e) {
        // Completely stop the event from affecting the map
        e.stopPropagation();
        e.preventDefault();
        
        // Calculate the scroll amount based on delta
        const delta = e.deltaY || e.detail || e.wheelDelta;
        const scrollAmount = delta > 0 ? 40 : -40;
        
        // Apply the scroll
        this.scrollTop += scrollAmount;
        
        // Return false to be extra sure the event doesn't bubble
        return false;
    }, { passive: false });  // The passive: false is crucial for preventDefault to work
}

// New function to highlight a specific location without clearing others
function highlightPokemonLocation(pokemonLocation, mapLoc) {
    // Find if the icon already exists for this location
    const existingIcons = pokemonIcons.filter(icon => {
        const leftPos = parseInt(icon.style.left);
        const topPos = parseInt(icon.style.top);
        return leftPos === mapLoc.map_pos[0] && topPos === mapLoc.map_pos[1];
    });
    
    if (existingIcons.length > 0) {
        // If the icon exists, apply a highlight animation
        existingIcons.forEach(icon => {
            // Apply a pulsing animation
            icon.style.animation = 'none'; // Reset animation
            setTimeout(() => {
                icon.style.animation = 'pokemon-pulse 0.8s ease-in-out 2';
            }, 10);
        });
    } else {
        // If no icon exists at this location, create one
        createPokemonIcon(pokemonLocation, mapLoc);
    }
}

// Clear only the Pokemon icons without removing the panel
function clearOnlyPokemonIcons() {
    pokemonIcons.forEach(icon => {
        if (icon && icon.parentNode) {
            icon.parentNode.removeChild(icon);
        }
    });
    
    pokemonIcons = [];
    
    // Ukryj tooltip jeśli widoczny
    const tooltip = document.querySelector('.pokemon-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// Helper function to create a single Pokemon icon
function createPokemonIcon(pokemonLocation, mapLoc) {
    const map = document.getElementById('map');
    
    // Get coordinates
    const x = mapLoc.map_pos[0];
    const y = mapLoc.map_pos[1];
    
    // Create icon
    const icon = document.createElement('div');
    icon.className = 'pokemon-icon';
    icon.style.left = `${x}px`;
    icon.style.top = `${y}px`;
    
    // Explicitly set the size to match what was in your CSS
    icon.style.width = '38px';
    icon.style.height = '38px';
    
    // Create image
    const img = document.createElement('img');
    img.src = `resources/pokemons/${pokemonLocation.MonsterID}.png`;
    img.alt = pokemonLocation.Pokemon;
    
    // Set image to fill the icon container
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.filter = 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.5))';
    
    // Fallback if image doesn't exist
    img.onerror = function() {
        this.onerror = null;
        this.src = 'resources/pokemons/default-poke.png';
    };
    
    icon.appendChild(img);
    
    // Add events (tooltip, click)
    icon.addEventListener('click', function(e) {
        e.stopPropagation();
        displayPokemonTooltip(pokemonLocation, e.clientX, e.clientY);
    });
    
    icon.addEventListener('mouseover', function(e) {
        const locationTooltip = document.getElementById('tooltip');
        if (locationTooltip) {
            locationTooltip.textContent = `${pokemonLocation.Pokemon} - ${pokemonLocation.Map}`;
            locationTooltip.style.left = `${e.clientX + 15}px`;
            locationTooltip.style.top = `${e.clientY}px`;
            locationTooltip.style.opacity = '1';
        }
    });
    
    icon.addEventListener('mouseleave', function() {
        const locationTooltip = document.getElementById('tooltip');
        if (locationTooltip) {
            locationTooltip.style.opacity = '0';
        }
    });
    
    map.appendChild(icon);
    pokemonIcons.push(icon);
    
    return icon;
}

// Helper function to display all icons on the map
function displayAllPokemonIcons(pokemonName, pokemonLocations) {
    let foundCount = 0;
    
    // Check each Pokemon location
    pokemonLocations.forEach((pokemonLocation) => {
        // Find location on the map using window.locations
        const mapLoc = findMapLocation(pokemonLocation.Map);
        
        // If location not found on map, skip
        if (!mapLoc || !mapLoc.map_pos) {
            return;
        }
        
        // Increment found locations counter
        foundCount++;
        
        // Create and add icon
        createPokemonIcon(pokemonLocation, mapLoc);
    });
    
    console.log(`Wyświetlono ${foundCount} z ${pokemonLocations.length} lokalizacji dla ${pokemonName}`);
}

function findMapLocation(locationName) {
    // Sprawdź, czy window.locations istnieje i ma dane
    if (!window.locations || !Array.isArray(window.locations) || window.locations.length === 0) {
        console.error(`window.locations nie istnieje lub jest puste podczas szukania: ${locationName}`);
        
        // Spróbuj użyć lokalnej zmiennej locations, jeśli dostępna w globalnym zakresie
        if (typeof locations !== 'undefined' && Array.isArray(locations) && locations.length > 0) {
            console.log(`Używam lokalnej zmiennej 'locations' zamiast window.locations (znaleziono ${locations.length} lokalizacji)`);
            const location = locations.find(loc => loc.tooltip === locationName);
            if (location) return location;
        }
        
        return null;
    }
    
    // Najpierw szukaj dokładnego dopasowania po polu tooltip
    let location = window.locations.find(loc => loc.tooltip === locationName);
    
    // Jeśli nie znaleziono, spróbuj dopasować po polu map
    if (!location) {
        location = window.locations.find(loc => loc.map === locationName);
    }
    
    // Jeśli nadal nie znaleziono, spróbuj wersję bardziej elastyczną - ignoruj wielkość liter
    if (!location) {
        const locationLower = locationName.toLowerCase();
        location = window.locations.find(loc => 
            (loc.tooltip && loc.tooltip.toLowerCase() === locationLower) || 
            (loc.map && loc.map.toLowerCase() === locationLower)
        );
    }
    
    // Jeśli nadal nie znaleziono, sprawdź czy mamy dopasowanie częściowe
    if (!location) {
        const possibleMatches = window.locations.filter(loc => 
            (loc.tooltip && loc.tooltip.includes(locationName)) ||
            (loc.map && loc.map.includes(locationName))
        );
        
        if (possibleMatches.length > 0) {
            console.log(`Nie znaleziono dokładnego dopasowania dla "${locationName}", ale znaleziono ${possibleMatches.length} częściowych dopasowań:`, 
                        possibleMatches.slice(0, 3).map(l => l.tooltip || l.map));
            location = possibleMatches[0]; // Użyj pierwszego częściowego dopasowania
        }
    }
    
    // Jeśli nadal nie znaleziono, wyloguj informację
    if (!location) {
        // console.warn(`Nie znaleziono lokalizacji dla: "${locationName}"`);
    } else {
        console.log(`Znaleziono lokalizację dla: "${locationName}"`, location);
    }
    
    return location;
}

function clearPokemonIcons() {
    clearOnlyPokemonIcons();
    
    // Remove the locations panel if it exists
    const locationsPanel = document.querySelector('.pokemon-locations-panel');
    if (locationsPanel) {
        locationsPanel.remove();
        currentPokemonName = null; // Clear current Pokemon
    }
}

function displayPokemonTooltip(pokemonData, x, y) {
    // Sprawdź czy tooltip już istnieje lub utwórz nowy
    let tooltip = document.querySelector('.pokemon-tooltip');
    
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'pokemon-tooltip';
        document.body.appendChild(tooltip);
    }
    
    // Utwórz tekst czasu dnia
    let daytimeText = '';
    if (pokemonData.Daytime && pokemonData.Daytime.length === 3) {
        const dayParts = [];
        if (pokemonData.Daytime[0]) dayParts.push(window.i18n.t('pokemon.morning'));
        if (pokemonData.Daytime[1]) dayParts.push(window.i18n.t('pokemon.day'));
        if (pokemonData.Daytime[2]) dayParts.push(window.i18n.t('pokemon.night'));
        daytimeText = dayParts.join(', ');
    }
    
    // Utwórz zawartość HTML dla tooltipa z międzynarodowymi tekstami
    const content = `
        <div class="pokemon-tooltip-header">
            <h3>${pokemonData.Pokemon} (#${pokemonData.MonsterID})</h3>
            <span class="close-tooltip">&times;</span>
        </div>
        <div class="pokemon-tooltip-content">
            <table class="pokemon-info-table">
                <tr>
                    <td><strong>${window.i18n.t('pokemon.location')}:</strong></td>
                    <td>${pokemonData.Map}</td>
                </tr>
                <tr>
                    <td><strong>${window.i18n.t('pokemon.timeOfDay')}:</strong></td>
                    <td>${daytimeText || window.i18n.t('pokemon.unknown')}</td>
                </tr>
                <tr>
                    <td><strong>${window.i18n.t('pokemon.levelRange')}:</strong></td>
                    <td>${pokemonData.MinLVL} - ${pokemonData.MaxLVL}</td>
                </tr>
                <tr>
                    <td><strong>${window.i18n.t('pokemon.heldItem')}:</strong></td>
                    <td>${pokemonData.Item || window.i18n.t('pokemon.none')}</td>
                </tr>
                <tr>
                    <td><strong>${window.i18n.t('pokemon.memberOnly')}:</strong></td>
                    <td>${pokemonData.MemberOnly ? window.i18n.t('pokemon.yes') : window.i18n.t('pokemon.no')}</td>
                </tr>
                <tr>
                    <td><strong>${window.i18n.t('pokemon.rarityLevel')}:</strong></td>
                    <td>${pokemonData.Tier || window.i18n.t('pokemon.unknown')}</td>
                </tr>
            </table>
        </div>
    `;
    
    tooltip.innerHTML = content;
    
    // Ustaw pozycję tooltipa
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let tooltipLeft = x + 15;
    let tooltipTop = y + 15;
    const tooltipWidth = 400;
    const tooltipHeight = 300;
    
    if (tooltipLeft + tooltipWidth > viewportWidth) {
        tooltipLeft = x - tooltipWidth - 15;
    }
    
    if (tooltipTop + tooltipHeight > viewportHeight) {
        tooltipTop = viewportHeight - tooltipHeight - 15;
    }
    
    tooltip.style.left = `${tooltipLeft}px`;
    tooltip.style.top = `${tooltipTop}px`;
    tooltip.style.display = 'block';
    
    // Dodaj funkcjonalność przycisku zamykania
    const closeButton = tooltip.querySelector('.close-tooltip');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            tooltip.style.display = 'none';
        });
    }
    
    // Zamknij tooltip po kliknięciu gdziekolwiek indziej
    document.addEventListener('click', function closeTooltip(e) {
        if (!tooltip.contains(e.target) && !e.target.closest('.pokemon-icon')) {
            tooltip.style.display = 'none';
            document.removeEventListener('click', closeTooltip);
        }
    });
}

// Inicjalizacja po załadowaniu okna
window.addEventListener('load', function() {
    // Dodaj opóźnienie, aby upewnić się, że script.js załadował dane mapy
    setTimeout(function() {
        console.log("Rozpoczynam inicjalizację wyszukiwania Pokemonów...");
        
        // Sprawdź czy mamy dostęp do window.locations lub globalnej zmiennej locations
        if ((window.locations && window.locations.length > 0) || 
            (typeof locations !== 'undefined' && locations.length > 0)) {
            console.log("Dane lokalizacji dostępne, inicjalizuję wyszukiwarkę Pokemonów");
            
            // Jeśli mamy dostęp do locations, ale nie do window.locations, przypisz je
            if (!window.locations && typeof locations !== 'undefined') {
                console.log("Przypisuję locations do window.locations");
                window.locations = locations;
            }
        } else {
            console.warn("Dane lokalizacji nie są jeszcze dostępne, inicjalizuję wyszukiwarkę z opóźnieniem");
        }
        
        initPokemonSearch();
    }, 3000); // Opóźnienie 3 sekundy
});

// Czyść ikony Pokemonów, gdy mapa jest odświeżana
function hookIntoMapRefresh() {
    const originalRefreshMarkers = window.refreshMarkers;
    
    if (typeof originalRefreshMarkers === 'function') {
        window.refreshMarkers = function() {
            // Wywołaj oryginalną funkcję
            originalRefreshMarkers.apply(this, arguments);
            
            // Wyczyść ikony Pokemonów
            clearOnlyPokemonIcons(); // Changed to only clear icons, not the panel
            
            // If there was a Pokemon being displayed, redisplay its icons
            if (currentPokemonName) {
                const locations = allPokemonData.filter(entry => entry.Pokemon === currentPokemonName);
                if (locations.length > 0) {
                    displayAllPokemonIcons(currentPokemonName, locations);
                }
            }
        };
        
        console.log("Pomyślnie podpięto się pod funkcję refreshMarkers");
    } else {
        console.warn("Nie można podpiąć się pod funkcję refreshMarkers");
    }
}