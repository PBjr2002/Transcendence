import './global.css';
import { getCurrentLanguage, t } from './i18n';
import { LanguageSelector, injectLanguageSelectorStyles } from './components/LanguageSelector';
import { navigate } from './router';
import { webSocketService } from './websocket';

let homepageMenuHandler: ((event: MouseEvent) => void) | null = null;
let homepageFriendsRefreshHandler: (() => void) | null = null;

export function updateLegalFooter() {
	const footer = document.querySelector<HTMLElement>('[data-legal-footer]');
	if (!footer)
		return;
	const lang = getCurrentLanguage();
	const suffix = lang === 'en' ? '' : `-${lang}`;
	footer.innerHTML = `
		<a href="/privacy${suffix}.html" target="_blank" style="color: #00b4ff; text-decoration: none; margin: 0 12px;">${t('FooterLinks.privacyPolicy')}</a>
		<a href="/terms${suffix}.html" target="_blank" style="color: #00b4ff; text-decoration: none; margin: 0 12px;">${t('FooterLinks.termsOfService')}</a>
	`;
}

export function applyTheme(mode: 'landing' | 'app') {
	document.body.classList.remove('landing-mode', 'app-mode');
	document.body.classList.add(`${mode}-mode`);
}

async function sendFriendRequestByUsername(username: string): Promise<{ success: boolean; message: string }> {
	const trimmed = username.trim();
	if (!trimmed)
		return { success: false, message: t('friends.enterUsernameError') };
	try {
		const lookup = await fetch(`/api/users/name/${encodeURIComponent(trimmed)}`, {
			method: 'GET',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
		});
		if (lookup.status === 404)
			return { success: false, message: t('friends.userNotFound') };
		if (!lookup.ok)
			return { success: false, message: lookup.statusText || t('friends.errorOccurred') };
		const userResponse = await lookup.json();
		const target = userResponse.data || userResponse;
		if (!target?.id)
			return { success: false, message: t('friends.errorOccurred') };
		const request = await fetch('/api/friends/request', {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ friendId: target.id }),
		});
		if (!request.ok) {
			let errorMsg = request.statusText;
			try {
				const payload = await request.json();
				errorMsg = payload.message || payload.error || errorMsg;
			}
			catch {
				// ignore json parse failures
			}
			return { success: false, message: errorMsg || t('friends.errorOccurred') };
		}
		return { success: true, message: t('friends.requestSent') };
	}
	catch (error) {
		console.error('Error sending friend request:', error);
		return { success: false, message: t('friends.errorOccurred') };
	}
}

function resetLanguageListeners() {
	window.removeEventListener('languageChanged', updateManagementTranslations);
	window.removeEventListener('languageChanged', updateHomepageTranslations);
}

function detachHomepageMenuHandler() {
	if (homepageMenuHandler) {
		document.removeEventListener('click', homepageMenuHandler);
		homepageMenuHandler = null;
	}
	if (homepageFriendsRefreshHandler) {
		window.removeEventListener('friends:refresh', homepageFriendsRefreshHandler as EventListener);
		homepageFriendsRefreshHandler = null;
	}
	if ((window as any).refreshFriendsList) {
		(window as any).refreshFriendsList = null;
	}
	// Don't disconnect WebSocket here - it's reconnected in loadHomepage
}

function updateManagementTranslations() {
	const title = document.querySelector<HTMLElement>('[data-role="dashboard-title"]');
	if (title)
		title.textContent = t('nav.home');

	const sessionHeading = document.querySelector<HTMLElement>('[data-role="session-title"]');
	if (sessionHeading)
		sessionHeading.textContent = t('profile.welcome');

	const formHeading = document.querySelector<HTMLElement>('[data-role="quick-form-title"]');
	if (formHeading)
		formHeading.textContent = t('buttons.save');

	const communityHeading = document.querySelector<HTMLElement>('[data-role="community-title"]');
	if (communityHeading)
		communityHeading.textContent = t('nav.users');

	const playBtn = document.querySelector<HTMLButtonElement>('[data-role="action-play"]');
	if (playBtn)
		playBtn.textContent = t('game.play');

	const addUserBtn = document.querySelector<HTMLButtonElement>('[data-role="action-add-user"]');
	if (addUserBtn)
		addUserBtn.textContent = t('buttons.save');

	const loginBtn = document.querySelector<HTMLButtonElement>('[data-role="action-login"]');
	if (loginBtn)
		loginBtn.textContent = t('buttons.login');

	const logoutBtn = document.querySelector<HTMLButtonElement>('[data-role="action-logout"]');
	if (logoutBtn)
		logoutBtn.textContent = t('profile.logout');

	const nameInput = document.querySelector<HTMLInputElement>('[data-role="input-name"]');
	if (nameInput)
		nameInput.placeholder = t('forms.username');

	const infoInput = document.querySelector<HTMLInputElement>('[data-role="input-info"]');
	if (infoInput)
		infoInput.placeholder = t('forms.userInfo');

	const emailInput = document.querySelector<HTMLInputElement>('[data-role="input-email"]');
	if (emailInput)
		emailInput.placeholder = t('forms.email');

	const passwordInput = document.querySelector<HTMLInputElement>('[data-role="input-password"]');
	if (passwordInput)
		passwordInput.placeholder = t('forms.password');

	const aliasInput = document.querySelector<HTMLInputElement>('[data-role="input-alias"]');
	if (aliasInput)
		aliasInput.placeholder = t('userEdit.newName');

	const userNameLines = document.querySelectorAll<HTMLElement>('[data-role="user-name-line"]');
	userNameLines.forEach((el) => {
		const value = el.getAttribute('data-value') || '';
		el.textContent = `${t('userList.userName')}: ${value}`;
	});

	const userInfoLines = document.querySelectorAll<HTMLElement>('[data-role="user-info-line"]');
	userInfoLines.forEach((el) => {
		const value = el.getAttribute('data-value') || '';
		el.textContent = `${t('userList.userInfo')}: ${value}`;
	});

const userEmailLines = document.querySelectorAll<HTMLElement>('[data-role="user-email-line"]');
userEmailLines.forEach((el) => {
	const value = el.getAttribute('data-value') || '';
	el.textContent = `${t('userList.userEmail')}: ${value}`;
});
}

