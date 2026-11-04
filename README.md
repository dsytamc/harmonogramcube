# Generator Grafiku Fitness - Cube

Profesjonalny, przeglądarkowy generator grafików zajęć fitness zoptymalizowany pod kątem standardów identyfikacji wizualnej Cube Fitness.

## 🚀 Jak uruchomić?
Wystarczy dwukrotnie kliknąć plik **`start_app.bat`** lub otworzyć plik **`index.html`** w dowolnej nowoczesnej przeglądarce (Google Chrome, Microsoft Edge, Firefox, Brave).
Aplikacja działa w 100% lokalnie i offline – nie wymaga instalacji żadnych baz danych ani serwerów backendowych.

---

## 🎨 Formaty i Motywy

| Format | Rozdzielczość | Zastosowanie | Motyw |
| :--- | :--- | :--- | :--- |
| **Social Media - Kwadrat** | 1200 × 1200 px (72 DPI) | Instagram post, Facebook feed | Wersja Ciemna (Dark `#28282D`) |
| **Social Media - Pion** | 1080 × 1350 px (72 DPI) | Instagram Portrait (proporcje 4:5) | Wersja Ciemna (Dark `#28282D`) |
| **Druk A4 Poziomo** | 3508 × 2480 px (300 DPI) | Tablica ogłoszeń w klubie, recepcja | Wersja Jasna (Light `#FFFFFF`) |
| **Druk A3 Poziomo** | 4961 × 3508 px (300 DPI) | Duży plakat ekspozycyjny | Wersja Jasna (Light `#FFFFFF`) |

---

## 📋 Główne Funkcjonalności

1. **Własny nagłówek klubu & Import z eFitness:**
   * Możliwość wpisania dowolnego tytułu (np. `GRAFIK FITNESS - CUBE GARWOLIN`, `GRAFIK FITNESS - CHEŁM`).
   * **Automatyczny Import z eFitness:** wklej link do kalendarza zajęć (np. `https://cubefitness-garwolin.cms.efitness.com.pl/kalendarz-zajec`), a aplikacja pobierze grafik, dopasuje godziny, stworzy wiersze, wstawi przerwę i uzupełni kafelki z instruktorami oraz kolorami kategorii!
2. **Elastyczne wiersze godzin i belki podziału dnia:**
   * **Przycisk ⏱️ Sortuj:** automatycznie porządkuje godziny chronologicznie od najwcześniejszej do najpóźniejszej, umieszczając belkę przerwy w największej luce czasowej.
   * Dodawanie dowolnej liczby wierszy z godziną (np. `6:30`, `9:00`, `17:00`) z opcjonalnym dopiskiem (np. `SALA OPEN`).
   * **Belki podziału dnia (separatory):** estetyczny pas oddzielający blok poranny od popołudniowego.
   * **Stała wysokość kafelków:** każdy kafelek i godzina mają ściśle zdefiniowaną, stałą wysokość (brak rozpychania wierszy przez długi tekst).
3. **Prawdziwa typografia Termina:**
   * Wszystkie nagłówki, dni tygodnia i kafelki używają oryginalnego, szerokiego kroju Termina.
   * Kliknięcie w dowolny kafelek w tabeli otwiera natychmiastowy formularz po lewej stronie.
   * **Nazwa zajęć:** wersaliki, automatyczne skalowanie, obsługa wielu linii tekstu (`Enter`).
   * **Opcja niestandardowego startu:** zaznaczenie opcji *„Zajęcia zaczynają się o innej godzinie?”* pozwala wpisać np. `9:10` – na kafelku pojawi się wtedy `Start o 9:10`.
   * **Prowadzący:** imię i nazwisko instruktora z automatycznym łamaniem przy długich nazwiskach.
   * **Kategorie (do 2 kategorii):**
     * 1 kategoria = jednolite tło kafelka.
     * 2 kategorie = **ostry ukośny podział kafelka (diagonal split pod kątem 135°)**.
4. **Zapis i wczytywanie projektów:**
   * **Pobierz projekt (.json):** zapisuje stan prac do pliku roboczego (np. `Grafik_Fitness_Cube_Garwolin.json`).
   * **Wczytaj projekt (.json):** pozwala wznowić pracę w dowolnym momencie na dowolnym komputerze.
   * **Auto-save:** aplikacja automatycznie zapamiętuje bieżące zmiany w pamięci przeglądarki.
5. **Silnik eksportu do PNG:**
   * Przycisk **„Eksportuj do PNG”** generuje krystalicznie ostry plik w pełnej rozdzielczości (aż do 4961 × 3508 px w 300 DPI dla druku lub 1200 × 1200 px dla social media).
   * Kafelki na wyeksportowanym pliku są automatycznie oczyszczane z obwódek zaznaczenia.
