let allPokemonData = [];
let pokemonIcons = [];
let uniquePokemonNames = new Set();
let uniqueItems = new Set();
let uniqueLocationNames = new Set();
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
        
        // Add repel filter checkbox
        addRepelFilterCheckbox();
        
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
                
                // Odśwież panel lokalizacji, jeśli jest otwarty
                const locationPanel = document.querySelector('.location-pokemon-panel');
                if (locationPanel) {
                    const locationName = locationPanel.querySelector('.pokemon-locations-header h3').textContent.trim();
                    if (locationName) {
                        // Znajdź lokalizację i odśwież
                        const mapLoc = findMapLocation(locationName);
                        if (mapLoc) {
                            displayPokemonsByLocation(mapLoc.tooltip || locationName);
                        }
                    }
                }
                
                // Odśwież panel przedmiotów, jeśli jest otwarty
                const itemPanel = document.querySelector('.item-pokemon-panel');
                if (itemPanel) {
                    const itemName = itemPanel.querySelector('.pokemon-locations-header h3').textContent.trim();
                    if (itemName) {
                        displayPokemonsByItem(itemName);
                    }
                }
            });
        }
        
        console.log("Inicjalizacja wyszukiwania Pokemonów zakończona pomyślnie.");
    } catch (error) {
        console.error("Błąd inicjalizacji wyszukiwania Pokemonów:", error);
    }
}

// Funkcja do wyodrębniania unikalnych nazw lokalizacji
function extractUniqueLocations() {
    const uniqueLocations = new Set();
    allPokemonData.forEach(entry => {
        if (entry.Map) {
            uniqueLocations.add(entry.Map);
        }
    });
    return uniqueLocations;
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

function createSourceIconHTML(source) {
    if (!source) return '';
    const iconName = source === 'land' ? 'land.png' : 'surf.png';
    const title = source === 'land' ? (window.i18n ? window.i18n.t('pokemon.landSpawn') : 'Land Spawn') : (window.i18n ? window.i18n.t('pokemon.waterSpawn') : 'Water Spawn');
    return `<span class="pokemon-spawn-type"><img src="resources/${iconName}" class="pokemon-location-icon pokemon-source-icon" title="${title}" alt="${title}"></span>`;
}

function createMembershipIconHTML(isMemberOnly) {
    if (!isMemberOnly) return '';
    return `<img src="resources/membership.png" class="pokemon-location-icon pokemon-membership-icon" title="${window.i18n ? window.i18n.t('pokemon.memberOnly') : 'Member Only'}" alt="Member Only">`;
}

function createFishingIconHTML(fishingOnly, requiredRod) {
    if (!fishingOnly) return '';
    const rodTitle = requiredRod ? requiredRod : (window.i18n ? window.i18n.t('pokemon.fishingRequired') : 'Fishing Required');
    return `<img src="resources/fishing.png" class="pokemon-location-icon pokemon-fishing-icon" title="${rodTitle}" alt="Fishing">`;
}

function createRepelIconHTML(requiresRepel) {
    if (!requiresRepel) return '';
    return `<img src="resources/repel.png" class="pokemon-location-icon pokemon-repel-icon" title="${window.i18n ? window.i18n.t('pokemon.repelRequired') : 'Repel Required'}" alt="Repel">`;
}

function createLocationIconsHTML(pokemonLocation) {
    let iconsHTML = '';

    // Add tier icon
    iconsHTML += createTierIconHTML(pokemonLocation.Tier);
    
    // Add source icon (land/surf)
    iconsHTML += createSourceIconHTML(pokemonLocation.Source);

    // Add fishing icon if needed
    iconsHTML += createFishingIconHTML(pokemonLocation.FishingOnly, pokemonLocation.RequiredRod);
    
    // Add repel icon if needed
    iconsHTML += createRepelIconHTML(pokemonLocation.RequiresRepel);

    // Add item icon
    iconsHTML += createItemIconHTML(pokemonLocation.Item);
    
    // Add membership icon if needed
    iconsHTML += createMembershipIconHTML(pokemonLocation.MemberOnly);
    
    // Add daytime icons
    iconsHTML += createDaytimeIconsHTML(pokemonLocation.Daytime);
    
    return iconsHTML;
}

// Function to refresh the Pokemon panel when language changes
function refreshPokemonPanel(pokemonName) {
    // Preserve currently displayed Pokemon
    currentPokemonName = pokemonName;
    
    // Get all locations for the current Pokemon
    let locations = allPokemonData.filter(entry => entry.Pokemon === pokemonName);
    
    // Check if repel filter is active
    const repelFilter = document.getElementById('repel-filter-checkbox');
    const showOnlyRepel = repelFilter && repelFilter.checked;
    
    // Filter locations if repel filter is active
    if (showOnlyRepel) {
        locations = locations.filter(loc => loc.RequiresRepel);
    }
    
    if (locations.length === 0) {
        // If there are no locations to display after filtering
        const locationsPanel = document.querySelector('.pokemon-locations-panel');
        if (locationsPanel) {
            locationsPanel.remove();
        }
        
        // Show alert about no locations found with repel
        if (showOnlyRepel) {
            alert(window.i18n ? window.i18n.t("pokesearch.noPokemonFoundWithRepel") : 
                 `Nie znaleziono lokalizacji dla ${pokemonName} z repelem`);
        }
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
                alert(window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : "Lokalizacja nie znajduje się na mapie");
            }
        });
    });
    
    // Update Pokemon icons on the map after refreshing the panel
    clearOnlyPokemonIcons();
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
            // Add source property to each land spawn
            landData = landData.map(entry => ({
                ...entry,
                Source: 'land'
            }));
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
            // Add source property to each surf spawn
            surfData = surfData.map(entry => ({
                ...entry,
                Source: 'surf'
            }));
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
        
        // Wyodrębnij unikalne przedmioty
        uniqueItems = new Set();
        allPokemonData.forEach(entry => {
            if (entry.Item) {
                uniqueItems.add(entry.Item);
            }
        });
        console.log(`Znaleziono ${uniqueItems.size} unikalnych przedmiotów.`);
        
        // Wyodrębnij unikalne nazwy lokalizacji
        uniqueLocationNames = extractUniqueLocations();
        console.log(`Znaleziono ${uniqueLocationNames.size} unikalnych lokalizacji w danych.`);
        
        // Identify Pokemon that require repel
        allPokemonData = identifyRepelRequiredPokemon(allPokemonData);
        
        console.log(`Załadowano dane dla ${uniquePokemonNames.size} unikalnych Pokemonów występujących w ${allPokemonData.length} lokalizacjach.`);
        
    } catch (error) {
        console.error("Błąd ładowania danych Pokemonów:", error);
        throw error;
    }
}

