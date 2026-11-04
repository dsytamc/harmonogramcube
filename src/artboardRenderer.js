// src/artboardRenderer.js - Precyzyjny renderer tabeli grafiku na artboardzie

import { DAYS_OF_WEEK, FORMATS, CATEGORIES } from './constants.js';
import { renderTileElement } from './tileFormatter.js';
import { LOGO_CUBE_HORIZONTAL, LOGO_CUBE_VERTICAL } from './logos.js';

export function renderArtboard(artboardContainer, state, selectedCoord = null, onTileClick = null, options = {}) {
  const format = FORMATS[state.formatId] || FORMATS.post_square;
  const isLight = format.theme === 'light';

  // Czyszczenie kontenera
  artboardContainer.innerHTML = '';
  artboardContainer.className = `artboard-canvas theme-${format.theme} format-${format.id}`;

  if (isLight) {
    // ==========================================
    // UKŁAD LIGHT (Druk A4 / A3)
    // ==========================================
    
    // Główny kontener poziomy (tabela po lewej, pionowa legenda po prawej)
    const printBody = document.createElement('div');
    printBody.className = 'artboard-print-body';

    const tableCol = document.createElement('div');
    tableCol.className = 'artboard-print-table-col';

    // Siatka tabeli wraz z belką nagłówka (skalowana proporcjonalnie i wyśrodkowana)
    const grid = createScheduleGrid(state, selectedCoord, onTileClick, format, options);
    tableCol.appendChild(grid);
    printBody.appendChild(tableCol);

    // 3. Prawa boczna kolumna (pionowa legenda + logo Cube)
    const sidebar = document.createElement('div');
    sidebar.className = 'artboard-print-sidebar';

    const legendWrapper = document.createElement('div');
    legendWrapper.className = 'print-legend-col';

    // Podział na 2 pionowe kolumny plakietek (zgodnie z plikiem A4.ai)
    // Kolumna 1: SPALAJĄCE, WZMACNIAJĄCE, PROZDROWOTNE
    // Kolumna 2: TANECZNE, MODELUJĄCE, ROZCIĄGAJĄCE, SZTUKI WALKI
    const col1 = document.createElement('div');
    col1.className = 'print-legend-strip';
    const col2 = document.createElement('div');
    col2.className = 'print-legend-strip';

    const firstGroup = CATEGORIES.slice(0, 3);
    const secondGroup = CATEGORIES.slice(3);

    firstGroup.forEach(cat => {
      col1.appendChild(createPrintBadge(cat, format.theme));
    });
    secondGroup.forEach(cat => {
      col2.appendChild(createPrintBadge(cat, format.theme));
    });

    legendWrapper.appendChild(col1);
    legendWrapper.appendChild(col2);
    sidebar.appendChild(legendWrapper);

    // Logo Cube na dole w pionie
    const logoBox = document.createElement('div');
    logoBox.className = 'print-sidebar-logo';
    logoBox.innerHTML = LOGO_CUBE_VERTICAL;
    sidebar.appendChild(logoBox);

    printBody.appendChild(sidebar);
    artboardContainer.appendChild(printBody);

  } else {
    // ==========================================
    // UKŁAD DARK (Social Media: Kwadrat & Pion)
    // ==========================================

    // 1. Logo Cube wyśrodkowane na górze
    const topLogo = document.createElement('div');
    topLogo.className = 'artboard-top-logo';
    topLogo.innerHTML = LOGO_CUBE_HORIZONTAL;
    artboardContainer.appendChild(topLogo);

    // 2. Tabela godzin i zajęć wraz z belką nagłówka (skalowana proporcjonalnie i wyśrodkowana)
    const grid = createScheduleGrid(state, selectedCoord, onTileClick, format, options);
    artboardContainer.appendChild(grid);

    // 3. Dolna legenda kategorii
    const bottomLegend = document.createElement('div');
    bottomLegend.className = 'artboard-bottom-legend';

    const titleBox = document.createElement('div');
    titleBox.className = 'legend-title-box';
    titleBox.innerHTML = `
      <div class="legend-title-top">Kategorie</div>
      <div class="legend-title-bottom">zajęć fitness</div>
    `;
    bottomLegend.appendChild(titleBox);

    const catGrid = document.createElement('div');
    catGrid.className = 'legend-categories-grid';

    // Rząd 1 (3 kategorie)
    const row1 = document.createElement('div');
    row1.className = 'legend-categories-row';
    CATEGORIES.slice(0, 3).forEach(cat => {
      row1.appendChild(createSocialLegendPill(cat, format.theme));
    });

    // Rząd 2 (4 kategorie)
    const row2 = document.createElement('div');
    row2.className = 'legend-categories-row';
    CATEGORIES.slice(3).forEach(cat => {
      row2.appendChild(createSocialLegendPill(cat, format.theme));
    });

    catGrid.appendChild(row1);
    catGrid.appendChild(row2);
    bottomLegend.appendChild(catGrid);

    artboardContainer.appendChild(bottomLegend);
  }

  // Uniwersalna weryfikacja bounding boxów i autokorekta przeskalowania dla wszystkich kafelków
  autoFitAllTiles(artboardContainer);
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(() => {
      autoFitAllTiles(artboardContainer);
    });
  }
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      autoFitAllTiles(artboardContainer);
    });
  }
}

