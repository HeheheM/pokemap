let currentProfile = null;
let profiles = {};

const DEFAULT_SCALE = 0.5;
const DEFAULT_POSITION_X = 3170;
const DEFAULT_POSITION_Y = 3122;

// Flaga wskazująca, czy dane są aktualnie ładowane z profilu
// Zapobiega zapisowi danych podczas ładowania profilu
let isLoadingProfile = false;

function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element && id !== 'emergency-boss-container' && id !== 'route-count') {
        console.warn(`Element with ID '${id}' not found in the DOM`);
    }
    return element;
}

function initProfileSystem() {
    console.log("Initializing profile system...");
    fixMissingElements();
    loadProfiles();
    setupExistingProfileUI();
    setupDataChangeListeners();
    
    if (window.i18n) {
        window.i18n.onLanguageChange(function() {
            updateProfileUI();
        });
    }
    
    const savedCurrentProfile = localStorage.getItem('currentProfile');
    if (savedCurrentProfile && profiles[savedCurrentProfile]) {
        switchToProfile(savedCurrentProfile);
    } else {
        if (Object.keys(profiles).length === 0) {
            createNewProfile('Default');
        } else {
            const firstProfileId = Object.keys(profiles)[0];
            switchToProfile(firstProfileId);
        }
    }
}

// Nasłuchiwanie zmian danych w localStorage
function setupDataChangeListeners() {
    // Przechwytywanie zmian localStorage poprzez nadpisanie metody setItem
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        // Wywołanie oryginalnej metody
        originalSetItem.call(localStorage, key, value);
        
        // Jeśli nie ładujemy aktualnie profilu, zapisujemy zmiany do bieżącego profilu
        if (!isLoadingProfile && currentProfile && profiles[currentProfile]) {
            // Dla kluczy, które chcemy śledzić
            if (['weeklyKillData', 'lastWeeklyReset', 'killedBosses', 'bossRoutes'].includes(key)) {
                console.log(`Data changed for key: ${key}, saving to current profile`);
                saveCurrentProfileDataDebounced();
            }
        }
    };
}

// Funkcja debounce do zapobiegania zbyt częstym zapisom
let saveTimeout = null;
function saveCurrentProfileDataDebounced() {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    
    saveTimeout = setTimeout(() => {
        saveCurrentProfileData();
        saveTimeout = null;
    }, 500); // opóźnienie 500ms
}

function updateProfileUI() {
    const profileHeader = document.querySelector('.profile-container > h3');
    if (profileHeader) {
        profileHeader.textContent = window.i18n.t('profile.title');
    }

    const newProfileBtn = document.getElementById('new-profile-btn');
    if (newProfileBtn) {
        newProfileBtn.textContent = window.i18n.t('profile.new');
    }
    
    const renameProfileBtn = document.getElementById('rename-profile-btn');
    if (renameProfileBtn) {
        renameProfileBtn.textContent = window.i18n.t('profile.rename');
    }
    
    const deleteProfileBtn = document.getElementById('delete-profile-btn');
    if (deleteProfileBtn) {
        deleteProfileBtn.textContent = window.i18n.t('profile.delete');
    }
    updateProfileSelector();
}

function setupExistingProfileUI() {
    const profileContainer = document.querySelector('.profile-container');
    
    if (!profileContainer) {
        console.error("Nie znaleziono kontenera profilu w HTML");
        return;
    }
    
    manuallyHideProfileInRouteView(profileContainer);
    updateProfileSelector();
    setupProfileUIEventListeners();
    
    console.log("Skonfigurowano istniejący interfejs profilu");
}

