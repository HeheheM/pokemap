// This script adds touch support for map panning on mobile devices

document.addEventListener('DOMContentLoaded', function() {
    // Wait for the map element to be available
    const waitForMap = setInterval(() => {
        const map = document.getElementById('map');
        if (map) {
            clearInterval(waitForMap);
            setupTouchSupport(map);
        }
    }, 100);
});

function setupTouchSupport(map) {
    let touchStartX, touchStartY;
    let initialOffsetX, initialOffsetY;
    let isTouchDragging = false;
    let lastTouchDistance = 0;
    map.addEventListener('touchstart', function(e) {
        e.preventDefault();
        
        if (e.touches.length === 1) {
            isTouchDragging = true;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        
            initialOffsetX = window.offsetX || 0;
            initialOffsetY = window.offsetY || 0;
        } 
        else if (e.touches.length === 2) {
            lastTouchDistance = getTouchDistance(e.touches);
        }
    }, { passive: false });

    map.addEventListener('touchmove', function(e) {
        e.preventDefault();
        
        if (isTouchDragging && e.touches.length === 1) {
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            const dx = touchX - touchStartX;
            const dy = touchY - touchStartY;
            
            if (typeof window.offsetX !== 'undefined' && typeof window.offsetY !== 'undefined') {
                window.offsetX = initialOffsetX + dx;
                window.offsetY = initialOffsetY + dy;
                
                if (typeof window.updateMapTransform === 'function') {
                    window.updateMapTransform();
                }
            }
        }
        else if (e.touches.length === 2) {
            const currentDistance = getTouchDistance(e.touches);
            const scaleFactor = currentDistance / lastTouchDistance;
            
            if (scaleFactor !== 1 && typeof window.scale !== 'undefined') {
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                
                const rect = map.getBoundingClientRect();
                const mapCenterX = (centerX - rect.left - window.offsetX) / window.scale;
                const mapCenterY = (centerY - rect.top - window.offsetY) / window.scale;
                
                window.scale *= scaleFactor;
                
                const MIN_SCALE = 0.5;
                const MAX_SCALE = 5.0;
                window.scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, window.scale));
                
                window.offsetX = centerX - mapCenterX * window.scale;
                window.offsetY = centerY - mapCenterY * window.scale;
                
                if (typeof window.updateMapTransform === 'function') {
                    window.updateMapTransform();
                }
                
                lastTouchDistance = currentDistance;
            }
        }
    }, { passive: false });

    map.addEventListener('touchend', function(e) {
        isTouchDragging = false;
        
        if (e.touches.length === 2) {
            lastTouchDistance = getTouchDistance(e.touches);
        }
    });
    
    map.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
    
    function getTouchDistance(touches) {
        if (touches.length < 2) return 0;
        
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx*dx + dy*dy);
    }

    console.log("Touch support initialized for map navigation");
}