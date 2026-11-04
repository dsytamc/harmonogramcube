import { CATEGORIES, DAYS_OF_WEEK, FORMATS } from './constants.js';
import { ScheduleStore } from './store.js';
import { renderArtboard } from './artboardRenderer.js';
import { exportArtboardToPng, exportArtboardToPdf, exportArtboardToSvg } from './exporter.js';
import { fetchEfitnessSchedule, importFromHtmlString } from './efitnessImporter.js';

// Inicjalizacja stanu
const store = new ScheduleStore();
if (typeof window !== 'undefined') {
  window.store = store;
  window.renderArtboard = renderArtboard;
}

// Zmienne stanu UI
let selectedCoord = null; // { rowId, dayId }
let currentZoom = 0.75; // Skala artboardu

// Referencje do elementów DOM
const gymTitleInput = document.getElementById('gymTitleInput');
const headerEditorSection = document.getElementById('headerEditorSection');
const closeHeaderEditorBtn = document.getElementById('closeHeaderEditorBtn');
const formatSelect = document.getElementById('formatSelect');

// Ekran startowy / pusty obszar roboczy
const emptyWorkspaceState = document.getElementById('emptyWorkspaceState');
const emptyLoadFileInput = document.getElementById('emptyLoadFileInput');
const emptyImportBtn = document.getElementById('emptyImportBtn');
const emptyCreateBlankBtn = document.getElementById('emptyCreateBlankBtn');
const layoutAccordionBtn = document.getElementById('layoutAccordionBtn');
const layoutAccordionBody = document.getElementById('layoutAccordionBody');
const slimDaysCheck = document.getElementById('slimDaysCheck');
const slimHoursCheck = document.getElementById('slimHoursCheck');
const slimTilesCheck = document.getElementById('slimTilesCheck');
const daysToggleGrid = document.getElementById('daysToggleGrid');
const daysAllBtn = document.getElementById('daysAllBtn');
const daysMonFriBtn = document.getElementById('daysMonFriBtn');
const rowsList = document.getElementById('rowsList');
const sortRowsBtn = document.getElementById('sortRowsBtn');
const addHourRowBtn = document.getElementById('addHourRowBtn');
const addBreakRowBtn = document.getElementById('addBreakRowBtn');

// Import z eFitness
const efitnessUrlInput = document.getElementById('efitnessUrlInput');
const importEfitnessBtn = document.getElementById('importEfitnessBtn');
const importEfitnessStatus = document.getElementById('importEfitnessStatus');
const togglePasteHtmlBtn = document.getElementById('togglePasteHtmlBtn');
const pasteHtmlContainer = document.getElementById('pasteHtmlContainer');
const efitnessHtmlInput = document.getElementById('efitnessHtmlInput');
const importFromPastedHtmlBtn = document.getElementById('importFromPastedHtmlBtn');

// Edytor kafelka
const tileEditorSection = document.getElementById('tileEditorSection');
const selectedTileCoord = document.getElementById('selectedTileCoord');
const tileEditorEmptyMessage = document.getElementById('tileEditorEmptyMessage');
const tileEditorForm = document.getElementById('tileEditorForm');
const tileNameInput = document.getElementById('tileNameInput');
const tileCustomStartCheck = document.getElementById('tileCustomStartCheck');
const tileStartTimeGroup = document.getElementById('tileStartTimeGroup');
const tileStartTimeInput = document.getElementById('tileStartTimeInput');
const tileInstructorInput = document.getElementById('tileInstructorInput');
const categoriesPicker = document.getElementById('categoriesPicker');
const categoryCountHint = document.getElementById('categoryCountHint');
const diagonalSplitHint = document.getElementById('diagonalSplitHint');
const clearTileBtn = document.getElementById('clearTileBtn');
const deselectTileBtn = document.getElementById('deselectTileBtn');

const saveProjectBtn = document.getElementById('saveProjectBtn');
const loadProjectInput = document.getElementById('loadProjectInput');
const resetProjectBtn = document.getElementById('resetProjectBtn');
const exportPngBtn = document.getElementById('exportPngBtn');
const exportStatus = document.getElementById('exportStatus');

// Referencje do górnego paska narzędzi i stanu projektu
let currentDocName = '';
let hasLoadedSchedule = false;
let isEditingHeader = false;
let lastSavedAt = null;
let hasUnsavedChanges = false;
let beforeUnloadWarnCount = 0;

const topImportBtn = document.getElementById('topImportBtn');
const topSaveBtn = document.getElementById('topSaveBtn');
const topLoadProjectInput = document.getElementById('topLoadProjectInput');
const topExportBtn = document.getElementById('topExportBtn');
const docTabIndicator = document.getElementById('docTabIndicator');
const currentDocNameEl = document.getElementById('currentDocName');
const docDirtyStar = document.getElementById('docDirtyStar');

// Artboard i Toolbar
const toolbarFormatLabel = document.getElementById('toolbarFormatLabel');
const toolbarDpiLabel = document.getElementById('toolbarDpiLabel');
const artboardWrapper = document.getElementById('artboardWrapper');
const artboard = document.getElementById('artboard');
const artboardScrollArea = document.getElementById('artboardScrollArea');
const zoomBtns = document.querySelectorAll('.btn-zoom');

// Modale
const importModal = document.getElementById('importModal');
const saveModal = document.getElementById('saveModal');
const exportModal = document.getElementById('exportModal');

// Formularz w modalu Import
const modalEfitnessUrlInput = document.getElementById('modalEfitnessUrlInput');
const modalImportUrlBtn = document.getElementById('modalImportUrlBtn');
const modalEfitnessHtmlInput = document.getElementById('modalEfitnessHtmlInput');
const modalImportHtmlBtn = document.getElementById('modalImportHtmlBtn');
const modalImportStatus = document.getElementById('modalImportStatus');

// Formularz w modalu Zapis
const saveFileNameInput = document.getElementById('saveFileNameInput');
const modalSaveDirectBtn = document.getElementById('modalSaveDirectBtn');
const modalSaveAsBtn = document.getElementById('modalSaveAsBtn');

// Formularz w modalu Eksport
const selectAllFormatsBtn = document.getElementById('selectAllFormatsBtn');
const deselectAllFormatsBtn = document.getElementById('deselectAllFormatsBtn');
const modalRunExportBtn = document.getElementById('modalRunExportBtn');
const modalExportProgress = document.getElementById('modalExportProgress');
const modalExportProgressBar = document.getElementById('modalExportProgressBar');
const modalExportStatusText = document.getElementById('modalExportStatusText');