function manuallyHideProfileInRouteView(profileContainer) {
    const routeCreatorBtn = document.getElementById('route-creator-btn');
    const returnToMainBtn = document.getElementById('return-to-main-btn');
    const routeCreatorSidebar = document.getElementById('route-creator-sidebar');

    if (routeCreatorSidebar && routeCreatorSidebar.style.display === 'block') {
        profileContainer.style.display = 'none';
    }

    if (routeCreatorBtn) {
        routeCreatorBtn.addEventListener('click', function() {
            const profileContainers = document.querySelectorAll('.profile-container');
            profileContainers.forEach(container => {
                container.style.display = 'none';
            });
        });
    }
    
    if (returnToMainBtn) {
        returnToMainBtn.addEventListener('click', function() {
            const profileContainers = document.querySelectorAll('.profile-container');
            profileContainers.forEach(container => {
                container.style.display = '';
            });
        });
    }
    
    console.log("Manual hide/show logic added for profile container");
}

function loadProfiles() {
    try {
        const savedProfiles = localStorage.getItem('profiles');
        if (savedProfiles) {
            profiles = JSON.parse(savedProfiles);
            console.log(`Loaded ${Object.keys(profiles).length} profiles from localStorage`);
        } else {
            console.log("No profiles found in localStorage");
            profiles = {};
        }
    } catch (error) {
        console.error("Error loading profiles from localStorage:", error);
        profiles = {};
    }
}

function saveProfiles() {
    try {
        localStorage.setItem('profiles', JSON.stringify(profiles));
        console.log("Profiles saved to localStorage");
    } catch (error) {
        console.error("Error saving profiles to localStorage:", error);
        alert(window.i18n ? window.i18n.t('errors.savingProfiles') : "Error saving profiles. Local storage may be full.");
    }
}

function resetRouteState() {
    try {
        console.log("Resetowanie stanu tras po zmianie profilu");
        
        // Resetowanie globalnych tablic tras jeśli istnieją
        if (typeof window.routes !== 'undefined') {
            const savedRoutes = localStorage.getItem('bossRoutes');
            if (savedRoutes) {
                window.routes = JSON.parse(savedRoutes);
                console.log("Zresetowano window.routes do danych z nowego profilu");
            } else {
                window.routes = [];
                console.log("Wyczyszczono window.routes (brak tras w nowym profilu)");
            }
        }

        if (typeof window.currentRoute !== 'undefined') {
            window.currentRoute = [];
            console.log("Wyczyszczono currentRoute");
        }

        // Resetowanie elementów UI dla tras
        const routeSelect = document.getElementById('route-select');
        if (routeSelect) {
            while (routeSelect.options.length > 1) {
                routeSelect.remove(1);
            }

            routeSelect.selectedIndex = 0;

            // Próbujemy użyć funkcji do ładowania tras
            if (typeof window.loadSavedRoutes === 'function') {
                window.loadSavedRoutes();
                console.log("Przeładowano trasy w selekcie");
            } else if (typeof safeLoadSavedRoutes === 'function') {
                safeLoadSavedRoutes();
                console.log("Przeładowano trasy bezpieczną metodą");
            } else {
                console.warn("Funkcja ładowania tras nie jest dostępna");
                // Ręczne ładowanie tras
                try {
                    const savedRoutes = localStorage.getItem('bossRoutes');
                    if (savedRoutes) {
                        const routes = JSON.parse(savedRoutes);
                        routes.forEach((route, index) => {
                            const option = document.createElement('option');
                            option.value = index;
                            option.textContent = route.name || (window.i18n ? window.i18n.t("route.routeNumber", [index + 1]) : `Trasa ${index + 1}`);
                            routeSelect.appendChild(option);
                        });
                    }
                } catch (innerError) {
                    console.error("Błąd podczas ręcznego ładowania tras:", innerError);
                }
            }
        }

        // Usunięcie numerów tras
        const routeNumbers = document.querySelectorAll('.route-number');
        routeNumbers.forEach(number => number.remove());

        // Wyczyszczenie kontenera bossów
        const emergencyBossContainer = document.getElementById('emergency-boss-container');
        if (emergencyBossContainer) {
            emergencyBossContainer.innerHTML = '';
            console.log("Wyczyszczono kontener bossów");
        }

        // Odświeżenie ikon bossów
        if (typeof window.displayBossIcons === 'function') {
            window.displayBossIcons();
            console.log("Odświeżono ikony bossów na mapie");
        }
        
        console.log("Zresetowano stan tras po zmianie profilu");
    } catch (e) {
        console.error("Błąd podczas resetowania stanu tras:", e);
    }
}

