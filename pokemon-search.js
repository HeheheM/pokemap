let allPokemonData = [];
let pokemonIcons = [];
let uniquePokemonNames = new Set();
let uniqueItems = new Set();
let uniqueLocationNames = new Set();
let currentPokemonName = null; // Track current Pokemon being displayed

async function initPokemonSearch() {
    console.log("Initializing Pokemon search functionality...");

    try {
        // Load Pokemon data
        await loadPokemonData();

        // Get references to HTML elements
        const searchInput = document.getElementById('pokemon-search');
        const resultsContainer = document.getElementById('pokemon-search-results');

        // Check if elements exist
        if (!searchInput || !resultsContainer) {
            console.error("HTML elements for Pokemon search not found");
            return;
        }

        // Set up event listeners
        setupPokemonSearchEvents(searchInput, resultsContainer);

        // Add repel filter checkbox
        addRepelFilterCheckbox();

        // Apply translations
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

                // Refresh location panel if open
                const locationPanel = document.querySelector('.location-pokemon-panel');
                if (locationPanel) {
                    const locationName = locationPanel.querySelector('.pokemon-locations-header h3').textContent.trim();
                    if (locationName) {
                        // Find location and refresh
                        const mapLoc = findMapLocation(locationName);
                        if (mapLoc) {
                            displayPokemonsByLocation(mapLoc.tooltip || locationName);
                        }
                    }
                }

                // Refresh item panel if open
                const itemPanel = document.querySelector('.item-pokemon-panel');
                if (itemPanel) {
                    const itemName = itemPanel.querySelector('.pokemon-locations-header h3').textContent.trim();
                    if (itemName) {
                        displayPokemonsByItem(itemName);
                    }
                }
            });
        }

        console.log("Pokemon search initialization completed successfully.");
    } catch (error) {
        console.error("Error initializing Pokemon search:", error);
    }
}

