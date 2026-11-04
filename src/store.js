// src/store.js - Zarządzanie stanem i logika tabeli grafiku fitness

import { DAYS_OF_WEEK, FORMATS } from './constants.js';

// Domyślny, czysty szablon startowy Cube Fitness
export function createDefaultState() {
  const rows = [
    { id: 'row_1', type: 'hour', time: '6:00', note: '' },
    { id: 'row_2', type: 'hour', time: '7:00', note: '' },
    { id: 'row_3', type: 'hour', time: '8:00', note: '' },
    { id: 'row_4', type: 'hour', time: '9:00', note: '' },
    { id: 'row_5', type: 'hour', time: '10:00', note: '' },
    { id: 'row_break_1', type: 'break', label: '' }, // Belka dzieląca dzień
    { id: 'row_6', type: 'hour', time: '17:00', note: '' },
    { id: 'row_7', type: 'hour', time: '18:00', note: '' },
    { id: 'row_8', type: 'hour', time: '19:00', note: '' }
  ];

  return {
    version: '1.0',
    gymTitle: 'Grafik fitness - Cube Fitness',
    formatId: 'post_portrait', // Domyślny format Instagram Pion (1080x1350)
    activeDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    slimDays: false,
    slimHours: false,
    slimTiles: false,
    rows,
    tiles: {} // Wszystkie kafelki czyste, niewypełnione
  };
}

export class ScheduleStore {
  constructor(initialState = null) {
    this.listeners = [];
    this.state = initialState || createDefaultState();
  }

  // Pobranie stanu
  getState() {
    return this.state;
  }

