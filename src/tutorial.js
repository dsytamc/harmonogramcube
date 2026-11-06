// ==========================================================================
// SAMOUCZEK / TUTORIAL KROK PO KROKU (IBM CARBON DESIGN + GAMIFIKACJA)
// ==========================================================================

const STORAGE_COMPLETIONS_KEY = 'cube_tutorial_completions';
const STORAGE_SKIPPED_KEY = 'cube_tutorial_skipped';

let currentStepIndex = 0;
let isTutorialRunning = false;
let isReplayMode = false;
let confettiAnimId = null;
let currentTargetEl = null;

let artboardDemoTimer = null;
let artboardGhostEl = null;

// Pomocnik do wstawiania przykładowego kafelka na artboard w trakcie trwania samouczka
export function ensureTutorialSampleTile() {
  try {
    if (typeof window !== 'undefined' && window.store) {
      const store = window.store;
      const state = store.getState();
      const rows = state.rows || [];
      const hourRows = rows.filter(r => r.type === 'hour');
      const targetRow = hourRows.find(r => r.id === 'row_3') || hourRows[0];
      if (targetRow) {
        store.updateTile(targetRow.id, 'mon', {
          name: 'ZUMBA',
          hasCustomStart: true,
          startTime: '8:30',
          instructor: 'Ike',
          categories: ['taneczne']
        });
      }
    }
  } catch (e) {
    console.warn('Błąd podczas wstawiania przykładowego kafelka:', e);
  }
}

// Zatrzymanie i czyszczenie live animacji na artboardzie
export function stopArtboardDragDemo() {
  if (artboardDemoTimer) {
    clearTimeout(artboardDemoTimer);
    artboardDemoTimer = null;
  }
  if (artboardGhostEl) {
    artboardGhostEl.remove();
    artboardGhostEl = null;
  }
  const sourceTile = document.querySelector('.schedule-tile[data-row-id="row_3"][data-day-id="mon"]');
  const targetTile = document.querySelector('.schedule-tile[data-row-id="row_3"][data-day-id="wed"]');
  if (sourceTile) {
    sourceTile.classList.remove('is-drag-origin', 'is-wiggling');
  }
  if (targetTile) {
    targetTile.classList.remove('is-drag-over', 'just-dropped');
    if (targetTile.dataset.wasDemoEmpty === 'true') {
      targetTile.classList.add('is-empty');
      targetTile.classList.remove('has-content');
      targetTile.innerHTML = '';
      targetTile.style.background = '';
      delete targetTile.dataset.wasDemoEmpty;
    }
  }
}

// Uruchomienie płynnej live animacji przenoszenia kafelka bezpośrednio na artboardzie
export function startArtboardDragDemo() {
  stopArtboardDragDemo();

  function runCycle() {
    if (!isTutorialRunning || currentStepIndex !== 10) {
      stopArtboardDragDemo();
      return;
    }

    const sourceTile = document.querySelector('.schedule-tile[data-row-id="row_3"][data-day-id="mon"]') || document.querySelector('.schedule-tile.has-content');
    const targetTile = document.querySelector('.schedule-tile[data-row-id="row_3"][data-day-id="wed"]');

    if (!sourceTile || !targetTile) {
      artboardDemoTimer = setTimeout(runCycle, 800);
      return;
    }

    targetTile.dataset.wasDemoEmpty = targetTile.classList.contains('is-empty') ? 'true' : 'false';

    const sourceRect = sourceTile.getBoundingClientRect();

    const ghost = document.createElement('div');
    ghost.className = 'tutorial-artboard-live-ghost';
    ghost.style.left = `${sourceRect.left}px`;
    ghost.style.top = `${sourceRect.top}px`;
    ghost.style.width = `${sourceRect.width}px`;
    ghost.style.height = `${sourceRect.height}px`;

    ghost.innerHTML = `
      <div class="artboard-ghost-tile">
        ${sourceTile.innerHTML}
      </div>
      <div class="artboard-ghost-cursor">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="#ffffff" stroke="#111111" stroke-width="1.5">
          <path d="M4 3l13 10-6 1.5 3.5 6.5-2.5 1.5-3.5-6.5L4 19V3z"/>
        </svg>
        <div class="artboard-ghost-tooltip" id="artboardGhostTooltip">
          <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor">
            <path d="M8 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4zm-1 2.06c.3-.04.65-.06 1-.06s.7.02 1 .06V6H7V3.06z"/>
            <path d="M5 5a3 3 0 012.5-2.96V6H5V5z" fill="#f6be00"/>
          </svg>
          przytrzymaj kafelek aby go podnieść
        </div>
      </div>
    `;

    document.body.appendChild(ghost);
    artboardGhostEl = ghost;

    // 1. Wiggle po najechaniu
    artboardDemoTimer = setTimeout(() => {
      if (!isTutorialRunning || currentStepIndex !== 10) return stopArtboardDragDemo();
      sourceTile.classList.add('is-wiggling');

      // 2. Uniesienie i rozpoczęcie przeciągania
      artboardDemoTimer = setTimeout(() => {
        if (!isTutorialRunning || currentStepIndex !== 10) return stopArtboardDragDemo();
        sourceTile.classList.remove('is-wiggling');
        sourceTile.classList.add('is-drag-origin');

        ghost.classList.add('is-elevated');
        const tip = ghost.querySelector('#artboardGhostTooltip');
        if (tip) {
          tip.innerHTML = 'Przytrzymując kafelek przenieś go na poprawne miejsce';
        }

        // 3. Przelot na środę (targetTile o 2 pozycje w prawo)
        const curTargetRect = targetTile.getBoundingClientRect();
        ghost.style.transition = 'all 1.6s cubic-bezier(0.22, 1, 0.36, 1)';
        ghost.style.left = `${curTargetRect.left}px`;
        ghost.style.top = `${curTargetRect.top}px`;

        // Podświetlenie komórki docelowej w trakcie ruchu
        artboardDemoTimer = setTimeout(() => {
          if (!isTutorialRunning || currentStepIndex !== 10) return stopArtboardDragDemo();
          targetTile.classList.add('is-drag-over');
        }, 700);

        // 4. Lądowanie w komórce docelowej (drop bounce 150% do 100% + delikatny wiggle)
        artboardDemoTimer = setTimeout(() => {
          if (!isTutorialRunning || currentStepIndex !== 10) return stopArtboardDragDemo();
          targetTile.classList.remove('is-drag-over');
          targetTile.classList.remove('is-empty');
          targetTile.classList.add('has-content', 'just-dropped');
          targetTile.style.background = sourceTile.style.background;
          targetTile.innerHTML = sourceTile.innerHTML;

          if (ghost) {
            ghost.remove();
            artboardGhostEl = null;
          }

          // 5. 3 SEKUNDY PAUZY PRZED KOLEJNĄ PĘTLĄ!
          artboardDemoTimer = setTimeout(() => {
            if (!isTutorialRunning || currentStepIndex !== 10) return stopArtboardDragDemo();
            targetTile.classList.remove('just-dropped', 'has-content');
            targetTile.classList.add('is-empty');
            targetTile.innerHTML = '';
            targetTile.style.background = '';

            sourceTile.classList.remove('is-drag-origin');

            artboardDemoTimer = setTimeout(runCycle, 600);
          }, 3000); // dokładnie 3 sekundy przerwy
        }, 1600);
      }, 500); // 0.5s przytrzymania
    }, 600);
  }

  runCycle();
}

