// Variables with "ex_" prefix to avoid conflicts
let ex_excavitionIcons = [];
let ex_currentPreviewImage = null;
let ex_currentImageIndex = 0;
let ex_isPreviewOpen = false; // Flag blocking multiple openings
let ex_previewClickCooldown = false; // Additional protection against multiple clicks
let ex_locationImagesArray = []; // Array with images for current location
let ex_activeTooltipExcavitionName = null; // Variable to track active tooltip
let ex_clickedExcavitions = {}; // Variable for excavitions with cooldown
let ex_excavitionImageState = {
    currentIndex: 0,
    excavitionName: null,
    imageCount: 0
};

// Global variables for drag and zoom - renamed to avoid conflicts
let ex_isDragging = false;
let ex_startX, ex_startY;
let ex_translateX = 0, ex_translateY = 0;
let ex_lastTranslateX = 0, ex_lastTranslateY = 0;
let ex_currentImageZoom = 1;

// Define excavition sites
// Format: {name: "Location Name", tooltip: "Tooltip Text", images: ["image1.webp", "image2.webp"]}
let ex_excavitionSites = [
    // Will be populated with excavation sites data
];

function ex_createExcavitionTooltipElement() {
    // Check if element already exists
    let excavitionTooltip = document.getElementById('excavition-tooltip');
    if (excavitionTooltip) {
        return excavitionTooltip;
    }
    
    // Create new tooltip element specifically for excavitions
    excavitionTooltip = document.createElement('div');
    excavitionTooltip.id = 'excavition-tooltip';
    excavitionTooltip.className = 'pokestop-tooltip'; // Reuse existing CSS class
    excavitionTooltip.style.display = 'none';
    excavitionTooltip.style.position = 'fixed';
    excavitionTooltip.style.zIndex = '2100';
    excavitionTooltip.style.pointerEvents = 'none';
    
    document.body.appendChild(excavitionTooltip);
    return excavitionTooltip;
}

// Function to create tooltip for excavition sites
// Function to check if excavition is available (not on cooldown)
function ex_isExcavitionAvailable(excavitionName) {
    try {
        const savedData = localStorage.getItem('clickedExcavitions');
        if (savedData) {
            const clickedExcavitions = JSON.parse(savedData);
            if (clickedExcavitions[excavitionName]) {
                return Date.now() >= clickedExcavitions[excavitionName].availableAt;
            }
        }
        return true;
    } catch (error) {
        console.error("Error checking excavition availability:", error);
        return true;
    }
}

// Function to update the clicked excavition icons immediately
function ex_updateClickedExcavitionIcon(excavitionName) {
    // Update specific icon
    for (let i = 0; i < ex_excavitionIcons.length; i++) {
        const icon = ex_excavitionIcons[i];
        if (icon.dataset.mapName === excavitionName) {
            icon.style.opacity = '0.5';
        }
    }
}

// Function to mark excavition as clicked with daily reset cooldown
function ex_markExcavitionAsClicked(excavitionName) {
    if (!ex_isExcavitionAvailable(excavitionName)) {
        return false;
    }
    
    const now = new Date();
    
    // Calculate next reset time (1:00 AM GMT+1)
    const nextReset = new Date();
    nextReset.setDate(now.getDate() + 1); // Next day by default
    nextReset.setHours(1, 0, 0, 0); // Set to 1:00 AM
    
    // If current time is before 1:00 AM, reset will be today at 1:00 AM
    if (now.getHours() < 1) {
        nextReset.setDate(now.getDate()); // Today
    }
    
    const availableAt = nextReset.getTime();

    let clickedExcavitionsData = {};
    try {
        const savedData = localStorage.getItem('clickedExcavitions');
        if (savedData) {
            clickedExcavitionsData = JSON.parse(savedData);
        }
    } catch (error) {
        console.error("Error reading from localStorage:", error);
    }

    clickedExcavitionsData[excavitionName] = {
        clickedAt: now.getTime(),
        availableAt: availableAt
    };

    try {
        localStorage.setItem('clickedExcavitions', JSON.stringify(clickedExcavitionsData));
    } catch (error) {
        console.error("Error saving to localStorage:", error);
    }

    // Update the specific icon immediately
    ex_updateClickedExcavitionIcon(excavitionName);
    
    // Also update all icons to be safe
    setTimeout(ex_updateExcavitionTimers, 100);
    
    return true;
}

// Function formatting time remaining to reset
function ex_formatTimeRemaining(milliseconds) {
    if (milliseconds <= 0) return window.i18n.t("excavition.available") || "Available";
    
    const seconds = Math.floor((milliseconds / 1000) % 60).toString().padStart(2, '0');
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60).toString().padStart(2, '0');
    const hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
}

// Function to update excavition states (opacity) based on cooldowns
function ex_updateExcavitionTimers() {
    let clickedExcavitionsData = {};
    try {
        const savedData = localStorage.getItem('clickedExcavitions');
        if (savedData) {
            clickedExcavitionsData = JSON.parse(savedData);
        }
    } catch (error) {
        console.error("Error reading from localStorage:", error);
        return;
    }

    // Update all excavition icons
    ex_excavitionIcons.forEach(icon => {
        const excavitionName = icon.dataset.mapName;
        
        if (clickedExcavitionsData[excavitionName] && clickedExcavitionsData[excavitionName].availableAt) {
            const availableAt = clickedExcavitionsData[excavitionName].availableAt;
            const now = Date.now();
            const timeRemaining = availableAt - now;
            
            if (timeRemaining <= 0) {
                // Excavition is now available
                icon.style.opacity = '1.0';
                
                // Remove from cooldown list
                delete clickedExcavitionsData[excavitionName];
                try {
                    localStorage.setItem('clickedExcavitions', JSON.stringify(clickedExcavitionsData));
                } catch (error) {
                    console.error("Error saving to localStorage:", error);
                }
            } else {
                // Excavition still on cooldown
                icon.style.opacity = '0.5';
            }
        } else {
            // Excavition not on cooldown
            icon.style.opacity = '1.0';
        }
    });
}