function identifyRepelRequiredPokemon(allPokemonData) {
    // Grupuj pokemony według lokalizacji (Map) i Source (land/surf)
    const pokemonByMapAndSource = {};
    
    allPokemonData.forEach(pokemon => {
        if (!pokemon.Map) return; // Pomiń, jeśli brak mapy
        
        // Klucz to kombinacja mapy i źródła (land/surf)
        const key = `${pokemon.Map}|${pokemon.Source || 'unknown'}`;
        
        if (!pokemonByMapAndSource[key]) {
            pokemonByMapAndSource[key] = [];
        }
        
        pokemonByMapAndSource[key].push(pokemon);
    });
    
    // Dla każdej lokalizacji i źródła identyfikuj pokemony wymagające repela
    for (const key in pokemonByMapAndSource) {
        const [mapName, source] = key.split('|');
        const mapPokemons = pokemonByMapAndSource[key];
        
        // Pomiń, jeśli nie ma pokemonów z poziomami
        if (!mapPokemons.some(p => p.MinLVL !== undefined && p.MaxLVL !== undefined)) {
            continue;
        }
        
        // Oznacz wszystkie pokemony jako niewymagające repela na początku
        mapPokemons.forEach(pokemon => {
            pokemon.RequiresRepel = false;
        });
        
        // Sprawdź czy wszystkie pokemony mają ten sam zakres poziomów
        const pokemonsWithLevels = mapPokemons.filter(p => 
            p.MinLVL !== undefined && p.MaxLVL !== undefined
        );
        
        if (pokemonsWithLevels.length > 0) {
            const firstMin = pokemonsWithLevels[0].MinLVL;
            const firstMax = pokemonsWithLevels[0].MaxLVL;
            
            const allSameLevel = pokemonsWithLevels.every(p => 
                p.MinLVL === firstMin && p.MaxLVL === firstMax
            );
            
            // Jeśli wszystkie pokemony mają ten sam zakres poziomów, pomiń identyfikację repela
            if (allSameLevel) {
                // console.log(`W ${mapName} (${source}) wszystkie pokemony mają ten sam zakres poziomów (${firstMin}-${firstMax}), żaden nie wymaga repela.`);
                continue;
            }
        }
        
        // Dwuetapowy algorytm, aby rozwiązać problem rekurencyjności:
        
        // 1. Znajdź najwyższy minimalny poziom w lokalizacji
        const highestMinLevel = Math.max(
            ...mapPokemons
                .filter(p => p.MinLVL !== undefined)
                .map(p => p.MinLVL)
        );
        
        // 2. Tymczasowo oznacz wszystkie pokemony z najwyższym minimalnym poziomem jako potencjalne repele
        const potentialRepelPokemon = mapPokemons.filter(p => 
            p.MinLVL !== undefined && p.MinLVL === highestMinLevel
        );
        
        // 3. Znajdź maksymalny poziom wszystkich pokemonów, które nie są potencjalnymi repelami
        const nonRepelPokemon = mapPokemons.filter(p => 
            !potentialRepelPokemon.includes(p) && p.MaxLVL !== undefined
        );
        
        const maxNonRepelLevel = nonRepelPokemon.length > 0 
            ? Math.max(...nonRepelPokemon.map(p => p.MaxLVL))
            : 0;
        
        // 4. Dla każdego potencjalnego repela, sprawdź czy jego minimalny poziom przewyższa maksymalny poziom nie-repeli
        let repelCount = 0;
        potentialRepelPokemon.forEach(pokemon => {
            if (pokemon.MinLVL > maxNonRepelLevel) {
                pokemon.RequiresRepel = true;
                repelCount++;
            }
        });
        
        // 5. Jeśli algorytm zidentyfikował więcej niż 4 repele dla danej lokalizacji,
        // najprawdopodobniej jest to lokalizacja bez repeli z podobnymi zakresami poziomów
        const MAX_REPEL_POKEMON = 4;
        if (repelCount > MAX_REPEL_POKEMON) {
            // console.log(`Za dużo pokemonów z repelem (${repelCount}) w ${mapName} (${source}), resetuję wszystkie flagi repela.`);
            mapPokemons.forEach(pokemon => {
                pokemon.RequiresRepel = false;
            });
            repelCount = 0;
        }
        
        // Logowanie wyników
        if (repelCount > 0) {
            const repelPokemonNames = mapPokemons
                .filter(p => p.RequiresRepel)
                .map(p => `${p.Pokemon} (${p.MinLVL}-${p.MaxLVL})`)
                .join(', ');
                
            // console.log(`Pokemony z repelem w ${mapName} (${source}): ${repelPokemonNames}. Max poziom innych: ${maxNonRepelLevel}`);
        }
    }
    
    // Policz pokemony wymagające repela
    const repelCount = allPokemonData.filter(p => p.RequiresRepel).length;
    // console.log(`Znaleziono ${repelCount} pokemonów wymagających repela z ${allPokemonData.length} wszystkich wpisów.`);
    
    return allPokemonData;
}