// Wyświetlanie pływających powiadomień Toast (zielona fajeczka sukcesu)
export function showToast(message, type = 'success', durationMs = 4000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const cleanMessage = String(message).replace(/^[✓✕•!ℹ️s]+/, '').trim();

  const toast = document.createElement('div');
  toast.className = `app-toast toast-${type}`;

  const icon = document.createElement('div');
  icon.className = 'toast-icon';
  if (type === 'success') {
    icon.innerHTML = '<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor"><path d="M8 1C4.1 1 1 4.1 1 8s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7zm3.3 5.4L6.9 10.8 4.7 8.6l.8-.8 1.4 1.4 3.6-3.6.8.8z"/></svg>';
  } else if (type === 'warning') {
    icon.innerHTML = '<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor"><path d="M8 1C4.1 1 1 4.1 1 8s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7zm-.6 3.5h1.2v5H7.4v-5zm.6 7.5c-.4 0-.8-.3-.8-.8s.3-.8.8-.8.8.3.8.8-.4.8-.8.8z"/></svg>';
  } else {
    icon.innerHTML = '<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor"><path d="M8 1C4.1 1 1 4.1 1 8s3.1 7 7 7 7-3.1 7-7-3.1-7-7-7zm3.2 9.5l-.7.7L8 8.7l-2.5 2.5-.7-.7L7.3 8 4.8 5.5l.7-.7L8 7.3l2.5-2.5.7.7L8.7 8l2.5 2.5z"/></svg>';
  }

  const msg = document.createElement('div');
  msg.className = 'toast-message';
  msg.textContent = cleanMessage;

  toast.appendChild(icon);
  toast.appendChild(msg);

  const dismiss = () => {
    toast.classList.add('is-hiding');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 200);
  };

  toast.addEventListener('click', dismiss);
  container.appendChild(toast);

  setTimeout(dismiss, durationMs);
}

// Otwieranie / zamykanie modali
export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('hidden');
}

export function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('hidden');
}

// Aktualizacja nazwy dokumentu
export function setDocumentName(newName) {
  if (!newName) {
    currentDocName = '';
    if (currentDocNameEl) {
      currentDocNameEl.textContent = 'brak wczytanego grafiku';
      currentDocNameEl.classList.add('is-empty-doc');
    }
    if (saveFileNameInput) saveFileNameInput.value = 'grafik_cube.json';
    return;
  }
  let cleanName = (newName || '').trim();
  if (!cleanName.toLowerCase().endsWith('.json')) {
    cleanName += '.json';
  }
  currentDocName = cleanName;
  if (currentDocNameEl) {
    currentDocNameEl.textContent = currentDocName;
    currentDocNameEl.classList.remove('is-empty-doc');
  }
  if (saveFileNameInput) saveFileNameInput.value = currentDocName;
}

function markAsSaved() {
  lastSavedAt = new Date();
  hasUnsavedChanges = false;
  beforeUnloadWarnCount = 0;
  if (docDirtyStar) docDirtyStar.classList.add('hidden');
}

function markAsDirty() {
  if (!hasLoadedSchedule) return;
  hasUnsavedChanges = true;
  beforeUnloadWarnCount = 0;
  if (docDirtyStar) docDirtyStar.classList.remove('hidden');
}

function showEmptyWorkspace() {
  hasLoadedSchedule = false;
  if (emptyWorkspaceState) emptyWorkspaceState.classList.remove('hidden');
  if (artboardWrapper) artboardWrapper.classList.add('hidden');
  setDocumentName(null);
  deselectTile();
  closeHeaderEditor();
}

function showScheduleWorkspace(filename = null) {
  hasLoadedSchedule = true;
  if (emptyWorkspaceState) emptyWorkspaceState.classList.add('hidden');
  if (artboardWrapper) artboardWrapper.classList.remove('hidden');
  if (filename) {
    setDocumentName(filename);
  }
  syncUIFromStore();
  updateArtboard(store.getState());
  applyZoom(currentZoom);
  markAsSaved();
}

function openHeaderEditor(currentTitle) {
  // Odznacz kafelek jeśli był aktywny (zasada: tylko 1 zaznaczenie na artboardzie)
  if (selectedCoord) {
    selectedCoord = null;
    if (selectedTileCoord) selectedTileCoord.textContent = 'Wybierz kafelek';
    if (tileEditorEmptyMessage) tileEditorEmptyMessage.classList.remove('hidden');
    if (tileEditorForm) tileEditorForm.classList.add('hidden');
  }

  isEditingHeader = true;
  if (headerEditorSection) {
    headerEditorSection.classList.remove('hidden');
  }
  if (gymTitleInput) {
    gymTitleInput.value = currentTitle || store.getState().gymTitle || '';
    gymTitleInput.focus();
    gymTitleInput.select();
  }
  updateArtboard(store.getState());
}

function closeHeaderEditor() {
  isEditingHeader = false;
  if (headerEditorSection) {
    headerEditorSection.classList.add('hidden');
  }
  updateArtboard(store.getState());
}

// Bezpieczne pobieranie pliku (JSON / tekst)
function downloadBlobFile(content, fileName, mimeType = 'application/json') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Stan edytowanego kafelka w pamięci podręcznej formularza
let activeTileDraft = {
  name: '',
  hasCustomStart: false,
  startTime: '',
  instructor: '',
  categories: []
};

// ============================================================================
// 1. INICJALIZACJA
// ============================================================================

function init() {
  buildCategoriesPicker();
  setupEventListeners();

  // Subskrypcja zmian w store
  store.subscribe((state) => {
    if (hasLoadedSchedule) {
      markAsDirty();
    }
    updateArtboard(state);
    renderRowsList(state.rows);
    if (slimDaysCheck) slimDaysCheck.checked = Boolean(state.slimDays);
    if (slimHoursCheck) slimHoursCheck.checked = Boolean(state.slimHours);
    if (slimTilesCheck) slimTilesCheck.checked = Boolean(state.slimTiles);
  });

  // Start w trybie pustego obszaru roboczego (wymóg użytkownika: brak domyślnego grafiku na start)
  showEmptyWorkspace();
}

