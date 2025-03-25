let allPokemonData = [];
let pokemonIcons = [];
let uniquePokemonNames = new Set();
let uniqueItems = new Set();
let uniqueLocationNames = new Set();
let currentPokemonName = null; // Track current Pokemon being displayed

let sortDirections = {
    'az': true, // true = A-Z, false = Z-A
    'level': true, // true = najniższy-najwyższy, false = najwyższy-najniższy
    'item': true, // true = bez itema-z itemem, false = z itemem-bez itema
    'location': true, // true = A-Z, false = Z-A
    'tier': true
};

async function initPokemonSearch() {
    console.log("Initializing Pokemon search functionality...");

    try {
        await loadPokemonData();

        const searchInput = document.getElementById('pokemon-search');
        const resultsContainer = document.getElementById('pokemon-search-results');

        if (!searchInput || !resultsContainer) {
            console.error("HTML elements for Pokemon search not found");
            return;
        }

        setupPokemonSearchEvents(searchInput, resultsContainer);

        addRepelFilterCheckbox();

        if (window.i18n) {
            const title = document.querySelector('.pokemon-search-container h3');
            if (title) {
                title.textContent = window.i18n.t('pokesearch.pokemonTitle');
            }

            if (searchInput) {
                searchInput.placeholder = window.i18n.t('pokesearch.pokemonPlaceholder');
            }

            window.i18n.onLanguageChange((newLang) => {
                console.log("Language changed to: " + newLang + ", updating Pokemon panel...");
            
                if (currentPokemonName) {
                    const locationsPanel = document.querySelector('.pokemon-locations-panel');
                    if (locationsPanel) {
                        refreshPokemonPanel(currentPokemonName);
                    }
                }
            
                const locationPanel = document.querySelector('.location-pokemon-panel');
                if (locationPanel) {
                    const locationName = locationPanel.querySelector('.pokemon-locations-header h3').textContent.trim();
                    if (locationName) {
                        const mapLoc = findMapLocation(locationName);
                        if (mapLoc) {
                            displayPokemonsByLocation(mapLoc.tooltip || locationName);
                        }
                    }
                }
            
                const itemPanel = document.querySelector('.item-pokemon-panel');
                if (itemPanel) {
                    const itemName = itemPanel.querySelector('.pokemon-locations-header h3').textContent.trim();
                    if (itemName) {
                        displayPokemonsByItem(itemName);
                    }
                }
                updateSortButtonsText();
            });
        }

        console.log("Pokemon search initialization completed successfully.");
    } catch (error) {
        console.error("Error initializing Pokemon search:", error);
    }
}

function extractUniqueLocations() {
    const uniqueLocations = new Set();
    allPokemonData.forEach(entry => {
        if (entry.Map) {
            uniqueLocations.add(entry.Map);
        }
    });
    return uniqueLocations;
}

function createDaytimeIconsHTML(daytimeArray) {
    if (!daytimeArray || daytimeArray.length !== 3) return '';

    let html = '';
    if (daytimeArray[0]) {
        html += `<img src="resources/morning.webp" class="pokemon-location-icon" title="${window.i18n ? window.i18n.t('pokemon.morning') : 'Morning'}" alt="Morning">`;
    }
    if (daytimeArray[1]) {
        html += `<img src="resources/day.webp" class="pokemon-location-icon" title="${window.i18n ? window.i18n.t('pokemon.day') : 'Day'}" alt="Day">`;
    }
    if (daytimeArray[2]) {
        html += `<img src="resources/night.webp" class="pokemon-location-icon" title="${window.i18n ? window.i18n.t('pokemon.night') : 'Night'}" alt="Night">`;
    }

    return html;
}

function createTierIconHTML(tier, pokemonLocation) {
    if (!tier) return '';

    let tierDisplayText = tier;

    // Dodaj informacje o liczbie pokemonów w tierze jeśli dostępne
    const tierInfo = getTierDistribution(pokemonLocation);
    if (tierInfo) {
      tierDisplayText = `${tier} (${tierInfo.tierCount}/${tierInfo.totalCount})`;
    }

    return `<img src="resources/${tier.toLowerCase()}.webp" class="pokemon-location-icon" title="${tierDisplayText}" alt="${tier}" onerror="this.style.display='none'">`;
}

function createItemIconHTML(item) {
    if (!item) return '';
    return `<img src="resources/items/${item}.webp" class="pokemon-location-icon pokemon-item-icon" title="${item}" alt="${item}" onerror="this.style.display='none'">`;
}

function createSourceIconHTML(source) {
    if (!source) return '';
    const iconName = source === 'land' ? 'land.webp' : 'surf.webp';
    const title = source === 'land' ? (window.i18n ? window.i18n.t('pokemon.landSpawn') : 'Land Spawn') : (window.i18n ? window.i18n.t('pokemon.waterSpawn') : 'Water Spawn');
    return `<span class="pokemon-spawn-type"><img src="resources/${iconName}" class="pokemon-location-icon pokemon-source-icon" title="${title}" alt="${title}"></span>`;
}

function createMembershipIconHTML(isMemberOnly) {
    if (!isMemberOnly) return '';
    return `<img src="resources/membership.webp" class="pokemon-location-icon pokemon-membership-icon" title="${window.i18n ? window.i18n.t('pokemon.memberOnly') : 'Member Only'}" alt="Member Only">`;
}

function createFishingIconHTML(fishingOnly, requiredRod) {
    if (!fishingOnly) return '';
    const rodTitle = requiredRod ? requiredRod : (window.i18n ? window.i18n.t('pokemon.fishingRequired') : 'Fishing Required');
    return `<img src="resources/fishing.webp" class="pokemon-location-icon pokemon-fishing-icon" title="${rodTitle}" alt="Fishing">`;
}

function createRepelIconHTML(requiresRepel) {
    if (!requiresRepel) return '';
    return `<img src="resources/repel.webp" class="pokemon-location-icon pokemon-repel-icon" title="${window.i18n ? window.i18n.t('pokemon.repelRequired') : 'Repel Required'}" alt="Repel">`;
}

function createLocationIconsHTML(pokemonLocation) {
  let iconsHTML = '';

  // Dodanie ikony tiera (pozostaje bez zmian)
  iconsHTML += createTierIconHTML(pokemonLocation.Tier, pokemonLocation);

  // Dodanie źródła (land/surf)
  iconsHTML += createSourceIconHTML(pokemonLocation.Source);
  
  // Dodanie nowego elementu z informacją o tierze tekstowo
  const tierInfo = getTierDistribution(pokemonLocation);
  if (tierInfo && pokemonLocation.Tier) {
    const tierClass = `tier-${pokemonLocation.Tier.toLowerCase()}`;
    iconsHTML += `<span class="pokemon-tier-info ${tierClass}" title="${window.i18n ? window.i18n.t('pokemon.tierDistribution', {count: tierInfo.tierCount, total: tierInfo.totalCount, tier: pokemonLocation.Tier}) || `${pokemonLocation.Tier} Pokemon: ${tierInfo.tierCount}/${tierInfo.totalCount}` : `${pokemonLocation.Tier} Pokemon: ${tierInfo.tierCount}/${tierInfo.totalCount}`}">${tierInfo.tierCount}/${tierInfo.totalCount}</span>`;
  }

  iconsHTML += createFishingIconHTML(pokemonLocation.FishingOnly, pokemonLocation.RequiredRod);

  iconsHTML += createRepelIconHTML(pokemonLocation.RequiresRepel);

  iconsHTML += createItemIconHTML(pokemonLocation.Item);

  iconsHTML += createMembershipIconHTML(pokemonLocation.MemberOnly);

  iconsHTML += createDaytimeIconsHTML(pokemonLocation.Daytime);

  return iconsHTML;
}

// Funkcja do obliczania liczby pokemonów w danym tierze dla konkretnego pokemona
function getTierDistribution(pokemonData) {
    if (!pokemonData.Map || !pokemonData.Tier || !pokemonData.Source) {
      return null;
    }
    
    const sameLocationAndSource = allPokemonData.filter(
      entry => entry.Map === pokemonData.Map && 
               entry.Source === pokemonData.Source
    );
    
    const totalPokemon = sameLocationAndSource.length;
    const sameTier = sameLocationAndSource.filter(entry => entry.Tier === pokemonData.Tier);
    const sameTierCount = sameTier.length;
    
    return {
      tierCount: sameTierCount,
      totalCount: totalPokemon,
      percentage: Math.round((sameTierCount / totalPokemon) * 100)
    };
}
  
// Funkcja do formatowania wyświetlania tierów
function formatTierDisplay(pokemonData) {
  const tierInfo = getTierDistribution(pokemonData);
  if (!tierInfo) return '';
  
  const tierName = pokemonData.Tier;
  return `${tierName} (${tierInfo.tierCount}/${tierInfo.totalCount})`;
}