// Function to check if an item is held by any Pokemon requiring repel
function isItemWithRepel(itemName) {
    return allPokemonData.some(entry => 
        entry.Item === itemName && entry.RequiresRepel
    );
}

// Function to check if a location has any Pokemon requiring repel
function isLocationWithRepel(locationName) {
    return allPokemonData.some(entry => 
        entry.Map === locationName && entry.RequiresRepel
    );
}

// Function to check if a Pokemon requires repel in any location
function isPokemonWithRepel(pokemonName) {
    return allPokemonData.some(entry => 
        entry.Pokemon === pokemonName && entry.RequiresRepel
    );
}

// Function to setup the repel filter checkbox
function addRepelFilterCheckbox() {
    const checkbox = document.getElementById('repel-filter-checkbox');
    if (!checkbox) {
        console.warn("Nie znaleziono checkboxa filtru repela w HTML");
        return null;
    }
    
    // Update label text with translations if available
    const label = checkbox.nextElementSibling;
    if (label && window.i18n) {
        label.textContent = window.i18n.t('pokesearch.showOnlyRepel');
    }
    
    // Add event listener to trigger search when checkbox changes
    checkbox.addEventListener('change', function() {
        const searchInput = document.getElementById('pokemon-search');
        
        // Jeśli aktualnie wyświetlamy jakiegoś Pokemona, lokalizację lub przedmiot, odśwież
        if (currentPokemonName) {
            displayPokemonLocations(currentPokemonName);
        }
        
        // Opcjonalnie wyczyść pole wyszukiwania
        // searchInput.value = '';
        
        // Symuluj zdarzenie kliknięcia, aby odświeżyć sugestie
        if (searchInput.value) {
            const event = new Event('input');
            searchInput.dispatchEvent(event);
        } else {
            // Jeśli pole jest puste, pokaż domyślne sugestie
            showInitialSuggestions();
        }
    });
    
    return checkbox;
}

// Function to show initial alphabetical suggestions
function showInitialSuggestions() {
    const searchInput = document.getElementById('pokemon-search');
    const resultsContainer = document.getElementById('pokemon-search-results');
    
    if (!searchInput || !resultsContainer) return;
    
    // Check if repel filter is active
    const repelFilter = document.getElementById('repel-filter-checkbox');
    const showOnlyRepel = repelFilter && repelFilter.checked;
    
    // Prepare all available options
    let pokemonOptions = Array.from(uniquePokemonNames);
    let locationOptions = Array.from(uniqueLocationNames);
    let itemOptions = Array.from(uniqueItems);
    
    // Filter by repel if needed
    if (showOnlyRepel) {
        pokemonOptions = pokemonOptions.filter(name => isPokemonWithRepel(name));
        locationOptions = locationOptions.filter(name => isLocationWithRepel(name));
        itemOptions = itemOptions.filter(name => isItemWithRepel(name));
    }
    
    // Sort alphabetically
    pokemonOptions.sort();
    locationOptions.sort();
    itemOptions.sort();
    
    // Clear previous results
    resultsContainer.innerHTML = '';
    
    // If no options found
    if (pokemonOptions.length === 0 && locationOptions.length === 0 && itemOptions.length === 0) {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.textContent = window.i18n ? window.i18n.t('pokesearch.noResults') : 'Nie znaleziono wyników';
        resultsContainer.appendChild(resultItem);
        resultsContainer.style.display = 'block';
        return;
    }
    
    // Add Pokemon suggestions
    if (pokemonOptions.length > 0) {
        const pokemonHeader = document.createElement('div');
        pokemonHeader.className = 'search-result-header';
        pokemonHeader.textContent = window.i18n ? window.i18n.t('pokesearch.pokemon') : 'Pokemony:';
        resultsContainer.appendChild(pokemonHeader);
        
        pokemonOptions.slice(0, 5).forEach(pokemonName => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item pokemon-result';
            resultItem.textContent = pokemonName;
            
            resultItem.addEventListener('click', function() {
                searchInput.value = pokemonName;
                resultsContainer.style.display = 'none';
                displayPokemonLocations(pokemonName);
            });
            
            resultsContainer.appendChild(resultItem);
        });
    }
    
    // Add location suggestions
    if (locationOptions.length > 0) {
        const locationHeader = document.createElement('div');
        locationHeader.className = 'search-result-header';
        locationHeader.textContent = window.i18n ? window.i18n.t('pokesearch.locations') : 'Lokalizacje:';
        resultsContainer.appendChild(locationHeader);
        
        locationOptions.slice(0, 5).forEach(locationName => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item location-result';
            resultItem.textContent = locationName;
            
            resultItem.addEventListener('click', function() {
                searchInput.value = locationName;
                resultsContainer.style.display = 'none';
                displayPokemonsByLocation(locationName);
            });
            
            resultsContainer.appendChild(resultItem);
        });
    }
    
    // Add item suggestions
    if (itemOptions.length > 0) {
        const itemHeader = document.createElement('div');
        itemHeader.className = 'search-result-header';
        itemHeader.textContent = window.i18n ? window.i18n.t('pokesearch.items') : 'Przedmioty:';
        resultsContainer.appendChild(itemHeader);
        
        itemOptions.slice(0, 5).forEach(itemName => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item item-result';
            resultItem.textContent = itemName;
            
            resultItem.addEventListener('click', function() {
                searchInput.value = itemName;
                resultsContainer.style.display = 'none';
                displayPokemonsByItem(itemName);
            });
            
            resultsContainer.appendChild(resultItem);
        });
    }
    
    // Display results
    resultsContainer.style.display = 'block';
    
    // Make results scrollable
    resultsContainer.style.maxHeight = '300px';
    resultsContainer.style.overflowY = 'auto';
}

