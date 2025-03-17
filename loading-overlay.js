// This script creates a loading overlay that blocks interaction until the page is fully loaded

const style = document.createElement('style');
style.textContent = `
  #loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #333;
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 1;
    transition: opacity 0.5s;
  }

  .loading-spinner {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .outer-circle {
    width: 80px;
    height: 80px;
    border: 4px solid transparent;
    border-top-color: #60a5fa; /* blue-400 equivalent */
    border-radius: 50%;
    animation: spin 1s linear infinite;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .inner-circle {
    width: 64px;
    height: 64px;
    border: 4px solid transparent;
    border-top-color: #f87171; /* red-400 equivalent */
    border-radius: 50%;
    animation: spin 0.8s linear infinite reverse;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

function createLoadingOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  
  const spinner = document.createElement('div');
  spinner.className = 'loading-spinner';
  
  const outerCircle = document.createElement('div');
  outerCircle.className = 'outer-circle';
  
  const innerCircle = document.createElement('div');
  innerCircle.className = 'inner-circle';
  
  outerCircle.appendChild(innerCircle);
  spinner.appendChild(outerCircle);
  overlay.appendChild(spinner);
  
  document.body.appendChild(overlay);
}

function removeLoadingOverlay() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 500);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  createLoadingOverlay();
});

const originalConsoleLog = console.log;
console.log = function() {
  originalConsoleLog.apply(console, arguments);
  
  const message = arguments[0];
  if (typeof message === 'string' && 
     (message.includes("Pokemon search initialization completed successfully") || 
      message === "pokemon-search.js:74 Pokemon search initialization completed successfully.")) {
    removeLoadingOverlay();
  }
};

window.addEventListener('load', function() {
  setTimeout(function() {
    removeLoadingOverlay();
  }, 10000);
});