let pokestopIcons = [];
let currentPreviewImage = null;
let currentImageIndex = 0;

function createImagePreviewContainer() {
    if (document.getElementById('pokestop-preview-container')) {
        return document.getElementById('pokestop-preview-container');
    }

    const previewContainer = document.createElement('div');
    previewContainer.id = 'pokestop-preview-container';
    previewContainer.style.display = 'none';
    previewContainer.style.position = 'fixed';
    previewContainer.style.top = '50%';
    previewContainer.style.left = '50%';
    previewContainer.style.transform = 'translate(-50%, -50%) scale(0.8)';
    previewContainer.style.backgroundColor = 'rgba(40, 44, 52, 0.95)';
    previewContainer.style.padding = '20px';
    previewContainer.style.borderRadius = '8px';
    previewContainer.style.boxShadow = '0 5px 25px rgba(0, 0, 0, 0.5)';
    previewContainer.style.zIndex = '2000';
    previewContainer.style.maxWidth = '95vw';
    previewContainer.style.maxHeight = '95vh';
    previewContainer.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    previewContainer.style.opacity = '0';

    const closeButton = document.createElement('div');
    closeButton.className = 'pokestop-preview-close';
    closeButton.innerHTML = '&times;';
    
    closeButton.addEventListener('click', function() {
        hideImagePreview();
    });
    
    previewContainer.appendChild(closeButton);

    const nextButton = document.createElement('div');
    nextButton.className = 'pokestop-preview-next';
    nextButton.innerHTML = '&#10095;';
    nextButton.style.display = 'none';
    
    nextButton.addEventListener('click', function() {
        togglePreviewImage();
    });
    
    previewContainer.appendChild(nextButton);

    const imageContainer = document.createElement('div');
    imageContainer.className = 'pokestop-image-container';
    previewContainer.appendChild(imageContainer);

    document.body.appendChild(previewContainer);
    
    document.addEventListener('click', function(e) {
        if (previewContainer.style.display === 'block' && 
            !previewContainer.contains(e.target) &&
            !e.target.closest('.pokestop-icon')) {
            hideImagePreview();
        }
    });

    return previewContainer;
}

function showImagePreview(mapName) {
    try {
        const previewContainer = createImagePreviewContainer();
        const imageContainer = previewContainer.querySelector('.pokestop-image-container');
        const nextButton = previewContainer.querySelector('.pokestop-preview-next');
        
        imageContainer.innerHTML = '';
        
        currentImageIndex = 0;
        
        currentPreviewImage = mapName;
        
        const img = document.createElement('img');
        img.src = `resources/pokestops/${mapName}.png`;
        img.alt = `PokéStop at ${mapName}`;
        img.style.maxWidth = '100%';
        img.style.maxHeight = 'calc(95vh - 60px)';
        img.style.objectFit = 'contain';
        img.style.borderRadius = '4px';
        
        img.onload = function() {
            imageContainer.appendChild(img);
            previewContainer.style.display = 'block';
            
            setTimeout(() => {
                previewContainer.style.opacity = '1';
                previewContainer.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 10);
            
            // Sprawdź czy ta lokalizacja ma drugi obrazek (tylko dla Cerulean City)
            if (mapName === "Cerulean City") {
                const secondImg = new Image();
                secondImg.onload = function() {
                    nextButton.style.display = 'flex';
                };
                secondImg.onerror = function() {
                    nextButton.style.display = 'none';
                };
                secondImg.src = `resources/pokestops/${mapName}_2.png`;
            } else {
                // Dla innych lokalizacji nie sprawdzaj drugiego obrazka
                nextButton.style.display = 'none';
            }
        };
        
        img.onerror = function() {
            console.error(`Error loading PokéStop image: ${img.src}`);
            hideImagePreview();
            alert(`Error loading image for ${mapName}`);
        };
    } catch (error) {
        console.error('Error showing image preview:', error);
    }
}

function hideImagePreview() {
    const previewContainer = document.getElementById('pokestop-preview-container');
    if (!previewContainer) return;
    
    previewContainer.style.opacity = '0';
    previewContainer.style.transform = 'translate(-50%, -50%) scale(0.8)';
    
    setTimeout(() => {
        previewContainer.style.display = 'none';
    }, 300);
}

function togglePreviewImage() {
    if (!currentPreviewImage) return;
    
    const previewContainer = document.getElementById('pokestop-preview-container');
    const imageContainer = previewContainer.querySelector('.pokestop-image-container');
    
    currentImageIndex = currentImageIndex === 0 ? 1 : 0;
    
    const imagePath = currentImageIndex === 0 ? 
        `resources/pokestops/${currentPreviewImage}.png` : 
        `resources/pokestops/${currentPreviewImage}_2.png`;
    
    const newImg = document.createElement('img');
    newImg.src = imagePath;
    newImg.alt = `PokéStop at ${currentPreviewImage}`;
    newImg.style.maxWidth = '100%';
    newImg.style.maxHeight = 'calc(95vh - 60px)';
    newImg.style.objectFit = 'contain';
    newImg.style.borderRadius = '4px';
    
    const currentImg = imageContainer.querySelector('img');
    if (currentImg) {
        currentImg.style.opacity = '0';
        setTimeout(() => {
            imageContainer.innerHTML = '';
            imageContainer.appendChild(newImg);
        }, 200);
    } else {
        imageContainer.appendChild(newImg);
    }
}

function createPokestopIcon(mapName, mapPos) {
    const map = document.getElementById('map');
    if (!map) return null;
    
    const [x, y] = mapPos;
    const icon = document.createElement('div');
    icon.className = 'pokestop-icon';
    icon.style.left = `${x}px`;
    icon.style.top = `${y}px`;
    icon.style.display = 'none'; // Domyślnie ukrywamy ikony PokéStop
    icon.dataset.mapName = mapName;
    icon.dataset.id = `pokestop-${mapName.replace(/\s+/g, '-').toLowerCase()}`;
    
    const img = document.createElement('img');
    img.src = 'resources/pokestop.png';
    img.alt = `PokéStop at ${mapName}`;
    
    icon.addEventListener('mouseover', function(e) {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) {
            tooltip.textContent = `PokéStop: ${mapName}`;
            tooltip.style.left = `${e.clientX + 15}px`;
            tooltip.style.top = `${e.clientY}px`;
            tooltip.style.opacity = '1';
        }
    });
    
    icon.addEventListener('mouseleave', function() {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) {
            tooltip.style.opacity = '0';
        }
    });
    
    icon.addEventListener('click', function(e) {
        e.stopPropagation();
        showImagePreview(mapName);
    });
    
    icon.addEventListener('touchstart', function(e) {
        e.preventDefault();
        showImagePreview(mapName);
    });
    
    icon.appendChild(img);
    map.appendChild(icon);
    
    pokestopIcons.push(icon);
    
    return icon;
}

