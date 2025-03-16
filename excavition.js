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

let ex_isDragging = false;
let ex_startX, ex_startY;
let ex_translateX = 0, ex_translateY = 0;
let ex_lastTranslateX = 0, ex_lastTranslateY = 0;
let ex_currentImageZoom = 1;

let ex_excavitionSites = [
];

function ex_createExcavitionTooltipElement() {
    let excavitionTooltip = document.getElementById('excavition-tooltip');
    if (excavitionTooltip) {
        return excavitionTooltip;
    }
    
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

function ex_updateClickedExcavitionIcon(excavitionName) {
    for (let i = 0; i < ex_excavitionIcons.length; i++) {
        const icon = ex_excavitionIcons[i];
        if (icon.dataset.mapName === excavitionName) {
            icon.style.opacity = '0.5';
        }
    }
}

function ex_markExcavitionAsClicked(excavitionName) {
    if (!ex_isExcavitionAvailable(excavitionName)) {
        return false;
    }
    
    const now = new Date();
    
    const nextReset = new Date();
    nextReset.setDate(now.getDate() + 1); // Next day by default
    nextReset.setHours(1, 0, 0, 0); // Set to 1:00 AM
    
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

    ex_updateClickedExcavitionIcon(excavitionName);
    
    setTimeout(ex_updateExcavitionTimers, 100);
    
    return true;
}

function ex_formatTimeRemaining(milliseconds) {
    if (milliseconds <= 0) return window.i18n.t("excavition.available") || "Available";
    
    const seconds = Math.floor((milliseconds / 1000) % 60).toString().padStart(2, '0');
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60).toString().padStart(2, '0');
    const hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
    
    return `${hours}:${minutes}:${seconds}`;
}

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

    ex_excavitionIcons.forEach(icon => {
        const excavitionName = icon.dataset.mapName;
        
        if (clickedExcavitionsData[excavitionName] && clickedExcavitionsData[excavitionName].availableAt) {
            const availableAt = clickedExcavitionsData[excavitionName].availableAt;
            const now = Date.now();
            const timeRemaining = availableAt - now;
            
            if (timeRemaining <= 0) {
                icon.style.opacity = '1.0';
                
                delete clickedExcavitionsData[excavitionName];
                try {
                    localStorage.setItem('clickedExcavitions', JSON.stringify(clickedExcavitionsData));
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

function ex_updateActiveTooltip() {
    if (ex_activeTooltipExcavitionName === null) return;
    
    const tooltip = document.getElementById('excavition-tooltip');
    if (!tooltip || tooltip.style.display === 'none') {
        ex_activeTooltipExcavitionName = null;
        return;
    }
    
    const site = ex_excavitionSites.find(site => site.name === ex_activeTooltipExcavitionName || site.tooltip === ex_activeTooltipExcavitionName);
    const baseExcavitionName = site ? site.name : ex_activeTooltipExcavitionName;
    
    if (!ex_isExcavitionAvailable(baseExcavitionName)) {
        const savedData = localStorage.getItem('clickedExcavitions');
        if (savedData) {
            const clickedExcavitions = JSON.parse(savedData);
            if (clickedExcavitions[baseExcavitionName]) {
                const availableAt = clickedExcavitions[baseExcavitionName].availableAt;
                const now = Date.now();
                const timeRemaining = availableAt - now;
                
                const cooldownElement = tooltip.querySelector('.tooltip-cooldown');
                if (cooldownElement) {
                    cooldownElement.textContent = ex_formatTimeRemaining(timeRemaining);
                }
            }
        }
    }
}

function ex_initExcavitionTimers() {
    ex_updateExcavitionTimers();
    setInterval(ex_updateExcavitionTimers, 1000);
    setInterval(ex_updateActiveTooltip, 1000); // Initialize tooltip updater
}

function ex_createExcavitionTooltip(excavitionName, x, y, isRightClick = false) {
    const tooltip = ex_createExcavitionTooltipElement();
    
    const site = ex_excavitionSites.find(site => site.tooltip === excavitionName || site.name === excavitionName);
    
    const baseExcavitionName = site ? site.name : excavitionName;
    
    if (!isRightClick) {
        ex_activeTooltipExcavitionName = baseExcavitionName;
    }
    
    let isOnCooldown = !ex_isExcavitionAvailable(baseExcavitionName);
    
    let cooldownJustStarted = false;
    if (isRightClick && !isOnCooldown) {
        if (ex_markExcavitionAsClicked(baseExcavitionName)) {
            isOnCooldown = true; // Now it's on cooldown
            cooldownJustStarted = true; // Remember that cooldown just started
            
            ex_updateClickedExcavitionIcon(baseExcavitionName);
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
            const now = new Date();
            const resetHour = new Date();
            resetHour.setDate(now.getHours() < 1 ? now.getDate() : now.getDate() + 1);
            resetHour.setHours(1, 0, 0, 0);
            cooldownRemainingTime = ex_formatTimeRemaining(resetHour.getTime() - now.getTime());
            showCooldown = true;
        } else {
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
    
    const displayName = excavitionName;
    
    let tooltipHTML = `<div class="tooltip-header">${window.i18n.t("excavition.prefix") || "Excavition"}: ${displayName}</div>`;
    
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

    const backButton = document.createElement('div');
    backButton.className = 'pokestop-preview-back'; // Reuse existing CSS class
    backButton.innerHTML = '&#10094;'; // Left arrow
    backButton.style.display = 'none';

    backButton.addEventListener('click', function() {
        ex_goToPreviousImage();
    });

    previewContainer.appendChild(backButton);

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

    previewContainer.addEventListener('wheel', function(e) {
        e.stopPropagation();
    }, { passive: false });

    return previewContainer;
}

function ex_setupDragAndZoom(imageContainer) {
    imageContainer.removeEventListener('mousedown', ex_handleMouseDown);
    imageContainer.removeEventListener('wheel', ex_handleImageWheel);
    imageContainer.removeEventListener('touchstart', ex_handleTouchStart);
    imageContainer.removeEventListener('touchmove', ex_handleTouchMove);
    imageContainer.removeEventListener('touchend', ex_handleTouchEnd);
    
    document.removeEventListener('mousemove', ex_handleMouseMove);
    document.removeEventListener('mouseup', ex_handleMouseUp);

    ex_isDragging = false;
    ex_currentImageZoom = 1;
    ex_translateX = 0;
    ex_translateY = 0;

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

    imageContainer.addEventListener('mousedown', ex_handleMouseDown);
    imageContainer.addEventListener('wheel', ex_handleImageWheel);
    imageContainer.addEventListener('touchstart', ex_handleTouchStart, { passive: false });
    imageContainer.addEventListener('touchmove', ex_handleTouchMove, { passive: false });
    imageContainer.addEventListener('touchend', ex_handleTouchEnd);
    
    document.addEventListener('mousemove', ex_handleMouseMove);
    document.addEventListener('mouseup', ex_handleMouseUp);
    
    const img = imageContainer.querySelector('img');
    if (img) {
        img.style.cursor = 'grab';
        ex_applyTransformWithBoundaries(img, imageContainer);
    }
}

function ex_handleMouseDown(e) {
    if (e.button !== 0) return;
    
    e.preventDefault();
    
    ex_isDragging = true;
    
    ex_startX = e.clientX;
    ex_startY = e.clientY;
    
    ex_lastTranslateX = ex_translateX;
    ex_lastTranslateY = ex_translateY;
    
    this.style.cursor = 'grabbing';
    
    document.body.classList.add('ex-dragging');
}

function ex_handleMouseMove(e) {
    if (!ex_isDragging) return;
    
    e.preventDefault();
    
    const dx = e.clientX - ex_startX;
    const dy = e.clientY - ex_startY;
    
    ex_translateX = ex_lastTranslateX + dx;
    ex_translateY = ex_lastTranslateY + dy;
    
    const imageContainer = document.querySelector('#excavition-preview-container .pokestop-image-container');
    const img = imageContainer?.querySelector('img');
    
    if (img && imageContainer) {
        ex_applyTransformWithBoundaries(img, imageContainer);
    }
}

function ex_handleMouseUp(e) {
    if (!ex_isDragging) return;
    
    ex_isDragging = false;
    
    const imageContainer = document.querySelector('#excavition-preview-container .pokestop-image-container');
    if (imageContainer) {
        imageContainer.style.cursor = ex_currentImageZoom > 1 ? 'grab' : 'default';
    }
    
    document.body.classList.remove('ex-dragging');
    
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
        
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        
        this._lastPinchDistance = distance;
        this._lastZoom = ex_currentImageZoom;
        
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
                const imageX = (pinchMidX - ex_translateX) / ex_currentImageZoom;
                const imageY = (pinchMidY - ex_translateY) / ex_currentImageZoom;
                
                ex_currentImageZoom = newZoom;
                
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
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgWidth = img.naturalWidth * ex_currentImageZoom;
    const imgHeight = img.naturalHeight * ex_currentImageZoom;
    
    if (imgWidth > containerWidth) {
        ex_translateX = Math.min(0, Math.max(containerWidth - imgWidth, ex_translateX));
    } else {
        ex_translateX = (containerWidth - imgWidth) / 2;
    }
    
    if (imgHeight > containerHeight) {
        ex_translateY = Math.min(0, Math.max(containerHeight - imgHeight, ex_translateY));
    } else {
        ex_translateY = (containerHeight - imgHeight) / 2;
    }
    
    img.style.transformOrigin = '0 0';
    img.style.transform = `translate3d(${ex_translateX}px, ${ex_translateY}px, 0) scale(${ex_currentImageZoom})`;
    
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

    const rect = imageContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const mouseImgX = (mouseX - ex_translateX) / ex_currentImageZoom;
    const mouseImgY = (mouseY - ex_translateY) / ex_currentImageZoom;
    
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    
    const previousZoom = ex_currentImageZoom;
    
    ex_currentImageZoom *= zoomFactor;

    const minZoom = 1;
    const maxZoom = 5; // Increase maximum zoom
    
    if (ex_currentImageZoom < minZoom) ex_currentImageZoom = minZoom;
    if (ex_currentImageZoom > maxZoom) ex_currentImageZoom = maxZoom;

    ex_translateX = mouseX - mouseImgX * ex_currentImageZoom;
    ex_translateY = mouseY - mouseImgY * ex_currentImageZoom;
    
    ex_applyTransformWithBoundaries(img, imageContainer);
    
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

    img.style.transition = 'transform 0.3s ease-out';
    
    ex_currentImageZoom = 1;
    ex_translateX = 0;
    ex_translateY = 0;
    
    ex_applyTransformWithBoundaries(img, imageContainer);
    
    setTimeout(() => {
        img.style.transition = '';
    }, 300);
}

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

function ex_loadExcavitionImage(excavitionName, imageIndex) {
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
    
    const site = ex_excavitionSites.find(site => site.name === excavitionName);
    if (!site || !site.images || site.images.length === 0) {
        console.error(`No images found for excavition site: ${excavitionName}`);
        return;
    }
    
    if (imageIndex >= site.images.length) {
        imageIndex = 0;
    }
    
    const imagePath = `resources/excavition/${site.images[imageIndex]}`;
    
    ex_translateX = 0;
    ex_translateY = 0;
    
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
    
    newImg.onerror = function() {
        console.error(`Error loading excavition image: ${imagePath}`);
        newImg.src = 'resources/default-map.webp'; // Fallback image
    };
}

function ex_handleClickOutside(event) {
    const previewContainer = document.getElementById('excavition-preview-container');
    
    if (!ex_isPreviewOpen || !previewContainer) return;
    
    if (!previewContainer.contains(event.target)) {
        ex_hideImagePreview();
    }
}

function ex_showImagePreview(excavitionName) {
    try {
        if (ex_isPreviewOpen || ex_previewClickCooldown) {
            return; // Prevent multiple openings
        }

        const site = ex_excavitionSites.find(site => site.name === excavitionName);
        if (!site) {
            console.error(`Excavition site not found: ${excavitionName}`);
            return;
        }

        ex_isPreviewOpen = true;
        ex_previewClickCooldown = true;

        setTimeout(() => {
            ex_previewClickCooldown = false;
        }, 500);

        const previewContainer = ex_createImagePreviewContainer();
        const imageContainer = previewContainer.querySelector('.pokestop-image-container');
        const nextButton = previewContainer.querySelector('.pokestop-preview-next');
        const backButton = previewContainer.querySelector('.pokestop-preview-back');

        ex_currentImageZoom = 1;
        ex_translateX = 0;
        ex_translateY = 0;
        ex_isDragging = false;
        imageContainer.innerHTML = '';

        ex_excavitionImageState.currentIndex = 0;
        ex_excavitionImageState.excavitionName = excavitionName;
        ex_excavitionImageState.imageCount = site.images ? site.images.length : 0;

        ex_currentImageIndex = 0;
        ex_currentPreviewImage = excavitionName;

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

        if (site.images && site.images.length > 1) {
            nextButton.style.display = 'flex';
            backButton.style.display = 'flex';
        } else {
            nextButton.style.display = 'none';
            backButton.style.display = 'none';
        }

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

    document.removeEventListener('mousedown', ex_handleClickOutside);

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
        ex_currentImageZoom = 1;
        ex_translateX = 0;
        ex_translateY = 0;
        ex_isPreviewOpen = false;
    }, 300);
}

function ex_createExcavitionIcon(excavitionName, mapPos) {
    const map = document.getElementById('map');
    if (!map) return null;

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

    const isAvailable = ex_isExcavitionAvailable(excavitionName);
    icon.style.opacity = isAvailable ? '1.0' : '0.5';

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

    icon.addEventListener('mouseover', function(e) {
        ex_createExcavitionTooltip(site.tooltip || excavitionName, e.clientX, e.clientY);
    });

    icon.addEventListener('mousemove', function(e) {
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
        
        if (window.isRouteCreatorActive) {
            window.selectLocationForRoute(excavitionName, "excavation", [x, y]);
        } else {
            ex_showImagePreview(excavitionName);
        }
    });

    icon.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        ex_createExcavitionTooltip(site.tooltip || excavitionName, e.clientX, e.clientY, true);
    });

    icon.addEventListener('touchstart', function(e) {
        e.preventDefault();
        
        if (window.isRouteCreatorActive) {
            window.selectLocationForRoute(excavitionName, "excavation", [x, y]);
        } else {
            ex_showImagePreview(excavitionName);
        }
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

        for (const site of ex_excavitionSites) {
            const location = window.locations.find(loc => 
                (loc.tooltip && loc.tooltip.toLowerCase() === site.name.toLowerCase())
            );

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

function ex_toggleExcavitionIcons() {
    console.log("ex_toggleExcavitionIcons function called");
    console.log("Number of Excavition icons:", ex_excavitionIcons.length);

    let areIconsVisible = false;
    if (ex_excavitionIcons.length > 0) {
        areIconsVisible = ex_excavitionIcons[0].style.display !== 'none';
    }

    const newDisplayValue = areIconsVisible ? 'none' : 'block';
    console.log("Setting display to:", newDisplayValue);

    ex_excavitionIcons.forEach(icon => {
        icon.style.display = newDisplayValue;
    });

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

function ex_createToggleButton() {
    const toggleButtonsContainer = document.querySelector('.toggle-buttons-container');
    if (!toggleButtonsContainer) {
        console.error("Toggle buttons container not found");
        return;
    }

    if (document.getElementById('excavition-toggle-btn')) {
        return;
    }
    
    toggleButtonsContainer.style.display = 'flex';
    toggleButtonsContainer.style.justifyContent = 'space-between';
    
    const bossButton = document.getElementById('boss-toggle-btn');
    if (bossButton) {
        bossButton.style.transform = 'none';
        bossButton.style.margin = '0';
        bossButton.style.justifySelf = 'center';
    }

    const excavitionToggleBtn = document.createElement('div');
    excavitionToggleBtn.id = 'excavition-toggle-btn';
    excavitionToggleBtn.className = 'pokestop-toggle-btn'; // Reuse PokéStop button styling
    excavitionToggleBtn.setAttribute('title', window.i18n.t('excavition.toggle_title') || 'Show/Hide Excavition Sites');
    
    const img = document.createElement('img');
    img.src = 'resources/excavition/Excavition.webp';
    img.alt = 'Excavition Toggle';
    
    const span = document.createElement('span');
    span.setAttribute('data-i18n', 'excavition.title');
    span.textContent = window.i18n.t('excavition.title') || 'Excavition';
    
    excavitionToggleBtn.appendChild(img);
    excavitionToggleBtn.appendChild(span);
    
    excavitionToggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        ex_toggleExcavitionIcons();
    });
    
    toggleButtonsContainer.appendChild(excavitionToggleBtn);
    
    console.log("Excavition toggle button created");
}

function ex_initialize() {
    ex_createToggleButton();
    
    ex_displayAllExcavitionIcons();
    
    ex_initExcavitionTimers();
    
    ex_hookIntoMapRefresh();
}

function ex_setExcavitionSites(sites) {
    if (Array.isArray(sites)) {
        ex_excavitionSites = sites;
        ex_refreshExcavitionIcons();
    } else {
        console.error("Invalid excavition sites data. Expected an array.");
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing Excavition button");
    
    setTimeout(ex_createToggleButton, 1000);
});

window.addEventListener('load', function() {
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
    
    try {
        const savedData = localStorage.getItem('clickedExcavitions');
        if (savedData) {
            ex_clickedExcavitions = JSON.parse(savedData);
        }
    } catch (error) {
        console.error("Error loading clicked excavitions:", error);
        ex_clickedExcavitions = {};
    }
    
    setTimeout(ex_initialize, 3000);
    setTimeout(blockExcavationPreviewInRouteCreatorMode, 5000);
});

window.ex_toggleExcavitionIcons = ex_toggleExcavitionIcons;
window.ex_showImagePreview = ex_showImagePreview;
window.ex_setExcavitionSites = ex_setExcavitionSites;
window.ex_updateExcavitionTimers = ex_updateExcavitionTimers;
function blockExcavationPreviewInRouteCreatorMode() {
    const originalShowImagePreview = window.ex_showImagePreview;
    window.ex_showImagePreview = function(excavationName) {
        if (window.isRouteCreatorActive) {
            console.log(`Blokuję otwieranie podglądu dla ${excavationName} w trybie tworzenia trasy`);
            return false;
        }
        
        return originalShowImagePreview(excavationName);
    };
}