function ex_updateActiveTooltip() {
    if (ex_activeTooltipExcavitionName === null) return;
    
    const tooltip = document.getElementById('excavition-tooltip');
    if (!tooltip || tooltip.style.display === 'none') {
        ex_activeTooltipExcavitionName = null;
        return;
    }
    
    // Find the site to get canonical name
    const site = ex_excavitionSites.find(site => site.name === ex_activeTooltipExcavitionName || site.tooltip === ex_activeTooltipExcavitionName);
    const baseExcavitionName = site ? site.name : ex_activeTooltipExcavitionName;
    
    // Check if excavition is on cooldown
    if (!ex_isExcavitionAvailable(baseExcavitionName)) {
        // Get remaining cooldown time
        const savedData = localStorage.getItem('clickedExcavitions');
        if (savedData) {
            const clickedExcavitions = JSON.parse(savedData);
            if (clickedExcavitions[baseExcavitionName]) {
                const availableAt = clickedExcavitions[baseExcavitionName].availableAt;
                const now = Date.now();
                const timeRemaining = availableAt - now;
                
                // Update only the cooldown part of tooltip
                const cooldownElement = tooltip.querySelector('.tooltip-cooldown');
                if (cooldownElement) {
                    cooldownElement.textContent = ex_formatTimeRemaining(timeRemaining);
                }
            }
        }
    }
}

// Initialize timer to update excavition status
function ex_initExcavitionTimers() {
    ex_updateExcavitionTimers();
    setInterval(ex_updateExcavitionTimers, 1000);
    setInterval(ex_updateActiveTooltip, 1000); // Initialize tooltip updater
}

function ex_createExcavitionTooltip(excavitionName, x, y, isRightClick = false) {
    const tooltip = ex_createExcavitionTooltipElement();
    
    // Find the actual site to get the name (not tooltip)
    const site = ex_excavitionSites.find(site => site.tooltip === excavitionName || site.name === excavitionName);
    
    // Use the base name for cooldown tracking, not the tooltip
    const baseExcavitionName = site ? site.name : excavitionName;
    
    // Set excavition name as active tooltip if not right click
    if (!isRightClick) {
        ex_activeTooltipExcavitionName = baseExcavitionName;
    }
    
    // Check if excavition is on cooldown
    let isOnCooldown = !ex_isExcavitionAvailable(baseExcavitionName);
    
    // If right click and excavition is available, mark it as clicked immediately
    let cooldownJustStarted = false;
    if (isRightClick && !isOnCooldown) {
        // Immediately mark excavition as on cooldown
        if (ex_markExcavitionAsClicked(baseExcavitionName)) {
            isOnCooldown = true; // Now it's on cooldown
            cooldownJustStarted = true; // Remember that cooldown just started
            
            // Update the specific icon immediately
            ex_updateClickedExcavitionIcon(baseExcavitionName);
        }
    }
    
    // Choose appropriate class for tooltip
    const tooltipClass = isOnCooldown ? 'pokestop-tooltip-cooldown' : 'pokestop-tooltip-available';
    
    // Always create tooltip in same style
    tooltip.className = `pokestop-tooltip ${tooltipClass}`;
    
    // Set tooltip position
    tooltip.style.left = `${x + 15}px`;
    tooltip.style.top = `${y}px`;
    tooltip.style.display = 'block';
    
    let cooldownRemainingTime = '';
    let showCooldown = false;
    
    if (isOnCooldown) {
        if (cooldownJustStarted) {
            // If cooldown just started, calculate time until 1:00 AM
            const now = new Date();
            const resetHour = new Date();
            resetHour.setDate(now.getHours() < 1 ? now.getDate() : now.getDate() + 1);
            resetHour.setHours(1, 0, 0, 0);
            cooldownRemainingTime = ex_formatTimeRemaining(resetHour.getTime() - now.getTime());
            showCooldown = true;
        } else {
            // Excavition is already on cooldown - get remaining time
            const savedData = localStorage.getItem('clickedExcavitions');
            if (savedData) {
                const clickedExcavitions = JSON.parse(savedData);
                if (clickedExcavitions[baseExcavitionName]) {
                    const availableAt = clickedExcavitions[baseExcavitionName].availableAt;
                    const now = Date.now();
                    const timeRemaining = availableAt - now;
                    cooldownRemainingTime = ex_formatTimeRemaining(timeRemaining);
                    showCooldown = true;
                }
            }
        }
    }
    
    // Use the displayed excavition name (tooltip) for the display
    const displayName = excavitionName;
    
    // Prepare tooltip HTML
    let tooltipHTML = `<div class="tooltip-header">${window.i18n.t("excavition.prefix") || "Excavition"}: ${displayName}</div>`;
    
    // Add cooldown info only if on cooldown
    if (showCooldown) {
        tooltipHTML += `
            <div class="tooltip-info">
                ${window.i18n.t("excavition.cooldown") || "Reset"}: <span class="tooltip-cooldown">${cooldownRemainingTime}</span>
            </div>
        `;
    }
    
    tooltip.innerHTML = tooltipHTML;
}