function clearPokestopIcons() {
    pokestopIcons.forEach(icon => {
        if (icon && icon.parentNode) {
            icon.parentNode.removeChild(icon);
        }
    });
    
    pokestopIcons = [];
}

// Funkcja do pobierania nazw plików z folderu resources/pokestops/
async function getPokestopFiles() {
    // Wykorzystujemy window.pokestopFileList jako sposób na dostarczenie listy plików,
    // Ponieważ JavaScript w przeglądarce nie może bezpośrednio odczytać zawartości folderu
    const fileList = window.pokestopFileList || [];
    return fileList;
}

async function displayAllPokestopIcons() {
    clearPokestopIcons();
    createImagePreviewContainer();
    
    try {
        if (!window.locations || !Array.isArray(window.locations)) {
            console.error('Locations data is not available');
            return;
        }
        
        // Pobierz listę plików z folderu pokestops
        let pokestopFiles = await getPokestopFiles();
        
        if (!pokestopFiles || pokestopFiles.length === 0) {
            console.error('No pokestop image files found. Please define window.pokestopFileList array with your PNG filenames.');
            console.log('INSTRUKCJA: W skrypcie odkomentuj lub dodaj nazwy plików PNG do tablicy window.pokestopFileList.');
            
            // Wyświetl alert, aby użytkownik wiedział, co zrobić
            alert('Nie znaleziono plików PokéStop. Proszę dodać nazwy plików PNG do tablicy window.pokestopFileList w skrypcie.');
            return;
        }
        
        console.log(`Processing ${pokestopFiles.length} pokestop image files`);
        
        // Przetwarzaj tylko pliki PNG, które nie mają sufiksu _2
        for (const fileName of pokestopFiles) {
            if (!fileName.endsWith('.png')) continue;
            
            let mapName = fileName.replace('.png', '');
            
            // Pomijamy pliki drugorzędne (te z _2 na końcu)
            if (mapName.endsWith('_2')) {
                continue;
            }
            
            // Znajdź lokalizację, która ma tooltip odpowiadający nazwie mapy
            // Używamy porównania niewrażliwego na wielkość liter
            const location = window.locations.find(loc => 
                (loc.tooltip && loc.tooltip.toLowerCase() === mapName.toLowerCase())
            );
            
            // Tworzymy ikonę tylko jeśli znaleziono pasującą lokalizację z map_pos
            if (location && location.map_pos) {
                createPokestopIcon(mapName, location.map_pos);
            } else {
                console.warn(`No map coordinates found for PokéStop location: ${mapName}`);
            }
        }
        
        console.log(`PokéStop icons initialized (${pokestopIcons.length} icons created)`);
    } catch (error) {
        console.error('Error displaying PokéStop icons:', error);
    }
}

function refreshPokestopIcons() {
    setTimeout(displayAllPokestopIcons, 500);
}

