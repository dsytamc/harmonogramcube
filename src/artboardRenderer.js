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
      breakRow.style.gap = `${spec.gap}px`;
      const breakBar = document.createElement('div');
      breakBar.className = 'break-bar';
      if (row.label) {
        breakBar.textContent = row.label;
      }
      breakRow.appendChild(breakBar);
      gridContainer.appendChild(breakRow);
    } else {
      const hourRow = document.createElement('div');
      hourRow.className = 'schedule-grid-row';
      hourRow.style.gridTemplateColumns = `${spec.hourColWidth}px repeat(${activeCount}, 1fr)`;
      hourRow.style.gap = `${spec.gap}px`;

      const hourCell = document.createElement('div');
      hourCell.className = `hour-header-cell${state.slimHours ? ' is-slim-hour' : ''}`;
      const displayTime = state.slimHours 
        ? (row.time || '').replace(/:00$/, '') 
        : (row.time || '');
      hourCell.innerHTML = `
        <span class="hour-text">${escapeHtml(displayTime)}</span>
        ${row.note ? `<span class="hour-note">${escapeHtml(row.note)}</span>` : ''}
      `;
      hourRow.appendChild(hourCell);

      activeDays.forEach(day => {
        const isSelected = selectedCoord && selectedCoord.rowId === row.id && selectedCoord.dayId === day.id;
        const tileData = state.tiles[`${row.id}_${day.id}`] || null;
        const tileEl = renderTileElement(tileData, row.id, day.id, theme, isSelected, {
          slimTiles: Boolean(state.slimTiles)
        });

        if (onTileClick) {
          tileEl.addEventListener('click', (e) => {
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
