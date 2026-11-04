// src/tileFormatter.js - Formatowanie i generowanie HTML kafelków zajęć

import { getTileBackground } from './constants.js';

/**
 * Zwraca klasę CSS określającą skalowanie czcionki dla długich nazwisk
 */
export function getInstructorClass(instructor) {
  if (!instructor) return '';
  const len = instructor.trim().length;
  if (len >= 22) return 'is-compact';
  return '';
}

/**
 * Inteligentne formatowanie imienia i nazwiska instruktora.
 * W kafelkach z dodatkową godziną startu formatuje nazwisko maksymalnie w 2 liniach
 * (np. "Monika Kruszczyńska-" / "Szczubiał"), aby zapobiec obcinaniu tekstu.
 */
export function formatInstructor(instructor, hasCustomStart = false) {
  if (!instructor) return '';
  const clean = instructor.trim().replace(/\r/g, '');
  // Jeśli użytkownik sam wstawił enter (\n / Shift+Enter), respektuj go w 100%
  if (clean.includes('\n')) {
    return clean
      .split('\n')
      .map(line => escapeHtml(line.trim()))
      .filter(Boolean)
      .join('<br>');
  }

  // 1. Nazwiska dwuczłonowe z myślnikiem (np. "Monika Kruszczyńska-Szczubiał" lub "Kruszczyńska-Szczubiał")
  if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 2) {
      const left = parts[0].trim();
      const right = parts[1].trim();

      // Jeśli przed myślnikiem jest imię ze spacją: "Monika Kruszczyńska"
      if (left.includes(' ')) {
        const spaceIdx = left.lastIndexOf(' ');
        const firstName = left.slice(0, spaceIdx).trim();
        const firstSurname = left.slice(spaceIdx + 1).trim();

        // Jeśli kafelek ma godzinę startu LUB łączne imię+nazwisko1 mieści się w linii:
        // Linia 1: "Monika Kruszczyńska-"
        // Linia 2: "Szczubiał"
        // Taki podział na 2 linie zapobiega rozpychaniu do 6 linii w kafelku
        if (hasCustomStart || (firstName + ' ' + firstSurname).length <= 22) {
          return `${escapeHtml(firstName + ' ' + firstSurname)}-<br>${escapeHtml(right)}`;
        } else {
          return `${escapeHtml(firstName)}<br>${escapeHtml(firstSurname)}-<br>${escapeHtml(right)}`;
        }
      } else {
        // Samo nazwisko dwuczłonowe bez imienia: "Kruszczyńska-" / "Szczubiał"
        return `${escapeHtml(left)}-<br>${escapeHtml(right)}`;
      }
    }
  }

  // 2. Bardzo długie imię i nazwisko (powyżej 20 znaków) ze spacją (np. "Aleksandra Kołodziejczyk")
  if (clean.length > 20 && clean.includes(' ')) {
    const spaceIdx = clean.indexOf(' ');
    const firstPart = clean.slice(0, spaceIdx);
    const secondPart = clean.slice(spaceIdx + 1);
    return `${escapeHtml(firstPart)}<br>${escapeHtml(secondPart)}`;
  }

  return escapeHtml(clean);
}

/**
 * Dzieli nazwę zajęć na linie, respektując ręczne entery (\n / Shift+Enter),
 * a w przypadku ich braku inteligentnie łamiąc długie tytuły po słowach (max 10 znaków w linii).
 * Dzięki limitowi 10 znaków tytuły takie jak "RZEŹBA CIAŁA", "ZUMBA LATINO", "PEŁNA FORMA",
 * "TRENING OBWODOWY" itp. automatycznie i estetycznie łamią się na 2 linie zarówno w podglądzie,
 * jak i we wszystkich formatach eksportu (PNG, PDF, SVG).
 */
export function getTileNameLines(name, maxCharsPerLine = 10) {
  if (!name) return [];
  const clean = name.trim().replace(/\r/g, '');
  const hasManualNewlines = clean.includes('\n');
  const rawLines = hasManualNewlines
    ? clean.split('\n').map(l => l.trim()).filter(Boolean)
    : [clean];

  const lines = [];
  for (const rawLine of rawLines) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length <= 1) {
      if (rawLine) lines.push(rawLine);
      continue;
    }
    // Podział na linie do max 10 znaków na linię. Nigdy nie pozostawiamy pojedynczych spójników (+, &, Z, I, W)
    // na końcu wiersza (np. "+ STRECHING" pozostaje zawsze razem w jednej linii).
    let currentLine = '';
    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else if (['+', '&', 'Z', 'I', 'W'].includes(currentLine) || (currentLine + ' ' + word).length <= maxCharsPerLine) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
  }
  return lines;
}

/**
 * Formatowanie nazwy zajęć z podziałem na linie
 */
export function formatClassName(name) {
  if (!name) return '';
  const lines = getTileNameLines(name);
  return lines.map(escapeHtml).join('<br>');
}

/**
 * Zabezpieczenie przed XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Renderuje pełny element DOM kafelka dla podglądu lub eksportu
 */