/**
 * Uniwersalna reguła zapobiegania ucinaniu tekstu (clipping) i sprawdzania granic kafelka.
 * Sprawdza, czy zawartość tekstowa nie wychodzi poza obrys kafelka (zarówno pionowo, jak i poziomo)
 * z zachowaniem bezpiecznego marginesu wewnętrznego (min. 4-6px).
 */
export function autoFitAllTiles(container) {
  if (!container) return;
  const tiles = container.querySelectorAll('.schedule-tile.has-content');
  tiles.forEach(tileEl => {
    const contentEl = tileEl.querySelector('.tile-content');
    if (!contentEl) return;

    // Reset wcześniejszego skalowania inline
    contentEl.style.transform = '';
    contentEl.style.transformOrigin = 'center center';

    const tileH = tileEl.clientHeight || 70;
    const tileW = tileEl.clientWidth || 120;

    // Detekcja większych ilości tekstu (wielolinijkowe kafelki)
    const isDense = contentEl.classList.contains('is-dense-content') ||
                    contentEl.classList.contains('is-super-dense-content') ||
                    contentEl.classList.contains('is-extreme-dense') ||
                    Boolean(contentEl.querySelector('.is-three-lines, .is-four-lines'));

    // Przy większych ilościach tekstu margines między kontentem a krawędziami mniejszy o 30% (2px z każdej strony zamiast 3px)
    const marginDeduction = isDense ? 4 : 6;
    const safeH = tileH - marginDeduction;
    const safeW = tileW - marginDeduction;

    // Precyzyjny pomiar rzeczywistej wysokości dzieci (niezawodny przy flexbox center i wrap)
    let totalChildrenHeight = 0;
    let maxChildWidth = 0;
    Array.from(contentEl.children).forEach(child => {
      totalChildrenHeight += child.offsetHeight;
      maxChildWidth = Math.max(maxChildWidth, child.offsetWidth, child.scrollWidth);
    });
    if (contentEl.children.length > 1) {
      totalChildrenHeight += (contentEl.children.length - 1) * (isDense ? 1 : 1.5);
    }

    const actualContentH = Math.max(totalChildrenHeight, contentEl.scrollHeight);
    const actualContentW = Math.max(maxChildWidth, contentEl.scrollWidth);

    if (actualContentH > safeH || actualContentW > safeW) {
      const scaleH = safeH / actualContentH;
      const scaleW = safeW / actualContentW;
      const finalScale = Math.min(scaleH, scaleW, 1.0);
      if (finalScale < 0.99) {
        contentEl.style.transform = `scale(${finalScale.toFixed(3)})`;
      }
    }
  });
}