function updateHomepageTranslations() {
	const friendsTitle = document.querySelector<HTMLElement>('[data-role="home-friends-title"]');
	if (friendsTitle)
		friendsTitle.textContent = t('profile.friends');

	const emptyState = document.querySelector<HTMLElement>('[data-role="home-friends-empty"]');
	if (emptyState) {
		const isGuest = emptyState.getAttribute('data-guest') === 'true';
		emptyState.textContent = isGuest ? t('auth.signIn') : t('friends.noFriends');
	}

	const requestsBtn = document.querySelector<HTMLButtonElement>('.home-requests-btn');
	if (requestsBtn)
		requestsBtn.textContent = t('friends.friendRequests');

	const playButton = document.querySelector<HTMLButtonElement>('[data-role="home-play-button"]');
	if (playButton)
		playButton.textContent = t('game.play');

	const manageBtn = document.querySelector<HTMLButtonElement>('[data-role="user-menu-manage"]');
	if (manageBtn)
		manageBtn.textContent = t('nav.users');

	const profileBtn = document.querySelector<HTMLButtonElement>('[data-role="user-menu-profile"]');
	if (profileBtn)
		profileBtn.textContent = t('profile.userInfo');

	const logoutBtn = document.querySelector<HTMLButtonElement>('[data-role="user-menu-logout"]');
	if (logoutBtn)
		logoutBtn.textContent = t('profile.logout');

	const addFriendBtn = document.querySelector<HTMLButtonElement>('[data-role="home-add-friend"]');
	if (addFriendBtn) {
		const mode = addFriendBtn.getAttribute('data-mode');
		addFriendBtn.textContent = mode === 'login' ? t('buttons.login') : t('friends.addFriend');
	}

	const addFriendInput = document.querySelector<HTMLInputElement>('[data-role="home-add-friend-input"]');
	if (addFriendInput)
		addFriendInput.placeholder = t('friends.enterUsername');

	const loginBtn = document.querySelector<HTMLButtonElement>('[data-role="user-menu-login"]');
	if (loginBtn)
		loginBtn.textContent = t('buttons.login');

	const dropdownName = document.querySelector<HTMLElement>('[data-role="user-dropdown-name"]');
	if (dropdownName) {
		const value = dropdownName.getAttribute('data-value');
		if (value)
			dropdownName.textContent = value;
	}

	const dropdownEmail = document.querySelector<HTMLElement>('[data-role="user-dropdown-email"]');
	if (dropdownEmail) {
		const value = dropdownEmail.getAttribute('data-value');
		dropdownEmail.textContent = value || t('auth.signIn');
	}

	const dropdownInfo = document.querySelector<HTMLElement>('[data-role="user-dropdown-info"]');
	if (dropdownInfo) {
		const value = dropdownInfo.getAttribute('data-value');
		dropdownInfo.textContent = value || '';
	}

	updateLegalFooter();
}