function ex_createImagePreviewContainer() {
    if (document.getElementById('excavition-preview-container')) {
        return document.getElementById('excavition-preview-container');
    }

    const previewContainer = document.createElement('div');
    previewContainer.id = 'excavition-preview-container';
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
    closeButton.className = 'pokestop-preview-close'; // Reuse existing CSS class
    closeButton.innerHTML = '&times;';

    closeButton.addEventListener('click', function() {
        ex_hideImagePreview();
    });

    previewContainer.appendChild(closeButton);

    // Add back button
    const backButton = document.createElement('div');
    backButton.className = 'pokestop-preview-back'; // Reuse existing CSS class
    backButton.innerHTML = '&#10094;'; // Left arrow
    backButton.style.display = 'none';

    backButton.addEventListener('click', function() {
        ex_goToPreviousImage();
    });

    previewContainer.appendChild(backButton);

    // Add next button
    const nextButton = document.createElement('div');
    nextButton.className = 'pokestop-preview-next'; // Reuse existing CSS class
    nextButton.innerHTML = '&#10095;'; // Right arrow
    nextButton.style.display = 'none';

    nextButton.addEventListener('click', function() {
        ex_goToNextImage();
    });

    previewContainer.appendChild(nextButton);

    const imageContainer = document.createElement('div');
    imageContainer.className = 'pokestop-image-container'; // Reuse existing CSS class
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

    return previewContainer;
}

function ex_setupDragAndZoom(imageContainer) {
    // Remove existing event listeners to avoid duplicates
    imageContainer.removeEventListener('mousedown', ex_handleMouseDown);
    imageContainer.removeEventListener('wheel', ex_handleImageWheel);
    imageContainer.removeEventListener('touchstart', ex_handleTouchStart);
    imageContainer.removeEventListener('touchmove', ex_handleTouchMove);
    imageContainer.removeEventListener('touchend', ex_handleTouchEnd);
    
    document.removeEventListener('mousemove', ex_handleMouseMove);
    document.removeEventListener('mouseup', ex_handleMouseUp);

    // Reset variables
    ex_isDragging = false;
    ex_currentImageZoom = 1;
    ex_translateX = 0;
    ex_translateY = 0;

    // Add styles that will prevent text selection during dragging
    const style = document.getElementById('ex_drag_style') || document.createElement('style');
    style.id = 'ex_drag_style';
    style.textContent = `
        .ex-dragging {
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        }
        .pokestop-image-container img {
            will-change: transform;
            transform-origin: 0 0;
        }
    `;
    if (!document.getElementById('ex_drag_style')) {
        document.head.appendChild(style);
    }

    // Add event listeners for image
    imageContainer.addEventListener('mousedown', ex_handleMouseDown);
    imageContainer.addEventListener('wheel', ex_handleImageWheel);
    imageContainer.addEventListener('touchstart', ex_handleTouchStart, { passive: false });
    imageContainer.addEventListener('touchmove', ex_handleTouchMove, { passive: false });
    imageContainer.addEventListener('touchend', ex_handleTouchEnd);
    
    // Add event listeners at document level to handle movements outside container
    document.addEventListener('mousemove', ex_handleMouseMove);
    document.addEventListener('mouseup', ex_handleMouseUp);
    
    // Update image styles
    const img = imageContainer.querySelector('img');
    if (img) {
        img.style.cursor = 'grab';
        ex_applyTransformWithBoundaries(img, imageContainer);
    }
}

function ex_handleMouseDown(e) {
    // Handle only left mouse button (0)
    if (e.button !== 0) return;
    
    e.preventDefault();
    
    // Set dragging flag
    ex_isDragging = true;
    
    // Remember initial cursor coordinates
    ex_startX = e.clientX;
    ex_startY = e.clientY;
    
    // Remember initial image offset
    ex_lastTranslateX = ex_translateX;
    ex_lastTranslateY = ex_translateY;
    
    // Change cursor to indicate grabbing
    this.style.cursor = 'grabbing';
    
    // Add class that prevents text selection during dragging
    document.body.classList.add('ex-dragging');
}

function ex_handleMouseMove(e) {
    if (!ex_isDragging) return;
    
    e.preventDefault();
    
    // Calculate cursor offset from start of dragging
    const dx = e.clientX - ex_startX;
    const dy = e.clientY - ex_startY;
    
    // Calculate new image offset
    ex_translateX = ex_lastTranslateX + dx;
    ex_translateY = ex_lastTranslateY + dy;
    
    // Get container and image
    const imageContainer = document.querySelector('#excavition-preview-container .pokestop-image-container');
    const img = imageContainer?.querySelector('img');
    
    // Apply new offset with boundaries
    if (img && imageContainer) {
        ex_applyTransformWithBoundaries(img, imageContainer);
    }
}

function ex_handleMouseUp(e) {
    // Check if dragging is active
    if (!ex_isDragging) return;
    
    // Reset dragging flag
    ex_isDragging = false;
    
    // Set appropriate cursor after dragging ends
    const imageContainer = document.querySelector('#excavition-preview-container .pokestop-image-container');
    if (imageContainer) {
        imageContainer.style.cursor = ex_currentImageZoom > 1 ? 'grab' : 'default';
    }
    
    // Remove class blocking text selection
    document.body.classList.remove('ex-dragging');
    
    // Add inertia for smoother stop effect
    const img = imageContainer?.querySelector('img');
    if (img) {
        img.style.transition = 'transform 0.1s ease-out';
        setTimeout(() => {
            img.style.transition = '';
        }, 100);
    }
}

