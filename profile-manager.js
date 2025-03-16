let currentProfile = null;
let profiles = {};
let autoSaveInterval = null;

const DEFAULT_SCALE = 0.5;
const DEFAULT_POSITION_X = 3170;
const DEFAULT_POSITION_Y = 3122;
const AUTO_SAVE_INTERVAL = 60000; // Automatyczny zapis co 60 sekund

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

    // Rozpocznij automatyczne zapisywanie
    startAutoSave();
}

function startAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
    }
    
    autoSaveInterval = setInterval(function() {
        if (currentProfile) {
            // console.log("Auto-saving current profile data...");
            saveCurrentProfileData();
            saveProfiles();
        }
    }, AUTO_SAVE_INTERVAL);
    
    console.log(`Auto-save enabled, saving every ${AUTO_SAVE_INTERVAL/1000} seconds`);
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

        const routeSelect = document.getElementById('route-select');
        if (routeSelect) {
            while (routeSelect.options.length > 1) {
                routeSelect.remove(1);
            }

            routeSelect.selectedIndex = 0;

            if (typeof loadSavedRoutes === 'function') {
                loadSavedRoutes();
                console.log("Przeładowano trasy w selekcie");
            } else if (typeof safeLoadSavedRoutes === 'function') {
                safeLoadSavedRoutes();
                console.log("Przeładowano trasy bezpieczną metodą");
            } else {
                console.warn("Funkcja ładowania tras nie jest dostępna");
            }
        }

        const routeNumbers = document.querySelectorAll('.route-number');
        routeNumbers.forEach(number => number.remove());

        const emergencyBossContainer = document.getElementById('emergency-boss-container');
        if (emergencyBossContainer) {
            emergencyBossContainer.innerHTML = '';
            console.log("Wyczyszczono kontener bossów");
        }

        if (typeof displayBossIcons === 'function') {
            displayBossIcons();
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
            clickedPokestops: {}, // Dla pokestopów
            clickedExcavitions: {}, // Dodajemy dla wykopalisk

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

    // Zapisz dane aktualnego profilu przed przełączeniem
    if (currentProfile) {
        try {
            // Upewnij się, że zapisujemy najnowszą pozycję mapy
            const mapPosition = getCurrentMapPosition();
            if (mapPosition && profiles[currentProfile] && profiles[currentProfile].data) {
                profiles[currentProfile].data.mapSettings = mapPosition;
            }
            
            saveCurrentProfileData();
        } catch (e) {
            console.warn("Error saving current profile data:", e);
        }
    }

    currentProfile = profileId;
    localStorage.setItem('currentProfile', profileId);

    try {
        loadProfileData(profileId);
    } catch (e) {
        console.warn("Error loading profile data:", e);
    }

    updateProfileSelector();
    
    console.log(`Switched to profile: ${profiles[profileId].name}`);
    return true;
}

function getCurrentMapPosition() {
    let currentScale = DEFAULT_SCALE;
    let currentOffsetX = 0;
    let currentOffsetY = 0;

    try {
        currentScale = typeof scale !== 'undefined' ? scale : DEFAULT_SCALE;
        currentOffsetX = typeof offsetX !== 'undefined' ? offsetX : 0;
        currentOffsetY = typeof offsetY !== 'undefined' ? offsetY : 0;
    } catch (e) {
        console.warn("Error accessing map variables:", e);
        return null;
    }

    return {
        defaultScale: currentScale,
        defaultOffsetX: currentOffsetX,
        defaultOffsetY: currentOffsetY
    };
}