// Stałe wymiary bazowe dla każdego formatu (szerokość targetowa między marginesami i wysokość robocza)
const FORMAT_SPECS = {
  post_square: {
    targetWidth: 1136,     // 1200 - 32 - 32 (zachowany margines 32px z lewej i prawej)
    availableHeight: 920,  // Dostępna wysokość na całą tabelę wraz z belką nagłówka
    hourColWidth: 82,
    baseTileHeight: 70,
    headerBarHeight: 68,
    headerBarMargin: 14,
    headerRowHeight: 48,
    breakRowHeight: 18,
    gap: 6
  },
  post_portrait: {
    targetWidth: 1016,     // 1080 - 32 - 32
    availableHeight: 1060, // 1350 - 76 - 85 - 85 - 44
    hourColWidth: 82,
    baseTileHeight: 70,
    headerBarHeight: 68,
    headerBarMargin: 14,
    headerRowHeight: 48,
    breakRowHeight: 18,
    gap: 6
  },
  a4_print: {
    targetWidth: 1230,     // 1400 - 60 (marginesy) - 90 (legenda) - 20 (odstęp od legendy)
    availableHeight: 910,  // 990 - 40 - 40
    hourColWidth: 90,
    baseTileHeight: 78,
    headerBarHeight: 60,
    headerBarMargin: 14,
    headerRowHeight: 48,
    breakRowHeight: 18,
    gap: 6
  },
  a3_print: {
    targetWidth: 1410,     // 1600 - 70 (marginesy) - 100 (legenda) - 20 (odstęp od legendy)
    availableHeight: 1010, // 1131 - 70 - 51
    hourColWidth: 90,
    baseTileHeight: 91,
    headerBarHeight: 70,
    headerBarMargin: 16,
    headerRowHeight: 56,
    breakRowHeight: 18,
    gap: 6
  }
};

