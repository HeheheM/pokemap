let pokestopIcons = [];
let currentPreviewImage = null;
let currentImageIndex = 0;
let isPreviewOpen = false; // Flag blocking multiple openings
let previewClickCooldown = false; // Additional protection against multiple clicks
let locationCurrentImageIndex = 0; // Current index of location image
let locationImagesArray = []; // Array with images for current location
let locationCurrentPreviewImage = null; // Current location name
let clickedPokestops = {}; // Variable for pokestops with cooldown
const POKESTOP_COOLDOWN_HOURS = 48; // 48-hour cooldown for pokestops
let activeTooltipPokestopName = null; // Variable to track active tooltip
let pokestopImageState = {
    currentIndex: 0,
    pokestopName: null,
    imageCount: 0
};

let ps_isDragging = false;
let ps_startX, ps_startY;
let ps_translateX = 0, ps_translateY = 0;
let ps_lastTranslateX = 0, ps_lastTranslateY = 0;
let currentImageZoom = 1;

function createPokestopTooltipElement() {
    let pokestopTooltip = document.getElementById('pokestop-tooltip');
    if (pokestopTooltip) {
        return pokestopTooltip;
    }
    
    pokestopTooltip = document.createElement('div');
    pokestopTooltip.id = 'pokestop-tooltip';
    pokestopTooltip.className = 'pokestop-tooltip';
    pokestopTooltip.style.display = 'none';
    pokestopTooltip.style.position = 'fixed';
    pokestopTooltip.style.zIndex = '2100';
    pokestopTooltip.style.pointerEvents = 'none';
    
    document.body.appendChild(pokestopTooltip);
    return pokestopTooltip;
}

function isPokestopAvailable(pokestopName) {
    try {
        const savedData = localStorage.getItem('clickedPokestops');
        if (savedData) {
            const clickedPokestops = JSON.parse(savedData);
            if (clickedPokestops[pokestopName]) {
                return Date.now() >= clickedPokestops[pokestopName].availableAt;
            }
        }
        return true;
    } catch (error) {
        console.error("Error checking pokestop availability:", error);
        return true;
    }
}

function loadPokestopImage(pokestopName, imageIndex) {
    
    pokestopImageState.pokestopName = pokestopName;
    pokestopImageState.currentIndex = imageIndex;
    currentImageIndex = imageIndex; // Keep currentImageIndex in sync for compatibility
    
    const previewContainer = document.getElementById('pokestop-preview-container');
    if (!previewContainer) {
        console.error("Preview container not found!");
        return;
    }
    
    const imageContainer = previewContainer.querySelector('.pokestop-image-container');
    if (!imageContainer) {
        console.error("Image container not found!");
        return;
    }
    
    const imagePath = imageIndex === 0 ? 
        `resources/pokestops/${pokestopName}.webp` : 
        `resources/pokestops/${pokestopName}_2.webp`;
    
    
    ps_translateX = 0;
    ps_translateY = 0;
    
    const newImg = document.createElement('img');
    newImg.src = imagePath;
    newImg.alt = `PokéStop at ${pokestopName}`;
    newImg.style.maxWidth = '100%';
    newImg.style.maxHeight = 'calc(95vh - 60px)';
    newImg.style.objectFit = 'contain';
    newImg.style.borderRadius = '4px';
    newImg.style.transform = `scale(${currentImageZoom})`;
    newImg.style.transformOrigin = 'center';
    newImg.style.transition = 'transform 0.2s ease';
    newImg.style.cursor = currentImageZoom > 1 ? 'grab' : 'default';
    
    const currentImg = imageContainer.querySelector('img');
    if (currentImg) {
        currentImg.style.opacity = '0';
        setTimeout(() => {
            imageContainer.innerHTML = '';
            imageContainer.appendChild(newImg);
            setupDragAndZoom(imageContainer);
        }, 200);
    } else {
        imageContainer.appendChild(newImg);
        setupDragAndZoom(imageContainer);
    }
}

function markPokestopAsClicked(pokestopName) {
    if (!isPokestopAvailable(pokestopName)) {
        console.log(`Pokestop ${pokestopName} is already on cooldown.`);
        return false;
    }
    
    console.log(`Marking pokestop as clicked: ${pokestopName}`);
    
    const now = Date.now();
    const availableAt = now + (POKESTOP_COOLDOWN_HOURS * 60 * 60 * 1000);

    let clickedPokestopsData = {};
    try {
        const savedData = localStorage.getItem('clickedPokestops');
        if (savedData) {
            clickedPokestopsData = JSON.parse(savedData);
        }
    } catch (error) {
        console.error("Error reading from localStorage:", error);
    }

    clickedPokestopsData[pokestopName] = {
        clickedAt: now,
        availableAt: availableAt,
        cooldownHours: POKESTOP_COOLDOWN_HOURS
    };

    try {
        localStorage.setItem('clickedPokestops', JSON.stringify(clickedPokestopsData));
    } catch (error) {
        console.error("Error saving to localStorage:", error);
    }

    updatePokestopTimers();
    
    return true;
}

