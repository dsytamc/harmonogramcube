// src/exporter.js - Silnik eksportu grafiku do PNG (Social Media RGB), wektorowego SVG (Adobe Illustrator) i spłaszczonego PDF (Druk 300 DPI)

import { FORMATS, DAYS_OF_WEEK, CATEGORIES } from './constants.js';
import { FONT_EMBED_CSS } from './embeddedFonts.js';
import { LOGO_CUBE_HORIZONTAL } from './logos.js';
import { formatInstructor, getTileNameLines } from './tileFormatter.js';
import { autoFitAllTiles } from './artboardRenderer.js';

function escapeXml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const SVG_FORMAT_SPECS = {
  post_square: {
    targetWidth: 1136,
    availableHeight: 920,
    hourColWidth: 82,
    baseTileHeight: 70,
    headerBarHeight: 68,
    headerBarMargin: 14,
    headerRowHeight: 48,
    breakRowHeight: 18,
    gap: 6
  },
  post_portrait: {
    targetWidth: 1016,
    availableHeight: 1060,
    hourColWidth: 82,
    baseTileHeight: 70,
    headerBarHeight: 68,
    headerBarMargin: 14,
    headerRowHeight: 48,
    breakRowHeight: 18,
    gap: 6
  }
};

// Ekstrakcja wektora logo Cube dla SVG
const logoMatch = LOGO_CUBE_HORIZONTAL.match(/d="([^"]+)"/);
const LOGO_PATH = logoMatch ? logoMatch[1] : '';

/**
 * Generuje czysty, w 100% wektorowy plik SVG dla programu Adobe Illustrator.
 * Zawiera natywne grupy warstw (<g id="..." data-name="...">), edytowalne teksty (<text>, <tspan>),
 * wektorowe kształty oraz zaokrąglone kafelki z podziałami ukośnymi.
 */