function createNewProfile(profileName) {
    const profileId = 'profile_' + Date.now();
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    const defaultOffsetX = containerWidth/2 - DEFAULT_POSITION_X * DEFAULT_SCALE;
    const defaultOffsetY = containerHeight/2 - DEFAULT_POSITION_Y * DEFAULT_SCALE;

    profiles[profileId] = {
        id: profileId,
        name: profileName,
        data: {
            weeklyKillData: {
                killCount: 0,
                lastResetTimestamp: Date.now(),
                kills: []
            },
            lastWeeklyReset: null,
            killedBosses: {},
            bossRoutes: [],

            mapSettings: {
                defaultScale: DEFAULT_SCALE,
                defaultOffsetX: defaultOffsetX,
                defaultOffsetY: defaultOffsetY
            }
        }
    };

    saveProfiles();
    switchToProfile(profileId);
    updateProfileSelector();
    
    console.log(`Created new profile: ${profileName} (${profileId})`);
    return profileId;
}

function renameProfile(profileId, newName) {
    if (profiles[profileId]) {
        const oldName = profiles[profileId].name;
        profiles[profileId].name = newName;
        saveProfiles();
        updateProfileSelector();
        console.log(`Renamed profile: ${oldName} -> ${newName}`);
    }
}

function deleteProfile(profileId) {
    if (profiles[profileId]) {
        const profileName = profiles[profileId].name;
        
        if (currentProfile === profileId) {
            const profileIds = Object.keys(profiles);
            const currentIndex = profileIds.indexOf(profileId);
            let newProfileId = null;
            if (profileIds.length > 1) {
                if (currentIndex < profileIds.length - 1) {
                    newProfileId = profileIds[currentIndex + 1];
                } else {
                    newProfileId = profileIds[currentIndex - 1];
                }
            }

            delete profiles[profileId];
            saveProfiles();
            
            if (newProfileId) {
                switchToProfile(newProfileId);
            } else {
                createNewProfile('Default');
            }
        } else {
            delete profiles[profileId];
            saveProfiles();
        }
        
        updateProfileSelector();
        console.log(`Deleted profile: ${profileName}`);
    }
}

function switchToProfile(profileId) {
    if (!profiles[profileId]) {
        console.error(`Profile with ID ${profileId} doesn't exist!`);
        return false;
    }

    // Zapisz dane bieżącego profilu przed przełączeniem
    if (currentProfile) {
        try {
            saveCurrentProfileData();
        } catch (e) {
            console.warn("Error saving current profile data:", e);
        }
    }

    currentProfile = profileId;
    localStorage.setItem('currentProfile', profileId);

    // Dodajemy efekt wizualny przejścia
    const bodyElement = document.body;
    if (bodyElement) {
        bodyElement.classList.add('profile-transition', 'fade-out');
    }

    // Zaznaczamy flagę ładowania profilu, aby zapobiec zapisom podczas ładowania
    isLoadingProfile = true;

    try {
        loadProfileData(profileId);
    } catch (e) {
        console.warn("Error loading profile data:", e);
    } finally {
        // Resetujemy flagę po zakończeniu ładowania (z małym opóźnieniem)
        setTimeout(() => {
            isLoadingProfile = false;
        }, 1500);
    }

    updateProfileSelector();
    
    console.log(`Switched to profile: ${profiles[profileId].name}`);
    return true;
}

