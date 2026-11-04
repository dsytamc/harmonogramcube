// src/efitnessImporter.js - Inteligentny moduł importu grafiku ze stron eFitness

import { CATEGORIES, DAYS_OF_WEEK } from './constants.js';

/**
 * Konwersja RGB (0-255) do HSL (h: 0-360, s: 0-1, l: 0-1)
 */
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s, l };
}

/**
 * Bezpiecznie parsuje dowolny format koloru CSS (HEX, RGB, RGBA, nazwy) do { r, g, b }
 */
export function parseCssColor(colorStr) {
  if (!colorStr || typeof colorStr !== 'string') return null;
  const str = colorStr.trim().toLowerCase();

  // 1. HEX 6 znaków (#RRGGBB)
  const hex6 = str.match(/#([0-9a-f]{6})/);
  if (hex6) {
    return {
      r: parseInt(hex6[1].slice(0, 2), 16),
      g: parseInt(hex6[1].slice(2, 4), 16),
      b: parseInt(hex6[1].slice(4, 6), 16)
    };
  }

  // 2. HEX 3 znaki (#RGB)
  const hex3 = str.match(/#([0-9a-f]{3})/);
  if (hex3) {
    return {
      r: parseInt(hex3[1][0] + hex3[1][0], 16),
      g: parseInt(hex3[1][1] + hex3[1][1], 16),
      b: parseInt(hex3[1][2] + hex3[1][2], 16)
    };
  }

  // 3. RGB / RGBA: rgb(r, g, b) lub rgba(r, g, b, a)
  const rgbMatch = str.match(/rgba?\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (rgbMatch) {
    return {
      r: Math.min(255, parseInt(rgbMatch[1], 10)),
      g: Math.min(255, parseInt(rgbMatch[2], 10)),
      b: Math.min(255, parseInt(rgbMatch[3], 10))
    };
  }

  // 4. Nazwy popularnych kolorów
  const NAMED_COLORS = {
    orange: { r: 249, g: 183, b: 89 },
    pink: { r: 254, g: 101, b: 195 },
    purple: { r: 203, g: 108, b: 230 },
    violet: { r: 203, g: 108, b: 230 },
    magenta: { r: 254, g: 101, b: 195 },
    blue: { r: 91, g: 180, b: 226 },
    yellow: { r: 251, g: 238, b: 118 },
    green: { r: 195, g: 212, b: 104 },
    lime: { r: 195, g: 212, b: 104 },
    red: { r: 231, g: 89, b: 91 }
  };
  for (const [name, rgb] of Object.entries(NAMED_COLORS)) {
    if (str.includes(name)) return rgb;
  }

  return null;
}

/**
 * Wyciąga definicję koloru tła kafelka z eFitness (style inline, background-color, komórka td)
 */
export function extractColorFromElements(eventEl, cellEl = null) {
  const sources = [];

  if (eventEl) {
    const evStyle = eventEl.getAttribute('style') || '';
    if (evStyle) sources.push(evStyle);

    const dataColor = eventEl.getAttribute('data-color') || eventEl.getAttribute('meta:color') || '';
    if (dataColor) sources.push(dataColor);

    const styledChildren = eventEl.querySelectorAll('[style*="background"], [style*="#"], [style*="rgb"]');
    styledChildren.forEach(child => {
      const s = child.getAttribute('style');
      if (s) sources.push(s);
    });
  }

  if (cellEl) {
    const tdStyle = cellEl.getAttribute('style') || '';
    if (tdStyle) sources.push(tdStyle);
  }

  for (const src of sources) {
    const bgMatch = src.match(/background(?:-color)?\s*:\s*([^;]+)/i);
    const candidate = bgMatch ? bgMatch[1] : src;
    const rgb = parseCssColor(candidate);
    if (rgb) return rgb;
  }

  return null;
}

/**
 * Inteligentne dobieranie kategorii na podstawie koloru kafelka z eFitness
 * oraz fallback do słów kluczowych nazwy (np. gdy eFitness wyszarzy minione zajęcia kolorem #808080)
 */
export function findCategoryByColorAndName(colorRgb, rawClassName = '') {
  const normalizedName = (rawClassName || '')
    .replace(/&#174;/gi, '®')
    .replace(/&reg;/gi, '®')
    .replace(/&#8482;/gi, '™')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .toUpperCase();

  // 1. Dopasowanie po kolorze z eFitness
  if (colorRgb) {
    const { h, s, l } = rgbToHsl(colorRgb.r, colorRgb.g, colorRgb.b);

    // Sprawdź czy to nie jest wyszarzony kafelek minionych zajęć (#808080, niska saturacja)
    const isGrayOrPast = (s < 0.14) || (l < 0.12) || (l > 0.92);

    if (!isGrayOrPast) {
      // Precyzyjne przyporządkowanie do 7 kategorii kolorystycznych aplikacji
      if (h >= 350 || h < 16) {
        return ['sztuki_walki']; // Czerwony / Koral (MMA, boks)
      } else if (h >= 16 && h <= 45) {
        return ['modelujace'];   // Pomarańczowy / Brzoskwiniowy (Płaski brzuch, body shape, miniband, pilates)
      } else if (h > 45 && h <= 68) {
        return ['wzmacniajace']; // Żółty (Harmonia ruchu, aktywny start, pump)
      } else if (h > 68 && h <= 165) {
        return ['rozciagajace']; // Seledynowy / Jasnozielony (Yoga, mobility, stretching)
      } else if (h > 165 && h <= 252) {
        return ['spalajace'];    // Błękitny / Niebieski (Spalanie, tabata, trening obwodowy, HIIT)
      } else if (h > 252 && h <= 310) {
        return ['taneczne'];     // Fioletowy / Purpura (Zumba, salsation)
      } else if (h > 310 && h < 350) {
        return ['prozdrowotne']; // Różowy / Magenta (Zdrowy kręgosłup, aktywna ciąża)
      }
    }
  }

  // 2. Fallback: Rozpoznawanie po nazwie zajęć (niezbędne np. gdy minione zajęcia mają kolor szary #808080)
  if (normalizedName.includes('KRĘGOSŁUP') || normalizedName.includes('KREGOSLUP') ||
      normalizedName.includes('CIĄŻ') || normalizedName.includes('CIAZ') ||
      normalizedName.includes('SENIOR') || normalizedName.includes('ZDROWY') ||
      normalizedName.includes('REHABILITACJA')) {
    return ['prozdrowotne'];
  }

  if (normalizedName.includes('ZUMBA') || normalizedName.includes('SALSATION') ||
      normalizedName.includes('DANCE') || normalizedName.includes('LATINO') ||
      normalizedName.includes('BACHATA') || normalizedName.includes('TANIEC')) {
    return ['taneczne'];
  }

  if (normalizedName.includes('YOGA') || normalizedName.includes('JOGA') ||
      normalizedName.includes('STRETCH') || normalizedName.includes('MOBILITY') ||
      normalizedName.includes('ROZCIĄG') || normalizedName.includes('RELAKS')) {
    return ['rozciagajace'];
  }

  if (normalizedName.includes('MMA') || normalizedName.includes('BOKS') ||
      normalizedName.includes('BOX') || normalizedName.includes('KICKBOX') ||
      normalizedName.includes('WALKI') || normalizedName.includes('SAMOOBRONA')) {
    return ['sztuki_walki'];
  }

  if (normalizedName.includes('SPALANIE') || normalizedName.includes('TABATA') ||
      normalizedName.includes('OBWODOWY') || normalizedName.includes('HIIT') ||
      normalizedName.includes('CARDIO') || normalizedName.includes('FAT BURN') ||
      normalizedName.includes('CROSS') || normalizedName.includes('BRAMY') ||
      normalizedName.includes('INTERWAŁ')) {
    return ['spalajace'];
  }

  if (normalizedName.includes('BRZUCH') || normalizedName.includes('PUPA') ||
      normalizedName.includes('BODY SHAPE') || normalizedName.includes('MINIBAND') ||
      normalizedName.includes('PILATES') || normalizedName.includes('SHAPE') ||
      normalizedName.includes('SYLWETKA') || normalizedName.includes('RZEŹBA') ||
      normalizedName.includes('SKALPEL') || normalizedName.includes('BUP') ||
      normalizedName.includes('ABT') || normalizedName.includes('POŚLADKI') ||
      normalizedName.includes('CELLULIT') || normalizedName.includes('CELULIT')) {
    return ['modelujace'];
  }

  if (normalizedName.includes('START') || normalizedName.includes('HARMONIA') ||
      normalizedName.includes('WZMACNIAN') || normalizedName.includes('TBC') ||
      normalizedName.includes('PUMP') || normalizedName.includes('SZTANGI') ||
      normalizedName.includes('SIŁOWY') || normalizedName.includes('WOD')) {
    return ['wzmacniajace'];
  }

  return [];
}

/**
 * Kompatybilna funkcja pomocnicza
 */
export function findCategoryByColor(styleString, rawName = '') {
  const rgb = parseCssColor(styleString);
  return findCategoryByColorAndName(rgb, rawName);
}

/**
 * Normalizacja formatu godziny (np. "08:15" -> "8:15", "09:00" -> "9:00", "17:00" -> "17:00")
 */
export function normalizeHour(str) {
  if (!str) return '';
  const match = str.trim().match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return str.trim();
  const h = parseInt(match[1], 10);
  const m = match[2];
  return `${h}:${m}`;
}

/**
 * Parsuje kod HTML tabeli eFitness
 */
export function parseEfitnessHtml(html, sourceUrl = '') {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const table = doc.querySelector('table.calendar_table') || doc.querySelector('table');
  if (!table) {
    throw new Error('Nie znaleziono tabeli kalendarza (calendar_table) na podanej stronie.');
  }

  // Odczyt nazwy klubu z adresu URL lub tytułu strony
  let gymTitle = 'GRAFIK FITNESS';
  if (sourceUrl) {
    const domainMatch = sourceUrl.match(/https?:\/\/([^.]+)/);
    if (domainMatch) {
      let clubName = domainMatch[1]
        .replace(/^cubefitness-?/, 'CUBE ')
        .replace(/^cubefitness/, 'CUBE ')
        .replace(/^cube-?/, 'CUBE ')
        .replace(/[-_]/g, ' ')
        .trim()
        .toUpperCase();
      gymTitle = `GRAFIK FITNESS - ${clubName}`;
    }
  }

  const trList = Array.from(table.querySelectorAll('tr'));
  if (trList.length < 2) {
    throw new Error('Tabela kalendarza jest pusta.');
  }

  const rawHours = [];
  const parsedTiles = {}; // klucz: `hour_dayId`

  // Dni tygodnia odpowiadają kolumnom 1..7 (Pon..Niedz)
  const dayColMap = {
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
    7: 'sun'
  };

  // Iteracja po wierszach z godzinami
  for (let r = 1; r < trList.length; r++) {
    const rowEl = trList[r];
    const tds = Array.from(rowEl.querySelectorAll('td'));
    if (tds.length < 2) continue;

    const hourText = tds[0].textContent.trim();
    if (!hourText || !hourText.match(/\d/)) continue;

    const normalizedH = normalizeHour(hourText);
    rawHours.push(normalizedH);

    for (let c = 1; c < tds.length; c++) {
      const dayId = dayColMap[c];
      if (!dayId) continue;

      const cell = tds[c];
      const eventEl = cell.querySelector('.event, [class*="event"]');
      if (eventEl) {
        const nameEl = eventEl.querySelector('.event_name, .name, h4, strong') || eventEl;
        const instructorEl = eventEl.querySelector('.instructor, .teacher');
        const lengthEl = eventEl.querySelector('.eventlength, .length, .duration');

        // Dekodowanie encji HTML
        let rawName = nameEl ? nameEl.textContent.trim() : '';
        rawName = rawName
          .replace(/&#174;/gi, '®')
          .replace(/&reg;/gi, '®')
          .replace(/&#8482;/gi, '™')
          .replace(/&trade;/gi, '™')
          .replace(/&amp;/gi, '&')
          .replace(/&nbsp;/gi, ' ')
          .replace(/\s+/g, ' ')
          .toUpperCase()
          .trim();

        let instructor = instructorEl ? instructorEl.textContent.trim() : '';
        instructor = instructor
          .replace(/&#174;/gi, '®')
          .replace(/&amp;/gi, '&')
          .replace(/&nbsp;/gi, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // 1. Ekstrakcja koloru z kafelka w tabeli eFitness
        const colorRgb = extractColorFromElements(eventEl, cell);

        // 2. Dobranie kategorii i koloru na podstawie palety aplikacji Cube Fitness
        const categories = findCategoryByColorAndName(colorRgb, rawName);

        // Estetyczne łamanie nazwy na linie (dla długich nazw > 14 znaków)
        let formattedName = rawName;
        if (formattedName.length > 14 && !formattedName.includes('\n')) {
          const words = formattedName.split(' ');
          if (words.length >= 2) {
            const mid = Math.ceil(words.length / 2);
            formattedName = words.slice(0, mid).join(' ') + '\n' + words.slice(mid).join(' ');
          }
        }

        parsedTiles[`${normalizedH}_${dayId}`] = {
          name: formattedName,
          hasCustomStart: false,
          startTime: '',
          instructor,
          categories
        };
      }
    }
  }

  // Sortowanie unikalnych godzin
  const uniqueHours = Array.from(new Set(rawHours)).sort((a, b) => {
    return parseTimeToMinutes(a) - parseTimeToMinutes(b);
  });

  // Budowanie wierszy z inteligentnym wykrywaniem belek przerw
  const finalRows = [];
  const finalTiles = {};

  let addedBreak = false;
  for (let i = 0; i < uniqueHours.length; i++) {
    const h = uniqueHours[i];
    const rowId = `row_${i + 1}`;

    // Sprawdzenie czy między obecną a poprzednią godziną jest duża przerwa (>= 3 godziny / 180 min)
    if (i > 0 && !addedBreak) {
      const prevMinutes = parseTimeToMinutes(uniqueHours[i - 1]);
      const curMinutes = parseTimeToMinutes(h);
      if (curMinutes - prevMinutes >= 180) {
        finalRows.push({
          id: `row_break_imported_${i}`,
          type: 'break',
          label: ''
        });
        addedBreak = true;
      }
    }

    finalRows.push({
      id: rowId,
      type: 'hour',
      time: h,
      note: (i === 0 && h === '6:30') ? 'SALA OPEN' : ''
    });

    // Przypisanie kafelków do nowego rowId
    DAYS_OF_WEEK.forEach(d => {
      const key = `${h}_${d.id}`;
      if (parsedTiles[key]) {
        finalTiles[`${rowId}_${d.id}`] = parsedTiles[key];
      }
    });
  }

  return {
    version: '1.0',
    gymTitle,
    rows: finalRows,
    tiles: finalTiles
  };
}

export function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 9999;
  const match = timeStr.trim().match(/(\d{1,2})[:.](\d{2})/);
  if (!match) return 9999;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

/**
 * Pobiera HTML ze strony eFitness z obsługą CORS proxy
 */
export async function fetchEfitnessSchedule(calendarUrl, statusCallback = null) {
  if (statusCallback) statusCallback('Łączenie ze stroną eFitness...');

  let targetUrl = calendarUrl.trim();
  if (!targetUrl.includes('view=')) {
    targetUrl += (targetUrl.includes('?') ? '&' : '?') + 'view=WeekByHour';
  }

  const proxyEndpoints = [
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`
  ];

  let lastError = null;

  for (const endpoint of proxyEndpoints) {
    try {
      if (statusCallback) statusCallback(`Pobieranie grafiku przez serwer proxy...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const html = await response.text();
      if (html && (html.includes('calendar_table') || html.includes('calendar'))) {
        if (statusCallback) statusCallback('Przetwarzanie tabeli zajęć...');
        return parseEfitnessHtml(html, calendarUrl);
      }
    } catch (err) {
      lastError = err;
      console.warn('Proxy error on:', endpoint, err);
    }
  }

  // Ostateczna próba - bezpośredni fetch
  try {
    if (statusCallback) statusCallback('Próba połączenia bezpośredniego...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const directRes = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (directRes.ok) {
      const html = await directRes.text();
      if (html && html.includes('calendar_table')) {
        return parseEfitnessHtml(html, calendarUrl);
      }
    }
  } catch (directErr) {
    // ignoruj błąd CORS
  }

  throw new Error(`Serwer eFitness zablokował bezpośrednie pobieranie (zabezpieczenie Cloudflare). Skorzystaj z Opcji 2 poniżej: otwórz stronę kalendarza w przeglądarce, naciśnij Ctrl + U, skopiuj kod (Ctrl + A, Ctrl + C) i wklej go w pole tekstowe.`);
}

/**
 * Bezpośredni import z wklejonego kodu HTML
 */
export function importFromHtmlString(htmlString, sourceUrl = '') {
  if (!htmlString || !htmlString.trim()) {
    throw new Error('Pole z kodem HTML jest puste.');
  }
  return parseEfitnessHtml(htmlString, sourceUrl);
}