// Zwraca kod HTML animacji demonstracyjnej dla Kroku 8 (Edycja kafelka i formularz)
function getStep7DemoHtml() {
  return `
    <div class="demo-step7-container">
      <div class="demo-step7-grid-side">
        <div class="demo-step7-col-header">Poniedziałek</div>
        <div class="demo-step7-target-cell">
          <div class="demo-step7-empty-slot">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
              <path d="M8 2v5H3v2h5v5h2V9h5V7h-5V2z"/>
            </svg>
            <span>Kliknij</span>
          </div>
          <div class="demo-step7-filled-tile">
            <div class="demo-tile-name">ZUMBA</div>
            <div class="demo-tile-time">Start o 8:30</div>
            <div class="demo-tile-instr">Ike</div>
          </div>
        </div>
      </div>
      <div class="demo-step7-form-side">
        <div class="demo-step7-form-title">2. Edycja kafelka</div>
        <div class="demo-step7-row">
          <span class="demo-step7-label">Nazwa zajęć:</span>
          <div class="demo-step7-input demo-step7-input-name"></div>
        </div>
        <div class="demo-step7-toggle-row">
          <span class="demo-step7-label">Start o: <strong>8:30</strong></span>
          <span class="demo-step7-pill-cat">
            <svg viewBox="0 0 16 16" width="10" height="10" fill="currentColor">
              <path d="M13.5 4.5l-7 7L3 8l1.4-1.4L7 9.2l5.1-5.1z"/>
            </svg>
            TANECZNE
          </span>
        </div>
        <div class="demo-step7-row" style="margin-top: 2px;">
          <span class="demo-step7-label">Prowadzący: <strong>Ike</strong></span>
        </div>
      </div>
      <div class="demo-step7-cursor">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="#ffffff" stroke="#161616" stroke-width="1.5">
          <path d="M4 3l13 10-6 1.5 3.5 6.5-2.5 1.5-3.5-6.5L4 19V3z"/>
        </svg>
      </div>
    </div>
  `;
}

// Zwraca kod HTML animacji demonstracyjnej dla Kroku 10 (Drag & Drop z dymkami i 3s pauzy)
function getStep9DemoHtml() {
  return `
    <div class="demo-step9-container">
      <div class="demo-step9-grid">
        <div class="demo-step9-col">
          <div class="demo-step9-col-title">08:00</div>
          <div class="demo-step9-slot">
            <div class="demo-step9-tile-start">
              <div class="demo-tile-name">ZUMBA</div>
              <div class="demo-tile-time">Start o 8:30</div>
              <div class="demo-tile-instr">Ike</div>
            </div>
            <span class="demo-step9-slot-empty-cross">+</span>
          </div>
        </div>
        <div class="demo-step9-col">
          <div class="demo-step9-col-title">09:00</div>
          <div class="demo-step9-slot">
            <span class="demo-step9-slot-empty-cross">+</span>
          </div>
        </div>
        <div class="demo-step9-col">
          <div class="demo-step9-col-title">10:00</div>
          <div class="demo-step9-slot target-cell">
            <span class="demo-step9-slot-empty-cross">+</span>
            <div class="demo-step9-tile-landed">
              <div class="demo-tile-name">ZUMBA</div>
              <div class="demo-tile-time">Start o 8:30</div>
              <div class="demo-tile-instr">Ike</div>
            </div>
          </div>
        </div>
      </div>

      <div class="demo-step9-cursor-rig">
        <div class="demo-step9-flying-tile">
          <div class="demo-tile-name">ZUMBA</div>
          <div class="demo-tile-time">Start o 8:30</div>
          <div class="demo-tile-instr">Ike</div>
        </div>
        <div class="demo-step9-mouse-icon">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="#ffffff" stroke="#161616" stroke-width="1.5">
            <path d="M4 3l13 10-6 1.5 3.5 6.5-2.5 1.5-3.5-6.5L4 19V3z"/>
          </svg>
        </div>
        <div class="demo-step9-float-tooltip tip-hold">
          <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor">
            <path d="M8 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4zm-1 2.06c.3-.04.65-.06 1-.06s.7.02 1 .06V6H7V3.06z"/>
            <path d="M5 5a3 3 0 012.5-2.96V6H5V5z" fill="#f6be00"/>
          </svg>
          <span>przytrzymaj kafelek aby go podnieść</span>
        </div>
        <div class="demo-step9-float-tooltip tip-move">
          <span>Przytrzymując kafelek przenieś go na poprawne miejsce</span>
        </div>
      </div>
    </div>
  `;
}