// Tworzy pigułki kategorii w panelu edycji kafelka
function buildCategoriesPicker() {
  categoriesPicker.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const pill = document.createElement('div');
    pill.className = 'category-pill';
    pill.dataset.catId = cat.id;

    const dot = document.createElement('span');
    dot.className = 'cat-color-dot';
    dot.style.background = cat.colorDark;

    const label = document.createElement('span');
    label.textContent = cat.name;

    pill.appendChild(dot);
    pill.appendChild(label);

    pill.addEventListener('click', () => toggleCategory(cat.id));
    categoriesPicker.appendChild(pill);
  });
}

// ============================================================================
// 2. SYNCHRONIZACJA UI ZE STANEM
// ============================================================================

function refreshDaysToggleUI() {
  if (!daysToggleGrid) return;
  const activeDays = store.getActiveDays();
  daysToggleGrid.innerHTML = '';

  DAYS_OF_WEEK.forEach(day => {
    const isActive = activeDays.includes(day.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `day-toggle-btn ${isActive ? 'is-active' : ''}`;
    btn.textContent = day.short;
    btn.title = `${day.name} (${isActive ? 'Kliknij, aby ukryć' : 'Kliknij, aby włączyć'})`;

    btn.addEventListener('click', () => {
      const success = store.toggleDay(day.id);
      if (!success) {
        showToast('Grafik musi zawierać co najmniej jeden aktywny dzień.', 'warning');
      } else {
        const nextActive = store.getActiveDays();
        const actionWord = nextActive.includes(day.id) ? 'Włączono' : 'Wyłączono';
        showToast(`✓ ${actionWord} dzień: ${day.name}`);
        refreshDaysToggleUI();
      }
    });

    daysToggleGrid.appendChild(btn);
  });
}

function syncUIFromStore() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlFormat = urlParams.get('format');
  if (urlFormat && FORMATS[urlFormat]) {
    store.setFormat(urlFormat);
  }

  const state = store.getState();
  if (gymTitleInput) gymTitleInput.value = state.gymTitle || '';
  if (formatSelect) formatSelect.value = state.formatId;
  if (slimDaysCheck) slimDaysCheck.checked = Boolean(state.slimDays);
  if (slimHoursCheck) slimHoursCheck.checked = Boolean(state.slimHours);
  if (slimTilesCheck) slimTilesCheck.checked = Boolean(state.slimTiles);
  updateToolbarInfo(state.formatId);
  refreshDaysToggleUI();
}

function updateToolbarInfo(formatId) {
  const fmt = FORMATS[formatId];
  if (fmt) {
    if (toolbarFormatLabel) toolbarFormatLabel.textContent = fmt.label;
    if (toolbarDpiLabel) toolbarDpiLabel.textContent = `${fmt.dpi} DPI`;
    if (formatSelect && formatSelect.value !== formatId) {
      formatSelect.value = formatId;
    }
  }
}

function updateArtboard(state) {
  renderArtboard(artboard, state, selectedCoord, (rowId, dayId) => {
    selectTile(rowId, dayId);
  }, {
    isHeaderEditing: isEditingHeader,
    onHeaderClick: (title) => {
      openHeaderEditor(title);
    }
  });
}

// ============================================================================
// 3. OBSŁUGA EDYTORA KAFELKA
// ============================================================================

function deselectAll() {
  selectedCoord = null;
  isEditingHeader = false;

  if (selectedTileCoord) selectedTileCoord.textContent = 'Wybierz kafelek';
  if (tileEditorEmptyMessage) tileEditorEmptyMessage.classList.remove('hidden');
  if (tileEditorForm) tileEditorForm.classList.add('hidden');

  if (headerEditorSection) {
    headerEditorSection.classList.add('hidden');
  }

  updateArtboard(store.getState());
}

function selectTile(rowId, dayId) {
  // Zamknij edycję nagłówka jeśli była aktywna (zasada: tylko 1 zaznaczenie na artboardzie)
  if (isEditingHeader) {
    isEditingHeader = false;
    if (headerEditorSection) headerEditorSection.classList.add('hidden');
  }

  selectedCoord = { rowId, dayId };

  // Wyszukanie nazwy dnia i godziny
  const day = DAYS_OF_WEEK.find(d => d.id === dayId);
  const row = store.getState().rows.find(r => r.id === rowId);
  const dayName = day ? day.name : '';
  const rowTime = row ? (row.time || 'Wiersz') : '';

  selectedTileCoord.textContent = `${dayName} • ${rowTime}`;
  tileEditorEmptyMessage.classList.add('hidden');
  tileEditorForm.classList.remove('hidden');

  // Załadowanie danych kafelka do formularza
  const tile = store.getTile(rowId, dayId);
  activeTileDraft = {
    name: tile.name || '',
    hasCustomStart: Boolean(tile.hasCustomStart),
    startTime: tile.startTime || '',
    instructor: tile.instructor || '',
    categories: [...(tile.categories || [])]
  };

  tileNameInput.value = activeTileDraft.name;
  tileCustomStartCheck.checked = activeTileDraft.hasCustomStart;
  tileStartTimeInput.value = activeTileDraft.startTime;
  tileInstructorInput.value = activeTileDraft.instructor;

  toggleStartTimeField(activeTileDraft.hasCustomStart);
  refreshCategoryPillsUI();

  // Odświeżenie zaznaczenia na artboardzie
  updateArtboard(store.getState());
}

function deselectTile() {
  selectedCoord = null;
  selectedTileCoord.textContent = 'Wybierz kafelek';
  tileEditorEmptyMessage.classList.remove('hidden');
  tileEditorForm.classList.add('hidden');
  updateArtboard(store.getState());
}

function commitTileDraft() {
  if (!selectedCoord) return;
  store.updateTile(selectedCoord.rowId, selectedCoord.dayId, activeTileDraft);
}

function toggleCategory(catId) {
  if (!selectedCoord) return;

  const idx = activeTileDraft.categories.indexOf(catId);
  if (idx > -1) {
    activeTileDraft.categories.splice(idx, 1);
  } else {
    if (activeTileDraft.categories.length >= 2) {
      // Jeśli już wybrano 2, zastąp drugą lub zablokuj
      activeTileDraft.categories.shift(); // usuń pierwszą, dodaj nową
    }
    activeTileDraft.categories.push(catId);
  }

  refreshCategoryPillsUI();
  commitTileDraft();
}

