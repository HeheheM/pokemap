let scale = 0.5;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let startX, startY;
let currentOffsetX = 0;
let currentOffsetY = 0;
let currentIndex = 0;
let completedLocations = new Set();
let locations = [];
let locationsData = [];
let currentRegionFilter = "all";
let filteredLocations = [];
let bosses = {};
let bossIcons = [];
let currentRouteNumbers = [];

const WEEKLY_BOSS_LIMIT = 20;
const RESET_DAY = 1;
const RESET_HOUR = 0;
const RESET_MINUTE = 0;
const RESET_SECOND = 0;
const RESET_TIMEZONE = 'GMT';

let isDrawingArea = false;
let currentArea = [];
let areas = [];

const mapContainer = document.getElementById('map-container');
const map = document.getElementById('map');
const mapImage = document.getElementById('map-image');
const tooltip = document.getElementById('tooltip');
const locationSearch = document.getElementById('location-search');
const searchResults = document.getElementById('search-results');
const loadJsonBtn = document.getElementById('load-json');

const bossTooltip = document.createElement('div');
bossTooltip.className = 'boss-tooltip';
bossTooltip.style.display = 'none';
document.body.appendChild(bossTooltip);

const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const resetBtn = document.getElementById('reset');

async function loadLocationsData() {
    try {
        let response = await fetch('locations.json');
        
        if (!response.ok) {
            console.log(window.i18n.t("log.notFoundLocationsJson"));
            response = await fetch('mapinfo.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }
        
        const data = await response.json();
        console.log(window.i18n.t("log.loadedLocationsData"), data);
        return data;
    } catch (error) {
        console.error(window.i18n.t("log.errorLoadingLocationsData"), error);
        return [];
    }
}

async function loadBossesData() {
    try {
        const response = await fetch('bosses.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(window.i18n.t("log.loadedBossesData"), data);
        return data;
    } catch (error) {
        console.error(window.i18n.t("log.errorLoadingBossesJson"), error);
        return {};
    }
}

mapImage.onload = function() {
    centerMap();
    refreshMarkers();
};

mapImage.onerror = function() {
    alert(window.i18n.t("errors.loadingMap"));
};

function getWeeklyKillData() {
    try {
        const savedData = localStorage.getItem('weeklyKillData');
        
        if (savedData) {
            const data = JSON.parse(savedData);
            
            const lastTimestamp = data.lastResetTimestamp || 0;
            const now = new Date();
            
            let lastReset = new Date(now);
            lastReset.setUTCHours(RESET_HOUR, RESET_MINUTE, RESET_SECOND, 0);

            while (lastReset > now || lastReset.getUTCDay() !== RESET_DAY) {
                lastReset.setUTCDate(lastReset.getUTCDate() - 1);
            }
            
            if (lastTimestamp < lastReset.getTime()) {
                console.log(window.i18n.t("log.dataFromBeforeReset"));
                
                const resetData = {
                    killCount: 0,
                    lastResetTimestamp: Date.now(),
                    kills: []
                };
                
                localStorage.setItem('weeklyKillData', JSON.stringify(resetData));
                return resetData;
            }
            
            return data;
        }
    } catch (error) {
        console.error(window.i18n.t("log.errorReadingWeeklyKillData"), error);
    }
    
    return {
        killCount: 0,
        lastResetTimestamp: Date.now(),
        kills: []
    };
}

function saveWeeklyKillData(data) {
    try {
        localStorage.setItem('weeklyKillData', JSON.stringify(data));
    } catch (error) {
        console.error(window.i18n.t("log.errorSavingWeeklyKillData"), error);
    }
}


function addWeeklyKill(bossName) {
    const data = getWeeklyKillData();
    
    if (data.killCount >= WEEKLY_BOSS_LIMIT) {
        console.log(window.i18n.t("log.weeklyKillLimitReached"));
        return false;
    }
    
    data.killCount++;
    data.kills.push({
        bossName: bossName,
        timestamp: Date.now()
    });
    
    localStorage.setItem('weeklyKillData', JSON.stringify(data));
    
    updateWeeklyKillsDisplay();
    
    return true;
}

function shouldResetWeeklyCounter() {
    const now = new Date();
    
    let lastResetTime = null;
    try {
        const data = localStorage.getItem('lastWeeklyReset');
        if (data) {
            lastResetTime = new Date(JSON.parse(data));
        }
    } catch (error) {
        console.error(window.i18n.t("log.errorGettingLastResetTime"), error);
    }
    
    if (!lastResetTime) {
        const initialReset = new Date(now);
        initialReset.setUTCDate(initialReset.getUTCDate() - 1);
        
        try {
            localStorage.setItem('lastWeeklyReset', JSON.stringify(initialReset));
        } catch (error) {
            console.error(window.i18n.t("log.errorStoringInitialResetTime"), error);
        }
        
        return true;
    }

    const nextResetAfterLast = new Date(lastResetTime);
    
    nextResetAfterLast.setUTCDate(nextResetAfterLast.getUTCDate() + 7);
    nextResetAfterLast.setUTCHours(RESET_HOUR, RESET_MINUTE, RESET_SECOND, 0);
    return now >= nextResetAfterLast;
}

function getNextResetTime() {
    const now = new Date();
    let nextReset = new Date(now);

    nextReset.setUTCHours(RESET_HOUR, RESET_MINUTE, RESET_SECOND, 0);
    
    const currentDay = nextReset.getUTCDay();
    const daysUntilTuesday = (RESET_DAY - currentDay + 7) % 7;

    if (daysUntilTuesday === 0 && now > nextReset) {
        nextReset.setUTCDate(nextReset.getUTCDate() + 7);
    } else {
        nextReset.setUTCDate(nextReset.getUTCDate() + daysUntilTuesday);
    }
    
    return nextReset;
}

function resetWeeklyCounter() {
    console.log(window.i18n.t("log.weeklyCounterReset"));
    
    const resetData = {
        killCount: 0,
        lastResetTimestamp: Date.now(),
        kills: []
    };

    localStorage.setItem('weeklyKillData', JSON.stringify(resetData));

    const killedButtons = document.querySelectorAll('.killed-button');
    killedButtons.forEach(button => {
        const bossName = button.dataset.bossName;
        if (bossName && isBossAvailable(bossName)) {
            button.querySelector('img').style.opacity = '1.0';
            button.style.pointerEvents = 'auto';
            button.style.cursor = 'pointer';
        }
    });
    
    console.log(window.i18n.t("log.weeklyKillCounterResetToZero"));
    updateWeeklyKillsDisplay();
    
    return true;
}

function formatNextResetTime() {
    const now = new Date();
    const nextReset = getNextResetTime();

    const timeRemaining = nextReset - now;

    if (shouldResetWeeklyCounter()) {

        resetWeeklyCounter();
        return window.i18n.t("weeklyKills.resettingNow");
    }
    
    const days = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);
    
    if (timeRemaining <= 5000) {
        return window.i18n.t("weeklyKills.resettingNow");
    }
    
    let resetString = window.i18n.t("weeklyKills.resetsIn") + " ";

    if (days === 0 && hours === 0 && minutes === 0) {
        resetString += seconds + " " + (seconds !== 1 ? window.i18n.t("time.seconds") : window.i18n.t("time.second"));
    } else if (days === 0 && hours === 0) {
        resetString += `${minutes} ${window.i18n.t("time.min")} ${seconds} ${window.i18n.t("time.sec")}`;
    } else if (days === 0) {
        resetString += `${hours} ${hours !== 1 ? window.i18n.t("time.hours") : window.i18n.t("time.hour")} ${minutes} ${window.i18n.t("time.min")}`;
    } else {
        resetString += `${days} ${days !== 1 ? window.i18n.t("time.days") : window.i18n.t("time.day")} ${hours} ${window.i18n.t("time.hr")} ${minutes} ${window.i18n.t("time.min")}`;
    }
    
    return resetString;
}

function updateWeeklyKillsDisplay() {
    const data = getWeeklyKillData();
    const routeCreatorSidebar = document.getElementById('route-creator-sidebar');
    
    if (!routeCreatorSidebar) return;

    let counterElement = document.getElementById('weekly-kills-counter');
    
    if (!counterElement) {
        counterElement = document.createElement('div');
        counterElement.id = 'weekly-kills-counter';
        counterElement.className = 'weekly-kills-counter';
        routeCreatorSidebar.appendChild(counterElement);
        counterElement.style.position = 'fixed';
        counterElement.style.bottom = '20px';
        counterElement.style.width = 'calc(100% - 40px)';
        counterElement.style.maxWidth = '260px';
        counterElement.style.zIndex = '1000';
        counterElement.style.backgroundColor = '#444';
        counterElement.style.padding = '10px';
        counterElement.style.borderRadius = '5px';
        counterElement.style.boxShadow = '0 -2px 10px rgba(0, 0, 0, 0.2)';
        counterElement.style.left = '5px';
    }

    const limitReached = data.killCount >= WEEKLY_BOSS_LIMIT;

    counterElement.className = limitReached ? 
        'weekly-kills-counter limit-reached' : 
        'weekly-kills-counter';
        
    counterElement.innerHTML = `
        <h4>${window.i18n.t("weeklyKills.title")}</h4>
        <div class="counter ${limitReached ? 'limit-reached' : ''}">
            ${data.killCount}/${WEEKLY_BOSS_LIMIT}
        </div>
        <div class="reset-info">
            ${formatNextResetTime()}
        </div>
    `;
}

function initWeeklyKillTracker() {

    function forceResetWeeklyKillCount() {
        console.log(window.i18n.t("log.forceResettingWeeklyKillCount"));
        
        const resetData = {
            killCount: 0,
            lastResetTimestamp: Date.now(),
            kills: []
        };
        localStorage.setItem('weeklyKillData', JSON.stringify(resetData));

        const counterElement = document.querySelector('.weekly-kills-counter .counter');
        if (counterElement) {
            counterElement.textContent = "0/20";
            counterElement.classList.remove('limit-reached');
            console.log(window.i18n.t("log.domCounterUpdatedToZero"));
        }

        const killedButtons = document.querySelectorAll('.killed-button');
        killedButtons.forEach(button => {
            const bossName = button.dataset.bossName;
            if (bossName && isBossAvailable(bossName)) {
                button.querySelector('img').style.opacity = '1.0';
                button.style.pointerEvents = 'auto';
                button.style.cursor = 'pointer';
            }
        });

        setTimeout(() => {
            try {
                const emergencyContainer = document.getElementById('emergency-boss-container');
                if (emergencyContainer && emergencyContainer.style.display !== 'none') {
                    emergencyDisplayRouteBosses();
                }
            } catch (e) {
                console.log(window.i18n.t("log.errorRefreshingBossList"), e);
            }
        }, 100);
    }

    setInterval(() => {
        const now = new Date();
        let nextReset = new Date();
        nextReset.setUTCHours(RESET_HOUR, RESET_MINUTE, RESET_SECOND, 0);
        while (nextReset.getUTCDay() !== RESET_DAY || nextReset <= now) {
            nextReset.setUTCDate(nextReset.getUTCDate() + 1);
        }
        const timeRemaining = nextReset - now;
        if (timeRemaining <= 0) {
            console.log(window.i18n.t("log.resetTimeReached"));
            forceResetWeeklyKillCount();
        } else if (timeRemaining < 10000) {
            console.log(window.i18n.t("log.resetInSeconds", [Math.floor(timeRemaining/1000)]));
        }
        updateWeeklyKillsDisplay();
    }, 1000);
    window.forceResetWeeklyKillCount = forceResetWeeklyKillCount;
    const data = getWeeklyKillData();
    console.log(window.i18n.t("log.initialWeeklyKillCount"), data.killCount);
}

function markBossAsKilled(bossName) {
    if (!isBossAvailable(bossName)) {
        console.log(window.i18n.t("log.bossAlreadyOnCooldown", [bossName]));
        return false;
    }

    const weeklyData = getWeeklyKillData();
    if (weeklyData.killCount >= WEEKLY_BOSS_LIMIT) {
        console.log(window.i18n.t("log.weeklyLimitReached", [WEEKLY_BOSS_LIMIT]));

        alert(window.i18n.t("weeklyKills.limit", [WEEKLY_BOSS_LIMIT, formatNextResetTime()]));
        
        return false;
    }
    
    console.log(window.i18n.t("log.markingBossAsKilled", [bossName]));
    const bossData = bosses[bossName] || {};

    let cooldownHours = 24;
    if (bossData.cooldown) {
        let cooldownMatch;

        if (bossData.cooldown.includes("day")) {
            cooldownMatch = bossData.cooldown.match(/(\d+)\s*days?/i);
            if (cooldownMatch && cooldownMatch[1]) {
                const days = parseInt(cooldownMatch[1], 10);
                cooldownHours = days * 24;
                console.log(window.i18n.t("log.recognizedCooldownDays", [days, cooldownHours]));
            }
        } 
        else if (bossData.cooldown.includes("hour")) {
            cooldownMatch = bossData.cooldown.match(/(\d+)\s*hours?/i);
            if (cooldownMatch && cooldownMatch[1]) {
                cooldownHours = parseInt(cooldownMatch[1], 10);
                console.log(window.i18n.t("log.recognizedCooldownHours", [cooldownHours]));
            }
        } 
        else {
            cooldownMatch = bossData.cooldown.match(/(\d+)/);
            if (cooldownMatch && cooldownMatch[1]) {
                cooldownHours = parseInt(cooldownMatch[1], 10);
                console.log(window.i18n.t("log.recognizedCooldownAssumeHours", [cooldownHours]));
            }
        }
    }

    const now = Date.now();
    const availableAt = now + (cooldownHours * 60 * 60 * 1000);

    let killedBosses = {};
    try {
        const savedData = localStorage.getItem('killedBosses');
        if (savedData) {
            killedBosses = JSON.parse(savedData);
        }
    } catch (error) {
        console.error(window.i18n.t("log.errorReadingFromLocalStorage"), error);
    }

    killedBosses[bossName] = {
        killedAt: now,
        availableAt: availableAt,
        cooldownHours: cooldownHours
    };

    try {
        localStorage.setItem('killedBosses', JSON.stringify(killedBosses));
    } catch (error) {
        console.error(window.i18n.t("log.errorSavingToLocalStorage"), error);
    }

    const routeNumbersBeforeRefresh = [];
    const routeNumberElements = document.querySelectorAll('.route-number');
    
    routeNumberElements.forEach(element => {
        routeNumbersBeforeRefresh.push({
            left: element.style.left,
            top: element.style.top,
            textContent: element.textContent
        });
    });

    addWeeklyKill(bossName);
    updateBossTimers();
    displayBossIcons();
    restoreRouteNumbers(routeNumbersBeforeRefresh);
    updateWeeklyKillsDisplay();
    
    return true;
}
function restoreRouteNumbers(routeNumbersData) {
    const currentNumbers = document.querySelectorAll('.route-number');
    currentNumbers.forEach(number => number.remove());
    routeNumbersData.forEach(data => {
        const numberElement = document.createElement('div');
        numberElement.className = 'route-number';
        numberElement.textContent = data.textContent;
        numberElement.style.position = 'absolute';
        numberElement.style.left = data.left;
        numberElement.style.top = data.top;
        numberElement.style.backgroundColor = 'red';
        numberElement.style.color = 'white';
        numberElement.style.borderRadius = '50%';
        numberElement.style.width = '24px';
        numberElement.style.height = '24px';
        numberElement.style.display = 'flex';
        numberElement.style.alignItems = 'center';
        numberElement.style.justifyContent = 'center';
        numberElement.style.fontWeight = 'bold';
        numberElement.style.fontSize = '14px';
        numberElement.style.zIndex = '30';
        numberElement.style.transform = 'translate(-50%, -50%)';
        numberElement.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
        map.appendChild(numberElement);
        currentRouteNumbers.push(numberElement);
    });
}
function isBossAvailable(bossName) {
    try {
        const savedData = localStorage.getItem('killedBosses');
        if (savedData) {
            const killedBosses = JSON.parse(savedData);
            if (killedBosses[bossName]) {
                return Date.now() >= killedBosses[bossName].availableAt;
            }
        }
        return true;
    } catch (error) {
        console.error(window.i18n.t("log.errorCheckingBossAvailability"), error);
        return true;
    }
}

function formatTimeRemaining(milliseconds) {
    if (milliseconds <= 0) return window.i18n.t("boss.available");
    
    const seconds = Math.floor((milliseconds / 1000) % 60).toString().padStart(2, '0');
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60).toString().padStart(2, '0');
    const hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24)).toString().padStart(2, '0');
    
    return `${days}:${hours}:${minutes}:${seconds}`;
}
function updateBossTimers() {
    let killedBosses = {};
    try {
        const savedData = localStorage.getItem('killedBosses');
        if (savedData) {
            killedBosses = JSON.parse(savedData);
        }
    } catch (error) {
        console.error(window.i18n.t("log.errorReadingFromLocalStorage"), error);
        return;
    }
    const timerElements = document.querySelectorAll('.boss-timer');
    timerElements.forEach(timerElement => {
        const bossName = timerElement.dataset.bossName;
        if (!bossName) return;
        const killedButton = timerElement.closest('div').closest('div').parentElement.querySelector('.killed-button');
        
        if (killedBosses[bossName] && killedBosses[bossName].availableAt) {
            const availableAt = killedBosses[bossName].availableAt;
            const now = Date.now();
            const timeRemaining = availableAt - now;
            
            if (timeRemaining <= 0) {
                timerElement.textContent = window.i18n.t("boss.available");
                timerElement.style.color = "#4CAF50";
                
                if (killedButton) {
                    killedButton.querySelector('img').style.opacity = "1.0";
                    killedButton.style.pointerEvents = "auto";
                    killedButton.style.cursor = "pointer";
                }

                delete killedBosses[bossName];
                try {
                    localStorage.setItem('killedBosses', JSON.stringify(killedBosses));
                } catch (error) {
                    console.error(window.i18n.t("log.errorSavingToLocalStorage"), error);
                }
                const routeNumbersBeforeRefresh = [];
                const routeNumberElements = document.querySelectorAll('.route-number');
                
                routeNumberElements.forEach(element => {
                    routeNumbersBeforeRefresh.push({
                        left: element.style.left,
                        top: element.style.top,
                        textContent: element.textContent
                    });
                });
                displayBossIcons();
                restoreRouteNumbers(routeNumbersBeforeRefresh);
            } else {
                timerElement.textContent = window.i18n.t("boss.availableIn") + ": " + formatTimeRemaining(timeRemaining);
                timerElement.style.color = "#FF5722";
                
                if (killedButton) {
                    killedButton.querySelector('img').style.opacity = "0.5";
                    killedButton.style.pointerEvents = "none";
                    killedButton.style.cursor = "not-allowed";
                }
            }
        } else {
            timerElement.textContent = window.i18n.t("boss.available");
            timerElement.style.color = "#4CAF50";
            
            if (killedButton) {
                killedButton.querySelector('img').style.opacity = "1.0";
                killedButton.style.pointerEvents = "auto";
                killedButton.style.cursor = "pointer";
            }
        }
    });
}

