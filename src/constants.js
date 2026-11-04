// src/constants.js - Konfiguracja i stałe dla generatora grafiku fitness Cube

export const CATEGORIES = [
  {
    id: 'spalajace',
    name: 'SPALAJĄCE',
    colorDark: '#6AB5E2',
    colorLight: '#5DB2E0',
    textColor: '#1A1A1A',
    description: 'Zajęcia spalające tkankę tłuszczową i cardio'
  },
  {
    id: 'wzmacniajace',
    name: 'WZMACNIAJĄCE',
    colorDark: '#FBEE76',
    colorLight: '#F7F07C',
    textColor: '#1A1A1A',
    description: 'Trening siłowy, wzmacniający mięśnie'
  },
  {
    id: 'prozdrowotne',
    name: 'PROZDROWOTNE',
    colorDark: '#FE65C3',
    colorLight: '#DC71AC',
    textColor: '#1A1A1A',
    description: 'Zdrowy kręgosłup, pilates, mobility'
  },
  {
    id: 'taneczne',
    name: 'TANECZNE',
    colorDark: '#CB6CE6',
    colorLight: '#9B73B2',
    textColor: '#1A1A1A',
    description: 'Zumba, latino, taniec nowoczesny'
  },
  {
    id: 'modelujace',
    name: 'MODELUJĄCE',
    colorDark: '#F9B759',
    colorLight: '#FBB460',
    textColor: '#1A1A1A',
    description: 'Płaski brzuch, pośladki, body shape'
  },
  {
    id: 'rozciagajace',
    name: 'ROZCIĄGAJĄCE',
    colorDark: '#C3D468',
    colorLight: '#B8D474',
    textColor: '#1A1A1A',
    description: 'Stretching, joga, relaksacja'
  },
  {
    id: 'sztuki_walki',
    name: 'SZTUKI WALKI',
    colorDark: '#E7595B',
    colorLight: '#ED6262',
    textColor: '#1A1A1A',
    description: 'Boks, kickboxing, samoobrona'
  }
];

export const DAYS_OF_WEEK = [
  { id: 'mon', name: 'PONIEDZIAŁEK', short: 'PON' },
  { id: 'tue', name: 'WTOREK', short: 'WT' },
  { id: 'wed', name: 'ŚRODA', short: 'ŚR' },
  { id: 'thu', name: 'CZWARTEK', short: 'CZW' },
  { id: 'fri', name: 'PIĄTEK', short: 'PT' },
  { id: 'sat', name: 'SOBOTA', short: 'SOB' },
  { id: 'sun', name: 'NIEDZIELA', short: 'ND' }
];

export const FORMATS = {
  a4_print: {
    id: 'a4_print',
    label: 'Druk A4 (300 DPI)',
    type: 'print',
    theme: 'light',
    width: 3508,
    height: 2480,
    aspectRatio: 3508 / 2480,
    dpi: 300,
    legendPosition: 'sidebar-right',
    logoType: 'vertical'
  },
  a3_print: {
    id: 'a3_print',
    label: 'Druk A3 (300 DPI)',
    type: 'print',
    theme: 'light',
    width: 4961,
    height: 3508,
    aspectRatio: 4961 / 3508,
    dpi: 300,
    legendPosition: 'sidebar-right',
    logoType: 'vertical'
  },
  post_square: {
    id: 'post_square',
    label: 'Social Media - Kwadrat (1200x1200)',
    type: 'social',
    theme: 'dark',
    width: 1200,
    height: 1200,
    aspectRatio: 1,
    dpi: 72,
    legendPosition: 'bottom',
    logoType: 'horizontal'
  },
  post_portrait: {
    id: 'post_portrait',
    label: 'Social Media - Pion / Instagram (1080x1350)',
    type: 'social',
    theme: 'dark',
    width: 1080,
    height: 1350,
    aspectRatio: 1080 / 1350,
    dpi: 72,
    legendPosition: 'bottom',
    logoType: 'horizontal'
  }
};

export const THEME_COLORS = {
  dark: {
    bg: '#28282D',
    headerBg: '#FDC400',
    headerText: '#1F2327',
    dayHeaderBg: '#FDC400',
    dayHeaderText: '#1F2327',
    hourHeaderBg: '#FDC400',
    hourHeaderText: '#1F2327',
    breakDividerBg: '#FDC400',
    emptyTileBg: '#353535',
    emptyTileBorder: '#444449',
    textColor: '#FFFFFF',
    logoColor: '#FDC400'
  },
  light: {
    bg: '#FFFFFF',
    headerBg: '#C4C6C6',
    headerText: '#1F232B',
    dayHeaderBg: '#C4C6C6',
    dayHeaderText: '#1F232B',
    hourHeaderBg: '#C4C6C6',
    hourHeaderText: '#1F232B',
    breakDividerBg: '#C4C6C6',
    emptyTileBg: '#E7E6DE',
    emptyTileBorder: 'transparent',
    textColor: '#1F232B',
    logoColor: '#1F232B'
  }
};

// Funkcja generująca styl tła dla kafelka z uwzględnieniem 1 lub 2 kategorii (podział ukośny)
export function getTileBackground(categories, theme = 'dark') {
  if (!categories || categories.length === 0) {
    return null; // puste tło
  }

  const findCat = (catId) => CATEGORIES.find(c => c.id === catId);

  if (categories.length === 1) {
    const c1 = findCat(categories[0]);
    if (!c1) return null;
    return theme === 'dark' ? c1.colorDark : c1.colorLight;
  }

  if (categories.length >= 2) {
    const c1 = findCat(categories[0]);
    const c2 = findCat(categories[1]);
    const col1 = theme === 'dark' ? (c1?.colorDark || '#6AB5E2') : (c1?.colorLight || '#5DB2E0');
    const col2 = theme === 'dark' ? (c2?.colorDark || '#FBEE76') : (c2?.colorLight || '#F7F07C');
    // Ostry podział ukośny pod kątem 135 stopni (zgodnie z wytycznymi: podział ukośny a nie poziomy)
    return `linear-gradient(135deg, ${col1} 0%, ${col1} 50%, ${col2} 50%, ${col2} 100%)`;
  }

  return null;
}
