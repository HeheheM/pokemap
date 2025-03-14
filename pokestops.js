let pokestopIcons = [];
let currentPreviewImage = null;
let currentImageIndex = 0;
let isPreviewOpen = false; // Flag blocking multiple openings
let previewClickCooldown = false; // Additional protection against multiple clicks
let locationImages = {}; // Cache for discovered location images

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
    let translateX = 0, translateY = 0;
    let lastTranslateX = 0, lastTranslateY = 0;

    imageContainer.addEventListener('mousedown', function(e) {
        // Only enable dragging if image is zoomed
        const img = imageContainer.querySelector('img');
        if (img && currentImageZoom > 1) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            lastTranslateX = translateX || 0;
            lastTranslateY = translateY || 0;
            imageContainer.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });

    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;

        e.preventDefault();
        translateX = lastTranslateX + (e.clientX - startX);
        translateY = lastTranslateY + (e.clientY - startY);

        const img = document.querySelector('.pokestop-image-container img');
        if (img) {
            img.style.transform = `scale(${currentImageZoom}) translate(${translateX / currentImageZoom}px, ${translateY / currentImageZoom}px)`;
        }
    });

    document.addEventListener('mouseup', function() {
        if (isDragging) {
            isDragging = false;
            const imageContainer = document.querySelector('.pokestop-image-container');
            if (imageContainer) {
                imageContainer.style.cursor = 'grab';
            }
        }
    });

    document.addEventListener('mouseleave', function() {
        if (isDragging) {
            isDragging = false;
            const imageContainer = document.querySelector('.pokestop-image-container');
            if (imageContainer) {
                imageContainer.style.cursor = 'grab';
            }
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

// Function to discover images in location directory
async function discoverLocationImages(locationName) {
    // If we already have cached images for this location, return them
    if (locationImages[locationName] && locationImages[locationName].length > 0) {
        return locationImages[locationName];
    }

    // Try to fetch available images by testing access to potential files
    try {
        const baseUrl = `resources/maps/${(locationName)}/`;
        
        // Try to fetch the directory listing or test for known image patterns
        const response = await fetch(`${baseUrl}?list=true`);
        
        if (response.ok) {
            // If server supports directory listing, parse the response
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Find all links to PNG files
            const links = Array.from(doc.querySelectorAll('a'));
            const pngFiles = links
                .map(link => link.getAttribute('href'))
                .filter(href => href && href.toLowerCase().endsWith('.png'));
            
            if (pngFiles.length > 0) {
                locationImages[locationName] = pngFiles.map(file => `${baseUrl}${file}`);
                return locationImages[locationName];
            }
        }
        
        // If directory listing failed or returned no PNG files, 
        // check for existence of any PNG files with number patterns
        const testPatterns = [
            // Test various naming patterns
            'image1.png', 'image2.png', 'image3.png',
            '1.png', '2.png', '3.png',
            'map1.png', 'map2.png', 'map3.png',
            'img1.png', 'img2.png', 'img3.png'
        ];
        
        const discoveredImages = [];
        
        for (const pattern of testPatterns) {
            const testUrl = `${baseUrl}${pattern}`;
            try {
                const testResponse = await fetch(testUrl, { method: 'HEAD' });
                if (testResponse.ok) {
                    discoveredImages.push(testUrl);
                }
            } catch (error) {
                // Ignore errors for individual test requests
                console.debug(`Image not found at ${testUrl}`);
            }
        }
        
        if (discoveredImages.length > 0) {
            locationImages[locationName] = discoveredImages;
            return discoveredImages;
        }
        
        // If all specific checks failed, try a generic fallback approach
        // Look for any PNG file in the directory
        const fallbackResponse = await fetch(`${baseUrl}`);
        if (fallbackResponse.ok) {
            const html = await fallbackResponse.text();
            // Simple regex to find PNG files in directory listing
            const pngRegex = /href=["']([^"']+\.png)["']/gi;
            const matches = [...html.matchAll(pngRegex)];
            
            if (matches.length > 0) {
                const foundImages = matches.map(match => `${baseUrl}${match[1]}`);
                locationImages[locationName] = foundImages;
                return foundImages;
            }
        }
        
        // Final fallback: create a tentative list of possible image paths
        // We'll need to validate these URLs when we try to display them
        return [`${baseUrl}image.png`];
    } catch (error) {
        console.error(`Error discovering images for ${locationName}:`, error);
        // Return a fallback path that will be tested when showing the preview
        //return [`resources/maps/${encodeURIComponent(locationName)}/image.png`];
    }
}

// Ta funkcja będzie wywoływana ze script.js gdy użytkownik kliknie na lokację
async function handleLocationClick(location) {
    if (location && location.tooltip) {
        showMapImagePreview(location.tooltip);
    }
}

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
        translateX = 0;
        translateY = 0;
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

async function showMapImagePreview(mapName) {
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
        translateX = 0;
        translateY = 0;
        imageContainer.innerHTML = '';

        currentImageIndex = 0;
        currentPreviewImage = mapName;

        // Discover images for this location
        const imagePaths = await discoverLocationImages(mapName);
        
        if (!imagePaths || imagePaths.length === 0) {
            console.error(`No images found for location: ${mapName}`);
            hideImagePreview();
            return;
        }

        // Display the first image
        const img = document.createElement('img');
        img.src = imagePaths[0];
        img.alt = `Location: ${mapName}`;
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

            // Show next button if we have multiple images
            if (imagePaths.length > 1) {
                nextButton.style.display = 'flex';
            } else {
                nextButton.style.display = 'none';
            }
        };

        img.onerror = function() {
            console.error(`Error loading image: ${img.src}`);
            
            // Try a different approach - look for any PNG files in the folder
            const basePath = `resources/maps/${(mapName)}/`;
            
            // Create an XHR to try to get directory listing (this may not work on all servers)
            const xhr = new XMLHttpRequest();
            xhr.open('GET', basePath, true);
            
            xhr.onload = function() {
                if (xhr.status === 200) {
                    // Try to find PNG files in the response
                    const response = xhr.responseText;
                    const pngRegex = /href=["']([^"']+\.png)["']/gi;
                    const matches = [...response.matchAll(pngRegex)];
                    
                    if (matches.length > 0) {
                        // Found PNG files, use the first one
                        const newSrc = `${basePath}${matches[0][1]}`;
                        img.src = newSrc;
                        return;
                    }
                }
                
                // If we reach here, we couldn't find any images
                hideImagePreview();
            };
            
            xhr.onerror = function() {
                hideImagePreview();
            };
            
            xhr.send();
        };

    } catch (error) {
        console.error('Error showing image preview:', error);
        hideImagePreview();
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
    img.style.transform = `scale(${currentImageZoom}) translate(${translateX / currentImageZoom}px, ${translateY / currentImageZoom}px)`;

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
    translateX = 0;
    translateY = 0;
    img.style.transform = 'scale(1)';
    img.style.cursor = 'default';

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
        translateX = 0;
        translateY = 0;
        // Reset blocking flag
        isPreviewOpen = false;
    }, 300);
}