export async function loadHomepage() {
	resetLanguageListeners();
	detachHomepageMenuHandler();

	applyTheme('app');

	const app = document.querySelector<HTMLDivElement>('#app');
	if (!app)
		return;
	app.innerHTML = '';
	app.classList.add('app-shell', 'home-shell');

	injectLanguageSelectorStyles();

	let storedUser: any = null;
	try {
		storedUser = await getUserInfo();
	}
	catch (error) {
		console.error('Failed to fetch user info for homepage:', error);
	}

	const safeUser = storedUser?.data?.safeUser;
	const sessionAlias = storedUser?.data?.currentSession?.alias;
	const displayName = safeUser?.name || sessionAlias || t('auth.guest');
	const email = safeUser?.email || '';
	// const info = safeUser?.info || '';

	const wrapper = document.createElement('div');
	wrapper.className = 'home-wrapper';
	app.appendChild(wrapper);

	const topBar = document.createElement('header');
	topBar.className = 'home-top-bar';
	wrapper.appendChild(topBar);

	const brand = document.createElement('div');
	brand.className = 'home-brand';
	const brandLabel = document.createElement('strong');
	brandLabel.textContent = 'Transcendence';
	brand.appendChild(brandLabel);
	topBar.appendChild(brand);

	const topControls = document.createElement('div');
	topControls.className = 'home-top-controls';
	topBar.appendChild(topControls);

	const languageSelectorContainer = document.createElement('div');
	languageSelectorContainer.id = 'language-selector-container';
	topControls.appendChild(languageSelectorContainer);

	const userMenuWrapper = document.createElement('div');
	userMenuWrapper.className = 'home-user-menu';
	const userButton = document.createElement('button'); // user button was a cool idea
	userButton.className = 'home-user-button';
	userButton.dataset.role = 'home-user-button';
	userButton.textContent = displayName;
	userMenuWrapper.appendChild(userButton);

	const userDropdown = document.createElement('div');
	userDropdown.className = 'home-user-dropdown';
	userDropdown.setAttribute('aria-hidden', 'true');

	const identityBlock = document.createElement('div');
	identityBlock.className = 'home-user-identity';
	const nameLine = document.createElement('strong');
	nameLine.dataset.role = 'user-dropdown-name';
	nameLine.setAttribute('data-value', displayName);
	nameLine.textContent = displayName;
	identityBlock.appendChild(nameLine);
	const emailLine = document.createElement('span');
	emailLine.dataset.role = 'user-dropdown-email';
	emailLine.setAttribute('data-value', email || '');
	emailLine.textContent = email || t('auth.signIn');
	identityBlock.appendChild(emailLine);
	// if (info) { // n entendi direito oq e a userinfo
	// 	const infoLine = document.createElement('span');
	// 	infoLine.dataset.role = 'user-dropdown-info';
	// 	infoLine.setAttribute('data-value', info);
	// 	infoLine.textContent = info;
	// 	identityBlock.appendChild(infoLine);
	// }
	userDropdown.appendChild(identityBlock);

	const actionStack = document.createElement('div');
	actionStack.className = 'home-user-actions';
	if (safeUser) {
		webSocketService.connect(safeUser.id);
		const profileBtn = document.createElement('button');
		profileBtn.className = 'home-user-action';
		profileBtn.dataset.role = 'user-menu-profile';
		profileBtn.textContent = t('profile.userInfo');
		profileBtn.addEventListener('click', () => navigate('/profile'));
		actionStack.appendChild(profileBtn);

		const logoutBtn = document.createElement('button');
		logoutBtn.className = 'home-user-action';
		logoutBtn.dataset.role = 'user-menu-logout';
		logoutBtn.textContent = t('profile.logout');
		logoutBtn.addEventListener('click', async () => {
			logoutBtn.disabled = true;
			try {
				await logoutUser(safeUser.name);
				navigate('/');
			}
			catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown error';
				alert(`${t('errors.logoutFailed')}: ${message}`);
			}
			finally {
				logoutBtn.disabled = false;
			}
		});
		actionStack.appendChild(logoutBtn);
	}
	else {
		const loginBtn = document.createElement('button');
		loginBtn.className = 'home-user-action';
		loginBtn.dataset.role = 'user-menu-login';
		loginBtn.textContent = t('buttons.login');
		loginBtn.addEventListener('click', () => navigate('/login'));
		actionStack.appendChild(loginBtn);
	}
	userDropdown.appendChild(actionStack);
	userMenuWrapper.appendChild(userDropdown);
	topControls.appendChild(userMenuWrapper);

	const toggleMenu = (open?: boolean) => {
		const shouldOpen = open ?? !userMenuWrapper.classList.contains('open');
		if (shouldOpen) {
			userMenuWrapper.classList.add('open');
			userDropdown.setAttribute('aria-hidden', 'false');
		}
		else {
			userMenuWrapper.classList.remove('open');
			userDropdown.setAttribute('aria-hidden', 'true');
		}
	};

	userButton.addEventListener('click', (event) => {
		event.stopPropagation();
		toggleMenu();
	});

	homepageMenuHandler = (event: MouseEvent) => {
		if (!userMenuWrapper.contains(event.target as Node))
			toggleMenu(false);
	};
	document.addEventListener('click', homepageMenuHandler);

	const layout = document.createElement('div');
	layout.className = 'home-layout';
	wrapper.appendChild(layout);

	const hero = document.createElement('section');
	hero.className = 'home-hero';
	const playButton = document.createElement('button');
	playButton.className = 'home-play-button glow-button';
	playButton.dataset.role = 'home-play-button';
	playButton.textContent = t('game.play');
	playButton.addEventListener('click', () => navigate('/localGame'));
	hero.appendChild(playButton);
	layout.appendChild(hero);

	const friendsPanel = document.createElement('aside');
	friendsPanel.className = 'home-friend-bar';
	layout.appendChild(friendsPanel);

	const friendsHeader = document.createElement('div');
	friendsHeader.className = 'home-friends-header';
	const friendsTitle = document.createElement('span');
	friendsTitle.dataset.role = 'home-friends-title';
	friendsTitle.textContent = t('profile.friends');
	friendsHeader.appendChild(friendsTitle);

	const requestsBtn = document.createElement('button');
	requestsBtn.className = 'home-requests-btn';
	requestsBtn.textContent = t('friends.friendRequests');
	requestsBtn.style.marginLeft = 'auto';
	requestsBtn.style.fontSize = '0.8rem';
	requestsBtn.style.padding = '4px 8px';
	requestsBtn.style.borderRadius = '6px';
	requestsBtn.style.background = 'rgba(0, 180, 255, 0.1)';
	requestsBtn.style.border = '1px solid rgba(0, 180, 255, 0.2)';
	requestsBtn.style.color = '#e6f7ff';
	requestsBtn.style.cursor = 'pointer';
	
	requestsBtn.onclick = () => showFriendRequestsModal();
	friendsHeader.appendChild(requestsBtn);

	friendsPanel.appendChild(friendsHeader);

	const friendsList = document.createElement('div');
	friendsList.className = 'home-friend-list';
	friendsPanel.appendChild(friendsList);

	const addFriendCta = document.createElement('div');
	addFriendCta.className = 'home-friend-cta';
	const addFriendInput = document.createElement('input');
	addFriendInput.className = 'home-add-input';
	addFriendInput.type = 'text';
	addFriendInput.dataset.role = 'home-add-friend-input';
	addFriendInput.placeholder = t('friends.enterUsername');
	addFriendInput.autocomplete = 'off';
	addFriendCta.appendChild(addFriendInput);

	const addFriendButton = document.createElement('button');
	addFriendButton.className = 'home-add-friend glow-button secondary';
	addFriendButton.dataset.role = 'home-add-friend';
	addFriendButton.textContent = t('friends.addFriend');
	addFriendButton.setAttribute('data-mode', safeUser ? 'add' : 'login');
	addFriendCta.appendChild(addFriendButton);

	const addFriendFeedback = document.createElement('div');
	addFriendFeedback.className = 'home-add-feedback';
	addFriendFeedback.dataset.role = 'home-add-friend-feedback';
	addFriendCta.appendChild(addFriendFeedback);
	friendsPanel.appendChild(addFriendCta);

	const emptyState = document.createElement('span');
	emptyState.dataset.role = 'home-friends-empty';
	emptyState.textContent = safeUser ? t('friends.noFriends') : t('auth.signIn');
	emptyState.setAttribute('data-guest', safeUser ? 'false' : 'true');
	friendsList.appendChild(emptyState);

	const showFriendRequestsModal = async () => {
		const modalOverlay = document.createElement('div');
		modalOverlay.className = 'modal-overlay open';
		modalOverlay.onclick = (e) => {
			if (e.target === modalOverlay) modalOverlay.remove();
		};
		
		const modal = document.createElement('div');
		modal.className = 'modal';
		modal.style.padding = '24px';
		modal.style.flexDirection = 'column';
		modal.style.gap = '16px';
		modal.style.maxWidth = '400px';
		modal.style.maxHeight = '80vh';
		modal.style.overflowY = 'auto';

		const header = document.createElement('div');
		header.style.display = 'flex';
		header.style.justifyContent = 'space-between';
		header.style.alignItems = 'center';

		const title = document.createElement('h3');
		title.textContent = t('friends.friendRequests');
		title.style.margin = '0';
		title.style.fontSize = '1.2rem';
		
		const closeBtn = document.createElement('button');
		closeBtn.textContent = '✕';
		closeBtn.style.background = 'transparent';
		closeBtn.style.border = 'none';
		closeBtn.style.color = 'inherit';
		closeBtn.style.cursor = 'pointer';
		closeBtn.style.fontSize = '1.2rem';
		closeBtn.onclick = () => modalOverlay.remove();

		header.append(title, closeBtn);
		modal.appendChild(header);

		const list = document.createElement('ul');
		list.style.listStyle = 'none';
		list.style.padding = '0';
		list.style.margin = '0';
		list.style.display = 'flex';
		list.style.flexDirection = 'column';
		list.style.gap = '12px';
		
		modal.appendChild(list);
		modalOverlay.appendChild(modal);
		document.body.appendChild(modalOverlay);

		try {
			const res = await fetch('/api/friends/pending', {
				credentials: 'include'
			});
			const data = await res.json();
			const requests = data.data || data;

			if (!Array.isArray(requests) || !requests.length) {
				const empty = document.createElement('li');
				empty.textContent = t('friends.noPendingRequests');
				empty.style.color = '#8899a6';
				empty.style.textAlign = 'center';
				list.appendChild(empty);
				return;
			}

			requests.forEach((req: any) => {
				const li = document.createElement('li');
				li.style.display = 'flex';
				li.style.justifyContent = 'space-between';
				li.style.alignItems = 'center';
				li.style.background = 'rgba(255,255,255,0.05)';
				li.style.padding = '12px';
				li.style.borderRadius = '8px';

				const name = document.createElement('span');
				name.textContent = req.name;

				const actions = document.createElement('div');
				actions.style.display = 'flex';
				actions.style.gap = '8px';

				const acceptBtn = document.createElement('button');
				acceptBtn.textContent = '✓';
				acceptBtn.title = t('friends.accept');
				acceptBtn.style.color = '#4caf50';
				acceptBtn.style.background = 'rgba(76, 175, 80, 0.1)';
				acceptBtn.style.border = 'none';
				acceptBtn.style.borderRadius = '4px';
				acceptBtn.style.padding = '6px 10px';
				acceptBtn.style.cursor = 'pointer';
				
				const rejectBtn = document.createElement('button');
				rejectBtn.textContent = '✕';
				rejectBtn.title = t('friends.reject');
				rejectBtn.style.color = '#f44336';
				rejectBtn.style.background = 'rgba(244, 67, 54, 0.1)';
				rejectBtn.style.border = 'none';
				rejectBtn.style.borderRadius = '4px';
				rejectBtn.style.padding = '6px 10px';
				rejectBtn.style.cursor = 'pointer';

				acceptBtn.onclick = async () => {
					acceptBtn.disabled = true;
					try {
						await fetch('/api/friends/accept', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ friendId: req.userId1 })
						});
						li.remove();
						if (!list.children.length) modalOverlay.remove();
						loadFriends();
					} catch (e) {
						console.error(e);
						acceptBtn.disabled = false;
					}
				};

				rejectBtn.onclick = async () => {
					rejectBtn.disabled = true;
					try {
						await fetch('/api/friends/reject', {
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: JSON.stringify({ friendId: req.userId1 })
						});
						li.remove();
						if (!list.children.length) modalOverlay.remove();
					} catch (e) {
						console.error(e);
						rejectBtn.disabled = false;
					}
				};

				actions.append(acceptBtn, rejectBtn);
				li.append(name, actions);
				list.appendChild(li);
			});

		} catch (e) {
			console.error('Failed to load requests', e);
			const err = document.createElement('li');
			err.textContent = t('friends.failedToLoad');
			err.style.color = '#ff4d4f';
			list.appendChild(err);
		}
	};

	const renderFriends = (friends: Array<{ id: number; name: string; online?: boolean }>) => {
		friendsList.innerHTML = '';
		if (!friends.length) {
			emptyState.textContent = t('friends.noFriends');
			emptyState.setAttribute('data-guest', 'false');
			friendsList.appendChild(emptyState);
			return;
		}
		friends.forEach((friend) => {
			const pill = document.createElement('div');
			pill.className = 'home-friend-pill';
			const invite = document.createElement('button');
			invite.className = 'send-game-invite';
			invite.id = `send-game-invite-${friend.id}`;
			invite.innerHTML = '🎮';
			invite.title = 'Send Game Invite';
			pill.setAttribute('data-friend-id', friend.id.toString());
			const status = document.createElement('span');
			status.className = friend.online ? 'friend-status online' : 'friend-status offline';
			const label = document.createElement('span');
			label.textContent = friend.name;
			
			// Add chat icon
			const chatIcon = document.createElement('button');
			chatIcon.className = 'friend-chat-icon';
			chatIcon.innerHTML = '💬';
			chatIcon.title = 'Open chat';
			chatIcon.onclick = (e) => {
				e.stopPropagation();
				// Import and use chat manager
				import('./components/ChatWindow').then(({ getChatManager }) => {
					const chatManager = getChatManager();
					chatManager.openChat(friend.id, friend.name);
				});
			};

			const removeBtn = document.createElement('button');
			removeBtn.className = 'friend-remove-icon';
			removeBtn.innerHTML = '✖';
			removeBtn.title = 'Remove friend';
			removeBtn.onclick = async (e) => {
				e.stopPropagation();
				if (!confirm(`Remove ${friend.name} from your friends?`))
					return;
				removeBtn.disabled = true;
				try {
					const res = await fetch('/api/friends/remove', {
						method: 'POST',
						credentials: 'include',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ friendId: friend.id })
					});
					if (!res.ok)
						throw new Error('Failed to remove friend');
					await loadFriends();
				}
				catch (err) {
					console.error('Failed to remove friend:', err);
					alert(t('friends.errorOccurred') || 'Failed to remove friend');
				}
				finally {
					removeBtn.disabled = false;
				}
			};
			
			pill.append(status, label, chatIcon, invite, removeBtn);
			friendsList.appendChild(pill);
			invite.addEventListener("click", async () => {
				const resInvitedUser = await fetch(`/api/users/name/${friend.name}`, {credentials: "include"});
				const responseInvitedUser = await resInvitedUser.json();

				const res = await fetch("/api/lobby", {
					method: "POST",
					credentials: "include",
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ otherUserId: responseInvitedUser.data.id })
				});
				await res.json();
			});
		});
	};

	const loadFriends = async () => {
		if (!safeUser) {
			emptyState.textContent = t('auth.signIn');
			emptyState.setAttribute('data-guest', 'true');
			friendsList.innerHTML = '';
			friendsList.appendChild(emptyState);
			addFriendInput.disabled = true;
			addFriendButton.disabled = false;
			addFriendButton.textContent = t('buttons.login');
			addFriendButton.setAttribute('data-mode', 'login');
			return;
		}
		addFriendInput.disabled = false;
		addFriendButton.disabled = false;
		addFriendButton.textContent = t('friends.addFriend');
		addFriendButton.setAttribute('data-mode', 'add');
		try {
			const res = await fetch('/api/friends', {
				method: 'GET',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			});
			if (!res.ok) {
				let errorMsg = res.statusText;
				try {
					const errData = await res.json();
					errorMsg = errData.error || errorMsg;
				}
				catch {
					const errText = await res.text();
					if (errText)
						errorMsg = errText;
				}
				throw new Error(errorMsg);
			}
			const payload = await res.json();
			const friends = payload.data || payload;
			if (Array.isArray(friends))
				renderFriends(friends);
			else
				renderFriends([]);
		}
		catch (error) {
			console.error('Failed to load friends:', error);
			friendsList.innerHTML = '';
			emptyState.textContent = t('friends.failedToLoad');
			emptyState.setAttribute('data-guest', 'false');
			friendsList.appendChild(emptyState);
		}
	};

	(window as any).refreshFriendsList = loadFriends;

	homepageFriendsRefreshHandler = () => {
		void loadFriends();
	};
	window.addEventListener('friends:refresh', homepageFriendsRefreshHandler as EventListener);

	addFriendButton.addEventListener('click', async () => {
		if (!safeUser) {
			navigate('/login');
			return;
		}
		const username = addFriendInput.value.trim();
		if (!username) {
			addFriendFeedback.textContent = t('friends.enterUsernameError');
			addFriendFeedback.classList.add('error');
			return;
		}
		addFriendButton.disabled = true;
		addFriendButton.textContent = '...';
		addFriendFeedback.textContent = '';
		addFriendFeedback.classList.remove('error', 'success');
		const result = await sendFriendRequestByUsername(username);
		addFriendButton.disabled = false;
		addFriendButton.textContent = t('friends.addFriend');
		addFriendFeedback.textContent = result.message;
		if (result.success) {
			addFriendFeedback.classList.add('success');
			addFriendInput.value = '';
			await loadFriends();
		}
		else {
			addFriendFeedback.classList.add('error');
		}
	});

	if (safeUser) {
		webSocketService.connect(safeUser.id);
	}

	await loadFriends();
	const rejoinPopup = document.createElement('div');
	rejoinPopup.id = 'rejoin-game-popup';
	rejoinPopup.style.cssText = `
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.7);
		display: none;
		align-items: center;
		justify-content: center;
		z-index: 10000;
	`;
	document.body.appendChild(rejoinPopup);

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
	window.addEventListener('languageChanged', updateHomepageTranslations);
}