function setupPokemonSearchEvents(searchInput, resultsContainer) {
    searchInput.addEventListener('input', function() {
        const searchText = this.value.toLowerCase();
        
        if (searchText.length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }
        
        // Sprawdź czy filtr repela jest aktywny
        const repelFilter = document.getElementById('repel-filter-checkbox');
        const showOnlyRepel = repelFilter && repelFilter.checked;
        
        // Szukaj pasujących nazw Pokemonów
        let matchingPokemon = Array.from(uniquePokemonNames)
            .filter(name => name.toLowerCase().includes(searchText));
            
        // Jeśli filtr repela jest aktywny, filtruj dalej Pokemony
        if (showOnlyRepel) {
            matchingPokemon = matchingPokemon.filter(name => isPokemonWithRepel(name));
        }
        
        // Szukaj pasujących nazw lokalizacji w window.locations (na mapie)
        const mapLocations = window.locations
            ? window.locations
                .filter(loc => {
                    const tooltip = loc.tooltip ? loc.tooltip.toLowerCase() : '';
                    const map = loc.map ? loc.map.toLowerCase() : '';
                    return tooltip.includes(searchText) || map.includes(searchText);
                })
                .map(loc => loc.tooltip || loc.map)
            : [];
            
        // Szukaj pasujących nazw lokalizacji w wszystkich danych Pokemonów
        let dataLocations = Array.from(uniqueLocationNames)
            .filter(loc => loc.toLowerCase().includes(searchText));
            
        // Filtruj lokalizacje jeśli repel jest aktywny
        if (showOnlyRepel) {
            dataLocations = dataLocations.filter(name => isLocationWithRepel(name));
        }
            
        // Połącz obie listy lokalizacji i usuń duplikaty
        let allMatchingLocations = [...new Set([...mapLocations, ...dataLocations])];
        
        // Filtruj lokalizacje jeśli repel jest aktywny
        if (showOnlyRepel) {
            allMatchingLocations = allMatchingLocations.filter(name => isLocationWithRepel(name));
        }
        
        // Szukaj pasujących przedmiotów
        let matchingItems = Array.from(uniqueItems)
            .filter(item => item.toLowerCase().includes(searchText));
        
        // Filtruj przedmioty jeśli repel jest aktywny
        if (showOnlyRepel) {
            matchingItems = matchingItems.filter(name => isItemWithRepel(name));
        }
        
        // Przygotuj wyniki
        resultsContainer.innerHTML = '';
        
        // Brak wyników
        if (matchingPokemon.length === 0 && allMatchingLocations.length === 0 && matchingItems.length === 0) {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.textContent = window.i18n ? window.i18n.t('pokesearch.noResults') : 'Nie znaleziono wyników';
            resultsContainer.appendChild(resultItem);
        } else {
            // Dodaj wyniki przedmiotów z nagłówkiem
            if (matchingItems.length > 0) {
                const itemHeader = document.createElement('div');
                itemHeader.className = 'search-result-header';
                itemHeader.textContent = window.i18n ? window.i18n.t('pokesearch.items') : 'Przedmioty:';
                resultsContainer.appendChild(itemHeader);
                
                matchingItems.slice(0, 5).forEach(itemName => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'search-result-item item-result';
                    resultItem.textContent = itemName;
                    
                    resultItem.addEventListener('click', function() {
                        searchInput.value = itemName;
                        resultsContainer.style.display = 'none';
                        displayPokemonsByItem(itemName);
                    });
                    
                    resultsContainer.appendChild(resultItem);
                });
            }
            
            // Dodaj wyniki lokalizacji z nagłówkiem
            if (allMatchingLocations.length > 0) {
                const locationHeader = document.createElement('div');
                locationHeader.className = 'search-result-header';
                locationHeader.textContent = window.i18n ? window.i18n.t('pokesearch.locations') : 'Lokalizacje:';
                resultsContainer.appendChild(locationHeader);
                
                // Najpierw posortuj lokalizacje - najpierw te na mapie
                const sortedLocations = [...allMatchingLocations].sort((a, b) => {
                    const aOnMap = mapLocations.includes(a);
                    const bOnMap = mapLocations.includes(b);
                    if (aOnMap && !bOnMap) return -1;
                    if (!aOnMap && bOnMap) return 1;
                    return a.localeCompare(b);
                });
                
                sortedLocations.slice(0, 8).forEach(locationName => {
                    // Sprawdź, czy lokalizacja jest na mapie
                    const isOnMap = mapLocations.includes(locationName);
                    
                    const resultItem = document.createElement('div');
                    resultItem.className = `search-result-item location-result ${isOnMap ? '' : 'not-on-map-result'}`;
                    resultItem.textContent = locationName;
                    
                    // Dodaj ikonę tylko dla lokalizacji na mapie
                    if (!isOnMap) {
                        resultItem.title = window.i18n ? window.i18n.t('pokesearch.locationNotOnMap') : 'Lokalizacja nie znajduje się na mapie';
                    }
                    
                    resultItem.addEventListener('click', function() {
                        searchInput.value = locationName;
                        resultsContainer.style.display = 'none';
                        displayPokemonsByLocation(locationName);
                    });
                    
                    resultsContainer.appendChild(resultItem);
                });
            }
            
            // Dodaj wyniki Pokemonów z nagłówkiem
            if (matchingPokemon.length > 0) {
                const pokemonHeader = document.createElement('div');
                pokemonHeader.className = 'search-result-header';
                pokemonHeader.textContent = window.i18n ? window.i18n.t('pokesearch.pokemon') : 'Pokemony:';
                resultsContainer.appendChild(pokemonHeader);
                
                matchingPokemon.slice(0, 5).forEach(pokemonName => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'search-result-item pokemon-result';
                    resultItem.textContent = pokemonName;
                    
                    resultItem.addEventListener('click', function() {
                        searchInput.value = pokemonName;
                        resultsContainer.style.display = 'none';
                        displayPokemonLocations(pokemonName);
                    });
                    
                    resultsContainer.appendChild(resultItem);
                });
            }
        }
        
        resultsContainer.style.display = 'block';
    });
    
    searchInput.addEventListener('click', function() {
        if (this.value.length >= 2) {
            const event = new Event('input');
            this.dispatchEvent(event);
        } else {
            // Show initial suggestions when clicked with empty input
            showInitialSuggestions();
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
    let locations = allPokemonData.filter(entry => entry.Pokemon === pokemonName);
    
    // Check if repel filter is active
    const repelFilter = document.getElementById('repel-filter-checkbox');
    const showOnlyRepel = repelFilter && repelFilter.checked;
    
    // Filter locations if repel filter is active
    if (showOnlyRepel) {
        locations = locations.filter(loc => loc.RequiresRepel);
    }
    
    if (locations.length === 0) {
        alert(window.i18n ? window.i18n.t(showOnlyRepel ? "pokesearch.noPokemonFoundWithRepel" : "pokesearch.noPokemonFound") : 
             `Nie znaleziono lokalizacji dla ${pokemonName}${showOnlyRepel ? " z repelem" : ""}`);
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
                alert(window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : "Lokalizacja nie znajduje się na mapie");
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
    icon.style.width = '42px';
    icon.style.height = '42px';
    
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
    
    // Add desktop events (tooltip, click)
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
    
    // Add mobile touch events
    icon.addEventListener('touchstart', function(e) {
        e.preventDefault(); // Prevent default behavior
        const touch = e.touches[0];
        const locationTooltip = document.getElementById('tooltip');
        if (locationTooltip) {
            locationTooltip.textContent = `${pokemonLocation.Pokemon} - ${pokemonLocation.Map}`;
            locationTooltip.style.left = `${touch.clientX + 15}px`;
            locationTooltip.style.top = `${touch.clientY}px`;
            locationTooltip.style.opacity = '1';
        }
    });
    
    icon.addEventListener('touchend', function(e) {
        e.preventDefault();
        const locationTooltip = document.getElementById('tooltip');
        if (locationTooltip) {
            locationTooltip.style.opacity = '0';
        }
        
        if (e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            displayPokemonTooltip(pokemonLocation, touch.clientX, touch.clientY);
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
                ${pokemonData.RequiresRepel ? `
                <tr>
                    <td><strong>${window.i18n.t('pokemon.repelRequired')}:</strong></td>
                    <td>${window.i18n.t('pokemon.yes')}</td>
                </tr>` : ''}
            </table>
        </div>
    `;
    
    tooltip.innerHTML = content;
    
    // Dostosuj pozycjonowanie dla urządzeń mobilnych
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = window.innerWidth <= 768; // Sprawdzenie czy to urządzenie mobilne
    
    if (isMobile) {
        // Na urządzeniach mobilnych wyświetl tooltip na środku ekranu
        const tooltipWidth = Math.min(300, viewportWidth * 0.85);
        tooltip.style.width = `${tooltipWidth}px`;
        tooltip.style.maxWidth = `${tooltipWidth}px`;
        tooltip.style.left = '50%';
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
        
        // Zwiększ obszar dotyku dla przycisku zamykania
        const closeButton = tooltip.querySelector('.close-tooltip');
        if (closeButton) {
            closeButton.style.padding = '10px';
            closeButton.style.fontSize = '24px';
        }
    } else {
        // Na desktopie użyj dotychczasowej logiki
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
        tooltip.style.transform = 'none';
    }
    
    tooltip.style.display = 'block';
    
    // Dodaj funkcjonalność przycisku zamykania
    const closeButton = tooltip.querySelector('.close-tooltip');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            tooltip.style.display = 'none';
        });
    }
    
    // Zamknij tooltip po kliknięciu gdziekolwiek indziej
    const handleOutsideClick = function(e) {
        if (!tooltip.contains(e.target) && !e.target.closest('.pokemon-icon')) {
            tooltip.style.display = 'none';
            document.removeEventListener('click', handleOutsideClick);
            document.removeEventListener('touchstart', handleOutsideClick);
        }
    };
    
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
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

// Zmodyfikowana funkcja displayPokemonsByLocation
function displayPokemonsByLocation(locationName) {
    // Znajdź lokalizację na mapie
    const mapLoc = findMapLocation(locationName);
    const isOnMap = mapLoc && mapLoc.map_pos;
    
    // Znajdź wszystkie Pokemony w tej lokalizacji
    let pokemonAtLocation = allPokemonData.filter(entry => 
        entry.Map === locationName || 
        (mapLoc && entry.Map === mapLoc.tooltip) || 
        (mapLoc && mapLoc.map && entry.Map === mapLoc.map)
    );
    
    // Sprawdź czy filtr repela jest aktywny
    const repelFilter = document.getElementById('repel-filter-checkbox');
    const showOnlyRepel = repelFilter && repelFilter.checked;
    
    // Filtruj Pokemony jeśli filtr repela jest aktywny
    if (showOnlyRepel) {
        pokemonAtLocation = pokemonAtLocation.filter(poke => poke.RequiresRepel);
    }
    
    // Wyczyść poprzednie ikony Pokemonów
    clearOnlyPokemonIcons();
    
    // Usuń istniejące panele
    const existingPanel = document.querySelector('.location-pokemon-panel');
    if (existingPanel) {
        existingPanel.remove();
    }
    
    const existingPokemonPanel = document.querySelector('.pokemon-locations-panel');
    if (existingPokemonPanel) {
        existingPokemonPanel.remove();
    }
    
    const existingItemPanel = document.querySelector('.item-pokemon-panel');
    if (existingItemPanel) {
        existingItemPanel.remove();
    }
    
    // Jeśli nie ma pokemonów w tej lokalizacji
    if (pokemonAtLocation.length === 0) {
        if (isOnMap) {
            // Jeśli lokalizacja jest na mapie, wycentruj mapę bez wyświetlania alertu
            centerMapOnLocation(mapLoc);
            displayLocationMarker(mapLoc);
        } else {
            // Wyświetl alert tylko gdy lokalizacja NIE jest na mapie i nie ma pokemonów
            alert(window.i18n ? window.i18n.t(showOnlyRepel ? "pokesearch.noPokemonAtLocationWithRepel" : "pokesearch.noPokemonAtLocation") : 
                 `Nie znaleziono Pokemonów w lokalizacji ${locationName}${showOnlyRepel ? " z repelem" : ""}`);
        }
        return;
    }
    
    // Sortuj Pokemony alfabetycznie
    pokemonAtLocation.sort((a, b) => a.Pokemon.localeCompare(b.Pokemon));
    
    // Stwórz panel do pokazania Pokemonów w tej lokalizacji
    displayLocationPokemonPanel(locationName, pokemonAtLocation, mapLoc);
    
    // Jeśli lokalizacja jest na mapie, wycentruj mapę i wyświetl marker
    if (isOnMap) {
        // Wycentruj mapę na tej lokalizacji
        centerMapOnLocation(mapLoc);
        
        // Wyświetl marker lokalizacji
        displayLocationMarker(mapLoc);
    }
}

// Nowa funkcja do wyświetlania markera lokalizacji
function displayLocationMarker(mapLoc) {
    // Możliwe dodanie prostego markera lokalizacji (opcjonalne)
    const map = document.getElementById('map');
    
    // Pobierz współrzędne
    const x = mapLoc.map_pos[0];
    const y = mapLoc.map_pos[1];
    
    // Stwórz marker lokalizacji
    const marker = document.createElement('div');
    marker.className = 'location-marker';
    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;
    marker.style.width = '16px';
    marker.style.height = '16px';
    marker.style.backgroundColor = 'rgba(255, 204, 0, 0.7)';
    marker.style.border = '2px solid rgba(255, 255, 255, 0.8)';
    marker.style.borderRadius = '50%';
    marker.style.position = 'absolute';
    marker.style.transform = 'translate(-50%, -50%)';
    marker.style.zIndex = '9';
    marker.style.boxShadow = '0 0 8px rgba(255, 204, 0, 0.7)';
    
    map.appendChild(marker);
    
    // Dodaj marker do listy ikon Pokemonów, aby był usuwany razem z nimi
    pokemonIcons.push(marker);
}

// Zmodyfikowana funkcja wyświetlania panelu lokalizacji Pokemonów
function displayLocationPokemonPanel(locationName, pokemonList, mapLoc) {
    // Stwórz element panelu
    const panel = document.createElement('div');
    panel.className = 'pokemon-locations-panel location-pokemon-panel';
    document.getElementById('map-container').appendChild(panel);
    
    // Sprawdź, czy lokalizacja jest na mapie
    const isOnMap = mapLoc && mapLoc.map_pos;
    
    // Ustaw tytuł wyświetlania
    const displayName = (mapLoc && mapLoc.tooltip) ? mapLoc.tooltip : locationName;
    
    // Stwórz zawartość panelu
    panel.innerHTML = `
        <div class="pokemon-locations-header">
            <h3>${displayName}${!isOnMap ? ' <span class="location-not-on-map-badge" title="' + (window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Lokalizacja nie znajduje się na mapie') + '">!</span>' : ''}</h3>
            <span class="close-locations-panel">&times;</span>
        </div>
        <div class="pokemon-locations-content">
            <p class="pokemon-locations-title">${window.i18n ? window.i18n.t("pokesearch.pokemonAtLocation") : "Pokemony dostępne w tej lokalizacji:"}</p>
            <ul class="pokemon-locations-list">
                ${pokemonList.map(pokemon => {
                    return `<li data-pokemon="${pokemon.Pokemon}" data-monster-id="${pokemon.MonsterID}" title="${window.i18n ? window.i18n.t("pokesearch.clickToShowInfo") : 'Kliknij aby wyświetlić informacje'}">
                        <div class="pokemon-location-name">
                            <img src="resources/pokemons/${pokemon.MonsterID}.png" class="pokemon-mini-icon" alt="${pokemon.Pokemon}" onerror="this.src='resources/pokemons/default-poke.png'">
                            ${pokemon.Pokemon}
                        </div>
                        <div class="pokemon-location-icons">${createLocationIconsHTML(pokemon)}</div>
                    </li>`;
                }).join('')}
            </ul>
        </div>
    `;
    
    // Dodaj event listener do przycisku zamykania
    panel.querySelector('.close-locations-panel').addEventListener('click', function() {
        panel.remove();
        clearOnlyPokemonIcons();
    });
    
    // Dodaj event listenery do elementów Pokemonów
    panel.querySelectorAll('.pokemon-locations-list li').forEach(item => {
        item.addEventListener('click', function() {
            const pokemonName = this.dataset.pokemon;
            const pokemonData = pokemonList.find(p => p.Pokemon === pokemonName);
            
            if (pokemonData) {
                if (isOnMap) {
                    // Jeśli lokalizacja jest na mapie, wyświetl ikonę Pokemona
                    clearPokemonIconsExceptMarker();
                    const pokemonIcon = createPokemonIcon(pokemonData, mapLoc);
                    
                    // Dodaj animację do nowo utworzonej ikony
                    setTimeout(() => {
                        pokemonIcon.style.animation = 'pokemon-pulse 0.8s ease-in-out 2';
                    }, 10);
                }
                
                // Pokaż tooltip z informacjami o Pokemonie niezależnie od tego, czy lokalizacja jest na mapie
                const rect = this.getBoundingClientRect();
                displayPokemonTooltip(pokemonData, rect.right, rect.top);
            }
        });
    });
    
    // Włącz przewijanie kółkiem myszy w zawartości lokalizacji
    const locationsContent = panel.querySelector('.pokemon-locations-content');
    locationsContent.addEventListener('wheel', function(e) {
        e.stopPropagation();
        e.preventDefault();
        const delta = e.deltaY || e.detail || e.wheelDelta;
        const scrollAmount = delta > 0 ? 40 : -40;
        this.scrollTop += scrollAmount;
        return false;
    }, { passive: false });
}

// Nowa funkcja do czyszczenia ikon Pokemonów, ale zachowania markera lokalizacji
function clearPokemonIconsExceptMarker() {
    // Usuń tylko elementy, które nie są markerem lokalizacji
    const iconsToRemove = pokemonIcons.filter(icon => !icon.classList.contains('location-marker'));
    
    iconsToRemove.forEach(icon => {
        if (icon && icon.parentNode) {
            icon.parentNode.removeChild(icon);
        }
    });
    
    // Zaktualizuj tablicę pokemonIcons, zachowując tylko marker lokalizacji
    pokemonIcons = pokemonIcons.filter(icon => icon.classList.contains('location-marker'));
    
    // Ukryj tooltip jeśli widoczny
    const tooltip = document.querySelector('.pokemon-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// Funkcja do wyświetlania Pokemonów według przedmiotu
function displayPokemonsByItem(itemName) {
    console.log(`Szukam Pokemonów z przedmiotem: ${itemName}`);
    
    // Znajdź wszystkie Pokemony z tym przedmiotem
    let pokemonWithItem = allPokemonData.filter(entry => entry.Item === itemName);
    
    // Sprawdź czy filtr repela jest aktywny
    const repelFilter = document.getElementById('repel-filter-checkbox');
    const showOnlyRepel = repelFilter && repelFilter.checked;
    
    // Filtruj Pokemony jeśli filtr repela jest aktywny
    if (showOnlyRepel) {
        pokemonWithItem = pokemonWithItem.filter(poke => poke.RequiresRepel);
    }
    
    if (pokemonWithItem.length === 0) {
        alert(window.i18n ? window.i18n.t(showOnlyRepel ? "pokesearch.noPokemonWithItemAndRepel" : "pokesearch.noPokemonWithItem") : 
             `Nie znaleziono Pokemonów z przedmiotem ${itemName}${showOnlyRepel ? " i z repelem" : ""}`);
        return;
    }
    
    // Wyczyść poprzednie ikony Pokemonów
    clearOnlyPokemonIcons();
    
    // Usuń istniejące panele
    const existingItemPanel = document.querySelector('.item-pokemon-panel');
    if (existingItemPanel) {
        existingItemPanel.remove();
    }
    
    const existingPanel = document.querySelector('.pokemon-locations-panel');
    if (existingPanel) {
        existingPanel.remove();
    }
    
    const existingLocationPanel = document.querySelector('.location-pokemon-panel');
    if (existingLocationPanel) {
        existingLocationPanel.remove();
    }
    
    // Stwórz panel do pokazania Pokemonów z tym przedmiotem
    displayItemPokemonPanel(itemName, pokemonWithItem);
}

// Funkcja wyświetlająca panel z Pokemonami posiadającymi przedmiot
function displayItemPokemonPanel(itemName, pokemonList) {
    // Stwórz element panelu
    const panel = document.createElement('div');
    panel.className = 'pokemon-locations-panel item-pokemon-panel';
    document.getElementById('map-container').appendChild(panel);
    
    // Pobierz obraz przedmiotu
    const itemImageSrc = `resources/items/${itemName}.png`;
    
    // Przygotuj listę Pokemonów z informacją o dostępności na mapie
    const pokemonWithAvailability = pokemonList.map(pokemon => {
        const mapLoc = findMapLocation(pokemon.Map);
        const isOnMap = mapLoc && mapLoc.map_pos;
        return {
            pokemon: pokemon,
            isOnMap: isOnMap,
            mapLoc: mapLoc
        };
    });
    
    // Sortuj - najpierw dostępne na mapie
    pokemonWithAvailability.sort((a, b) => {
        if (a.isOnMap && !b.isOnMap) return -1;
        if (!a.isOnMap && b.isOnMap) return 1;
        // Jeśli oba są na mapie lub oba nie są na mapie, sortuj alfabetycznie po Pokemonie
        return a.pokemon.Pokemon.localeCompare(b.pokemon.Pokemon);
    });
    
    // Stwórz zawartość panelu
    panel.innerHTML = `
        <div class="pokemon-locations-header">
            <h3>
                <img src="${itemImageSrc}" class="item-icon" alt="${itemName}" onerror="this.src='resources/items/default-item.png'" style="width: 32px; height: 32px; margin-right: 10px;">
                ${itemName}
            </h3>
            <span class="close-locations-panel">&times;</span>
        </div>
        <div class="pokemon-locations-content">
            <p class="pokemon-locations-title">${window.i18n ? window.i18n.t("pokesearch.pokemonWithItem") : "Pokemony z przedmiotem:"}</p>
            <ul class="pokemon-locations-list">
                ${pokemonWithAvailability.map(item => {
                    return `<li data-pokemon="${item.pokemon.Pokemon}" data-location="${item.pokemon.Map}" class="${item.isOnMap ? '' : 'not-on-map'}" title="${item.isOnMap ? window.i18n ? window.i18n.t("pokesearch.clickToCenter") : 'Kliknij aby wycentrować mapę' : window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Lokalizacja nie znajduje się na mapie'}">
                        <div class="pokemon-location-name">
                            <img src="resources/pokemons/${item.pokemon.MonsterID}.png" class="pokemon-mini-icon" alt="${item.pokemon.Pokemon}" onerror="this.src='resources/pokemons/default-poke.png'">
                            ${item.pokemon.Pokemon}
                        </div>
                        <div class="pokemon-location-details">
                            <span class="pokemon-location-map">${item.pokemon.Map}</span>
                            <div class="pokemon-location-icons">${createLocationIconsHTML(item.pokemon)}</div>
                        </div>
                    </li>`;
                }).join('')}
            </ul>
        </div>
    `;
    
    // Dodaj event listener do przycisku zamykania
    panel.querySelector('.close-locations-panel').addEventListener('click', function() {
        panel.remove();
        clearOnlyPokemonIcons();
    });
    
    // Dodaj event listenery do elementów Pokemonów
    panel.querySelectorAll('.pokemon-locations-list li').forEach(item => {
        item.addEventListener('click', function() {
            // Nie dodawaj akcji dla lokalizacji, których nie ma na mapie
            if (this.classList.contains('not-on-map')) {
                alert(window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Lokalizacja nie znajduje się na mapie');
                return;
            }
            
            const pokemonName = this.dataset.pokemon;
            const locationName = this.dataset.location;
            const pokemonInfo = pokemonWithAvailability.find(p => 
                p.pokemon.Pokemon === pokemonName && p.pokemon.Map === locationName
            );
            
            if (pokemonInfo && pokemonInfo.isOnMap && pokemonInfo.mapLoc) {
                // Wycentruj mapę na tej lokalizacji
                centerMapOnLocation(pokemonInfo.mapLoc);
                
                // Wyczyść poprzednie ikony i pokaż tylko ikonę tego Pokemona
                clearOnlyPokemonIcons();
                const pokemonIcon = createPokemonIcon(pokemonInfo.pokemon, pokemonInfo.mapLoc);
                
                // Dodaj animację do ikony
                setTimeout(() => {
                    pokemonIcon.style.animation = 'pokemon-pulse 0.8s ease-in-out 2';
                }, 10);
                
                // Pokaż tooltip z informacjami o Pokemonie
                const rect = this.getBoundingClientRect();
                displayPokemonTooltip(pokemonInfo.pokemon, rect.right, rect.top);
            }
        });
    });
    
    // Włącz przewijanie kółkiem myszy w zawartości
    const locationsContent = panel.querySelector('.pokemon-locations-content');
    locationsContent.addEventListener('wheel', function(e) {
        e.stopPropagation();
        e.preventDefault();
        const delta = e.deltaY || e.detail || e.wheelDelta;
        const scrollAmount = delta > 0 ? 40 : -40;
        this.scrollTop += scrollAmount;
        return false;
    }, { passive: false });
}