function saveCurrentProfileData() {
    if (!currentProfile || !profiles[currentProfile]) {
        console.error("Cannot save profile data: no current profile!");
        return;
    }

    // Pobierz aktualną pozycję mapy
    const mapSettings = getCurrentMapPosition();

    const data = {
        weeklyKillData: null,
        lastWeeklyReset: null,
        killedBosses: {},
        bossRoutes: [],
        clickedPokestops: {},
        clickedExcavitions: {},
        mapSettings: mapSettings || {
            defaultScale: DEFAULT_SCALE,
            defaultOffsetX: 0,
            defaultOffsetY: 0
        }
    };
    
    try {
        // Zapisz dane weeklyKillData
        const weeklyKillData = localStorage.getItem('weeklyKillData');
        if (weeklyKillData) {
            try {
                data.weeklyKillData = JSON.parse(weeklyKillData);
            } catch (e) {
                console.warn("Error parsing weeklyKillData:", e);
                // Użyj domyślnych wartości jeśli nie można sparsować
                data.weeklyKillData = {
                    killCount: 0,
                    lastResetTimestamp: Date.now(),
                    kills: []
                };
            }
        }

        // Zapisz dane lastWeeklyReset
        const lastWeeklyReset = localStorage.getItem('lastWeeklyReset');
        if (lastWeeklyReset) {
            try {
                data.lastWeeklyReset = JSON.parse(lastWeeklyReset);
            } catch (e) {
                console.warn("Error parsing lastWeeklyReset:", e);
            }
        }

        // Zapisz dane killedBosses
        const killedBosses = localStorage.getItem('killedBosses');
        if (killedBosses) {
            try {
                data.killedBosses = JSON.parse(killedBosses);
            } catch (e) {
                console.warn("Error parsing killedBosses:", e);
                data.killedBosses = {};
            }
        }

        // Zapisz dane bossRoutes
        const bossRoutes = localStorage.getItem('bossRoutes');
        if (bossRoutes) {
            try {
                data.bossRoutes = JSON.parse(bossRoutes);
            } catch (e) {
                console.warn("Error parsing bossRoutes:", e);
                data.bossRoutes = [];
            }
        }

        // Zapisz dane clickedPokestops - dodajemy obsługę pokestopów
        const clickedPokestops = localStorage.getItem('clickedPokestops');
        if (clickedPokestops) {
            try {
                data.clickedPokestops = JSON.parse(clickedPokestops);
            } catch (e) {
                console.warn("Error parsing clickedPokestops:", e);
                data.clickedPokestops = {};
            }
        }
        const clickedExcavitions = localStorage.getItem('clickedExcavitions');
        if (clickedExcavitions) {
            try {
                data.clickedExcavitions = JSON.parse(clickedExcavitions);
            } catch (e) {
                console.warn("Error parsing clickedExcavitions:", e);
                data.clickedExcavitions = {};
            }
        }
        // Aktualizuj dane profilu
        profiles[currentProfile].data = data;
        
        // console.log(`Saved data for profile: ${profiles[currentProfile].name}`);
        return true;
    } catch (error) {
        console.error("Error saving current profile data:", error);
        return false;
    }
}

function saveCurrentMapPosition() {
    if (!currentProfile || !profiles[currentProfile]) return;
    
    const mapSettings = getCurrentMapPosition();
    if (!mapSettings) return;
    
    profiles[currentProfile].data.mapSettings = mapSettings;

    // Zapisz profile do localStorage od razu
    saveProfiles();
    
    console.log(`Zapisano pozycję mapy dla profilu: ${profiles[currentProfile].name}`);
    console.log(`Scale: ${mapSettings.defaultScale}, OffsetX: ${mapSettings.defaultOffsetX}, OffsetY: ${mapSettings.defaultOffsetY}`);
}

function loadProfileData(profileId) {
    if (!profiles[profileId]) {
        console.error(`Cannot load profile data: profile ${profileId} doesn't exist!`);
        return;
    }
    
    try {
        const profileData = profiles[profileId].data;

        const bodyElement = document.body;
        if (bodyElement) {
            bodyElement.classList.add('profile-transition', 'fade-out');
        }

        // Wyczyść aktualny stan localStorage
        localStorage.removeItem('weeklyKillData');
        localStorage.removeItem('lastWeeklyReset');
        localStorage.removeItem('killedBosses');
        localStorage.removeItem('bossRoutes');
        localStorage.removeItem('clickedPokestops');
        localStorage.removeItem('clickedExcavitions');

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
        
        // Załaduj dane clickedPokestops
        if (profileData.clickedPokestops) {
            localStorage.setItem('clickedPokestops', JSON.stringify(profileData.clickedPokestops));
        }
        if (profileData.clickedExcavitions) {
            localStorage.setItem('clickedExcavitions', JSON.stringify(profileData.clickedExcavitions));
        }
        // Resetuj stan tras
        resetRouteState();

        // Synchronizacja pozycji mapy w jednym kroku zamiast używania timeoutów
        function updateMapPositionWhenReady() {
            try {
                if (typeof scale !== 'undefined' && 
                    typeof offsetX !== 'undefined' && 
                    typeof offsetY !== 'undefined' && 
                    typeof updateMapTransform === 'function' && 
                    profileData.mapSettings) {
                    
                    scale = profileData.mapSettings.defaultScale || DEFAULT_SCALE;
                    offsetX = profileData.mapSettings.defaultOffsetX || 0;
                    offsetY = profileData.mapSettings.defaultOffsetY || 0;
                    
                    updateMapTransform();
                    console.log(`Updated map position: Scale=${scale}, OffsetX=${offsetX}, OffsetY=${offsetY}`);
                    return true;
                }
            } catch (e) {
                console.warn("Error updating map position:", e);
            }
            return false;
        }
        
        // Spróbuj natychmiast, a jeśli się nie uda, spróbuj ponownie za 1 sekundę
        if (!updateMapPositionWhenReady()) {
            setTimeout(updateMapPositionWhenReady, 1000);
        }

        // Zaktualizuj interfejs
        setTimeout(() => {
            try {
                if (typeof updateBossTimers === 'function') {
                    updateBossTimers();
                }

                if (typeof updatePokestopTimers === 'function') {
                    updatePokestopTimers(); // Dodajemy aktualizację timerów pokestopów
                }

                if (typeof updateWeeklyKillsDisplay === 'function') {
                    updateWeeklyKillsDisplay();
                }

                if (typeof displayBossIcons === 'function') {
                    displayBossIcons();
                }
            } catch (e) {
                console.warn("Error updating UI elements:", e);
            }

            if (bodyElement) {
                bodyElement.classList.remove('profile-transition', 'fade-out');
            }
        }, 800);
        
        console.log(`Loaded data for profile: ${profiles[profileId].name}`);
        return true;
    } catch (error) {
        console.error("Error loading profile data:", error);
        return false;
    }
}