function saveCurrentProfileData() {
    if (!currentProfile || !profiles[currentProfile]) {
        console.error("Cannot save profile data: no current profile!");
        return;
    }

    // Określamy aktualne ustawienia mapy
    let currentScale = DEFAULT_SCALE;
    let currentOffsetX = 0;
    let currentOffsetY = 0;

    try {
        // Próbujemy uzyskać aktualne ustawienia mapy
        currentScale = typeof window.scale !== 'undefined' ? window.scale : DEFAULT_SCALE;
        currentOffsetX = typeof window.offsetX !== 'undefined' ? window.offsetX : 0;
        currentOffsetY = typeof window.offsetY !== 'undefined' ? window.offsetY : 0;
    } catch (e) {
        console.warn("Error accessing map variables:", e);
    }

    // Przygotowujemy obiekt danych
    const data = {
        weeklyKillData: null,
        lastWeeklyReset: null,
        killedBosses: {},
        bossRoutes: [],
        mapSettings: {
            defaultScale: currentScale,
            defaultOffsetX: currentOffsetX,
            defaultOffsetY: currentOffsetY
        }
    };
    
    try {
        // Zbieramy dane z localStorage
        const weeklyKillData = localStorage.getItem('weeklyKillData');
        if (weeklyKillData) {
            data.weeklyKillData = JSON.parse(weeklyKillData);
        }

        const lastWeeklyReset = localStorage.getItem('lastWeeklyReset');
        if (lastWeeklyReset) {
            data.lastWeeklyReset = JSON.parse(lastWeeklyReset);
        }

        const killedBosses = localStorage.getItem('killedBosses');
        if (killedBosses) {
            data.killedBosses = JSON.parse(killedBosses);
        }

        const bossRoutes = localStorage.getItem('bossRoutes');
        if (bossRoutes) {
            data.bossRoutes = JSON.parse(bossRoutes);
        }

        // Zapisujemy dane do profilu
        profiles[currentProfile].data = data;
        saveProfiles();
        
        console.log(`Saved data for profile: ${profiles[currentProfile].name}`);
    } catch (error) {
        console.error("Error saving current profile data:", error);
    }
}

function saveCurrentMapPosition() {
    if (!currentProfile || !profiles[currentProfile]) return;
    
    let currentScale = DEFAULT_SCALE;
    let currentOffsetX = 0;
    let currentOffsetY = 0;

    try {
        currentScale = typeof window.scale !== 'undefined' ? window.scale : DEFAULT_SCALE;
        currentOffsetX = typeof window.offsetX !== 'undefined' ? window.offsetX : 0;
        currentOffsetY = typeof window.offsetY !== 'undefined' ? window.offsetY : 0;
    } catch (e) {
        console.warn("Error accessing map variables:", e);
        return;
    }

    profiles[currentProfile].data.mapSettings = {
        defaultScale: currentScale,
        defaultOffsetX: currentOffsetX,
        defaultOffsetY: currentOffsetY
    };

    saveProfiles();
    console.log(`Zapisano pozycję mapy dla profilu: ${profiles[currentProfile].name}`);
    console.log(`Scale: ${currentScale}, OffsetX: ${currentOffsetX}, OffsetY: ${currentOffsetY}`);
}

