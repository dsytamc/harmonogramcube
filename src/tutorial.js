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

// Definicja kroków samouczka
const TUTORIAL_STEPS = [
  {
    id: 'step_load',
    targetSelector: '#emptyLoadBtn',
    view: 'start',
    padding: 8,
    title: 'Wczytywanie projektów',
    desc: 'W tym miejscu możesz wczytać wcześniej zapisany grafik – zarówno z pliku <code>.json</code> na Twoim komputerze, jak i z chmury powiązanej z bazą wszystkich klubów Cube.<br><br>Kliknij <strong>Dalej</strong>, aby przejść do kolejnego kroku.',
    actionType: 'next'
  },
  {
    id: 'step_blank',
    targetSelector: '#emptyCreateBlankBtn',
    view: 'start',
    padding: 10,
    title: 'Rozpoczęcie od pustego wzorca',
    desc: 'Aby stworzyć nowy harmonogram, kliknij podświetlony przycisk <strong>«lub rozpocznij z pustym wzorcem»</strong>.',
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
    title: 'Nagłówek i nazwa klubu',
    desc: 'Wpisz tutaj nazwę swojego klubu Cube. Zmiana nazwy natychmiast aktualizuje się w charakterystycznym firmowym nagłówku na artboardzie.<br><br>Kliknij <strong>Dalej</strong>, aby przejść do kolejnego kroku.',
    actionType: 'next'
  },
  {
    id: 'step_hours',
    targetSelector: '#rowsList',
    fallbackSelector: '#addHourRowBtn',
    view: 'artboard',
    padding: 10,
    title: 'Godziny i rodzaj sali',
    desc: 'W każdym wierszu możesz dostosować godzinę rozpoczęcia oraz dodać dopisek o sali lub miejscu (możesz łamać linie klawiszem Enter lub Shift+Enter).<br><br>Kliknij <strong>Dalej</strong>, aby przejść do kolejnego kroku.',
    actionType: 'next'
  },
  {
    id: 'step_break_bar',
    targetSelector: '#addBreakRowBtn',
    view: 'artboard',
    padding: 8,
    title: 'Belka podziału dnia',
    desc: 'Belka to linia oddzielająca większe bloki czasowe w grafiku (np. zajęcia poranne od popołudniowych lub dłuższe przerwy). Możesz ją płynnie przeciągać i upuszczać między godzinami.<br><br>Kliknij <strong>Dalej</strong>, aby przejść do kolejnego kroku.',
    actionType: 'next'
  },
  {
    id: 'step_tiles',
    targetSelector: '.schedule-grid-cell:not(.is-empty-placeholder)',
    fallbackSelector: '#artboardContent',
    view: 'artboard',
    padding: 6,
    title: 'Edycja kafelka z zajęciami',
    desc: 'Kliknij w dowolny kafelek na grafiku, aby edytować nazwę treningu, nazwisko instruktora oraz poziom trudności.<br><br>Kliknij <strong>Dalej</strong>, aby przejść do kolejnego kroku.',
    actionType: 'next'
  },
  {
    id: 'step_categories',
    targetSelector: '#categoryPaletteBar',
    fallbackSelector: '#categoryList',
    view: 'artboard',
    padding: 8,
    title: 'Kolory i kategorie zajęć',
    desc: 'Każdy rodzaj zajęć ma przypisany dedykowany kolor z palety Cube, co ułatwia klubowiczom szybką orientację w harmonogramie.<br><br>Kliknij <strong>Dalej</strong>, aby przejść do kolejnego kroku.',
    actionType: 'next'
  },
  {
    id: 'step_drag_drop',
    targetSelector: '#artboardContent',
    view: 'artboard',
    padding: 10,
    title: 'Przesuwanie i usuwanie kafelków',
    desc: 'Przytrzymaj kafelek przez pół sekundy, aby go unieść i przenieść w inne miejsce z płynną animacją. Aby usunąć kafelek, zaznacz go i naciśnij Delete lub ikonę kosza.<br><br>Kliknij <strong>Dalej</strong>, aby przejść do kolejnego kroku.',
    actionType: 'next'
  },
  {
    id: 'step_save',
    targetSelector: '#topSaveBtn',
    view: 'artboard',
    padding: 6,
    title: 'Zapis w chmurze i na dysku',
    desc: 'Przycisk «Zapisz» otwiera okno zapisu. Możesz pobrać plik projektu bezpośrednio na komputer lub zapisać go w chmurze przypisanej do konkretnego miasta Cube.<br><br>Kliknij <strong>Dalej</strong>, aby przejść do kolejnego kroku.',
    actionType: 'next'
  },
  {
    id: 'step_export',
    targetSelector: '#topExportBtn',
    view: 'artboard',
    padding: 6,
    title: 'Eksport gotowych plików',
    desc: 'Gdy grafik jest gotowy, kliknij «Eksportuj». Wygenerujesz perfekcyjne pliki na social media (Instagram pion i kwadrat) oraz wektorowy/rastrowy PDF 300 DPI gotowy do druku A4 lub A3.<br><br>Kliknij <strong>Zakończ samouczek</strong>, aby odebrać nagrodę!',
    actionType: 'finish'
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

// Aktualizacja pucharów w nagłówku i na ekranie startowym
export function updateTrophyBadges() {
  const completions = getTutorialCompletions();
  const badges = document.querySelectorAll('.tutorial-cup-badge');
  const floatingHelpBtn = document.getElementById('floatingHelpBtn');

  badges.forEach(badge => {
    if (completions <= 0) {
      badge.classList.add('hidden');
      badge.classList.remove('is-silver', 'is-gold');
      badge.innerHTML = '';
      return;
    }

    badge.classList.remove('hidden');
    if (completions === 1) {
      badge.classList.remove('is-gold');
      badge.classList.add('is-silver');
      badge.title = 'Osiągnięcie: Samouczek ukończony (Srebrny puchar)';
      badge.innerHTML = `
        <svg viewBox="0 0 24 24" class="trophy-cup-svg" width="22" height="22" fill="currentColor">
          <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
        </svg>
      `;
    } else {
      badge.classList.remove('is-silver');
      badge.classList.add('is-gold');
      badge.title = 'Osiągnięcie: Samouczek ukończony dwukrotnie (Złoty puchar)';
      badge.innerHTML = `
        <svg viewBox="0 0 24 24" class="trophy-cup-svg" width="22" height="22" fill="currentColor">
          <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0011 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 003.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z"/>
        </svg>
      `;
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

  if (currentTargetEl && currentTargetEl.contains(e.target)) {
    return; // Kliknięcie w aktywny podświetlony element jest dozwolone
  }

  // Kliknięcie w tło blokowane
  e.preventDefault();
  e.stopPropagation();
}

// Start samouczka
export function startTutorial(isReplay = false) {
  isTutorialRunning = true;
  isReplayMode = isReplay;
  currentStepIndex = 0;

  // Ukryj przycisk '?' podczas trwania tutorialu
  const floatingHelpBtn = document.getElementById('floatingHelpBtn');
  if (floatingHelpBtn) floatingHelpBtn.classList.add('hidden');

  // Pokaż overlay
  const overlay = document.getElementById('tutorialBackdropOverlay');
  if (overlay) overlay.classList.remove('hidden');

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

  // Jeśli krok wymaga widoku startowego (kroki 1 i 2)
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
    // Jeśli krok wymaga widoku artboardu (kroki 3-10)
    const emptyState = document.getElementById('emptyWorkspaceState');
    const artboardWrapper = document.getElementById('artboardWrapper');
    const appEl = document.getElementById('app');
    if (emptyState && artboardWrapper && !emptyState.classList.contains('hidden')) {
      // Jeśli jesteśmy jeszcze na ekranie powitalnym, uruchom pusty szablon
      const blankBtn = document.getElementById('emptyCreateBlankBtn');
      if (blankBtn) blankBtn.click();
      emptyState.classList.add('hidden');
      artboardWrapper.classList.remove('hidden');
      if (appEl) appEl.classList.remove('is-start-screen');
    }
  }

  // Wyczyść poprzednie podświetlenie
  clearHighlight();

  // Znajdź i podświetl element docelowy
  let targetEl = document.querySelector(step.targetSelector);
  if (!targetEl && step.fallbackSelector) {
    targetEl = document.querySelector(step.fallbackSelector);
  }

  currentTargetEl = targetEl;

  if (targetEl) {
    targetEl.classList.add('tutorial-highlight-pulsing');
    try {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (e) {}

    // Ustaw pozycję maski spotlight z odpowiednim marginesem (zero blura na elemencie!)
    setTimeout(() => {
      updateSpotlight(targetEl, step.padding || 8);
    }, 50);

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

  // Zaktualizuj zawartość okna samouczka
  const stepNumEl = document.getElementById('tutorialStepNum');
  const stepRemainingEl = document.getElementById('tutorialStepRemaining');
  const stepTitleEl = document.getElementById('tutorialStepTitle');
  const stepDescEl = document.getElementById('tutorialStepDesc');
  const nextBtn = document.getElementById('tutorialNextBtn');
  const prevBtn = document.getElementById('tutorialPrevBtn');

  const totalSteps = TUTORIAL_STEPS.length;
  const currentNum = index + 1;
  const remaining = totalSteps - currentNum;

  if (stepNumEl) stepNumEl.textContent = `Krok ${currentNum} z ${totalSteps}`;
  if (stepRemainingEl) stepRemainingEl.textContent = remaining > 0 ? `(pozostało: ${remaining})` : '(ostatni krok)';
  if (stepTitleEl) stepTitleEl.textContent = step.title;
  if (stepDescEl) stepDescEl.innerHTML = step.desc;

  // Przycisk "Wstecz" – aktywny od kroku 2 wzwyż
  if (prevBtn) {
    prevBtn.disabled = (index === 0);
  }

  // Przycisk "Dalej" / "Zakończ"
  if (nextBtn) {
    if (step.actionType === 'finish') {
      nextBtn.textContent = 'Zakończ samouczek';
      nextBtn.classList.add('btn-finish-trophy');
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
  isTutorialRunning = false;
  setTutorialSkipped();

  window.removeEventListener('click', handleTutorialClickBlock, true);

  const overlay = document.getElementById('tutorialBackdropOverlay');
  if (overlay) overlay.classList.add('hidden');

  const card = document.getElementById('tutorialFloatingCard');
  if (card) card.classList.add('hidden');

  updateTrophyBadges();
}

// Zakończenie tutorialu i przyznanie osiągnięcia
export function finishTutorial() {
  clearHighlight();
  isTutorialRunning = false;

  window.removeEventListener('click', handleTutorialClickBlock, true);

  const overlay = document.getElementById('tutorialBackdropOverlay');
  if (overlay) overlay.classList.add('hidden');

  const card = document.getElementById('tutorialFloatingCard');
  if (card) card.classList.add('hidden');

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
