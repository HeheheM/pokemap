function toggleBossIcons() {
    // console.log("toggleBossIcons function called");
    
    // Sprawdź, czy ikony są obecnie widoczne lub ukryte
    const areIconsVisible = currentRegionFilter !== "hide_all";
    
    // Przełącz widoczność - ustaw przeciwny stan
    currentRegionFilter = areIconsVisible ? "hide_all" : "all";
    
    // Zaktualizuj stan przycisku
    const bossToggleBtn = document.getElementById('boss-toggle-btn');
    if (bossToggleBtn) {
        if (currentRegionFilter === "all") {
            bossToggleBtn.classList.add('active');
        } else {
            bossToggleBtn.classList.remove('active');
        }
    }
    
    // Zaktualizuj wyświetlanie ikon
    displayBossIcons();
    console.log("Boss icons visibility toggled to", currentRegionFilter);
}

// Funkcja inicjalizująca przycisk toggle dla bossów
function initBossToggle() {
    console.log("Initializing Boss toggle button");
    const bossToggleBtn = document.getElementById('boss-toggle-btn');
    
    if (bossToggleBtn) {
        console.log("Boss toggle button found");
        
        // Usuń wszystkie istniejące nasłuchiwacze (na wszelki wypadek)
        const newBtn = bossToggleBtn.cloneNode(true);
        bossToggleBtn.parentNode.replaceChild(newBtn, bossToggleBtn);
        
        // Aktualizuj etykietę przycisku, jeśli dostępne i18n
        if (window.i18n && typeof window.i18n.t === 'function') {
            const bossLabel = newBtn.querySelector('span');
            if (bossLabel) {
                bossLabel.setAttribute('data-i18n', 'boss.toggle');
                bossLabel.textContent = window.i18n.t('boss.toggle') || 'Bossy';
            }
            
            // Dodaj tooltip do przycisku
            newBtn.setAttribute('title', window.i18n.t('boss.toggle_title') || 'Pokaż/Ukryj Bossy');
        }
        
        // Ustaw początkowy stan przycisku
        if (currentRegionFilter !== "hide_all") {
            newBtn.classList.add('active');
        }
        
        // Dodaj nasłuchiwacz zdarzenia kliknięcia
        newBtn.addEventListener('click', function(e) {
            // console.log("Boss toggle button clicked");
            e.preventDefault();
            e.stopPropagation();
            toggleBossIcons();
        });
        
        console.log("Boss toggle button configured");
    } else {
        console.error("Boss toggle button not found in DOM");
    }
}

// Poczekaj na załadowanie DOM przed inicjalizacją
document.addEventListener('DOMContentLoaded', function() {
    // Poczekaj chwilę, aby upewnić się, że wszystkie elementy są gotowe
    setTimeout(initBossToggle, 1000);
});

// Inicjalizacja po pełnym załadowaniu strony
window.addEventListener('load', function() {
    setTimeout(initBossToggle, 3000);
});