function refreshCategoryPillsUI() {
  const count = activeTileDraft.categories.length;
  categoryCountHint.textContent = `${count}/2 wybrane`;

  if (count === 2) {
    diagonalSplitHint.classList.remove('hidden');
  } else {
    diagonalSplitHint.classList.add('hidden');
  }

  document.querySelectorAll('.category-pill').forEach(pill => {
    const catId = pill.dataset.catId;
    const isSel = activeTileDraft.categories.includes(catId);
    pill.classList.toggle('selected', isSel);

    const cat = CATEGORIES.find(c => c.id === catId);
    if (isSel && cat) {
      pill.style.background = cat.colorDark;
      pill.style.color = '#1A1A1A';
    } else {
      pill.style.background = '';
      pill.style.color = '';
    }
  });
}

function toggleStartTimeField(show) {
  if (show) {
    tileStartTimeGroup.classList.remove('hidden');
  } else {
    tileStartTimeGroup.classList.add('hidden');
  }
}

// ============================================================================
// 4. ZARZĄDZANIE WIERSZAMI (GODZINY & PRZERWY)
// ============================================================================

let lastRowsStructureKey = '';

function renderRowsList(rows, forceRebuild = false) {
  const structureKey = rows.map(r => `${r.id}_${r.type}`).join('|');

  if (!forceRebuild && structureKey === lastRowsStructureKey) {
    const rowItems = rowsList.querySelectorAll('.row-item');
    rows.forEach((row, index) => {
      const item = rowItems[index];
      if (!item) return;

      if (row.type === 'break') {
        const input = item.querySelector('.row-break-label');
        if (input && document.activeElement !== input && input.value !== (row.label || '')) {
          input.value = row.label || '';
        }
      } else {
        const timeInput = item.querySelector('.row-time-input');
        if (timeInput && document.activeElement !== timeInput && timeInput.value !== (row.time || '')) {
          timeInput.value = row.time || '';
        }
        const noteInput = item.querySelector('.row-hour-note');
        if (noteInput && document.activeElement !== noteInput && noteInput.value !== (row.note || '')) {
          noteInput.value = row.note || '';
        }
      }
    });
    return;
  }

  lastRowsStructureKey = structureKey;

  rowsList.innerHTML = '';
  rows.forEach((row, index) => {
    const item = document.createElement('div');
    item.className = `row-item ${row.type === 'break' ? 'is-break' : ''}`;

    if (row.type === 'break') {
      item.innerHTML = `
        <span class="row-item-type type-break" title="Belka rozdzielająca (przerwa)">B</span>
        <input type="text" class="row-note-input row-break-label" value="${escapeHtml(row.label || '')}" placeholder="Podpis belki (np. PRZERWA)">
        <div class="row-actions">
          <button type="button" class="btn-icon up" title="Przesuń w górę">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M8 5L2 11l1.4 1.4L8 7.8l4.6 4.6L14 11z"/></svg>
          </button>
          <button type="button" class="btn-icon down" title="Przesuń w dół">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M8 11L2 5l1.4-1.4L8 8.2l4.6-4.6L14 5z"/></svg>
          </button>
          <button type="button" class="btn-icon delete" title="Usuń belkę">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M6 6h1v6H6zm3 0h1v6H9z"/><path d="M2 3v1h1v10c0 .6.4 1 1 1h8c.6 0 1-.4 1-1V4h1V3H2zm2 11V4h8v10H4z"/><path d="M6 1h4v1H6z"/></svg>
          </button>
        </div>
      `;

      const input = item.querySelector('.row-note-input');
      input.addEventListener('input', (e) => {
        store.updateRow(row.id, { label: e.target.value });
      });

    } else {
      item.innerHTML = `
        <span class="row-item-type type-hour" title="Godzina">G</span>
        <input type="text" class="row-time-input" value="${escapeHtml(row.time || '')}" placeholder="9:00">
        <input type="text" class="row-note-input row-hour-note" value="${escapeHtml(row.note || '')}" placeholder="Dopisek">
        <div class="row-actions">
          <button type="button" class="btn-icon up" title="Przesuń w górę">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M8 5L2 11l1.4 1.4L8 7.8l4.6 4.6L14 11z"/></svg>
          </button>
          <button type="button" class="btn-icon down" title="Przesuń w dół">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M8 11L2 5l1.4-1.4L8 8.2l4.6-4.6L14 5z"/></svg>
          </button>
          <button type="button" class="btn-icon delete" title="Usuń wiersz">
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="M6 6h1v6H6zm3 0h1v6H9z"/><path d="M2 3v1h1v10c0 .6.4 1 1 1h8c.6 0 1-.4 1-1V4h1V3H2zm2 11V4h8v10H4z"/><path d="M6 1h4v1H6z"/></svg>
          </button>
        </div>
      `;

      const timeInput = item.querySelector('.row-time-input');
      timeInput.addEventListener('input', (e) => {
        store.updateRow(row.id, { time: e.target.value });
      });

      const noteInput = item.querySelector('.row-note-input');
      noteInput.addEventListener('input', (e) => {
        store.updateRow(row.id, { note: e.target.value });
      });
    }

    // Akcje wiersza
    item.querySelector('.up').addEventListener('click', () => {
      lastRowsStructureKey = '';
      store.moveRow(row.id, 'up');
    });
    item.querySelector('.down').addEventListener('click', () => {
      lastRowsStructureKey = '';
      store.moveRow(row.id, 'down');
    });
    item.querySelector('.delete').addEventListener('click', () => {
      if (confirm('Czy na pewno chcesz usunąć ten wiersz?')) {
        if (selectedCoord && selectedCoord.rowId === row.id) {
          deselectTile();
        }
        lastRowsStructureKey = '';
        store.removeRow(row.id);
      }
    });

    rowsList.appendChild(item);
  });
}

// ============================================================================
// 5. OBSŁUGA POWIĘKSZENIA (ZOOM)
// ============================================================================

function applyZoom(zoom) {
  currentZoom = zoom;

  if (zoom === 'fit') {
    const availableWidth = artboardScrollArea.clientWidth - 80;
    const availableHeight = artboardScrollArea.clientHeight - 80;
    const artboardWidth = artboard.offsetWidth || 1200;
    const artboardHeight = artboard.offsetHeight || 1200;

    const scaleX = availableWidth / artboardWidth;
    const scaleY = availableHeight / artboardHeight;
    const fitScale = Math.min(scaleX, scaleY, 1.0);

    artboardWrapper.style.transform = `scale(${fitScale})`;
  } else {
    const scaleVal = parseFloat(zoom);
    artboardWrapper.style.transform = `scale(${scaleVal})`;
  }

  // Aktywna klasa na przyciskach
  zoomBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.zoom === String(zoom));
  });
}