function initBossTimers() {
    updateBossTimers();
    setInterval(updateBossTimers, 1000);
}

function centerMap() {
    const containerWidth = mapContainer.clientWidth;
    const containerHeight = mapContainer.clientHeight;

    const targetX = 3170;
    const targetY = 3122;

    offsetX = containerWidth/2 - targetX * scale;
    offsetY = containerHeight/2 - targetY * scale;

    updateMapTransform();
}

function centerMapOnBoss(bossName) {
    console.log(window.i18n.t("log.centeringMapOnBoss", [bossName]));
    const bossData = bosses[bossName] || {};
    let position;
    
    if (bossData.map_pos && bossData.map_pos.length >= 2) {
        position = bossData.map_pos;
    } else if (bossData.location) {
        const locationMatch = locations.find(loc => 
            loc.tooltip === bossData.location || 
            loc.map === bossData.location
        );
        
        if (locationMatch && locationMatch.map_pos) {
            position = locationMatch.map_pos;
        }
    }
    
    if (!position) {
        console.log(window.i18n.t("log.cannotFindBossPosition", [bossName]));
        return;
    }
    const containerWidth = mapContainer.clientWidth;
    const containerHeight = mapContainer.clientHeight;

    scale = 2.5;

    offsetX = (containerWidth / 2) - (position[0] * scale);
    offsetY = (containerHeight / 2) - (position[1] * scale);
    
    updateMapTransform();
}

