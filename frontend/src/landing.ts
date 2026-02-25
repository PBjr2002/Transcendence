import './global.css'
import { getUserInfo, createUser, applyTheme, updateLegalFooter } from './app';
import { loginWithCredentials, twoFALogin } from './login';
import { getCurrentLanguage, t } from './i18n';
import { navigate, replace } from './router';
import { LanguageSelector, injectLanguageSelectorStyles } from './components/LanguageSelector';

interface LandingOptions {
	openLogin?: boolean;
}

let animationFrameId: number | null = null;
let resizeHandler: (() => void) | null = null;
let keydownHandler: ((event: KeyboardEvent) => void) | null = null;
let languageHandler: ((event: Event) => void) | null = null;

function stopBackgroundAnimation() {
	if (animationFrameId !== null) {
		cancelAnimationFrame(animationFrameId);
		animationFrameId = null;
	}
	if (resizeHandler) {
		window.removeEventListener('resize', resizeHandler);
		resizeHandler = null;
	}
}

function cleanupLandingListeners() {
	stopBackgroundAnimation();
	if (keydownHandler) {
		window.removeEventListener('keydown', keydownHandler);
		keydownHandler = null;
	}
	if (languageHandler) {
		window.removeEventListener('languageChanged', languageHandler as EventListener);
		languageHandler = null;
	}
}