// Definicja kroków samouczka (Krok 0: Wprowadzenie na środku z blurem, Kroki 1-13: Funkcjonalności)
const TUTORIAL_STEPS = [
  {
    id: 'step_intro',
    targetSelector: null,
    view: 'start',
    isCentered: true,
    title: 'Generator Grafiku Cube',
    desc: 'Narzędzie do tworzenia, edycji i publikacji grafików zajęć dla klubów Cube.<br><br><strong>Główne możliwości:</strong><br>• Układanie i przenoszenie zajęć (przeciągnij i upuść)<br>• Konfiguracja godzin, sal i belek przerw<br>• Import gotowego planu z systemu eFitness<br>• Zapis na dysku oraz w chmurze klubowej Cube<br>• Eksport na Social Media (PNG) oraz do druku (PDF 300 DPI)<br><br>Kliknij poniżej, aby poznać działanie programu.',
    actionType: 'next',
    nextBtnText: 'Rozpocznij samouczek'
  },
  {
    id: 'step_load',
    targetSelector: '#emptyLoadBtn',
    view: 'start',
    padding: 8,
    title: 'Krok 1: Wczytywanie projektów',
    desc: 'Wczytaj wcześniej przygotowany grafik:<br>• <strong>Z dysku:</strong> plik projektu <code>.json</code> z komputera<br>• <strong>Z chmury:</strong> baza zapisów klubów Cube<br><br>Kliknij <strong>Dalej</strong>, aby przejść do kolejnego kroku.',
    actionType: 'next'
  },
  {
    id: 'step_efitness',
    targetSelector: '#emptyImportBtn',
    view: 'start',
    padding: 8,
    title: 'Krok 2: Import z eFitness',
    desc: 'Pobiera grafik bezpośrednio ze strony klubu:<br>1. Wklej link do kalendarza eFitness danej siłowni.<br>2. Kliknij <em>Pobierz grafik ze strony</em>.<br><br><strong>Ważne:</strong> Po imporcie sprawdź na artboardzie przypisane zajęcia i kategorie — w razie potrzeby nanieś korekty.<br><br>Kliknij <strong>Dalej</strong>.',
    actionType: 'next'
  },
  {
    id: 'step_blank',
    targetSelector: '#emptyCreateBlankBtn',
    view: 'start',
    padding: 10,
    title: 'Krok 3: Pusty grafik',
    desc: 'Kliknij podświetlony przycisk <strong>«lub rozpocznij z pustym wzorcem»</strong>, aby otworzyć czysty arkusz roboczy.',
    actionType: 'target_or_next',
    onAdvance: () => {
      const btn = document.getElementById('emptyCreateBlankBtn');
      if (btn) btn.click();
    }
  },
  {
    id: 'step_header',
    targetSelector: '#gymTitleInput',
    fallbackSelector: '#headerEditorSection',
    view: 'artboard',
    padding: 8,
    title: 'Krok 4: Nazwa klubu w nagłówku',
    desc: 'Wpisz nazwę klubu (np. <em>Cube Fitness Lublin</em>). Zmiana automatycznie zaktualizuje żółty nagłówek na artboardzie.<br><br>Kliknij <strong>Dalej</strong>.',
    actionType: 'next'
  },
  {
    id: 'step_layout_appearance',
    targetSelector: '#layoutAppearanceSection',
    fallbackSelector: '#layoutAccordionBody',
    view: 'artboard',
    padding: 10,
    title: 'Krok 5: Układ dni i opcje Slim',
    desc: 'Dostosuj widok tabeli do swoich potrzeb:<br>• <strong>Dni w grafiku:</strong> włączaj i wyłączaj poszczególne dni (szybkie przyciski <em>«Wszystkie»</em> / <em>«Pon – Pt»</em>).<br>• <strong>Mniejsze dni:</strong> skrócone nazwy (<code>PON.</code>, <code>WT.</code>).<br>• <strong>Mniejsze godziny:</strong> węższa kolumna godzin (<code>17</code> zamiast <code>17:00</code>).<br>• <strong>Mniejsze kafelki:</strong> kompaktowy widok przy dużej liczbie zajęć.<br><br>Kliknij <strong>Dalej</strong>.',
    actionType: 'next',
    onEnter: () => {
      const body = document.getElementById('layoutAccordionBody');
      const btn = document.getElementById('layoutAccordionBtn');
      if (body && body.classList.contains('hidden')) {
        body.classList.remove('hidden');
        if (btn) btn.setAttribute('aria-expanded', 'true');
      }
    }
  },
  {
    id: 'step_display_mode',
    targetSelector: '#formatSelect',
    fallbackSelector: '.display-mode-wrap',
    view: 'artboard',
    padding: 8,
    title: 'Krok 6: Tryb wyświetlania (Podgląd)',
    desc: 'Przełącza podgląd na żywo w docelowym formacie:<br>• <strong>Social Media:</strong> Instagram Pion (1080×1350) lub Kwadrat (1200×1200)<br>• <strong>Druk:</strong> Arkusz A4 / A3 poziomo (jasne tło, 300 DPI)<br><br>Pozwala sprawdzić czytelność i układ grafiku przed eksportem.<br><br>Kliknij <strong>Dalej</strong>.',
    actionType: 'next'
  },
  {
    id: 'step_hours_breaks',
    targetSelector: '#rowsList',
    fallbackSelector: '#addHourRowBtn',
    view: 'artboard',
    padding: 10,
    title: 'Krok 7: Godziny i belki przerw',
    desc: 'Zarządzaj wierszami harmonogramu:<br>• <strong>Godzina:</strong> czas bloku i opcjonalny podpis sali (klawisz Enter tworzy nową linię).<br>• <strong>Belka podziału:</strong> linia oddzielająca bloki czasowe (np. przerwę południową). Możesz ją swobodnie przeciągać w górę i w dół.<br><br>Kliknij <strong>Dalej</strong>.',
    actionType: 'next'
  },
  {
    id: 'step_tiles',
    targetSelector: '.schedule-tile.has-content',
    fallbackSelector: '#tileEditorSection',
    view: 'artboard',
    padding: 8,
    title: 'Krok 8: Wprowadzanie zajęć',
    desc: 'Kliknij dowolny kafelek na tabeli, aby edytować go w lewym panelu:<br>• Nazwa zajęć<br>• Inna godzina startu (np. <code>8:30</code>)<br>• Prowadzący / instruktor<br><br>Zobacz animację poniżej:',
    demoType: 'tile_edit',
    actionType: 'next',
    onEnter: () => {
      ensureTutorialSampleTile();
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.store) {
          const rows = window.store.getState().rows || [];
          const hourRows = rows.filter(r => r.type === 'hour');
          const targetRow = hourRows.find(r => r.id === 'row_3') || hourRows[0];
          if (targetRow) {
            const tileEl = document.querySelector(`.schedule-tile[data-row-id="${targetRow.id}"][data-day-id="mon"]`);
            if (tileEl) tileEl.click();
          }
        }
      }, 100);
    }
  },
  {
    id: 'step_categories',
    targetSelector: '#categoriesPicker',
    fallbackSelector: '#categoryPaletteBar',
    view: 'artboard',
    padding: 8,
    title: 'Krok 9: Kategorie i kolory (max 2)',
    desc: 'Wybierz kategorię treningu z palety barw Cube.<br><br><strong>Zasada:</strong> Do jednych zajęć możesz wybrać <strong>maksymalnie 2 kategorie</strong> — kafelek otrzyma wtedy skośny podział na dwa kolory.<br><br>Kliknij <strong>Dalej</strong>.',
    actionType: 'next'
  },
  {
    id: 'step_drag_drop',
    targetSelector: '.schedule-tile.has-content',
    fallbackSelector: '#artboardWrapper',
    view: 'artboard',
    padding: 8,
    title: 'Krok 10: Przenoszenie zajęć (Drag & Drop)',
    desc: 'Aby przenieść zajęcia w inny dzień lub godzinę:<br>1. <strong>Przytrzymaj kafelek</strong> myszką przez 0.5 s, aż się uniesie.<br>2. <strong>Przeciągnij</strong> go na nowe pole i upuść.<br><br>Obserwuj demonstrację na artboardzie:',
    demoType: 'drag_drop',
    actionType: 'next',
    onEnter: () => {
      ensureTutorialSampleTile();
      setTimeout(() => {
        startArtboardDragDemo();
      }, 200);
    },
    onAdvance: () => {
      stopArtboardDragDemo();
    }
  },
  {
    id: 'step_save_choice',
    targetSelector: '#cloudModalDialog',
    fallbackSelector: '#cloudModal',
    view: 'artboard',
    padding: 12,
    title: 'Krok 11: Zapis grafiku',
    desc: 'Kliknięcie «Zapisz» otwiera okno wyboru:<br>• <strong>Na dysku:</strong> pobiera plik projektu <code>.json</code> na komputer.<br>• <strong>W chmurze:</strong> zapisuje grafik w bazie klubów Cube.<br><br>Kliknij <strong>Dalej</strong>, aby zobaczyć zapis w chmurze.',
    actionType: 'next',
    onEnter: () => {
      stopArtboardDragDemo();
      const exportModal = document.getElementById('exportModal');
      if (exportModal) exportModal.classList.add('hidden');
      if (typeof window !== 'undefined' && typeof window.openCloudModal === 'function') {
        window.openCloudModal('save');
      } else {
        const topSaveBtn = document.getElementById('topSaveBtn');
        if (topSaveBtn) topSaveBtn.click();
      }
    }
  },
  {
    id: 'step_cloud_save',
    targetSelector: '#cloudModalDialog',
    fallbackSelector: '#cloudSavesWrap',
    view: 'artboard',
    padding: 12,
    title: 'Krok 12: Zapis w chmurze Cube',
    desc: 'Workflow zapisu w chmurze:<br>1. <strong>Wybierz miasto / klub</strong> z listy lokalizacji.<br>2. <strong>Wpisz nazwę zapisu</strong> (np. <em>Grafik Marzec</em>) lub kliknij istniejący plik, aby go nadpisać.<br>3. <strong>Kliknij «Zapisz»</strong> na dole okna.<br><br>Kliknij <strong>Dalej</strong>, aby przejść do eksportu.',
    actionType: 'next',
    onEnter: () => {
      stopArtboardDragDemo();
      const exportModal = document.getElementById('exportModal');
      if (exportModal) exportModal.classList.add('hidden');

      const cloudModal = document.getElementById('cloudModal');
      if (!cloudModal || cloudModal.classList.contains('hidden')) {
        if (typeof window !== 'undefined' && typeof window.openCloudModal === 'function') {
          window.openCloudModal('save');
        }
      }

      setTimeout(() => {
        const cloudChoiceCloudBtn = document.getElementById('cloudChoiceCloudBtn');
        if (cloudChoiceCloudBtn) cloudChoiceCloudBtn.click();

        setTimeout(() => {
          const firstLocBtn = document.querySelector('.cloud-location-btn');
          if (firstLocBtn) firstLocBtn.click();
        }, 300);
      }, 100);
    }
  },
  {
    id: 'step_export',
    targetSelector: '#exportModal .modal-dialog',
    fallbackSelector: '#exportModal',
    view: 'artboard',
    padding: 12,
    title: 'Krok 13: Eksport gotowych plików',
    desc: 'Okno eksportu pozwala wygenerować pliki produkcyjne:<br>• <strong>Social Media:</strong> Instagram Pion (1080×1350) i Kwadrat (1200×1200)<br>• <strong>Wektorowy SVG:</strong> edytowalny plik do Adobe Illustrator<br>• <strong>Druk (PDF 300 DPI):</strong> gotowy arkusz A4 lub A3<br><br>Kliknij <strong>Zakończ samouczek</strong>, aby odebrać swój puchar!',
    actionType: 'finish',
    onEnter: () => {
      stopArtboardDragDemo();
      const cloudModal = document.getElementById('cloudModal');
      if (cloudModal) cloudModal.classList.add('hidden');

      if (typeof window !== 'undefined' && typeof window.openModal === 'function') {
        window.openModal('exportModal');
      } else {
        const topExportBtn = document.getElementById('topExportBtn');
        if (topExportBtn) topExportBtn.click();
      }
    },
    onAdvance: () => {
      const exportModal = document.getElementById('exportModal');
      if (exportModal) exportModal.classList.add('hidden');
    }
  }
];