function ex_handleTouchStart(e) {
    if (e.touches.length === 1) {
        e.preventDefault();
        
        ex_isDragging = true;
        ex_startX = e.touches[0].clientX;
        ex_startY = e.touches[0].clientY;
        ex_lastTranslateX = ex_translateX;
        ex_lastTranslateY = ex_translateY;
    } else if (e.touches.length === 2) {
        e.preventDefault();
        
        // Handle pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        
        this._lastPinchDistance = distance;
        this._lastZoom = ex_currentImageZoom;
        
        // Save midpoint between fingers
        this._pinchMidX = (touch1.clientX + touch2.clientX) / 2;
        this._pinchMidY = (touch1.clientY + touch2.clientY) / 2;
    }
}

function ex_handleTouchMove(e) {
    if (ex_isDragging && e.touches.length === 1) {
        e.preventDefault();
        
        const dx = e.touches[0].clientX - ex_startX;
        const dy = e.touches[0].clientY - ex_startY;
        
        ex_translateX = ex_lastTranslateX + dx;
        ex_translateY = ex_lastTranslateY + dy;
        
        const img = this.querySelector('img');
        if (img) {
            ex_applyTransformWithBoundaries(img, this);
        }
    } else if (e.touches.length === 2 && this._lastPinchDistance) {
        e.preventDefault();
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        
        // Calculate distance change ratio
        const pinchRatio = currentDistance / this._lastPinchDistance;
        const newZoom = this._lastZoom * pinchRatio;
        
        // Limit zoom
        const minZoom = 1;
        const maxZoom = 4.0;
        
        if (newZoom >= minZoom && newZoom <= maxZoom) {
            const rect = this.getBoundingClientRect();
            const pinchMidX = this._pinchMidX - rect.left;
            const pinchMidY = this._pinchMidY - rect.top;
            
            const img = this.querySelector('img');
            if (img) {
                // Calculate pinch position on image at 1:1 scale
                const imageX = (pinchMidX - ex_translateX) / ex_currentImageZoom;
                const imageY = (pinchMidY - ex_translateY) / ex_currentImageZoom;
                
                // Apply new zoom
                ex_currentImageZoom = newZoom;
                
                // Adjust offset so the point under pinch stays in the same place
                ex_translateX = pinchMidX - imageX * ex_currentImageZoom;
                ex_translateY = pinchMidY - imageY * ex_currentImageZoom;
                
                ex_applyTransformWithBoundaries(img, this);
            }
        }
    }
}

function ex_handleTouchEnd(e) {
    if (e.touches.length === 0) {
        ex_isDragging = false;
    }
    
    this._lastPinchDistance = null;
}

function ex_applyTransformWithBoundaries(img, container) {
    if (!img) return;
    
    // Get container and image dimensions
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgWidth = img.naturalWidth * ex_currentImageZoom;
    const imgHeight = img.naturalHeight * ex_currentImageZoom;
    
    // Check if image is wider than container
    if (imgWidth > containerWidth) {
        // When image is wider than container, we need to control horizontal offset
        // ex_translateX can't be greater than 0 (prevents showing empty space on left)
        // ex_translateX can't be less than containerWidth - imgWidth (prevents showing empty space on right)
        ex_translateX = Math.min(0, Math.max(containerWidth - imgWidth, ex_translateX));
    } else {
        // When image is narrower than container, center it
        ex_translateX = (containerWidth - imgWidth) / 2;
    }
    
    // Same for height
    if (imgHeight > containerHeight) {
        // When image is taller than container, we need to control vertical offset
        // ex_translateY can't be greater than 0 (prevents showing empty space on top)
        // ex_translateY can't be less than containerHeight - imgHeight (prevents showing empty space on bottom)
        ex_translateY = Math.min(0, Math.max(containerHeight - imgHeight, ex_translateY));
    } else {
        // When image is shorter than container, center it
        ex_translateY = (containerHeight - imgHeight) / 2;
    }
    
    // Apply transformation - reference point is top left corner (0,0)
    img.style.transformOrigin = '0 0';
    img.style.transform = `translate3d(${ex_translateX}px, ${ex_translateY}px, 0) scale(${ex_currentImageZoom})`;
    
    // Set appropriate cursor based on state
    if (ex_isDragging) {
        img.style.cursor = 'grabbing';
    } else if (ex_currentImageZoom > 1) {
        img.style.cursor = 'grab';
    } else {
        img.style.cursor = 'default';
    }
}

function ex_handleImageWheel(e) {
    e.preventDefault();
    e.stopPropagation();

    const imageContainer = document.querySelector('#excavition-preview-container .pokestop-image-container');
    const img = imageContainer.querySelector('img');

    if (!img) return;

    // Get cursor position relative to container
    const rect = imageContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate cursor position relative to image in its current transformation
    const mouseImgX = (mouseX - ex_translateX) / ex_currentImageZoom;
    const mouseImgY = (mouseY - ex_translateY) / ex_currentImageZoom;
    
    // Determine zoom direction
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    
    // Save previous zoom for animation
    const previousZoom = ex_currentImageZoom;
    
    // Update zoom level
    ex_currentImageZoom *= zoomFactor;

    // Limit zoom
    const minZoom = 1;
    const maxZoom = 5; // Increase maximum zoom
    
    if (ex_currentImageZoom < minZoom) ex_currentImageZoom = minZoom;
    if (ex_currentImageZoom > maxZoom) ex_currentImageZoom = maxZoom;

    // Calculate new position so the point under cursor stays in place
    ex_translateX = mouseX - mouseImgX * ex_currentImageZoom;
    ex_translateY = mouseY - mouseImgY * ex_currentImageZoom;
    
    // Apply transformation with boundaries and notify of change
    ex_applyTransformWithBoundaries(img, imageContainer);
    
    // Add smooth zoom effect
    if (previousZoom !== ex_currentImageZoom) {
        img.style.transition = 'transform 0.1s ease-out';
        setTimeout(() => {
            img.style.transition = '';
        }, 100);
    }
}