function updateMapTransform() {
    const containerWidth = mapContainer.clientWidth;
    const containerHeight = mapContainer.clientHeight;
    const mapWidth = mapImage.width * scale;
    const mapHeight = mapImage.height * scale;

    const minOffsetX = Math.min(containerWidth - mapWidth, 0);
    const minOffsetY = Math.min(containerHeight - mapHeight, 0);
    
    if (mapWidth < containerWidth) {
        offsetX = (containerWidth - mapWidth) / 2;
    } else {
        offsetX = Math.max(minOffsetX, Math.min(0, offsetX));
    }
    
    if (mapHeight < containerHeight) {
        offsetY = (containerHeight - mapHeight) / 2;
    } else {
        offsetY = Math.max(minOffsetY, Math.min(0, offsetY));
    }
    
    map.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

function refreshMarkers() {
    const markers = document.querySelectorAll('.location-point');
    markers.forEach(marker => marker.remove());

    const polygons = document.querySelectorAll('.area-polygon');
    polygons.forEach(polygon => polygon.remove());

    locations.forEach((location) => {
        if (location.polygon_points && location.polygon_points.length >= 3) {
            renderAreaPolygon(location);
        }
    });

    displayBossIcons();
}

function enableClickEventsOnAreas() {
    const areas = document.querySelectorAll('.area-polygon, .location-point');
    areas.forEach(area => {
        area.style.pointerEvents = 'auto';
    });
}

function disableClickEventsOnAreas() {
    const areas = document.querySelectorAll('.area-polygon, .location-point');
    areas.forEach(area => {
        area.style.pointerEvents = 'none';
    });
}

function showTooltip(e) {
    const name = this.dataset.name;
    
    tooltip.textContent = name;
    tooltip.style.left = `${e.clientX + 15}px`;
    tooltip.style.top = `${e.clientY}px`;
    tooltip.style.opacity = '1';
}

function hideTooltip() {
    tooltip.style.opacity = '0';
}

function renderAreaPolygon(location) {
    if (!location.polygon_points || location.polygon_points.length < 3) {
        return;
    }
    
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "area-polygon");

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    location.polygon_points.forEach(point => {
        minX = Math.min(minX, point[0]);
        minY = Math.min(minY, point[1]);
        maxX = Math.max(maxX, point[0]);
        maxY = Math.max(maxY, point[1]);
    });

    minX -= 2;
    minY -= 2;
    maxX += 2;
    maxY += 2;

    svg.style.left = `${minX}px`;
    svg.style.top = `${minY}px`;
    svg.style.width = `${maxX - minX}px`;
    svg.style.height = `${maxY - minY}px`;

    svg.setAttribute("viewBox", `${minX} ${minY} ${maxX - minX} ${maxY - minY}`);
    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    const points = location.polygon_points.map(p => `${p[0]},${p[1]}`).join(' ');
    polygon.setAttribute("points", points);
    svg.appendChild(polygon);
    svg.dataset.name = location.tooltip;
    svg.addEventListener('mousemove', showTooltip);
    svg.addEventListener('mouseleave', hideTooltip);
    
    // Zmiana - teraz po kliknięciu w lokację pokaże obrazy zamiast centrowania mapy
    svg.addEventListener('click', function(e) {
        e.stopPropagation();
        // Wywołujemy nową funkcję showLocationImages zamiast centerMapOnLocation
        if (typeof showLocationImages === 'function') {
            showLocationImages(location);
        } else {
            console.error("Funkcja showLocationImages nie jest dostępna");
        }
    });
    
    map.appendChild(svg);
}
function saveRouteToJson() {
    const routeSelect = document.getElementById('route-select');
    const selectedRouteIndex = routeSelect.value;
    
    if (selectedRouteIndex === '' || !routes[selectedRouteIndex]) {
        alert(window.i18n.t("route.pleaseSelectRouteToSave"));
        return;
    }
    
    const selectedRoute = routes[selectedRouteIndex];

    const routeBosses = selectedRoute.bosses.map(boss => ({
        name: boss.name,
        position: boss.position
    }));
    
    const routeData = {
        name: selectedRoute.name,
        bosses: routeBosses
    };

    const jsonString = JSON.stringify(routeData, null, 2);

    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedRoute.name.replace(/[^a-z0-9]/gi, '_')}.json`;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
}

function loadSavedRoutes() {
    console.log(window.i18n.t("log.loadingSavedRoutesFromLocalStorage"));

    const routeSelect = document.getElementById('route-select');
    if (!routeSelect) {
        console.error(window.i18n.t("log.routeSelectElementNotFound"));
        return;
    }

    while (routeSelect.options.length > 1) {
        routeSelect.remove(1);
    }

    try {
        const savedRoutes = localStorage.getItem('bossRoutes');
        if (savedRoutes) {
            routes = JSON.parse(savedRoutes);
            console.log(window.i18n.t("log.loadedRoutesFromLocalStorage", [routes.length]));
            routes.forEach((route, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = route.name || window.i18n.t("route.routeNumber", [index + 1]);
                routeSelect.appendChild(option);
            });
        } else {
            console.log(window.i18n.t("log.noSavedRoutesFound"));
            routes = [];
        }
    } catch (error) {
        console.error(window.i18n.t("log.errorLoadingRoutesFromLocalStorage"), error);
        routes = [];
    }

    const routeCount = document.getElementById('route-count');
    if (routeCount) {
        routeCount.textContent = routes.length;
    }
}

function loadRouteFromJson() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const routeData = JSON.parse(e.target.result);

                if (!routeData.name || !Array.isArray(routeData.bosses)) {
                    throw new Error(window.i18n.t("route.invalidRouteJsonStructure"));
                }

                const existingRouteIndex = routes.findIndex(r => r.name === routeData.name);
                
                if (existingRouteIndex !== -1) {
                    if (confirm(window.i18n.t("route.routeExists", [routeData.name]))) {
                        routes[existingRouteIndex] = routeData;
                    } else {
                        routeData.name = `${routeData.name} (${window.i18n.t("route.imported")})`;
                        routes.push(routeData);
                    }
                } else {
                    routes.push(routeData);
                }

                localStorage.setItem('bossRoutes', JSON.stringify(routes));
                loadSavedRoutes();
                alert(window.i18n.t("route.routeLoaded", [routeData.name]));

                const routeSelect = document.getElementById('route-select');
                const newRouteIndex = routes.findIndex(r => r.name === routeData.name);
                if (newRouteIndex !== -1 && routeSelect) {
                    routeSelect.value = newRouteIndex;
                    const event = new Event('change');
                    routeSelect.dispatchEvent(event);
                }
                
            } catch (error) {
                console.error(window.i18n.t("log.errorLoadingJsonFile"), error);
                alert(window.i18n.t("route.errorLoadingFile", [error.message]));
            }
        };
        
        reader.onerror = function() {
            alert(window.i18n.t("route.errorReadingFile"));
        };
        
        reader.readAsText(file);
    });

    document.body.appendChild(fileInput);
    fileInput.click();

    setTimeout(() => {
        document.body.removeChild(fileInput);
    }, 100);
}

function saveToJson() {
    const jsonString = JSON.stringify(locations, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'locations.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function loadFromJson() {
    console.log(window.i18n.t("log.loadFromJsonCalled"));

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    
    fileInput.addEventListener('change', function(e) {
        console.log(window.i18n.t("log.fileSelected"), e.target.files);
        
        const file = e.target.files[0];
        if (!file) {
            console.log(window.i18n.t("log.noFileSelected"));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            console.log(window.i18n.t("log.fileLoaded"));
            try {
                const loadedData = JSON.parse(e.target.result);
                console.log(window.i18n.t("log.jsonParsed"), loadedData);

                if (!Array.isArray(loadedData)) {
                    throw new Error(window.i18n.t("route.invalidFileFormat"));
                }

                locations = loadedData;
                console.log(window.i18n.t("log.processedAllLocations"));
                refreshMarkers();
                displayBossIcons();
                alert(window.i18n.t("log.loadedLocations", [locations.length]));
                
            } catch (error) {
                console.error(window.i18n.t("log.errorLoadingJsonFile"), error);
                alert(window.i18n.t("route.errorLoadingFile", [error.message]));
            }
        };
        
        reader.onerror = function(error) {
            console.error(window.i18n.t("log.errorReadingFile"), error);
            alert(window.i18n.t("route.errorReadingFile"));
        };
        
        reader.readAsText(file);
    });
    document.body.appendChild(fileInput);
    fileInput.click();
    setTimeout(() => {
        document.body.removeChild(fileInput);
    }, 100);
}

function centerMapOnLocation(location) {
    if (!location.map_pos || !Array.isArray(location.map_pos) || location.map_pos.length < 2) {
        console.log(window.i18n.t("log.locationHasNoCoordinates", [location.tooltip]));
        return;
    }
    
    // Jeśli przekazano argument fromClick=true, to nie centrujemy widoku
    // Ten argument będzie używany tylko w przypadku wyszukiwania lokacji lub innych funkcji programowych
    if (arguments.length > 1 && arguments[1] === true) {
        const containerWidth = mapContainer.clientWidth;
        const containerHeight = mapContainer.clientHeight;
        scale = 2;
        offsetX = (containerWidth / 2) - (location.map_pos[0] * scale);
        offsetY = (containerHeight / 2) - (location.map_pos[1] * scale);
        
        updateMapTransform();
    } else {
        // W przypadku kliknięcia w lokację, wywołujemy funkcję pokazującą obrazy
        if (typeof showLocationImages === 'function') {
            showLocationImages(location);
        } else {
            console.error("Funkcja showLocationImages nie jest dostępna");
        }
    }
}

function setupRegionFilter() {
    const regionFilterSelect = document.getElementById('region-filter');
    
    if (!regionFilterSelect) {
        console.error(window.i18n.t("log.regionFilterElementNotFound"));
        return;
    }

    const uniqueRegions = new Set();
    
    Object.values(bosses).forEach(boss => {
        if (boss.region) {
            uniqueRegions.add(boss.region);
        }
    });

    while (regionFilterSelect.options.length > 1) {
        regionFilterSelect.remove(1);
    }

    const hideAllOption = document.createElement('option');
    hideAllOption.value = "hide_all";
    hideAllOption.textContent = window.i18n.t("filter.hideAll");
    regionFilterSelect.add(hideAllOption, 1);

    uniqueRegions.forEach(region => {
        const option = document.createElement('option');
        option.value = region;
        option.textContent = region;
        regionFilterSelect.appendChild(option);
    });

    regionFilterSelect.addEventListener('change', function() {
        currentRegionFilter = this.value;
        displayBossIcons();
    });
}

function showLocationTooltip(location) {
    tooltip.textContent = location.tooltip;
    if (location.map_pos && Array.isArray(location.map_pos) && location.map_pos.length >= 2) {
        const x = location.map_pos[0] * scale + offsetX;
        const y = location.map_pos[1] * scale + offsetY;

        const containerWidth = mapContainer.clientWidth;
        const containerHeight = mapContainer.clientHeight;
        
        tooltip.style.left = `${containerWidth / 2}px`;
        tooltip.style.top = `${containerHeight / 2 - 50}px`;
        tooltip.style.opacity = '1';

        tooltip.style.transform = 'translate(-50%, -50%)';
        tooltip.style.textAlign = 'center';
        tooltip.style.padding = '10px 15px';
        tooltip.style.fontSize = '16px';
        tooltip.style.fontWeight = 'bold';
        tooltip.style.zIndex = '1000';
        tooltip.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';

        setTimeout(() => {
            tooltip.style.opacity = '0';
            setTimeout(() => {
                tooltip.style.transform = '';
                tooltip.style.textAlign = '';
                tooltip.style.padding = '';
                tooltip.style.fontSize = '';
                tooltip.style.fontWeight = '';
                tooltip.style.zIndex = '';
                tooltip.style.boxShadow = '';
            }, 300);
        }, 3000);
    }
}

function displayBossIcons() {
    bossIcons.forEach(icon => icon.remove());
    bossIcons = [];

    const routeNumbers = document.querySelectorAll('.route-number');
    routeNumbers.forEach(number => number.remove());
    currentRouteNumbers = [];

    if (currentRegionFilter === "hide_all") {
        return;
    }

    Object.entries(bosses).forEach(([bossName, bossData]) => {
        if (currentRegionFilter !== "all" && bossData.region !== currentRegionFilter) {
            return;
        }
        
        let posX, posY;
        if (bossData.location) {
            const locationMatch = locations.find(loc => 
                loc.tooltip === bossData.location || 
                loc.map === bossData.location
            );

            if (locationMatch && locationMatch.map_pos) {
                [posX, posY] = locationMatch.map_pos;
            } 

            else if (bossData.map_pos && bossData.map_pos.length >= 2) {
                [posX, posY] = bossData.map_pos;
            } else {
                console.log(window.i18n.t("log.bossHasNoCorrectPosition", [bossName]));
                return;
            }
        } 

        else if (bossData.map_pos && bossData.map_pos.length >= 2) {
            [posX, posY] = bossData.map_pos;
        } else {
            console.log(window.i18n.t("log.bossHasNoCorrectPosition", [bossName]));
            return;
        }

        const bossIcon = document.createElement('div');
        bossIcon.className = 'boss-icon';
        bossIcon.style.left = `${posX}px`;
        bossIcon.style.top = `${posY}px`;

        const isAvailable = isBossAvailable(bossName);

        bossIcon.style.opacity = isAvailable ? "1.0" : "0.2";

        const bossImage = document.createElement('img');
        bossImage.src = `resources/bosses/${bossName}.png`;
        bossImage.alt = bossName;
        bossImage.onerror = function() {
            this.onerror = null;
            this.src = 'resources/bosses/default-boss.png';
            if (this.src.includes('default-boss.png')) {
                bossIcon.textContent = bossName.substring(0, 2);
                bossIcon.style.display = 'flex';
                bossIcon.style.alignItems = 'center';
                bossIcon.style.justifyContent = 'center';
                bossIcon.style.fontWeight = 'bold';
                bossIcon.style.color = 'white';
                bossIcon.style.textShadow = '1px 1px 2px black';
            }
        };
        bossIcon.appendChild(bossImage);
        bossIcon.dataset.bossName = bossName;
        
        // Kliknięcie myszą
        bossIcon.addEventListener('click', function(e) {
            e.stopPropagation();
            showBossTooltip(bossName, e.clientX, e.clientY);
        });

        // Obsługa zdarzeń dotykowych
        bossIcon.addEventListener('touchstart', function(e) {
            e.preventDefault(); // Zapobiega standardowym zachowaniom
            const touch = e.touches[0];
            tooltip.textContent = bossName;
            tooltip.style.left = `${touch.clientX + 15}px`;
            tooltip.style.top = `${touch.clientY}px`;
            tooltip.style.opacity = '1';
        });
        
        bossIcon.addEventListener('touchend', function(e) {
            e.preventDefault();
            tooltip.style.opacity = '0';
            
            if (e.changedTouches.length > 0) {
                const touch = e.changedTouches[0];
                showBossTooltip(bossName, touch.clientX, touch.clientY);
            }
        });

        // Standardowa obsługa myszy dla desktopów
        bossIcon.addEventListener('mouseover', function(e) {
            tooltip.textContent = bossName;
            tooltip.style.left = `${e.clientX + 15}px`;
            tooltip.style.top = `${e.clientY}px`;
            tooltip.style.opacity = '1';
        });
        
        bossIcon.addEventListener('mouseleave', function() {
            if (bossTooltip.style.display !== 'block') {
                tooltip.style.opacity = '0';
            }
        });

        map.appendChild(bossIcon);
        bossIcons.push(bossIcon);
    });
}

function showBossTooltip(bossName, x, y) {
    const bossData = bosses[bossName];
    if (!bossData) return;

    const wikiUrl = `https://wiki.pokemonrevolution.net/index.php?title=${encodeURIComponent(bossName)}_(boss)`;

    let tooltipContent = `
        <div class="boss-tooltip-header">
            <h3><a href="${wikiUrl}" target="_blank" style="color: #fff; text-decoration: underline; text-underline-offset: 3px;">${bossName}</a></h3>
            <span class="close-tooltip">&times;</span>
        </div>
        <div class="boss-tooltip-content">
            <p><strong>${window.i18n.t("boss.region")}:</strong> ${bossData.region || 'N/A'}</p>
            <p><strong>${window.i18n.t("boss.location")}:</strong> ${bossData.location || 'N/A'}</p>
            <p><strong>${window.i18n.t("boss.cooldown")}:</strong> ${bossData.cooldown || 'N/A'}</p>
    `;
    
    if (bossData.basic_requirements) {
        tooltipContent += `<div class="boss-requirements"><h4>${window.i18n.t("boss.basicRequirements")}:</h4><ul>`;
        Object.values(bossData.basic_requirements).forEach(req => {
            tooltipContent += `<li>${req}</li>`;
        });
        tooltipContent += '</ul></div>';
    }

    if (bossData.PokeTeam && Object.keys(bossData.PokeTeam).length > 0) {
        tooltipContent += `<div class="boss-poketeam"><h4>${window.i18n.t("boss.pokeTeam")}:</h4><ul>`;
        Object.values(bossData.PokeTeam).forEach(team => {
            tooltipContent += `<li>${team}</li>`;
        });
        tooltipContent += '</ul></div>';
    }
    
    tooltipContent += '</div>';
    bossTooltip.innerHTML = tooltipContent;
    
    // Dostosuj pozycjonowanie dla urządzeń mobilnych
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const isMobile = window.innerWidth <= 768; // Sprawdzenie czy to urządzenie mobilne
    
    let tooltipWidth = 400;
    let tooltipHeight = 300;
    
    // Na urządzeniach mobilnych, zmieniamy rozmiar tooltipa
    if (isMobile) {
        tooltipWidth = Math.min(300, viewportWidth * 0.85);
        // Ustawiamy stałą pozycję dla urządzeń mobilnych - centrum ekranu
        bossTooltip.style.width = `${tooltipWidth}px`;
        bossTooltip.style.maxWidth = `${tooltipWidth}px`;
        bossTooltip.style.left = `50%`;
        bossTooltip.style.top = `50%`;
        bossTooltip.style.transform = 'translate(-50%, -50%)';
    } else {
        // Na desktopie używamy dotychczasowej logiki
        let tooltipLeft = x + 15;
        let tooltipTop = y + 15;
        
        if (tooltipLeft + tooltipWidth > viewportWidth) {
            tooltipLeft = x - tooltipWidth - 15;
        }
        
        if (tooltipTop + tooltipHeight > viewportHeight) {
            tooltipTop = viewportHeight - tooltipHeight - 15;
        }
        
        bossTooltip.style.left = `${tooltipLeft}px`;
        bossTooltip.style.top = `${tooltipTop}px`;
        bossTooltip.style.transform = 'none';
    }
    
    bossTooltip.style.display = 'block';

    // Dodajemy zdarzenie do przycisku zamykania
    const closeButton = bossTooltip.querySelector('.close-tooltip');
    if (closeButton) {
        // Zwiększamy obszar dotyku dla przycisku zamykania na urządzeniach mobilnych
        if (isMobile) {
            closeButton.style.padding = '10px';
            closeButton.style.fontSize = '24px';
        }
        
        closeButton.addEventListener('click', function(e) {
            e.stopPropagation();
            bossTooltip.style.display = 'none';
        });
    }

    // Dodaj obsługę dotykowego zamykania tooltipa
    const handleOutsideClick = function(e) {
        if (!bossTooltip.contains(e.target) && e.target.className !== 'boss-icon' && !e.target.closest('.boss-icon')) {
            bossTooltip.style.display = 'none';
            document.removeEventListener('click', handleOutsideClick);
            document.removeEventListener('touchstart', handleOutsideClick);
        }
    };

    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
}