// Pobierz liczbę ukończonych samouczków
export function getTutorialCompletions() {
  try {
    const val = localStorage.getItem(STORAGE_COMPLETIONS_KEY);
    return val ? parseInt(val, 10) || 0 : 0;
  } catch (e) {
    return 0;
  }
}

// Zapisz ukończenie samouczka
function setTutorialCompletions(count) {
  try {
    localStorage.setItem(STORAGE_COMPLETIONS_KEY, String(count));
    localStorage.removeItem(STORAGE_SKIPPED_KEY);
  } catch (e) {}
}

// Sprawdź czy użytkownik pominął tutorial
function isTutorialSkipped() {
  try {
    return localStorage.getItem(STORAGE_SKIPPED_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

function setTutorialSkipped() {
  try {
    localStorage.setItem(STORAGE_SKIPPED_KEY, 'true');
  } catch (e) {}
}

// Aktualizacja pucharów osiągnięć (kwadratowe kontenery z tooltipem)
export function updateTrophyBadges() {
  const completions = getTutorialCompletions();
  const squareBadges = document.querySelectorAll('.trophy-square-badge');
  const legacyBadges = document.querySelectorAll('.tutorial-cup-badge');
  const floatingHelpBtn = document.getElementById('floatingHelpBtn');

  const appEl = document.getElementById('app');
  const isStartScreen = appEl && appEl.classList.contains('is-start-screen');

  // Nie pokazuj osiągnięcia na ekranie startowym!
  if (isStartScreen || completions <= 0) {
    squareBadges.forEach(badge => {
      badge.classList.add('hidden');
      badge.classList.remove('is-silver', 'is-gold');
    });
    legacyBadges.forEach(badge => {
      badge.classList.add('hidden');
      badge.innerHTML = '';
    });
    if (floatingHelpBtn) {
      if (completions > 0 || isTutorialSkipped()) {
        floatingHelpBtn.classList.remove('hidden');
      } else {
        floatingHelpBtn.classList.add('hidden');
      }
    }
    return;
  }

  const cupSvgHtml = `
    <svg viewBox="0 0 24 24" class="trophy-cup-svg" width="22" height="22" fill="currentColor">
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
    </svg>
  `;

  // Obsługa nowych kwadratowych kontenerów
  squareBadges.forEach(badge => {
    // Nie pokazuj osiągnięć na ekranie startowym
    if (badge.closest('.empty-workspace-state') || badge.closest('.is-start-screen')) {
      badge.classList.add('hidden');
      return;
    }

    badge.classList.remove('hidden');
    const iconBox = badge.querySelector('.trophy-badge-icon-box');
    const badgeLabel = badge.querySelector('.trophy-tooltip-badge');
    const titleEl = badge.querySelector('.trophy-tooltip-title');
    const descEl = badge.querySelector('.trophy-tooltip-desc');

    if (iconBox) iconBox.innerHTML = cupSvgHtml;

    if (completions === 1) {
      badge.classList.remove('is-gold');
      badge.classList.add('is-silver');
      if (badgeLabel) badgeLabel.textContent = 'Srebrny Puchar';
      if (titleEl) titleEl.textContent = 'Adept Cube';
      if (descEl) descEl.textContent = 'Gratulacje! Samouczek ukończony po raz pierwszy. Znasz już wszystkie podstawowe narzędzia i skróty aplikacji.';
    } else {
      badge.classList.remove('is-silver');
      badge.classList.add('is-gold');
      if (badgeLabel) badgeLabel.textContent = 'Złoty Puchar';
      if (titleEl) titleEl.textContent = 'Mistrz Cube';
      if (descEl) descEl.textContent = 'Wybitne osiągnięcie! Samouczek ukończony dwukrotnie. Mistrzowskie opanowanie planowania, chmury Cube i zaawansowanego eksportu.';
    }
  });

  // Obsługa legacy badges
  legacyBadges.forEach(badge => {
    if (badge.closest('.empty-workspace-state') || badge.closest('.is-start-screen')) {
      badge.classList.add('hidden');
      badge.innerHTML = '';
      return;
    }
    badge.classList.remove('hidden');
    badge.innerHTML = cupSvgHtml;
    if (completions === 1) {
      badge.classList.remove('is-gold');
      badge.classList.add('is-silver');
    } else {
      badge.classList.remove('is-silver');
      badge.classList.add('is-gold');
    }
  });

  // Przycisk pytajnika '?' widoczny po ukończeniu lub pominięciu
  if (floatingHelpBtn) {
    if (completions > 0 || isTutorialSkipped()) {
      floatingHelpBtn.classList.remove('hidden');
    } else {
      floatingHelpBtn.classList.add('hidden');
    }
  }
}

// Aktualizacja pozycji maski wycinającej (Spotlight)
function updateSpotlight(el, padding = 8) {
  const spotlight = document.getElementById('tutorialSpotlightHelper');
  if (!spotlight) return;

  if (!el) {
    spotlight.classList.add('hidden');
    return;
  }

  const rect = el.getBoundingClientRect();
  const pad = padding;
  const top = Math.max(4, rect.top - pad);
  const left = Math.max(4, rect.left - pad);
  const width = Math.min(window.innerWidth - left - 4, rect.width + pad * 2);
  const height = Math.min(window.innerHeight - top - 4, rect.height + pad * 2);

  spotlight.style.top = `${top}px`;
  spotlight.style.left = `${left}px`;
  spotlight.style.width = `${width}px`;
  spotlight.style.height = `${height}px`;
  spotlight.classList.remove('hidden');
}

// Globalny handler blokowania kliknięć poza aktywnym elementem
function handleTutorialClickBlock(e) {
  if (!isTutorialRunning) return;

  const card = document.getElementById('tutorialFloatingCard');
  if (card && card.contains(e.target)) {
    return; // Kliknięcia w panelu nawigacji tutorialu są zawsze dozwolone
  }

  // Kliknięcie wewnątrz jakiegokolwiek otwartego modalu (importModal, cloudModal, exportModal, replayTutorialModal, tutorialAchievementModal)
  const openModal = e.target.closest('.modal-backdrop:not(.hidden)');
  if (openModal) {
    return; // Kliknięcia wewnątrz otwartego modalu są dozwolone!
  }

  if (currentTargetEl && currentTargetEl.contains(e.target)) {
    return; // Kliknięcie w aktywny podświetlony element jest dozwolone
  }

  // Kliknięcie w tło blokowane
  e.preventDefault();
  e.stopPropagation();
}

// Sprzątanie otwartych modali po zakończeniu lub przerwaniu samouczka
function cleanupTutorialModals() {
  document.body.classList.remove('tutorial-modal-step');
  stopArtboardDragDemo();
  const cloudModal = document.getElementById('cloudModal');
  if (cloudModal) cloudModal.classList.add('hidden');
  const exportModal = document.getElementById('exportModal');
  if (exportModal) exportModal.classList.add('hidden');
  const demoBox = document.getElementById('tutorialStepDemoBox');
  if (demoBox) {
    demoBox.innerHTML = '';
    demoBox.classList.add('hidden');
  }
}

// Start samouczka
export function startTutorial(isReplay = false) {
  isTutorialRunning = true;
  isReplayMode = isReplay;
  currentStepIndex = 0;

  // Ukryj przycisk '?' podczas trwania tutorialu
  const floatingHelpBtn = document.getElementById('floatingHelpBtn');
  if (floatingHelpBtn) floatingHelpBtn.classList.add('hidden');

  // Pokaż overlay z blurem dla kroku 0
  const overlay = document.getElementById('tutorialBackdropOverlay');
  if (overlay) {
    overlay.classList.add('with-blur');
    overlay.classList.remove('hidden');
  }

  // Pokaż kartę pływającą
  const card = document.getElementById('tutorialFloatingCard');
  if (card) card.classList.remove('hidden');

  // Dodaj nasłuchiwanie blokady kliknięć
  window.addEventListener('click', handleTutorialClickBlock, true);

  goToStep(0);
}

// Przejście do konkretnego kroku
export function goToStep(index) {
  if (index < 0 || index >= TUTORIAL_STEPS.length) {
    finishTutorial();
    return;
  }

  currentStepIndex = index;
  const step = TUTORIAL_STEPS[index];

  // Jeśli krok wymaga widoku startowego (kroki 0, 1, 2, 3)
  if (step.view === 'start') {
    const emptyState = document.getElementById('emptyWorkspaceState');
    const artboardWrapper = document.getElementById('artboardWrapper');
    const appEl = document.getElementById('app');
    if (emptyState && artboardWrapper) {
      emptyState.classList.remove('hidden');
      artboardWrapper.classList.add('hidden');
      if (appEl) appEl.classList.add('is-start-screen');
    }
  } else if (step.view === 'artboard') {
    // Jeśli krok wymaga widoku artboardu (kroki 4-13)
    const emptyState = document.getElementById('emptyWorkspaceState');
    const artboardWrapper = document.getElementById('artboardWrapper');
    const appEl = document.getElementById('app');
    if (emptyState && artboardWrapper && !emptyState.classList.contains('hidden')) {
      const blankBtn = document.getElementById('emptyCreateBlankBtn');
      if (blankBtn) blankBtn.click();
      emptyState.classList.add('hidden');
      artboardWrapper.classList.remove('hidden');
      if (appEl) appEl.classList.remove('is-start-screen');
    }
  }

  // Wyczyść poprzednie podświetlenie
  clearHighlight();

  // W kroku 0 dodaj elegancki blur dookoła okna; w kolejnych krokach zdejmij blur, by elementy były ostre
  const overlay = document.getElementById('tutorialBackdropOverlay');
  if (overlay) {
    if (index === 0) {
      overlay.classList.add('with-blur');
    } else {
      overlay.classList.remove('with-blur');
    }
  }

  // Jeśli wracamy przed krok 11 (zapis), upewnij się że modale zapisu i eksportu są zamknięte
  if (index < 11) {
    const cloudModal = document.getElementById('cloudModal');
    if (cloudModal) cloudModal.classList.add('hidden');
    const exportModal = document.getElementById('exportModal');
    if (exportModal) exportModal.classList.add('hidden');
  }

  // Obsługa stylów modali w tutorialu (krok 11, 12, 13)
  if (step.id === 'step_save_choice' || step.id === 'step_cloud_save' || step.id === 'step_export') {
    document.body.classList.add('tutorial-modal-step');
  } else {
    document.body.classList.remove('tutorial-modal-step');
  }

  // Obsługa live animacji na artboardzie
  if (step.id === 'step_drag_drop') {
    startArtboardDragDemo();
  } else {
    stopArtboardDragDemo();
  }

  // Sprawdź czy krok posiada akcję onEnter (np. wstawienie kafelka, otwarcie modalu)
  if (typeof step.onEnter === 'function') {
    try {
      step.onEnter();
    } catch (e) {
      console.warn('Błąd onEnter w samouczku:', e);
    }
  }

  // Sprawdź czy karta ma być wyśrodkowana (np. krok 0 powitalny)
  const card = document.getElementById('tutorialFloatingCard');
  if (card) {
    if (step.isCentered) {
      card.classList.add('is-centered');
    } else {
      card.classList.remove('is-centered');
    }
  }

  // Obsługa demonstracyjnych animacji wizualnych (krok 8 i krok 10)
  const demoBox = document.getElementById('tutorialStepDemoBox');
  if (demoBox) {
    if (step.demoType === 'tile_edit') {
      demoBox.innerHTML = getStep7DemoHtml();
      demoBox.classList.remove('hidden');
    } else if (step.demoType === 'drag_drop') {
      demoBox.innerHTML = getStep9DemoHtml();
      demoBox.classList.remove('hidden');
    } else {
      demoBox.innerHTML = '';
      demoBox.classList.add('hidden');
    }
  }

  // Znajdź i podświetl element docelowy (jeśli istnieje)
  setTimeout(() => {
    let targetEl = null;
    if (step.targetSelector) {
      targetEl = document.querySelector(step.targetSelector);
      if (!targetEl && step.fallbackSelector) {
        targetEl = document.querySelector(step.fallbackSelector);
      }
    }

    currentTargetEl = targetEl;

    if (targetEl) {
      targetEl.classList.add('tutorial-highlight-pulsing');
      try {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (e) {}

      setTimeout(() => {
        updateSpotlight(targetEl, step.padding || 8);
      }, 60);

      // Jeśli to krok kliknięcia w element (np. pusty szablon)
      if (step.id === 'step_blank') {
        const clickHandler = () => {
          targetEl.removeEventListener('click', clickHandler);
          setTimeout(() => {
            goToStep(currentStepIndex + 1);
          }, 150);
        };
        targetEl.addEventListener('click', clickHandler, { once: true });
      }
    } else {
      updateSpotlight(null);
    }
  }, 80);

  // Zaktualizuj zawartość okna samouczka
  const stepNumEl = document.getElementById('tutorialStepNum');
  const stepRemainingEl = document.getElementById('tutorialStepRemaining');
  const stepTitleEl = document.getElementById('tutorialStepTitle');
  const stepDescEl = document.getElementById('tutorialStepDesc');
  const nextBtn = document.getElementById('tutorialNextBtn');
  const prevBtn = document.getElementById('tutorialPrevBtn');

  const totalSteps = TUTORIAL_STEPS.length - 1; // 13 kroków merytorycznych

  if (index === 0) {
    if (stepNumEl) stepNumEl.textContent = 'Wprowadzenie';
    if (stepRemainingEl) stepRemainingEl.textContent = `(${totalSteps} kroków przewodnika)`;
  } else {
    const remaining = totalSteps - index;
    if (stepNumEl) stepNumEl.textContent = `Krok ${index} z ${totalSteps}`;
    if (stepRemainingEl) stepRemainingEl.textContent = remaining > 0 ? `(pozostało: ${remaining})` : '(ostatni krok)';
  }

  if (stepTitleEl) stepTitleEl.textContent = step.title;
  if (stepDescEl) stepDescEl.innerHTML = step.desc;

  // Przycisk "Wstecz" – nieaktywny na kroku 0
  if (prevBtn) {
    prevBtn.disabled = (index === 0);
  }

  // Przycisk "Dalej" / "Zakończ" / własny tekst
  if (nextBtn) {
    if (step.actionType === 'finish') {
      nextBtn.textContent = 'Zakończ samouczek';
      nextBtn.classList.add('btn-finish-trophy');
    } else if (step.nextBtnText) {
      nextBtn.textContent = step.nextBtnText;
      nextBtn.classList.remove('btn-finish-trophy');
    } else {
      nextBtn.textContent = 'Dalej';
      nextBtn.classList.remove('btn-finish-trophy');
    }
  }
}

// Czyszczenie podświetleń i maski
function clearHighlight() {
  document.querySelectorAll('.tutorial-highlight-pulsing').forEach(el => {
    el.classList.remove('tutorial-highlight-pulsing');
  });
  const spotlight = document.getElementById('tutorialSpotlightHelper');
  if (spotlight) spotlight.classList.add('hidden');
  currentTargetEl = null;
}

// Pomiń tutorial
export function skipTutorial() {
  clearHighlight();
  cleanupTutorialModals();
  isTutorialRunning = false;
  setTutorialSkipped();

  window.removeEventListener('click', handleTutorialClickBlock, true);

  const overlay = document.getElementById('tutorialBackdropOverlay');
  if (overlay) {
    overlay.classList.remove('with-blur');
    overlay.classList.add('hidden');
  }

  const card = document.getElementById('tutorialFloatingCard');
  if (card) {
    card.classList.add('hidden');
    card.classList.remove('is-centered');
  }

  updateTrophyBadges();
}

// Zakończenie tutorialu i przyznanie osiągnięcia
export function finishTutorial() {
  clearHighlight();
  cleanupTutorialModals();
  isTutorialRunning = false;

  window.removeEventListener('click', handleTutorialClickBlock, true);

  const overlay = document.getElementById('tutorialBackdropOverlay');
  if (overlay) {
    overlay.classList.remove('with-blur');
    overlay.classList.add('hidden');
  }

  const card = document.getElementById('tutorialFloatingCard');
  if (card) {
    card.classList.add('hidden');
    card.classList.remove('is-centered');
  }

  const prevCompletions = getTutorialCompletions();
  const newCompletions = prevCompletions + 1;
  setTutorialCompletions(newCompletions);

  updateTrophyBadges();

  // Pokaż pop-up z osiągnięciem i odpal konfetti
  showAchievementModal(newCompletions);
}

// Wyświetlenie pop-upa osiągnięcia (Srebrny lub Złoty Puchar)
function showAchievementModal(completionCount) {
  const modal = document.getElementById('tutorialAchievementModal');
  const cupIconWrap = document.getElementById('achievementCupIconWrap');
  const subTitleEl = document.getElementById('achievementSubtitle');

  if (!modal) return;

  const isSecondTimeOrMore = completionCount >= 2;

  if (cupIconWrap) {
    if (!isSecondTimeOrMore) {
      // 1. raz: Srebrny puchar świecący na biało
      cupIconWrap.className = 'achievement-cup-wrap is-silver-aura';
      cupIconWrap.innerHTML = `
        <svg viewBox="0 0 24 24" width="72" height="72" fill="currentColor" class="achievement-cup-svg cup-silver">
          <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
        </svg>
      `;
      if (subTitleEl) subTitleEl.textContent = 'Przejdź samouczek.';
    } else {
      // 2. raz: Złoty puchar świecący na złoto
      cupIconWrap.className = 'achievement-cup-wrap is-gold-aura';
      cupIconWrap.innerHTML = `
        <svg viewBox="0 0 24 24" width="72" height="72" fill="currentColor" class="achievement-cup-svg cup-gold">
          <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
        </svg>
      `;
      if (subTitleEl) subTitleEl.textContent = 'Przejdź samouczek drugi raz!';
    }
  }

  modal.classList.remove('hidden');

  // Wystrzel efektowne konfetti
  fireConfetti();
}

// Efekt konfetti na canvasie
function fireConfetti() {
  const canvas = document.getElementById('tutorialConfettiCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.classList.remove('hidden');

  const particles = [];
  const colors = ['#f6be00', '#ffd700', '#ffffff', '#00e5ff', '#ff3d71', '#00e676', '#a855f7'];

  for (let i = 0; i < 110; i++) {
    particles.push({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 200,
      y: window.innerHeight * 0.4 + (Math.random() - 0.5) * 100,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 12 - 4,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRotation: (Math.random() - 0.5) * 12,
      opacity: 1,
      gravity: 0.28
    });
  }

  let startTime = Date.now();

  function animate() {
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let activeCount = 0;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vRotation;

      if (elapsed > 2000) {
        p.opacity = Math.max(0, p.opacity - 0.02);
      }

      if (p.opacity > 0 && p.y < canvas.height + 20) {
        activeCount++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        ctx.restore();
      }
    });

    if (activeCount > 0 && elapsed < 4000) {
      confettiAnimId = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.classList.add('hidden');
    }
  }

  if (confettiAnimId) cancelAnimationFrame(confettiAnimId);
  confettiAnimId = requestAnimationFrame(animate);
}

// Inicjalizacja całego systemu samouczka
export function initTutorial() {
  updateTrophyBadges();

  // Przycisk "Dalej" w oknie samouczka
  const nextBtn = document.getElementById('tutorialNextBtn');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const step = TUTORIAL_STEPS[currentStepIndex];
      if (step && typeof step.onAdvance === 'function') {
        step.onAdvance();
      }
      if (currentStepIndex >= TUTORIAL_STEPS.length - 1) {
        finishTutorial();
      } else {
        goToStep(currentStepIndex + 1);
      }
    });
  }

  // Przycisk "Wstecz" w oknie samouczka
  const prevBtn = document.getElementById('tutorialPrevBtn');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentStepIndex > 0) {
        goToStep(currentStepIndex - 1);
      }
    });
  }

  // Przycisk "Pomiń cały tutorial"
  const skipBtn = document.getElementById('tutorialSkipBtn');
  if (skipBtn) {
    skipBtn.addEventListener('click', () => {
      skipTutorial();
    });
  }

  // Automatyczne dopasowanie pozycji spotlight przy zmianie rozmiaru okna lub przewijaniu
  window.addEventListener('resize', () => {
    if (isTutorialRunning && currentTargetEl) {
      const step = TUTORIAL_STEPS[currentStepIndex];
      updateSpotlight(currentTargetEl, (step && step.padding) || 8);
    }
  });

  window.addEventListener('scroll', () => {
    if (isTutorialRunning && currentTargetEl) {
      const step = TUTORIAL_STEPS[currentStepIndex];
      updateSpotlight(currentTargetEl, (step && step.padding) || 8);
    }
  }, true);

  // Zamknięcie modalu osiągnięcia ("Udało mi się!")
  const closeAchievementBtn = document.getElementById('closeAchievementBtn');
  if (closeAchievementBtn) {
    closeAchievementBtn.addEventListener('click', () => {
      const modal = document.getElementById('tutorialAchievementModal');
      if (modal) modal.classList.add('hidden');
      const canvas = document.getElementById('tutorialConfettiCanvas');
      if (canvas) canvas.classList.add('hidden');
    });
  }

  // Pływający przycisk pytajnika '?'
  const floatingHelpBtn = document.getElementById('floatingHelpBtn');
  const replayModal = document.getElementById('replayTutorialModal');
  const replayYesBtn = document.getElementById('replayYesBtn');
  const replayNoBtn = document.getElementById('replayNoBtn');

  if (floatingHelpBtn && replayModal) {
    floatingHelpBtn.addEventListener('click', () => {
      replayModal.classList.remove('hidden');
    });
  }

  if (replayNoBtn && replayModal) {
    replayNoBtn.addEventListener('click', () => {
      replayModal.classList.add('hidden');
    });
  }

  if (replayYesBtn && replayModal) {
    replayYesBtn.addEventListener('click', () => {
      replayModal.classList.add('hidden');
      startTutorial(true);
    });
  }

  // Automatyczny start dla nowych urządzeń (nigdy nie ukończony i nie pominięty)
  const completions = getTutorialCompletions();
  const skipped = isTutorialSkipped();

  if (completions === 0 && !skipped) {
    setTimeout(() => {
      startTutorial(false);
    }, 600);
  }
}