function sortLocationsByDefault(locationsArray, ascending) {
    locationsArray.sort((a, b) => {
        if (a.isOnMap && !b.isOnMap) return -1;
        if (!a.isOnMap && b.isOnMap) return 1;
        
        const compareResult = a.location.Map.localeCompare(b.location.Map);
        return ascending ? compareResult : -compareResult;
    });
}

function sortLocationsByLevel(locationsArray, ascending) {
    locationsArray.sort((a, b) => {
        if (a.isOnMap && !b.isOnMap) return -1;
        if (!a.isOnMap && b.isOnMap) return 1;
        
        const aMinLevel = a.location.MinLVL || 0;
        const bMinLevel = b.location.MinLVL || 0;
        
        if (aMinLevel !== bMinLevel) {
            return ascending ? (aMinLevel - bMinLevel) : (bMinLevel - aMinLevel);
        }
        
        const aMaxLevel = a.location.MaxLVL || 0;
        const bMaxLevel = b.location.MaxLVL || 0;
        
        if (aMaxLevel !== bMaxLevel) {
            return ascending ? (aMaxLevel - bMaxLevel) : (bMaxLevel - aMaxLevel);
        }
        
        return a.location.Map.localeCompare(b.location.Map);
    });
}

function sortLocationsByItem(locationsArray, ascending) {
    locationsArray.sort((a, b) => {
        if (a.isOnMap && !b.isOnMap) return -1;
        if (!a.isOnMap && b.isOnMap) return 1;
        
        const aHasItem = a.location.Item ? 1 : 0;
        const bHasItem = b.location.Item ? 1 : 0;
        
        if (aHasItem !== bHasItem) {
            return ascending ? (aHasItem - bHasItem) : (bHasItem - aHasItem);
        }
        
        return a.location.Map.localeCompare(b.location.Map);
    });
}

function sortLocationsByTierCount(locationsArray, ascending) {
    locationsArray.sort((a, b) => {
        if (a.isOnMap && !b.isOnMap) return -1;
        if (!a.isOnMap && b.isOnMap) return 1;
        
        const tierInfoA = getTierDistribution(a.location);
        const tierInfoB = getTierDistribution(b.location);
        
        const tierCountA = tierInfoA ? tierInfoA.tierCount : 0;
        const tierCountB = tierInfoB ? tierInfoB.tierCount : 0;
        
        if (tierCountA !== tierCountB) {
            return ascending ? (tierCountA - tierCountB) : (tierCountB - tierCountA);
        }
        
        return a.location.Map.localeCompare(b.location.Map);
    });
}

function refreshPokemonPanel(pokemonName) {
    currentPokemonName = pokemonName;

    let locations = allPokemonData.filter(entry => entry.Pokemon === pokemonName);

    const repelFilter = document.getElementById('repel-filter-checkbox');
    const showOnlyRepel = repelFilter && repelFilter.checked;

    if (showOnlyRepel) {
        locations = locations.filter(loc => loc.RequiresRepel);
    }

    if (locations.length === 0) {
        const locationsPanel = document.querySelector('.pokemon-locations-panel');
        if (locationsPanel) {
            locationsPanel.remove();
        }

        if (showOnlyRepel) {
            alert(window.i18n ? window.i18n.t("pokesearch.noPokemonFoundWithRepel") : 
                 `No locations found for ${pokemonName} with repel`);
        }
        return;
    }

    const locationsPanel = document.querySelector('.pokemon-locations-panel');
    if (!locationsPanel) {
        return;
    }

    const monsterID = locations[0].MonsterID;
    const pokemonImageSrc = `resources/pokemons/${monsterID}.webp`;

    const locationsWithAvailability = locations.map(loc => {
        const mapLoc = findMapLocation(loc.Map);
        const isOnMap = mapLoc && mapLoc.map_pos;
        return {
            location: loc,
            isOnMap: isOnMap,
            mapLoc: mapLoc
        };
    });

    sortLocationsByDefault(locationsWithAvailability, true);

    // Aktualizacja lub inicjalizacja sortDirections
    if (!sortDirections) {
        sortDirections = {
            'az': true,
            'level': true,
            'item': true,
            'location': true,
            'tier': true
        };
    } else {
        // Upewnij się, że sortDirections ma wszystkie potrzebne klucze
        sortDirections.tier = sortDirections.tier !== undefined ? sortDirections.tier : true;
    }

    // Aktualizuj UI panelu
    refreshPokemonPanelUI(locationsPanel, locationsWithAvailability);

    clearOnlyPokemonIcons();
    displayAllPokemonIcons(pokemonName, locations);
}

function updateSortButtonsText() {
    // Aktualizacja tekstu na przyciskach sortowania
    const sortAzButtons = document.querySelectorAll('.sort-button.sort-az');
    const sortLevelButtons = document.querySelectorAll('.sort-button.sort-level');
    const sortItemButtons = document.querySelectorAll('.sort-button.sort-item');
    const sortLocationButtons = document.querySelectorAll('.sort-button.sort-location');
    const sortTierButtons = document.querySelectorAll('.sort-button.sort-tier');
    
    if (window.i18n) {
        sortAzButtons.forEach(btn => {
            btn.textContent = window.i18n.t('pokesearch.sortAZ');
        });
        
        sortLevelButtons.forEach(btn => {
            btn.textContent = window.i18n.t('pokesearch.sortLevel');
        });
        
        sortItemButtons.forEach(btn => {
            btn.textContent = window.i18n.t('pokesearch.sortItem');
        });
        
        sortLocationButtons.forEach(btn => {
            btn.textContent = window.i18n.t('pokesearch.sortLocation');
        });
        
        sortTierButtons.forEach(btn => {
            btn.textContent = window.i18n.t('pokesearch.sortTier');
        });
    }
}

function refreshPokemonPanelUI(locationsPanel, locationsWithAvailability) {
    // Sprawdź, czy panel istnieje
    if (!locationsPanel) return;
    
    // Znajdź nagłówek panelu i pozostaw go bez zmian
    const headerHTML = locationsPanel.querySelector('.pokemon-locations-header').outerHTML;
    
    // Pobierz aktywny przycisk sortowania i jego stan (rosnąco/malejąco)
    let activeSort = 'az';
    let isSortDescending = false;
    
    const activeButton = locationsPanel.querySelector('.sort-button.active');
    if (activeButton) {
        activeSort = activeButton.dataset.sort;
        isSortDescending = activeButton.classList.contains('descending');
    }
    
    // Zbuduj HTML dla przycisków sortowania
    const sortButtonsHTML = `
        <div class="pokemon-sort-options">
            <button class="sort-button sort-az ${activeSort === 'az' ? 'active' : ''} ${activeSort === 'az' && isSortDescending ? 'descending' : ''}" data-sort="az">${window.i18n ? window.i18n.t("pokesearch.sortAZ") : "A-Z"}</button>
            <button class="sort-button sort-level ${activeSort === 'level' ? 'active' : ''} ${activeSort === 'level' && isSortDescending ? 'descending' : ''}" data-sort="level">${window.i18n ? window.i18n.t("pokesearch.sortLevel") : "Level"}</button>
            <button class="sort-button sort-item ${activeSort === 'item' ? 'active' : ''} ${activeSort === 'item' && isSortDescending ? 'descending' : ''}" data-sort="item">${window.i18n ? window.i18n.t("pokesearch.sortItem") : "Has Item"}</button>
            <button class="sort-button sort-tier ${activeSort === 'tier' ? 'active' : ''} ${activeSort === 'tier' && isSortDescending ? 'descending' : ''}" data-sort="tier">${window.i18n ? window.i18n.t("pokesearch.sortTier") : "Tier Count"}</button>
        </div>
    `;
    
    // Buduj HTML dla listy lokalizacji
    const locationsListHTML = `
        <ul class="pokemon-locations-list" id="pokemon-locations-list">
            ${locationsWithAvailability.map(item => {
                const levelRange = item.location.MinLVL && item.location.MaxLVL ? 
                    ` (${item.location.MinLVL}-${item.location.MaxLVL})` : '';
                return `<li data-location="${item.location.Map}" class="${item.isOnMap ? '' : 'not-on-map'}" title="${item.isOnMap ? window.i18n ? window.i18n.t("pokesearch.clickToCenter") : 'Click to center map' : window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Location not on map'}"
                    data-min-level="${item.location.MinLVL || 0}" data-max-level="${item.location.MaxLVL || 0}" data-has-item="${item.location.Item ? '1' : '0'}">
                    <div class="pokemon-location-name">${item.location.Map}${levelRange}</div>
                    <div class="pokemon-location-icons">${createLocationIconsHTML(item.location)}</div>
                </li>`;
            }).join('')}
        </ul>
    `;
    
    // Zaktualizuj zawartość panelu
    locationsPanel.innerHTML = `
        ${headerHTML}
        <div class="pokemon-locations-content">
            <p class="pokemon-locations-title">${window.i18n ? window.i18n.t("pokesearch.locationsTitle") : "This Pokemon can be found in these locations:"}</p>
            ${sortButtonsHTML}
            ${locationsListHTML}
        </div>
    `;
    
    // Podłącz zdarzenia do przycisków i elementów listy
    attachPokemonPanelEvents(locationsPanel, locationsWithAvailability);
}