// Tworzy całą siatkę wierszy i kolumn, skaluje ją proporcjonalnie i wyśrodkowuje
function createScheduleGrid(state, selectedCoord, onTileClick, format, options = {}) {
  const theme = format.theme;
  const spec = FORMAT_SPECS[format.id] || FORMAT_SPECS.post_square;

  // Aktywne dni tygodnia (domyślnie wszystkie 7)
  const activeDayIds = (state.activeDays && Array.isArray(state.activeDays) && state.activeDays.length > 0)
    ? state.activeDays
    : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  const activeDays = DAYS_OF_WEEK.filter(d => activeDayIds.includes(d.id));
  const activeCount = activeDays.length > 0 ? activeDays.length : 7;

  // Standardowa szerokość 1 kolumny dnia przy pełnych 7 dniach
  const standardDayColWidth = (spec.targetWidth - spec.hourColWidth - 7 * spec.gap) / 7;

  // Unscaled bazowa szerokość dla activeCount dni
  const W_base = Math.round(spec.hourColWidth + activeCount * standardDayColWidth + activeCount * spec.gap);

  // Unscaled bazowa wysokość siatki (belka tytułowa siłowni + nagłówek dni + wiersze z przerwami i godzinami)
  let H_base = spec.headerBarHeight + spec.headerBarMargin + spec.headerRowHeight;
  state.rows.forEach(row => {
    H_base += spec.gap;
    if (row.type === 'break') {
      H_base += spec.breakRowHeight;
    } else {
      H_base += spec.baseTileHeight;
    }
  });

  // Skalowanie proporcjonalne:
  // Sw - skala, aby rozszerzyć do pełnej szerokości między marginesami
  // Sh - maksymalna skala, aby nie wyjść poza dostępną wysokość
  const Sw = spec.targetWidth / W_base;
  const Sh = spec.availableHeight / H_base;
  const scale = Number(Math.min(Sw, Sh).toFixed(4));

  const gridContainer = document.createElement('div');
  gridContainer.className = 'schedule-grid-container';
  gridContainer.style.width = `${W_base}px`;

  // 0. Belka nagłówka z nazwą siłowni – stanowiąca integralną część tabeli
  const isHeaderSelected = Boolean(options && options.isHeaderEditing);
  const headerBar = document.createElement('div');
  headerBar.className = `artboard-header-bar${isHeaderSelected ? ' is-selected' : ''}`;
  headerBar.textContent = state.gymTitle || 'GRAFIK FITNESS';
  headerBar.title = 'Kliknij, aby edytować nagłówek tabeli';
  if (options && options.onHeaderClick) {
    headerBar.addEventListener('click', (e) => {
      e.stopPropagation();
      options.onHeaderClick(state.gymTitle);
    });
  }
  if (isHeaderSelected) {
    const antsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    antsSvg.setAttribute('class', 'selection-ants-box');
    const antsRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    antsRect.setAttribute('class', 'selection-ants-rect');
    antsRect.setAttribute('x', '1.5');
    antsRect.setAttribute('y', '1.5');
    antsRect.setAttribute('width', 'calc(100% - 3px)');
    antsRect.setAttribute('height', 'calc(100% - 3px)');
    antsRect.setAttribute('rx', '10');
    antsRect.setAttribute('ry', '10');
    antsSvg.appendChild(antsRect);
    headerBar.appendChild(antsSvg);
  }
  gridContainer.appendChild(headerBar);

  // 1. Wiersz nagłówka z dniami tygodnia
  const headerRow = document.createElement('div');
  headerRow.className = 'schedule-grid-row header-row';
  headerRow.style.gridTemplateColumns = `${spec.hourColWidth}px repeat(${activeCount}, 1fr)`;
  headerRow.style.gap = `${spec.gap}px`;

  const cornerCell = document.createElement('div');
  cornerCell.className = 'day-header-corner';
  headerRow.appendChild(cornerCell);

const SHORT_DAY_NAMES = {
  mon: 'PON.',
  tue: 'WT.',
  wed: 'ŚR.',
  thu: 'CZW.',
  fri: 'PT.',
  sat: 'SOB.',
  sun: 'ND.'
};

  activeDays.forEach(day => {
    const dayCell = document.createElement('div');
    dayCell.className = `day-header-cell${state.slimDays ? ' is-slim-day' : ''}`;
    dayCell.textContent = state.slimDays ? (SHORT_DAY_NAMES[day.id] || day.name) : day.name;
    headerRow.appendChild(dayCell);
  });
  gridContainer.appendChild(headerRow);

    // 2. Wiersze godzin lub belki przerw
  state.rows.forEach(row => {
    if (row.type === 'break') {
      const breakRow = document.createElement('div');
      breakRow.className = 'schedule-grid-row break-row';
      breakRow.dataset.rowId = row.id;
      breakRow.style.gap = `${spec.gap}px`;

      const isJustDropped = Boolean(options && options.justDroppedRowId === row.id);
      if (isJustDropped) {
        breakRow.classList.add('just-dropped');
      }

      const breakBar = document.createElement('div');
      breakBar.className = 'break-bar';
      breakBar.title = 'Przytrzymaj 0.5s lewym przyciskiem myszy, aby przesunąć belkę';
      if (row.label) {
        breakBar.textContent = row.label;
      }
      breakRow.appendChild(breakBar);

      // ======================================================================
      // DRAG & DROP BELKI: 0.5s PRZYTRZYMANIA, ŻÓŁTE KÓŁKO PRZY KURSORZE, PODGLĄD MIĘDZY WIERSZAMI
      // ======================================================================
      let pressTimer = null;
      let startX = 0;
      let startY = 0;
      let currentX = 0;
      let currentY = 0;
      let isDragging = false;
      let floatingBadge = null;
      let currentTargetRow = null;
      let dropPosition = 'before';

      const cancelPress = () => {
        if (pressTimer) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      };

      const onPointerMove = (moveEvt) => {
        currentX = moveEvt.clientX;
        currentY = moveEvt.clientY;

        if (!isDragging) {
          return;
        }

        moveEvt.preventDefault();

        // Przesuwanie pływającej belki pod kursorem
        if (floatingBadge) {
          floatingBadge.style.left = moveEvt.clientX + 'px';
          floatingBadge.style.top = moveEvt.clientY + 'px';
        }

        // Wykrywanie wiersza pod kursorem (dowolny wiersz tabeli)
        const elementsUnderPoint = document.elementsFromPoint(moveEvt.clientX, moveEvt.clientY);
        const hoveredRow = elementsUnderPoint.find(el => {
          const rowEl = el.closest && el.closest('.schedule-grid-row');
          return rowEl && !rowEl.classList.contains('break-bar-drag-floating') && Boolean(rowEl.dataset.rowId);
        });

        const targetRowEl = hoveredRow ? hoveredRow.closest('.schedule-grid-row') : null;

        if (targetRowEl) {
          const rect = targetRowEl.getBoundingClientRect();
          dropPosition = moveEvt.clientY > (rect.top + rect.height / 2) ? 'after' : 'before';

          if (targetRowEl !== currentTargetRow) {
            if (currentTargetRow) {
              currentTargetRow.classList.remove('is-drag-over-top', 'is-drag-over-bottom');
            }
            currentTargetRow = targetRowEl;
          }

          if (dropPosition === 'after') {
            currentTargetRow.classList.add('is-drag-over-bottom');
            currentTargetRow.classList.remove('is-drag-over-top');
          } else {
            currentTargetRow.classList.add('is-drag-over-top');
            currentTargetRow.classList.remove('is-drag-over-bottom');
          }
        } else if (currentTargetRow) {
          currentTargetRow.classList.remove('is-drag-over-top', 'is-drag-over-bottom');
          currentTargetRow = null;
        }
      };

      const onPointerUp = (upEvt) => {
        cancelPress();
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);

        if (!isDragging) return;

        setTimeout(() => {
          isDragging = false;
        }, 60);

        breakRow.classList.remove('is-drag-origin');

        if (floatingBadge && floatingBadge.parentNode) {
          floatingBadge.parentNode.removeChild(floatingBadge);
          floatingBadge = null;
        }

        if (currentTargetRow) {
          currentTargetRow.classList.remove('is-drag-over-top', 'is-drag-over-bottom');
          const targetRowId = currentTargetRow.dataset.rowId;

          if (targetRowId && options && options.onRowDrop) {
            options.onRowDrop(row.id, targetRowId, dropPosition);
          }
          currentTargetRow = null;
        }
      };

      breakRow.addEventListener('pointerdown', (downEvt) => {
        if (downEvt.button !== 0) return;

        startX = downEvt.clientX;
        startY = downEvt.clientY;
        currentX = startX;
        currentY = startY;

        cancelPress();

        // Po 0.5s płynnego przytrzymania (bez drgań) belka odskakuje do kursora
        pressTimer = setTimeout(() => {
          pressTimer = null;
          isDragging = true;

          // Pierwotne miejsce staje się pustą szczeliną
          breakRow.classList.add('is-drag-origin');

          // Tworzenie pływającego klonu belki
          floatingBadge = breakRow.cloneNode(true);
          floatingBadge.classList.remove('is-drag-origin', 'just-dropped');
          floatingBadge.className = 'schedule-grid-row break-row break-bar-drag-floating';
          floatingBadge.style.width = breakRow.offsetWidth + 'px';
          floatingBadge.style.height = breakRow.offsetHeight + 'px';
          floatingBadge.style.left = currentX + 'px';
          floatingBadge.style.top = currentY + 'px';

          // Żółte kółko zaznaczające przyczepienie belki do kursora (bez glow na całej belce)
          const pinCircle = document.createElement('div');
          pinCircle.className = 'break-drag-pin-circle';
          floatingBadge.appendChild(pinCircle);

          document.body.appendChild(floatingBadge);
        }, 500); // 0.5s przytrzymania

        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerUp);
      });

      gridContainer.appendChild(breakRow);
    } else {
      const hourRow = document.createElement('div');
      hourRow.className = 'schedule-grid-row';
      hourRow.dataset.rowId = row.id;
      hourRow.style.gridTemplateColumns = `${spec.hourColWidth}px repeat(${activeCount}, 1fr)`;
      hourRow.style.gap = `${spec.gap}px`;

      const isHourSelected = Boolean(options && options.selectedRowId === row.id);
      const hourCell = document.createElement('div');
      hourCell.className = `hour-header-cell${state.slimHours ? ' is-slim-hour' : ''}${isHourSelected ? ' is-selected' : ''}`;
      hourCell.dataset.rowId = row.id;
      const displayTime = state.slimHours 
        ? (row.time || '').replace(/:00$/, '') 
        : (row.time || '');
      hourCell.innerHTML = `
        <span class="hour-text">${escapeHtml(displayTime)}</span>
        ${row.note ? `<span class="hour-note">${escapeHtml(row.note)}</span>` : ''}
      `;

      if (options && options.onHourClick) {
        hourCell.style.cursor = 'pointer';
        hourCell.title = 'Kliknij, aby edytować tę godzinę';
        hourCell.addEventListener('click', (e) => {
          e.stopPropagation();
          options.onHourClick(row.id, row);
        });
      }

      if (isHourSelected) {
        const antsSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        antsSvg.setAttribute('class', 'selection-ants-box');
        const antsRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        antsRect.setAttribute('class', 'selection-ants-rect');
        antsRect.setAttribute('x', '1.5');
        antsRect.setAttribute('y', '1.5');
        antsRect.setAttribute('width', 'calc(100% - 3px)');
        antsRect.setAttribute('height', 'calc(100% - 3px)');
        antsRect.setAttribute('rx', '8');
        antsRect.setAttribute('ry', '8');
        antsSvg.appendChild(antsRect);
        hourCell.appendChild(antsSvg);
      }

      hourRow.appendChild(hourCell);

      activeDays.forEach(day => {
        const isSelected = selectedCoord && selectedCoord.rowId === row.id && selectedCoord.dayId === day.id;
        const isJustDropped = Boolean(
          options && 
          options.justDroppedCoord && 
          options.justDroppedCoord.rowId === row.id && 
          options.justDroppedCoord.dayId === day.id
        );
        const tileData = state.tiles[`${row.id}_${day.id}`] || null;
        const tileEl = renderTileElement(tileData, row.id, day.id, theme, isSelected, {
          slimTiles: Boolean(state.slimTiles)
        });

        if (isJustDropped) {
          tileEl.classList.add('just-dropped');
        }

                // ======================================================================
        // DRAG & DROP: OBSŁUGA PRZYTRZYMANIA 0.5s, WIGGLE OD RAZU, TRZYMANIE ZA LEWY GÓRNY RÓG
        // ======================================================================
        let pressTimer = null;
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;
        let isDragging = false;
        let floatingBadge = null;
        let currentTargetTile = null;

        const hasContent = Boolean(tileData && (tileData.name || tileData.instructor || (tileData.categories && tileData.categories.length > 0)));

        const cancelPress = () => {
          if (pressTimer) {
            clearTimeout(pressTimer);
            pressTimer = null;
          }
          
        };

        const onPointerMove = (moveEvt) => {
          currentX = moveEvt.clientX;
          currentY = moveEvt.clientY;

          if (!isDragging) {
            return;
          }

          moveEvt.preventDefault();

          // Przesuwanie pływającej plakietki pod kursorem
          if (floatingBadge) {
            floatingBadge.style.left = moveEvt.clientX + 'px';
            floatingBadge.style.top = moveEvt.clientY + 'px';
          }

          // Wykrywanie komórki pod kursorem (ignorując pływający kafelek)
          const elementsUnderPoint = document.elementsFromPoint(moveEvt.clientX, moveEvt.clientY);
          const hoveredTile = elementsUnderPoint.find(el => el.classList && el.classList.contains('schedule-tile') && !el.classList.contains('tile-drag-floating'));

          if (hoveredTile && hoveredTile !== currentTargetTile) {
            if (currentTargetTile) {
              currentTargetTile.classList.remove('is-drag-over');
            }
            currentTargetTile = hoveredTile;
            currentTargetTile.classList.add('is-drag-over');
          } else if (!hoveredTile && currentTargetTile) {
            currentTargetTile.classList.remove('is-drag-over');
            currentTargetTile = null;
          }
        };

        const onPointerUp = (upEvt) => {
          cancelPress();
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);

          if (!isDragging) return;

          // Krótkie opóźnienie wyzerowania isDragging, aby zapobiec wywołaniu zwykłego kliknięcia
          setTimeout(() => {
            isDragging = false;
          }, 60);

          tileEl.classList.remove('is-drag-origin');

          if (floatingBadge && floatingBadge.parentNode) {
            floatingBadge.parentNode.removeChild(floatingBadge);
            floatingBadge = null;
          }

          if (currentTargetTile) {
            currentTargetTile.classList.remove('is-drag-over');
            const targetRowId = currentTargetTile.dataset.rowId;
            const targetDayId = currentTargetTile.dataset.dayId;

            if (targetRowId && targetDayId && (targetRowId !== row.id || targetDayId !== day.id)) {
              if (options && options.onTileDrop) {
                options.onTileDrop(row.id, day.id, targetRowId, targetDayId);
              }
            }
            currentTargetTile = null;
          }
        };

        // Rozpoczęcie przytrzymania dla kafelków z zajęciami (nie wymaga wcześniejszego zaznaczenia)
        if (hasContent) {
          tileEl.addEventListener('pointerdown', (downEvt) => {
            // Reaguj tylko na lewy przycisk myszy
            if (downEvt.button !== 0) return;

            startX = downEvt.clientX;
            startY = downEvt.clientY;
            currentX = startX;
            currentY = startY;

            cancelPress();

            // 1. Animacja wiggle zaczyna się OD RAZU po wciśnięciu lewego przycisku myszy
            

            // 2. Po 0.5s przytrzymania kafelek odskakuje i przyczepia się do kursora
            pressTimer = setTimeout(() => {
              pressTimer = null;
              
              isDragging = true;

              // Miejsce pierwotne staje się ciemną dziurą w tabeli
              tileEl.classList.add('is-drag-origin');

              // Tworzenie pływającego kafelka przyczepionego do kursora
              floatingBadge = tileEl.cloneNode(true);
              floatingBadge.classList.remove('is-drag-origin', 'is-selected');
              const existingAnts = floatingBadge.querySelector('.selection-ants-box');
              if (existingAnts) existingAnts.remove();

              floatingBadge.className = 'schedule-tile has-content tile-drag-floating';
              floatingBadge.style.width = tileEl.offsetWidth + 'px';
              floatingBadge.style.height = tileEl.offsetHeight + 'px';
              floatingBadge.style.left = currentX + 'px';
              floatingBadge.style.top = currentY + 'px';
              document.body.appendChild(floatingBadge);
            }, 500); // 0.5 sekundy przytrzymania

            window.addEventListener('pointermove', onPointerMove, { passive: false });
            window.addEventListener('pointerup', onPointerUp);
          });
        }

        // Zwykłe kliknięcie (jeśli nie było przeciągania)
        if (onTileClick) {
          tileEl.addEventListener('click', (e) => {
            if (isDragging) return;
            e.stopPropagation();
            onTileClick(row.id, day.id, tileData);
          });
        }

        hourRow.appendChild(tileEl);
      });

      gridContainer.appendChild(hourRow);
    }
  });

  // Tworzymy zewnętrzny viewport i skalowany kontener
  const viewport = document.createElement('div');
  viewport.className = 'schedule-scale-viewport';

  const scaledHeight = Math.round(H_base * scale);

  viewport.style.width = '100%';
  viewport.style.height = `${scaledHeight}px`;
  viewport.style.minHeight = `${scaledHeight}px`;
  viewport.style.display = 'flex';
  viewport.style.justifyContent = 'center';
  viewport.style.alignItems = 'center';
  viewport.style.marginTop = 'auto';
  viewport.style.marginBottom = '0';

  const scaleWrapper = document.createElement('div');
  scaleWrapper.className = 'schedule-scale-wrapper';
  scaleWrapper.style.width = `${W_base}px`;
  scaleWrapper.style.height = `${H_base}px`;
  scaleWrapper.style.transform = `scale(${scale})`;
  scaleWrapper.style.transformOrigin = 'center center';
  scaleWrapper.style.flexShrink = '0';

  scaleWrapper.appendChild(gridContainer);
  viewport.appendChild(scaleWrapper);

  return viewport;
}

// Pomocnik tworzenia pigułki w legendzie Social Media
function createSocialLegendPill(cat, theme) {
  const pill = document.createElement('div');
  pill.className = 'legend-cat-pill';
  pill.textContent = cat.name;
  pill.style.background = theme === 'dark' ? cat.colorDark : cat.colorLight;
  return pill;
}

// Pomocnik tworzenia plakietki w pionowej legendzie druku
function createPrintBadge(cat, theme) {
  const badge = document.createElement('div');
  badge.className = 'print-cat-badge';
  badge.style.background = theme === 'dark' ? cat.colorDark : cat.colorLight;

  const text = document.createElement('span');
  text.className = 'print-cat-text';
  text.textContent = cat.name;
  badge.appendChild(text);

  return badge;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}