export function generateScheduleSvgString(state, formatId = 'post_square') {
  const isSquare = (formatId === 'post_square');
  const width = isSquare ? 1200 : 1080;
  const height = isSquare ? 1200 : 1350;

  const spec = SVG_FORMAT_SPECS[formatId] || SVG_FORMAT_SPECS.post_square;

  // Aktywne dni tygodnia (domyślnie wszystkie 7)
  const activeDayIds = (state.activeDays && Array.isArray(state.activeDays) && state.activeDays.length > 0)
    ? state.activeDays
    : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  const activeDays = DAYS_OF_WEEK.filter(d => activeDayIds.includes(d.id));
  const activeCount = activeDays.length > 0 ? activeDays.length : 7;

  // Obliczenia szerokości i wysokości unscaled
  const standardDayColWidth = (spec.targetWidth - spec.hourColWidth - 7 * spec.gap) / 7;
  const W_base = Math.round(spec.hourColWidth + activeCount * standardDayColWidth + activeCount * spec.gap);

  let H_base = spec.headerBarHeight + spec.headerBarMargin + spec.headerRowHeight;
  state.rows.forEach(row => {
    H_base += spec.gap;
    if (row.type === 'break') {
      H_base += spec.breakRowHeight;
    } else {
      H_base += spec.baseTileHeight;
    }
  });

  const Sw = spec.targetWidth / W_base;
  const Sh = spec.availableHeight / H_base;
  const scale = Number(Math.min(Sw, Sh).toFixed(4));

  const scaledWidth = Math.round(W_base * scale);
  const scaledHeight = Math.round(H_base * scale);

  // Marginesy artboardu
  const paddingTop = isSquare ? 32 : 36;
  const paddingBottom = isSquare ? 36 : 40;

  // Logo Cube na górze
  const logoHeight = 65;
  const logoScale = logoHeight / 76.862;
  const logoWidth = 244.371 * logoScale;
  const logoX = Math.round((width - logoWidth) / 2);
  const logoY = paddingTop;

  // Legenda na dole
  const legendHeight = 80; // 36 + 8 + 36
  const legendY = height - paddingBottom - legendHeight;

  // Obszar dostępny dla tabeli (wyśrodkowany pionowo pomiędzy logo a legendą)
  const logoBottom = logoY + logoHeight + 20; // 20px margin-bottom
  const availableVSpace = legendY - logoBottom;
  const gridY = Math.round(logoBottom + (availableVSpace - scaledHeight) / 2);
  const gridX = Math.round((width - scaledWidth) / 2);

  const FONT_BLACK = `'Termina', 'Termina-Black', 'Termina Black', sans-serif`;
  const FONT_HEAVY = `'Termina', 'Termina-Heavy', 'Termina Heavy', sans-serif`;
  const FONT_DEMI = `'Termina', 'Termina-Demi', 'Termina Demi', sans-serif`;
  const FONT_MEDIUM = `'Termina', 'Termina-Medium', 'Termina Medium', sans-serif`;

  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <style type="text/css">
${FONT_EMBED_CSS}
      text {
        font-family: 'Termina', 'Termina-Heavy', 'Termina Heavy', sans-serif;
        user-select: none;
      }
    </style>
  </defs>

  <!-- WARSTWA 1: TŁO -->
  <g id="Tlo" data-name="Tło">
    <rect width="${width}" height="${height}" fill="#28282D" />
  </g>

  <!-- WARSTWA 2: LOGO CUBE (WEKTOR) -->
  <g id="Logo_Cube" data-name="Logo Cube" transform="translate(${logoX}, ${logoY}) scale(${logoScale.toFixed(5)})">
    <path fill-rule="evenodd" d="${LOGO_PATH}" fill="#FDC400" />
  </g>

  <!-- WARSTWA 3: GŁÓWNA TABELA ZAJĘĆ (SKALOWANA I WYŚRODKOWANA) -->
  <g id="Tabela" data-name="Tabela" transform="translate(${gridX}, ${gridY}) scale(${scale})">
    <!-- 1. BELKA NAGŁÓWKA (TYTUŁ + ŻÓŁTE TŁO) -->
    <g id="Naglowek" data-name="Nagłówek">
      <rect x="0" y="0" width="${W_base}" height="${spec.headerBarHeight}" rx="10" ry="10" fill="#FDC400" />
      <text x="${W_base / 2}" y="${spec.headerBarHeight / 2 + 9}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_BLACK}" font-weight="900" font-size="26" fill="#1F2327" letter-spacing="-0.01em">${escapeXml(state.gymTitle || 'GRAFIK FITNESS')}</text>
    </g>

    <!-- 2. DNI TYGODNIA (ŻÓŁTE TŁA + NAPISY DNI) -->
    <g id="Dni_Tygodnia" data-name="Dni tygodnia">
`;

  const yDays = spec.headerBarHeight + spec.headerBarMargin;
  const dayColWidth = Math.round(standardDayColWidth);

  const SHORT_DAY_NAMES = {
    mon: 'PON.',
    tue: 'WT.',
    wed: 'ŚR.',
    thu: 'CZW.',
    fri: 'PT.',
    sat: 'SOB.',
    sun: 'ND.'
  };

  activeDays.forEach((day, i) => {
    const colX = spec.hourColWidth + spec.gap + i * (dayColWidth + spec.gap);
    svg += `      <rect x="${colX}" y="${yDays}" width="${dayColWidth}" height="${spec.headerRowHeight}" rx="8" ry="8" fill="#FDC400" />\n`;
    const dayText = state.slimDays ? (SHORT_DAY_NAMES[day.id] || day.name) : day.name;
    const dayFs = state.slimDays ? 16.5 : (isSquare ? 13.5 : 11);
    svg += `      <text x="${colX + dayColWidth / 2}" y="${yDays + spec.headerRowHeight / 2 + 5}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_HEAVY}" font-weight="800" font-size="${dayFs}" fill="#1F2327">${escapeXml(dayText)}</text>\n`;
  });

  svg += `    </g>\n\n`;

  // Obliczenie dokładnych pozycji pionowych dla każdego wiersza
  const rowYMap = new Map();
  let currentY = yDays + spec.headerRowHeight;
  state.rows.forEach(row => {
    currentY += spec.gap;
    rowYMap.set(row.id, currentY);
    if (row.type === 'break') {
      currentY += spec.breakRowHeight;
    } else {
      currentY += spec.baseTileHeight;
    }
  });

  // 3. GODZINY I BELKI PRZERW (ŻÓŁTE TŁA + TEKSTY GODZIN I DOPISKÓW)
  svg += `    <!-- 3. GODZINY (ŻÓŁTE TŁA GODZIN, TEKSTY, DOPISKI, BELKI PRZERW) -->\n`;
  svg += `    <g id="Godziny" data-name="Godziny">\n`;
  state.rows.forEach(row => {
    const rowY = rowYMap.get(row.id);
    if (row.type === 'break') {
      svg += `      <g id="Przerwa_${escapeXml(row.id)}" data-name="Belka Przerwy">\n`;
      svg += `        <rect x="0" y="${rowY}" width="${W_base}" height="${spec.breakRowHeight}" rx="4" ry="4" fill="#FDC400" />\n`;
      if (row.label) {
        svg += `        <text x="${W_base / 2}" y="${rowY + spec.breakRowHeight / 2 + 4}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_HEAVY}" font-weight="800" font-size="11" fill="#111111">${escapeXml(row.label)}</text>\n`;
      }
      svg += `      </g>\n`;
    } else {
      const rowTimeClean = (row.time || '').replace(':', '_');
      svg += `      <g id="Godzina_${rowTimeClean}" data-name="Godzina ${escapeXml(row.time || '')}">\n`;
      svg += `        <rect x="0" y="${rowY}" width="${spec.hourColWidth}" height="${spec.baseTileHeight}" rx="8" ry="8" fill="#FDC400" />\n`;
      if (state.slimHours) {
        const displayTime = (row.time || '').replace(/:00$/, '');
        if (row.note) {
          const noteLines = (row.note || '').split('\n').map(s => s.trim()).filter(Boolean);
          if (noteLines.length > 1) {
            svg += `        <text x="${spec.hourColWidth / 2}" y="${rowY + 30}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_BLACK}" font-weight="900" font-size="26" fill="#1F2327">${escapeXml(displayTime)}</text>\n`;
            noteLines.forEach((line, lIdx) => {
              svg += `        <text x="${spec.hourColWidth / 2}" y="${rowY + 46 + lIdx * 10}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_HEAVY}" font-weight="800" font-size="7.5" fill="#1F2327" letter-spacing="0.03em">${escapeXml(line)}</text>\n`;
            });
          } else {
            svg += `        <text x="${spec.hourColWidth / 2}" y="${rowY + 36}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_BLACK}" font-weight="900" font-size="28" fill="#1F2327">${escapeXml(displayTime)}</text>\n`;
            svg += `        <text x="${spec.hourColWidth / 2}" y="${rowY + 54}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_HEAVY}" font-weight="800" font-size="8.5" fill="#1F2327" letter-spacing="0.04em">${escapeXml(row.note)}</text>\n`;
          }
        } else {
          svg += `        <text x="${spec.hourColWidth / 2}" y="${rowY + spec.baseTileHeight / 2 + 10}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_BLACK}" font-weight="900" font-size="32" fill="#1F2327">${escapeXml(displayTime)}</text>\n`;
        }
      } else {
        if (row.note) {
          const noteLines = (row.note || '').split('\n').map(s => s.trim()).filter(Boolean);
          if (noteLines.length > 1) {
            svg += `        <text x="${spec.hourColWidth / 2}" y="${rowY + 24}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_HEAVY}" font-weight="800" font-size="15" fill="#1F2327">${escapeXml(row.time || '')}</text>\n`;
            noteLines.forEach((line, lIdx) => {
              svg += `        <text x="${spec.hourColWidth / 2}" y="${rowY + 39 + lIdx * 11}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_DEMI}" font-weight="600" font-size="8.5" fill="#1F2327">${escapeXml(line)}</text>\n`;
            });
          } else {
            svg += `        <text x="${spec.hourColWidth / 2}" y="${rowY + 28}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_HEAVY}" font-weight="800" font-size="15" fill="#1F2327">${escapeXml(row.time || '')}</text>\n`;
            svg += `        <text x="${spec.hourColWidth / 2}" y="${rowY + 48}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_DEMI}" font-weight="600" font-size="10" fill="#1F2327">${escapeXml(row.note)}</text>\n`;
          }
        } else {
          svg += `        <text x="${spec.hourColWidth / 2}" y="${rowY + spec.baseTileHeight / 2 + 5}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_HEAVY}" font-weight="800" font-size="15" fill="#1F2327">${escapeXml(row.time || '')}</text>\n`;
        }
      }
      svg += `      </g>\n`;
    }
  });
  svg += `    </g>\n\n`;

  // 4. KAFELKI ZAJĘĆ (KAŻDY KAFELEK JAKO OSOBNA, NIEZALEŻNA GRUPA)
  svg += `    <!-- 4. KAFELKI ZAJĘĆ (KAŻDY KAFELEK JAKO OSOBNA GRUPA: TŁO + TYTUŁ + START + PROWADZĄCY) -->\n`;
  svg += `    <g id="Kafelki" data-name="Kafelki">\n`;

  state.rows.forEach(row => {
    if (row.type === 'break') return;
    const rowY = rowYMap.get(row.id);
    const rowTimeClean = (row.time || '').replace(':', '_');

    activeDays.forEach((day, i) => {
      const tileX = spec.hourColWidth + spec.gap + i * (dayColWidth + spec.gap);
      const tileY = rowY;
      const tileW = dayColWidth;
      const tileH = spec.baseTileHeight;
      const tileR = 6;
      const tileData = state.tiles[`${row.id}_${day.id}`] || null;

      const hasContent = Boolean(tileData && (tileData.name || tileData.instructor || (tileData.categories && tileData.categories.length > 0)));

      svg += `      <g id="Kaflek_${escapeXml(day.id)}_${rowTimeClean}" data-name="Kafelek ${escapeXml(day.name)} ${escapeXml(row.time || '')}">\n`;

      if (!hasContent) {
        // Pusty kafelek
        svg += `        <rect x="${tileX}" y="${tileY}" width="${tileW}" height="${tileH}" rx="${tileR}" ry="${tileR}" fill="#353535" stroke="#444449" stroke-width="1" />\n`;
      } else {
        const cats = tileData.categories || [];
        const findCat = (id) => CATEGORIES.find(c => c.id === id);

        if (cats.length >= 2) {
          // Podział ukośny (dwa trójkąty w zaokrąglonym klipie)
          const c1 = findCat(cats[0]);
          const c2 = findCat(cats[1]);
          const col1 = c1?.colorDark || '#6AB5E2';
          const col2 = c2?.colorDark || '#FBEE76';
          const clipId = `clip_${escapeXml(row.id)}_${escapeXml(day.id)}`;

          svg += `        <clipPath id="${clipId}">\n`;
          svg += `          <rect x="${tileX}" y="${tileY}" width="${tileW}" height="${tileH}" rx="${tileR}" ry="${tileR}" />\n`;
          svg += `        </clipPath>\n`;
          svg += `        <g clip-path="url(#${clipId})">\n`;
          svg += `          <polygon points="${tileX},${tileY} ${tileX + tileW},${tileY} ${tileX},${tileY + tileH}" fill="${col1}" />\n`;
          svg += `          <polygon points="${tileX + tileW},${tileY} ${tileX + tileW},${tileY + tileH} ${tileX},${tileY + tileH}" fill="${col2}" />\n`;
          svg += `        </g>\n`;
        } else {
          // Jedna kategoria lub brak
          const c1 = cats.length === 1 ? findCat(cats[0]) : null;
          const fillCol = c1 ? c1.colorDark : '#353535';
          svg += `        <rect x="${tileX}" y="${tileY}" width="${tileW}" height="${tileH}" rx="${tileR}" ry="${tileR}" fill="${fillCol}" />\n`;
        }

        // Teksty kafelka (inteligentny podział na linie z uwzględnieniem słów)
        const nameLines = getTileNameLines(tileData.name);
        const customStartText = (tileData.hasCustomStart && tileData.startTime) ? `Start o ${tileData.startTime.trim()}` : '';
        const instText = formatInstructor(tileData.instructor, tileData.hasCustomStart);
        const instLines = instText ? instText.split('<br>').map(l => l.trim()).filter(Boolean) : [];
        const centerX = Math.round(tileX + tileW / 2);

        if (state.slimTiles) {
          // WERSJA SLIM: UKRYTY INSTRUKTOR, TYTUŁ POWIĘKSZONY Z ZACHOWANIEM >= 8PX MARGINESU
          const isSingleLine = nameLines.length <= 1;
          let titleFs = isSingleLine ? 16.5 : (nameLines.length === 2 ? 14.2 : (nameLines.length === 3 ? 12.2 : 10.2));
          if (!isSquare) titleFs *= 0.94;

          let startFs = 11.0;
          if (!isSquare) startFs *= 0.95;

          let titleLineH = titleFs * 1.15;
          let startLineH = startFs * 1.15;
          let gap = 3;

          let totalH = (nameLines.length * titleLineH) + (customStartText ? startLineH + gap : 0);
          const maxAllowedH = tileH - 8;
          let autoScaleH = 1.0;
          if (totalH > maxAllowedH && totalH > 0) {
            autoScaleH = maxAllowedH / totalH;
          }

          let maxLineWidth = 0;
          nameLines.forEach(l => { maxLineWidth = Math.max(maxLineWidth, l.length * titleFs * 0.70); });
          if (customStartText) maxLineWidth = Math.max(maxLineWidth, customStartText.length * startFs * 0.62);

          const maxAllowedW = tileW - 8;
          let autoScaleW = 1.0;
          if (maxLineWidth > maxAllowedW && maxLineWidth > 0) {
            autoScaleW = maxAllowedW / maxLineWidth;
          }

          const finalScale = Math.min(autoScaleH, autoScaleW, 1.0);
          if (finalScale < 1.0) {
            titleFs *= finalScale;
            titleLineH *= finalScale;
            startFs *= finalScale;
            startLineH *= finalScale;
            gap *= finalScale;
            totalH *= finalScale;
          }

          const topY = tileY + (tileH - totalH) / 2;
          const firstTitleBaseline = topY + titleLineH * 0.80;

          if (nameLines.length === 1) {
            svg += `        <text x="${centerX}" y="${firstTitleBaseline.toFixed(2)}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_HEAVY}" font-weight="800" font-size="${titleFs.toFixed(1)}" fill="#111111" letter-spacing="-0.01em">${escapeXml(nameLines[0])}</text>\n`;
          } else if (nameLines.length > 1) {
            svg += `        <text x="${centerX}" y="${firstTitleBaseline.toFixed(2)}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_HEAVY}" font-weight="800" font-size="${titleFs.toFixed(1)}" fill="#111111" letter-spacing="-0.01em" xml:space="preserve">\n`;
            nameLines.forEach((nl, nIdx) => {
              if (nIdx === 0) {
                svg += `          <tspan x="${centerX}" dy="0" text-anchor="middle" style="text-anchor: middle; text-align: center;">${escapeXml(nl)}</tspan>\n`;
              } else {
                svg += `          <tspan x="${centerX}" dy="${titleLineH.toFixed(2)}" text-anchor="middle" style="text-anchor: middle; text-align: center;">${escapeXml(nl)}</tspan>\n`;
              }
            });
            svg += `        </text>\n`;
          }

          if (customStartText) {
            const startTopY = topY + (nameLines.length * titleLineH) + gap;
            const startBaseline = startTopY + startLineH * 0.80;
            svg += `        <text x="${centerX}" y="${startBaseline.toFixed(2)}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_DEMI}" font-weight="600" font-size="${startFs.toFixed(1)}" fill="#111111">${escapeXml(customStartText)}</text>\n`;
          }

        } else {
          // WERSJA STANDARDOWA: TYTUŁ + OPCJONALNY START + PROWADZĄCY
          const totalLines = nameLines.length + (customStartText ? 1 : 0) + instLines.length;
          const isCompactInst = (tileData.instructor || '').length >= 22;

          let titleFs = 13.5;
          if (nameLines.length >= 4 || totalLines >= 6) {
            titleFs = 9.8;
          } else if (nameLines.length === 3 || totalLines >= 5) {
            titleFs = 10.8;
          } else if (nameLines.length === 2) {
            const maxLineLen = Math.max(...nameLines.map(l => l.length));
            titleFs = (maxLineLen <= 10) ? 13.2 : 12.0;
          } else if (nameLines.length === 1) {
            const lineLen = nameLines[0].length;
            if (lineLen <= 8) {
              // Krótkie tytuły (YOGA, SHAPE, PILATES, INTERWAŁ, BUP): zmniejszone o 10% (13.7px / 13.0px)
              // Zapewnia również +20% dla SHAPE tam gdzie jest "Start o 9:30" (13.0px zamiast 10.8px)
              titleFs = 13.7;
            } else if (lineLen <= 10) {
              // Tytuły 1-liniowe (np. STRETCHING - 10 zn.)
              titleFs = 12.2;
            } else {
              // Długie tytuły 1-liniowe (np. WZMACNIANIE - 11+ zn.) - zapobiega ucinaniu po bokach
              titleFs = 11.6;
            }
          }

          let instFs = isCompactInst
            ? ((nameLines.length >= 4 || totalLines >= 6) ? 7.6 : (totalLines >= 5 ? 8.4 : 8.8))
            : ((nameLines.length >= 4 || totalLines >= 6) ? 8.0 : (totalLines >= 5 ? 8.8 : 9.5));

          if (!isSquare) {
            titleFs *= 0.95;
            instFs *= 0.95;
          }

          // Godzina startu ma ZAWSZE dokładnie taką samą wagę fontu (Medium 500) i rozmiar co imię prowadzącego
          let startFs = instFs;

          let titleLineH = titleFs * 1.08;
          let startLineH = startFs * 1.10;
          let instLineH = instFs * 1.10;
          let gap = (totalLines >= 4) ? 0.8 : 1.5;

          let totalH = (nameLines.length * titleLineH) +
                       (customStartText ? startLineH + gap : 0) +
                       (instLines.length > 0 ? (instLines.length * instLineH) + gap : 0);

          // Przy większych ilościach tekstu (4+ linie) margines mniejszy o 30% (2px z każdej strony zamiast 3px)
          const marginDeduction = (totalLines >= 4) ? 4 : 6;
          const maxAllowedH = tileH - marginDeduction;
          let autoScaleH = 1.0;
          if (totalH > maxAllowedH && totalH > 0) {
            autoScaleH = maxAllowedH / totalH;
          }

          let maxLineWidth = 0;
          nameLines.forEach(l => { maxLineWidth = Math.max(maxLineWidth, l.length * titleFs * 0.70); });
          if (customStartText) maxLineWidth = Math.max(maxLineWidth, customStartText.length * startFs * 0.62);
          instLines.forEach(l => { maxLineWidth = Math.max(maxLineWidth, l.length * instFs * 0.65); });

          const maxAllowedW = tileW - marginDeduction;
          let autoScaleW = 1.0;
          if (maxLineWidth > maxAllowedW && maxLineWidth > 0) {
            autoScaleW = maxAllowedW / maxLineWidth;
          }

          const finalScale = Math.min(autoScaleH, autoScaleW, 1.0);
          if (finalScale < 1.0) {
            titleFs *= finalScale;
            titleLineH *= finalScale;
            startFs *= finalScale;
            startLineH *= finalScale;
            instFs *= finalScale;
            instLineH *= finalScale;
            gap *= finalScale;
            totalH *= finalScale;
          }

          const topY = tileY + (tileH - totalH) / 2;
          const firstTitleBaseline = topY + titleLineH * 0.82;

          // 1. Nazwa zajęć (Termina Heavy, uppercase - jako JEDEN wyśrodkowany blok tekstu)
          if (nameLines.length === 1) {
            svg += `        <text x="${centerX}" y="${firstTitleBaseline.toFixed(2)}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_HEAVY}" font-weight="800" font-size="${titleFs.toFixed(1)}" fill="#111111" letter-spacing="-0.01em">${escapeXml(nameLines[0])}</text>\n`;
          } else if (nameLines.length > 1) {
            svg += `        <text x="${centerX}" y="${firstTitleBaseline.toFixed(2)}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_HEAVY}" font-weight="800" font-size="${titleFs.toFixed(1)}" fill="#111111" letter-spacing="-0.01em" xml:space="preserve">\n`;
            nameLines.forEach((nl, nIdx) => {
              if (nIdx === 0) {
                svg += `          <tspan x="${centerX}" dy="0" text-anchor="middle" style="text-anchor: middle; text-align: center;">${escapeXml(nl)}</tspan>\n`;
              } else {
                svg += `          <tspan x="${centerX}" dy="${titleLineH.toFixed(2)}" text-anchor="middle" style="text-anchor: middle; text-align: center;">${escapeXml(nl)}</tspan>\n`;
              }
            });
            svg += `        </text>\n`;
          }

          let currentBottomY = topY + (nameLines.length * titleLineH);

          // 2. Godzina startu (jeśli inna niż godzina wiersza)
          if (customStartText) {
            const startTopY = currentBottomY + gap;
            const startBaseline = startTopY + startLineH * 0.82;
            svg += `        <text x="${centerX}" y="${startBaseline.toFixed(2)}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_MEDIUM}" font-weight="500" font-size="${startFs.toFixed(1)}" fill="#111111">${escapeXml(customStartText)}</text>\n`;
            currentBottomY = startTopY + startLineH;
          }

          // 3. Prowadzący zajęcia (jako JEDEN wyśrodkowany blok tekstu)
          if (instLines.length === 1) {
            const instTopY = currentBottomY + gap;
            const instBaseline = instTopY + instLineH * 0.82;
            svg += `        <text x="${centerX}" y="${instBaseline.toFixed(2)}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_MEDIUM}" font-weight="500" font-size="${instFs.toFixed(1)}" fill="#111111">${escapeXml(instLines[0])}</text>\n`;
          } else if (instLines.length > 1) {
            const instTopY = currentBottomY + gap;
            const instBaseline = instTopY + instLineH * 0.82;
            svg += `        <text x="${centerX}" y="${instBaseline.toFixed(2)}" text-anchor="middle" style="text-anchor: middle; text-align: center;" font-family="${FONT_MEDIUM}" font-weight="500" font-size="${instFs.toFixed(1)}" fill="#111111" xml:space="preserve">\n`;
            instLines.forEach((il, iIdx) => {
              if (iIdx === 0) {
                svg += `          <tspan x="${centerX}" dy="0" text-anchor="middle" style="text-anchor: middle; text-align: center;">${escapeXml(il)}</tspan>\n`;
              } else {
                svg += `          <tspan x="${centerX}" dy="${instLineH.toFixed(2)}" text-anchor="middle" style="text-anchor: middle; text-align: center;">${escapeXml(il)}</tspan>\n`;
              }
            });
            svg += `        </text>\n`;
          }
        }
      }

      svg += `      </g>\n`;
    });
  });

  svg += `    </g>\n  </g>\n\n  <!-- WARSTWA 4: LEGENDA KATEGORII (NA DOLE) -->\n  <g id="Legenda_Kategorii" data-name="Legenda Kategorii" transform="translate(32, ${legendY})">\n`;

  // Tytuł legendy
  svg += `    <g id="Tytul_Legendy" data-name="Tytuł Legendy">\n`;
  svg += `      <text x="0" y="30" font-family="${FONT_MEDIUM}" font-weight="500" font-size="26" fill="#FFFFFF">Kategorie</text>\n`;
  svg += `      <text x="0" y="66" font-family="${FONT_HEAVY}" font-weight="800" font-size="32" fill="#FDC400">zajęć fitness</text>\n`;
  svg += `    </g>\n\n    <!-- PIGUŁKI KATEGORII -->\n    <g id="Pigulki_Kategorii" data-name="Pigułki Kategorii" transform="translate(290, 0)">\n`;

  const totalLegendWidth = (width - 32) - (32 + 290);
  const row1Cats = CATEGORIES.slice(0, 3);
  const row2Cats = CATEGORIES.slice(3);

  const r1PillWidth = Math.round((totalLegendWidth - (row1Cats.length - 1) * 8) / row1Cats.length);
  const r2PillWidth = Math.round((totalLegendWidth - (row2Cats.length - 1) * 8) / row2Cats.length);

  // Rząd 1
  row1Cats.forEach((cat, idx) => {
    const px = idx * (r1PillWidth + 8);
    const py = 0;
    svg += `      <g id="Legenda_${escapeXml(cat.id)}" data-name="${escapeXml(cat.name)}">\n`;
    svg += `        <rect x="${px}" y="${py}" width="${r1PillWidth}" height="36" rx="8" ry="8" fill="${cat.colorDark}" />\n`;
    svg += `        <text x="${px + r1PillWidth / 2}" y="${py + 23}" text-anchor="middle" font-family="${FONT_HEAVY}" font-weight="800" font-size="12" fill="#1A1A1A">${escapeXml(cat.name)}</text>\n`;
    svg += `      </g>\n`;
  });

  // Rząd 2
  row2Cats.forEach((cat, idx) => {
    const px = idx * (r2PillWidth + 8);
    const py = 44; // 36 + 8
    svg += `      <g id="Legenda_${escapeXml(cat.id)}" data-name="${escapeXml(cat.name)}">\n`;
    svg += `        <rect x="${px}" y="${py}" width="${r2PillWidth}" height="36" rx="8" ry="8" fill="${cat.colorDark}" />\n`;
    svg += `        <text x="${px + r2PillWidth / 2}" y="${py + 23}" text-anchor="middle" font-family="${FONT_HEAVY}" font-weight="800" font-size="12" fill="#1A1A1A">${escapeXml(cat.name)}</text>\n`;
    svg += `      </g>\n`;
  });

  svg += `    </g>\n  </g>\n</svg>`;

  return svg;
}

/**
 * Eksportuje grafik do pliku wektorowego SVG (dla Adobe Illustrator)
 */
export async function exportArtboardToSvg(artboardEl, state, statusCallback = null, customFilename = null) {
  if (statusCallback) statusCallback('Generowanie edytowalnego pliku SVG dla programu Adobe Illustrator...');

  const format = FORMATS[state.formatId] || FORMATS.post_square;
  const isSquare = (format.id === 'post_square');
  const width = isSquare ? 1200 : 1080;
  const height = isSquare ? 1200 : 1350;

  try {
    const svgContent = generateScheduleSvgString(state, format.id);
    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });

    let filename = customFilename;
    if (!filename) {
      const safeTitle = (state.gymTitle || 'Grafik_Fitness')
        .replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ_\- ]/g, '')
        .replace(/\s+/g, '_');
      
      const formatSuffix = isSquare ? 'Kwadrat_1200x1200_wektor' : 'Pion_1080x1350_wektor';
      filename = `${safeTitle}_${formatSuffix}.svg`;
    }

    triggerDownload(blob, filename);

    if (statusCallback) statusCallback(`✓ Gotowe! Pobrano wektorowy plik ${filename}`);
    return { success: true, filename, width, height, format: 'svg' };

  } catch (err) {
    console.error('Błąd eksportu SVG:', err);
    if (statusCallback) statusCallback(`✕ Błąd eksportu SVG: ${err.message}`);
    throw err;
  }
}

/**
 * Eksportuje grafik do formatu PNG (zoptymalizowany pod Social Media, sRGB, 72 DPI)
 */
export async function exportArtboardToPng(artboardEl, state, statusCallback = null, customFilename = null) {
  if (statusCallback) statusCallback('Przygotowywanie grafiki do eksportu PNG...');

  // Zapewniamy pełne załadowanie fontów oraz wykonanie auto-fit dla wybranego formatu
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  autoFitAllTiles(artboardEl);

  const format = FORMATS[state.formatId] || FORMATS.post_square;
  const targetWidth = format.width;
  const targetHeight = format.height;

  // Odczyt aktualnej szerokości elementu w CSS
  const currentWidth = artboardEl.offsetWidth;
  const pixelRatio = targetWidth / currentWidth;

  // Całkowite ukrycie obrysów zaznaczenia UI i efektów glow na czas eksportu
  artboardEl.classList.add('is-exporting');
  const selectedExportElements = Array.from(artboardEl.querySelectorAll('.is-selected, .is-editing'));
  artboardEl.querySelectorAll('.is-selected, .is-editing').forEach(el => el.classList.remove('is-selected', 'is-editing'));
  artboardEl.querySelectorAll('.selection-ants-box').forEach(el => el.remove());

  try {
    if (statusCallback) statusCallback(`Renderowanie pliku PNG (${targetWidth} × ${targetHeight} px)...`);

    const hti = window.htmlToImage || (typeof globalThis !== 'undefined' ? globalThis.htmlToImage : null);
    if (!hti) {
      throw new Error('Biblioteka html-to-image nie została załadowana.');
    }

    const options = {
      quality: 1.0,
      pixelRatio: pixelRatio,
      skipAutoScale: true,
      cacheBust: true,
      fontEmbedCSS: FONT_EMBED_CSS,
      style: {
        transform: 'none',
        margin: '0',
        boxShadow: 'none'
      }
    };

    // Renderowanie do blob PNG
    const blob = await hti.toBlob(artboardEl, options);

    if (!blob) {
      throw new Error('Nie udało się wygenerować obrazu PNG.');
    }

    let filename = customFilename;
    if (!filename) {
      const safeTitle = (state.gymTitle || 'Grafik_Fitness')
        .replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ_\- ]/g, '')
        .replace(/\s+/g, '_');
      
      let formatSuffix = '';
      if (format.id === 'post_square') formatSuffix = 'Post_1200x1200';
      else if (format.id === 'post_portrait') formatSuffix = 'Post_1080x1350';
      else formatSuffix = format.id;

      filename = `${safeTitle}_${formatSuffix}.png`;
    }

    // Pobranie pliku przez przeglądarkę
    triggerDownload(blob, filename);

    if (statusCallback) statusCallback(`✓ Gotowe! Pobrano ${filename} (${targetWidth}×${targetHeight} px)`);
    return { success: true, filename, width: targetWidth, height: targetHeight, format: 'png' };

  } catch (err) {
    console.error('Błąd eksportu PNG:', err);
    if (statusCallback) statusCallback(`✕ Błąd eksportu: ${err.message}`);
    throw err;

  } finally {
    artboardEl.classList.remove('is-exporting');
    selectedExportElements.forEach(t => t.classList.add('is-selected'));
  }
}

/**
 * Eksportuje grafik do spłaszczonego formatu PDF 300 DPI dla druku (A4 / A3)
 */
export async function exportArtboardToPdf(artboardEl, state, statusCallback = null, customFilename = null) {
  if (statusCallback) statusCallback('Przygotowywanie grafiki do druku PDF (300 DPI)...');

  // Zapewniamy pełne załadowanie fontów oraz wykonanie auto-fit dla wybranego formatu
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  autoFitAllTiles(artboardEl);

  const format = FORMATS[state.formatId] || FORMATS.a4_print;
  const isA3 = format.id === 'a3_print';

  // Fizyczne wymiary arkusza w punktach typograficznych (1 pt = 1/72 cala)
  // A4 poziomo: 297 x 210 mm = 841.89 x 595.28 pt
  // A3 poziomo: 420 x 297 mm = 1190.55 x 841.89 pt
  const widthPt = isA3 ? 1190.55 : 841.89;
  const heightPt = isA3 ? 841.89 : 595.28;

  // Docelowa rozdzielczość pikselowa w 300 DPI:
  // A4: 3508 x 2480 px
  // A3: 4961 x 3508 px
  const targetPxWidth = isA3 ? 4961 : 3508;
  const targetPxHeight = isA3 ? 3508 : 2480;

  const currentWidth = artboardEl.offsetWidth;
  const pixelRatio = targetPxWidth / currentWidth;

  // Całkowite ukrycie obrysów zaznaczenia UI i efektów glow na czas eksportu
  artboardEl.classList.add('is-exporting');
  const selectedExportElements = Array.from(artboardEl.querySelectorAll('.is-selected, .is-editing'));
  artboardEl.querySelectorAll('.is-selected, .is-editing').forEach(el => el.classList.remove('is-selected', 'is-editing'));
  artboardEl.querySelectorAll('.selection-ants-box').forEach(el => el.remove());

  try {
    if (statusCallback) statusCallback(`Generowanie spłaszczonego rastra druku 300 DPI (${targetPxWidth}×${targetPxHeight} px)...`);

    const hti = window.htmlToImage || (typeof globalThis !== 'undefined' ? globalThis.htmlToImage : null);
    if (!hti) {
      throw new Error('Biblioteka html-to-image nie została załadowana.');
    }

    const options = {
      quality: 0.98,
      pixelRatio: pixelRatio,
      skipAutoScale: true,
      cacheBust: true,
      fontEmbedCSS: FONT_EMBED_CSS,
      style: {
        transform: 'none',
        margin: '0',
        boxShadow: 'none'
      }
    };

    // Renderujemy do wysokorozdzielczego JPEG w pamięci
    const jpegDataUrl = await hti.toJpeg(artboardEl, options);
    if (!jpegDataUrl || !jpegDataUrl.startsWith('data:image/jpeg;base64,')) {
      throw new Error('Nie udało się wygenerować rastra dla dokumentu PDF.');
    }

    if (statusCallback) statusCallback('Składanie gotowego dokumentu PDF dla drukarni...');

    const base64Data = jpegDataUrl.replace(/^data:image\/jpeg;base64,/, '');
    const jpegBytes = base64ToUint8Array(base64Data);

    // Budujemy spłaszczony PDF zgodny ze specyfikacją PDF-1.4
    const pdfBytes = buildFlattenedPdf(jpegBytes, widthPt, heightPt, targetPxWidth, targetPxHeight);
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });

    let filename = customFilename;
    if (!filename) {
      const safeTitle = (state.gymTitle || 'Grafik_Fitness')
        .replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ_\- ]/g, '')
        .replace(/\s+/g, '_');
      const formatSuffix = isA3 ? 'Druk_A3_300dpi' : 'Druk_A4_300dpi';
      filename = `${safeTitle}_${formatSuffix}.pdf`;
    }

    // Pobranie pliku PDF
    triggerDownload(pdfBlob, filename);

    if (statusCallback) statusCallback(`✓ Gotowe! Pobrano spłaszczony plik ${filename} (Druk 300 DPI)`);
    return { success: true, filename, width: targetPxWidth, height: targetPxHeight, format: 'pdf' };

  } catch (err) {
    console.error('Błąd eksportu PDF:', err);
    if (statusCallback) statusCallback(`✕ Błąd eksportu PDF: ${err.message}`);
    throw err;

  } finally {
    artboardEl.classList.remove('is-exporting');
    selectedExportElements.forEach(t => t.classList.add('is-selected'));
  }
}

/**
 * Generator spłaszczonego pliku PDF-1.4 z osadzoną kompozycją w 300 DPI
 */
function buildFlattenedPdf(jpegBytes, widthPt, heightPt, imagePxWidth, imagePxHeight) {
  const parts = [];
  let offset = 0;
  const offsets = [];

  function addPart(data) {
    let buf;
    if (data instanceof Uint8Array) {
      buf = data;
    } else {
      buf = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) {
        buf[i] = data.charCodeAt(i) & 0xff;
      }
    }
    parts.push(buf);
    offset += buf.length;
  }

  addPart('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  // Obj 1: Catalog
  offsets.push(offset);
  addPart('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Obj 2: Pages
  offsets.push(offset);
  addPart('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // Obj 3: Page z MediaBox i TrimBox
  offsets.push(offset);
  const boxStr = `[0 0 ${widthPt.toFixed(2)} ${heightPt.toFixed(2)}]`;
  addPart(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox ${boxStr} /TrimBox ${boxStr} /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`);

  // Obj 4: Contents - rozciągnięcie na pełny arkusz bez marginesów
  const contentStream = `q\n${widthPt.toFixed(2)} 0 0 ${heightPt.toFixed(2)} 0 0 cm\n/Im1 Do\nQ\n`;
  offsets.push(offset);
  addPart(`4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`);

  // Obj 5: Image XObject
  offsets.push(offset);
  const imgHeader = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imagePxWidth} /Height ${imagePxHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`;
  addPart(imgHeader);
  addPart(jpegBytes);
  addPart('\nendstream\nendobj\n');

  // xref
  const xrefOffset = offset;
  addPart('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 0; i < offsets.length; i++) {
    addPart(String(offsets[i]).padStart(10, '0') + ' 00000 n \n');
  }
  addPart(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
  const combined = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of parts) {
    combined.set(part, pos);
    pos += part.length;
  }
  return combined;
}

function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
