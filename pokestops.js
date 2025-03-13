let pokestopIcons = [];
let currentPreviewImage = null;
let currentImageIndex = 0;
let isPreviewOpen = false; // Flag blocking multiple openings
let previewClickCooldown = false; // Additional protection against multiple clicks

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
    previewContainer.style.overflow = 'hidden';

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

    // Add zoom controls
    const zoomInButton = document.createElement('div');
    zoomInButton.className = 'pokestop-preview-zoom';
    zoomInButton.innerHTML = '&#43;'; // Plus sign
    zoomInButton.style.right = '110px';

    zoomInButton.addEventListener('click', function() {
        zoomPreviewImage(1.2);
    });

    previewContainer.appendChild(zoomInButton);

    const zoomOutButton = document.createElement('div');
    zoomOutButton.className = 'pokestop-preview-zoom';
    zoomOutButton.innerHTML = '&minus;'; // Minus sign
    zoomOutButton.style.right = '160px';

    zoomOutButton.addEventListener('click', function() {
        zoomPreviewImage(0.8);
    });

    previewContainer.appendChild(zoomOutButton);

    const resetZoomButton = document.createElement('div');
    resetZoomButton.className = 'pokestop-preview-zoom';
    resetZoomButton.innerHTML = '&#8634;'; // Reset symbol
    resetZoomButton.style.right = '210px';

    resetZoomButton.addEventListener('click', function() {
        resetPreviewZoom();
    });

    previewContainer.appendChild(resetZoomButton);

    const imageContainer = document.createElement('div');
    imageContainer.className = 'pokestop-image-container';
    imageContainer.style.overflow = 'auto';
    imageContainer.style.maxHeight = 'calc(95vh - 60px)';
    imageContainer.style.maxWidth = '100%';
    imageContainer.style.position = 'relative';
    previewContainer.appendChild(imageContainer);

    document.body.appendChild(previewContainer);

    // Prevent map zoom when scrolling inside the preview container
    previewContainer.addEventListener('wheel', function(e) {
        e.stopPropagation();
    }, { passive: false });

    // Add drag functionality for image panning when zoomed
    let isDragging = false;
    let startX, startY;
    let scrollLeft, scrollTop;

    imageContainer.addEventListener('mousedown', function(e) {
        // Only enable dragging if image is zoomed
        const img = imageContainer.querySelector('img');
        if (img && (img.style.transform || img.offsetWidth > imageContainer.offsetWidth || img.offsetHeight > imageContainer.offsetHeight)) {
            isDragging = true;
            startX = e.pageX - imageContainer.offsetLeft;
            startY = e.pageY - imageContainer.offsetTop;
            scrollLeft = imageContainer.scrollLeft;
            scrollTop = imageContainer.scrollTop;
            imageContainer.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });

    imageContainer.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.pageX - imageContainer.offsetLeft;
        const y = e.pageY - imageContainer.offsetTop;
        const walkX = (x - startX) * 1.5;
        const walkY = (y - startY) * 1.5;
        imageContainer.scrollLeft = scrollLeft - walkX;
        imageContainer.scrollTop = scrollTop - walkY;
    });

    imageContainer.addEventListener('mouseup', function() {
        isDragging = false;
        imageContainer.style.cursor = 'grab';
    });

    imageContainer.addEventListener('mouseleave', function() {
        if (isDragging) {
            isDragging = false;
            imageContainer.style.cursor = 'grab';
        }
    });

    document.addEventListener('click', function(e) {
        if (previewContainer.style.display === 'block' && 
            !previewContainer.contains(e.target) &&
            !e.target.closest('.pokestop-icon')) {
            hideImagePreview();
            // Prevents further click actions
            e.preventDefault();
            e.stopPropagation();
        }
    });

    return previewContainer;
}

// Track zoom level
let currentImageZoom = 1;

