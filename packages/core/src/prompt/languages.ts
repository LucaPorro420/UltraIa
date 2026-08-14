export interface LanguageInfo {
  code: string; // BCP-47 corto (es, ar, zh...)
  name: string;
  voice: string; // voz edge-tts por defecto
  rtl: boolean;
  stopwords: string[]; // palabras más frecuentes para detección
  script?: RegExp; // rango Unicode del alfabeto (si distinto del latino)
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'es', name: 'Spanish', voice: 'es-MX-DaliaNeural', rtl: false, stopwords: ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'por', 'con', 'una'] },
  { code: 'en', name: 'English', voice: 'en-US-AriaNeural', rtl: false, stopwords: ['the', 'and', 'of', 'to', 'in', 'a', 'is', 'that', 'for', 'it'] },
  { code: 'fr', name: 'French', voice: 'fr-FR-DeniseNeural', rtl: false, stopwords: ['le', 'la', 'de', 'et', 'un', 'une', 'est', 'que', 'pour', 'dans'] },
  { code: 'pt', name: 'Portuguese', voice: 'pt-BR-FranciscaNeural', rtl: false, stopwords: ['o', 'a', 'de', 'que', 'e', 'um', 'uma', 'para', 'com', 'em'] },
  { code: 'de', name: 'German', voice: 'de-DE-KatjaNeural', rtl: false, stopwords: ['der', 'die', 'das', 'und', 'ein', 'eine', 'ist', 'für', 'mit', 'den'] },
  { code: 'it', name: 'Italian', voice: 'it-IT-ElsaNeural', rtl: false, stopwords: ['il', 'lo', 'la', 'di', 'che', 'e', 'un', 'una', 'per', 'con'] },
  { code: 'ar', name: 'Arabic', voice: 'ar-SA-ZariyahNeural', rtl: true, script: /[\u0600-\u06FF]/, stopwords: ['في', 'من', 'على', 'أن', 'هذا', 'هذه', 'مع', 'إلى', 'عن', 'لا'] },
  { code: 'hi', name: 'Hindi', voice: 'hi-IN-SwaraNeural', rtl: false, script: /[\u0900-\u097F]/, stopwords: ['और', 'है', 'में', 'से', 'के', 'की', 'एक', 'को', 'था', 'हैं'] },
  { code: 'ja', name: 'Japanese', voice: 'ja-JP-NanamiNeural', rtl: false, script: /[\u3040-\u30FF]/, stopwords: ['は', 'の', 'に', 'を', 'と', 'が', 'で', 'も', 'です', 'ます'] },
  { code: 'zh', name: 'Chinese', voice: 'zh-CN-XiaoxiaoNeural', rtl: false, script: /[\u4E00-\u9FFF]/, stopwords: ['的', '是', '在', '了', '和', '有', '我', '他', '这', '那'] },
  { code: 'ru', name: 'Russian', voice: 'ru-RU-SvetlanaNeural', rtl: false, script: /[\u0400-\u04FF]/, stopwords: ['и', 'в', 'на', 'не', 'что', 'с', 'по', 'это', 'как', 'от'] },
  { code: 'nl', name: 'Dutch', voice: 'nl-NL-MaartenNeural', rtl: false, stopwords: ['de', 'het', 'een', 'van', 'en', 'is', 'dat', 'voor', 'met', 'op'] },
  { code: 'tr', name: 'Turkish', voice: 'tr-TR-EmelNeural', rtl: false, script: /[\u0100-\u017F\u011E\u011F\u0130\u0131\u015E\u015F\u00E7]/u, stopwords: ['bir', 've', 'için', 'ile', 'bu', 'o', 'şu', 'de', 'da', 'gibi'] },
  { code: 'ko', name: 'Korean', voice: 'ko-KR-SunHiNeural', rtl: false, script: /[\uAC00-\uD7AF]/, stopwords: ['의', '에', '는', '이', '가', '을', '를', '와', '과', '에서'] },
];

export const SUPPORTED_LANGUAGES = LANGUAGES.map((l) => l.code);

/** Detecta el idioma de un texto: prioriza alfabeto no latino, luego stopwords. */
export function detectLanguage(text: string): string {
  const sample = text.trim().slice(0, 500);
  if (!sample) return 'es';
  for (const lang of LANGUAGES) {
    if (lang.script && lang.script.test(sample)) return lang.code;
  }
  const words = sample.toLowerCase().split(/[^a-zà-öø-ÿñç]+/).filter(Boolean);
  let best = 'es';
  let bestScore = 0;
  for (const lang of LANGUAGES) {
    const score = words.filter((w) => lang.stopwords.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      best = lang.code;
    }
  }
  return best;
}

/** Normaliza códigos/alias de idioma (castellano->es, english->en, zh-CN->zh). */
export function normalizeLanguage(lang: string | null | undefined): string {
  if (!lang) return 'es';
  const alias: Record<string, string> = {
    castilian: 'es',
    castellano: 'es',
    spanish: 'es',
    english: 'en',
    french: 'fr',
    portuguese: 'pt',
    german: 'de',
    italian: 'it',
    arabic: 'ar',
    hindi: 'hi',
    japanese: 'ja',
    chinese: 'zh',
    russian: 'ru',
    dutch: 'nl',
    turkish: 'tr',
    korean: 'ko',
  };
  const key = lang.toLowerCase().trim();
  if (alias[key]) return alias[key];
  const base = key.split(/[-_]/)[0];
  if (SUPPORTED_LANGUAGES.includes(base)) return base;
  return detectLanguage(lang);
}

export function languageInfo(code: string): LanguageInfo {
  const normalized = normalizeLanguage(code);
  return LANGUAGES.find((l) => l.code === normalized) ?? LANGUAGES[0];
}