// Function to extract unique location names
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
        html += `<img src="resources/morning.png" class="pokemon-location-icon" title="${window.i18n ? window.i18n.t('pokemon.morning') : 'Morning'}" alt="Morning">`;
    }
    if (daytimeArray[1]) {
        html += `<img src="resources/day.png" class="pokemon-location-icon" title="${window.i18n ? window.i18n.t('pokemon.day') : 'Day'}" alt="Day">`;
    }
    if (daytimeArray[2]) {
        html += `<img src="resources/night.png" class="pokemon-location-icon" title="${window.i18n ? window.i18n.t('pokemon.night') : 'Night'}" alt="Night">`;
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
                 `No locations found for ${pokemonName} with repel`);
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
            <p class="pokemon-locations-title">${window.i18n ? window.i18n.t("pokesearch.locationsTitle") : "This Pokemon can be found in these locations:"}</p>
            <ul class="pokemon-locations-list">
                ${locationsWithAvailability.map(item => {
                    return `<li data-location="${item.location.Map}" class="${item.isOnMap ? '' : 'not-on-map'}" title="${item.isOnMap ? window.i18n ? window.i18n.t("pokesearch.clickToCenter") : 'Click to center map' : window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Location not on map'}">
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
                alert(window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : "Location not on map");
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
        // Load land spawns
        let landData = [];
        try {
            const landResponse = await fetch('data/land_spawns.json');
            if (!landResponse.ok) {
                throw new Error(`HTTP error! status: ${landResponse.status}`);
            }
            landData = await landResponse.json();
            // Add source property to each land spawn
            landData = landData.map(entry => ({
                ...entry,
                Source: 'land'
            }));
            console.log(`Loaded ${landData.length} land spawns`);
        } catch (error) {
            console.error("Error loading land data:", error);
        }

        // Load water spawns
        let surfData = [];
        try {
            const surfResponse = await fetch('data/surf_spawns.json');
            if (!surfResponse.ok) {
                throw new Error(`HTTP error! status: ${surfResponse.status}`);
            }
            surfData = await surfResponse.json();
            // Add source property to each surf spawn
            surfData = surfData.map(entry => ({
                ...entry,
                Source: 'surf'
            }));
            console.log(`Loaded ${surfData.length} water spawns`);
        } catch (error) {
            console.error("Error loading water data:", error);
        }

        // Combine data
        allPokemonData = [...landData, ...surfData];

        // Add logging for locations without a map
        const locationsWithoutMap = allPokemonData.filter(entry => !entry.Map);
        if (locationsWithoutMap.length > 0) {
            console.warn(`Found ${locationsWithoutMap.length} entries without a specified map`);
        }

        // Extract unique Pokemon names for autocomplete
        uniquePokemonNames = new Set();
        allPokemonData.forEach(entry => {
            if (entry.Pokemon) {
                uniquePokemonNames.add(entry.Pokemon);
            }
        });

        // Extract unique items
        uniqueItems = new Set();
        allPokemonData.forEach(entry => {
            if (entry.Item) {
                uniqueItems.add(entry.Item);
            }
        });
        console.log(`Found ${uniqueItems.size} unique items.`);

        // Extract unique location names
        uniqueLocationNames = extractUniqueLocations();
        console.log(`Found ${uniqueLocationNames.size} unique locations in the data.`);

        // Identify Pokemon that require repel
        allPokemonData = identifyRepelRequiredPokemon(allPokemonData);

        console.log(`Loaded data for ${uniquePokemonNames.size} unique Pokemon appearing in ${allPokemonData.length} locations.`);

    } catch (error) {
        console.error("Error loading Pokemon data:", error);
        throw error;
    }
}

function identifyRepelRequiredPokemon(allPokemonData) {
    // Group Pokemon by location (Map) and Source (land/surf)
    const pokemonByMapAndSource = {};

    allPokemonData.forEach(pokemon => {
        if (!pokemon.Map) return; // Skip if no map

        // Key is a combination of map and source (land/surf)
        const key = `${pokemon.Map}|${pokemon.Source || 'unknown'}`;

        if (!pokemonByMapAndSource[key]) {
            pokemonByMapAndSource[key] = [];
        }

        pokemonByMapAndSource[key].push(pokemon);
    });

    // For each location and source, identify Pokemon requiring repel
    for (const key in pokemonByMapAndSource) {
        const [mapName, source] = key.split('|');
        const mapPokemons = pokemonByMapAndSource[key];

        // Skip if there are no Pokemon with levels
        if (!mapPokemons.some(p => p.MinLVL !== undefined && p.MaxLVL !== undefined)) {
            continue;
        }

        // Mark all Pokemon as not requiring repel initially
        mapPokemons.forEach(pokemon => {
            pokemon.RequiresRepel = false;
        });

        // Check if all Pokemon have the same level range
        const pokemonsWithLevels = mapPokemons.filter(p => 
            p.MinLVL !== undefined && p.MaxLVL !== undefined
        );

        if (pokemonsWithLevels.length > 0) {
            const firstMin = pokemonsWithLevels[0].MinLVL;
            const firstMax = pokemonsWithLevels[0].MaxLVL;

            const allSameLevel = pokemonsWithLevels.every(p => 
                p.MinLVL === firstMin && p.MaxLVL === firstMax
            );

            // If all Pokemon have the same level range, skip repel identification
            if (allSameLevel) {
                // console.log(`In ${mapName} (${source}) all Pokemon have the same level range (${firstMin}-${firstMax}), none require repel.`);
                continue;
            }
        }

        // Two-step algorithm to solve the recursion problem:

        // 1. Find the highest minimum level in the location
        const highestMinLevel = Math.max(
            ...mapPokemons
                .filter(p => p.MinLVL !== undefined)
                .map(p => p.MinLVL)
        );

        // 2. Temporarily mark all Pokemon with the highest minimum level as potential repels
        const potentialRepelPokemon = mapPokemons.filter(p => 
            p.MinLVL !== undefined && p.MinLVL === highestMinLevel
        );

        // 3. Find the maximum level of all Pokemon that are not potential repels
        const nonRepelPokemon = mapPokemons.filter(p => 
            !potentialRepelPokemon.includes(p) && p.MaxLVL !== undefined
        );

        const maxNonRepelLevel = nonRepelPokemon.length > 0 
            ? Math.max(...nonRepelPokemon.map(p => p.MaxLVL))
            : 0;

        // 4. For each potential repel, check if its minimum level exceeds the maximum level of non-repels
        let repelCount = 0;
        potentialRepelPokemon.forEach(pokemon => {
            if (pokemon.MinLVL > maxNonRepelLevel) {
                pokemon.RequiresRepel = true;
                repelCount++;
            }
        });

        // 5. If the algorithm identified more than 4 repels for a given location,
        // it is most likely a location without repels with similar level ranges
        const MAX_REPEL_POKEMON = 4;
        if (repelCount > MAX_REPEL_POKEMON) {
            // console.log(`Too many repel Pokemon (${repelCount}) in ${mapName} (${source}), resetting all repel flags.`);
            mapPokemons.forEach(pokemon => {
                pokemon.RequiresRepel = false;
            });
            repelCount = 0;
        }

        // Logging results
        if (repelCount > 0) {
            const repelPokemonNames = mapPokemons
                .filter(p => p.RequiresRepel)
                .map(p => `${p.Pokemon} (${p.MinLVL}-${p.MaxLVL})`)
                .join(', ');

            // console.log(`Pokemon requiring repel in ${mapName} (${source}): ${repelPokemonNames}. Max level of others: ${maxNonRepelLevel}`);
        }
    }

    // Count Pokemon requiring repel
    const repelCount = allPokemonData.filter(p => p.RequiresRepel).length;
    // console.log(`Found ${repelCount} Pokemon requiring repel out of ${allPokemonData.length} total entries.`);

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
        console.warn("Repel filter checkbox not found in HTML");
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

        // If currently displaying a Pokemon, location, or item, refresh
        if (currentPokemonName) {
            displayPokemonLocations(currentPokemonName);
        }

        // Optionally clear the search field
        // searchInput.value = '';

        // Simulate a click event to refresh suggestions
        if (searchInput.value) {
            const event = new Event('input');
            searchInput.dispatchEvent(event);
        } else {
            // If the field is empty, show default suggestions
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
        resultItem.textContent = window.i18n ? window.i18n.t('pokesearch.noResults') : 'No results found';
        resultsContainer.appendChild(resultItem);
        resultsContainer.style.display = 'block';
        return;
    }

    // Add Pokemon suggestions
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

    // Add location suggestions
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

    // Add item suggestions
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

        // Check if repel filter is active
        const repelFilter = document.getElementById('repel-filter-checkbox');
        const showOnlyRepel = repelFilter && repelFilter.checked;

        // Search for matching Pokemon names
        let matchingPokemon = Array.from(uniquePokemonNames)
            .filter(name => name.toLowerCase().includes(searchText));

        // If repel filter is active, filter Pokemon further
        if (showOnlyRepel) {
            matchingPokemon = matchingPokemon.filter(name => isPokemonWithRepel(name));
        }

        // Search for matching location names in window.locations (on map)
        const mapLocations = window.locations
            ? window.locations
                .filter(loc => {
                    const tooltip = loc.tooltip ? loc.tooltip.toLowerCase() : '';
                    const map = loc.map ? loc.map.toLowerCase() : '';
                    return tooltip.includes(searchText) || map.includes(searchText);
                })
                .map(loc => loc.tooltip || loc.map)
            : [];

        // Search for matching location names in all Pokemon data
        let dataLocations = Array.from(uniqueLocationNames)
            .filter(loc => loc.toLowerCase().includes(searchText));

        // Filter locations if repel is active
        if (showOnlyRepel) {
            dataLocations = dataLocations.filter(name => isLocationWithRepel(name));
        }

        // Combine both location lists and remove duplicates
        let allMatchingLocations = [...new Set([...mapLocations, ...dataLocations])];

        // Filter locations if repel is active
        if (showOnlyRepel) {
            allMatchingLocations = allMatchingLocations.filter(name => isLocationWithRepel(name));
        }

        // Search for matching items
        let matchingItems = Array.from(uniqueItems)
            .filter(item => item.toLowerCase().includes(searchText));

        // Filter items if repel is active
        if (showOnlyRepel) {
            matchingItems = matchingItems.filter(name => isItemWithRepel(name));
        }

        // Prepare results
        resultsContainer.innerHTML = '';

        // No results
        if (matchingPokemon.length === 0 && allMatchingLocations.length === 0 && matchingItems.length === 0) {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.textContent = window.i18n ? window.i18n.t('pokesearch.noResults') : 'No results found';
            resultsContainer.appendChild(resultItem);
        } else {
            // Add item results with header
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

            // Add location results with header
            if (allMatchingLocations.length > 0) {
                const locationHeader = document.createElement('div');
                locationHeader.className = 'search-result-header';
                locationHeader.textContent = window.i18n ? window.i18n.t('pokesearch.locations') : 'Locations:';
                resultsContainer.appendChild(locationHeader);

                // First sort locations - those on the map first
                const sortedLocations = [...allMatchingLocations].sort((a, b) => {
                    const aOnMap = mapLocations.includes(a);
                    const bOnMap = mapLocations.includes(b);
                    if (aOnMap && !bOnMap) return -1;
                    if (!aOnMap && bOnMap) return 1;
                    return a.localeCompare(b);
                });

                sortedLocations.slice(0, 8).forEach(locationName => {
                    // Check if location is on map
                    const isOnMap = mapLocations.includes(locationName);

                    const resultItem = document.createElement('div');
                    resultItem.className = `search-result-item location-result ${isOnMap ? '' : 'not-on-map-result'}`;
                    resultItem.textContent = locationName;

                    // Add icon only for locations on the map
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

            // Add Pokemon results with header
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

    console.log(`Searching for locations for Pokemon: ${pokemonName}`);

    // Save the current Pokemon name
    currentPokemonName = pokemonName;

    // Get all locations where this Pokemon appears
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
             `No locations found for ${pokemonName}${showOnlyRepel ? " with repel" : ""}`);
        return;
    }

    console.log(`Found ${locations.length} locations for ${pokemonName}`);

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
            <p class="pokemon-locations-title">${window.i18n ? window.i18n.t("pokesearch.locationsTitle") : "This Pokemon can be found in these locations:"}</p>
            <ul class="pokemon-locations-list">
                ${locationsWithAvailability.map(item => {
                    return `<li data-location="${item.location.Map}" class="${item.isOnMap ? '' : 'not-on-map'}" title="${item.isOnMap ? window.i18n ? window.i18n.t("pokesearch.clickToCenter") : 'Click to center map' : window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Location not on map'}">
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
                centerMapOnLocation(locationInfo.mapLoc, true);
                // Don't clear other icons, just highlight this one with an animation
                highlightPokemonLocation(locationInfo.location, locationInfo.mapLoc);
            } else {
                alert(window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : "Location not on map");
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

    // Hide tooltip if visible
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

    console.log(`Displayed ${foundCount} out of ${pokemonLocations.length} locations for ${pokemonName}`);
}

function findMapLocation(locationName) {
    // Check if window.locations exists and has data
    if (!window.locations || !Array.isArray(window.locations) || window.locations.length === 0) {
        console.error(`window.locations does not exist or is empty while searching: ${locationName}`);

        // Try to use the local variable locations, if available in the global scope
        if (typeof locations !== 'undefined' && Array.isArray(locations) && locations.length > 0) {
            console.log(`Using local variable 'locations' instead of window.locations (found ${locations.length} locations)`);
            const location = locations.find(loc => loc.tooltip === locationName);
            if (location) return location;
        }

        return null;
    }

    // First search for an exact match using the tooltip field
    let location = window.locations.find(loc => loc.tooltip === locationName);

    // If not found, try matching using the map field
    if (!location) {
        location = window.locations.find(loc => loc.map === locationName);
    }

    // If still not found, try a more flexible version - ignore case
    if (!location) {
        const locationLower = locationName.toLowerCase();
        location = window.locations.find(loc => 
            (loc.tooltip && loc.tooltip.toLowerCase() === locationLower) || 
            (loc.map && loc.map.toLowerCase() === locationLower)
        );
    }

    // If still not found, check if we have a partial match
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

    // If still not found, log the information
    if (!location) {
        // console.warn(`Location not found for: "${locationName}"`);
    } else {
        console.log(`Location found for: "${locationName}"`, location);
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
    // Check if tooltip already exists or create a new one
    let tooltip = document.querySelector('.pokemon-tooltip');

    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'pokemon-tooltip';
        document.body.appendChild(tooltip);
    }

    // Create daytime text
    let daytimeText = '';
    if (pokemonData.Daytime && pokemonData.Daytime.length === 3) {
        const dayParts = [];
        if (pokemonData.Daytime[0]) dayParts.push(window.i18n.t('pokemon.morning'));
        if (pokemonData.Daytime[1]) dayParts.push(window.i18n.t('pokemon.day'));
        if (pokemonData.Daytime[2]) dayParts.push(window.i18n.t('pokemon.night'));
        daytimeText = dayParts.join(', ');
    }

    // Create HTML content for the tooltip with international texts
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

    // Adjust positioning for mobile devices
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = window.innerWidth <= 768; // Check if it's a mobile device

    if (isMobile) {
        // On mobile devices, display the tooltip in the center of the screen
        const tooltipWidth = Math.min(300, viewportWidth * 0.85);
        tooltip.style.width = `${tooltipWidth}px`;
        tooltip.style.maxWidth = `${tooltipWidth}px`;
        tooltip.style.left = '50%';
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';

        // Increase the touch area for the close button
        const closeButton = tooltip.querySelector('.close-tooltip');
        if (closeButton) {
            closeButton.style.padding = '10px';
            closeButton.style.fontSize = '24px';
        }
    } else {
        // On desktop, use the existing logic
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

    // Add functionality to the close button
    const closeButton = tooltip.querySelector('.close-tooltip');
    if (closeButton) {
        closeButton.addEventListener('click', function() {
            tooltip.style.display = 'none';
        });
    }

    // Close tooltip after clicking anywhere else
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

// Initialization after window load
window.addEventListener('load', function() {
    // Add a delay to make sure script.js loaded the map data
    setTimeout(function() {
        console.log("Starting Pokemon search initialization...");

        // Check if we have access to window.locations or the global variable locations
        if ((window.locations && window.locations.length > 0) || 
            (typeof locations !== 'undefined' && locations.length > 0)) {
            console.log("Location data available, initializing Pokemon search");

            // If we have access to locations, but not to window.locations, assign them
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

// Clear Pokemon icons when the map is refreshed
function hookIntoMapRefresh() {
    const originalRefreshMarkers = window.refreshMarkers;

    if (typeof originalRefreshMarkers === 'function') {
        window.refreshMarkers = function() {
            // Call the original function
            originalRefreshMarkers.apply(this, arguments);

            // Clear Pokemon icons
            clearOnlyPokemonIcons(); // Changed to only clear icons, not the panel

            // If there was a Pokemon being displayed, redisplay its icons
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

// Modified displayPokemonsByLocation function
function displayPokemonsByLocation(locationName) {
    // Find location on the map
    const mapLoc = findMapLocation(locationName);
    const isOnMap = mapLoc && mapLoc.map_pos;

    // Find all Pokemon in this location
    let pokemonAtLocation = allPokemonData.filter(entry => 
        entry.Map === locationName || 
        (mapLoc && entry.Map === mapLoc.tooltip) || 
        (mapLoc && mapLoc.map && entry.Map === mapLoc.map)
    );

    // Check if repel filter is active
    const repelFilter = document.getElementById('repel-filter-checkbox');
    const showOnlyRepel = repelFilter && repelFilter.checked;

    // Filter Pokemon if repel filter is active
    if (showOnlyRepel) {
        pokemonAtLocation = pokemonAtLocation.filter(poke => poke.RequiresRepel);
    }

    // Clear previous Pokemon icons
    clearOnlyPokemonIcons();

    // Remove existing panels
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

    // If there are no Pokemon in this location
    if (pokemonAtLocation.length === 0) {
        if (isOnMap) {
            // If location is on the map, center the map without displaying an alert
            centerMapOnLocation(mapLoc);
            displayLocationMarker(mapLoc);
        } else {
            // Display alert only when location is NOT on the map and there are no Pokemon
            alert(window.i18n ? window.i18n.t(showOnlyRepel ? "pokesearch.noPokemonAtLocationWithRepel" : "pokesearch.noPokemonAtLocation") : 
                 `No Pokemon found at location ${locationName}${showOnlyRepel ? " with repel" : ""}`);
        }
        return;
    }

    // Sort Pokemon alphabetically
    pokemonAtLocation.sort((a, b) => a.Pokemon.localeCompare(b.Pokemon));

    // Create panel to show Pokemon at this location
    displayLocationPokemonPanel(locationName, pokemonAtLocation, mapLoc);

    // If location is on the map, center the map and display marker
    if (isOnMap) {
        // Center map on this location
        centerMapOnLocation(mapLoc, true);
    
        // Display location marker
        displayLocationMarker(mapLoc);
    }
}

// New function to display a location marker
function displayLocationMarker(mapLoc) {
    // Possible addition of a simple location marker (optional)
    const map = document.getElementById('map');

    // Get coordinates
    const x = mapLoc.map_pos[0];
    const y = mapLoc.map_pos[1];

    // Create location marker
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

    // Add marker to the list of Pokemon icons, so it's removed along with them
    pokemonIcons.push(marker);
}

// Modified function to display the Pokemon locations panel
function displayLocationPokemonPanel(locationName, pokemonList, mapLoc) {
    // Create panel element
    const panel = document.createElement('div');
    panel.className = 'pokemon-locations-panel location-pokemon-panel';
    document.getElementById('map-container').appendChild(panel);

    // Check if location is on the map
    const isOnMap = mapLoc && mapLoc.map_pos;

    // Set display title
    const displayName = (mapLoc && mapLoc.tooltip) ? mapLoc.tooltip : locationName;

    // Create panel content
    panel.innerHTML = `
        <div class="pokemon-locations-header">
            <h3>${displayName}${!isOnMap ? ' <span class="location-not-on-map-badge" title="' + (window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Location not on map') + '">!</span>' : ''}</h3>
            <span class="close-locations-panel">&times;</span>
        </div>
        <div class="pokemon-locations-content">
            <p class="pokemon-locations-title">${window.i18n ? window.i18n.t("pokesearch.pokemonAtLocation") : "Pokemon available at this location:"}</p>
            <ul class="pokemon-locations-list">
                ${pokemonList.map(pokemon => {
                    return `<li data-pokemon="${pokemon.Pokemon}" data-monster-id="${pokemon.MonsterID}" title="${window.i18n ? window.i18n.t("pokesearch.clickToShowInfo") : 'Click to show info'}">
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

    // Add event listener to the close button
    panel.querySelector('.close-locations-panel').addEventListener('click', function() {
        panel.remove();
        clearOnlyPokemonIcons();
    });

    // Add event listeners to Pokemon elements
    panel.querySelectorAll('.pokemon-locations-list li').forEach(item => {
        item.addEventListener('click', function() {
            const pokemonName = this.dataset.pokemon;
            const pokemonData = pokemonList.find(p => p.Pokemon === pokemonName);

            if (pokemonData) {
                if (isOnMap) {
                    // If location is on the map, display the Pokemon icon
                    clearPokemonIconsExceptMarker();
                    const pokemonIcon = createPokemonIcon(pokemonData, mapLoc);

                    // Add animation to the newly created icon
                    setTimeout(() => {
                        pokemonIcon.style.animation = 'pokemon-pulse 0.8s ease-in-out 2';
                    }, 10);
                }

                // Show tooltip with Pokemon info regardless of whether the location is on the map
                const rect = this.getBoundingClientRect();
                displayPokemonTooltip(pokemonData, rect.right, rect.top);
            }
        });
    });

    // Enable mouse wheel scrolling on the location content
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

// New function to clear Pokemon icons, but keep the location marker
function clearPokemonIconsExceptMarker() {
    // Remove only elements that are not location markers
    const iconsToRemove = pokemonIcons.filter(icon => !icon.classList.contains('location-marker'));

    iconsToRemove.forEach(icon => {
        if (icon && icon.parentNode) {
            icon.parentNode.removeChild(icon);
        }
    });

    // Update the pokemonIcons array, keeping only the location marker
    pokemonIcons = pokemonIcons.filter(icon => icon.classList.contains('location-marker'));

    // Hide tooltip if visible
    const tooltip = document.querySelector('.pokemon-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// Function to display Pokemon by item
function displayPokemonsByItem(itemName) {
    console.log(`Searching for Pokemon with item: ${itemName}`);

    // Find all Pokemon with this item
    let pokemonWithItem = allPokemonData.filter(entry => entry.Item === itemName);

    // Check if repel filter is active
    const repelFilter = document.getElementById('repel-filter-checkbox');
    const showOnlyRepel = repelFilter && repelFilter.checked;

    // Filter Pokemon if repel filter is active
    if (showOnlyRepel) {
        pokemonWithItem = pokemonWithItem.filter(poke => poke.RequiresRepel);
    }

    if (pokemonWithItem.length === 0) {
        alert(window.i18n ? window.i18n.t(showOnlyRepel ? "pokesearch.noPokemonWithItemAndRepel" : "pokesearch.noPokemonWithItem") : 
             `No Pokemon found with item ${itemName}${showOnlyRepel ? " and with repel" : ""}`);
        return;
    }

    // Clear previous Pokemon icons
    clearOnlyPokemonIcons();

    // Remove existing panels
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

    // Create panel to show Pokemon with this item
    displayItemPokemonPanel(itemName, pokemonWithItem);
}

// Function displaying the panel with Pokemon possessing an item
function displayItemPokemonPanel(itemName, pokemonList) {
    // Create panel element
    const panel = document.createElement('div');
    panel.className = 'pokemon-locations-panel item-pokemon-panel';
    document.getElementById('map-container').appendChild(panel);

    // Get item image
    const itemImageSrc = `resources/items/${itemName}.png`;

    // Prepare the list of Pokemon with information about map availability
    const pokemonWithAvailability = pokemonList.map(pokemon => {
        const mapLoc = findMapLocation(pokemon.Map);
        const isOnMap = mapLoc && mapLoc.map_pos;
        return {
            pokemon: pokemon,
            isOnMap: isOnMap,
            mapLoc: mapLoc
        };
    });

    // Sort - those available on the map first
    pokemonWithAvailability.sort((a, b) => {
        if (a.isOnMap && !b.isOnMap) return -1;
        if (!a.isOnMap && b.isOnMap) return 1;
        // If both are on the map or both are not on the map, sort alphabetically by Pokemon
        return a.pokemon.Pokemon.localeCompare(b.pokemon.Pokemon);
    });

    // Create panel content
    panel.innerHTML = `
        <div class="pokemon-locations-header">
            <h3>
                <img src="${itemImageSrc}" class="item-icon" alt="${itemName}" onerror="this.src='resources/items/default-item.png'" style="width: 32px; height: 32px; margin-right: 10px;">
                ${itemName}
            </h3>
            <span class="close-locations-panel">&times;</span>
        </div>
        <div class="pokemon-locations-content">
            <p class="pokemon-locations-title">${window.i18n ? window.i18n.t("pokesearch.pokemonWithItem") : "Pokemon with this item:"}</p>
            <ul class="pokemon-locations-list">
                ${pokemonWithAvailability.map(item => {
                    return `<li data-pokemon="${item.pokemon.Pokemon}" data-location="${item.pokemon.Map}" class="${item.isOnMap ? '' : 'not-on-map'}" title="${item.isOnMap ? window.i18n ? window.i18n.t("pokesearch.clickToCenter") : 'Click to center map' : window.i18n ? window.i18n.t("pokesearch.locationNotOnMap") : 'Location not on map'}">
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

    // Add event listener to the close button
    panel.querySelector('.close-locations-panel').addEventListener('click', function() {
        panel.remove();
        clearOnlyPokemonIcons();
    });

    // Add event listeners to Pokemon elements
    panel.querySelectorAll('.pokemon-locations-list li').forEach(item => {
        item.addEventListener('click', function() {
            // Don't add action for locations that are not on the map
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
                // Center map on this location
                centerMapOnLocation(pokemonInfo.mapLoc);

                // Clear previous icons and show only the icon of this Pokemon
                clearOnlyPokemonIcons();
                const pokemonIcon = createPokemonIcon(pokemonInfo.pokemon, pokemonInfo.mapLoc);

                // Add animation to the icon
                setTimeout(() => {
                    pokemonIcon.style.animation = 'pokemon-pulse 0.8s ease-in-out 2';
                }, 10);

                // Show tooltip with Pokemon info
                const rect = this.getBoundingClientRect();
                displayPokemonTooltip(pokemonInfo.pokemon, rect.right, rect.top);
            }
        });
    });

    // Enable mouse wheel scrolling in the content
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