function loadProfileData(profileId) {
    if (!profiles[profileId]) {
        console.error(`Cannot load profile data: profile ${profileId} doesn't exist!`);
        return;
    }
    
    try {
        const profileData = profiles[profileId].data;
        if (!profileData) {
            console.warn(`Profile ${profileId} has no data, initializing empty data`);
            profiles[profileId].data = {
                weeklyKillData: {
                    killCount: 0,
                    lastResetTimestamp: Date.now(),
                    kills: []
                },
                lastWeeklyReset: null,
                killedBosses: {},
                bossRoutes: [],
                mapSettings: {
                    defaultScale: DEFAULT_SCALE,
                    defaultOffsetX: 0,
                    defaultOffsetY: 0
                }
            };
            saveProfiles();
            return loadProfileData(profileId); // Rekurencyjnie wywołaj funkcję z zainicjalizowanymi danymi
        }

        // Efekt wizualny przejścia
        const bodyElement = document.body;
        if (bodyElement) {
            bodyElement.classList.add('profile-transition', 'fade-out');
        }

        // Usuń istniejące dane z localStorage
        localStorage.removeItem('weeklyKillData');
        localStorage.removeItem('lastWeeklyReset');
        localStorage.removeItem('killedBosses');
        localStorage.removeItem('bossRoutes');

        // Załaduj dane z profilu do localStorage
        if (profileData.weeklyKillData) {
            localStorage.setItem('weeklyKillData', JSON.stringify(profileData.weeklyKillData));
        }
        
        if (profileData.lastWeeklyReset) {
            localStorage.setItem('lastWeeklyReset', JSON.stringify(profileData.lastWeeklyReset));
        }
        
        if (profileData.killedBosses) {
            localStorage.setItem('killedBosses', JSON.stringify(profileData.killedBosses));
        }
        
        if (profileData.bossRoutes) {
            localStorage.setItem('bossRoutes', JSON.stringify(profileData.bossRoutes));
        }
        
        // Resetuj stan tras i odśwież UI
        resetRouteState();

        // Zastosuj ustawienia mapy z małym opóźnieniem, aby dać czas na załadowanie
        setTimeout(() => {
            try {
                if (profileData.mapSettings) {
                    applyMapSettings(profileData.mapSettings);
                }
            } catch (e) {
                console.warn("Error applying map settings:", e);
            }
        }, 200);

        // Odśwież UI po pełnym załadowaniu danych
        setTimeout(() => {
            try {
                // Odśwież timery bossów
                if (typeof window.updateBossTimers === 'function') {
                    window.updateBossTimers();
                }

                // Odśwież licznik tygodniowych zabić
                if (typeof window.updateWeeklyKillsDisplay === 'function') {
                    window.updateWeeklyKillsDisplay();
                }

                // Odśwież ikony bossów
                if (typeof window.displayBossIcons === 'function') {
                    window.displayBossIcons();
                }

                // Usuń efekt przejścia
                if (bodyElement) {
                    bodyElement.classList.remove('profile-transition', 'fade-out');
                }
            } catch (e) {
                console.warn("Error updating UI after profile load:", e);
                // Zawsze usuń efekt przejścia, nawet jeśli wystąpił błąd
                if (bodyElement) {
                    bodyElement.classList.remove('profile-transition', 'fade-out');
                }
            }
        }, 500);
        
        console.log(`Loaded data for profile: ${profiles[profileId].name}`);
    } catch (error) {
        console.error("Error loading profile data:", error);
        // Zawsze usuń efekt przejścia, nawet jeśli wystąpił błąd
        const bodyElement = document.body;
        if (bodyElement) {
            bodyElement.classList.remove('profile-transition', 'fade-out');
        }
    }
}

function applyMapSettings(mapSettings) {
    if (!mapSettings) {
        console.warn("No map settings to apply");
        return;
    }
    
    try {
        // Sprawdź, czy zmienne mapy są dostępne
        if (typeof window.scale !== 'undefined' && 
            typeof window.offsetX !== 'undefined' && 
            typeof window.offsetY !== 'undefined' && 
            typeof window.updateMapTransform === 'function') {

            // Ustaw zmienne mapy
            window.scale = mapSettings.defaultScale || DEFAULT_SCALE;
            window.offsetX = mapSettings.defaultOffsetX || 0;
            window.offsetY = mapSettings.defaultOffsetY || 0;
            
            console.log(`Applying map settings: Scale: ${window.scale}, OffsetX: ${window.offsetX}, OffsetY: ${window.offsetY}`);

            // Zastosuj transformację mapy
            window.updateMapTransform();
        } else {
            console.warn("Map variables not available yet, will retry");
            
            // Spróbuj ponownie po krótkim czasie
            setTimeout(() => {
                if (typeof window.scale !== 'undefined' && 
                    typeof window.offsetX !== 'undefined' && 
                    typeof window.offsetY !== 'undefined' && 
                    typeof window.updateMapTransform === 'function') {
                    
                    window.scale = mapSettings.defaultScale || DEFAULT_SCALE;
                    window.offsetX = mapSettings.defaultOffsetX || 0;
                    window.offsetY = mapSettings.defaultOffsetY || 0;
                    
                    console.log(`Delayed applying map settings: Scale: ${window.scale}, OffsetX: ${window.offsetX}, OffsetY: ${window.offsetY}`);
                    
                    window.updateMapTransform();
                } else {
                    console.error("Map variables still not available after retry");
                }
            }, 500);
        }
    } catch (e) {
        console.warn("Error applying map settings:", e);
    }
}

