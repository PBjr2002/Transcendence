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

function getValue(obj: TranslationObject, path: string): string | undefined {
	return path.split('.').reduce((current: any, key) => {
		return (current && current[key] !== undefined ? current[key] : undefined);
	}, obj);
}

export function initI18n(): void {
	fetch('/api/lang', {
		method: 'GET',
		credentials: 'include',
		headers: { "Content-Type": "application/json" }
	})
	.then(async (res) => {
		return res.json();
	})
	.then((response) => {
		currentLanguage = response.data.app_language;
	})
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
		const newLanguage: string = language;
		const newLanguageObj = {
			newLanguage: newLanguage
		}
		fetch('/api/lang', {
			method: 'POST',
			credentials: 'include',
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(newLanguageObj)
		});

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