export function renderTileElement(tile, rowId, dayId, theme = 'dark', isSelected = false, options = {}) {
  const hasContent = Boolean(tile && (tile.name || tile.instructor || (tile.categories && tile.categories.length > 0)));
  const bgStyle = hasContent ? getTileBackground(tile.categories, theme) : null;

  const tileEl = document.createElement('div');
  tileEl.className = `schedule-tile ${hasContent ? 'has-content' : 'is-empty'} ${isSelected ? 'is-selected' : ''}`;
  tileEl.dataset.rowId = rowId;
  tileEl.dataset.dayId = dayId;

  if (bgStyle) {
    tileEl.style.background = bgStyle;
  }

  if (hasContent) {
    const isSlim = Boolean(options && options.slimTiles);
    const hasCustomStart = Boolean(tile.hasCustomStart && tile.startTime);

    if (isSlim) {
      const contentEl = document.createElement('div');
      contentEl.className = 'tile-content is-slim-tile';

      if (tile.name) {
        const nameLines = getTileNameLines(tile.name);
        const titleLines = nameLines.length;
        const isShortTitle = titleLines === 1 && tile.name.trim().length <= 8;
        const isLongSingleWord = titleLines === 1 && tile.name.trim().length >= 10;
        const isDense = tile.name.length > 15 || titleLines > 1;
        const isTwoLinesRoomy = titleLines === 2 && Math.max(...nameLines.map(l => l.length)) <= 10;
        const isThreeLines = titleLines === 3;
        const isFourLines = titleLines >= 4;
        const nameEl = document.createElement('div');
        nameEl.className = `tile-class-name font-display${isShortTitle ? ' is-short-title' : ''}${isLongSingleWord ? ' is-long-single-word' : ''}${isDense ? ' is-dense' : ''}${isTwoLinesRoomy ? ' is-two-lines-roomy' : ''}${isThreeLines ? ' is-three-lines' : ''}${isFourLines ? ' is-four-lines' : ''}`;
        nameEl.innerHTML = formatClassName(tile.name);
        contentEl.appendChild(nameEl);
      }

      if (hasCustomStart) {
        const startEl = document.createElement('div');
        startEl.className = 'tile-custom-start font-body';
        startEl.textContent = `Start o ${tile.startTime}`;
        contentEl.appendChild(startEl);
      }

      tileEl.appendChild(contentEl);
      return tileEl;
    }

    const formattedInst = formatInstructor(tile.instructor, hasCustomStart);

    // Dynamiczna detekcja gęstości tekstu w kafelku (z uwzględnieniem podziału słów)
    const nameLines = getTileNameLines(tile.name);
    const titleLines = nameLines.length;
    const startLines = hasCustomStart ? 1 : 0;
    const instLines = formattedInst ? formattedInst.split('<br>').length : 0;
    const totalLines = titleLines + startLines + instLines;

    let densityClass = '';
    if (totalLines >= 6 || titleLines >= 4) {
      densityClass = ' is-extreme-dense';
    } else if (totalLines >= 4 || (hasCustomStart && (instLines >= 2 || (tile.instructor && tile.instructor.trim().length >= 18)))) {
      densityClass = ' is-dense-content';
    } else if (hasCustomStart) {
      densityClass = ' has-custom-start';
    }

    // Reguła: 20% większe nazwisko (ale nie tytuł) dla kafelków bez godziny startu:
    // 1. Tytuł w jednej linii (do ok. 10-12 znaków) i długie nazwisko (>18 znaków lub >=2 linie)
    // 2. Tytuł w dwóch liniach i nazwisko w dwóch liniach
    const isCase1 = Boolean(!hasCustomStart && tile.name && titleLines === 1 && tile.name.trim().length <= 12 && tile.instructor && (tile.instructor.trim().length >= 18 || instLines >= 2));
    const isCase2 = Boolean(!hasCustomStart && tile.name && (titleLines === 2 || (titleLines === 1 && tile.name.trim().length > 12)) && tile.instructor && (instLines >= 2 || tile.instructor.trim().length >= 18) && titleLines < 3);

    if (isCase1 || isCase2) {
      densityClass += ' is-spacious-long-instructor';
    }

    const contentEl = document.createElement('div');
    contentEl.className = `tile-content${densityClass}`;

    // 1. Nazwa zajęć (Termina Heavy, uppercase - ZAWSZE NAJWIĘKSZA)
    if (tile.name) {
      const nameEl = document.createElement('div');
      const isShortTitle = titleLines === 1 && tile.name.trim().length <= 8;
      const isLongSingleWord = titleLines === 1 && tile.name.trim().length >= 10;
      const isDense = tile.name.length > 15 || titleLines > 1;
      const isTwoLinesRoomy = titleLines === 2 && Math.max(...nameLines.map(l => l.length)) <= 10;
      const isThreeLines = titleLines === 3;
      const isFourLines = titleLines >= 4;
      nameEl.className = `tile-class-name font-display${isShortTitle ? ' is-short-title' : ''}${isLongSingleWord ? ' is-long-single-word' : ''}${isDense ? ' is-dense' : ''}${isTwoLinesRoomy ? ' is-two-lines-roomy' : ''}${isThreeLines ? ' is-three-lines' : ''}${isFourLines ? ' is-four-lines' : ''}`;
      nameEl.innerHTML = formatClassName(tile.name);
      contentEl.appendChild(nameEl);
    }

    // 2. Godzina startu (jeśli inna niż godzina wiersza - WIĘKSZA OD NAZWISKA)
    if (hasCustomStart) {
      const startEl = document.createElement('div');
      startEl.className = 'tile-custom-start font-body';
      startEl.textContent = `Start o ${tile.startTime}`;
      contentEl.appendChild(startEl);
    }

    // 3. Imię i nazwisko instruktora (Gibson/Plus Jakarta Sans)
    if (tile.instructor) {
      const instructorEl = document.createElement('div');
      const instClass = getInstructorClass(tile.instructor);
      instructorEl.className = `tile-instructor font-body ${instClass}`.trim();
      instructorEl.innerHTML = formattedInst;
      contentEl.appendChild(instructorEl);
    }

    tileEl.appendChild(contentEl);
  }

  // Animowany obrys zaznaczenia z efektem glow (marching ants)
  if (isSelected) {
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
    tileEl.appendChild(antsSvg);
  }

  return tileEl;
}