// ============================================================================
// 6. LISTENERY ZDARZEŃ
// ============================================================================

function setupEventListeners() {
  // Odznaczanie kafelka lub nagłówka przy kliknięciu w tło / poza kafelki na artboardzie
  if (artboardScrollArea) {
    artboardScrollArea.addEventListener('click', (e) => {
      // Jeśli kliknięto w kafelek z zajęciami lub w belkę nagłówka, nie odznaczamy (obsługują własne listenery)
      if (e.target.closest('.schedule-tile') || e.target.closest('.artboard-header-bar')) {
        return;
      }
      // Jeśli kliknięto w wolną przestrzeń artboardu (tło canvasu, puste marginesy, wiersz dni itp.), odznacz wszystko
      if (selectedCoord !== null || isEditingHeader) {
        deselectAll();
      }
    });
  }

  // Edycja nagłówka tabeli
  if (gymTitleInput) {
    gymTitleInput.addEventListener('input', (e) => {
      store.setGymTitle(e.target.value);
    });
    gymTitleInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        closeHeaderEditor();
      }
    });
  }

  if (closeHeaderEditorBtn) {
    closeHeaderEditorBtn.addEventListener('click', () => {
      closeHeaderEditor();
    });
  }

  // Obsługa przycisków pustego obszaru roboczego (start screen)
  if (emptyLoadFileInput) {
    emptyLoadFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const loaded = JSON.parse(event.target.result);
          store.loadState(loaded);
          showScheduleWorkspace(file.name);
          showToast(`✓ Wczytano projekt: ${file.name}`);
        } catch (err) {
          showToast(`✕ Błąd podczas odczytu pliku JSON: ${err.message}`, 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  if (emptyImportBtn) {
    emptyImportBtn.addEventListener('click', () => {
      openModal('importModal');
    });
  }

  if (emptyCreateBlankBtn) {
    emptyCreateBlankBtn.addEventListener('click', () => {
      store.resetToDefault();
      if (formatSelect) {
        store.setFormat(formatSelect.value);
      }
      showScheduleWorkspace('nowy_grafik.json');
      showToast('✓ Rozpoczęto pracę z nowym grafikiem');
    });
  }

  // Zmiana formatu
  formatSelect.addEventListener('change', (e) => {
    const formatId = e.target.value;
    store.setFormat(formatId);
    updateToolbarInfo(formatId);
    // Automatyczne dopasowanie widoku po zmianie formatu
    setTimeout(() => applyZoom(currentZoom), 50);
  });

  // Rozwijana sekcja: Układ & Wygląd
  if (layoutAccordionBtn && layoutAccordionBody) {
    layoutAccordionBtn.addEventListener('click', () => {
      const isExpanded = layoutAccordionBtn.getAttribute('aria-expanded') === 'true';
      layoutAccordionBtn.setAttribute('aria-expanded', String(!isExpanded));
      layoutAccordionBody.classList.toggle('is-collapsed', isExpanded);
    });
  }

  // Przełączniki wersji Slim
  if (slimDaysCheck) {
    slimDaysCheck.addEventListener('change', (e) => {
      store.setSlimOption('slimDays', e.target.checked);
      showToast(e.target.checked ? '✓ Włączono mniejsze dni tygodnia (skróty)' : 'Przywrócono pełne nazwy dni tygodnia');
    });
  }

  if (slimHoursCheck) {
    slimHoursCheck.addEventListener('change', (e) => {
      store.setSlimOption('slimHours', e.target.checked);
      showToast(e.target.checked ? '✓ Włączono mniejsze godziny (same cyfry)' : 'Przywrócono pełny format godzin');
    });
  }

  if (slimTilesCheck) {
    slimTilesCheck.addEventListener('change', (e) => {
      store.setSlimOption('slimTiles', e.target.checked);
      showToast(e.target.checked ? '✓ Włączono mniejsze kafelki (ukryto instruktorów)' : 'Przywrócono pełną widoczność kafelków');
    });
  }

  // Szybkie przełączanie dni: Wszystkie
  if (daysAllBtn) {
    daysAllBtn.addEventListener('click', () => {
      store.setActiveDays(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);
      refreshDaysToggleUI();
      showToast('✓ Włączono wszystkie 7 dni tygodnia');
    });
  }

  // Szybkie przełączanie dni: Pon - Pt
  if (daysMonFriBtn) {
    daysMonFriBtn.addEventListener('click', () => {
      store.setActiveDays(['mon', 'tue', 'wed', 'thu', 'fri']);
      refreshDaysToggleUI();
      showToast('✓ Włączono dni robocze (Poniedziałek – Piątek)');
    });
  }

  // Formularz kafelka: Nazwa
  tileNameInput.addEventListener('input', (e) => {
    activeTileDraft.name = e.target.value;
    commitTileDraft();
  });

  // Obsługa Enter / Shift+Enter dla natychmiastowego zapisania nowej linii w tytule
  tileNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      setTimeout(() => {
        activeTileDraft.name = tileNameInput.value;
        commitTileDraft();
      }, 0);
    }
  });

  // Formularz kafelka: Toggle niestandardowej godziny
  tileCustomStartCheck.addEventListener('change', (e) => {
    activeTileDraft.hasCustomStart = e.target.checked;
    toggleStartTimeField(e.target.checked);
    commitTileDraft();
  });

  // Formularz kafelka: Godzina startu
  tileStartTimeInput.addEventListener('input', (e) => {
    activeTileDraft.startTime = e.target.value;
    commitTileDraft();
  });

  // Formularz kafelka: Prowadzący
  tileInstructorInput.addEventListener('input', (e) => {
    activeTileDraft.instructor = e.target.value;
    commitTileDraft();
  });

  // Obsługa Enter / Shift+Enter dla natychmiastowego podziału linii w nazwisku
  tileInstructorInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      setTimeout(() => {
        activeTileDraft.instructor = tileInstructorInput.value;
        commitTileDraft();
      }, 0);
    }
  });

  // Wyczyść kafelek
  clearTileBtn.addEventListener('click', () => {
    if (!selectedCoord) return;
    store.clearTile(selectedCoord.rowId, selectedCoord.dayId);
    selectTile(selectedCoord.rowId, selectedCoord.dayId);
  });

  // Zamknij edycję kafelka
  deselectTileBtn.addEventListener('click', () => {
    deselectTile();
  });

  // Dodawanie wierszy
  addHourRowBtn.addEventListener('click', () => {
    lastRowsStructureKey = '';
    const newRow = store.addRow('hour', '12:00', '');
    // Przewiń listę wierszy na sam dół
    setTimeout(() => {
      rowsList.scrollTop = rowsList.scrollHeight;
    }, 50);
  });

  addBreakRowBtn.addEventListener('click', () => {
    lastRowsStructureKey = '';
    store.addRow('break', '', '');
    setTimeout(() => {
      rowsList.scrollTop = rowsList.scrollHeight;
    }, 50);
  });

  // Sortowanie wierszy chronologicznie
  sortRowsBtn.addEventListener('click', () => {
    lastRowsStructureKey = '';
    store.sortRowsChronologically();
  });

  // Przełączanie widoczności pola wklejania kodu HTML
  if (togglePasteHtmlBtn && pasteHtmlContainer) {
    togglePasteHtmlBtn.addEventListener('click', () => {
      const isHidden = pasteHtmlContainer.classList.toggle('hidden');
      togglePasteHtmlBtn.querySelector('span').textContent = isHidden 
        ? '📋 Wklej kod HTML ze strony' 
        : '🔼 Ukryj pole kodu HTML';
    });
  }

  // Import z wklejonego kodu HTML
  if (importFromPastedHtmlBtn) {
    importFromPastedHtmlBtn.addEventListener('click', () => {
      const rawHtml = efitnessHtmlInput ? efitnessHtmlInput.value.trim() : '';
      if (!rawHtml) {
        alert('Najpierw wklej kod HTML strony lub tabeli kalendarza.');
        return;
      }

      try {
        if (importEfitnessStatus) {
          importEfitnessStatus.textContent = 'Przetwarzanie wklejonego kodu HTML...';
        }
        const sourceUrl = efitnessUrlInput ? efitnessUrlInput.value.trim() : '';
        const importedState = importFromHtmlString(rawHtml, sourceUrl);
        importedState.formatId = store.getState().formatId;

        store.loadState(importedState);
        syncUIFromStore();
        deselectTile();

        if (importEfitnessStatus) {
          importEfitnessStatus.textContent = `✓ Zaimportowano pomyślnie z kodu HTML! (${importedState.rows.length} wierszy)`;
        }
        showToast(`✓ Zaimportowano grafik pomyślnie! (${importedState.rows.length} wierszy)`);
      } catch (err) {
        console.error('Błąd importu z HTML:', err);
        if (importEfitnessStatus) {
          importEfitnessStatus.textContent = `✕ ${err.message}`;
        }
        showToast(`✕ Błąd importu z HTML: ${err.message}`, 'error');
      }
    });
  }

  // Import ze strony eFitness przez URL (sidebar - opcjonalny)
  if (importEfitnessBtn) {
    importEfitnessBtn.addEventListener('click', async () => {
      const url = efitnessUrlInput ? efitnessUrlInput.value.trim() : '';
      if (!url) {
        alert('Podaj poprawny adres URL do kalendarza zajęć.');
        return;
      }

      importEfitnessBtn.disabled = true;
      importEfitnessBtn.style.opacity = '0.7';

      try {
        const importedState = await fetchEfitnessSchedule(url, (msg) => {
          if (importEfitnessStatus) importEfitnessStatus.textContent = msg;
        });

        importedState.formatId = store.getState().formatId;
        store.loadState(importedState);
        syncUIFromStore();
        deselectTile();

        if (importEfitnessStatus) {
          importEfitnessStatus.textContent = `✓ Zaimportowano pomyślnie! (${importedState.rows.length} wierszy)`;
        }
        showToast(`✓ Zaimportowano grafik pomyślnie! (${importedState.rows.length} wierszy)`);
      } catch (err) {
        console.error('Błąd importu eFitness:', err);
        if (importEfitnessStatus) {
          importEfitnessStatus.textContent = `✕ ${err.message}`;
        }
        if (pasteHtmlContainer && pasteHtmlContainer.classList.contains('hidden')) {
          pasteHtmlContainer.classList.remove('hidden');
          if (togglePasteHtmlBtn) {
            togglePasteHtmlBtn.querySelector('span').textContent = '🔼 Ukryj pole kodu HTML';
          }
        }
        showToast(`✕ Błąd importu ze strony: ${err.message}`, 'error');
      } finally {
        importEfitnessBtn.disabled = false;
        importEfitnessBtn.style.opacity = '1';
      }
    });
  }

  // Przyciski zoomu
  zoomBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      applyZoom(btn.dataset.zoom);
    });
  });

  // Reakcja na zmianę rozmiaru okna przy zoom='fit'
  window.addEventListener('resize', () => {
    if (currentZoom === 'fit') {
      applyZoom('fit');
    }
  });

  // ==========================================================================
  // ZARZĄDZANIE MODALAMI (ZAMYKANIE, PRZYCISKI X)
  // ==========================================================================
  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close-modal');
      closeModal(modalId);
    });
  });

  [importModal, saveModal, exportModal].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.add('hidden');
      }
    });
  });

  // ==========================================================================
  // GÓRNY PASEK NARZĘDZI: IMPORTUJ
  // ==========================================================================
  if (topImportBtn) {
    topImportBtn.addEventListener('click', () => {
      openModal('importModal');
    });
  }

  // Import przez URL w modalu
  if (modalImportUrlBtn) {
    modalImportUrlBtn.addEventListener('click', async () => {
      const url = modalEfitnessUrlInput ? modalEfitnessUrlInput.value.trim() : '';
      if (!url) {
        alert('Podaj poprawny adres URL do kalendarza zajęć.');
        return;
      }

      modalImportUrlBtn.disabled = true;
      if (modalImportStatus) modalImportStatus.textContent = 'Pobieranie danych z kalendarza eFitness...';

      try {
        const importedState = await fetchEfitnessSchedule(url, (msg) => {
          if (modalImportStatus) modalImportStatus.textContent = msg;
        });

        importedState.formatId = store.getState().formatId;
        store.loadState(importedState);
        let targetDocName = 'grafik_cube.json';
        if (importedState.gymTitle) {
          const safeSlug = importedState.gymTitle.toLowerCase().replace(/grafik\s*fitness\s*[-–—]?\s*/i, '').replace(/[^a-z0-9ąćęłńóśźż]+/gi, '_').replace(/^_+|_+$/g, '');
          if (safeSlug) targetDocName = `grafik_${safeSlug}.json`;
        }
        showScheduleWorkspace(targetDocName);
        closeModal('importModal');
        showToast(`✓ Zaimportowano grafik pomyślnie! (${importedState.rows.length} wierszy)`);
      } catch (err) {
        console.error('Błąd importu eFitness (modal):', err);
        if (modalImportStatus) modalImportStatus.textContent = `✕ ${err.message}`;
        showToast(`✕ Błąd importu: ${err.message}`, 'error');
      } finally {
        modalImportUrlBtn.disabled = false;
      }
    });
  }

  // Import przez HTML w modalu
  if (modalImportHtmlBtn) {
    modalImportHtmlBtn.addEventListener('click', () => {
      const rawHtml = modalEfitnessHtmlInput ? modalEfitnessHtmlInput.value.trim() : '';
      if (!rawHtml) {
        alert('Wklej kod źródłowy HTML strony lub tabeli.');
        return;
      }

      if (modalImportStatus) modalImportStatus.textContent = 'Przetwarzanie wklejonego kodu HTML...';

      try {
        const sourceUrl = modalEfitnessUrlInput ? modalEfitnessUrlInput.value.trim() : '';
        const importedState = importFromHtmlString(rawHtml, sourceUrl);
        importedState.formatId = store.getState().formatId;

        store.loadState(importedState);
        let targetDocName = 'grafik_cube.json';
        if (importedState.gymTitle) {
          const safeSlug = importedState.gymTitle.toLowerCase().replace(/grafik\s*fitness\s*[-–—]?\s*/i, '').replace(/[^a-z0-9ąćęłńóśźż]+/gi, '_').replace(/^_+|_+$/g, '');
          if (safeSlug) targetDocName = `grafik_${safeSlug}.json`;
        }
        showScheduleWorkspace(targetDocName);
        closeModal('importModal');
        showToast(`✓ Zaimportowano grafik pomyślnie! (${importedState.rows.length} wierszy)`);
      } catch (err) {
        console.error('Błąd importu z HTML (modal):', err);
        if (modalImportStatus) modalImportStatus.textContent = `✕ ${err.message}`;
        showToast(`✕ Błąd importu z HTML: ${err.message}`, 'error');
      }
    });
  }

  // ==========================================================================
  // GÓRNY PASEK NARZĘDZI: ZAPISZ I WCZYTAJ
  // ==========================================================================
  if (topSaveBtn) {
    topSaveBtn.addEventListener('click', () => {
      if (saveFileNameInput) saveFileNameInput.value = currentDocName;
      openModal('saveModal');
    });
  }

  // Zapis bezpośredni w modalu
  if (modalSaveDirectBtn) {
    modalSaveDirectBtn.addEventListener('click', () => {
      const targetName = saveFileNameInput ? saveFileNameInput.value : currentDocName;
      setDocumentName(targetName);
      downloadBlobFile(store.exportStateJson(), currentDocName);
      markAsSaved();
      closeModal('saveModal');
      showToast(`✓ Zapisano plik: ${currentDocName}`);
    });
  }

  // Zapisz jako... w modalu (File System Access API lub standardowe okno zapisu)
  if (modalSaveAsBtn) {
    modalSaveAsBtn.addEventListener('click', async () => {
      const targetName = saveFileNameInput ? saveFileNameInput.value : currentDocName;
      setDocumentName(targetName);

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: currentDocName,
            types: [{
              description: 'Plik projektu JSON (*.json)',
              accept: { 'application/json': ['.json'] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(store.exportStateJson());
          await writable.close();
          setDocumentName(handle.name);
          markAsSaved();
          closeModal('saveModal');
          showToast(`✓ Zapisano jako: ${currentDocName}`);
          return;
        } catch (err) {
          if (err.name === 'AbortError') return;
          console.warn('showSaveFilePicker anulowano lub brak dostępu:', err);
        }
      }

      // Fallback
      downloadBlobFile(store.exportStateJson(), currentDocName);
      markAsSaved();
      closeModal('saveModal');
      showToast(`✓ Zapisano jako: ${currentDocName}`);
    });
  }

  // Wczytywanie z górnego paska (Wczytaj)
  if (topLoadProjectInput) {
    topLoadProjectInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const loaded = JSON.parse(event.target.result);
          store.loadState(loaded);
          showScheduleWorkspace(file.name);
          showToast(`✓ Wczytano projekt: ${file.name}`);
        } catch (err) {
          showToast(`✕ Błąd podczas odczytu pliku JSON: ${err.message}`, 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  // Podwójne kliknięcie na nazwę dokumentu w belce pozwala na szybką zmianę nazwy
  if (docTabIndicator) {
    docTabIndicator.addEventListener('dblclick', () => {
      const newName = prompt('Podaj nazwę pliku projektu (.json):', currentDocName);
      if (newName) {
        setDocumentName(newName);
        showToast(`✓ Zmieniono nazwę na: ${currentDocName}`);
      }
    });
  }

  // Wczytywanie z panelu bocznego (kompatybilność wsteczna)
  if (loadProjectInput) {
    loadProjectInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const loaded = JSON.parse(event.target.result);
          store.loadState(loaded);
          showScheduleWorkspace(file.name);
          showToast(`✓ Wczytano projekt: ${file.name}`);
        } catch (err) {
          showToast(`✕ Błąd podczas odczytu pliku JSON: ${err.message}`, 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  // Pobieranie projektu JSON z sidebara
  if (saveProjectBtn) {
    saveProjectBtn.addEventListener('click', () => {
      downloadBlobFile(store.exportStateJson(), currentDocName);
      markAsSaved();
      showToast(`✓ Pobrano plik projektu: ${currentDocName}`);
    });
  }

  // Ochrona przed przypadkowym zamknięciem karty z niezapisanymi zmianami
  window.addEventListener('beforeunload', (e) => {
    if (hasLoadedSchedule && hasUnsavedChanges && beforeUnloadWarnCount === 0) {
      beforeUnloadWarnCount = 1;
      const lastDateStr = lastSavedAt 
        ? `${lastSavedAt.toLocaleDateString('pl-PL')} o ${lastSavedAt.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
        : 'brak zapisu w tej sesji';
      const msg = `Nie zapomnij zapisać projektu, ostatni zapis [${lastDateStr}]`;
      e.preventDefault();
      e.returnValue = msg;
      return msg;
    }
  });

  // Reset do szablonu wzorcowego
  if (resetProjectBtn) {
    resetProjectBtn.addEventListener('click', () => {
      if (confirm('Czy na pewno chcesz przywrócić domyślny wzorzec grafiku? Wszelkie niezapisane zmiany zostaną utracone.')) {
        store.resetToDefault();
        syncUIFromStore();
        deselectTile();
        showToast('✓ Przywrócono domyślny wzorzec grafiku');
      }
    });
  }

  // ==========================================================================
  // GÓRNY PASEK NARZĘDZI: EKSPORT DO PNG (OKNO WSADOWE)
  // ==========================================================================
  if (topExportBtn) {
    topExportBtn.addEventListener('click', () => {
      if (selectedCoord) {
        if (tileNameInput) activeTileDraft.name = tileNameInput.value;
        if (tileInstructorInput) activeTileDraft.instructor = tileInstructorInput.value;
        commitTileDraft();
      }
      openModal('exportModal');
    });
  }

  // Przycisk eksportu z sidebara również otwiera elegancki modal eksportu
  if (exportPngBtn) {
    exportPngBtn.addEventListener('click', () => {
      if (selectedCoord) {
        if (tileNameInput) activeTileDraft.name = tileNameInput.value;
        if (tileInstructorInput) activeTileDraft.instructor = tileInstructorInput.value;
        commitTileDraft();
      }
      openModal('exportModal');
    });
  }

  // Zaznacz wszystkie / odznacz wszystkie formaty
  if (selectAllFormatsBtn) {
    selectAllFormatsBtn.addEventListener('click', () => {
      document.querySelectorAll('input[name="exportFormatCheckbox"]').forEach(cb => cb.checked = true);
    });
  }
  if (deselectAllFormatsBtn) {
    deselectAllFormatsBtn.addEventListener('click', () => {
      document.querySelectorAll('input[name="exportFormatCheckbox"]').forEach(cb => cb.checked = false);
    });
  }

  // Uruchomienie eksportu zaznaczonych formatów
  if (modalRunExportBtn) {
    modalRunExportBtn.addEventListener('click', async () => {
      const checkedBoxes = Array.from(document.querySelectorAll('input[name="exportFormatCheckbox"]:checked'));
      if (checkedBoxes.length === 0) {
        alert('Wybierz co najmniej jeden format grafiku do eksportu.');
        return;
      }

      const selectedFormatIds = checkedBoxes.map(cb => cb.value);
      modalRunExportBtn.disabled = true;
      if (modalExportProgress) modalExportProgress.classList.remove('hidden');

      const origFormatId = store.getState().formatId;
      const baseName = currentDocName.replace(/\.json$/i, '') || 'grafik_cube';
      const dateStr = new Date().toISOString().slice(0, 10);

      const FORMAT_CONFIG = {
        post_square: { suffix: 'Kwadrat_1200x1200', type: 'png', targetFormat: 'post_square' },
        post_square_svg: { suffix: 'Kwadrat_1200x1200_wektor', type: 'svg', targetFormat: 'post_square' },
        post_portrait: { suffix: 'Pion_1080x1350', type: 'png', targetFormat: 'post_portrait' },
        post_portrait_svg: { suffix: 'Pion_1080x1350_wektor', type: 'svg', targetFormat: 'post_portrait' },
        a4_print: { suffix: 'Druk_A4_300dpi', type: 'pdf', targetFormat: 'a4_print' },
        a3_print: { suffix: 'Druk_A3_300dpi', type: 'pdf', targetFormat: 'a3_print' }
      };

      // Całkowite odznaczenie elementów przed eksportem, aby obrys i glow nie trafiły do plików
      deselectAll();

      try {
        for (let i = 0; i < selectedFormatIds.length; i++) {
          const itemKey = selectedFormatIds[i];
          const conf = FORMAT_CONFIG[itemKey] || { suffix: itemKey, type: 'png', targetFormat: itemKey };
          const ext = conf.type;
          const exportFilename = `${baseName}_${dateStr}_${conf.suffix}.${ext}`;

          const pct = Math.round(((i + 1) / selectedFormatIds.length) * 100);
          if (modalExportProgressBar) modalExportProgressBar.style.width = `${pct}%`;
          if (modalExportStatusText) {
            modalExportStatusText.textContent = `Generowanie (${i + 1}/${selectedFormatIds.length}): ${exportFilename}...`;
          }

          // Przełącz format
          store.setFormat(conf.targetFormat);
          // Odczekaj na wyrenderowanie DOM tabeli i zaaplikowanie stylów formatu
          await new Promise(resolve => setTimeout(resolve, 320));

          if (conf.type === 'pdf') {
            await exportArtboardToPdf(artboard, store.getState(), null, exportFilename);
          } else if (conf.type === 'svg') {
            await exportArtboardToSvg(artboard, store.getState(), null, exportFilename);
          } else {
            await exportArtboardToPng(artboard, store.getState(), null, exportFilename);
          }

          // Krótka pauza między kolejnymi pobraniami
          await new Promise(resolve => setTimeout(resolve, 380));
        }

        if (modalExportProgressBar) modalExportProgressBar.style.width = '100%';
        if (modalExportStatusText) modalExportStatusText.textContent = 'Wszystkie formaty wyeksportowane pomyślnie!';
        await new Promise(resolve => setTimeout(resolve, 250));

        closeModal('exportModal');
        showToast(`✓ Pomyślnie wyeksportowano ${selectedFormatIds.length} pliki grafiku (PNG / SVG / PDF)!`);
      } catch (err) {
        console.error('Błąd podczas wsadowego eksportu:', err);
        showToast(`✕ Błąd podczas eksportu: ${err.message}`, 'error');
      } finally {
        // Przywróć pierwotny format widoku artboardu
        store.setFormat(origFormatId);
        // Pozostaw odznaczone po zakończeniu eksportu
        modalRunExportBtn.disabled = false;
        if (modalExportProgress) modalExportProgress.classList.add('hidden');
        if (modalExportProgressBar) modalExportProgressBar.style.width = '0%';
      }
    });
  }
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[m]);
}

// Start aplikacji - obsługa natychmiastowa lub po DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
