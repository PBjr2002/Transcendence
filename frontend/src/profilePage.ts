import './global.css';
import { getCurrentLanguage, t } from './i18n';
import { getUserInfo, logoutUser, updateLegalFooter } from './app';
import { navigate } from './router';
import { LanguageSelector, injectLanguageSelectorStyles } from './components/LanguageSelector';
import { render2FAPageInline } from './enable2FA';

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

async function uploadProfilePicture(userId: number, file: File): Promise<string> {
	const formData = new FormData();
	formData.append('file', file);

	const res = await fetch(`/api/users/${userId}/profile_picture`, {
		method: 'PUT',
		credentials: 'include',
		body: formData
	});

	if (!res.ok) {
		const err = await res.text().catch(() => null);
		throw new Error(`Upload failed: ${res.status} ${res.statusText} ${err || ''}`);
	}

	const data = await res.json().catch(() => ({}));
	const url = data?.data?.url || data.url || (data.filename ? `/profile_pictures/${data.filename}` : (data.fileName ? `/profile_pictures/${data.fileName}` : null));
	if (!url)
		throw new Error('Upload failed: missing url');
	return url;
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
	app.style.display = 'flex';
	app.style.flexDirection = 'column';
	app.style.gap = '32px';

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
	// const info = safeUser.info || '';

	const avatarUrl = await fetchAvatarUrl();

	const topBar = document.createElement('header');
	topBar.className = 'profile-top-bar';

	const brand = document.createElement('div');
	brand.className = 'profile-brand';
	const brandTitle = document.createElement('strong');
	brandTitle.textContent = 'Hockey Pong';
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
	avatar.style.cursor = 'pointer';

	const avatarInput = document.createElement('input');
	avatarInput.type = 'file';
	avatarInput.accept = 'image/png, image/jpeg, image/webp';
	avatarInput.style.display = 'none';

	avatar.addEventListener('click', () => avatarInput.click());
	avatarInput.addEventListener('change', async () => {
		const file = avatarInput.files?.[0];
		if (!file)
			return;
		try {
			const imageUrl = await uploadProfilePicture(safeUser.id, file);
			avatar.style.backgroundImage = `url(${imageUrl}?t=${Date.now()})`;
			avatar.textContent = '';
			avatar.classList.remove('fallback');
		}
		catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			alert(`${t('userEdit.updateError')}: ${message}`);
		}
		finally {
			avatarInput.value = '';
		}
	});

	identityCard.appendChild(avatar);
	identityCard.appendChild(avatarInput);

	const nameHeading = document.createElement('h1');
	nameHeading.dataset.role = 'profile-name';
	nameHeading.textContent = displayName;
	identityCard.appendChild(nameHeading);

	const emailLine = document.createElement('p');
	emailLine.dataset.role = 'profile-email';
	emailLine.textContent = email || t('auth.signIn');
	identityCard.appendChild(emailLine);

	// if (info) { // n entendi direito oq e a userinfo
	// 	const infoLine = document.createElement('p');
	// 	infoLine.dataset.role = 'profile-info';
	// 	infoLine.textContent = info;
	// 	identityCard.appendChild(infoLine);
	// }

	content.appendChild(identityCard);

	const statsCard = document.createElement('section');
	statsCard.className = 'profile-stats-card glass-panel';

	const statsTitle = document.createElement('h2');
	statsTitle.dataset.role = 'profile-stats-title';
	statsTitle.textContent = t('profile.stats') || 'Stats';
	statsCard.appendChild(statsTitle);

	const statsContent = document.createElement('div');
	statsContent.className = 'profile-stats-content';
	statsCard.appendChild(statsContent);

	try {
		const statsRes = await fetch('/api/users/gameScreen', { credentials: 'include' });
		if (statsRes.ok) {
			const statsData = await statsRes.json();
			const wins = statsData.wins || 0;
			const losses = statsData.losses || 0;
			const total = wins + losses;
			const ratio = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

			const ratioContainer = document.createElement('div');
			ratioContainer.style.display = 'flex';
			ratioContainer.style.flexDirection = 'column';
			ratioContainer.style.alignItems = 'center';
			ratioContainer.style.gap = '8px';
			ratioContainer.style.padding = '24px';

			const ratioLabel = document.createElement('span');
			ratioLabel.textContent = 'Win Ratio';
			ratioLabel.style.fontSize = '0.9rem';
			ratioLabel.style.opacity = '0.7';
			ratioLabel.style.textTransform = 'uppercase';
			ratioLabel.style.letterSpacing = '0.05em';

			const ratioValue = document.createElement('span');
			ratioValue.textContent = `${ratio}%`;
			ratioValue.style.fontSize = '3rem';
			ratioValue.style.fontWeight = '700';
			ratioValue.style.color = '#36fba1';
			ratioValue.style.lineHeight = '1';

			const detailText = document.createElement('span');
			detailText.textContent = `${wins}W - ${losses}L`;
			detailText.style.fontSize = '1rem';
			detailText.style.opacity = '0.9';
			detailText.style.marginTop = '4px';

			ratioContainer.append(ratioLabel, ratioValue, detailText);
			statsContent.appendChild(ratioContainer);
		} else {
			const statsPlaceholder = document.createElement('div');
			statsPlaceholder.className = 'profile-stats-placeholder';
			statsPlaceholder.dataset.role = 'profile-stats-placeholder';
			statsPlaceholder.textContent = t('profile.statsPlaceholder') || 'Your match history and rankings will live here soon.';
			statsContent.appendChild(statsPlaceholder);
		}
	} catch (e) {
		console.error('Failed to load stats', e);
		const statsPlaceholder = document.createElement('div');
		statsPlaceholder.className = 'profile-stats-placeholder';
		statsPlaceholder.dataset.role = 'profile-stats-placeholder';
		statsPlaceholder.textContent = t('profile.statsPlaceholder') || 'Your match history and rankings will live here soon.';
		statsContent.appendChild(statsPlaceholder);
	}

	content.appendChild(statsCard);

	// Add 2FA section
	const loggedUser = userPayload;
	const twoFASection = await render2FAPageInline(loggedUser);
	twoFASection.className = 'profile-2fa-card';
	content.appendChild(twoFASection);

	const lang = getCurrentLanguage();
	const suffix = lang === 'en' ? '' : `-${lang}`;
	const legalFooter = document.createElement('footer');
	legalFooter.style.cssText = `
		position: fixed;
		left: 50%;
		bottom: 80px;
		transform: translateX(-50%);
		text-align: center;
		font-size: 12px;
		opacity: 0.7;
		z-index: 10;
	`;
	legalFooter.setAttribute('data-legal-footer', '');
	legalFooter.innerHTML = `
		<a href="/privacy${suffix}.html" target="_blank" style="color: #00b4ff; text-decoration: none; margin: 0 12px;">${t('FooterLinks.privacyPolicy')}</a>
		<a href="/terms${suffix}.html" target="_blank" style="color: #00b4ff; text-decoration: none; margin: 0 12px;">${t('FooterLinks.termsOfService')}</a>
	`;
	app.appendChild(legalFooter);

	new LanguageSelector('language-selector-container');

	const updateTranslations = () => {
		brandSubtitle.textContent = t('profile.userInfo');
		homeButton.textContent = t('nav.home');
		logoutButton.textContent = t('profile.logout');
		statsTitle.textContent = t('profile.stats') || 'Stats';
		
		const placeholder = statsContent.querySelector('.profile-stats-placeholder');
		if (placeholder) {
			placeholder.textContent = t('profile.statsPlaceholder') || 'Your match history and rankings will live here soon.';
		}
		
		if (!email)
			emailLine.textContent = t('auth.signIn');

		updateLegalFooter();
	};

	updateTranslations();
	profileTranslationHandler = updateTranslations;
	window.addEventListener('languageChanged', profileTranslationHandler);
}