zoomInBtn.addEventListener('click', () => {
    scale *= 1.2;
    updateMapTransform();
});

zoomOutBtn.addEventListener('click', () => {
    scale /= 1.2;

    const MIN_SCALE = 0.5;
    if (scale < MIN_SCALE) scale = MIN_SCALE;
    
    updateMapTransform();
});

resetBtn.addEventListener('click', () => {
    scale = 0.5;
    centerMap();
});

if (loadJsonBtn) {
    loadJsonBtn.addEventListener('click', loadFromJson);
}

map.addEventListener('mousedown', function(e) {
    // Handle both left (0) and right (2) mouse buttons
    if (e.button !== 0 && e.button !== 2) return;

    e.preventDefault();
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    currentOffsetX = offsetX;
    currentOffsetY = offsetY;
    
    map.style.cursor = 'grabbing';
});

document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    offsetX = currentOffsetX + dx;
    offsetY = currentOffsetY + dy;

    updateMapTransform();
});

document.addEventListener('mouseup', function(e) {
    // Check if dragging was active and if left (0) or right (2) button was released
    // e.button === -1 handles cases when there's no mouse (e.g., on touch devices)
    if (isDragging && (e.button === 0 || e.button === 2 || e.button === -1)) {
        isDragging = false;
        map.style.cursor = 'grab';
    }
});