function formatPokestopTimeRemaining(milliseconds) {
    if (milliseconds <= 0) return window.i18n.t("pokestop.available");
    
    const seconds = Math.floor((milliseconds / 1000) % 60).toString().padStart(2, '0');
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60).toString().padStart(2, '0');
    const hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24)).toString().padStart(2, '0');
    
    return `${days}:${hours}:${minutes}:${seconds}`;
}

function updatePokestopTimers() {
    let clickedPokestopsData = {};
    try {
        const savedData = localStorage.getItem('clickedPokestops');
        if (savedData) {
            clickedPokestopsData = JSON.parse(savedData);
        }
    } catch (error) {
        console.error("Error reading from localStorage:", error);
        return;
    }

    pokestopIcons.forEach(icon => {
        const pokestopName = icon.dataset.mapName;
        
        if (clickedPokestopsData[pokestopName] && clickedPokestopsData[pokestopName].availableAt) {
            const availableAt = clickedPokestopsData[pokestopName].availableAt;
            const now = Date.now();
            const timeRemaining = availableAt - now;
            
            if (timeRemaining <= 0) {
                icon.style.opacity = '1.0';
                
                delete clickedPokestopsData[pokestopName];
                try {
                    localStorage.setItem('clickedPokestops', JSON.stringify(clickedPokestopsData));
                } catch (error) {
                    console.error("Error saving to localStorage:", error);
                }
            } else {
                icon.style.opacity = '0.5';
            }
        } else {
            icon.style.opacity = '1.0';
        }
    });
}

function updateActiveTooltip() {
    if (activeTooltipPokestopName === null) return;
    
    const tooltip = document.getElementById('pokestop-tooltip');
    if (!tooltip || tooltip.style.display === 'none') {
        activeTooltipPokestopName = null;
        return;
    }
    
    if (!isPokestopAvailable(activeTooltipPokestopName)) {
        const savedData = localStorage.getItem('clickedPokestops');
        if (savedData) {
            const clickedPokestops = JSON.parse(savedData);
            if (clickedPokestops[activeTooltipPokestopName]) {
                const availableAt = clickedPokestops[activeTooltipPokestopName].availableAt;
                const now = Date.now();
                const timeRemaining = availableAt - now;
                
                const cooldownElement = tooltip.querySelector('.tooltip-cooldown');
                if (cooldownElement) {
                    cooldownElement.textContent = formatPokestopTimeRemaining(timeRemaining);
                }
            }
        }
    }
}

function createPokestopTooltip(pokestopName, x, y, isRightClick = false) {
    const tooltip = createPokestopTooltipElement();
    
    if (!isRightClick) {
        activeTooltipPokestopName = pokestopName;
    }
    
    let isOnCooldown = !isPokestopAvailable(pokestopName);
    
    let cooldownJustStarted = false;
    if (isRightClick && !isOnCooldown) {
        if (markPokestopAsClicked(pokestopName)) {
            isOnCooldown = true; // Now it's on cooldown
            cooldownJustStarted = true; // Remember that cooldown just started
            updatePokestopTimers();
        }
    }
    
    const tooltipClass = isOnCooldown ? 'pokestop-tooltip-cooldown' : 'pokestop-tooltip-available';
    
    tooltip.className = `pokestop-tooltip ${tooltipClass}`;
    
    tooltip.style.left = `${x + 15}px`;
    tooltip.style.top = `${y}px`;
    tooltip.style.display = 'block';
    
    let cooldownRemainingTime = '';
    let showCooldown = false;
    
    if (isOnCooldown) {
        if (cooldownJustStarted) {
            cooldownRemainingTime = formatPokestopTimeRemaining(POKESTOP_COOLDOWN_HOURS * 60 * 60 * 1000);
            showCooldown = true;
        } else {
            const savedData = localStorage.getItem('clickedPokestops');
            if (savedData) {
                const clickedPokestops = JSON.parse(savedData);
                if (clickedPokestops[pokestopName]) {
                    const availableAt = clickedPokestops[pokestopName].availableAt;
                    const now = Date.now();
                    const timeRemaining = availableAt - now;
                    cooldownRemainingTime = formatPokestopTimeRemaining(timeRemaining);
                    showCooldown = true;
                }
            }
        }
    }
    
    let tooltipHTML = `<div class="tooltip-header">${window.i18n.t("pokestop.prefix")}: ${pokestopName}</div>`;
    
    if (showCooldown) {
        tooltipHTML += `
            <div class="tooltip-info">
                ${window.i18n.t("pokestop.cooldown")}: <span class="tooltip-cooldown">${cooldownRemainingTime}</span>
            </div>
        `;
    }
    
    tooltip.innerHTML = tooltipHTML;
}