function ex_resetPreviewZoom() {
    const imageContainer = document.querySelector('#excavition-preview-container .pokestop-image-container');
    const img = imageContainer.querySelector('img');

    if (!img) return;

    // Add animation for smooth reset
    img.style.transition = 'transform 0.3s ease-out';
    
    // Reset zoom and offset
    ex_currentImageZoom = 1;
    ex_translateX = 0;
    ex_translateY = 0;
    
    // Apply transformation with boundaries
    ex_applyTransformWithBoundaries(img, imageContainer);
    
    // Remove transition after animation completes
    setTimeout(() => {
        img.style.transition = '';
    }, 300);
}

// Functions for navigation between images
function ex_goToNextImage() {
    const currentSite = ex_excavitionSites.find(site => site.name === ex_excavitionImageState.excavitionName);
    if (!currentSite || !currentSite.images || currentSite.images.length <= 1) return;
    
    ex_currentImageIndex = (ex_currentImageIndex + 1) % currentSite.images.length;
    ex_loadExcavitionImage(currentSite.name, ex_currentImageIndex);
}

function ex_goToPreviousImage() {
    const currentSite = ex_excavitionSites.find(site => site.name === ex_excavitionImageState.excavitionName);
    if (!currentSite || !currentSite.images || currentSite.images.length <= 1) return;
    
    ex_currentImageIndex = (ex_currentImageIndex - 1 + currentSite.images.length) % currentSite.images.length;
    ex_loadExcavitionImage(currentSite.name, ex_currentImageIndex);
}

// Function to load and display an excavition image
function ex_loadExcavitionImage(excavitionName, imageIndex) {
    // Save state
    ex_excavitionImageState.excavitionName = excavitionName;
    ex_excavitionImageState.currentIndex = imageIndex;
    ex_currentImageIndex = imageIndex; // Keep currentImageIndex in sync for compatibility
    
    const previewContainer = document.getElementById('excavition-preview-container');
    if (!previewContainer) {
        console.error("Preview container not found!");
        return;
    }
    
    const imageContainer = previewContainer.querySelector('.pokestop-image-container');
    if (!imageContainer) {
        console.error("Image container not found!");
        return;
    }
    
    // Find the excavition site
    const site = ex_excavitionSites.find(site => site.name === excavitionName);
    if (!site || !site.images || site.images.length === 0) {
        console.error(`No images found for excavition site: ${excavitionName}`);
        return;
    }
    
    // Ensure index is within bounds
    if (imageIndex >= site.images.length) {
        imageIndex = 0;
    }
    
    // Define path to image
    const imagePath = `resources/excavition/${site.images[imageIndex]}`;
    
    // Reset zoom and position
    ex_translateX = 0;
    ex_translateY = 0;
    
    // Create new image element
    const newImg = document.createElement('img');
    newImg.src = imagePath;
    newImg.alt = `Excavition at ${excavitionName}`;
    newImg.style.maxWidth = '100%';
    newImg.style.maxHeight = 'calc(95vh - 60px)';
    newImg.style.objectFit = 'contain';
    newImg.style.borderRadius = '4px';
    newImg.style.transform = `scale(${ex_currentImageZoom})`;
    newImg.style.transformOrigin = 'center';
    newImg.style.transition = 'transform 0.2s ease';
    newImg.style.cursor = ex_currentImageZoom > 1 ? 'grab' : 'default';
    
    // Replace existing image with new one with transition effect
    const currentImg = imageContainer.querySelector('img');
    if (currentImg) {
        currentImg.style.opacity = '0';
        setTimeout(() => {
            imageContainer.innerHTML = '';
            imageContainer.appendChild(newImg);
            ex_setupDragAndZoom(imageContainer);
        }, 200);
    } else {
        imageContainer.appendChild(newImg);
        ex_setupDragAndZoom(imageContainer);
    }
    
    // Handle image loading error
    newImg.onerror = function() {
        console.error(`Error loading excavition image: ${imagePath}`);
        newImg.src = 'resources/default-map.webp'; // Fallback image
    };
}

function ex_handleClickOutside(event) {
    const previewContainer = document.getElementById('excavition-preview-container');
    
    // If preview is not open or container doesn't exist, do nothing
    if (!ex_isPreviewOpen || !previewContainer) return;
    
    // Check if click was outside the preview container
    if (!previewContainer.contains(event.target)) {
        ex_hideImagePreview();
    }
}