function applyMapSettings(mapSettings) {
    if (!mapSettings) {
        console.warn("No map settings to apply");
        return;
    }
    
    try {
        if (typeof scale !== 'undefined' && 
            typeof offsetX !== 'undefined' && 
            typeof offsetY !== 'undefined' && 
            typeof updateMapTransform === 'function') {

            scale = mapSettings.defaultScale || DEFAULT_SCALE;
            offsetX = mapSettings.defaultOffsetX || 0;
            offsetY = mapSettings.defaultOffsetY || 0;
            
            console.log(`Applying map settings: Scale: ${scale}, OffsetX: ${offsetX}, OffsetY: ${offsetY}`);

            updateMapTransform();
        } else {
            console.warn("Map variables not available yet");
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
        }
    } catch (e) {
        console.warn("Error in safeLoadSavedRoutes:", e);
    }
}

function migrateExistingProfiles() {
    let needsSave = false;
    
    Object.keys(profiles).forEach(profileId => {
        const profile = profiles[profileId];

        if (!profile.data.mapSettings) {
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

        // Dodajemy sprawdzenie i migrację dla clickedPokestops
        if (!profile.data.clickedPokestops) {
            console.log(`Adding clickedPokestops property to profile: ${profile.name}`);
            profile.data.clickedPokestops = {};
            needsSave = true;
        }
        if (!profile.data.clickedExcavitions) {
            console.log(`Adding clickedExcavitions property to profile: ${profile.name}`);
            profile.data.clickedExcavitions = {};
            needsSave = true;
        }
    });
    
    if (needsSave) {
        console.log("Saving migrated profiles");
        saveProfiles();
    }
}

// Nasłuchiwacz na zdarzenia modyfikacji localStorage z innych części aplikacji
function setupLocalStorageChangeListener() {
    const originalSetItem = localStorage.setItem;
    
    localStorage.setItem = function(key, value) {
        // Wywołaj oryginalną metodę
        originalSetItem.apply(this, arguments);
        
        // Sprawdź, czy zmodyfikowane dane są związane z profilem
        const profileKeys = ['killedBosses', 'bossRoutes', 'weeklyKillData', 'lastWeeklyReset', 'clickedPokestops', 'clickedExcavitions'];
        if (profileKeys.includes(key) && currentProfile) {
            // Zaplanuj zapisanie profilu za chwilę (aby zbiorczo zapisać wiele zmian)
            setTimeout(() => {
                saveCurrentProfileData();
                saveProfiles();
            }, 100);
        }
    };
}

// Funkcja zatrzymująca automatyczne zapisywanie (używana przy wyładowywaniu strony)
function stopAutoSave() {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
        console.log("Auto-save disabled");
    }
    
    // Zapisz profil przed wyładowaniem strony
    if (currentProfile) {
        saveCurrentProfileData();
        saveProfiles();
    }
}

// Zapisz profil przed zamknięciem strony
window.addEventListener('beforeunload', function() {
    stopAutoSave();
    if (currentProfile) {
        saveCurrentProfileData();
        saveProfiles();
    }
});

window.addEventListener('load', function() {
    try {
        fixMissingElements();
        setTimeout(function() {
            initProfileSystem();
            migrateExistingProfiles();
            setupLocalStorageChangeListener();
            console.log("Wpisz 'saveMapPosition()' aby zapisać aktualną pozycję mapy jako domyślną");
        }, 1000);
    } catch (e) {
        console.error("Error during profile system initialization:", e);
    }
});