function initPokestopTimers() {
    updatePokestopTimers();
    setInterval(updatePokestopTimers, 1000);
    initTooltipUpdater(); // Initialize tooltip updater
}

function initTooltipUpdater() {
    setInterval(updateActiveTooltip, 1000);
}

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

    const backButton = document.createElement('div');
    backButton.className = 'pokestop-preview-back';
    backButton.innerHTML = '&#10094;'; // Left arrow
    backButton.style.display = 'none';

    backButton.addEventListener('click', function() {
        goToPreviousImage();
    });

    previewContainer.appendChild(backButton);

    const nextButton = document.createElement('div');
    nextButton.className = 'pokestop-preview-next';
    nextButton.innerHTML = '&#10095;'; // Right arrow
    nextButton.style.display = 'none';

    nextButton.addEventListener('click', function() {
        goToNextImage();
    });

    previewContainer.appendChild(nextButton);

    const imageContainer = document.createElement('div');
    imageContainer.className = 'pokestop-image-container';
    imageContainer.style.overflow = 'auto';
    imageContainer.style.maxHeight = 'calc(95vh - 60px)';
    imageContainer.style.maxWidth = '100%';
    imageContainer.style.position = 'relative';
    previewContainer.appendChild(imageContainer);

    document.body.appendChild(previewContainer);

    previewContainer.addEventListener('wheel', function(e) {
        e.stopPropagation();
    }, { passive: false });

    return previewContainer;
}