// Main function to show Excavition image preview
function ex_showImagePreview(excavitionName) {
    try {
        // Check if preview window is already open
        if (ex_isPreviewOpen || ex_previewClickCooldown) {
            return; // Prevent multiple openings
        }

        // Find the excavition site
        const site = ex_excavitionSites.find(site => site.name === excavitionName);
        if (!site) {
            console.error(`Excavition site not found: ${excavitionName}`);
            return;
        }

        // Set blocking flags
        ex_isPreviewOpen = true;
        ex_previewClickCooldown = true;

        // Add timeout to reset additional block after 500ms
        setTimeout(() => {
            ex_previewClickCooldown = false;
        }, 500);

        const previewContainer = ex_createImagePreviewContainer();
        const imageContainer = previewContainer.querySelector('.pokestop-image-container');
        const nextButton = previewContainer.querySelector('.pokestop-preview-next');
        const backButton = previewContainer.querySelector('.pokestop-preview-back');

        // Reset variables
        ex_currentImageZoom = 1;
        ex_translateX = 0;
        ex_translateY = 0;
        ex_isDragging = false;
        imageContainer.innerHTML = '';

        // Initialize new state
        ex_excavitionImageState.currentIndex = 0;
        ex_excavitionImageState.excavitionName = excavitionName;
        ex_excavitionImageState.imageCount = site.images ? site.images.length : 0;

        // Keep compatibility with existing code
        ex_currentImageIndex = 0;
        ex_currentPreviewImage = excavitionName;

        // Add styles to container
        imageContainer.style.display = 'flex';
        imageContainer.style.justifyContent = 'center';
        imageContainer.style.alignItems = 'center';
        imageContainer.style.position = 'relative';

        // Add loader
        const loader = document.createElement('div');
        loader.className = 'image-loader';
        loader.innerHTML = 'Loading...';
        loader.style.position = 'absolute';
        loader.style.top = '50%';
        loader.style.left = '50%';
        loader.style.transform = 'translate(-50%, -50%)';
        loader.style.color = 'white';
        loader.style.fontSize = '18px';
        imageContainer.appendChild(loader);

        // Show or hide navigation buttons based on image count
        if (site.images && site.images.length > 1) {
            nextButton.style.display = 'flex';
            backButton.style.display = 'flex';
        } else {
            nextButton.style.display = 'none';
            backButton.style.display = 'none';
        }

        // Load the first image
        if (site.images && site.images.length > 0) {
            const img = document.createElement('img');
            img.src = `resources/excavition/${site.images[0]}`;
            img.alt = `Excavition at ${excavitionName}`;
            img.style.maxWidth = '100%';
            img.style.maxHeight = 'calc(95vh - 60px)';
            img.style.objectFit = 'contain';
            img.style.borderRadius = '4px';
            img.style.transformOrigin = '0 0';
            img.style.cursor = 'grab';

            img.onload = function() {
                // Remove loader
                if (loader.parentNode) {
                    loader.parentNode.removeChild(loader);
                }
                
                imageContainer.appendChild(img);
                previewContainer.style.display = 'block';

                setTimeout(() => {
                    previewContainer.style.opacity = '1';
                    previewContainer.style.transform = 'translate(-50%, -50%) scale(1)';
                    ex_setupDragAndZoom(imageContainer);
                    document.addEventListener('mousedown', ex_handleClickOutside);
                }, 10);
            };

            img.onerror = function() {
                console.error(`Error loading excavition image: ${img.src}`);
                if (loader.parentNode) {
                    loader.parentNode.removeChild(loader);
                }
                ex_hideImagePreview();
                alert(`Error loading image for ${excavitionName}`);
            };
        } else {
            // No images for this site
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
            const noImageMsg = document.createElement('div');
            noImageMsg.textContent = `No images available for ${excavitionName}`;
            noImageMsg.style.color = 'white';
            noImageMsg.style.padding = '20px';
            imageContainer.appendChild(noImageMsg);
            
            previewContainer.style.display = 'block';
            setTimeout(() => {
                previewContainer.style.opacity = '1';
                previewContainer.style.transform = 'translate(-50%, -50%) scale(1)';
                document.addEventListener('mousedown', ex_handleClickOutside);
            }, 10);
        }
    } catch (error) {
        console.error('Error showing image preview:', error);
    }
}

function ex_hideImagePreview() {
    const previewContainer = document.getElementById('excavition-preview-container');
    if (!previewContainer) return;

    // Remove listener for clicks outside container
    document.removeEventListener('mousedown', ex_handleClickOutside);

    // Remove the event listeners
    const imageContainer = previewContainer.querySelector('.pokestop-image-container');
    if (imageContainer) {
        imageContainer.removeEventListener('mousedown', ex_handleMouseDown);
        imageContainer.removeEventListener('wheel', ex_handleImageWheel);
        imageContainer.removeEventListener('touchstart', ex_handleTouchStart);
        imageContainer.removeEventListener('touchmove', ex_handleTouchMove);
        imageContainer.removeEventListener('touchend', ex_handleTouchEnd);
        
        document.removeEventListener('mousemove', ex_handleMouseMove);
        document.removeEventListener('mouseup', ex_handleMouseUp);
    }

    previewContainer.style.opacity = '0';
    previewContainer.style.transform = 'translate(-50%, -50%) scale(0.8)';

    setTimeout(() => {
        previewContainer.style.display = 'none';
        // Reset zoom level for next time
        ex_currentImageZoom = 1;
        ex_translateX = 0;
        ex_translateY = 0;
        // Reset blocking flag
        ex_isPreviewOpen = false;
    }, 300);
}

