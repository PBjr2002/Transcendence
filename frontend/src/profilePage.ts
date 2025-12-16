import './global.css';
import { t } from './i18n';
import { getUserInfo, logoutUser } from './app';
import { navigate } from './router';
import { LanguageSelector, injectLanguageSelectorStyles } from './components/LanguageSelector';

let profileTranslationHandler: (() => void) | null = null;

function resetProfileTranslations() {
	if (profileTranslationHandler) {
		window.removeEventListener('languageChanged', profileTranslationHandler);
		profileTranslationHandler = null;
	}
}

async function fetchAvatarUrl(): Promise<string | null> {
	try {
		const res = await fetch('/api/users/profile_picture', {
			method: 'GET',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
		});
		if (!res.ok)
			return null;
		const data = await res.json();
		return data?.data?.url || null;
	}
	catch (error) {
		console.error('Failed to load avatar:', error);
		return null;
	}
}

export async function loadProfilePage() {
	resetProfileTranslations();

	document.body.classList.remove('landing-mode');
	document.body.classList.add('app-mode');

	const app = document.querySelector<HTMLDivElement>('#app');
	if (!app)
		return;

	app.innerHTML = '';
	app.classList.add('app-shell', 'profile-shell');

	injectLanguageSelectorStyles();

	let userPayload;
	try {
		userPayload = await getUserInfo();
	}
	catch (error) {
		console.error('Failed to fetch user info for profile:', error);
		userPayload = null;
	}

	const safeUser = userPayload?.data?.safeUser;
	if (!safeUser) {
		navigate('/login');
		return;
	}

	const displayName = safeUser.name || t('auth.guest');
	const email = safeUser.email || '';
	const info = safeUser.info || '';

	const avatarUrl = await fetchAvatarUrl();

	const topBar = document.createElement('header');
	topBar.className = 'profile-top-bar';

	const brand = document.createElement('div');
	brand.className = 'profile-brand';
	const brandTitle = document.createElement('strong');
	brandTitle.textContent = 'Transcendence';
	const brandSubtitle = document.createElement('span');
	brandSubtitle.dataset.role = 'profile-subtitle';
	brandSubtitle.textContent = t('profile.userInfo');
	brand.append(brandTitle, brandSubtitle);
	topBar.appendChild(brand);

	const topControls = document.createElement('div');
	topControls.className = 'profile-top-controls';

	const homeButton = document.createElement('button');
	homeButton.className = 'profile-nav-button';
	homeButton.dataset.role = 'profile-home-button';
	homeButton.textContent = t('nav.home');
	homeButton.addEventListener('click', () => navigate('/home'));
	topControls.appendChild(homeButton);

	const logoutButton = document.createElement('button');
	logoutButton.className = 'profile-nav-button primary';
	logoutButton.dataset.role = 'profile-logout-button';
	logoutButton.textContent = t('profile.logout');
	logoutButton.addEventListener('click', async () => {
		logoutButton.disabled = true;
		try {
			await logoutUser(safeUser.name);
			navigate('/');
		}
		catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			alert(`${t('errors.logoutFailed')}: ${message}`);
		}
		finally {
			logoutButton.disabled = false;
		}
	});
	topControls.appendChild(logoutButton);

	const languageSelectorContainer = document.createElement('div');
	languageSelectorContainer.id = 'language-selector-container';
	topControls.appendChild(languageSelectorContainer);

	topBar.appendChild(topControls);
	app.appendChild(topBar);

	const content = document.createElement('div');
	content.className = 'profile-content';
	app.appendChild(content);

	const identityCard = document.createElement('section');
	identityCard.className = 'profile-card glass-panel';

	const avatar = document.createElement('div');
	avatar.className = 'profile-avatar';
	if (avatarUrl)
		avatar.style.backgroundImage = `url(${avatarUrl})`;
	else {
		avatar.textContent = displayName.slice(0, 2).toUpperCase();
		avatar.classList.add('fallback');
	}
	identityCard.appendChild(avatar);

	const nameHeading = document.createElement('h1');
	nameHeading.dataset.role = 'profile-name';
	nameHeading.textContent = displayName;
	identityCard.appendChild(nameHeading);

	const emailLine = document.createElement('p');
	emailLine.dataset.role = 'profile-email';
	emailLine.textContent = email || t('auth.signIn');
	identityCard.appendChild(emailLine);

	if (info) {
		const infoLine = document.createElement('p');
		infoLine.dataset.role = 'profile-info';
		infoLine.textContent = info;
		identityCard.appendChild(infoLine);
	}

	content.appendChild(identityCard);

	const statsCard = document.createElement('section');
	statsCard.className = 'profile-stats-card glass-panel';

	const statsTitle = document.createElement('h2');
	statsTitle.dataset.role = 'profile-stats-title';
	statsTitle.textContent = t('profile.stats') || 'Player Stats';
	statsCard.appendChild(statsTitle);

	const statsPlaceholder = document.createElement('div');
	statsPlaceholder.className = 'profile-stats-placeholder';
	statsPlaceholder.dataset.role = 'profile-stats-placeholder';
	statsPlaceholder.textContent = t('profile.statsPlaceholder') || 'Your match history and rankings will live here soon.';
	statsCard.appendChild(statsPlaceholder);

	content.appendChild(statsCard);

	new LanguageSelector('language-selector-container');

	const updateTranslations = () => {
		brandSubtitle.textContent = t('profile.userInfo');
		homeButton.textContent = t('nav.home');
		logoutButton.textContent = t('profile.logout');
		statsTitle.textContent = t('profile.stats') || 'Player Stats';
		statsPlaceholder.textContent = t('profile.statsPlaceholder') || 'Your match history and rankings will live here soon.';
		if (!email)
			emailLine.textContent = t('auth.signIn');
	};

	updateTranslations();
	profileTranslationHandler = updateTranslations;
	window.addEventListener('languageChanged', profileTranslationHandler);
}