mapContainer.addEventListener('wheel', function(e) {
    e.preventDefault();
    const rect = mapContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const imageX = (mouseX - offsetX) / scale;
    const imageY = (mouseY - offsetY) / scale;
    const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;
    scale *= scaleFactor;
    const MIN_SCALE = 0.5;
    const MAX_SCALE = 5.0;
    
    if (scale < MIN_SCALE) scale = MIN_SCALE;
    if (scale > MAX_SCALE) scale = MAX_SCALE;

    offsetX = mouseX - imageX * scale;
    offsetY = mouseY - imageY * scale;

    updateMapTransform();
});

map.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
});
map.addEventListener('touchstart', function(e) {
    if (e.touches.length === 1) {
        e.preventDefault(); // Prevent scrolling
        
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        currentOffsetX = offsetX;
        currentOffsetY = offsetY;
        
        map.style.cursor = 'grabbing';
    }
}, { passive: false });

map.addEventListener('touchmove', function(e) {
    if (!isDragging || e.touches.length !== 1) return;
    
    e.preventDefault(); // Prevent scrolling
    
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    
    offsetX = currentOffsetX + dx;
    offsetY = currentOffsetY + dy;
    
    updateMapTransform();
}, { passive: false });

map.addEventListener('touchend', function(e) {
    if (isDragging) {
        isDragging = false;
        map.style.cursor = 'grab';
    }
});

// Add touch zoom support to the mapContainer
mapContainer.addEventListener('touchstart', function(e) {
    if (e.touches.length === 2) {
        e.preventDefault();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        
        // Store the initial distance and scale
        this.lastPinchDistance = dist;
        this.lastPinchScale = scale;
        
        // Store the midpoint of the two touches
        this.pinchMidX = (touch1.clientX + touch2.clientX) / 2;
        this.pinchMidY = (touch1.clientY + touch2.clientY) / 2;
    }
}, { passive: false });

mapContainer.addEventListener('touchmove', function(e) {
    if (e.touches.length === 2 && this.lastPinchDistance) {
        e.preventDefault();
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
        
        // Calculate scale change
        const pinchRatio = currentDist / this.lastPinchDistance;
        const newScale = this.lastPinchScale * pinchRatio;
        
        // Limit the scale
        const MIN_SCALE = 0.5;
        const MAX_SCALE = 5.0;
        
        if (newScale >= MIN_SCALE && newScale <= MAX_SCALE) {
            const rect = mapContainer.getBoundingClientRect();
            const pinchMidX = this.pinchMidX - rect.left;
            const pinchMidY = this.pinchMidY - rect.top;
            
            // Calculate the map coordinate under the pinch midpoint
            const imageX = (pinchMidX - offsetX) / scale;
            const imageY = (pinchMidY - offsetY) / scale;
            
            // Set the new scale
            scale = newScale;
            
            // Adjust offset to keep the pinch midpoint at the same place
            offsetX = pinchMidX - imageX * scale;
            offsetY = pinchMidY - imageY * scale;
            
            updateMapTransform();
        }
    }
}, { passive: false });

mapContainer.addEventListener('touchend', function(e) {
    // Reset pinch tracking
    this.lastPinchDistance = null;
    this.lastPinchScale = null;
});

// Add specific style for touch devices to improve usability
const touchStyle = document.createElement('style');
touchStyle.textContent = `
    @media (pointer: coarse) {
        #map, #map-container {
            cursor: grab !important;
        }
        #map:active, #map-container:active {
            cursor: grabbing !important;
        }
        .map-controls .control-btn {
            width: 50px;
            height: 50px;
            font-size: 24px;
        }
    }
`;
document.head.appendChild(touchStyle);



let routes = [];
let currentRoute = [];
let defaultSidebarContent = null;

