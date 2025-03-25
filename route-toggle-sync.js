document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initToggleSync, 1000);
});

function initToggleSync() {
    // Znajdź przyciski
    const pokestopMainBtn = document.getElementById('pokestop-toggle-btn');
    const pokestopRouteBtn = document.getElementById('route-pokestop-toggle-btn');
    const bossMainBtn = document.getElementById('boss-toggle-btn');
    const bossRouteBtn = document.getElementById('route-boss-toggle-btn');
    const excavitionMainBtn = document.getElementById('excavition-toggle-btn');
    const excavitionRouteBtn = document.getElementById('route-excavition-toggle-btn');
    
    // Funkcja do synchronizacji stanu przycisku
    function syncButtonState(mainBtn, routeBtn) {
        if (!mainBtn || !routeBtn) return;
        
        // Kopiuj stan klasy active
        if (mainBtn.classList.contains('active')) {
            routeBtn.classList.add('active');
        } else {
            routeBtn.classList.remove('active');
        }
    }
    
    // Obsługa kliknięcia przycisku w kreatorze trasy - dla pokestopów
    if (pokestopRouteBtn) {
        pokestopRouteBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (pokestopMainBtn) {
                pokestopMainBtn.click();
                setTimeout(() => syncButtonState(pokestopMainBtn, pokestopRouteBtn), 50);
            }
        };
    }
    
    // Obsługa kliknięcia przycisku w kreatorze trasy - dla bossów
    if (bossRouteBtn) {
        bossRouteBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (bossMainBtn) {
                bossMainBtn.click();
                setTimeout(() => syncButtonState(bossMainBtn, bossRouteBtn), 50);
            }
        };
    }
    
    // Obsługa kliknięcia przycisku w kreatorze trasy - dla excavition
    if (excavitionRouteBtn) {
        excavitionRouteBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (excavitionMainBtn) {
                excavitionMainBtn.click();
                setTimeout(() => syncButtonState(excavitionMainBtn, excavitionRouteBtn), 50);
            }
        };
    }
    
    // Synchronizuj początkowy stan przycisków
    syncButtonState(pokestopMainBtn, pokestopRouteBtn);
    syncButtonState(bossMainBtn, bossRouteBtn);
    syncButtonState(excavitionMainBtn, excavitionRouteBtn);
    
    // Dodaj obserwatory zmian dla głównych przycisków
    const setupObserver = function(mainBtn, routeBtn) {
        if (!mainBtn || !routeBtn) return;
        
        const observer = new MutationObserver(function() {
            syncButtonState(mainBtn, routeBtn);
        });
        
        observer.observe(mainBtn, { attributes: true, attributeFilter: ['class'] });
    };
    
    setupObserver(pokestopMainBtn, pokestopRouteBtn);
    setupObserver(bossMainBtn, bossRouteBtn);
    setupObserver(excavitionMainBtn, excavitionRouteBtn);
}

// Wywołaj synchronizację po przejściu do kreatora trasy
document.getElementById('route-creator-btn')?.addEventListener('click', function() {
    setTimeout(initToggleSync, 300);
});

// Również przy każdym załadowaniu strony
window.addEventListener('load', function() {
    setTimeout(initToggleSync, 1000);
});