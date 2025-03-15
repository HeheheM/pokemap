let pokestopIcons = [];
let currentPreviewImage = null;
let currentImageIndex = 0;
let isPreviewOpen = false; // Flag blocking multiple openings
let previewClickCooldown = false; // Additional protection against multiple clicks
let locationCurrentImageIndex = 0; // Aktualny indeks obrazu lokacji
let locationImagesArray = []; // Tablica z obrazami dla aktualnej lokacji
let locationCurrentPreviewImage = null; // Nazwa aktualnej lokacji
let clickedPokestops = {}; // Dodajemy nową zmienną dla pokestopów z cooldownem
const POKESTOP_COOLDOWN_HOURS = 48; // 48-godzinny cooldown dla pokestopów
let activeTooltipPokestopName = null; // Zmienna do śledzenia aktywnego tooltipa


// Globalne zmienne do obsługi przesuwania i zoomu - zmienione nazwy, aby uniknąć konfliktów
let ps_isDragging = false;
let ps_startX, ps_startY;
let ps_translateX = 0, ps_translateY = 0;
let ps_lastTranslateX = 0, ps_lastTranslateY = 0;
let currentImageZoom = 1;


function createPokestopTooltipElement() {
    // Sprawdź czy element już istnieje
    let pokestopTooltip = document.getElementById('pokestop-tooltip');
    if (pokestopTooltip) {
        return pokestopTooltip;
    }
    
    // Stwórz nowy element tooltipa specjalnie dla pokestopów
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

// Funkcja sprawdzająca czy pokestop jest dostępny (nie jest na cooldownie)
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

// Funkcja oznaczająca pokestop jako kliknięty z cooldownem
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

// Funkcja formatująca czas pozostały do końca cooldownu
function formatPokestopTimeRemaining(milliseconds) {
    if (milliseconds <= 0) return window.i18n.t("pokestop.available");
    
    const seconds = Math.floor((milliseconds / 1000) % 60).toString().padStart(2, '0');
    const minutes = Math.floor((milliseconds / (1000 * 60)) % 60).toString().padStart(2, '0');
    const hours = Math.floor((milliseconds / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
    const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24)).toString().padStart(2, '0');
    
    return `${days}:${hours}:${minutes}:${seconds}`;
}

// Funkcja aktualizująca stan pokestopów (przezroczystość) na podstawie cooldownów
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

    // Aktualizuj wszystkie ikony pokestopów
    pokestopIcons.forEach(icon => {
        const pokestopName = icon.dataset.mapName;
        
        if (clickedPokestopsData[pokestopName] && clickedPokestopsData[pokestopName].availableAt) {
            const availableAt = clickedPokestopsData[pokestopName].availableAt;
            const now = Date.now();
            const timeRemaining = availableAt - now;
            
            if (timeRemaining <= 0) {
                // Pokestop już dostępny
                icon.style.opacity = '1.0';
                
                // Usuń z listy cooldownów
                delete clickedPokestopsData[pokestopName];
                try {
                    localStorage.setItem('clickedPokestops', JSON.stringify(clickedPokestopsData));
                } catch (error) {
                    console.error("Error saving to localStorage:", error);
                }
            } else {
                // Pokestop nadal na cooldownie
                icon.style.opacity = '0.5';
            }
        } else {
            // Pokestop nie jest na cooldownie
            icon.style.opacity = '1.0';
        }
    });
}

// Funkcja do aktualizacji tooltipa pokestopa - będzie wywoływana regularnie
function updateActiveTooltip() {
    if (activeTooltipPokestopName === null) return;
    
    const tooltip = document.getElementById('pokestop-tooltip');
    if (!tooltip || tooltip.style.display === 'none') {
        activeTooltipPokestopName = null;
        return;
    }
    
    // Sprawdź, czy pokestop jest na cooldownie
    if (!isPokestopAvailable(activeTooltipPokestopName)) {
        // Pobierz pozostały czas cooldownu
        const savedData = localStorage.getItem('clickedPokestops');
        if (savedData) {
            const clickedPokestops = JSON.parse(savedData);
            if (clickedPokestops[activeTooltipPokestopName]) {
                const availableAt = clickedPokestops[activeTooltipPokestopName].availableAt;
                const now = Date.now();
                const timeRemaining = availableAt - now;
                
                // Aktualizuj tylko część tooltipa z cooldownem
                const cooldownElement = tooltip.querySelector('.tooltip-cooldown');
                if (cooldownElement) {
                    cooldownElement.textContent = formatPokestopTimeRemaining(timeRemaining);
                }
            }
        }
    }
}