async function togglePreviewImage() {
    if (!currentPreviewImage) return;

    const previewContainer = document.getElementById('pokestop-preview-container');
    const imageContainer = previewContainer.querySelector('.pokestop-image-container');

    // Check if we're showing a map image or a pokestop image
    if (currentPreviewImage === "Cerulean City" && document.querySelector('.pokestop-image-container img')?.src.includes('pokestops')) {
        // For PokéStop images with known secondary images
        currentImageIndex = currentImageIndex === 0 ? 1 : 0;

        const imagePath = currentImageIndex === 0 ? 
            `resources/pokestops/${currentPreviewImage}.png` : 
            `resources/pokestops/${currentPreviewImage}_2.png`;

        // Reset scroll position for the new image
        translateX = 0;
        translateY = 0;

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
    } else {
        // For map images from resources/maps/
        // Get all images for the current location
        const imagePaths = await discoverLocationImages(currentPreviewImage);
        if (!imagePaths || imagePaths.length <= 1) return;

        // Increment index and wrap around if necessary
        currentImageIndex = (currentImageIndex + 1) % imagePaths.length;
        const imagePath = imagePaths[currentImageIndex];

        // Reset scroll position for the new image
        translateX = 0;
        translateY = 0;

        const newImg = document.createElement('img');
        newImg.src = imagePath;
        newImg.alt = `Location: ${currentPreviewImage}`;
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
        "Turnback Cave.png",
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