function attachPokemonPanelEvents(panel, locationsWithAvailability) {
    // Podłącz zdarzenie zamykania
    const closeButton = panel.querySelector('.close-locations-panel');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            panel.remove();
            currentPokemonName = null;
            clearOnlyPokemonIcons();
        });
    }
    
    // Podłącz zdarzenia do elementów listy
    panel.querySelectorAll('.pokemon-locations-list li').forEach(item => {
        item.addEventListener('click', function() {
            const locationName = this.dataset.location;
            const locationInfo = locationsWithAvailability.find(l => l.location.Map === locationName);

            if (locationInfo && locationInfo.isOnMap) {
                centerMapOnLocation(locationInfo.mapLoc, true);
                highlightPokemonLocation(locationInfo.location, locationInfo.mapLoc);
            } else {
                alert(window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : "Location not on map");
            }
        });
    });
    
    // Podłącz zdarzenia do przycisków sortowania
    const sortButtons = panel.querySelectorAll('.sort-button');
    sortButtons.forEach(button => {
        button.addEventListener('click', function() {
            const sortType = this.dataset.sort;

            if (this.classList.contains('active')) {
                sortDirections[sortType] = !sortDirections[sortType];
                if (sortDirections[sortType]) {
                    this.classList.remove('descending');
                } else {
                    this.classList.add('descending');
                }
            } else {
                sortButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.classList.remove('descending');
                });
                this.classList.add('active');
                sortDirections[sortType] = true;
            }
            
            // Zastosuj odpowiednie sortowanie
            if (sortType === 'az') {
                sortLocationsByDefault(locationsWithAvailability, sortDirections.az);
            } else if (sortType === 'level') {
                sortLocationsByLevel(locationsWithAvailability, sortDirections.level);
            } else if (sortType === 'item') {
                sortLocationsByItem(locationsWithAvailability, sortDirections.item);
            } else if (sortType === 'tier') {
                sortLocationsByTierCount(locationsWithAvailability, sortDirections.tier);
            }
            
            // Zaktualizuj listę po sortowaniu
            const list = panel.querySelector('#pokemon-locations-list');
            
            list.innerHTML = locationsWithAvailability.map(item => {
                const levelRange = item.location.MinLVL && item.location.MaxLVL ? 
                    ` (${item.location.MinLVL}-${item.location.MaxLVL})` : '';
                return `<li data-location="${item.location.Map}" class="${item.isOnMap ? '' : 'not-on-map'}" title="${item.isOnMap ? window.i18n ? window.i18n.t("pokesearch.clickToCenter") : 'Click to center map' : window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Location not on map'}"
                    data-min-level="${item.location.MinLVL || 0}" data-max-level="${item.location.MaxLVL || 0}" data-has-item="${item.location.Item ? '1' : '0'}">
                    <div class="pokemon-location-name">${item.location.Map}${levelRange}</div>
                    <div class="pokemon-location-icons">${createLocationIconsHTML(item.location)}</div>
                </li>`;
            }).join('');
            
            // Podłącz zdarzenia kliknięcia do nowo utworzonych elementów listy
            list.querySelectorAll('li').forEach(item => {
                item.addEventListener('click', function() {
                    const locationName = this.dataset.location;
                    const locationInfo = locationsWithAvailability.find(l => l.location.Map === locationName);
        
                    if (locationInfo && locationInfo.isOnMap) {
                        centerMapOnLocation(locationInfo.mapLoc, true);
                        highlightPokemonLocation(locationInfo.location, locationInfo.mapLoc);
                    } else {
                        alert(window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : "Location not on map");
                    }
                });
            });
        });
    });
    
    // Obsługa scrolla
    const locationsContent = panel.querySelector('.pokemon-locations-content');
    if (locationsContent) {
        locationsContent.addEventListener('wheel', function(e) {
            e.stopPropagation();
            e.preventDefault();

            const delta = e.deltaY || e.detail || e.wheelDelta;
            const scrollAmount = delta > 0 ? 40 : -40;

            this.scrollTop += scrollAmount;

            return false;
        }, { passive: false });
    }
}

async function loadPokemonData() {
    try {
        let landData = [];
        try {
            const landResponse = await fetch('data/land_spawns.json');
            if (!landResponse.ok) {
                throw new Error(`HTTP error! status: ${landResponse.status}`);
            }
            landData = await landResponse.json();
            landData = landData.map(entry => ({
                ...entry,
                Source: 'land'
            }));
            console.log(`Loaded ${landData.length} land spawns`);
        } catch (error) {
            console.error("Error loading land data:", error);
        }

        let surfData = [];
        try {
            const surfResponse = await fetch('data/surf_spawns.json');
            if (!surfResponse.ok) {
                throw new Error(`HTTP error! status: ${surfResponse.status}`);
            }
            surfData = await surfResponse.json();
            surfData = surfData.map(entry => ({
                ...entry,
                Source: 'surf'
            }));
            console.log(`Loaded ${surfData.length} water spawns`);
        } catch (error) {
            console.error("Error loading water data:", error);
        }

        allPokemonData = [...landData, ...surfData];

        const locationsWithoutMap = allPokemonData.filter(entry => !entry.Map);
        if (locationsWithoutMap.length > 0) {
            console.warn(`Found ${locationsWithoutMap.length} entries without a specified map`);
        }

        uniquePokemonNames = new Set();
        allPokemonData.forEach(entry => {
            if (entry.Pokemon) {
                uniquePokemonNames.add(entry.Pokemon);
            }
        });

        uniqueItems = new Set();
        allPokemonData.forEach(entry => {
            if (entry.Item) {
                uniqueItems.add(entry.Item);
            }
        });
        console.log(`Found ${uniqueItems.size} unique items.`);

        uniqueLocationNames = extractUniqueLocations();
        console.log(`Found ${uniqueLocationNames.size} unique locations in the data.`);

        allPokemonData = identifyRepelRequiredPokemon(allPokemonData);

        console.log(`Loaded data for ${uniquePokemonNames.size} unique Pokemon appearing in ${allPokemonData.length} locations.`);

    } catch (error) {
        console.error("Error loading Pokemon data:", error);
        throw error;
    }
}

function identifyRepelRequiredPokemon(allPokemonData) {
    const pokemonByMapAndSource = {};

    allPokemonData.forEach(pokemon => {
        if (!pokemon.Map) return; // Skip if no map

        const key = `${pokemon.Map}|${pokemon.Source || 'unknown'}`;

        if (!pokemonByMapAndSource[key]) {
            pokemonByMapAndSource[key] = [];
        }

        pokemonByMapAndSource[key].push(pokemon);
    });

    for (const key in pokemonByMapAndSource) {
        const [mapName, source] = key.split('|');
        const mapPokemons = pokemonByMapAndSource[key];

        if (!mapPokemons.some(p => p.MinLVL !== undefined && p.MaxLVL !== undefined)) {
            continue;
        }

        mapPokemons.forEach(pokemon => {
            pokemon.RequiresRepel = false;
        });

        const pokemonsWithLevels = mapPokemons.filter(p => 
            p.MinLVL !== undefined && p.MaxLVL !== undefined
        );

        if (pokemonsWithLevels.length > 0) {
            const firstMin = pokemonsWithLevels[0].MinLVL;
            const firstMax = pokemonsWithLevels[0].MaxLVL;

            const allSameLevel = pokemonsWithLevels.every(p => 
                p.MinLVL === firstMin && p.MaxLVL === firstMax
            );

            if (allSameLevel) {
                continue;
            }
        }


        const highestMinLevel = Math.max(
            ...mapPokemons
                .filter(p => p.MinLVL !== undefined)
                .map(p => p.MinLVL)
        );

        const potentialRepelPokemon = mapPokemons.filter(p => 
            p.MinLVL !== undefined && p.MinLVL === highestMinLevel
        );

        const nonRepelPokemon = mapPokemons.filter(p => 
            !potentialRepelPokemon.includes(p) && p.MaxLVL !== undefined
        );

        const maxNonRepelLevel = nonRepelPokemon.length > 0 
            ? Math.max(...nonRepelPokemon.map(p => p.MaxLVL))
            : 0;

        let repelCount = 0;
        potentialRepelPokemon.forEach(pokemon => {
            if (pokemon.MinLVL > maxNonRepelLevel) {
                pokemon.RequiresRepel = true;
                repelCount++;
            }
        });

        const MAX_REPEL_POKEMON = 4;
        if (repelCount > MAX_REPEL_POKEMON) {
            mapPokemons.forEach(pokemon => {
                pokemon.RequiresRepel = false;
            });
            repelCount = 0;
        }

        if (repelCount > 0) {
            const repelPokemonNames = mapPokemons
                .filter(p => p.RequiresRepel)
                .map(p => `${p.Pokemon} (${p.MinLVL}-${p.MaxLVL})`)
                .join(', ');

        }
    }

    const repelCount = allPokemonData.filter(p => p.RequiresRepel).length;

    return allPokemonData;
}