function ex_createExcavitionIcon(excavitionName, mapPos) {
    const map = document.getElementById('map');
    if (!map) return null;

    // Find the excavition site
    const site = ex_excavitionSites.find(site => site.name === excavitionName);
    if (!site) {
        console.error(`Excavition site not found: ${excavitionName}`);
        return null;
    }

    const [x, y] = mapPos;
    const icon = document.createElement('div');
    icon.className = 'excavition-icon';
    icon.style.left = `${x}px`;
    icon.style.top = `${y}px`;
    icon.style.display = 'none'; // Hide icons by default
    icon.style.position = 'absolute';
    icon.style.width = '34px'; // Same as PokéStop icons
    icon.style.height = '43px';
    icon.style.transform = 'translate(-50%, -50%)';
    icon.style.zIndex = '20';
    icon.style.cursor = 'pointer';
    icon.style.transition = 'transform 0.2s ease, opacity 0.3s ease';
    icon.dataset.mapName = excavitionName;
    icon.dataset.id = `excavition-${excavitionName.replace(/\s+/g, '-').toLowerCase()}`;

    // Check if excavition is on cooldown and set appropriate opacity
    const isAvailable = ex_isExcavitionAvailable(excavitionName);
    icon.style.opacity = isAvailable ? '1.0' : '0.5';

    // Hover effect similar to pokestop
    icon.addEventListener('mouseenter', function() {
        this.style.transform = 'translate(-50%, -50%) scale(1.2)';
        this.style.zIndex = '100';
    });
    
    icon.addEventListener('mouseleave', function() {
        this.style.transform = 'translate(-50%, -50%)';
        this.style.zIndex = '20';
    });

    const img = document.createElement('img');
    img.src = 'resources/excavition/Excavition.webp';
    img.alt = `Excavition at ${excavitionName}`;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.filter = 'drop-shadow(0 0 4px rgba(0, 0, 0, 0.5))';

    // Handle mouseover event with tooltip
    icon.addEventListener('mouseover', function(e) {
        ex_createExcavitionTooltip(site.tooltip || excavitionName, e.clientX, e.clientY);
    });

    icon.addEventListener('mousemove', function(e) {
        // Update tooltip position as mouse moves over icon
        const tooltip = document.getElementById('excavition-tooltip');
        if (tooltip && tooltip.style.display === 'block') {
            tooltip.style.left = `${e.clientX + 15}px`;
            tooltip.style.top = `${e.clientY}px`;
        }
    });

    icon.addEventListener('mouseleave', function() {
        const tooltip = document.getElementById('excavition-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
            ex_activeTooltipExcavitionName = null; // Reset active tooltip
        }
    });

    icon.addEventListener('click', function(e) {
        e.stopPropagation();
        ex_showImagePreview(excavitionName);
    });

    // Handle right mouse button to mark as completed
    icon.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Immediate tooltip call with right click marking - use correct name/tooltip
        ex_createExcavitionTooltip(site.tooltip || excavitionName, e.clientX, e.clientY, true);
    });

    icon.addEventListener('touchstart', function(e) {
        e.preventDefault();
        ex_showImagePreview(excavitionName);
    });

    icon.appendChild(img);
    map.appendChild(icon);

    ex_excavitionIcons.push(icon);

    return icon;
}

function ex_clearExcavitionIcons() {
    ex_excavitionIcons.forEach(icon => {
        if (icon && icon.parentNode) {
            icon.parentNode.removeChild(icon);
        }
    });

    ex_excavitionIcons = [];
}

async function ex_displayAllExcavitionIcons() {
    ex_clearExcavitionIcons();
    ex_createImagePreviewContainer();

    try {
        if (!window.locations || !Array.isArray(window.locations)) {
            console.error('Locations data is not available');
            return;
        }

        if (!ex_excavitionSites || ex_excavitionSites.length === 0) {
            console.warn('No excavition sites defined. Please define ex_excavitionSites array with your sites.');
            return;
        }

        console.log(`Processing ${ex_excavitionSites.length} excavition sites`);

        // Process each excavition site
        for (const site of ex_excavitionSites) {
            // Find location that has tooltip matching the excavition name
            // Use case-insensitive comparison
            const location = window.locations.find(loc => 
                (loc.tooltip && loc.tooltip.toLowerCase() === site.name.toLowerCase())
            );

            // Create icon only if matching location with map_pos was found
            if (location && location.map_pos) {
                ex_createExcavitionIcon(site.name, location.map_pos);
            } else {
                console.warn(`No map coordinates found for excavition location: ${site.name}`);
            }
        }

        console.log(`Excavition icons initialized (${ex_excavitionIcons.length} icons created)`);
    } catch (error) {
        console.error('Error displaying excavition icons:', error);
    }
}

function ex_refreshExcavitionIcons() {
    setTimeout(ex_displayAllExcavitionIcons, 500);
}

function ex_hookIntoMapRefresh() {
    const originalRefreshMarkers = window.refreshMarkers;

    if (typeof originalRefreshMarkers === 'function') {
        window.refreshMarkers = function() {
            originalRefreshMarkers.apply(this, arguments);
            ex_refreshExcavitionIcons();
        };

        console.log('Successfully hooked into refreshMarkers function for excavitions');
    } else {
        console.warn('Could not hook into refreshMarkers function for excavitions');
    }
}

// Function to toggle the visibility of Excavition icons
function ex_toggleExcavitionIcons() {
    console.log("ex_toggleExcavitionIcons function called");
    console.log("Number of Excavition icons:", ex_excavitionIcons.length);

    // Check if icons are currently visible or hidden
    let areIconsVisible = false;
    if (ex_excavitionIcons.length > 0) {
        areIconsVisible = ex_excavitionIcons[0].style.display !== 'none';
    }

    // Toggle visibility - set all to the opposite state
    const newDisplayValue = areIconsVisible ? 'none' : 'block';
    console.log("Setting display to:", newDisplayValue);

    ex_excavitionIcons.forEach(icon => {
        icon.style.display = newDisplayValue;
    });

    // Update button state
    const excavitionToggleBtn = document.getElementById('excavition-toggle-btn');
    if (excavitionToggleBtn) {
        if (newDisplayValue === 'block') {
            excavitionToggleBtn.classList.add('active');
        } else {
            excavitionToggleBtn.classList.remove('active');
        }
    }

    console.log("Updated icon visibility and button state");
}