  // Subskrypcja zmian stanu
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.saveToLocalStorage();
    this.listeners.forEach(l => l(this.state));
  }

  // Zapis do localStorage
  saveToLocalStorage() {
    try {
      localStorage.setItem('cube_schedule_autosave', JSON.stringify(this.state));
    } catch (e) {
      console.warn('Nie udało się zapisać w localStorage:', e);
    }
  }

  // Odczyt z localStorage
  loadFromLocalStorage() {
    try {
      const data = localStorage.getItem('cube_schedule_autosave');
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('Błąd odczytu z localStorage:', e);
    }
    return null;
  }

  // Aktualizacja nagłówka
  setGymTitle(title) {
    this.state.gymTitle = title;
    this.notify();
  }

  // Zmiana formatu (A4, A3, Post Kwadrat, Post Pion)
  setFormat(formatId) {
    if (FORMATS[formatId]) {
      this.state.formatId = formatId;
      this.notify();
    }
  }

  // Zarządzanie widocznością dni tygodnia
  getActiveDays() {
    if (!this.state.activeDays || !Array.isArray(this.state.activeDays) || this.state.activeDays.length === 0) {
      this.state.activeDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    }
    return this.state.activeDays;
  }

  setActiveDays(dayIds) {
    if (!Array.isArray(dayIds) || dayIds.length === 0) return;
    const allOrder = DAYS_OF_WEEK.map(d => d.id);
    const valid = dayIds.filter(id => allOrder.includes(id));
    if (valid.length === 0) return;
    valid.sort((a, b) => allOrder.indexOf(a) - allOrder.indexOf(b));
    this.state.activeDays = valid;
    this.notify();
  }

  toggleDay(dayId) {
    const current = this.getActiveDays();
    if (current.includes(dayId)) {
      if (current.length <= 1) {
        // Nie wyłączaj jedynego aktywnego dnia
        return false;
      }
      this.state.activeDays = current.filter(id => id !== dayId);
    } else {
      const allOrder = DAYS_OF_WEEK.map(d => d.id);
      const next = [...current, dayId];
      next.sort((a, b) => allOrder.indexOf(a) - allOrder.indexOf(b));
      this.state.activeDays = next;
    }
    this.notify();
    return true;
  }

  // Dodanie wiersza (godziny lub belki podziału)
  addRow(type = 'hour', time = '12:00', note = '', targetIndex = -1) {
    const newId = 'row_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const newRow = type === 'break' 
      ? { id: newId, type: 'break', label: '' }
      : { id: newId, type: 'hour', time, note };

    if (targetIndex >= 0 && targetIndex <= this.state.rows.length) {
      this.state.rows.splice(targetIndex, 0, newRow);
    } else {
      this.state.rows.push(newRow);
    }
    this.notify();
    return newRow;
  }

  // Usunięcie wiersza
  removeRow(rowId) {
    this.state.rows = this.state.rows.filter(r => r.id !== rowId);
    // Usunięcie powiązanych kafelków
    DAYS_OF_WEEK.forEach(day => {
      delete this.state.tiles[`${rowId}_${day.id}`];
    });
    this.notify();
  }

  // Aktualizacja wiersza
  updateRow(rowId, fields) {
    const row = this.state.rows.find(r => r.id === rowId);
    if (row) {
      Object.assign(row, fields);
      this.notify();
    }
  }

  // Przesunięcie wiersza w górę / w dół
  moveRow(rowId, direction) {
    const index = this.state.rows.findIndex(r => r.id === rowId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= this.state.rows.length) return;

    const [moved] = this.state.rows.splice(index, 1);
    this.state.rows.splice(newIndex, 0, moved);
    this.notify();
  }

  // Przeniesienie wiersza (np. belki) na wybraną pozycję docelową (Drag & Drop)
  moveRowToTarget(sourceRowId, targetRowId, position = 'before') {
    if (sourceRowId === targetRowId) return;
    const sourceIdx = this.state.rows.findIndex(r => r.id === sourceRowId);
    if (sourceIdx < 0) return;

    const [moved] = this.state.rows.splice(sourceIdx, 1);
    const targetIdx = this.state.rows.findIndex(r => r.id === targetRowId);
    if (targetIdx < 0) {
      this.state.rows.push(moved);
      this.notify();
      return;
    }

    const insertIdx = position === 'after' ? targetIdx + 1 : targetIdx;
    this.state.rows.splice(insertIdx, 0, moved);
    this.notify();
  }


  // Sortowanie wierszy chronologicznie od najwcześniejszej do najpóźniejszej godziny
  sortRowsChronologically() {
    const parseMin = (str) => {
      if (!str) return 9999;
      const m = str.trim().match(/(\d{1,2})[:.](\d{2})/);
      return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : 9999;
    };

    // Oddzielenie wierszy godzinowych od belek przerw
    const hourRows = this.state.rows.filter(r => r.type === 'hour');
    const breakRows = this.state.rows.filter(r => r.type === 'break');

    if (hourRows.length <= 1) return;

    // Posortowanie godzin rosnąco
    hourRows.sort((a, b) => parseMin(a.time) - parseMin(b.time));

    // Jeśli istnieją belki przerw, umieść je w miejscu największej luki czasowej (np. > 2.5h)
    let sortedRows = [];
    if (breakRows.length > 0) {
      // Znajdź indeks z największą różnicą czasu
      let maxGap = 0;
      let gapIndex = Math.floor(hourRows.length / 2); // domyślnie w połowie

      for (let i = 0; i < hourRows.length - 1; i++) {
        const gap = parseMin(hourRows[i + 1].time) - parseMin(hourRows[i].time);
        if (gap > maxGap) {
          maxGap = gap;
          gapIndex = i + 1;
        }
      }

      // Wstawienie pierwszej części, belki, i drugiej części
      sortedRows = [
        ...hourRows.slice(0, gapIndex),
        ...breakRows,
        ...hourRows.slice(gapIndex)
      ];
    } else {
      sortedRows = hourRows;
    }

    this.state.rows = sortedRows;
    this.notify();
  }

  // Pobranie kafelka
  getTile(rowId, dayId) {
    const key = `${rowId}_${dayId}`;
    return this.state.tiles[key] || {
      name: '',
      hasCustomStart: false,
      startTime: '',
      instructor: '',
      categories: []
    };
  }

  // Aktualizacja kafelka
  updateTile(rowId, dayId, tileData) {
    const key = `${rowId}_${dayId}`;
    
    // Walidacja: maksymalnie 2 kategorie
    const safeCategories = (tileData.categories || []).slice(0, 2);

    // Jeśli kafelek jest całkowicie pusty, można go usunąć ze słownika
    if (!tileData.name && !tileData.instructor && safeCategories.length === 0 && !tileData.hasCustomStart) {
      delete this.state.tiles[key];
    } else {
      this.state.tiles[key] = {
        name: (tileData.name || '').trim(),
        hasCustomStart: Boolean(tileData.hasCustomStart),
        startTime: (tileData.startTime || '').trim(),
        instructor: (tileData.instructor || '').trim(),
        categories: safeCategories
      };
    }
    this.notify();
  }

  // Wyczyszczenie kafelka
  clearTile(rowId, dayId) {
    const key = `${rowId}_${dayId}`;
    delete this.state.tiles[key];
    this.notify();
  }

  // Przeniesienie lub zamiana kafelków miejscami (Drag & Drop)
  moveOrSwapTile(sourceRowId, sourceDayId, targetRowId, targetDayId) {
    if (sourceRowId === targetRowId && sourceDayId === targetDayId) return;

    const sourceKey = `${sourceRowId}_${sourceDayId}`;
    const targetKey = `${targetRowId}_${targetDayId}`;

    const sourceTile = this.state.tiles[sourceKey];
    const targetTile = this.state.tiles[targetKey];

    if (!sourceTile) return;

    // Klonujemy dane źródłowe
    const clonedSource = JSON.parse(JSON.stringify(sourceTile));

    if (targetTile) {
      // Zamiana miejscami (Swap)
      const clonedTarget = JSON.parse(JSON.stringify(targetTile));
      this.state.tiles[targetKey] = clonedSource;
      this.state.tiles[sourceKey] = clonedTarget;
    } else {
      // Przeniesienie na puste miejsce
      this.state.tiles[targetKey] = clonedSource;
      delete this.state.tiles[sourceKey];
    }

    this.notify();
  }

  // Kopiowanie kafelka
  duplicateTile(srcRowId, srcDayId, destRowId, destDayId) {
    const src = this.getTile(srcRowId, srcDayId);
    this.updateTile(destRowId, destDayId, { ...src });
  }

  // Ustawienie opcji slim (układu i wyglądu)
  setSlimOption(key, value) {
    if (['slimDays', 'slimHours', 'slimTiles'].includes(key)) {
      this.state[key] = Boolean(value);
      this.notify();
    }
  }

  // Zastąpienie całego stanu (np. z pliku JSON)
  loadState(newState) {
    if (newState && newState.rows && newState.tiles) {
      if (!newState.activeDays || !Array.isArray(newState.activeDays) || newState.activeDays.length === 0) {
        newState.activeDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      }
      newState.slimDays = Boolean(newState.slimDays);
      newState.slimHours = Boolean(newState.slimHours);
      newState.slimTiles = Boolean(newState.slimTiles);
      this.state = newState;
      this.notify();
    }
  }

  // Reset do domyślnego szablonu
  resetToDefault() {
    this.state = createDefaultState();
    this.notify();
  }

  // Eksport stanu do JSON
  exportStateJson() {
    return JSON.stringify(this.state, null, 2);
  }
}
