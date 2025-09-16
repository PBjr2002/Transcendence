import en from './locales/en.json';
import pt from './locales/pt.json';
import de from './locales/de.json';
import no from './locales/no.json';
import ja from './locales/ja.json';
import wo from './locales/wo.json';

type TranslationKey = string;
type LanguageCode = 'en' | 'pt' | 'de' | 'no' | 'ja' | 'wo';
type TranslationObject = Record<string, any>;

export const AVAILABLE_LANGUAGES = {
	en: 'English',
	pt: 'Português',
	de: 'Deutsch',
	no: 'Norsk',
	ja: '日本語',
	wo: 'Wolof'
} as const;

const translations: Record<LanguageCode, TranslationObject> = {
	en,
	pt,
	de,
	no,
	ja,
	wo
};

let currentLanguage: LanguageCode = 'en';

const LANGUAGE_STORAGE_KEY = 'app_language';

function getValue(obj: TranslationObject, path: string): string | undefined {
	return path.split('.').reduce((current: any, key) => {
		return (current && current[key] !== undefined ? current[key] : undefined);
	}, obj);
}

function detectBrowserLanguage(): LanguageCode {
	const browserLang = navigator.language.toLowerCase();

	if (browserLang.startsWith('pt'))
		return 'pt';
	if (browserLang.startsWith('de'))
		return 'de';
	if (browserLang.startsWith('no') || browserLang.startsWith('nb') || browserLang.startsWith('nn'))
		return 'no';
  	if (browserLang.startsWith('ja'))
		return 'ja';
  	if (browserLang.startsWith('wo'))
		return 'wo';
	return ('en');
}

export function initI18n(): void {
	const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode;
  
	if (savedLanguage && savedLanguage in translations) {
		currentLanguage = savedLanguage;
	} 
	else {
		currentLanguage = detectBrowserLanguage();
		localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
	}
}

export function t(key: TranslationKey, params?: Record<string, string | number>): string {
	const translation = getValue(translations[currentLanguage], key);
  	const fallback = currentLanguage !== 'en' ? getValue(translations.en, key) : undefined;
  	let result = translation || fallback || key;
  
	if (params && typeof result === 'string') {
		Object.entries(params).forEach(([paramKey, value]) => {
			result = result.replace(new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g'), String(value));
		});
	}
	return result;
}

export function setLanguage(language: LanguageCode): void {
	if (language in translations) {
	  	currentLanguage = language;
	  	localStorage.setItem(LANGUAGE_STORAGE_KEY, language);

	  	window.dispatchEvent(new CustomEvent('languageChanged', { 
	  		detail: { language } 
	  	}));
	} 
	else {
		console.warn(`Language '${language}' is not supported`);
  	}
}

export function getCurrentLanguage(): LanguageCode {
	return (currentLanguage);
}

export function getAvailableLanguages(): typeof AVAILABLE_LANGUAGES {
	return (AVAILABLE_LANGUAGES);
}

export function isLanguageSupported(language: string): language is LanguageCode {
	return (language in translations);
}

initI18n();