// Function to create the Excavition toggle button
function ex_createToggleButton() {
    const toggleButtonsContainer = document.querySelector('.toggle-buttons-container');
    if (!toggleButtonsContainer) {
        console.error("Toggle buttons container not found");
        return;
    }

    // Check if button already exists
    if (document.getElementById('excavition-toggle-btn')) {
        return;
    }
    
    // Fix layout issues by correcting the CSS for the container
    toggleButtonsContainer.style.display = 'flex';
    toggleButtonsContainer.style.justifyContent = 'space-between';
    
    // Remove transform from boss button to center it properly
    const bossButton = document.getElementById('boss-toggle-btn');
    if (bossButton) {
        bossButton.style.transform = 'none';
        bossButton.style.margin = '0';
        bossButton.style.justifySelf = 'center';
    }

    // Create button
    const excavitionToggleBtn = document.createElement('div');
    excavitionToggleBtn.id = 'excavition-toggle-btn';
    excavitionToggleBtn.className = 'pokestop-toggle-btn'; // Reuse PokéStop button styling
    excavitionToggleBtn.setAttribute('title', window.i18n.t('excavition.toggle_title') || 'Show/Hide Excavition Sites');
    
    // Create icon
    const img = document.createElement('img');
    img.src = 'resources/excavition/Excavition.webp';
    img.alt = 'Excavition Toggle';
    
    // Create text
    const span = document.createElement('span');
    span.setAttribute('data-i18n', 'excavition.title');
    span.textContent = window.i18n.t('excavition.title') || 'Excavition';
    
    // Add elements to button
    excavitionToggleBtn.appendChild(img);
    excavitionToggleBtn.appendChild(span);
    
    // Add click event
    excavitionToggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        ex_toggleExcavitionIcons();
    });
    
    // Add to container
    toggleButtonsContainer.appendChild(excavitionToggleBtn);
    
    console.log("Excavition toggle button created");
}

// Function to initialize the Excavition feature
function ex_initialize() {
    // Create the toggle button
    ex_createToggleButton();
    
    // Display icons
    ex_displayAllExcavitionIcons();
    
    // Initialize timers
    ex_initExcavitionTimers();
    
    // Hook into map refresh
    ex_hookIntoMapRefresh();
}

// Function to set excavation sites data
function ex_setExcavitionSites(sites) {
    if (Array.isArray(sites)) {
        ex_excavitionSites = sites;
        ex_refreshExcavitionIcons();
    } else {
        console.error("Invalid excavition sites data. Expected an array.");
    }
}

// Wait for DOM to fully load before initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing Excavition button");
    
    // Wait to ensure i18n and other dependencies are loaded
    setTimeout(ex_createToggleButton, 1000);
});

window.addEventListener('load', function() {
    // Example excavition sites - replace with your actual data
    ex_excavitionSites = [
        {name: "Fiery Path", tooltip: "Fiery Path", images: ["Fiery Path.webp", "Fiery Path_items.webp"]},
        {name: "Route 103", tooltip: "Route 103", images: ["Route 103.webp", "Route 103_items.webp"]},
        {name: "Route 111 Desert", tooltip: "Route 111 Desert", images: ["Route 111 Desert.webp", "Route 111 Desert_items.webp"]},
        {name: "Route 113", tooltip: "Route 113 (10000+ discoveries)", images: ["Route 113 (10000+ discoveries).webp", "Route-113-(10000+-discoveries)_items.webp"]},
        {name: "Route 114", tooltip: "Route 114 (3000+ discoveries)", images: ["Route 114 (3000+ discoveries).webp", "Route-114-(3000+-discoveries)_items.webp"]},
        {name: "Route 115", tooltip: "Route 115", images: ["Route 115.webp", "Route 115_items.webp"]},
        {name: "Route 119A", tooltip: "Route 119A", images: ["Route 119A.webp", "Route 119A_items.webp"]},
        {name: "Route 124", tooltip: "Route 124 (6000+ discoveries)", images: ["Route 124 (6000+ discoveries).webp", "Route-124-(6000+-discoveries)_items.webp"]},
        {name: "Rusturf Tunnel", tooltip: "Rusturf Tunnel", images: ["Rusturf Tunnel.webp", "Rusturf Tunnel_items.webp"]}
    ];
    
    // Load clicked excavitions from localStorage
    try {
        const savedData = localStorage.getItem('clickedExcavitions');
        if (savedData) {
            ex_clickedExcavitions = JSON.parse(savedData);
        }
    } catch (error) {
        console.error("Error loading clicked excavitions:", error);
        ex_clickedExcavitions = {};
    }
    
    // Wait for other scripts to initialize
    setTimeout(ex_initialize, 3000);
});

// Export functions that might be needed by other scripts
window.ex_toggleExcavitionIcons = ex_toggleExcavitionIcons;
window.ex_showImagePreview = ex_showImagePreview;
window.ex_setExcavitionSites = ex_setExcavitionSites;
window.ex_updateExcavitionTimers = ex_updateExcavitionTimers;