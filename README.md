# Pokemon Revolution Map

Interaktywna mapa dla gry Pokemon Revolution Online, pokazująca wszystkie lokalizacje oraz bossy z możliwością tworzenia własnych tras.

![Pokemon Revolution Map](map.png)

## Opis

Ta aplikacja internetowa zapewnia szczegółową mapę świata Pokemon Revolution Online, umożliwiając graczom:
- Przeglądanie wszystkich regionów (Kanto, Johto, Hoenn, Sinnoh, itd.)
- Lokalizowanie bossów i śledzenie ich statusu (zabity/dostępny)
- Tworzenie i zapisywanie własnych tras
- Zarządzanie profilami z różnymi ustawieniami
- Wyszukiwanie konkretnych lokalizacji

## Funkcje

### Przeglądanie mapy
- Zoom in/out oraz przesuwanie mapy
- Automatyczne centrowanie na wybranych lokalizacjach
- Filtrowanie bossów według regionów

### System tras
- Tworzenie własnych tras między bossami
- Zapisywanie i ładowanie tras
- Eksport i import tras w formacie JSON

### System śledzenia bossów
- Oznaczanie bossów jako zabitych
- Automatyczne śledzenie cooldownu bossów
- Limity tygodniowe (20 zabić na tydzień)

### System profili
- Możliwość utworzenia wielu profili graczy
- Każdy profil zachowuje własne:
  - Trasy
  - Status bossów
  - Pozycję kamery
  - Tygodniowe limity zabić

### Wyszukiwanie
- Szybkie wyszukiwanie lokalizacji lub bossów
- Wyszukiwanie po nazwie lub regionie

## Instalacja

1. Sklonuj repozytorium:
   ```
   git clone https://github.com/twojaNazwaUżytkownika/pokemap.git
   ```

2. Otwórz folder projektu:
   ```
   cd pokemap
   ```

3. Użyj lokalnego serwera:
   ```
   python -m http.server 8000
   ```

4. Odwiedź stronę w przeglądarce pod adresem `http://localhost:8000`


## Pliki projektu

- `index.html` - Główna struktura strony
- `style.css` - Style CSS
- `script.js` - Główny skrypt obsługujący mapę
- `profile-manager.js` - System zarządzania profilami
- `i18n.js` - Internacjonalizacja (obsługa wielu języków)
- `locations.json` - Dane o lokalizacjach
- `bosses.json` - Dane o bossach
- `language.json` - Tłumaczenia interfejsu
- `map.png` - Obraz mapy świata


## Licencja

Ten projekt jest dostępny na licencji MIT. Zobacz plik `LICENSE` po więcej szczegółów.

## Kontakt

W przypadku pytań lub sugestii dotyczących projektu, skontaktuj się z nami przez GitHub Issues lub Discord.

---

**Uwaga:** Ta mapa jest nieoficjalnym narzędziem i nie jest powiązana z twórcami Pokemon Revolution Online.
