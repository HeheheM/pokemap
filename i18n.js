let currentLanguage = 'en';
let translations = {};
let languageChangeListeners = [];

async function initializeI18n() {
    try {
        const response = await fetch('language.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        translations = await response.json();

        <script src="loading-overlay.js"></script>
        
        const savedLanguage = localStorage.getItem('appLanguage');
        if (savedLanguage && translations[savedLanguage]) {
            currentLanguage = savedLanguage;
        } else {
            detectBrowserLanguage();
            localStorage.setItem('appLanguage', currentLanguage);
        }

        applyTranslations();
        addLanguageSwitcher();
        
        console.log(`Initialized i18n system with language: ${currentLanguage}`);
    } catch (error) {
        console.error("Error initializing i18n system:", error);
        currentLanguage = 'en';
    }
}

function detectBrowserLanguage() {
    const browserLang = (navigator.language || navigator.userLanguage).split('-')[0];
    if (translations[browserLang]) {
        currentLanguage = browserLang;
    } else {
        currentLanguage = 'en';
    }
    
    console.log(`Detected browser language: ${browserLang}, using: ${currentLanguage}`);
}

function setLanguage(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        localStorage.setItem('appLanguage', lang);
        applyTranslations();
        languageChangeListeners.forEach(listener => listener(lang));
        console.log(`Language changed to: ${lang}`);
        return true;
    } else {
        console.warn(`Translation for language "${lang}" not available`);
        return false;
    }
}

function onLanguageChange(callback) {
    if (typeof callback === 'function') {
        languageChangeListeners.push(callback);
    }
}

function t(key, replacements = {}) {
    const segments = key.split('.');
    let value = translations[currentLanguage];

    for (const segment of segments) {
        if (value && value[segment] !== undefined) {
            value = value[segment];
        } else {
            console.warn(`Translation missing for key: ${key} in language: ${currentLanguage}`);
            let fallbackValue = translations['en'];
            for (const segment of segments) {
                if (fallbackValue && fallbackValue[segment] !== undefined) {
                    fallbackValue = fallbackValue[segment];
                } else {
                    return key;
                }
            }
            return typeof fallbackValue === 'string' ? fallbackValue : key;
        }
    }

    if (typeof value !== 'string') {
        return key;
    }

    let result = value;
    if (Array.isArray(replacements)) {
        replacements.forEach((val, index) => {
            result = result.replace(new RegExp(`\\{${index}\\}`, 'g'), val);
        });
    } else {
        Object.keys(replacements).forEach(key => {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), replacements[key]);
        });
    }
    
    return result;
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = t(key);
    });

    document.querySelectorAll('[data-i18n-title]').forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        element.title = t(key);
    });
}

function addLanguageSwitcher() {
    const availableLanguages = Object.keys(translations);
    if (availableLanguages.length <= 1) return;

    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
        console.warn('Cannot add language switcher - sidebar not found');
        return;
    }

    const langContainer = document.createElement('div');
    langContainer.className = 'language-container';
    langContainer.style.marginTop = 'auto';
    langContainer.style.padding = '15px';
    langContainer.style.borderTop = '1px solid #555';

    const langLabel = document.createElement('div');
    langLabel.textContent = 'Language / Język';
    langLabel.style.fontSize = '14px';
    langLabel.style.marginBottom = '8px';
    langLabel.style.color = '#ccc';

    const langButtons = document.createElement('div');
    langButtons.style.display = 'flex';
    langButtons.style.gap = '5px';

    availableLanguages.forEach(lang => {
        const button = document.createElement('button');
        button.className = 'control-btn';
        button.textContent = lang.toUpperCase();
        button.style.flex = '1';
        button.style.fontWeight = lang === currentLanguage ? 'bold' : 'normal';
        button.style.backgroundColor = lang === currentLanguage ? '#4CAF50' : '#555';

        button.addEventListener('click', () => {
            if (setLanguage(lang)) {
                langButtons.querySelectorAll('button').forEach(btn => {
                    btn.style.fontWeight = btn.textContent.toLowerCase() === currentLanguage ? 'bold' : 'normal';
                    btn.style.backgroundColor = btn.textContent.toLowerCase() === currentLanguage ? '#4CAF50' : '#555';
                });
            }
        });
        
        langButtons.appendChild(button);
    });

    langContainer.appendChild(langLabel);
    langContainer.appendChild(langButtons);

    sidebar.appendChild(langContainer);
}

function translateText(key, replacements = {}) {
    return t(key, replacements);
}

function formatDate(date, options = {}) {
    return new Intl.DateTimeFormat(currentLanguage, options).format(date);
}

window.i18n = {
    init: initializeI18n,
    t: t,
    translateText: translateText,
    setLanguage: setLanguage,
    getCurrentLanguage: () => currentLanguage,
    formatDate: formatDate,
    applyTranslations: applyTranslations,
    onLanguageChange: onLanguageChange
};

document.addEventListener('DOMContentLoaded', initializeI18n);