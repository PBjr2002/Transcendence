import { getCurrentLanguage, setLanguage, getAvailableLanguages } from '../i18n';

const LANGUAGE_FLAGS = {
	en: '🇬🇧',
	pt: '🇵🇹',
	de: '🇩🇪',
	no: '🇳🇴',
	ja: '🇯🇵',
	wo: '🇸🇳'
} as const;

export class LanguageSelector {
	private container: HTMLElement;
	private currentLang: string;

	constructor(containerId: string) {
		this.container = document.getElementById(containerId) || document.body;
		this.currentLang = getCurrentLanguage();
		this.init();
		this.bindEvents();
	}

	private init(): void {
		this.render();
	}

	private bindEvents(): void {
		window.addEventListener('languageChanged', (event) => {
			const customEvent = event as CustomEvent;
			this.currentLang = customEvent.detail.language;
			this.updateActiveFlag();
		});
	}

	private render(): void {
	  	const availableLanguages = getAvailableLanguages();
	  	const selectorHTML = `
	  	  <div class="language-selector">
	  	    <div class="language-flags">
	  	      ${Object.entries(availableLanguages).map(([code, name]) => `
	  	        <button 
	  	          class="flag-button ${code === this.currentLang ? 'active' : ''}" 
	  	          data-language="${code}"
	  	          title="${name}"
	  	          aria-label="Switch to ${name}"
	  	        >
	  	          <span class="flag-emoji">${LANGUAGE_FLAGS[code as keyof typeof LANGUAGE_FLAGS]}</span>
	  	        </button>
	  	      `).join('')}
	  	    </div>
	  	  </div>
	  	`;
		this.container.innerHTML = selectorHTML;
		this.attachClickHandlers();
	}

	private attachClickHandlers(): void {
	  	const flagButtons = this.container.querySelectorAll('.flag-button');
	  	flagButtons.forEach(button => {
	  		button.addEventListener('click', (event) => {
	  	    	const target = event.currentTarget as HTMLElement;
	  	    	const language = target.getAttribute('data-language');
		
	  	    	if (language && language !== this.currentLang) {
	  	    		setLanguage(language as any);
	  	    		this.currentLang = language;
	  	    		this.updateActiveFlag();
	  	    	}
	  	  	});
	  	});
	}

	private updateActiveFlag(): void {
	  	const flagButtons = this.container.querySelectorAll('.flag-button');
	  	flagButtons.forEach(button => button.classList.remove('active'));
	  	const activeButton = this.container.querySelector(`[data-language="${this.currentLang}"]`);
	  	if (activeButton) {
	  		activeButton.classList.add('active');
	  	}
	}

	public refresh(): void {
		this.currentLang = getCurrentLanguage();
		this.render();
	}
}

export const languageSelectorStyles = `
  .language-selector {
    display: inline-block;
    user-select: none;
  }

  .language-flags {
    display: flex;
    gap: 8px;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    padding: 8px;
    border-radius: 12px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .flag-button {
    background: none;
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    min-height: 40px;
    position: relative;
    overflow: hidden;
  }

  .flag-button:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .flag-button.active {
    border-color: #4CAF50;
    background: rgba(76, 175, 80, 0.1);
    box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
  }

  .flag-button.active:hover {
    border-color: #45a049;
    background: rgba(76, 175, 80, 0.2);
  }

  .flag-emoji {
    font-size: 20px;
    line-height: 1;
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  }

  .flag-button:active {
    transform: translateY(0);
    transition: transform 0.1s ease;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .language-flags {
      gap: 6px;
      padding: 6px;
    }
    
    .flag-button {
      min-width: 36px;
      min-height: 36px;
      padding: 4px;
    }
    
    .flag-emoji {
      font-size: 18px;
    }
  }

  /* Accessibility improvements */
  .flag-button:focus {
    outline: none;
    border-color: #2196F3;
    box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.3);
  }

  .flag-button:focus:not(:hover) {
    background: rgba(33, 150, 243, 0.1);
  }
`;

export function injectLanguageSelectorStyles(): void {
	if (!document.getElementById('language-selector-styles')) {
		const styleElement = document.createElement('style');
		styleElement.id = 'language-selector-styles';
		styleElement.textContent = languageSelectorStyles;
		document.head.appendChild(styleElement);
	}
}
