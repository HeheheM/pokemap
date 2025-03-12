// sidebar-toggle.js
// This script adds toggle buttons to hide/show the sidebar

document.addEventListener('DOMContentLoaded', function() {
    // Create CSS for the toggle buttons
    const style = document.createElement('style');
    style.textContent = `
        .sidebar-toggle {
            width: 40px;
            height: 40px;
            background-color: #555;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
            z-index: 1000;
            transition: background-color 0.2s, transform 0.2s;
        }
        
        .sidebar-toggle:hover {
            background-color: #666;
            transform: scale(1.05);
        }
        
        .hide-sidebar-btn {
            position: absolute;
            top: 10px;
            right: 15px;
        }
        
        .show-sidebar-btn {
            position: fixed;
            top: 15px;
            left: 15px;
            display: none;
        }
        
        .sidebar-toggle svg {
            width: 24px;
            height: 24px;
            fill: none;
            stroke: white;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
        }
        
        body.sidebar-hidden .sidebar {
            margin-left: -330px;
        }
        
        body.sidebar-hidden #map-container {
            width: 100%;
            margin-left: 0;
        }
        
        .sidebar {
            transition: margin-left 0.3s ease;
            margin-left: 0;
            position: relative; /* Ensures the hide button is positioned relative to sidebar */
        }
        
        #map-container {
            transition: width 0.3s ease, margin-left 0.3s ease;
        }
        
        @media (max-width: 768px) {
            .sidebar-toggle {
                width: 50px;
                height: 50px;
            }
            
            .sidebar-toggle svg {
                width: 28px;
                height: 28px;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Get sidebar element
    const sidebar = document.querySelector('.sidebar');
    
    // Create hide sidebar button (arrow left)
    const hideSidebarBtn = document.createElement('div');
    hideSidebarBtn.className = 'sidebar-toggle hide-sidebar-btn';
    hideSidebarBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
    `;
    sidebar.appendChild(hideSidebarBtn);
    
    // Create show sidebar button (arrow right)
    const showSidebarBtn = document.createElement('div');
    showSidebarBtn.className = 'sidebar-toggle show-sidebar-btn';
    showSidebarBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
            <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
    `;
    document.body.appendChild(showSidebarBtn);
    
    // Add click event listeners
    hideSidebarBtn.addEventListener('click', function() {
        document.body.classList.add('sidebar-hidden');
        showSidebarBtn.style.display = 'flex';
        
        // Trigger a window resize event to update the map dimensions
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 300); // Wait for transition to complete
    });
    
    showSidebarBtn.addEventListener('click', function() {
        document.body.classList.remove('sidebar-hidden');
        showSidebarBtn.style.display = 'none';
        
        // Trigger a window resize event to update the map dimensions
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
        }, 300); // Wait for transition to complete
    });
    console.log("Sidebar toggle buttons initialized");
});