function setupDragAndZoom(imageContainer) {
    imageContainer.removeEventListener('mousedown', ps_handleMouseDown);
    imageContainer.removeEventListener('wheel', ps_handleImageWheel);
    imageContainer.removeEventListener('touchstart', ps_handleTouchStart);
    imageContainer.removeEventListener('touchmove', ps_handleTouchMove);
    imageContainer.removeEventListener('touchend', ps_handleTouchEnd);
    
    document.removeEventListener('mousemove', ps_handleMouseMove);
    document.removeEventListener('mouseup', ps_handleMouseUp);

    ps_isDragging = false;
    currentImageZoom = 1;
    ps_translateX = 0;
    ps_translateY = 0;

    const style = document.getElementById('ps_drag_style') || document.createElement('style');
    style.id = 'ps_drag_style';
    style.textContent = `
        .ps-dragging {
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
    if (!document.getElementById('ps_drag_style')) {
        document.head.appendChild(style);
    }

    imageContainer.addEventListener('mousedown', ps_handleMouseDown);
    imageContainer.addEventListener('wheel', ps_handleImageWheel);
    imageContainer.addEventListener('touchstart', ps_handleTouchStart, { passive: false });
    imageContainer.addEventListener('touchmove', ps_handleTouchMove, { passive: false });
    imageContainer.addEventListener('touchend', ps_handleTouchEnd);
    
    document.addEventListener('mousemove', ps_handleMouseMove);
    document.addEventListener('mouseup', ps_handleMouseUp);
    
    const img = imageContainer.querySelector('img');
    if (img) {
        img.style.cursor = 'grab';
        ps_applyTransformWithBoundaries(img, imageContainer);
    }
}

function ps_handleMouseDown(e) {
    if (e.button !== 0) return;
    
    e.preventDefault();
    
    ps_isDragging = true;
    
    ps_startX = e.clientX;
    ps_startY = e.clientY;
    
    ps_lastTranslateX = ps_translateX;
    ps_lastTranslateY = ps_translateY;
    
    this.style.cursor = 'grabbing';
    
    document.body.classList.add('ps-dragging');
}

function ps_handleMouseMove(e) {
    if (!ps_isDragging) return;
    
    e.preventDefault();
    
    const dx = e.clientX - ps_startX;
    const dy = e.clientY - ps_startY;
    
    ps_translateX = ps_lastTranslateX + dx;
    ps_translateY = ps_lastTranslateY + dy;
    
    const imageContainer = document.querySelector('.pokestop-image-container');
    const img = imageContainer?.querySelector('img');
    
    if (img && imageContainer) {
        ps_applyTransformWithBoundaries(img, imageContainer);
    }
}

function ps_handleMouseUp(e) {
    if (!ps_isDragging) return;
    
    ps_isDragging = false;
    
    const imageContainer = document.querySelector('.pokestop-image-container');
    if (imageContainer) {
        imageContainer.style.cursor = currentImageZoom > 1 ? 'grab' : 'default';
    }
    
    document.body.classList.remove('ps-dragging');
    
    const img = imageContainer?.querySelector('img');
    if (img) {
        img.style.transition = 'transform 0.1s ease-out';
        setTimeout(() => {
            img.style.transition = '';
        }, 100);
    }
}

function ps_handleTouchStart(e) {
    if (e.touches.length === 1) {
        e.preventDefault();
        
        ps_isDragging = true;
        ps_startX = e.touches[0].clientX;
        ps_startY = e.touches[0].clientY;
        ps_lastTranslateX = ps_translateX;
        ps_lastTranslateY = ps_translateY;
    } else if (e.touches.length === 2) {
        e.preventDefault();
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        
        this._lastPinchDistance = distance;
        this._lastZoom = currentImageZoom;
        
        this._pinchMidX = (touch1.clientX + touch2.clientX) / 2;
        this._pinchMidY = (touch1.clientY + touch2.clientY) / 2;
    }
}

function ps_handleTouchMove(e) {
    if (ps_isDragging && e.touches.length === 1) {
        e.preventDefault();
        
        const dx = e.touches[0].clientX - ps_startX;
        const dy = e.touches[0].clientY - ps_startY;
        
        ps_translateX = ps_lastTranslateX + dx;
        ps_translateY = ps_lastTranslateY + dy;
        
        const img = this.querySelector('img');
        if (img) {
            ps_applyTransformWithBoundaries(img, this);
        }
    } else if (e.touches.length === 2 && this._lastPinchDistance) {
        e.preventDefault();
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const currentDistance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        
        const pinchRatio = currentDistance / this._lastPinchDistance;
        const newZoom = this._lastZoom * pinchRatio;
        
        const minZoom = 1;
        const maxZoom = 4.0;
        
        if (newZoom >= minZoom && newZoom <= maxZoom) {
            const rect = this.getBoundingClientRect();
            const pinchMidX = this._pinchMidX - rect.left;
            const pinchMidY = this._pinchMidY - rect.top;
            
            const img = this.querySelector('img');
            if (img) {
                const imageX = (pinchMidX - ps_translateX) / currentImageZoom;
                const imageY = (pinchMidY - ps_translateY) / currentImageZoom;
                
                currentImageZoom = newZoom;
                
                ps_translateX = pinchMidX - imageX * currentImageZoom;
                ps_translateY = pinchMidY - imageY * currentImageZoom;
                
                ps_applyTransformWithBoundaries(img, this);
            }
        }
    }
}

function ps_handleTouchEnd(e) {
    if (e.touches.length === 0) {
        ps_isDragging = false;
    }
    
    this._lastPinchDistance = null;
}

function ps_applyTransformWithBoundaries(img, container) {
    if (!img) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgWidth = img.naturalWidth * currentImageZoom;
    const imgHeight = img.naturalHeight * currentImageZoom;
    
    if (imgWidth > containerWidth) {
        ps_translateX = Math.min(0, Math.max(containerWidth - imgWidth, ps_translateX));
    } else {
        ps_translateX = (containerWidth - imgWidth) / 2;
    }
    
    if (imgHeight > containerHeight) {
        ps_translateY = Math.min(0, Math.max(containerHeight - imgHeight, ps_translateY));
    } else {
        ps_translateY = (containerHeight - imgHeight) / 2;
    }
    
    img.style.transformOrigin = '0 0';
    img.style.transform = `translate3d(${ps_translateX}px, ${ps_translateY}px, 0) scale(${currentImageZoom})`;
    
    if (ps_isDragging) {
        img.style.cursor = 'grabbing';
    } else if (currentImageZoom > 1) {
        img.style.cursor = 'grab';
    } else {
        img.style.cursor = 'default';
    }
}

function ps_handleImageWheel(e) {
    e.preventDefault();
    e.stopPropagation();

    const imageContainer = document.querySelector('.pokestop-image-container');
    const img = imageContainer.querySelector('img');

    if (!img) return;

    const rect = imageContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const mouseImgX = (mouseX - ps_translateX) / currentImageZoom;
    const mouseImgY = (mouseY - ps_translateY) / currentImageZoom;
    
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    
    const previousZoom = currentImageZoom;
    
    currentImageZoom *= zoomFactor;

    const minZoom = 1;
    const maxZoom = 5; // Increase maximum zoom
    
    if (currentImageZoom < minZoom) currentImageZoom = minZoom;
    if (currentImageZoom > maxZoom) currentImageZoom = maxZoom;

    ps_translateX = mouseX - mouseImgX * currentImageZoom;
    ps_translateY = mouseY - mouseImgY * currentImageZoom;
    
    ps_applyTransformWithBoundaries(img, imageContainer);
    
    if (previousZoom !== currentImageZoom) {
        img.style.transition = 'transform 0.1s ease-out';
        setTimeout(() => {
            img.style.transition = '';
        }, 100);
    }
}

function resetPreviewZoom() {
    const imageContainer = document.querySelector('.pokestop-image-container');
    const img = imageContainer.querySelector('img');

    if (!img) return;

    img.style.transition = 'transform 0.3s ease-out';
    
    currentImageZoom = 1;
    ps_translateX = 0;
    ps_translateY = 0;
    
    ps_applyTransformWithBoundaries(img, imageContainer);
    
    setTimeout(() => {
        img.style.transition = '';
    }, 300);
}

function goToNextImage() {
    if (pokestopImageState.pokestopName) {
        pokestopNextImage();
    }
    else if (locationCurrentPreviewImage && locationImagesArray.length > 1) {
        locationCurrentImageIndex = (locationCurrentImageIndex + 1) % locationImagesArray.length;
        changeLocationImage();
    }
}

function goToPreviousImage() {
    if (pokestopImageState.pokestopName) {
        pokestopPrevImage();
    }
    else if (locationCurrentPreviewImage && locationImagesArray.length > 1) {
        locationCurrentImageIndex = (locationCurrentImageIndex - 1 + locationImagesArray.length) % locationImagesArray.length;
        changeLocationImage();
    }
}

function pokestopNextImage() {
    
    if (pokestopImageState.pokestopName) {
        const newIndex = pokestopImageState.currentIndex === 0 ? 1 : 0;
        loadPokestopImage(pokestopImageState.pokestopName, newIndex);
    }
}

function pokestopPrevImage() {
    
    if (pokestopImageState.pokestopName) {
        const newIndex = pokestopImageState.currentIndex === 0 ? 1 : 0;
        loadPokestopImage(pokestopImageState.pokestopName, newIndex);
    }
}

function changeLocationImage() {
    if (!locationCurrentPreviewImage || locationImagesArray.length <= 1) return;

    const previewContainer = document.getElementById('pokestop-preview-container');
    const imageContainer = previewContainer.querySelector('.pokestop-image-container');

    const imagePath = `resources/maps/${locationCurrentPreviewImage}/${locationImagesArray[locationCurrentImageIndex]}`;

    ps_translateX = 0;
    ps_translateY = 0;

    const newImg = document.createElement('img');
    newImg.src = imagePath;
    newImg.alt = `Map of ${locationCurrentPreviewImage}`;
    newImg.style.maxWidth = '100%';
    newImg.style.maxHeight = 'calc(95vh - 60px)';
    newImg.style.objectFit = 'contain';
    newImg.style.borderRadius = '4px';

    newImg.style.transform = `scale(${currentImageZoom})`;
    newImg.style.transformOrigin = 'center';
    newImg.style.transition = 'transform 0.2s ease';

    newImg.style.cursor = currentImageZoom > 1 ? 'grab' : 'default';

    const currentImg = imageContainer.querySelector('img');
    if (currentImg) {
        currentImg.style.opacity = '0';
        setTimeout(() => {
            imageContainer.innerHTML = '';
            imageContainer.appendChild(newImg);
            
            setupDragAndZoom(imageContainer);
        }, 200);
    } else {
        imageContainer.appendChild(newImg);
        setupDragAndZoom(imageContainer);
    }
    
    newImg.onerror = function() {
        newImg.src = 'resources/default-map.webp';
    };
}

function handleClickOutside(event) {
    const previewContainer = document.getElementById('pokestop-preview-container');
    
    if (!isPreviewOpen || !previewContainer) return;
    
    if (!previewContainer.contains(event.target)) {
        hideImagePreview();
    }
}

function showImagePreview(mapName) {
    try {
        if (isPreviewOpen || previewClickCooldown) {
            return; // Prevent multiple openings
        }

        isPreviewOpen = true;
        previewClickCooldown = true;

        setTimeout(() => {
            previewClickCooldown = false;
        }, 500);

        const previewContainer = createImagePreviewContainer();
        const imageContainer = previewContainer.querySelector('.pokestop-image-container');
        const nextButton = previewContainer.querySelector('.pokestop-preview-next');
        const backButton = previewContainer.querySelector('.pokestop-preview-back');

        currentImageZoom = 1;
        ps_translateX = 0;
        ps_translateY = 0;
        ps_isDragging = false;
        imageContainer.innerHTML = '';

        pokestopImageState.currentIndex = 0;
        pokestopImageState.pokestopName = mapName;
        pokestopImageState.imageCount = 1;

        currentImageIndex = 0;
        currentPreviewImage = mapName;
        
        locationCurrentPreviewImage = null;
        locationImagesArray = [];

        imageContainer.style.display = 'flex';
        imageContainer.style.justifyContent = 'center';
        imageContainer.style.alignItems = 'center';
        imageContainer.style.position = 'relative';

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

        const img = document.createElement('img');
        img.src = `resources/pokestops/${mapName}.webp`;
        img.alt = `PokéStop at ${mapName}`;
        img.style.maxWidth = '100%';
        img.style.maxHeight = 'calc(95vh - 60px)';
        img.style.objectFit = 'contain';
        img.style.borderRadius = '4px';
        img.style.transformOrigin = '0 0';
        img.style.cursor = 'grab';

        img.onload = function() {
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
            
            imageContainer.appendChild(img);
            previewContainer.style.display = 'block';

            setTimeout(() => {
                previewContainer.style.opacity = '1';
                previewContainer.style.transform = 'translate(-50%, -50%) scale(1)';
                setupDragAndZoom(imageContainer);
                document.addEventListener('mousedown', handleClickOutside);
            }, 10);

            if (mapName === "Cerulean City") {
                const secondImg = new Image();
                secondImg.onload = function() {
                    pokestopImageState.imageCount = 2;
                    
                    nextButton.style.display = 'flex';
                    backButton.style.display = 'flex';
                };
                secondImg.onerror = function() {
                    pokestopImageState.imageCount = 1;
                    nextButton.style.display = 'none';
                    backButton.style.display = 'none';
                };
                secondImg.src = `resources/pokestops/${mapName}_2.webp`;
            } else {
                nextButton.style.display = 'none';
                backButton.style.display = 'none';
            }
        };

        img.onerror = function() {
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
            hideImagePreview();
            alert(`Error loading image for ${mapName}`);
        };
    } catch (error) {
        console.error('Error showing image preview:', error);
    }
}

function showLocationImages(location) {
    try {
        if (isPreviewOpen || previewClickCooldown) {
            return; // Prevent multiple openings
        }

        isPreviewOpen = true;
        previewClickCooldown = true;

        setTimeout(() => {
            previewClickCooldown = false;
        }, 500);

        const previewContainer = createImagePreviewContainer();
        const imageContainer = previewContainer.querySelector('.pokestop-image-container');
        const nextButton = previewContainer.querySelector('.pokestop-preview-next');
        const backButton = previewContainer.querySelector('.pokestop-preview-back');

        currentImageZoom = 1;
        ps_translateX = 0;
        ps_translateY = 0;
        ps_isDragging = false;
        imageContainer.innerHTML = '';
        
        pokestopImageState.pokestopName = null;
        currentPreviewImage = null;

        imageContainer.style.display = 'flex';
        imageContainer.style.justifyContent = 'center';
        imageContainer.style.alignItems = 'center';
        imageContainer.style.position = 'relative';

        locationCurrentImageIndex = 0;
        
        locationCurrentPreviewImage = location.tooltip;
        locationImagesArray = location.images || [];

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

        if (!locationImagesArray || locationImagesArray.length === 0) {
            const noImagesMsg = document.createElement('div');
            noImagesMsg.style.padding = '20px';
            noImagesMsg.style.color = 'white';
            noImagesMsg.style.textAlign = 'center';
            noImagesMsg.textContent = `No images available for ${location.tooltip}`;
            
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
            
            imageContainer.appendChild(noImagesMsg);
            previewContainer.style.display = 'block';
            
            setTimeout(() => {
                previewContainer.style.opacity = '1';
                previewContainer.style.transform = 'translate(-50%, -50%) scale(1)';
                
                document.addEventListener('mousedown', handleClickOutside);
            }, 10);
            
            return;
        }

        const imagePath = `resources/maps/${location.tooltip}/${locationImagesArray[0]}`;
        
        const img = document.createElement('img');
        img.src = imagePath;
        img.alt = `Map of ${location.tooltip}`;
        img.style.maxWidth = '100%';
        img.style.maxHeight = 'calc(95vh - 60px)';
        img.style.objectFit = 'contain';
        img.style.borderRadius = '4px';
        img.style.transformOrigin = '0 0';
        img.style.cursor = 'grab';

        img.onload = function() {
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
            
            imageContainer.appendChild(img);
            previewContainer.style.display = 'block';

            setTimeout(() => {
                previewContainer.style.opacity = '1';
                previewContainer.style.transform = 'translate(-50%, -50%) scale(1)';
                
                setupDragAndZoom(imageContainer);
                
                document.addEventListener('mousedown', handleClickOutside);
            }, 10);

            if (locationImagesArray.length > 1) {
                nextButton.style.display = 'flex';
                backButton.style.display = 'flex';
            } else {
                nextButton.style.display = 'none';
                backButton.style.display = 'none';
            }
        };

        img.onerror = function() {
            console.error(`Error loading location image: ${img.src}`);
            
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
            
            img.src = `resources/maps/${location.tooltip}.webp`;
            
            img.onerror = function() {
                hideImagePreview();
                alert(`Error loading image for ${location.tooltip}`);
            };
        };
    } catch (error) {
        console.error('Error showing location image preview:', error);
    }
}

function hideImagePreview() {
    const previewContainer = document.getElementById('pokestop-preview-container');
    if (!previewContainer) return;

    document.removeEventListener('mousedown', handleClickOutside);

    const imageContainer = previewContainer.querySelector('.pokestop-image-container');
    if (imageContainer) {
        imageContainer.removeEventListener('mousedown', ps_handleMouseDown);
        imageContainer.removeEventListener('wheel', ps_handleImageWheel);
        imageContainer.removeEventListener('touchstart', ps_handleTouchStart);
        imageContainer.removeEventListener('touchmove', ps_handleTouchMove);
        imageContainer.removeEventListener('touchend', ps_handleTouchEnd);
        
        document.removeEventListener('mousemove', ps_handleMouseMove);
        document.removeEventListener('mouseup', ps_handleMouseUp);
    }

    previewContainer.style.opacity = '0';
    previewContainer.style.transform = 'translate(-50%, -50%) scale(0.8)';

    setTimeout(() => {
        previewContainer.style.display = 'none';
        currentImageZoom = 1;
        ps_translateX = 0;
        ps_translateY = 0;
        isPreviewOpen = false;
    }, 300);
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

    const isAvailable = isPokestopAvailable(mapName);
    icon.style.opacity = isAvailable ? '1.0' : '0.5';

    const img = document.createElement('img');
    img.src = 'resources/pokestop.webp';
    img.alt = `PokéStop at ${mapName}`;

    icon.addEventListener('mouseover', function(e) {
        createPokestopTooltip(mapName, e.clientX, e.clientY);
    });

    icon.addEventListener('mousemove', function(e) {
        const tooltip = document.getElementById('pokestop-tooltip');
        if (tooltip && tooltip.style.display === 'block') {
            tooltip.style.left = `${e.clientX + 15}px`;
            tooltip.style.top = `${e.clientY}px`;
        }
    });

    icon.addEventListener('mouseleave', function() {
        const tooltip = document.getElementById('pokestop-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
            activeTooltipPokestopName = null; // Reset active tooltip
        }
    });

    icon.addEventListener('click', function(e) {
        e.stopPropagation();
        
        if (window.isRouteCreatorActive) {
            window.selectLocationForRoute(mapName, "pokestop", [x, y]);
        } else {
            showImagePreview(mapName);
        }
    });

    icon.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        createPokestopTooltip(mapName, e.clientX, e.clientY, true);
    });

    icon.addEventListener('touchstart', function(e) {
        e.preventDefault();
        
        if (window.isRouteCreatorActive) {
            window.selectLocationForRoute(mapName, "pokestop", [x, y]);
        } else {
            showImagePreview(mapName);
        }
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

async function getPokestopFiles() {
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

        let pokestopFiles = await getPokestopFiles();

        if (!pokestopFiles || pokestopFiles.length === 0) {
            console.error('No pokestop image files found. Please define window.pokestopFileList array with your PNG filenames.');
            console.log('INSTRUCTION: In the script uncomment or add PNG filenames to the window.pokestopFileList array.');

            alert('No PokéStop files found. Please add PNG filenames to the window.pokestopFileList array in the script.');
            return;
        }

        console.log(`Processing ${pokestopFiles.length} pokestop image files`);

        for (const fileName of pokestopFiles) {
            if (!fileName.endsWith('.webp')) continue;

            let mapName = fileName.replace('.webp', '');

            if (mapName.endsWith('_2')) {
                continue;
            }

            const location = window.locations.find(loc => 
                (loc.tooltip && loc.tooltip.toLowerCase() === mapName.toLowerCase())
            );

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

function togglePokestopIcons() {
    console.log("Number of PokéStop icons:", pokestopIcons.length);

    let areIconsVisible = false;
    if (pokestopIcons.length > 0) {
        areIconsVisible = pokestopIcons[0].style.display !== 'none';
    }

    const newDisplayValue = areIconsVisible ? 'none' : 'block';

    pokestopIcons.forEach(icon => {
        icon.style.display = newDisplayValue;
    });

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

function initPokestopToggle() {
    console.log("Initializing PokéStop button");
    const pokestopToggleBtn = document.getElementById('pokestop-toggle-btn');

    if (pokestopToggleBtn) {
        console.log("PokéStop button found");

        const newBtn = pokestopToggleBtn.cloneNode(true);
        pokestopToggleBtn.parentNode.replaceChild(newBtn, pokestopToggleBtn);

        if (window.i18n && typeof window.i18n.t === 'function') {
            const pokestopLabel = newBtn.querySelector('span');
            if (pokestopLabel) {
                pokestopLabel.setAttribute('data-i18n', 'pokestop.title');
                pokestopLabel.textContent = window.i18n.t('pokestop.title') || 'PokéStop';
            }
            
            newBtn.setAttribute('title', window.i18n.t('pokestop.toggle_title') || 'Pokaż/Ukryj PokéStopy');
        }

        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            togglePokestopIcons();
        });

        console.log("PokéStop button configured");
    } else {
        console.error("PokéStop button not found in DOM");
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing PokéStop button");
    setTimeout(initPokestopToggle, 1000);
    
    setTimeout(function() {
        const areaPolygons = document.querySelectorAll('.area-polygon');
        
        areaPolygons.forEach(polygon => {
            const oldClickListener = polygon._clickListener;
            if (oldClickListener) {
                polygon.removeEventListener('click', oldClickListener);
            }
            
            const newClickListener = function(e) {
                e.stopPropagation();
                const locationName = this.dataset.name;
                const location = window.locations.find(loc => loc.tooltip === locationName);
                
                if (location) {
                    showLocationImages(location);
                }
            };
            
            polygon._clickListener = newClickListener;
            polygon.addEventListener('click', newClickListener);
        });
        
        console.log("Updated click handlers for area polygons");
    }, 2000); // Give some time for map and areas to load
});

window.addEventListener('load', function() {
    console.log("Page fully loaded");
    window.pokestopFileList = [
        "Azalea Town.webp",
        "Celestic Town.webp",
        "Cerulean City.webp",
        "Cerulean City_2.webp",
        "Cinnabar Island.webp",
        "Digletts Cave.webp",
        "Ecruteak City.webp",
        "Eterna Forest.webp",
        "Hearthome City.webp",
        "Ilex Forest.webp",
        "Jubilife City.webp",
        "Lake of Rage.webp",
        "Lavaridge Town.webp",
        "Lilycove City.webp",
        "Mossdeep City.webp",
        "National Park.webp",
        "Olivine City.webp",
        "Pacifidlog Town.webp",
        "Pastoria City.webp",
        "Petalburg Woods.webp",
        "Pewter City.webp",
        "Route 10.webp",
        "Route 110.webp",
        "Route 111 Desert.webp",
        "Route 115.webp",
        "Route 119A.webp",
        "Turnback Cave.webp",
        "Route 3.webp",
        "Route 32.webp",
        "Route 45.webp",
        "Route 5.webp",
        "Slateport City.webp",
        "Snowpoint City.webp",
        "Solaceon Town.webp",
        "Sootopolis City.webp",
        "Sunyshore City.webp",
        "Veilstone City.webp",
        "Vermilion City.webp",
        "Violet City.webp",
        "Viridian Forest.webp",
        "Viridian City.webp",
    ];

    setTimeout(function() {
        console.log("Initializing PokéStop icons");
        displayAllPokestopIcons();
        hookIntoMapRefresh();
        initPokestopTimers(); // Initialize pokestop timers
        
        initPokestopToggle();
        blockPokestopPreviewInRouteCreatorMode();
    }, 3000);
    
    console.log("Initializing location preview functionality");
    window.showLocationImages = showLocationImages;
    const originalCenterMapOnLocation = window.centerMapOnLocation;
    window.centerMapOnLocation = function(location, fromSearch) {
        if (fromSearch) {
            if (typeof originalCenterMapOnLocation === 'function') {
                originalCenterMapOnLocation(location, true);
            }
        } else {
            showLocationImages(location);
        }
    };
    
    console.log("Location preview functionality initialized");
});
function blockPokestopPreviewInRouteCreatorMode() {
    const pokestopIcons = document.querySelectorAll('.pokestop-icon');
    pokestopIcons.forEach(icon => {
        const originalShowImagePreview = window.showImagePreview;
        window.showImagePreview = function(mapName) {
            if (window.isRouteCreatorActive) {
                console.log(`Blokuję otwieranie podglądu dla ${mapName} w trybie tworzenia trasy`);
                return false;
            }
            
            return originalShowImagePreview(mapName);
        };
    });
}