function setupProfileUIEventListeners() {
    const profileSelector = safeGetElement('profile-selector');
    const newProfileBtn = safeGetElement('new-profile-btn');
    const renameProfileBtn = safeGetElement('rename-profile-btn');
    const deleteProfileBtn = safeGetElement('delete-profile-btn');
    
    if (profileSelector) {
        profileSelector.addEventListener('change', function() {
            const selectedProfileId = this.value;
            if (selectedProfileId && profiles[selectedProfileId]) {
                switchToProfile(selectedProfileId);
            }
        });
    }
    
    if (newProfileBtn) {
        newProfileBtn.addEventListener('click', function() {
            const promptMessage = window.i18n ? window.i18n.t('profile.enterName') : 'Enter a name for the new profile:';
            const profileName = prompt(promptMessage);
            if (profileName && profileName.trim() !== '') {
                createNewProfile(profileName.trim());
            }
        });
    }
    
    if (renameProfileBtn) {
        renameProfileBtn.addEventListener('click', function() {
            if (!currentProfile) return;
            
            const currentName = profiles[currentProfile].name;
            const promptMessage = window.i18n ? window.i18n.t('profile.enterNewName') : 'Enter a new name for the profile:';
            const newName = prompt(promptMessage, currentName);
            
            if (newName && newName.trim() !== '' && newName !== currentName) {
                renameProfile(currentProfile, newName.trim());
            }
        });
    }
    
    if (deleteProfileBtn) {
        deleteProfileBtn.addEventListener('click', function() {
            if (!currentProfile) return;
            
            const confirmMessage = window.i18n ? 
                window.i18n.t('profile.confirmDelete', [profiles[currentProfile].name]) : 
                `Are you sure you want to delete the profile "${profiles[currentProfile].name}"?`;
                
            const confirmDelete = confirm(confirmMessage);
            if (confirmDelete) {
                deleteProfile(currentProfile);
            }
        });
    }
}

function updateProfileSelector() {
    const profileSelector = safeGetElement('profile-selector');
    if (!profileSelector) return;

    profileSelector.innerHTML = '';

    Object.keys(profiles).forEach(profileId => {
        const option = document.createElement('option');
        option.value = profileId;
        option.textContent = profiles[profileId].name;
        if (profileId === currentProfile) {
            option.selected = true;
        }
        
        profileSelector.appendChild(option);
    });
}

function fixMissingElements() {
    try {
        if (!document.getElementById('json-output')) {
            const dummy = document.createElement('textarea');
            dummy.id = 'json-output';
            dummy.style.display = 'none';
            document.body.appendChild(dummy);
        }

        if (!document.getElementById('load-json')) {
            const dummyButton = document.createElement('button');
            dummyButton.id = 'load-json';
            dummyButton.style.display = 'none';
            dummyButton.addEventListener('click', function() {
                console.log("Hidden load-json button clicked");
                if (typeof loadFromJson === 'function') {
                    loadFromJson();
                }
            });
            
            document.body.appendChild(dummyButton);
        }
    } catch (e) {
        console.error("Error fixing missing elements:", e);
    }
}