function startBackgroundAnimation(root: HTMLElement) {
	const ball = root.querySelector<HTMLDivElement>('#bouncing-ball');
	const paddleLeft = root.querySelector<HTMLDivElement>('#paddle-left');
	const paddleRight = root.querySelector<HTMLDivElement>('#paddle-right');
	if (!ball || !paddleLeft || !paddleRight)
		return;

	const BALL_W = 50;
	const BALL_H = 50;
	const PADDLE_W = 60;
	const PADDLE_H = 60;
	const PADDLE_LEFT_X = 40;
	const PADDLE_RIGHT_MARGIN = 40;
	const OUTER_MARGIN = 30;
	const MAX_SPEED = 35;

	const bounds = {
		left: OUTER_MARGIN,
		top: OUTER_MARGIN,
		right: window.innerWidth - OUTER_MARGIN - BALL_W,
		bottom: window.innerHeight - OUTER_MARGIN - BALL_H,
	};

	const recalcBounds = () => {
		bounds.right = window.innerWidth - OUTER_MARGIN - BALL_W;
		bounds.bottom = window.innerHeight - OUTER_MARGIN - BALL_H;
	};

	let x = bounds.left + Math.random() * Math.max(0, bounds.right - bounds.left);
	let y = bounds.top + Math.random() * Math.max(0, bounds.bottom - bounds.top);
	let vx = (Math.random() - 0.5) * 32 || 4;
	let vy = (Math.random() - 0.5) * 32 || 4;
	let time = 0;

	const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

	resizeHandler = () => {
		recalcBounds();
		x = clamp(x, bounds.left, bounds.right);
		y = clamp(y, bounds.top, bounds.bottom);
	};
	window.addEventListener('resize', resizeHandler);

	const getPaddleRightX = () => window.innerWidth - PADDLE_RIGHT_MARGIN - PADDLE_W;

	const animate = () => {
		time += 0.02;
		const range = window.innerHeight - 120;
		const normalized = (Math.sin(time) + 1) / 2;
		const paddleY = 60 + normalized * range;
		const paddleTop = paddleY - PADDLE_H / 2;
		const paddleBottom = paddleY + PADDLE_H / 2;

		paddleLeft.style.top = `${paddleTop}px`;
		paddleRight.style.top = `${paddleTop}px`;

		x += vx;
		y += vy;

		let hitHorizontal = false;
		let hitVertical = false;

		if (x <= bounds.left) {
			x = bounds.left;
			vx = -vx;
			hitHorizontal = true;
		}
		if (x >= bounds.right) {
			x = bounds.right;
			vx = -vx;
			hitHorizontal = true;
		}
		if (y <= bounds.top) {
			y = bounds.top;
			vy = -vy;
			hitVertical = true;
		}
		if (y >= bounds.bottom) {
			y = bounds.bottom;
			vy = -vy;
			hitVertical = true;
		}

		if (hitHorizontal || hitVertical) {
			const BORDER_ACCEL = 1.04;
			const CORNER_ACCEL = 1.12;
			const accel = hitHorizontal && hitVertical ? CORNER_ACCEL : BORDER_ACCEL;
			let speed = Math.sqrt(vx * vx + vy * vy) * accel;
			if (speed > MAX_SPEED)
				speed = MAX_SPEED;
			const angle = Math.atan2(vy, vx);
			vx = Math.cos(angle) * speed;
			vy = Math.sin(angle) * speed;
		}

		const paddleLeftX = PADDLE_LEFT_X;
		const paddleRightX = getPaddleRightX();

		if (x + BALL_W >= paddleLeftX && x <= paddleLeftX + PADDLE_W && y + BALL_H >= paddleTop && y <= paddleBottom) {
			const ballCenterY = y + BALL_H / 2;
			const paddleCenterY = paddleTop + PADDLE_H / 2;
			const offset = (ballCenterY - paddleCenterY) / (PADDLE_H / 2);
			x = paddleLeftX + PADDLE_W;
			vx = Math.abs(vx) || 6;
			vy += offset * 6;
			let speed = Math.sqrt(vx * vx + vy * vy) * 1.08;
			if (speed > MAX_SPEED)
				speed = MAX_SPEED;
			const angle = Math.atan2(vy, vx);
			vx = Math.cos(angle) * speed;
			vy = Math.sin(angle) * speed;
		}

		if (x <= paddleRightX + PADDLE_W && x + BALL_W >= paddleRightX && y + BALL_H >= paddleTop && y <= paddleBottom) {
			const ballCenterY = y + BALL_H / 2;
			const paddleCenterY = paddleTop + PADDLE_H / 2;
			const offset = (ballCenterY - paddleCenterY) / (PADDLE_H / 2);
			x = paddleRightX - BALL_W;
			vx = -Math.abs(vx) || -6;
			vy += offset * 6;
			let speed = Math.sqrt(vx * vx + vy * vy) * 1.08;
			if (speed > MAX_SPEED)
				speed = MAX_SPEED;
			const angle = Math.atan2(vy, vx);
			vx = Math.cos(angle) * speed;
			vy = Math.sin(angle) * speed;
		}

		ball.style.left = `${x}px`;
		ball.style.top = `${y}px`;
		animationFrameId = requestAnimationFrame(animate);
	};

	x = clamp(x, bounds.left, bounds.right);
	y = clamp(y, bounds.top, bounds.bottom);
	animationFrameId = requestAnimationFrame(animate);
}