function initRouteCreator() {
    const routeCreatorBtn = document.getElementById('route-creator-btn');
    const returnToMainBtn = document.getElementById('return-to-main-btn');
    const routeCreatorSidebar = document.getElementById('route-creator-sidebar');
    const routeSelect = document.getElementById('route-select');
    const newRouteBtn = document.getElementById('new-route-btn');
    const routeCreatorContainer = document.getElementById('route-creator-container');
    const bossSearch = document.getElementById('boss-search');
    const bossSearchResults = document.getElementById('boss-search-results');
    const selectedBossesContainer = document.getElementById('selected-bosses-container');
    const saveRouteBtn = document.getElementById('save-route-btn');
    const saveRouteJsonBtn = document.getElementById('save-route-json-btn');
    const loadRouteJsonBtn = document.getElementById('load-route-json-btn');
    const sidebarChildren = document.querySelectorAll('.sidebar > *:not(#route-creator-sidebar)');
    defaultSidebarContent = Array.from(sidebarChildren);

    // Dodaj obsługę drag and drop dla kontenera bossów
    setupDragAndDrop();

    routeCreatorBtn.addEventListener('click', function() {
        defaultSidebarContent.forEach(el => el.style.display = 'none');
        routeCreatorSidebar.style.display = 'block';
        loadSavedRoutes();
        updateWeeklyKillsDisplay();
    });

    returnToMainBtn.addEventListener('click', function() {
        defaultSidebarContent.forEach(el => el.style.display = '');
        routeCreatorSidebar.style.display = 'none';
        clearRouteNumbers();
        displayBossIcons();
        const emergencyBossContainer = document.getElementById('emergency-boss-container');
        if (emergencyBossContainer) {
            emergencyBossContainer.style.display = 'block';
        }
    });

    saveRouteJsonBtn.addEventListener('click', saveRouteToJson);
    loadRouteJsonBtn.addEventListener('click', loadRouteFromJson);

    function clearRouteNumbers() {
        currentRouteNumbers.forEach(number => number.remove());
        currentRouteNumbers = [];
    }

    function addRouteNumberToBoss(bossName, number) {
        const bossIcon = bossIcons.find(icon => icon.dataset.bossName === bossName);
        
        if (bossIcon) {
            const numberElement = document.createElement('div');
            numberElement.className = 'route-number';
            numberElement.textContent = number;
            numberElement.style.position = 'absolute';
            numberElement.style.left = bossIcon.style.left;
            numberElement.style.top = `${parseInt(bossIcon.style.top) - 30}px`;
            numberElement.style.backgroundColor = 'red';
            numberElement.style.color = 'white';
            numberElement.style.borderRadius = '50%';
            numberElement.style.width = '24px';
            numberElement.style.height = '24px';
            numberElement.style.display = 'flex';
            numberElement.style.alignItems = 'center';
            numberElement.style.justifyContent = 'center';
            numberElement.style.fontWeight = 'bold';
            numberElement.style.fontSize = '14px';
            numberElement.style.zIndex = '30';
            numberElement.style.transform = 'translate(-50%, -50%)';
            numberElement.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)';
            map.appendChild(numberElement);
            currentRouteNumbers.push(numberElement);
        }
    }
    
    // Nowa implementacja drag and drop
    function setupDragAndDrop() {
        // Wykorzystujemy delegację zdarzeń dla lepszej wydajności
        selectedBossesContainer.addEventListener('dragstart', handleDragStart);
        selectedBossesContainer.addEventListener('dragend', handleDragEnd);
        
        // Obsługa dla całego kontenera
        selectedBossesContainer.addEventListener('dragover', handleDragOver);
        selectedBossesContainer.addEventListener('drop', handleDrop);
    }
    
    // Zmienne do śledzenia operacji drag and drop
    let draggedElement = null;
    let draggedIndex = -1;
    
    // Obsługujemy rozpoczęcie przeciągania
    function handleDragStart(e) {
        // Upewniamy się, że zdarzenie pochodzi od elementu .selected-boss
        const bossElement = e.target.closest('.selected-boss');
        if (!bossElement) return;
        
        // Zapamiętujemy element i jego indeks
        draggedElement = bossElement;
        draggedIndex = parseInt(bossElement.dataset.index);
        
        // Dodajemy klasę dla wizualnego feedbacku
        bossElement.classList.add('dragging');
        
        // Ustawiamy dane dla operacji przeciągania
        e.dataTransfer.setData('text/plain', draggedIndex);
        
        // Tworzymy niestandardowy obraz przeciągania
        const ghostElement = bossElement.cloneNode(true);
        ghostElement.style.width = bossElement.offsetWidth + 'px';
        ghostElement.style.height = bossElement.offsetHeight + 'px';
        ghostElement.style.opacity = '0.7';
        ghostElement.style.position = 'absolute';
        ghostElement.style.top = '-1000px';
        document.body.appendChild(ghostElement);
        e.dataTransfer.setDragImage(ghostElement, 20, 20);
        
        // Usuwamy ghostElement po krótkiej chwili
        setTimeout(() => {
            document.body.removeChild(ghostElement);
        }, 0);
    }
    
    // Obsługujemy zakończenie przeciągania
    function handleDragEnd(e) {
        // Upewniamy się, że zdarzenie pochodzi od elementu .selected-boss
        const bossElement = e.target.closest('.selected-boss');
        if (!bossElement) return;
        
        // Usuwamy klasę dla wizualnego feedbacku
        bossElement.classList.remove('dragging');
        
        // Resetujemy wszystkie style i klasy z operacji drag
        document.querySelectorAll('.selected-boss').forEach(el => {
            el.classList.remove('drag-over');
        });
        
        // Resetujemy zmienne
        draggedElement = null;
        draggedIndex = -1;
    }
    
    // Obsługujemy przeciąganie nad potencjalnym miejscem upuszczenia
    function handleDragOver(e) {
        e.preventDefault(); // Konieczne, aby umożliwić upuszczanie
        
        // Znajdujemy najbliższy element .selected-boss, który nie jest przeciągany
        const targetElement = findDropTarget(e.clientY);
        
        // Usuwamy klasę drag-over ze wszystkich elementów
        document.querySelectorAll('.selected-boss').forEach(el => {
            if (el !== targetElement) {
                el.classList.remove('drag-over');
            }
        });
        
        // Dodajemy klasę drag-over do docelowego elementu
        if (targetElement && targetElement !== draggedElement) {
            targetElement.classList.add('drag-over');
        }
    }
    
    // Znajdujemy najbliższy element docelowy na podstawie pozycji kursora
    function findDropTarget(clientY) {
        const possibleTargets = Array.from(
            document.querySelectorAll('.selected-boss:not(.dragging)')
        );
        
        if (possibleTargets.length === 0) return null;
        
        // Znajdujemy element, nad którym znajduje się kursor
        return possibleTargets.find(element => {
            const box = element.getBoundingClientRect();
            return clientY >= box.top && clientY <= box.bottom;
        });
    }
    
    // Obsługujemy upuszczenie elementu
    function handleDrop(e) {
        e.preventDefault();
        
        // Znajdujemy docelowy element na podstawie pozycji kursora
        const targetElement = findDropTarget(e.clientY);
        
        // Jeśli nie ma docelowego elementu lub to ten sam element, kończymy
        if (!targetElement || targetElement === draggedElement) {
            document.querySelectorAll('.selected-boss').forEach(el => {
                el.classList.remove('drag-over');
            });
            return;
        }
        
        // Pobieramy indeks docelowego elementu
        const targetIndex = parseInt(targetElement.dataset.index);
        
        // Usuwamy przeciągany element z jego obecnej pozycji
        const bossToMove = currentRoute.splice(draggedIndex, 1)[0];
        
        // Określamy nową pozycję - przed lub po docelowym elemencie
        let newIndex = targetIndex;
        
        // Jeśli przeciągamy element z wyższej pozycji (mniejszy indeks)
        // na niższą (większy indeks), musimy uwzględnić przesunięcie
        if (draggedIndex < targetIndex) {
            newIndex = targetIndex;
        }
        
        // Wstawiamy element na nową pozycję
        currentRoute.splice(newIndex, 0, bossToMove);
        
        // Odświeżamy listę bossów
        refreshBossList();
        
        // Usuwamy klasę drag-over ze wszystkich elementów
        document.querySelectorAll('.selected-boss').forEach(el => {
            el.classList.remove('drag-over');
        });
    }

    routeSelect.addEventListener('change', function() {
        const routeIndex = this.value;
        console.log(window.i18n.t("log.routeSelected", [routeIndex]));
        
        if (routeIndex !== '') {
            if (routes[routeIndex]) {
                currentRoute = routes[routeIndex].bosses;
                console.log(window.i18n.t("log.currentRouteSet"), currentRoute);
                emergencyDisplayRouteBosses();
                routeCreatorContainer.style.display = 'none';
                const emergencyBossContainer = document.getElementById('emergency-boss-container');
                if (emergencyBossContainer) {
                    emergencyBossContainer.style.display = 'block';
                }
            } else {
                console.error(window.i18n.t("log.selectedRouteIndexDoesNotExist", [routeIndex]));
            }
        }
    });

    newRouteBtn.addEventListener('click', function() {
        routeCreatorContainer.style.display = 'block';
        currentRoute = [];
        clearRouteNumbers();
        routeSelect.value = '';
        selectedBossesContainer.innerHTML = '';
        bossSearch.focus();
        const emergencyBossContainer = document.getElementById('emergency-boss-container');
        if (emergencyBossContainer) {
            emergencyBossContainer.style.display = 'none';
        }
    });

    bossSearch.addEventListener('input', function() {
        updateBossSearchResults(this.value);
    });

    bossSearch.addEventListener('click', function() {
        updateBossSearchResults(this.value, true);
    });

    function updateBossSearchResults(searchText, showAll = false) {
        searchText = searchText.toLowerCase();
        if (!showAll && searchText.length < 2) {
            bossSearchResults.style.display = 'none';
            return;
        }
        bossSearchResults.innerHTML = '';

        let matchingBosses = Object.keys(bosses).filter(bossName => 
            !currentRoute.some(boss => boss.name === bossName) && 
            (showAll || bossName.toLowerCase().includes(searchText))
        );
        
        if (matchingBosses.length === 0) {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.textContent = window.i18n.t("search.noBossesFound");
            bossSearchResults.appendChild(resultItem);
        } else {
            matchingBosses.slice(0, 5).forEach(bossName => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result-item';
                resultItem.textContent = bossName;
                
                resultItem.addEventListener('click', function() {
                    selectBoss(bossName);
                    bossSearchResults.style.display = 'none';
                });
                
                bossSearchResults.appendChild(resultItem);
            });
        }

        bossSearchResults.style.display = 'block';
        bossSearchResults.style.zIndex = '1000';
        bossSearchResults.style.maxHeight = '200px';
        bossSearchResults.style.overflowY = 'auto';
        bossSearchResults.style.msOverflowStyle = 'none';
        bossSearchResults.style.scrollbarWidth = 'none';
        const style = document.createElement('style');
        style.textContent = '#boss-search-results::-webkit-scrollbar { display: none; }';
        if (!document.querySelector('style[data-scrollbar-hide]')) {
            style.setAttribute('data-scrollbar-hide', 'true');
            document.head.appendChild(style);
        }
    }

    function selectBoss(bossName) {
        const bossData = bosses[bossName];
        const position = bossData.map_pos || getLocationPosition(bossData.location);
        
        if (!position) {
            alert(window.i18n.t("log.cannotFindPositionForBoss", [bossName]));
            return;
        }
        
        const boss = {
            name: bossName,
            position: position
        };
        
        currentRoute.push(boss);
        const bossLocation = bossData.location || window.i18n.t("search.unknownLocation");
        const bossElement = document.createElement('div');
        bossElement.className = 'selected-boss';
        bossElement.draggable = true;
        bossElement.dataset.index = currentRoute.length - 1;
        bossElement.innerHTML = `
            <div class="boss-list-item">
                <div class="boss-number">${currentRoute.length}</div>
                <div class="boss-image">
                    <img src="resources/bosses/${bossName}.png" alt="${bossName}" onerror="this.src='resources/bosses/default-boss.png'">
                </div>
                <div class="boss-details">
                    <div class="boss-name">${bossName}</div>
                    <div class="boss-location">${bossLocation}</div>
                </div>
            </div>
            <button class="remove-boss-btn" data-index="${currentRoute.length - 1}">×</button>
        `;
        
        selectedBossesContainer.appendChild(bossElement);

        bossElement.querySelector('.remove-boss-btn').addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.dataset.index);
            removeBoss(index);
        });

        bossElement.addEventListener('click', function(e) {
            if (e.target.classList.contains('remove-boss-btn')) {
                return;
            }
            e.stopPropagation();
            centerMapOnBoss(bossName);
        });

        bossSearch.value = '';

        addRouteNumberToBoss(bossName, currentRoute.length);
    }

    function refreshBossList() {
        selectedBossesContainer.innerHTML = '';
        clearRouteNumbers();

        currentRoute.forEach((boss, i) => {
            const bossData = bosses[boss.name] || {};
            const bossLocation = bossData.location || window.i18n.t("search.unknownLocation");
            
            const bossElement = document.createElement('div');
            bossElement.className = 'selected-boss';
            bossElement.draggable = true;
            bossElement.dataset.index = i;
            bossElement.innerHTML = `
                <div class="boss-list-item">
                    <div class="boss-number">${i + 1}</div>
                    <div class="boss-image">
                        <img src="resources/bosses/${boss.name}.png" alt="${boss.name}" onerror="this.src='resources/bosses/default-boss.png'">
                    </div>
                    <div class="boss-details">
                        <div class="boss-name">${boss.name}</div>
                        <div class="boss-location">${bossLocation}</div>
                    </div>
                </div>
                <button class="remove-boss-btn" data-index="${i}">×</button>
            `;
            
            selectedBossesContainer.appendChild(bossElement);
        
            bossElement.querySelector('.remove-boss-btn').addEventListener('click', function(e) {
                e.stopPropagation();
                const index = parseInt(this.dataset.index);
                removeBoss(index);
            });

            bossElement.addEventListener('click', function(e) {
                if (e.target.classList.contains('remove-boss-btn')) {
                    return;
                }
                e.stopPropagation();
                centerMapOnBoss(boss.name);
            });

            addRouteNumberToBoss(boss.name, i + 1);
        });
    }

    function removeBoss(index) {
        currentRoute.splice(index, 1);
        refreshBossList();
    }

    function getLocationPosition(locationName) {
        if (!locationName) return null;
        
        const location = locations.find(loc => 
            loc.tooltip === locationName || 
            loc.map === locationName
        );
        
        return location ? location.map_pos : null;
    }

    saveRouteBtn.addEventListener('click', function() {
        if (currentRoute.length < 2) {
            alert(window.i18n.t("route.minBosses"));
            return;
        }
        
        const routeName = prompt(window.i18n.t("route.enterName"), window.i18n.t("route.routeNumber", [routes.length + 1]));
        if (!routeName) return;
        
        routes.push({
            name: routeName,
            bosses: currentRoute
        });

        localStorage.setItem('bossRoutes', JSON.stringify(routes));
        console.log(window.i18n.t("log.routesSavedToLocalStorage"), JSON.stringify(routes));

        routeCreatorContainer.style.display = 'none';

        const emergencyBossContainer = document.getElementById('emergency-boss-container');
        if (emergencyBossContainer) {
            emergencyBossContainer.style.display = 'block';
        }

        loadSavedRoutes();

        routeSelect.value = routes.length - 1;
        const event = new Event('change');
        routeSelect.dispatchEvent(event);
    });

    document.addEventListener('click', function(e) {
        if (!bossSearchResults.contains(e.target) && e.target !== bossSearch) {
            bossSearchResults.style.display = 'none';
        }
    });
}