window.saveMapPosition = function() {
    saveCurrentMapPosition();
    const message = window.i18n ? window.i18n.t('mapPosition.saved') : "Pozycja mapy została zapisana jako domyślna dla bieżącego profilu.";
    console.log(message);
    alert(message);
    return true;
};

function safeLoadSavedRoutes() {
    try {
        const savedRoutes = localStorage.getItem('bossRoutes');
        if (savedRoutes) {
            window.routes = JSON.parse(savedRoutes);
        } else {
            window.routes = [];
        }
        console.log("Bezpiecznie załadowano trasy:", window.routes ? window.routes.length : 0);
    } catch (e) {
        console.warn("Error in safeLoadSavedRoutes:", e);
        window.routes = [];
    }
}

function migrateExistingProfiles() {
    let needsSave = false;
    
    Object.keys(profiles).forEach(profileId => {
        const profile = profiles[profileId];

        if (!profile.data) {
            console.log(`Initializing empty data for profile: ${profile.name}`);
            profile.data = {
                weeklyKillData: {
                    killCount: 0,
                    lastResetTimestamp: Date.now(),
                    kills: []
                },
                lastWeeklyReset: null,
                killedBosses: {},
                bossRoutes: [],
                mapSettings: {
                    defaultScale: DEFAULT_SCALE,
                    defaultOffsetX: 0,
                    defaultOffsetY: 0
                }
            };
            needsSave = true;
        }
        else if (!profile.data.mapSettings) {
            console.log(`Fixing missing map settings for profile: ${profile.name}`);

            const containerWidth = window.innerWidth;
            const containerHeight = window.innerHeight;
            const defaultOffsetX = containerWidth/2 - DEFAULT_POSITION_X * DEFAULT_SCALE;
            const defaultOffsetY = containerHeight/2 - DEFAULT_POSITION_Y * DEFAULT_SCALE;
            profile.data.mapSettings = {
                defaultScale: DEFAULT_SCALE,
                defaultOffsetX: defaultOffsetX,
                defaultOffsetY: defaultOffsetY
            };
            
            needsSave = true;
        }
        else if (profile.data.mapSettings.defaultScale === 1) {
            console.log(`Updating old scale value for profile: ${profile.name}`);

            const containerWidth = window.innerWidth;
            const containerHeight = window.innerHeight;
            const defaultOffsetX = containerWidth/2 - DEFAULT_POSITION_X * DEFAULT_SCALE;
            const defaultOffsetY = containerHeight/2 - DEFAULT_POSITION_Y * DEFAULT_SCALE;

            profile.data.mapSettings.defaultScale = DEFAULT_SCALE;
            profile.data.mapSettings.defaultOffsetX = defaultOffsetX;
            profile.data.mapSettings.defaultOffsetY = defaultOffsetY;
            
            needsSave = true;
        }
    });
    
    if (needsSave) {
        console.log("Saving migrated profiles");
        saveProfiles();
    }
}

// Funkcja do czyszczenia localStorage (tylko do debugowania)
window.clearProfileStorage = function() {
    if (confirm("Czy na pewno chcesz wyczyścić wszystkie dane profili? Ta operacja jest nieodwracalna!")) {
        localStorage.removeItem('profiles');
        localStorage.removeItem('currentProfile');
        alert("Dane profili zostały wyczyszczone. Strona zostanie odświeżona.");
        location.reload();
    }
};

window.addEventListener('load', function() {
    try {
        fixMissingElements();
        setTimeout(function() {
            initProfileSystem();
            migrateExistingProfiles();
            console.log("Wpisz 'saveMapPosition()' aby zapisać aktualną pozycję mapy jako domyślną");
        }, 1000);
    } catch (e) {
        console.error("Error during profile system initialization:", e);
    }
});