function applyLandingTranslations(root: HTMLElement) {
	const signBtn = root.querySelector<HTMLButtonElement>('#sign-btn');
	if (signBtn)
		signBtn.textContent = t('buttons.login');
	const guestBtn = root.querySelector<HTMLButtonElement>('#guest-btn');
	if (guestBtn)
		guestBtn.textContent = t('auth.continueGuest');
	const modalTitle = root.querySelector<HTMLHeadingElement>('#modal-title');
	if (modalTitle) {
		const mode = modalTitle.dataset.mode === 'signup' ? 'signup' : 'login';
		modalTitle.textContent = mode === 'signup' ? t('auth.createAccount') : t('auth.welcomeBack');
	}
	const modalCopy = root.querySelector<HTMLParagraphElement>('#modal-copy');
	if (modalCopy) {
		const mode = modalCopy.dataset.mode === 'signup' ? 'signup' : 'login';
		modalCopy.textContent = mode === 'signup' ? t('auth.signupSubtitle') : t('auth.signIn');
	}
	const loginUsername = root.querySelector<HTMLInputElement>('#login-username');
	if (loginUsername)
		loginUsername.placeholder = t('forms.username');
	const loginPassword = root.querySelector<HTMLInputElement>('#login-password');
	if (loginPassword)
		loginPassword.placeholder = t('forms.password');
	const loginSubmit = root.querySelector<HTMLButtonElement>('#login-submit');
	if (loginSubmit)
		loginSubmit.textContent = t('buttons.login');
	const signupName = root.querySelector<HTMLInputElement>('#signup-name');
	if (signupName)
		signupName.placeholder = t('forms.username');
	const signupEmail = root.querySelector<HTMLInputElement>('#signup-email');
	if (signupEmail)
		signupEmail.placeholder = t('forms.email');
	const signupPassword = root.querySelector<HTMLInputElement>('#signup-password');
	if (signupPassword)
		signupPassword.placeholder = t('forms.password');
	const signupSubmit = root.querySelector<HTMLButtonElement>('#signup-submit');
	if (signupSubmit)
		signupSubmit.textContent = t('auth.createAccount');
	const loginTab = root.querySelector<HTMLButtonElement>('[data-auth-tab="login"]');
	if (loginTab)
		loginTab.textContent = t('buttons.login');
	const signupTab = root.querySelector<HTMLButtonElement>('[data-auth-tab="signup"]');
	if (signupTab)
		signupTab.textContent = t('auth.createAccount');

	updateLegalFooter();
}

function patchTwoFAStyles(form: HTMLFormElement) {
	const input = form.querySelector('input[type="text"]');
	if (input)
		input.className = 'modal-input';
	const submit = form.querySelector('button');
	if (submit)
		submit.className = 'submit';
}