function isItemWithRepel(itemName) {
    return allPokemonData.some(entry => 
        entry.Item === itemName && entry.RequiresRepel
    );
}

function isLocationWithRepel(locationName) {
    return allPokemonData.some(entry => 
        entry.Map === locationName && entry.RequiresRepel
    );
}

function isPokemonWithRepel(pokemonName) {
    return allPokemonData.some(entry => 
        entry.Pokemon === pokemonName && entry.RequiresRepel
    );
}
function addRepelFilterCheckbox() {
    const checkbox = document.getElementById('repel-filter-checkbox');
    if (!checkbox) {
        console.warn("Repel filter checkbox not found in HTML");
        return null;
    }

    const label = checkbox.nextElementSibling;
    if (label && window.i18n) {
        label.textContent = window.i18n.t('pokesearch.showOnlyRepel');
    }

    checkbox.addEventListener('change', function() {
        const searchInput = document.getElementById('pokemon-search');

        if (currentPokemonName) {
            displayPokemonLocations(currentPokemonName);
        }


        if (searchInput.value) {
            const event = new Event('input');
            searchInput.dispatchEvent(event);
        } else {
            showInitialSuggestions();
        }
    });

    return checkbox;
}

function showInitialSuggestions() {
    const searchInput = document.getElementById('pokemon-search');
    const resultsContainer = document.getElementById('pokemon-search-results');

    if (!searchInput || !resultsContainer) return;

    const repelFilter = document.getElementById('repel-filter-checkbox');
    const showOnlyRepel = repelFilter && repelFilter.checked;

    let pokemonOptions = Array.from(uniquePokemonNames);
    let locationOptions = Array.from(uniqueLocationNames);
    let itemOptions = Array.from(uniqueItems);

    if (showOnlyRepel) {
        pokemonOptions = pokemonOptions.filter(name => isPokemonWithRepel(name));
        locationOptions = locationOptions.filter(name => isLocationWithRepel(name));
        itemOptions = itemOptions.filter(name => isItemWithRepel(name));
    }

    pokemonOptions.sort();
    locationOptions.sort();
    itemOptions.sort();

    resultsContainer.innerHTML = '';

    if (pokemonOptions.length === 0 && locationOptions.length === 0 && itemOptions.length === 0) {
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        resultItem.textContent = window.i18n ? window.i18n.t('pokesearch.noResults') : 'No results found';
        resultsContainer.appendChild(resultItem);
        resultsContainer.style.display = 'block';
        return;
    }

    if (pokemonOptions.length > 0) {
        const pokemonHeader = document.createElement('div');
        pokemonHeader.className = 'search-result-header';
        pokemonHeader.textContent = window.i18n ? window.i18n.t('pokesearch.pokemon') : 'Pokemon:';
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

    if (locationOptions.length > 0) {
        const locationHeader = document.createElement('div');
        locationHeader.className = 'search-result-header';
        locationHeader.textContent = window.i18n ? window.i18n.t('pokesearch.locations') : 'Locations:';
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

    if (itemOptions.length > 0) {
        const itemHeader = document.createElement('div');
        itemHeader.className = 'search-result-header';
        itemHeader.textContent = window.i18n ? window.i18n.t('pokesearch.items') : 'Items:';
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

    resultsContainer.style.display = 'block';

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

        const repelFilter = document.getElementById('repel-filter-checkbox');
        const showOnlyRepel = repelFilter && repelFilter.checked;

        let matchingPokemon = Array.from(uniquePokemonNames)
            .filter(name => name.toLowerCase().includes(searchText));

        if (showOnlyRepel) {
            matchingPokemon = matchingPokemon.filter(name => isPokemonWithRepel(name));
        }

        const mapLocations = window.locations
            ? window.locations
                .filter(loc => {
                    const tooltip = loc.tooltip ? loc.tooltip.toLowerCase() : '';
                    const map = loc.map ? loc.map.toLowerCase() : '';
                    return tooltip.includes(searchText) || map.includes(searchText);
                })
                .map(loc => loc.tooltip || loc.map)
            : [];

        let dataLocations = Array.from(uniqueLocationNames)
            .filter(loc => loc.toLowerCase().includes(searchText));

        if (showOnlyRepel) {
            dataLocations = dataLocations.filter(name => isLocationWithRepel(name));
        }

        let allMatchingLocations = [...new Set([...mapLocations, ...dataLocations])];

        if (showOnlyRepel) {
            allMatchingLocations = allMatchingLocations.filter(name => isLocationWithRepel(name));
        }

        let matchingItems = Array.from(uniqueItems)
            .filter(item => item.toLowerCase().includes(searchText));

        if (showOnlyRepel) {
            matchingItems = matchingItems.filter(name => isItemWithRepel(name));
        }

        resultsContainer.innerHTML = '';

        if (matchingPokemon.length === 0 && allMatchingLocations.length === 0 && matchingItems.length === 0) {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.textContent = window.i18n ? window.i18n.t('pokesearch.noResults') : 'No results found';
            resultsContainer.appendChild(resultItem);
        } else {
            if (matchingItems.length > 0) {
                const itemHeader = document.createElement('div');
                itemHeader.className = 'search-result-header';
                itemHeader.textContent = window.i18n ? window.i18n.t('pokesearch.items') : 'Items:';
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

            if (allMatchingLocations.length > 0) {
                const locationHeader = document.createElement('div');
                locationHeader.className = 'search-result-header';
                locationHeader.textContent = window.i18n ? window.i18n.t('pokesearch.locations') : 'Locations:';
                resultsContainer.appendChild(locationHeader);

                const sortedLocations = [...allMatchingLocations].sort((a, b) => {
                    const aOnMap = mapLocations.includes(a);
                    const bOnMap = mapLocations.includes(b);
                    if (aOnMap && !bOnMap) return -1;
                    if (!aOnMap && bOnMap) return 1;
                    return a.localeCompare(b);
                });

                sortedLocations.slice(0, 8).forEach(locationName => {
                    const isOnMap = mapLocations.includes(locationName);

                    const resultItem = document.createElement('div');
                    resultItem.className = `search-result-item location-result ${isOnMap ? '' : 'not-on-map-result'}`;
                    resultItem.textContent = locationName;

                    if (!isOnMap) {
                        resultItem.title = window.i18n ? window.i18n.t('pokesearch.locationNotOnMap') : 'Location not on map';
                    }

                    resultItem.addEventListener('click', function() {
                        searchInput.value = locationName;
                        resultsContainer.style.display = 'none';
                        displayPokemonsByLocation(locationName);
                    });

                    resultsContainer.appendChild(resultItem);
                });
            }

            if (matchingPokemon.length > 0) {
                const pokemonHeader = document.createElement('div');
                pokemonHeader.className = 'search-result-header';
                pokemonHeader.textContent = window.i18n ? window.i18n.t('pokesearch.pokemon') : 'Pokemon:';
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

    console.log(`Searching for locations for Pokemon: ${pokemonName}`);

    currentPokemonName = pokemonName;

    let locations = allPokemonData.filter(entry => entry.Pokemon === pokemonName);

    const repelFilter = document.getElementById('repel-filter-checkbox');
    const showOnlyRepel = repelFilter && repelFilter.checked;

    if (showOnlyRepel) {
        locations = locations.filter(loc => loc.RequiresRepel);
    }

    if (locations.length === 0) {
        alert(window.i18n ? window.i18n.t(showOnlyRepel ? "pokesearch.noPokemonFoundWithRepel" : "pokesearch.noPokemonFound") : 
             `No locations found for ${pokemonName}${showOnlyRepel ? " with repel" : ""}`);
        return;
    }

    console.log(`Found ${locations.length} locations for ${pokemonName}`);

    const existingPanel = document.querySelector('.pokemon-locations-panel');
    if (existingPanel) {
        existingPanel.remove();
    }

    const locationsPanel = document.createElement('div');
    locationsPanel.className = 'pokemon-locations-panel';
    document.getElementById('map-container').appendChild(locationsPanel);

    const monsterID = locations[0].MonsterID;
    const pokemonImageSrc = `resources/pokemons/${monsterID}.webp`;

    const locationsWithAvailability = locations.map(loc => {
        const mapLoc = findMapLocation(loc.Map);
        const isOnMap = mapLoc && mapLoc.map_pos;
        return {
            location: loc,
            isOnMap: isOnMap,
            mapLoc: mapLoc
        };
    });

    sortLocationsByDefault(locationsWithAvailability, true);

    sortDirections = {
        'az': true,
        'level': true,
        'item': true,
        'location': true,
        'tier': true
    };

    locationsPanel.innerHTML = `
        <div class="pokemon-locations-header">
            <h3>
                <img src="${pokemonImageSrc}" alt="${pokemonName}" onerror="this.src='resources/pokemons/default-poke.webp'">
                ${pokemonName}
            </h3>
            <span class="close-locations-panel">&times;</span>
        </div>
        <div class="pokemon-locations-content">
            <p class="pokemon-locations-title">${window.i18n ? window.i18n.t("pokesearch.locationsTitle") : "This Pokemon can be found in these locations:"}</p>
            <div class="pokemon-sort-options">
                <button class="sort-button sort-az active" data-sort="az">${window.i18n ? window.i18n.t("pokesearch.sortAZ") : "A-Z"}</button>
                <button class="sort-button sort-level" data-sort="level">${window.i18n ? window.i18n.t("pokesearch.sortLevel") : "Level"}</button>
                <button class="sort-button sort-item" data-sort="item">${window.i18n ? window.i18n.t("pokesearch.sortItem") : "Has Item"}</button>
                <button class="sort-button sort-tier" data-sort="tier">${window.i18n ? window.i18n.t("pokesearch.sortTier") : "Tier Count"}</button>
            </div>
            <ul class="pokemon-locations-list" id="pokemon-locations-list">
                ${locationsWithAvailability.map(item => {
                    const levelRange = item.location.MinLVL && item.location.MaxLVL ? 
                        ` (${item.location.MinLVL}-${item.location.MaxLVL})` : '';
                    return `<li data-location="${item.location.Map}" class="${item.isOnMap ? '' : 'not-on-map'}" title="${item.isOnMap ? window.i18n ? window.i18n.t("pokesearch.clickToCenter") : 'Click to center map' : window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Location not on map'}"
                        data-min-level="${item.location.MinLVL || 0}" data-max-level="${item.location.MaxLVL || 0}" data-has-item="${item.location.Item ? '1' : '0'}">
                        <div class="pokemon-location-name">${item.location.Map}${levelRange}</div>
                        <div class="pokemon-location-icons">${createLocationIconsHTML(item.location)}</div>
                    </li>`;
                }).join('')}
            </ul>
        </div>
    `;

    locationsPanel.querySelector('.close-locations-panel').addEventListener('click', function() {
        locationsPanel.remove();
        currentPokemonName = null; // Clear current Pokemon when panel is closed
        clearOnlyPokemonIcons();
    });

    locationsPanel.querySelectorAll('.pokemon-locations-list li').forEach(item => {
        item.addEventListener('click', function() {
            const locationName = this.dataset.location;
            const locationInfo = locationsWithAvailability.find(l => l.location.Map === locationName);

            if (locationInfo && locationInfo.isOnMap) {
                centerMapOnLocation(locationInfo.mapLoc, true);
                highlightPokemonLocation(locationInfo.location, locationInfo.mapLoc);
            } else {
                alert(window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : "Location not on map");
            }
        });
    });

    const sortButtons = locationsPanel.querySelectorAll('.sort-button');
    sortButtons.forEach(button => {
        button.addEventListener('click', function() {
            const sortType = this.dataset.sort;

            if (this.classList.contains('active')) {
                sortDirections[sortType] = !sortDirections[sortType];
                if (sortDirections[sortType]) {
                    this.classList.remove('descending');
                } else {
                    this.classList.add('descending');
                }
            } else {
                sortButtons.forEach(btn => {
                    btn.classList.remove('active');
                    btn.classList.remove('descending');
                });
                this.classList.add('active');
                sortDirections[sortType] = true;
            }
            
            if (sortType === 'az') {
                sortLocationsByDefault(locationsWithAvailability, sortDirections.az);
            } else if (sortType === 'level') {
                sortLocationsByLevel(locationsWithAvailability, sortDirections.level);
            } else if (sortType === 'item') {
                sortLocationsByItem(locationsWithAvailability, sortDirections.item);
            } else if (sortType === 'tier') {
                sortLocationsByTierCount(locationsWithAvailability, sortDirections.tier);
            }
            
            const list = locationsPanel.querySelector('#pokemon-locations-list');
            
            list.innerHTML = locationsWithAvailability.map(item => {
                const levelRange = item.location.MinLVL && item.location.MaxLVL ? 
                    ` (${item.location.MinLVL}-${item.location.MaxLVL})` : '';
                return `<li data-location="${item.location.Map}" class="${item.isOnMap ? '' : 'not-on-map'}" title="${item.isOnMap ? window.i18n ? window.i18n.t("pokesearch.clickToCenter") : 'Click to center map' : window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Location not on map'}"
                    data-min-level="${item.location.MinLVL || 0}" data-max-level="${item.location.MaxLVL || 0}" data-has-item="${item.location.Item ? '1' : '0'}">
                    <div class="pokemon-location-name">${item.location.Map}${levelRange}</div>
                    <div class="pokemon-location-icons">${createLocationIconsHTML(item.location)}</div>
                </li>`;
            }).join('');
            
            list.querySelectorAll('li').forEach(item => {
                item.addEventListener('click', function() {
                    const locationName = this.dataset.location;
                    const locationInfo = locationsWithAvailability.find(l => l.location.Map === locationName);
        
                    if (locationInfo && locationInfo.isOnMap) {
                        centerMapOnLocation(locationInfo.mapLoc, true);
                        highlightPokemonLocation(locationInfo.location, locationInfo.mapLoc);
                    } else {
                        alert(window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : "Location not on map");
                    }
                });
            });
        });
    });

    displayAllPokemonIcons(pokemonName, locations);

    const locationsContent = locationsPanel.querySelector('.pokemon-locations-content');
    locationsContent.addEventListener('wheel', function(e) {
        e.stopPropagation();
        e.preventDefault();

        const delta = e.deltaY || e.detail || e.wheelDelta;
        const scrollAmount = delta > 0 ? 40 : -40;

        this.scrollTop += scrollAmount;

        return false;
    }, { passive: false });  // The passive: false is crucial for preventDefault to work
}

function highlightPokemonLocation(pokemonLocation, mapLoc) {
    const existingIcons = pokemonIcons.filter(icon => {
        const leftPos = parseInt(icon.style.left);
        const topPos = parseInt(icon.style.top);
        return leftPos === mapLoc.map_pos[0] && topPos === mapLoc.map_pos[1];
    });

    if (existingIcons.length > 0) {
        existingIcons.forEach(icon => {
            icon.style.animation = 'none'; // Reset animation
            setTimeout(() => {
                icon.style.animation = 'pokemon-pulse 0.8s ease-in-out 2';
            }, 10);
        });
    } else {
        createPokemonIcon(pokemonLocation, mapLoc);
    }
}

function clearOnlyPokemonIcons() {
    pokemonIcons.forEach(icon => {
        if (icon && icon.parentNode) {
            icon.parentNode.removeChild(icon);
        }
    });

    pokemonIcons = [];

    const tooltip = document.querySelector('.pokemon-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

function createPokemonIcon(pokemonLocation, mapLoc) {
    const map = document.getElementById('map');

    const x = mapLoc.map_pos[0];
    const y = mapLoc.map_pos[1];

    const icon = document.createElement('div');
    icon.className = 'pokemon-icon';
    icon.style.left = `${x}px`;
    icon.style.top = `${y}px`;

    icon.style.width = '42px';
    icon.style.height = '42px';

    const img = document.createElement('img');
    img.src = `resources/pokemons/${pokemonLocation.MonsterID}.webp`;
    img.alt = pokemonLocation.Pokemon;

    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.filter = 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.5))';

    img.onerror = function() {
        this.onerror = null;
        this.src = 'resources/pokemons/default-poke.webp';
    };

    icon.appendChild(img);

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

function displayAllPokemonIcons(pokemonName, pokemonLocations) {
    let foundCount = 0;

    pokemonLocations.forEach((pokemonLocation) => {
        const mapLoc = findMapLocation(pokemonLocation.Map);

        if (!mapLoc || !mapLoc.map_pos) {
            return;
        }

        foundCount++;

        createPokemonIcon(pokemonLocation, mapLoc);
    });

    console.log(`Displayed ${foundCount} out of ${pokemonLocations.length} locations for ${pokemonName}`);
}

function findMapLocation(locationName) {
    if (!window.locations || !Array.isArray(window.locations) || window.locations.length === 0) {
        console.error(`window.locations does not exist or is empty while searching: ${locationName}`);

        if (typeof locations !== 'undefined' && Array.isArray(locations) && locations.length > 0) {
            console.log(`Using local variable 'locations' instead of window.locations (found ${locations.length} locations)`);
            const location = locations.find(loc => loc.tooltip === locationName);
            if (location) return location;
        }

        return null;
    }

    let location = window.locations.find(loc => loc.tooltip === locationName);

    if (!location) {
        location = window.locations.find(loc => loc.map === locationName);
    }

    if (!location) {
        const locationLower = locationName.toLowerCase();
        location = window.locations.find(loc => 
            (loc.tooltip && loc.tooltip.toLowerCase() === locationLower) || 
            (loc.map && loc.map.toLowerCase() === locationLower)
        );
    }

    if (!location) {
        const possibleMatches = window.locations.filter(loc => 
            (loc.tooltip && loc.tooltip.includes(locationName)) ||
            (loc.map && loc.map.includes(locationName))
        );

        if (possibleMatches.length > 0) {
            console.log(`No exact match found for "${locationName}", but found ${possibleMatches.length} partial matches:`, 
                        possibleMatches.slice(0, 3).map(l => l.tooltip || l.map));
            location = possibleMatches[0]; // Use the first partial match
        }
    }

    if (!location) {
    } else {
        console.log(`Location found for: "${locationName}"`, location);
    }

    return location;
}

function clearPokemonIcons() {
    clearOnlyPokemonIcons();

    const locationsPanel = document.querySelector('.pokemon-locations-panel');
    if (locationsPanel) {
        locationsPanel.remove();
        currentPokemonName = null; // Clear current Pokemon
    }
}

function displayPokemonTooltip(pokemonData, x, y) {
    let tooltip = document.querySelector('.pokemon-tooltip');

    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'pokemon-tooltip';
        document.body.appendChild(tooltip);
    }

    let daytimeText = '';
    if (pokemonData.Daytime && pokemonData.Daytime.length === 3) {
        const dayParts = [];
        if (pokemonData.Daytime[0]) dayParts.push(window.i18n.t('pokemon.morning'));
        if (pokemonData.Daytime[1]) dayParts.push(window.i18n.t('pokemon.day'));
        if (pokemonData.Daytime[2]) dayParts.push(window.i18n.t('pokemon.night'));
        daytimeText = dayParts.join(', ');
    }

    const tierInfo = getTierDistribution(pokemonData);
    let tierText = pokemonData.Tier || (window.i18n ? window.i18n.t('pokemon.unknown') : 'Unknown');
    if (tierInfo) {
        tierText = `${tierText} (${tierInfo.tierCount}/${tierInfo.totalCount})`;
    }

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
                    <td><strong>${window.i18n ? window.i18n.t('pokemon.rarityLevel') : 'Rarity Level'}:</strong></td>
                    <td>${tierText}</td>
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

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = window.innerWidth <= 768; // Check if it's a mobile device

    if (isMobile) {
        const tooltipWidth = Math.min(300, viewportWidth * 0.85);
        tooltip.style.width = `${tooltipWidth}px`;
        tooltip.style.maxWidth = `${tooltipWidth}px`;
        tooltip.style.left = '50%';
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';

        const closeButton = tooltip.querySelector('.close-tooltip');
        if (closeButton) {
            closeButton.style.padding = '10px';
            closeButton.style.fontSize = '24px';
        }
    } else {
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

    const closeButton = tooltip.querySelector('.close-tooltip');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            tooltip.style.display = 'none';
        });
    }

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

window.addEventListener('load', function() {
    setTimeout(function() {
        console.log("Starting Pokemon search initialization...");

        if ((window.locations && window.locations.length > 0) || 
            (typeof locations !== 'undefined' && locations.length > 0)) {
            console.log("Location data available, initializing Pokemon search");

            if (!window.locations && typeof locations !== 'undefined') {
                console.log("Assigning locations to window.locations");
                window.locations = locations;
            }
        } else {
            console.warn("Location data is not yet available, initializing search with a delay");
        }

        initPokemonSearch();
    }, 3000); // Delay 3 seconds
});

function hookIntoMapRefresh() {
    const originalRefreshMarkers = window.refreshMarkers;

    if (typeof originalRefreshMarkers === 'function') {
        window.refreshMarkers = function() {
            originalRefreshMarkers.apply(this, arguments);

            clearOnlyPokemonIcons(); // Changed to only clear icons, not the panel

            if (currentPokemonName) {
                const locations = allPokemonData.filter(entry => entry.Pokemon === currentPokemonName);
                if (locations.length > 0) {
                    displayAllPokemonIcons(currentPokemonName, locations);
                }
            }
        };

        console.log("Successfully hooked into refreshMarkers function");
    } else {
        console.warn("Cannot hook into refreshMarkers function");
    }
}

function displayPokemonsByLocation(locationName) {
    const mapLoc = findMapLocation(locationName);
    const isOnMap = mapLoc && mapLoc.map_pos;

    let pokemonAtLocation = allPokemonData.filter(entry => 
        entry.Map === locationName || 
        (mapLoc && entry.Map === mapLoc.tooltip) || 
        (mapLoc && mapLoc.map && entry.Map === mapLoc.map)
    );

    const repelFilter = document.getElementById('repel-filter-checkbox');
    const showOnlyRepel = repelFilter && repelFilter.checked;

    if (showOnlyRepel) {
        pokemonAtLocation = pokemonAtLocation.filter(poke => poke.RequiresRepel);
    }

    clearOnlyPokemonIcons();

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

    if (pokemonAtLocation.length === 0) {
        if (isOnMap) {
            centerMapOnLocation(mapLoc);
            displayLocationMarker(mapLoc);
        } else {
            alert(window.i18n ? window.i18n.t(showOnlyRepel ? "pokesearch.noPokemonAtLocationWithRepel" : "pokesearch.noPokemonAtLocation") : 
                 `No Pokemon found at location ${locationName}${showOnlyRepel ? " with repel" : ""}`);
        }
        return;
    }

    pokemonAtLocation.sort((a, b) => a.Pokemon.localeCompare(b.Pokemon));

    displayLocationPokemonPanel(locationName, pokemonAtLocation, mapLoc);

    if (isOnMap) {
        centerMapOnLocation(mapLoc, true);
    
        displayLocationMarker(mapLoc);
    }
}

function displayLocationMarker(mapLoc) {
    const map = document.getElementById('map');

    const x = mapLoc.map_pos[0];
    const y = mapLoc.map_pos[1];

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

    pokemonIcons.push(marker);
}

function displayLocationPokemonPanel(locationName, pokemonList, mapLoc) {
    const panel = document.createElement('div');
    panel.className = 'pokemon-locations-panel location-pokemon-panel';
    document.getElementById('map-container').appendChild(panel);

    const isOnMap = mapLoc && mapLoc.map_pos;

    const displayName = (mapLoc && mapLoc.tooltip) ? mapLoc.tooltip : locationName;

    sortDirections = {
        'az': true,
        'level': true,
        'item': true,
        'location': true,
        'tier': true
    };

    panel.innerHTML = `
        <div class="pokemon-locations-header">
            <h3>${displayName}${!isOnMap ? ' <span class="location-not-on-map-badge" title="' + (window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Location not on map') + '">!</span>' : ''}</h3>
            <span class="close-locations-panel">&times;</span>
        </div>
        <div class="pokemon-locations-content">
            <p class="pokemon-locations-title">${window.i18n ? window.i18n.t("pokesearch.pokemonAtLocation") : "Pokemon available at this location:"}</p>
            <div class="pokemon-sort-options">
                <button class="sort-button sort-az active" data-sort="az">${window.i18n ? window.i18n.t("pokesearch.sortAZ") : "A-Z"}</button>
                <button class="sort-button sort-level" data-sort="level">${window.i18n ? window.i18n.t("pokesearch.sortLevel") : "Level"}</button>
                <button class="sort-button sort-item" data-sort="item">${window.i18n ? window.i18n.t("pokesearch.sortItem") : "Has Item"}</button>
                <button class="sort-button sort-tier" data-sort="tier">${window.i18n ? window.i18n.t("pokesearch.sortTier") : "Tier Count"}</button>
            </div>
            <ul class="pokemon-locations-list" id="location-pokemon-list">
                ${pokemonList.map(pokemon => {
                    const levelRange = pokemon.MinLVL && pokemon.MaxLVL ? 
                        ` (${pokemon.MinLVL}-${pokemon.MaxLVL})` : '';
                    return `<li data-pokemon="${pokemon.Pokemon}" data-monster-id="${pokemon.MonsterID}" 
                        data-min-level="${pokemon.MinLVL || 0}" data-max-level="${pokemon.MaxLVL || 0}" 
                        data-has-item="${pokemon.Item ? '1' : '0'}" 
                        title="${window.i18n ? window.i18n.t("pokesearch.clickToShowInfo") : 'Click to show info'}">
                        <div class="pokemon-location-name">
                            <img src="resources/pokemons/${pokemon.MonsterID}.webp" class="pokemon-mini-icon" alt="${pokemon.Pokemon}" onerror="this.src='resources/pokemons/default-poke.webp'">
                            ${pokemon.Pokemon}${levelRange}
                        </div>
                        <div class="pokemon-location-icons">${createLocationIconsHTML(pokemon)}</div>
                    </li>`;
                }).join('')}
            </ul>
        </div>
    `;

    panel.querySelector('.close-locations-panel').addEventListener('click', function() {
        panel.remove();
        clearOnlyPokemonIcons();
    });

    panel.querySelectorAll('.pokemon-locations-list li').forEach(item => {
        item.addEventListener('click', function() {
            const pokemonName = this.dataset.pokemon;
            const pokemonData = pokemonList.find(p => p.Pokemon === pokemonName);

            if (pokemonData) {
                if (isOnMap) {
                    clearPokemonIconsExceptMarker();
                    const pokemonIcon = createPokemonIcon(pokemonData, mapLoc);

                    setTimeout(() => {
                        pokemonIcon.style.animation = 'pokemon-pulse 0.8s ease-in-out 2';
                    }, 10);
                }

                const rect = this.getBoundingClientRect();
                displayPokemonTooltip(pokemonData, rect.right, rect.top);
            }
        });
    });

    panel.querySelectorAll('.sort-button').forEach(button => {
        button.addEventListener('click', function() {
            const sortType = this.dataset.sort;
            let sortedList = [...pokemonList]; // Create a copy of the Pokemon list
            
            if (this.classList.contains('active')) {
                sortDirections[sortType] = !sortDirections[sortType];
                if (sortDirections[sortType]) {
                    this.classList.remove('descending');
                } else {
                    this.classList.add('descending');
                }
            } else {
                panel.querySelectorAll('.sort-button').forEach(btn => {
                    btn.classList.remove('active');
                    btn.classList.remove('descending');
                });
                this.classList.add('active');
                sortDirections[sortType] = true;
            }
            
            const ascending = sortDirections[sortType];
            if (sortType === 'az') {
                sortedList.sort((a, b) => {
                    const compareResult = a.Pokemon.localeCompare(b.Pokemon);
                    return ascending ? compareResult : -compareResult;
                });
            } else if (sortType === 'level') {
                sortedList.sort((a, b) => {
                    const aMinLevel = a.MinLVL || 0;
                    const bMinLevel = b.MinLVL || 0;
                    
                    if (aMinLevel !== bMinLevel) {
                        return ascending ? (aMinLevel - bMinLevel) : (bMinLevel - aMinLevel);
                    }
                    
                    const aMaxLevel = a.MaxLVL || 0;
                    const bMaxLevel = b.MaxLVL || 0;
                    
                    if (aMaxLevel !== bMaxLevel) {
                        return ascending ? (aMaxLevel - bMaxLevel) : (bMaxLevel - aMaxLevel);
                    }
                    
                    return a.Pokemon.localeCompare(b.Pokemon);
                });
            } else if (sortType === 'item') {
                sortedList.sort((a, b) => {
                    const aHasItem = a.Item ? 1 : 0;
                    const bHasItem = b.Item ? 1 : 0;
                    
                    if (aHasItem !== bHasItem) {
                        return ascending ? (aHasItem - bHasItem) : (bHasItem - aHasItem);
                    }
                    
                    return a.Pokemon.localeCompare(b.Pokemon);
                });
            }
            else if (sortType === 'tier') {
                sortedList.sort((a, b) => {
                    const tierInfoA = getTierDistribution(a.pokemon);
                    const tierInfoB = getTierDistribution(b.pokemon);
                    
                    const tierCountA = tierInfoA ? tierInfoA.tierCount : 0;
                    const tierCountB = tierInfoB ? tierInfoB.tierCount : 0;
                    
                    if (tierCountA !== tierCountB) {
                        return ascending ? (tierCountA - tierCountB) : (tierCountB - tierCountA);
                    }
                    
                    return a.pokemon.Pokemon.localeCompare(b.pokemon.Pokemon);
                });
            }
            
            const list = panel.querySelector('#location-pokemon-list');
            list.innerHTML = sortedList.map(pokemon => {
                const levelRange = pokemon.MinLVL && pokemon.MaxLVL ? 
                    ` (${pokemon.MinLVL}-${pokemon.MaxLVL})` : '';
                return `<li data-pokemon="${pokemon.Pokemon}" data-monster-id="${pokemon.MonsterID}" 
                    data-min-level="${pokemon.MinLVL || 0}" data-max-level="${pokemon.MaxLVL || 0}" 
                    data-has-item="${pokemon.Item ? '1' : '0'}" 
                    title="${window.i18n ? window.i18n.t("pokesearch.clickToShowInfo") : 'Click to show info'}">
                    <div class="pokemon-location-name">
                        <img src="resources/pokemons/${pokemon.MonsterID}.webp" class="pokemon-mini-icon" alt="${pokemon.Pokemon}" onerror="this.src='resources/pokemons/default-poke.webp'">
                        ${pokemon.Pokemon}${levelRange}
                    </div>
                    <div class="pokemon-location-icons">${createLocationIconsHTML(pokemon)}</div>
                </li>`;
            }).join('');
            
            list.querySelectorAll('li').forEach(item => {
                item.addEventListener('click', function() {
                    const pokemonName = this.dataset.pokemon;
                    const pokemonData = sortedList.find(p => p.Pokemon === pokemonName);
        
                    if (pokemonData) {
                        if (isOnMap) {
                            clearPokemonIconsExceptMarker();
                            const pokemonIcon = createPokemonIcon(pokemonData, mapLoc);
        
                            setTimeout(() => {
                                pokemonIcon.style.animation = 'pokemon-pulse 0.8s ease-in-out 2';
                            }, 10);
                        }
        
                        const rect = this.getBoundingClientRect();
                        displayPokemonTooltip(pokemonData, rect.right, rect.top);
                    }
                });
            });
        });
    });

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

function clearPokemonIconsExceptMarker() {
    const iconsToRemove = pokemonIcons.filter(icon => !icon.classList.contains('location-marker'));

    iconsToRemove.forEach(icon => {
        if (icon && icon.parentNode) {
            icon.parentNode.removeChild(icon);
        }
    });

    pokemonIcons = pokemonIcons.filter(icon => icon.classList.contains('location-marker'));

    const tooltip = document.querySelector('.pokemon-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

function displayPokemonsByItem(itemName) {
    console.log(`Searching for Pokemon with item: ${itemName}`);

    let pokemonWithItem = allPokemonData.filter(entry => entry.Item === itemName);

    const repelFilter = document.getElementById('repel-filter-checkbox');
    const showOnlyRepel = repelFilter && repelFilter.checked;

    if (showOnlyRepel) {
        pokemonWithItem = pokemonWithItem.filter(poke => poke.RequiresRepel);
    }

    if (pokemonWithItem.length === 0) {
        alert(window.i18n ? window.i18n.t(showOnlyRepel ? "pokesearch.noPokemonWithItemAndRepel" : "pokesearch.noPokemonWithItem") : 
             `No Pokemon found with item ${itemName}${showOnlyRepel ? " and with repel" : ""}`);
        return;
    }

    clearOnlyPokemonIcons();

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

    displayItemPokemonPanel(itemName, pokemonWithItem);
}

function displayItemPokemonPanel(itemName, pokemonList) {
    const panel = document.createElement('div');
    panel.className = 'pokemon-locations-panel item-pokemon-panel';
    document.getElementById('map-container').appendChild(panel);

    const itemImageSrc = `resources/items/${itemName}.webp`;

    const pokemonWithAvailability = pokemonList.map(pokemon => {
        const mapLoc = findMapLocation(pokemon.Map);
        const isOnMap = mapLoc && mapLoc.map_pos;
        return {
            pokemon: pokemon,
            isOnMap: isOnMap,
            mapLoc: mapLoc
        };
    });

    pokemonWithAvailability.sort((a, b) => {
        if (a.isOnMap && !b.isOnMap) return -1;
        if (!a.isOnMap && b.isOnMap) return 1;
        return a.pokemon.Pokemon.localeCompare(b.pokemon.Pokemon);
    });

    sortDirections = {
        'az': true,
        'level': true,
        'item': true,
        'location': true,
        'tier': true
    };

    panel.innerHTML = `
        <div class="pokemon-locations-header">
            <h3>
                <img src="${itemImageSrc}" class="item-icon" alt="${itemName}" onerror="this.src='resources/items/default-item.webp'" style="width: 32px; height: 32px; margin-right: 10px;">
                ${itemName}
            </h3>
            <span class="close-locations-panel">&times;</span>
        </div>
        <div class="pokemon-locations-content">
            <p class="pokemon-locations-title">${window.i18n ? window.i18n.t("pokesearch.pokemonWithItem") : "Pokemon with this item:"}</p>
            <div class="pokemon-sort-options">
                <button class="sort-button sort-az active" data-sort="az">${window.i18n ? window.i18n.t("pokesearch.sortAZ") : "A-Z"}</button>
                <button class="sort-button sort-level" data-sort="level">${window.i18n ? window.i18n.t("pokesearch.sortLevel") : "Level"}</button>
                <button class="sort-button sort-location" data-sort="location">${window.i18n ? window.i18n.t("pokesearch.sortLocation") : "Location"}</button>
                <button class="sort-button sort-tier" data-sort="tier">${window.i18n ? window.i18n.t("pokesearch.sortTier") : "Tier Count"}</button>
            </div>
            <ul class="pokemon-locations-list" id="item-pokemon-list">
                ${pokemonWithAvailability.map(item => {
                    const levelRange = item.pokemon.MinLVL && item.pokemon.MaxLVL ? 
                        ` (${item.pokemon.MinLVL}-${item.pokemon.MaxLVL})` : '';
                    return `<li data-pokemon="${item.pokemon.Pokemon}" data-location="${item.pokemon.Map}" 
                        class="${item.isOnMap ? '' : 'not-on-map'}" 
                        data-min-level="${item.pokemon.MinLVL || 0}" data-max-level="${item.pokemon.MaxLVL || 0}" 
                        title="${item.isOnMap ? window.i18n ? window.i18n.t("pokesearch.clickToCenter") : 'Click to center map' : window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Location not on map'}">
                        <div class="pokemon-location-name">
                            <img src="resources/pokemons/${item.pokemon.MonsterID}.webp" class="pokemon-mini-icon" alt="${item.pokemon.Pokemon}" onerror="this.src='resources/pokemons/default-poke.webp'">
                            ${item.pokemon.Pokemon}${levelRange}
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

    panel.querySelector('.close-locations-panel').addEventListener('click', function() {
        panel.remove();
        clearOnlyPokemonIcons();
    });

    panel.querySelectorAll('.pokemon-locations-list li').forEach(item => {
        item.addEventListener('click', function() {
            if (this.classList.contains('not-on-map')) {
                alert(window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Location not on map');
                return;
            }

            const pokemonName = this.dataset.pokemon;
            const locationName = this.dataset.location;
            const pokemonInfo = pokemonWithAvailability.find(p => 
                p.pokemon.Pokemon === pokemonName && p.pokemon.Map === locationName
            );

            if (pokemonInfo && pokemonInfo.isOnMap && pokemonInfo.mapLoc) {
                centerMapOnLocation(pokemonInfo.mapLoc);

                clearOnlyPokemonIcons();
                const pokemonIcon = createPokemonIcon(pokemonInfo.pokemon, pokemonInfo.mapLoc);

                setTimeout(() => {
                    pokemonIcon.style.animation = 'pokemon-pulse 0.8s ease-in-out 2';
                }, 10);

                const rect = this.getBoundingClientRect();
                displayPokemonTooltip(pokemonInfo.pokemon, rect.right, rect.top);
            }
        });
    });

    panel.querySelectorAll('.sort-button').forEach(button => {
        button.addEventListener('click', function() {
            const sortType = this.dataset.sort;
            
            if (this.classList.contains('active')) {
                sortDirections[sortType] = !sortDirections[sortType];
                if (sortDirections[sortType]) {
                    this.classList.remove('descending');
                } else {
                    this.classList.add('descending');
                }
            } else {
                panel.querySelectorAll('.sort-button').forEach(btn => {
                    btn.classList.remove('active');
                    btn.classList.remove('descending');
                });
                this.classList.add('active');
                sortDirections[sortType] = true;
            }
            
            const ascending = sortDirections[sortType];
            let sortedList = [...pokemonWithAvailability]; // Create a copy of the Pokemon list
            
            if (sortType === 'az') {
                sortedList.sort((a, b) => {
                    if (a.isOnMap && !b.isOnMap) return -1;
                    if (!a.isOnMap && b.isOnMap) return 1;
                    const compareResult = a.pokemon.Pokemon.localeCompare(b.pokemon.Pokemon);
                    return ascending ? compareResult : -compareResult;
                });
            } else if (sortType === 'level') {
                sortedList.sort((a, b) => {
                    if (a.isOnMap && !b.isOnMap) return -1;
                    if (!a.isOnMap && b.isOnMap) return 1;
                    
                    const aMinLevel = a.pokemon.MinLVL || 0;
                    const bMinLevel = b.pokemon.MinLVL || 0;
                    
                    if (aMinLevel !== bMinLevel) {
                        return ascending ? (aMinLevel - bMinLevel) : (bMinLevel - aMinLevel);
                    }
                    
                    const aMaxLevel = a.pokemon.MaxLVL || 0;
                    const bMaxLevel = b.pokemon.MaxLVL || 0;
                    
                    if (aMaxLevel !== bMaxLevel) {
                        return ascending ? (aMaxLevel - bMaxLevel) : (bMaxLevel - aMaxLevel);
                    }
                    
                    return a.pokemon.Pokemon.localeCompare(b.pokemon.Pokemon);
                });
            } else if (sortType === 'location') {
                sortedList.sort((a, b) => {
                    if (a.isOnMap && !b.isOnMap) return -1;
                    if (!a.isOnMap && b.isOnMap) return 1;
                    
                    const compareResult = a.pokemon.Map.localeCompare(b.pokemon.Map);
                    return ascending ? compareResult : -compareResult;
                });
            } else if (sortType === 'tier') {
                sortedList.sort((a, b) => {
                    if (a.isOnMap && !b.isOnMap) return -1;
                    if (!a.isOnMap && b.isOnMap) return 1;
                    
                    const tierInfoA = getTierDistribution(a.pokemon);
                    const tierInfoB = getTierDistribution(b.pokemon);
                    
                    const tierCountA = tierInfoA ? tierInfoA.tierCount : 0;
                    const tierCountB = tierInfoB ? tierInfoB.tierCount : 0;
                    
                    if (tierCountA !== tierCountB) {
                        return ascending ? (tierCountA - tierCountB) : (tierCountB - tierCountA);
                    }
                    
                    return a.pokemon.Pokemon.localeCompare(b.pokemon.Pokemon);
                });
            }
            
            const list = panel.querySelector('#item-pokemon-list');
            list.innerHTML = sortedList.map(item => {
                const levelRange = item.pokemon.MinLVL && item.pokemon.MaxLVL ? 
                    ` (${item.pokemon.MinLVL}-${item.pokemon.MaxLVL})` : '';
                return `<li data-pokemon="${item.pokemon.Pokemon}" data-location="${item.pokemon.Map}" 
                    class="${item.isOnMap ? '' : 'not-on-map'}" 
                    data-min-level="${item.pokemon.MinLVL || 0}" data-max-level="${item.pokemon.MaxLVL || 0}" 
                    title="${item.isOnMap ? window.i18n ? window.i18n.t("pokesearch.clickToCenter") : 'Click to center map' : window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Location not on map'}">
                    <div class="pokemon-location-name">
                        <img src="resources/pokemons/${item.pokemon.MonsterID}.webp" class="pokemon-mini-icon" alt="${item.pokemon.Pokemon}" onerror="this.src='resources/pokemons/default-poke.webp'">
                        ${item.pokemon.Pokemon}${levelRange}
                    </div>
                    <div class="pokemon-location-details">
                        <span class="pokemon-location-map">${item.pokemon.Map}</span>
                        <div class="pokemon-location-icons">${createLocationIconsHTML(item.pokemon)}</div>
                    </div>
                </li>`;
            }).join('');
            
            list.querySelectorAll('li').forEach(item => {
                item.addEventListener('click', function() {
                    if (this.classList.contains('not-on-map')) {
                        alert(window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Location not on map');
                        return;
                    }
        
                    const pokemonName = this.dataset.pokemon;
                    const locationName = this.dataset.location;
                    const pokemonInfo = sortedList.find(p => 
                        p.pokemon.Pokemon === pokemonName && p.pokemon.Map === locationName
                    );
        
                    if (pokemonInfo && pokemonInfo.isOnMap && pokemonInfo.mapLoc) {
                        centerMapOnLocation(pokemonInfo.mapLoc);
        
                        clearOnlyPokemonIcons();
                        const pokemonIcon = createPokemonIcon(pokemonInfo.pokemon, pokemonInfo.mapLoc);
        
                        setTimeout(() => {
                            pokemonIcon.style.animation = 'pokemon-pulse 0.8s ease-in-out 2';
                        }, 10);
        
                        const rect = this.getBoundingClientRect();
                        displayPokemonTooltip(pokemonInfo.pokemon, rect.right, rect.top);
                    }
                });
            });
        });
    });

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

document.addEventListener('DOMContentLoaded', function() {
    const style = document.createElement('style');
    style.textContent = `
        .pokemon-sort-options {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
            padding: 5px;
            background-color: rgba(0, 0, 0, 0.05);
            border-radius: 4px;
        }
        
        .sort-button {
            padding: 4px 8px;
            border: 1px solid #ccc;
            background-color: #f5f5f5;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
        }
        
        .sort-button:hover {
            background-color: #e0e0e0;
        }
        
        .sort-button.active {
            background-color: #4a90e2;
            color: white;
            border-color: #2a70c2;
        }
        
        .sort-button.active.descending::after {
            content: " ▼";
            font-size: 10px;
        }
        
        .sort-button.active:not(.descending)::after {
            content: " ▲";
            font-size: 10px;
        }
        
        /* Styl dla informacji o poziomie */
        .pokemon-location-name {
            display: flex;
            align-items: center;
            gap: 5px;
        }
    `;
    document.head.appendChild(style);
});