function createPokeTeamBadges(pokeTeam) {
    if (!pokeTeam || Object.keys(pokeTeam).length === 0) {
        return '';
    }

    let badgesHTML = '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; width: 100%;">';
    
    Object.values(pokeTeam).forEach(team => {
        let badgeClass = 'poketeam-badge-default';
        let displayText = team;
        let tooltipText = '';

        if (team === 'Stealth Rock / Mold Breaker') {
            badgeClass = 'poketeam-badge-stealthmold';
            displayText = 'Stealth/Mold';
            tooltipText = window.i18n.t("pokeTeam.sturdy");
        } else if (team === 'Classic Team') {
            badgeClass = 'poketeam-badge-classic';
            tooltipText = window.i18n.t("pokeTeam.usualTeam");
        } else if (team === 'Mega Lead') {
            badgeClass = 'poketeam-badge-mega';
            tooltipText = window.i18n.t("pokeTeam.cottonSpore");
        } else if (team === 'Stealth Rock') {
            badgeClass = 'poketeam-badge-stealth';
            tooltipText = window.i18n.t("pokeTeam.focusSash");
        } else if (team === 'Mold Breaker') {
            badgeClass = 'poketeam-badge-mold';
            tooltipText = window.i18n.t("pokeTeam.unaware");
        } else if (team === 'Special Team') {
            badgeClass = 'poketeam-badge-special';
            tooltipText = window.i18n.t("pokeTeam.specialTeam");
        } else if (team === 'Membership') {
            badgeClass = 'poketeam-badge-membership';
            tooltipText = window.i18n.t("pokeTeam.membership");
        } else if (team === 'Guild TOP 3') {
            badgeClass = 'poketeam-badge-guild';
            tooltipText = window.i18n.t("pokeTeam.guildTop3");
        } else if (team === 'Special Lead') {
            badgeClass = 'poketeam-badge-special';
            tooltipText = window.i18n.t("pokeTeam.specialLead");
        }
        
        badgesHTML += `<span class="poketeam-badge ${badgeClass}" title="${tooltipText}">${displayText}</span>`;
    });
    
    badgesHTML += '</div>';
    return badgesHTML;
}
function emergencyDisplayRouteBosses() {
    console.log(window.i18n.t("log.emergencyDisplayBosses"));

    const savedRoutes = localStorage.getItem('bossRoutes');
    if (!savedRoutes) {
        console.error(window.i18n.t("log.noSavedRoutesInLocalStorage"));
        return;
    }

    const routes = JSON.parse(savedRoutes);
    console.log(window.i18n.t("log.foundRoutes"), routes);

    const routeSelect = document.getElementById('route-select');
    const selectedRouteIndex = routeSelect.value;
    console.log(window.i18n.t("log.selectedRouteIndex"), selectedRouteIndex);
    
    if (selectedRouteIndex === '' || !routes[selectedRouteIndex]) {
        console.error(window.i18n.t("log.routeNotSelectedOrDoesNotExist"));
        return;
    }
    
    const selectedRoute = routes[selectedRouteIndex];
    console.log(window.i18n.t("log.selectedRoute"), selectedRoute);

    let container = document.getElementById('emergency-boss-container');

    if (!container) {
        console.log(window.i18n.t("log.creatingEmergencyBossContainer"));

        container = document.createElement('div');
        container.id = 'emergency-boss-container';
        container.style.backgroundColor = '#444';
        container.style.padding = '15px 15px 15px 5px';
        container.style.margin = '20px 0 20px -10px';
        container.style.borderRadius = '5px';
        container.style.maxHeight = 'calc(100vh - 250px)';
        container.style.overflowY = 'auto';
        container.style.color = 'white';
        container.style.display = 'block';
        container.style.position = 'relative';
        container.style.zIndex = '100';

        const routeCreatorSidebar = document.getElementById('route-creator-sidebar');
        const routeSelector = routeCreatorSidebar.querySelector('.route-selector');

        if (routeSelector && routeSelector.nextSibling) {
            routeCreatorSidebar.insertBefore(container, routeSelector.nextSibling);
        } else {
            routeCreatorSidebar.appendChild(container);
        }
    }

    container.innerHTML = '';
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.fontWeight = 'bold';
    header.style.fontSize = '16px';
    header.style.marginBottom = '15px';
    header.style.paddingBottom = '10px';
    header.style.borderBottom = '1px solid #555';
    header.textContent = selectedRoute.name || window.i18n.t("route.unnamedRoute");
    container.appendChild(header);

    if (!selectedRoute.bosses || selectedRoute.bosses.length === 0) {
        const emptyInfo = document.createElement('div');
        emptyInfo.style.textAlign = 'center';
        emptyInfo.style.padding = '20px';
        emptyInfo.style.color = '#aaa';
        emptyInfo.textContent = window.i18n.t("route.noRoutes");
        container.appendChild(emptyInfo);
        return;
    }

    const existingNumbers = document.querySelectorAll('.route-number');
    existingNumbers.forEach(number => number.remove());

    container.style.position = 'relative';

    const weeklyData = getWeeklyKillData();
    const weeklyLimitReached = weeklyData.killCount >= WEEKLY_BOSS_LIMIT;

    selectedRoute.bosses.forEach((boss, index) => {
        console.log(window.i18n.t("log.addingBoss", [index + 1, boss.name]));

        const bossData = bosses[boss.name] || {};
        console.log(window.i18n.t("log.bossDataFor", [boss.name]), bossData);
        console.log(window.i18n.t("log.pokeTeamFor", [boss.name]), bossData.PokeTeam);

        const isAvailable = isBossAvailable(boss.name);
        const timerText = isAvailable ? window.i18n.t("boss.available") : window.i18n.t("log.loading");
        const timerColor = isAvailable ? "#4CAF50" : "#FF5722";

        const rowContainer = document.createElement('div');
        rowContainer.style.position = 'relative';
        rowContainer.style.marginBottom = '10px';
        rowContainer.style.width = '100%';

        const bossElement = document.createElement('div');
        bossElement.style.backgroundColor = '#555';
        bossElement.style.padding = '10px';
        bossElement.style.borderRadius = '5px';
        bossElement.style.cursor = 'pointer';
        bossElement.style.width = 'calc(100% - 30px)';

        let poketeamHTML = '';
        if (bossData && bossData.PokeTeam) {
            poketeamHTML = createPokeTeamBadges(bossData.PokeTeam);
        }

        bossElement.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100%;">
                <!-- Top row with number, image, name and timer -->
                <div style="display: flex; align-items: flex-start; width: 100%; margin-bottom: 5px;">
                    <div style="background-color: red; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; font-weight: bold; flex-shrink: 0;">${index + 1}</div>
                    <div style="width: 40px; height: 40px; margin-right: 10px; flex-shrink: 0;">
                        <img src="resources/bosses/${boss.name}.png" alt="${boss.name}" onerror="this.src='resources/bosses/default-boss.png'" style="width: 100%; height: 100%; object-fit: contain; border-radius: 5px;">
                    </div>
                    <div style="flex-grow: 1; overflow: hidden; display: flex; flex-direction: column;">
                        <div style="font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${boss.name}</div>
                        <div class="boss-timer" data-boss-name="${boss.name}" style="font-size: 12px; color: ${timerColor}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${window.i18n.t("boss.availableIn")}: ${timerText}</div>
                    </div>
                </div>
                
                <!-- Bottom row with badges, aligned with the left edge -->
                ${poketeamHTML ? `
                <div style="display: flex; width: 100%; padding-left: 0;">
                    ${poketeamHTML}
                </div>
                ` : ''}
            </div>
        `;

        bossElement.addEventListener('mouseover', function() {
            bossElement.style.backgroundColor = '#666';
        });
        
        bossElement.addEventListener('mouseleave', function() {
            bossElement.style.backgroundColor = '#555';
        });

        bossElement.addEventListener('click', function(e) {
            e.stopPropagation();
            centerMapOnBoss(boss.name);
        });

        rowContainer.appendChild(bossElement);

        const killedButton = document.createElement('div');
        killedButton.className = 'killed-button';
        killedButton.dataset.bossName = boss.name;
        killedButton.style.position = 'absolute';
        killedButton.style.right = '-18px';
        killedButton.style.top = '40px';
        killedButton.style.transform = 'translateY(-50%)';
        killedButton.style.cursor = 'pointer';
        killedButton.style.width = '30px';
        killedButton.style.height = '30px';
        killedButton.style.display = 'flex';
        killedButton.style.alignItems = 'center';
        killedButton.style.justifyContent = 'center';

        const killedImage = document.createElement('img');
        killedImage.src = 'resources/killed.png';
        killedImage.alt = 'Killed';
        killedImage.style.width = '100%';
        killedImage.style.height = '100%';
        killedImage.style.objectFit = 'contain';
        killedImage.style.opacity = isAvailable ? 1.0 : 0.5;
        killedImage.onerror = function() {
            this.src = 'killed.png';
        };
        
        killedButton.appendChild(killedImage);

        if (weeklyLimitReached && isAvailable) {
            killedImage.style.opacity = '0.5';
            killedButton.style.pointerEvents = 'none';
            killedButton.style.cursor = 'not-allowed';
        }

        killedButton.addEventListener('click', function(e) {
            e.stopPropagation();
            if (isBossAvailable(boss.name)) {
                const weeklyData = getWeeklyKillData();
                if (weeklyData.killCount >= WEEKLY_BOSS_LIMIT) {
                    alert(window.i18n.t("weeklyKills.limit", [WEEKLY_BOSS_LIMIT, formatNextResetTime()]));
                    return;
                }

                this.querySelector('img').style.opacity = '0.5';
                this.style.pointerEvents = 'none';
                this.style.cursor = 'not-allowed';

                markBossAsKilled(boss.name);

                updateWeeklyKillsDisplay();
            } else {
                console.log(window.i18n.t("log.bossOnCooldown", [boss.name]));
            }
        });

        rowContainer.appendChild(killedButton);

        container.appendChild(rowContainer);

        addNumberAboveBoss(boss.name, index + 1);
    });
    
    console.log(window.i18n.t("log.displayedBosses", [selectedRoute.bosses.length]));

    updateBossTimers();
}

function addNumberAboveBoss(bossName, number) {

    const bossIcons = document.querySelectorAll('.boss-icon');
    let bossIcon = null;
    for (const icon of bossIcons) {
        if (icon.dataset.bossName === bossName) {
            bossIcon = icon;
            break;
        }
    }
    
    if (!bossIcon) {
        console.log(window.i18n.t("log.bossIconNotFound", [bossName]));

        const bossData = bosses[bossName] || {};
        let position = null;
        
        if (bossData.map_pos) {
            position = bossData.map_pos;
        } else if (bossData.location) {
            const locationMatch = locations.find(loc => 
                loc.tooltip === bossData.location || 
                loc.map === bossData.location
            );
            
            if (locationMatch && locationMatch.map_pos) {
                position = locationMatch.map_pos;
            }
        }
        
        if (!position) {
            console.error(window.i18n.t("log.cannotFindPositionForBoss", [bossName]));
            return;
        }

        const numberElement = document.createElement('div');
        numberElement.className = 'route-number';
        numberElement.textContent = number;

        numberElement.style.position = 'absolute';
        numberElement.style.left = `${position[0]}px`;
        numberElement.style.top = `${position[1] - 30}px`;
        numberElement.style.backgroundColor = 'red';
        numberElement.style.color = 'white';
        numberElement.style.borderRadius = '50%';
        numberElement.style.width = '24px';
        numberElement.style.height = '24px';
        numberElement.style.display = 'flex';
        numberElement.style.alignItems = 'center';
        numberElement.style.justifyContent = 'center';
        numberElement.style.fontWeight = 'bold';
        numberElement.style.fontSize = '14px';
        numberElement.style.zIndex = '30';
        numberElement.style.transform = 'translate(-50%, -50%)';
        numberElement.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)';

        const map = document.getElementById('map');
        if (map) {
            map.appendChild(numberElement);
        } else {
            console.error(window.i18n.t("log.mapElementNotFound"));
        }
        
        return;
    }

    const numberElement = document.createElement('div');
    numberElement.className = 'route-number';
    numberElement.textContent = number;

    numberElement.style.position = 'absolute';
    numberElement.style.left = bossIcon.style.left;
    numberElement.style.top = `${parseInt(bossIcon.style.top) - 30}px`;
    numberElement.style.backgroundColor = 'red';
    numberElement.style.color = 'white';
    numberElement.style.borderRadius = '50%';
    numberElement.style.width = '24px';
    numberElement.style.height = '24px';
    numberElement.style.display = 'flex';
    numberElement.style.alignItems = 'center';
    numberElement.style.justifyContent = 'center';
    numberElement.style.fontWeight = 'bold';
    numberElement.style.fontSize = '14px';
    numberElement.style.zIndex = '30';
    numberElement.style.transform = 'translate(-50%, -50%)';
    numberElement.style.boxShadow = '0 0 5px rgba(0, 0, 0, 0.5)';

    const map = document.getElementById('map');
    if (map) {
        map.appendChild(numberElement);
    } else {
        console.error(window.i18n.t("log.mapElementNotFound"));
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const routeSelect = document.getElementById('route-select');
    if (routeSelect) {
        routeSelect.addEventListener('change', emergencyDisplayRouteBosses);

        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                    console.log(window.i18n.t("log.routeSelectValueChanged"), routeSelect.value);
                    emergencyDisplayRouteBosses();
                }
            });
        });
        
        observer.observe(routeSelect, { attributes: true });
    }

    const routeCreatorBtn = document.getElementById('route-creator-btn');
    if (routeCreatorBtn) {
        routeCreatorBtn.addEventListener('click', function() {
            setTimeout(emergencyDisplayRouteBosses, 500);
        });
    }
});

async function init() {
    try {

        locationsData = await loadLocationsData();

        locations = JSON.parse(JSON.stringify(locationsData));
        window.locations = locations;
        console.log(window.i18n.t("log.locationsInitializedWith", [locations.length]));
        bosses = await loadBossesData();
        setupRegionFilter();
        displayBossIcons();
        // setupSearchFunctionality();
        refreshMarkers();
        initBossTimers();
        initWeeklyKillTracker();
    } catch (error) {
        console.error(window.i18n.t("log.errorDuringInitialization"), error);
    }
}

window.addEventListener('load', function() {
    init().catch(error => {
        console.error(window.i18n.t("log.errorDuringInitialization"), error);
    }).finally(() => {
        setTimeout(initRouteCreator, 500);
    });
});

document.addEventListener('DOMContentLoaded', function() {
    document.body.addEventListener('click', function(e) {
        const bossElement = e.target.closest('#emergency-boss-container > div');
        if (bossElement && bossElement !== document.getElementById('emergency-boss-container').firstElementChild) {
            const bossNameElement = bossElement.querySelector('div > div:nth-child(3) > div:first-child');
            if (bossNameElement) {
                const bossName = bossNameElement.textContent;
                console.log(window.i18n.t("log.delegatedClickOnBoss", [bossName]));
                centerMapOnBoss(bossName);
            }
        }
    });
    
    // console.log(window.i18n.t("log.additionalClickEventsRegistered"));
});

let lastMouseX = 0;
let lastMouseY = 0;
let mapMousePosition = { x: 0, y: 0 };

function getMapPosition(clientX, clientY) {
    const rect = map.getBoundingClientRect();
    const x = (clientX - rect.left - offsetX) / scale;
    const y = (clientY - rect.top - offsetY) / scale;
    return { x, y };
}

mapContainer.addEventListener('mousemove', function(e) {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    mapMousePosition = getMapPosition(e.clientX, e.clientY);
});

window.getpos = function() {
    const x = Math.round(mapMousePosition.x);
    const y = Math.round(mapMousePosition.y);
    const positionText = `[${x}, ${y}]`;
    console.log(window.i18n.t("log.currentPosition", [positionText]));
    return { x, y };
};