function hookIntoMapRefresh() {
    const originalRefreshMarkers = window.refreshMarkers;
    
    if (typeof originalRefreshMarkers === 'function') {
        window.refreshMarkers = function() {
            originalRefreshMarkers.apply(this, arguments);
            refreshPokestopIcons();
        };
        
        console.log('Successfully hooked into refreshMarkers function');
    } else {
        console.warn('Could not hook into refreshMarkers function');
    }
}

// Funkcja do przełączania widoczności ikon PokéStop
function togglePokestopIcons() {
    console.log("Funkcja togglePokestopIcons wywołana");
    console.log("Liczba ikon PokéStop:", pokestopIcons.length);
    
    // Sprawdź, czy ikony są obecnie widoczne czy ukryte
    let areIconsVisible = false;
    if (pokestopIcons.length > 0) {
        areIconsVisible = pokestopIcons[0].style.display !== 'none';
    }
    
    // Przełącz widoczność - ustaw wszystkie na przeciwny stan
    const newDisplayValue = areIconsVisible ? 'none' : 'block';
    console.log("Ustawianie display na:", newDisplayValue);
    
    pokestopIcons.forEach(icon => {
        icon.style.display = newDisplayValue;
    });
    
    // Aktualizacja stanu przycisku
    const pokestopToggleBtn = document.getElementById('pokestop-toggle-btn');
    if (pokestopToggleBtn) {
        if (newDisplayValue === 'block') {
            pokestopToggleBtn.classList.add('active');
        } else {
            pokestopToggleBtn.classList.remove('active');
        }
    }
    
    console.log("Zaktualizowano widoczność ikon i stan przycisku");
}

// Funkcja do inicjalizacji przycisku PokéStop po pełnym załadowaniu DOM
function initPokestopToggle() {
    console.log("Inicjalizacja przycisku PokéStop");
    const pokestopToggleBtn = document.getElementById('pokestop-toggle-btn');
    
    if (pokestopToggleBtn) {
        console.log("Znaleziono przycisk PokéStop");
        
        // Usuń wszystkie istniejące listenery (na wszelki wypadek)
        const newBtn = pokestopToggleBtn.cloneNode(true);
        pokestopToggleBtn.parentNode.replaceChild(newBtn, pokestopToggleBtn);
        
        // Aktualizuj zawartość przycisku, aby korzystać z i18n
        if (window.i18n && typeof window.i18n.t === 'function') {
            const pokestopLabel = newBtn.querySelector('span');
            if (pokestopLabel) {
                pokestopLabel.setAttribute('data-i18n', 'pokestop.title');
                pokestopLabel.textContent = window.i18n.t('pokestop.title') || 'PokéStop';
            }
        }
        
        // Dodaj nowy listener
        newBtn.addEventListener('click', function(e) {
            console.log("Przycisk PokéStop kliknięty");
            e.preventDefault();
            e.stopPropagation();
            togglePokestopIcons();
        });
        
        console.log("Skonfigurowano przycisk PokéStop");
    } else {
        console.error("Nie znaleziono przycisku PokéStop w DOM");
    }
}

// Czekaj na pełne załadowanie DOM przed inicjalizacją
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM załadowany, inicjalizacja przycisku PokéStop");
    // Zaczekaj chwilę, aby upewnić się, że wszystkie elementy są gotowe
    setTimeout(initPokestopToggle, 1000);
});

window.addEventListener('load', function() {
    console.log("Strona w pełni załadowana");
    window.pokestopFileList = [
        "Azalea Town.png",
        "Celestic Town.png",
        "Cerulean City.png",
        "Cerulean City_2.png",
        "Cinnabar Island.png",
        "Digletts Cave.png",
        "Ecruteak City.png",
        "Eterna Forest.png",
        "Hearthome City.png",
        "Ilex Forest.png",
        "Jubilife City.png",
        "Lake of Rage.png",
        "Lavaridge Town.png",
        "Lilycove City.png",
        "Mossdeep City.png",
        "National Park.png",
        "Olivine City.png",
        "Pacifidlog Town.png",
        "Pastoria City.png",
        "Petalburg Woods.png",
        "Pewter City.png",
        "Route 10.png",
        "Route 110.png",
        "Route 111 Desert.png",
        "Route 115.png",
        "Route 119A.png",
        "Route 214.png",
        "Route 3.png",
        "Route 32.png",
        "Route 45.png",
        "Route 5.png",
        "Slateport City.png",
        "Snowpoint City.png",
        "Solaceon Town.png",
        "Sootopolis City.png",
        "Sunyshore City.png",
        "Veilstone City.png",
        "Vermilion City.png",
        "Violet City.png",
        "Viridian Forest.png",
        "Viridian City.png",
    ];

    setTimeout(function() {
        console.log("Inicjalizacja ikon PokéStop");
        displayAllPokestopIcons();
        hookIntoMapRefresh();
        
        // Ponownie sprawdź i zainicjalizuj przycisk (na wypadek, gdyby DOMContentLoaded nie zadziałało)
        initPokestopToggle();
    }, 3000);
});