function attachModalInteractions(root: HTMLElement, options: LandingOptions) {
	const modal = root.querySelector<HTMLDivElement>('#auth-modal');
	const dialog = modal?.querySelector<HTMLDivElement>('.modal');
	const signBtn = root.querySelector<HTMLButtonElement>('#sign-btn');
	const loginForm = root.querySelector<HTMLFormElement>('#login-form');
	const signupForm = root.querySelector<HTMLFormElement>('#signup-form');
	const modalTitle = root.querySelector<HTMLHeadingElement>('#modal-title');
	const modalCopy = root.querySelector<HTMLParagraphElement>('#modal-copy');
	const feedback = root.querySelector<HTMLParagraphElement>('#login-feedback');
	const tabButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-auth-tab]'));

	if (!modal || !dialog || !signBtn || !loginForm || !signupForm || !modalTitle)
		return;

	let usernameInput = root.querySelector<HTMLInputElement>('#login-username');
	let passwordInput = root.querySelector<HTMLInputElement>('#login-password');
	let submitBtn = root.querySelector<HTMLButtonElement>('#login-submit');

	const updateLoginRefs = () => {
		usernameInput = loginForm.querySelector<HTMLInputElement>('#login-username');
		passwordInput = loginForm.querySelector<HTMLInputElement>('#login-password');
		submitBtn = loginForm.querySelector<HTMLButtonElement>('#login-submit');
	};

	const renderLoginFields = () => {
		loginForm.innerHTML = `
			<input class="modal-input" id="login-username" type="text" placeholder="${t('forms.username')}" autocomplete="username" data-auth="username" />
			<input class="modal-input" id="login-password" type="password" placeholder="${t('forms.password')}" autocomplete="current-password" />
			<button id="login-submit" class="submit" type="submit">${t('buttons.login')}</button>
		`;
		updateLoginRefs();
	};

	const setActiveTab = (mode: 'login' | 'signup') => {
		const targetMode = mode === 'signup' ? 'signup' : 'login';
		tabButtons.forEach((btn) => {
			const isActive = btn.dataset.authTab === targetMode;
			btn.classList.toggle('active', isActive);
			btn.setAttribute('aria-selected', String(isActive));
		});
		loginForm.classList.toggle('active', targetMode === 'login');
		loginForm.setAttribute('aria-hidden', targetMode === 'login' ? 'false' : 'true');
		signupForm.classList.toggle('active', targetMode === 'signup');
		signupForm.setAttribute('aria-hidden', targetMode === 'signup' ? 'false' : 'true');
		if (modalTitle)
			modalTitle.dataset.mode = targetMode;
		if (modalCopy)
			modalCopy.dataset.mode = targetMode;
		applyLandingTranslations(root);
	};

	tabButtons.forEach((btn) => {
		btn.addEventListener('click', () => {
			const target = btn.dataset.authTab === 'signup' ? 'signup' : 'login';
			setActiveTab(target);
		});
	});

	const handleClose = () => {
		modal.classList.remove('open');
		modal.setAttribute('aria-hidden', 'true');
		feedback?.setAttribute('data-status', '');
		if (feedback)
			feedback.textContent = '';
		renderLoginFields();
		applyLandingTranslations(root);
		setActiveTab('login');
	};

	const handleOpen = () => {
		modal.classList.add('open');
		modal.setAttribute('aria-hidden', 'false');
		setActiveTab('login');
		usernameInput?.focus();
	};

	const handleLoginSuccess = async () => {
		handleClose();
		cleanupLandingListeners();
		document.body.classList.remove('landing-mode');
		navigate('/home');
	};

	const submitHandler = (event: Event) => {
		event.preventDefault();
		if (feedback)
			feedback.textContent = '';
		if (!usernameInput || !passwordInput || !submitBtn)
			return;
		loginWithCredentials(usernameInput.value.trim(), passwordInput.value.trim(), {
			form: loginForm,
			heading: modalTitle,
			submitButton: submitBtn,
			onSuccess: handleLoginSuccess,
			onRequireTwoFA: (user) => {
				twoFALogin(loginForm, modalTitle, user);
				patchTwoFAStyles(loginForm);
			},
			onError: (message) => {
				if (feedback) {
					feedback.textContent = message;
					feedback.dataset.status = 'error';
				}
			},
		});
	};

	renderLoginFields();
	loginForm.addEventListener('submit', submitHandler);

	const signupHandler = async (event: Event) => {
		event.preventDefault();
		const nameInput = signupForm.querySelector<HTMLInputElement>('#signup-name');
		const emailInput = signupForm.querySelector<HTMLInputElement>('#signup-email');
		const passwordInput = signupForm.querySelector<HTMLInputElement>('#signup-password');
		const submit = signupForm.querySelector<HTMLButtonElement>('#signup-submit');
		if (!nameInput || !emailInput || !passwordInput || !submit)
			return;
		submit.disabled = true;
		try {
			await createUser({
				name: nameInput.value.trim(),
				email: emailInput.value.trim(),
				password: passwordInput.value.trim(),
			});
			nameInput.value = '';
			emailInput.value = '';
			passwordInput.value = '';
			if (feedback) {
				feedback.textContent = t('auth.signupSuccess');
				feedback.dataset.status = 'success';
				feedback.style.color = 'green';
			}
		}
		catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (feedback) {
				feedback.textContent = message;
				feedback.dataset.status = 'error';
				feedback.style.color = 'red';
			}
		}
		finally {
			submit.disabled = false;
		}
	};
	signupForm.addEventListener('submit', signupHandler);

	if (!keydownHandler) {
		keydownHandler = (event: KeyboardEvent) => {
			if (event.key === 'Escape')
				handleClose();
		};
		window.addEventListener('keydown', keydownHandler);
	}

	modal.addEventListener('click', () => handleClose());
	dialog.addEventListener('click', (event) => event.stopPropagation());
	signBtn.addEventListener('click', () => handleOpen());

	if (options.openLogin)
		handleOpen();
}