// Funkcja do tworzenia spójnego tooltipa dla pokestopów
function createPokestopTooltip(pokestopName, x, y, isRightClick = false) {
    const tooltip = createPokestopTooltipElement();
    
    // Ustaw nazwę pokestopa jako aktywny tooltip jeśli to nie kliknięcie prawym przyciskiem
    if (!isRightClick) {
        activeTooltipPokestopName = pokestopName;
    }
    
    // Sprawdź, czy pokestop jest na cooldownie
    let isOnCooldown = !isPokestopAvailable(pokestopName);
    
    // Jeśli to kliknięcie prawym i pokestop jest dostępny, od razu go oznacz jako kliknięty
    let cooldownJustStarted = false;
    if (isRightClick && !isOnCooldown) {
        // Natychmiast oznacz pokestop jako będący na cooldownie
        if (markPokestopAsClicked(pokestopName)) {
            isOnCooldown = true; // Teraz jest na cooldownie
            cooldownJustStarted = true; // Zapamiętaj, że cooldown właśnie się rozpoczął
            // Natychmiastowa aktualizacja ikon
            updatePokestopTimers();
        }
    }
    
    // Wybierz odpowiednią klasę dla tooltipa
    const tooltipClass = isOnCooldown ? 'pokestop-tooltip-cooldown' : 'pokestop-tooltip-available';
    
    // Zawsze tworzymy tooltip w tym samym stylu
    tooltip.className = `pokestop-tooltip ${tooltipClass}`;
    
    // Ustaw pozycję tooltipa
    tooltip.style.left = `${x + 15}px`;
    tooltip.style.top = `${y}px`;
    tooltip.style.display = 'block';
    
    let cooldownRemainingTime = '';
    let showCooldown = false;
    
    if (isOnCooldown) {
        if (cooldownJustStarted) {
            // Jeśli cooldown właśnie się rozpoczął, pokaż pełny czas cooldownu
            cooldownRemainingTime = formatPokestopTimeRemaining(POKESTOP_COOLDOWN_HOURS * 60 * 60 * 1000);
            showCooldown = true;
        } else {
            // Pokestop jest już na cooldownie - pobierz pozostały czas
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
    
    // Przygotuj HTML tooltipa
    let tooltipHTML = `<div class="tooltip-header">${window.i18n.t("pokestop.prefix")}: ${pokestopName}</div>`;
    
    // Dodaj informację o cooldownie tylko jeśli jest na cooldownie
    if (showCooldown) {
        tooltipHTML += `
            <div class="tooltip-info">
                ${window.i18n.t("pokestop.cooldown")}: <span class="tooltip-cooldown">${cooldownRemainingTime}</span>
            </div>
        `;
    }
    
    tooltip.innerHTML = tooltipHTML;
}

// Inicjalizacja timera do aktualizacji statusu pokestopów
function initPokestopTimers() {
    updatePokestopTimers();
    setInterval(updatePokestopTimers, 1000);
    initTooltipUpdater(); // Inicjalizuj aktualizator tooltipa
}

// Dodaj interval do aktualizacji aktywnego tooltipa co 1 sekundę
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

    // Add back button
    const backButton = document.createElement('div');
    backButton.className = 'pokestop-preview-back';
    backButton.innerHTML = '&#10094;'; // Left arrow
    backButton.style.display = 'none';

    backButton.addEventListener('click', function() {
        goToPreviousImage();
    });

    previewContainer.appendChild(backButton);

    // Add next button
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

    // Prevent map zoom when scrolling inside the preview container
    previewContainer.addEventListener('wheel', function(e) {
        e.stopPropagation();
    }, { passive: false });

    return previewContainer;
}

function setupDragAndZoom(imageContainer) {
    // Usuwamy istniejące nasłuchiwacze zdarzeń, żeby uniknąć duplikatów
    imageContainer.removeEventListener('mousedown', ps_handleMouseDown);
    imageContainer.removeEventListener('wheel', ps_handleImageWheel);
    imageContainer.removeEventListener('touchstart', ps_handleTouchStart);
    imageContainer.removeEventListener('touchmove', ps_handleTouchMove);
    imageContainer.removeEventListener('touchend', ps_handleTouchEnd);
    
    document.removeEventListener('mousemove', ps_handleMouseMove);
    document.removeEventListener('mouseup', ps_handleMouseUp);

    // Resetujemy zmienne
    ps_isDragging = false;
    currentImageZoom = 1;
    ps_translateX = 0;
    ps_translateY = 0;

    // Dodaj style, które będą zapobiegać zaznaczaniu tekstu podczas przeciągania
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

    // Dodajemy nasłuchiwacze zdarzeń dla obrazu
    imageContainer.addEventListener('mousedown', ps_handleMouseDown);
    imageContainer.addEventListener('wheel', ps_handleImageWheel);
    imageContainer.addEventListener('touchstart', ps_handleTouchStart, { passive: false });
    imageContainer.addEventListener('touchmove', ps_handleTouchMove, { passive: false });
    imageContainer.addEventListener('touchend', ps_handleTouchEnd);
    
    // Dodajemy nasłuchiwacze na poziomie dokumentu, aby obsłużyć ruchy poza kontenerem
    document.addEventListener('mousemove', ps_handleMouseMove);
    document.addEventListener('mouseup', ps_handleMouseUp);
    
    // Aktualizuj style obrazu
    const img = imageContainer.querySelector('img');
    if (img) {
        img.style.cursor = 'grab';
        ps_applyTransformWithBoundaries(img, imageContainer);
    }
}

function ps_handleMouseDown(e) {
    // Obsługuj tylko lewy przycisk myszy (0)
    if (e.button !== 0) return;
    
    e.preventDefault();
    
    // Ustaw flagę przeciągania
    ps_isDragging = true;
    
    // Zapamiętaj początkowe współrzędne kursora
    ps_startX = e.clientX;
    ps_startY = e.clientY;
    
    // Zapamiętaj początkowe przesunięcie obrazu
    ps_lastTranslateX = ps_translateX;
    ps_lastTranslateY = ps_translateY;
    
    // Zmień kursor na wskazujący chwytanie
    this.style.cursor = 'grabbing';
    
    // Dodaj klasę, która zapobiega zaznaczaniu tekstu podczas przeciągania
    document.body.classList.add('ps-dragging');
}

function ps_handleMouseMove(e) {
    if (!ps_isDragging) return;
    
    e.preventDefault();
    
    // Oblicz przesunięcie kursora od początku przeciągania
    const dx = e.clientX - ps_startX;
    const dy = e.clientY - ps_startY;
    
    // Oblicz nowe przesunięcie obrazu
    ps_translateX = ps_lastTranslateX + dx;
    ps_translateY = ps_lastTranslateY + dy;
    
    // Pobierz kontener i obraz
    const imageContainer = document.querySelector('.pokestop-image-container');
    const img = imageContainer?.querySelector('img');
    
    // Zastosuj nowe przesunięcie z ograniczeniami
    if (img && imageContainer) {
        ps_applyTransformWithBoundaries(img, imageContainer);
    }
}

function ps_handleMouseUp(e) {
    // Sprawdź czy przeciąganie jest aktywne
    if (!ps_isDragging) return;
    
    // Resetuj flagę przeciągania
    ps_isDragging = false;
    
    // Ustaw odpowiedni kursor po zakończeniu przeciągania
    const imageContainer = document.querySelector('.pokestop-image-container');
    if (imageContainer) {
        imageContainer.style.cursor = currentImageZoom > 1 ? 'grab' : 'default';
    }
    
    // Usuń klasę blokującą zaznaczanie tekstu
    document.body.classList.remove('ps-dragging');
    
    // Dodaj inercję dla płynniejszego efektu zatrzymania
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
        
        // Handle pinch zoom
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
        
        this._lastPinchDistance = distance;
        this._lastZoom = currentImageZoom;
        
        // Zapisz punkt środkowy między palcami
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
        
        // Oblicz współczynnik zmiany odległości
        const pinchRatio = currentDistance / this._lastPinchDistance;
        const newZoom = this._lastZoom * pinchRatio;
        
        // Ogranicz przybliżenie
        const minZoom = 1;
        const maxZoom = 4.0;
        
        if (newZoom >= minZoom && newZoom <= maxZoom) {
            const rect = this.getBoundingClientRect();
            const pinchMidX = this._pinchMidX - rect.left;
            const pinchMidY = this._pinchMidY - rect.top;
            
            const img = this.querySelector('img');
            if (img) {
                // Oblicz pozycję pincha na obrazie w skali 1:1
                const imageX = (pinchMidX - ps_translateX) / currentImageZoom;
                const imageY = (pinchMidY - ps_translateY) / currentImageZoom;
                
                // Zastosuj nowy zoom
                currentImageZoom = newZoom;
                
                // Dostosuj przesunięcie, aby punkt wskazany przez pinch pozostał na tym samym miejscu
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
    
    // Pobierz wymiary kontenera i obrazka
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgWidth = img.naturalWidth * currentImageZoom;
    const imgHeight = img.naturalHeight * currentImageZoom;
    
    // Sprawdzamy, czy obrazek jest większy niż kontener
    if (imgWidth > containerWidth) {
        // Gdy obrazek jest szerszy niż kontener, musimy kontrolować przesunięcie w poziomie
        // ps_translateX nie może być większe niż 0 (zapobiega pokazywaniu pustej przestrzeni po lewej)
        // ps_translateX nie może być mniejsze niż containerWidth - imgWidth (zapobiega pokazywaniu pustej przestrzeni po prawej)
        ps_translateX = Math.min(0, Math.max(containerWidth - imgWidth, ps_translateX));
    } else {
        // Gdy obrazek jest węższy niż kontener, centrujemy go
        ps_translateX = (containerWidth - imgWidth) / 2;
    }
    
    // To samo dla wysokości
    if (imgHeight > containerHeight) {
        // Gdy obrazek jest wyższy niż kontener, musimy kontrolować przesunięcie w pionie
        // ps_translateY nie może być większe niż 0 (zapobiega pokazywaniu pustej przestrzeni na górze)
        // ps_translateY nie może być mniejsze niż containerHeight - imgHeight (zapobiega pokazywaniu pustej przestrzeni na dole)
        ps_translateY = Math.min(0, Math.max(containerHeight - imgHeight, ps_translateY));
    } else {
        // Gdy obrazek jest niższy niż kontener, centrujemy go
        ps_translateY = (containerHeight - imgHeight) / 2;
    }
    
    // Zastosuj transformację - punktem odniesienia jest lewy górny róg (0,0)
    img.style.transformOrigin = '0 0';
    img.style.transform = `translate3d(${ps_translateX}px, ${ps_translateY}px, 0) scale(${currentImageZoom})`;
    
    // Ustaw odpowiedni kursor w zależności od stanu
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

    // Pobierz pozycję kursora względem kontenera
    const rect = imageContainer.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Kluczowa zmiana: Oblicz pozycję kursora względem obrazka w jego aktualnej transformacji
    // Musimy uwzględnić aktualny offset i scale obrazka
    const mouseImgX = (mouseX - ps_translateX) / currentImageZoom;
    const mouseImgY = (mouseY - ps_translateY) / currentImageZoom;
    
    // Określ kierunek zoomu
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    
    // Zapisz poprzedni zoom dla animacji
    const previousZoom = currentImageZoom;
    
    // Aktualizuj poziom przybliżenia
    currentImageZoom *= zoomFactor;

    // Ogranicz przybliżenie
    const minZoom = 1;
    const maxZoom = 5; // Zwiększamy maksymalny zoom
    
    if (currentImageZoom < minZoom) currentImageZoom = minZoom;
    if (currentImageZoom > maxZoom) currentImageZoom = maxZoom;

    // Kluczowa zmiana w obliczeniu nowej pozycji:
    // Obliczmy nową pozycję tak, aby punkt pod kursorem pozostał na miejscu
    ps_translateX = mouseX - mouseImgX * currentImageZoom;
    ps_translateY = mouseY - mouseImgY * currentImageZoom;
    
    // Zastosuj transformację z ograniczeniami i powiadomieniem o zmianie
    ps_applyTransformWithBoundaries(img, imageContainer);
    
    // Dodaj efekt płynnego zoomu
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

    // Dodaj animację dla płynnego resetu
    img.style.transition = 'transform 0.3s ease-out';
    
    // Resetuj zoom i przesunięcie
    currentImageZoom = 1;
    ps_translateX = 0;
    ps_translateY = 0;
    
    // Zastosuj transformację z ograniczeniami
    ps_applyTransformWithBoundaries(img, imageContainer);
    
    // Usuń przejście po zakończeniu animacji
    setTimeout(() => {
        img.style.transition = '';
    }, 300);
}

// Function to go to the previous image
function goToPreviousImage() {
    if (locationCurrentPreviewImage && locationImagesArray.length > 1) {
        // For location images
        // Decrease index or go to the end if at the beginning
        locationCurrentImageIndex = (locationCurrentImageIndex - 1 + locationImagesArray.length) % locationImagesArray.length;
        changeLocationImage();
    } else if (currentPreviewImage) {
        // For pokestop images (only for Cerulean City currently)
        currentImageIndex = currentImageIndex === 0 ? 1 : 0;
        togglePreviewImage();
    }
}

// Function to go to the next image
function goToNextImage() {
    if (locationCurrentPreviewImage && locationImagesArray.length > 1) {
        // For location images
        // Increase index or go back to the beginning if at the end
        locationCurrentImageIndex = (locationCurrentImageIndex + 1) % locationImagesArray.length;
        changeLocationImage();
    } else if (currentPreviewImage) {
        // For pokestop images (only for Cerulean City currently)
        currentImageIndex = currentImageIndex === 0 ? 1 : 0;
        togglePreviewImage();
    }
}

// Modified version of toggleLocationImage to handle both directions
function changeLocationImage() {
    if (!locationCurrentPreviewImage || locationImagesArray.length <= 1) return;

    const previewContainer = document.getElementById('pokestop-preview-container');
    const imageContainer = previewContainer.querySelector('.pokestop-image-container');

    // Tworzymy ścieżkę do następnego obrazu
    const imagePath = `resources/maps/${locationCurrentPreviewImage}/${locationImagesArray[locationCurrentImageIndex]}`;

    // Resetujemy pozycję przewijania dla nowego obrazu
    ps_translateX = 0;
    ps_translateY = 0;

    const newImg = document.createElement('img');
    newImg.src = imagePath;
    newImg.alt = `Map of ${locationCurrentPreviewImage}`;
    newImg.style.maxWidth = '100%';
    newImg.style.maxHeight = 'calc(95vh - 60px)';
    newImg.style.objectFit = 'contain';
    newImg.style.borderRadius = '4px';

    // Stosujemy aktualny poziom zoomu do nowego obrazu
    newImg.style.transform = `scale(${currentImageZoom})`;
    newImg.style.transformOrigin = 'center';
    newImg.style.transition = 'transform 0.2s ease';

    // Ustawiamy kursor w zależności od poziomu zoomu
    newImg.style.cursor = currentImageZoom > 1 ? 'grab' : 'default';

    // Zastępujemy aktualny obraz nowym
    const currentImg = imageContainer.querySelector('img');
    if (currentImg) {
        currentImg.style.opacity = '0';
        setTimeout(() => {
            imageContainer.innerHTML = '';
            imageContainer.appendChild(newImg);
            
            // Ponownie konfigurujemy obsługę przeciągania i zoomowania
            setupDragAndZoom(imageContainer);
        }, 200);
    } else {
        imageContainer.appendChild(newImg);
        setupDragAndZoom(imageContainer);
    }
    
    // Obsługa błędu ładowania obrazu
    newImg.onerror = function() {
        console.error(`Error loading location image: ${newImg.src}`);
        newImg.src = 'resources/default-map.webp';
    };
}

function handleClickOutside(event) {
    const previewContainer = document.getElementById('pokestop-preview-container');
    
    // Jeśli podgląd nie jest otwarty lub kontener nie istnieje, nic nie rób
    if (!isPreviewOpen || !previewContainer) return;
    
    // Sprawdź, czy kliknięcie było poza kontenerem podglądu
    if (!previewContainer.contains(event.target)) {
        hideImagePreview();
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
        const backButton = previewContainer.querySelector('.pokestop-preview-back');

        // Reset any previous zoom and scrolling
        currentImageZoom = 1;
        ps_translateX = 0;
        ps_translateY = 0;
        ps_isDragging = false;
        imageContainer.innerHTML = '';

        currentImageIndex = 0;
        currentPreviewImage = mapName;

        // Dodaj style do kontenera
        imageContainer.style.display = 'flex';
        imageContainer.style.justifyContent = 'center';
        imageContainer.style.alignItems = 'center';
        imageContainer.style.position = 'relative';

        const img = document.createElement('img');
        img.src = `resources/pokestops/${mapName}.webp`;
        img.alt = `PokéStop at ${mapName}`;
        img.style.maxWidth = '100%';
        img.style.maxHeight = 'calc(95vh - 60px)';
        img.style.objectFit = 'contain';
        img.style.borderRadius = '4px';
        img.style.transformOrigin = '0 0';
        img.style.cursor = 'grab';

        // Dodaj loader podczas ładowania
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

        img.onload = function() {
            // Usuń loader
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
            
            imageContainer.appendChild(img);
            previewContainer.style.display = 'block';

            setTimeout(() => {
                previewContainer.style.opacity = '1';
                previewContainer.style.transform = 'translate(-50%, -50%) scale(1)';
                
                // Konfiguruj obsługę przeciągania i zoomowania
                setupDragAndZoom(imageContainer);
                
                // Dodaj nasłuchiwacz do wykrywania kliknięć na zewnątrz
                document.addEventListener('mousedown', handleClickOutside);
            }, 10);

            // Check if this location has a second image (only for Cerulean City)
            if (mapName === "Cerulean City") {
                const secondImg = new Image();
                secondImg.onload = function() {
                    nextButton.style.display = 'flex';
                    backButton.style.display = 'flex';
                    
                    // Update navigation functions
                    nextButton.onclick = goToNextImage;
                    backButton.onclick = goToPreviousImage;
                };
                secondImg.onerror = function() {
                    nextButton.style.display = 'none';
                    backButton.style.display = 'none';
                };
                secondImg.src = `resources/pokestops/${mapName}_2.webp`;
            } else {
                // For other locations do not show navigation buttons
                nextButton.style.display = 'none';
                backButton.style.display = 'none';
            }
        };

        img.onerror = function() {
            console.error(`Error loading PokéStop image: ${img.src}`);
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
        // Sprawdzamy czy okno podglądu jest już otwarte
        if (isPreviewOpen || previewClickCooldown) {
            return; // Zapobiegamy wielokrotnemu otwarciu
        }

        // Ustawiamy flagi blokujące
        isPreviewOpen = true;
        previewClickCooldown = true;

        // Dodajemy timeout, aby zresetować dodatkową blokadę po 500ms
        setTimeout(() => {
            previewClickCooldown = false;
        }, 500);

        const previewContainer = createImagePreviewContainer();
        const imageContainer = previewContainer.querySelector('.pokestop-image-container');
        const nextButton = previewContainer.querySelector('.pokestop-preview-next');
        const backButton = previewContainer.querySelector('.pokestop-preview-back');

        // Resetujemy wszystkie zmienne
        currentImageZoom = 1;
        ps_translateX = 0;
        ps_translateY = 0;
        ps_isDragging = false;
        imageContainer.innerHTML = '';

        // Dodaj style do kontenera
        imageContainer.style.display = 'flex';
        imageContainer.style.justifyContent = 'center';
        imageContainer.style.alignItems = 'center';
        imageContainer.style.position = 'relative';

        // Resetujemy indeks obrazu
        locationCurrentImageIndex = 0;
        
        // Zapisujemy nazwę lokacji i obrazy
        locationCurrentPreviewImage = location.tooltip;
        locationImagesArray = location.images || [];

        // Dodaj loader podczas ładowania
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

        // Jeśli nie ma obrazów, wyświetlamy komunikat
        if (!locationImagesArray || locationImagesArray.length === 0) {
            const noImagesMsg = document.createElement('div');
            noImagesMsg.style.padding = '20px';
            noImagesMsg.style.color = 'white';
            noImagesMsg.style.textAlign = 'center';
            noImagesMsg.textContent = `No images available for ${location.tooltip}`;
            
            // Usuń loader
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
            
            imageContainer.appendChild(noImagesMsg);
            previewContainer.style.display = 'block';
            
            setTimeout(() => {
                previewContainer.style.opacity = '1';
                previewContainer.style.transform = 'translate(-50%, -50%) scale(1)';
                
                // Dodaj nasłuchiwacz do wykrywania kliknięć na zewnątrz
                document.addEventListener('mousedown', handleClickOutside);
            }, 10);
            
            return;
        }

        // Budujemy ścieżkę do obrazu
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
            // Usuń loader
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
            
            imageContainer.appendChild(img);
            previewContainer.style.display = 'block';

            setTimeout(() => {
                previewContainer.style.opacity = '1';
                previewContainer.style.transform = 'translate(-50%, -50%) scale(1)';
                
                // Konfiguruj obsługę przeciągania i zoomowania
                setupDragAndZoom(imageContainer);
                
                // Dodaj nasłuchiwacz do wykrywania kliknięć na zewnątrz
                document.addEventListener('mousedown', handleClickOutside);
            }, 10);

            // Sprawdzamy, czy lokacja ma więcej niż jeden obraz
            if (locationImagesArray.length > 1) {
                nextButton.style.display = 'flex';
                backButton.style.display = 'flex';
                
                // Update navigation functions
                nextButton.onclick = goToNextImage;
                backButton.onclick = goToPreviousImage;
            } else {
                nextButton.style.display = 'none';
                backButton.style.display = 'none';
            }
        };

        img.onerror = function() {
            console.error(`Error loading location image: ${img.src}`);
            
            // Usuń loader
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
            
            // Próbujemy załadować domyślny obraz dla lokacji
            img.src = `resources/maps/${location.tooltip}.webp`;
            
            img.onerror = function() {
                // Jeśli drugi raz wystąpił błąd, pokazujemy komunikat
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

    // Usuń nasłuchiwacz kliknięć poza kontenerem
    document.removeEventListener('mousedown', handleClickOutside);

    // Remove the event listeners
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
        // Reset zoom level for next time
        currentImageZoom = 1;
        ps_translateX = 0;
        ps_translateY = 0;
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
        `resources/pokestops/${currentPreviewImage}.webp` : 
        `resources/pokestops/${currentPreviewImage}_2.webp`;

    // Reset scroll position for the new image
    ps_translateX = 0;
    ps_translateY = 0;

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
            
            // Ponownie konfigurujemy obsługę przeciągania i zoomowania
            setupDragAndZoom(imageContainer);
        }, 200);
    } else {
        imageContainer.appendChild(newImg);
        setupDragAndZoom(imageContainer);
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

    // Sprawdź, czy pokestop jest na cooldownie i ustaw odpowiednią przezroczystość
    const isAvailable = isPokestopAvailable(mapName);
    icon.style.opacity = isAvailable ? '1.0' : '0.5';

    const img = document.createElement('img');
    img.src = 'resources/pokestop.webp';
    img.alt = `PokéStop at ${mapName}`;

    // Obsługa zdarzenia mouseover z osobnym tooltipem dla pokestopów
    icon.addEventListener('mouseover', function(e) {
        createPokestopTooltip(mapName, e.clientX, e.clientY);
    });

    icon.addEventListener('mousemove', function(e) {
        // Aktualizuj pozycję tooltipa, gdy myszka się porusza nad ikoną
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
            activeTooltipPokestopName = null; // Resetuj aktywny tooltip
        }
    });

    icon.addEventListener('click', function(e) {
        e.stopPropagation();
        showImagePreview(mapName);
    });

    // Obsługa prawego przycisku myszy z natychmiastowym cooldownem
    icon.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // Natychmiastowe wywołanie tooltipa z oznaczeniem prawego przycisku
        createPokestopTooltip(mapName, e.clientX, e.clientY, true);
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
            if (!fileName.endsWith('.webp')) continue;

            let mapName = fileName.replace('.webp', '');

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
    
    // Po załadowaniu DOM, sprawdzamy czy trzeba zaktualizować obsługę kliknięcia obszarów na mapie
    setTimeout(function() {
        const areaPolygons = document.querySelectorAll('.area-polygon');
        
        areaPolygons.forEach(polygon => {
            // Usuwamy stare zdarzenie kliknięcia, jeśli istnieje
            const oldClickListener = polygon._clickListener;
            if (oldClickListener) {
                polygon.removeEventListener('click', oldClickListener);
            }
            
            // Dodajemy nowe zdarzenie kliknięcia
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
    }, 2000); // Dajemy trochę czasu na załadowanie mapy i obszarów
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
        initPokestopTimers(); // Inicjalizuj timery pokestopów
        
        // Check and initialize button again (in case DOMContentLoaded didn't work)
        initPokestopToggle();
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