export async function loadMainPage() {
	resetLanguageListeners();
	detachHomepageMenuHandler();
	applyTheme('app');
	await initializeUser();
	const app = document.querySelector<HTMLDivElement>('#app');
	if (!app)
		return;

	app.innerHTML = '';
	app.classList.add('app-shell');

	window.removeEventListener('languageChanged', updateManagementTranslations);
	injectLanguageSelectorStyles();

	const topBar = document.createElement('header');
	topBar.className = 'top-bar';
	const brandMark = document.createElement('div');
	brandMark.className = 'brand-mark';
	const brandLabel = document.createElement('span');
	brandLabel.textContent = 'Transcendence';
	const brandTitle = document.createElement('strong');
	brandTitle.dataset.role = 'dashboard-title';
	brandTitle.textContent = t('nav.home');
	brandMark.append(brandLabel, brandTitle);
	topBar.appendChild(brandMark);
	const languageSelectorContainer = document.createElement('div');
	languageSelectorContainer.id = 'language-selector-container';
	topBar.appendChild(languageSelectorContainer);
	app.appendChild(topBar);

	new LanguageSelector('language-selector-container');
	window.addEventListener('languageChanged', updateManagementTranslations);

	const contentGrid = document.createElement('div');
	contentGrid.className = 'dashboard-grid';
	app.appendChild(contentGrid);

	const storedUser = await getUserInfo();
	const safeUser = storedUser?.data?.safeUser;

	// Initialize websocket connection for authenticated users
	if (safeUser) {
		webSocketService.connect(safeUser.id);
	}

	const sessionCard = document.createElement('section');
	sessionCard.className = 'glass-panel session-card';
	const sessionHeading = document.createElement('h2');
	sessionHeading.dataset.role = 'session-title';
	sessionHeading.textContent = t('profile.welcome');
	sessionCard.appendChild(sessionHeading);

	const userMeta = document.createElement('div');
	userMeta.className = 'user-meta';
	const primaryName = document.createElement('strong');
	primaryName.textContent = safeUser ? safeUser.name : storedUser?.data?.currentSession?.alias || 'Guest';
	const secondaryLine = document.createElement('span');
	secondaryLine.textContent = safeUser ? safeUser.email : t('auth.signIn');
	userMeta.append(primaryName, secondaryLine);
	sessionCard.appendChild(userMeta);

	const actionRow = document.createElement('div');
	actionRow.className = 'action-row';
	const playButton = document.createElement('button');
	playButton.className = 'glow-button';
	playButton.dataset.role = 'action-play';
	playButton.textContent = t('game.play');
	playButton.addEventListener('click', () => navigate('/localGame'));
	actionRow.appendChild(playButton);

	if (!safeUser) {
		const loginButton = document.createElement('button');
		loginButton.className = 'glow-button secondary';
		loginButton.dataset.role = 'action-login';
		loginButton.textContent = t('buttons.login');
		loginButton.addEventListener('click', () => navigate('/login'));
		actionRow.appendChild(loginButton);
	}
	else {
		const profileButton = document.createElement('button');
		profileButton.className = 'glow-button secondary';
		profileButton.textContent = t('profile.userInfo');
		profileButton.addEventListener('click', () => navigate('/profile'));
		actionRow.appendChild(profileButton);

		const logoutButton = document.createElement('button');
		logoutButton.className = 'glow-button secondary';
		logoutButton.dataset.role = 'action-logout';
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
		actionRow.appendChild(logoutButton);
	}
	sessionCard.appendChild(actionRow);

	if (!safeUser) {
		const aliasForm = document.createElement('div');
		aliasForm.className = 'quick-form';
		const aliasLabel = document.createElement('label');
		aliasLabel.textContent = t('userEdit.newName');
		const aliasInput = document.createElement('input');
		aliasInput.dataset.role = 'input-alias';
		aliasInput.type = 'text';
		aliasInput.placeholder = t('userEdit.newName');
		const aliasButton = document.createElement('button');
		aliasButton.className = 'glow-button secondary';
		aliasButton.textContent = t('buttons.save');
		aliasButton.addEventListener('click', async () => {
			const alias = aliasInput.value.trim();
			if (!alias)
				return;
			aliasButton.disabled = true;
			try {
				await updateGuestAlias(alias);
				aliasInput.value = '';
			}
			finally {
				aliasButton.disabled = false;
			}
		});
		aliasForm.append(aliasLabel, aliasInput, aliasButton);
		sessionCard.appendChild(aliasForm);
	}

	contentGrid.appendChild(sessionCard);

	const formCard = document.createElement('section');
	formCard.className = 'glass-panel quick-card';
	const formHeading = document.createElement('h2');
	formHeading.dataset.role = 'quick-form-title';
	formHeading.textContent = t('buttons.save');
	formCard.appendChild(formHeading);

	const quickForm = document.createElement('div');
	quickForm.className = 'quick-form';

	const nameInput = document.createElement('input');
	nameInput.type = 'text';
	nameInput.dataset.role = 'input-name';
	nameInput.placeholder = t('forms.username');
	quickForm.appendChild(nameInput);

	const infoInput = document.createElement('input');
	infoInput.type = 'text';
	infoInput.dataset.role = 'input-info';
	infoInput.placeholder = t('forms.userInfo');
	quickForm.appendChild(infoInput);

	const emailInput = document.createElement('input');
	emailInput.type = 'email';
	emailInput.dataset.role = 'input-email';
	emailInput.placeholder = t('forms.email');
	quickForm.appendChild(emailInput);

	const phoneInput = document.createElement('input');
	phoneInput.type = 'text';
	phoneInput.placeholder = 'Phone Number';
	phoneInput.dataset.role = 'input-phone';
	quickForm.appendChild(phoneInput);

	const passwordInput = document.createElement('input');
	passwordInput.type = 'password';
	passwordInput.dataset.role = 'input-password';
	passwordInput.placeholder = t('forms.password');
	quickForm.appendChild(passwordInput);

	const addUserButton = document.createElement('button');
	addUserButton.className = 'glow-button';
	addUserButton.dataset.role = 'action-add-user';
	addUserButton.textContent = t('buttons.save');
	quickForm.appendChild(addUserButton);

	formCard.appendChild(quickForm);
	contentGrid.appendChild(formCard);

	const communityPanel = document.createElement('section');
	communityPanel.className = 'glass-panel community-panel';
	const communityHeading = document.createElement('h2');
	communityHeading.dataset.role = 'community-title';
	communityHeading.textContent = t('nav.users');
	communityPanel.appendChild(communityHeading);
	const userList = document.createElement('div');
	userList.className = 'user-list';
	communityPanel.appendChild(userList);
	app.appendChild(communityPanel);

	const renderUsers = (users: any[]) => {
		userList.innerHTML = '';
		users.forEach((user) => {
			const pill = document.createElement('div');
			pill.className = 'user-pill';
			const nameLine = document.createElement('h3');
			nameLine.dataset.role = 'user-name-line';
			nameLine.setAttribute('data-value', user.name || '');
			nameLine.textContent = `${t('userList.userName')}: ${user.name}`;
			const infoLine = document.createElement('p');
			infoLine.dataset.role = 'user-info-line';
			infoLine.setAttribute('data-value', user.info || '');
			infoLine.textContent = `${t('userList.userInfo')}: ${user.info || ''}`;
			const emailLine = document.createElement('p');
			emailLine.dataset.role = 'user-email-line';
			emailLine.setAttribute('data-value', user.email || '');
			emailLine.textContent = `${t('userList.userEmail')}: ${user.email}`;
			pill.append(nameLine, infoLine, emailLine);
			userList.appendChild(pill);
		});
	};

	const loadUsers = async () => {
		try {
			const res = await fetch('/api/users', {
				method: 'GET',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
			});

			if (!res.ok) {
				let errorMsg = res.statusText;
				try {
					const errData = await res.json();
					errorMsg = errData.error || errorMsg;
				}
				catch {
					const errText = await res.text();
					if (errText)
						errorMsg = errText;
				}
				throw new Error(errorMsg);
			}

			const text = await res.text();
			const payload = text ? JSON.parse(text) : [];
			const users = payload.data || payload;
			if (Array.isArray(users))
				renderUsers(users);
		}
		catch (error) {
			const message = error instanceof Error ? error.message : 'Unexpected error';
			console.error('Error fetching users:', error);
			userList.innerHTML = `<div class="user-pill">${t('validation.fetchUsersError')}: ${message}</div>`;
		}
	};

	await loadUsers();

	addUserButton.addEventListener('click', async () => {
		const name = nameInput.value.trim();
		const info = infoInput.value.trim();
		const email = emailInput.value.trim();
		const password = passwordInput.value.trim();

		if (!name)
			return alert(t('validation.enterName'));
		if (!info)
			return alert(t('validation.enterUserInfo'));
		if (!email)
			return alert(t('validation.enterEmail'));
		if (!password)
			return alert(t('validation.enterPassword'));

		try {
			await createUser({
				name,
				email,
				password,
				info,
			});
			nameInput.value = '';
			infoInput.value = '';
			emailInput.value = '';
			passwordInput.value = '';
			await loadUsers();
		}
		catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			alert(`${t('validation.addUserError')}: ${message}`);
		}
	});

	updateManagementTranslations();
}