export async function renderLandingPage(options: LandingOptions = {}) {
	const app = document.querySelector<HTMLDivElement>('#app');
	if (!app)
		return;

	// Reset app container classes to avoid layout conflicts
	app.className = '';
	
	document.body.classList.remove('app-mode');
	document.body.classList.remove('landing-mode');
	document.body.classList.add('landing-mode');

	cleanupLandingListeners();

	let storedUser: any = null;
	try {
		storedUser = await getUserInfo();
	}
	catch {
		storedUser = null;
	}

	if (storedUser && storedUser.data && storedUser.data.safeUser) {
		applyTheme('app');
		cleanupLandingListeners();
		replace('/home');
		return;
	}

	const lang = getCurrentLanguage();
	const suffix = lang === 'en' ? '' : `-${lang}`;
	app.innerHTML = `
		<div class="landing-shell">
			<div id="bouncing-ball" class="bouncing-ball"></div>
			<div id="paddle-left" class="paddle paddle-left"></div>
			<div id="paddle-right" class="paddle paddle-right"></div>
			<div id="language-selector-container-auth" style="position: absolute; top: 50px; right: 50px; z-index: 1000;"></div>
			<div class="landing-content">
				<div class="landing-actions">
					<button id="sign-btn" class="btn">${t('buttons.login')}</button>
				</div>
				<div id="auth-modal" class="modal-overlay" role="dialog" aria-modal="true" aria-hidden="true">
					<div class="modal auth-modal" role="document">
						<div class="auth-panel">
							<div class="auth-header">
								<h3 id="modal-title" data-mode="login">${t('auth.welcomeBack')}</h3>
							<p id="modal-copy" data-mode="login">${t('auth.signIn')}</p>
						</div>
							<div class="auth-tabs" role="tablist">
								<button type="button" class="auth-tab active" data-auth-tab="login" aria-selected="true">${t('buttons.login')}</button>
								<button type="button" class="auth-tab" data-auth-tab="signup" aria-selected="false">${t('auth.createAccount')}</button>
							</div>
							<div class="auth-form-stack">
								<form id="login-form" class="auth-form active" aria-label="Log in form">
									<input class="modal-input" id="login-username" type="text" placeholder="${t('forms.username')}" autocomplete="username" data-auth="username" />
									<input class="modal-input" id="login-password" type="password" placeholder="${t('forms.password')}" autocomplete="current-password" />
									<button id="login-submit" class="submit" type="submit">${t('buttons.login')}</button>
								</form>
								<form id="signup-form" class="auth-form" aria-label="Sign up form">
									<input class="modal-input" id="signup-name" type="text" placeholder="${t('forms.username')}" autocomplete="name" />
									<input class="modal-input" id="signup-email" type="email" placeholder="${t('forms.email')}" autocomplete="email" />
									<input class="modal-input" id="signup-password" type="password" placeholder="${t('forms.password')}" autocomplete="new-password" />
									<button id="signup-submit" class="submit" type="submit">${t('auth.createAccount')}</button>
								</form>
							</div>
							<p id="login-feedback" class="modal-feedback" aria-live="polite"></p>
						</div>
					</div>
				</div>
			</div>
			<footer data-legal-footer style="position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%); text-align: center; font-size: 12px; opacity: 0.7; z-index: 100;">
				<a href="/privacy${suffix}.html" target="_blank" style="color: #00b4ff; text-decoration: none; margin: 0 15px;">${t('FooterLinks.privacyPolicy')}</a>
				<a href="/terms${suffix}.html" target="_blank" style="color: #00b4ff; text-decoration: none; margin: 0 15px;">${t('FooterLinks.termsOfService')}</a>
			</footer>
		</div>
	`;

	const landingRoot = app.querySelector<HTMLElement>('.landing-shell');
	if (!landingRoot)
		return;

	applyLandingTranslations(landingRoot);

	injectLanguageSelectorStyles();
	new LanguageSelector('language-selector-container-auth');

	languageHandler = () => {
		applyLandingTranslations(landingRoot);
	};
	window.addEventListener('languageChanged', languageHandler as EventListener);

	attachModalInteractions(landingRoot, options);
	startBackgroundAnimation(landingRoot);
}

export function teardownLanding() {
	cleanupLandingListeners();
	document.body.classList.remove('landing-mode');
}