function showImagePreview(mapName) {
    try {
        // Check if preview window is already open
        if (isPreviewOpen || previewClickCooldown) {
            return; // Prevent multiple openings
        }

        // Set blocking flags
        isPreviewOpen = true;
        previewClickCooldown = true;

        // Add timeout to reset additional block after 500ms
        setTimeout(() => {
            previewClickCooldown = false;
        }, 500);

        const previewContainer = createImagePreviewContainer();
        const imageContainer = previewContainer.querySelector('.pokestop-image-container');
        const nextButton = previewContainer.querySelector('.pokestop-preview-next');

        // Reset any previous zoom and scrolling
        currentImageZoom = 1;
        imageContainer.scrollLeft = 0;
        imageContainer.scrollTop = 0;
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
        img.style.transform = 'scale(1)';
        img.style.transformOrigin = 'center';
        img.style.transition = 'transform 0.2s ease';
        img.style.cursor = 'grab';

        img.onload = function() {
            imageContainer.appendChild(img);
            previewContainer.style.display = 'block';

            setTimeout(() => {
                previewContainer.style.opacity = '1';
                previewContainer.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 10);

            // Add wheel event for zooming
            imageContainer.addEventListener('wheel', handleImageWheel);

            // Check if this location has a second image (only for Cerulean City)
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
                // For other locations do not check for second image
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

function handleImageWheel(e) {
    e.preventDefault();
    e.stopPropagation();

    const imageContainer = document.querySelector('.pokestop-image-container');
    const img = imageContainer.querySelector('img');

    if (!img) return;

    // Determine zoom direction
    const delta = e.deltaY < 0 ? 1.1 : 0.9;
    zoomPreviewImage(delta);
}

function zoomPreviewImage(zoomFactor) {
    const imageContainer = document.querySelector('.pokestop-image-container');
    const img = imageContainer.querySelector('img');

    if (!img) return;

    // Update zoom level
    currentImageZoom *= zoomFactor;

    // Limit zoom
    const minZoom = 0.5;
    const maxZoom = 4;

    if (currentImageZoom < minZoom) currentImageZoom = minZoom;
    if (currentImageZoom > maxZoom) currentImageZoom = maxZoom;

    // Apply zoom
    img.style.transform = `scale(${currentImageZoom})`;

    // Update cursor based on zoom
    if (currentImageZoom > 1) {
        img.style.cursor = 'grab';
    } else {
        img.style.cursor = 'default';
    }
}

function resetPreviewZoom() {
    const imageContainer = document.querySelector('.pokestop-image-container');
    const img = imageContainer.querySelector('img');

    if (!img) return;

    currentImageZoom = 1;
    img.style.transform = 'scale(1)';
    img.style.cursor = 'default';

    // Reset scroll position
    imageContainer.scrollLeft = 0;
    imageContainer.scrollTop = 0;
}

function hideImagePreview() {
    const previewContainer = document.getElementById('pokestop-preview-container');
    if (!previewContainer) return;

    // Remove the wheel event listener
    const imageContainer = previewContainer.querySelector('.pokestop-image-container');
    if (imageContainer) {
        imageContainer.removeEventListener('wheel', handleImageWheel);
    }

    previewContainer.style.opacity = '0';
    previewContainer.style.transform = 'translate(-50%, -50%) scale(0.8)';

    setTimeout(() => {
        previewContainer.style.display = 'none';
        // Reset zoom level for next time
        currentImageZoom = 1;
        // Reset blocking flag
        isPreviewOpen = false;
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

    // Reset scroll position for the new image
    imageContainer.scrollLeft = 0;
    imageContainer.scrollTop = 0;

    const newImg = document.createElement('img');
    newImg.src = imagePath;
    newImg.alt = `PokéStop at ${currentPreviewImage}`;
    newImg.style.maxWidth = '100%';
    newImg.style.maxHeight = 'calc(95vh - 60px)';
    newImg.style.objectFit = 'contain';
    newImg.style.borderRadius = '4px';

    // Apply current zoom level to the new image
    newImg.style.transform = `scale(${currentImageZoom})`;
    newImg.style.transformOrigin = 'center';
    newImg.style.transition = 'transform 0.2s ease';

    // Set cursor based on zoom level
    newImg.style.cursor = currentImageZoom > 1 ? 'grab' : 'default';

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
    icon.style.display = 'none'; // Hide PokéStop icons by default
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

// Function to get filenames from the resources/pokestops/ folder
async function getPokestopFiles() {
    // We use window.pokestopFileList as a way to provide the file list,
    // Because JavaScript in the browser cannot directly read folder contents
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

        // Get the list of files from the pokestops folder
        let pokestopFiles = await getPokestopFiles();

        if (!pokestopFiles || pokestopFiles.length === 0) {
            console.error('No pokestop image files found. Please define window.pokestopFileList array with your PNG filenames.');
            console.log('INSTRUCTION: In the script uncomment or add PNG filenames to the window.pokestopFileList array.');

            // Display alert so the user knows what to do
            alert('No PokéStop files found. Please add PNG filenames to the window.pokestopFileList array in the script.');
            return;
        }

        console.log(`Processing ${pokestopFiles.length} pokestop image files`);

        // Process only PNG files that don't have the _2 suffix
        for (const fileName of pokestopFiles) {
            if (!fileName.endsWith('.png')) continue;

            let mapName = fileName.replace('.png', '');

            // Skip secondary files (those with _2 at the end)
            if (mapName.endsWith('_2')) {
                continue;
            }

            // Find location that has tooltip matching the map name
            // Use case-insensitive comparison
            const location = window.locations.find(loc => 
                (loc.tooltip && loc.tooltip.toLowerCase() === mapName.toLowerCase())
            );

            // Create icon only if matching location with map_pos was found
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

// Function to toggle the visibility of PokéStop icons
function togglePokestopIcons() {
    console.log("togglePokestopIcons function called");
    console.log("Number of PokéStop icons:", pokestopIcons.length);

    // Check if icons are currently visible or hidden
    let areIconsVisible = false;
    if (pokestopIcons.length > 0) {
        areIconsVisible = pokestopIcons[0].style.display !== 'none';
    }

    // Toggle visibility - set all to the opposite state
    const newDisplayValue = areIconsVisible ? 'none' : 'block';
    console.log("Setting display to:", newDisplayValue);

    pokestopIcons.forEach(icon => {
        icon.style.display = newDisplayValue;
    });

    // Update button state
    const pokestopToggleBtn = document.getElementById('pokestop-toggle-btn');
    if (pokestopToggleBtn) {
        if (newDisplayValue === 'block') {
            pokestopToggleBtn.classList.add('active');
        } else {
            pokestopToggleBtn.classList.remove('active');
        }
    }

    console.log("Updated icon visibility and button state");
}

// Function to initialize the PokéStop button after the DOM is fully loaded
function initPokestopToggle() {
    console.log("Initializing PokéStop button");
    const pokestopToggleBtn = document.getElementById('pokestop-toggle-btn');

    if (pokestopToggleBtn) {
        console.log("PokéStop button found");

        // Remove all existing listeners (just in case)
        const newBtn = pokestopToggleBtn.cloneNode(true);
        pokestopToggleBtn.parentNode.replaceChild(newBtn, pokestopToggleBtn);

        // Update button content to use i18n
        if (window.i18n && typeof window.i18n.t === 'function') {
            const pokestopLabel = newBtn.querySelector('span');
            if (pokestopLabel) {
                pokestopLabel.setAttribute('data-i18n', 'pokestop.title');
                pokestopLabel.textContent = window.i18n.t('pokestop.title') || 'PokéStop';
            }
        }

        // Add new listener
        newBtn.addEventListener('click', function(e) {
            console.log("PokéStop button clicked");
            e.preventDefault();
            e.stopPropagation();
            togglePokestopIcons();
        });

        console.log("PokéStop button configured");
    } else {
        console.error("PokéStop button not found in DOM");
    }
}

// Wait for DOM to fully load before initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing PokéStop button");
    // Wait a moment to make sure all elements are ready
    setTimeout(initPokestopToggle, 1000);
});

window.addEventListener('load', function() {
    console.log("Page fully loaded");
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
        console.log("Initializing PokéStop icons");
        displayAllPokestopIcons();
        hookIntoMapRefresh();

        // Check and initialize button again (in case DOMContentLoaded didn't work)
        initPokestopToggle();
    }, 3000);
});