export async function getUserInfo() {
	try {
		const response = await fetch('/api/me', {
			credentials: 'include'
		});
		const data = await response.json();
		return data;
	}
	catch (err) {
		console.log('Error fetching user info', err);
	}
}

export async function initializeUser() {
	try {
		await fetch('/api/init', {
			method: 'GET',
			credentials: 'include'
		});
	}
	catch (err) {
		console.log('Error initializing user:', err);
	}
}

async function updateGuestAlias(newAlias: string): Promise<{success: boolean, error?: string}> {
	const storedUser = await getUserInfo();
	if (storedUser && !storedUser.data.guest)
		return { success: false, error: 'Cannot update guest alias for authenticated user' };
	
	try {
		const response = await fetch('/api/guest/alias', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ alias: newAlias })
		});
		const data = await response.json();
		if (response.ok)
			return { success: true };
		else
			return { success: false, error: data.data || 'Failed to update alias' };
	}
	catch (error) {
		return { success: false, error: 'Network error' };
	}
}

export interface CreateUserPayload {
	name: string;
	email: string;
	password: string;
	info?: string;
}

export async function createUser(data: CreateUserPayload) {
	const errors: string[] = [];
	if (!data.name)
		errors.push(t('validation.enterName'));
	if (!data.email)
		errors.push(t('validation.enterEmail'));
	if (!data.password)
		errors.push(t('validation.enterPassword'));
	if (errors.length)
		throw new Error(errors[0]);

	const payload = {
		name: data.name,
		email: data.email,
		password: data.password,
		info: data.info,
	};

	const response = await fetch(`/api/users`, {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		let message = response.statusText || 'Failed to create user';
		try {
			const errData = await response.json();
			message = errData.error || message;
		}
		catch {
			// ignore json parse issue
		}
		throw new Error(message);
	}

	return response.json();
}

export async function logoutUser(userName?: string) {
	const payload = userName ? { name: userName.trim() } : {};
	
	// Close all open chat windows
	const { resetChatManager } = await import('./components/ChatWindow');
	resetChatManager();
	
	// Disconnect WebSocket first to trigger the close handler on the server
	webSocketService.disconnect();
	
	// Give the server a moment to process the disconnection and notify friends
	await new Promise(resolve => setTimeout(resolve, 100));
	
	const response = await fetch('/api/logout', {
		method: 'POST',
		credentials: 'include',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		let message = response.statusText || 'Logout failed';
		try {
			const errData = await response.json();
			message = errData.error || message;
		}
		catch {
			const errText = await response.text();
			if (errText)
				message = errText;
		}
		throw new Error(message);
	}
}
