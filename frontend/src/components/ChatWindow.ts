import { t } from '../i18n';

interface ChatMessage {
	id: number;
	senderId: number;
	text: string;
	timestamp: Date;
	isOwn: boolean;
}

function isFriendOnline(friendId: number): boolean {
	const friendElement = document.querySelector(`[data-friend-id="${friendId}"]`);
	if (!friendElement)
		return true;
	const statusIndicator = friendElement.querySelector('.status-indicator') as HTMLElement | null;
	if (statusIndicator) {
		return statusIndicator.classList.contains('bg-green-500');
	}
	const friendStatus = friendElement.querySelector('.friend-status') as HTMLElement | null;
	if (friendStatus) {
		return friendStatus.classList.contains('online');
	}
	return true;
}

class ChatWindow {
	private container: HTMLDivElement;
	private friendId: number;
	private friendName: string;
	private messages: ChatMessage[] = [];
	private messageContainer: HTMLDivElement;
	private inputField: HTMLInputElement;

	constructor(friendId: number, friendName: string) {
		this.friendId = friendId;
		this.friendName = friendName;
		this.container = this.createThread();
		this.messageContainer = this.container.querySelector('.chat-messages')!;
		this.inputField = this.container.querySelector('.chat-input')!;
		this.attachEventListeners();
	}

	private createThread(): HTMLDivElement {
		const thread = document.createElement('div');
		thread.className = 'chat-thread';
		thread.setAttribute('data-friend-id', this.friendId.toString());

		const messagesWrapper = document.createElement('div');
		messagesWrapper.className = 'chat-messages-wrapper';

		const messages = document.createElement('div');
		messages.className = 'chat-messages';
		messagesWrapper.appendChild(messages);

		const inputArea = document.createElement('div');
		inputArea.className = 'chat-input-area';

		const input = document.createElement('input');
		input.className = 'chat-input';
		input.type = 'text';
		input.placeholder = t('chat.typeMessage') || 'Type a message...';
		input.maxLength = 500;

		const sendBtn = document.createElement('button');
		sendBtn.className = 'chat-send-btn';
		sendBtn.innerHTML = '➤';
		sendBtn.title = 'Send';

		inputArea.append(input, sendBtn);
		thread.append(messagesWrapper, inputArea);

		return thread;
	}

	private attachEventListeners(): void {
		const sendBtn = this.container.querySelector('.chat-send-btn') as HTMLButtonElement;
		sendBtn.addEventListener('click', () => this.sendMessage());
		this.inputField.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') this.sendMessage();
		});
	}

	public setActive(isActive: boolean): void {
		this.container.classList.toggle('active', isActive);
		if (isActive) {
			setTimeout(() => this.inputField.focus(), 0);
		}
	}

	private async sendMessage(): Promise<void> {
		const text = this.inputField.value.trim();
		if (!text) return;

		// waiting for backend (so visual agr)
		const message: ChatMessage = {
			id: Date.now(),
			senderId: 0,
			text,
			timestamp: new Date(),
			isOwn: true
		};

		this.addMessage(message);
		this.inputField.value = '';

		// waiting for backend (so visual agr)
		console.log(`Sending message to friend ${this.friendId}:`, text);
	}

	private addMessage(message: ChatMessage): void {
		this.messages.push(message);

		const messageEl = document.createElement('div');
		messageEl.className = message.isOwn ? 'chat-message own' : 'chat-message';

		const messageContent = document.createElement('div');
		messageContent.className = 'chat-message-content';
		messageContent.textContent = message.text;

		const messageTime = document.createElement('span');
		messageTime.className = 'chat-message-time';
		const time = message.timestamp.toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		});
		messageTime.textContent = time;

		messageEl.append(messageContent, messageTime);
		this.messageContainer.appendChild(messageEl);
		this.messageContainer.scrollTop = this.messageContainer.scrollHeight;
	}

	public getElement(): HTMLDivElement {
		return this.container;
	}

	public getFriendId(): number {
		return this.friendId;
	}

	public getFriendName(): string {
		return this.friendName;
	}

	public receiveMessage(senderId: number, text: string): void {
		const message: ChatMessage = {
			id: Date.now(),
			senderId,
			text,
			timestamp: new Date(),
			isOwn: false
		};
		this.addMessage(message);
	}
}

class ChatWindowManager {
	private openChats: Map<number, ChatWindow> = new Map();
	private container: HTMLDivElement;
	private windowEl: HTMLDivElement;
	private tabsEl!: HTMLDivElement;
	private panelEl!: HTMLDivElement;
	private activeFriendId: number | null = null;
	private headerNameEl!: HTMLSpanElement;
	private headerStatusDot!: HTMLSpanElement;
	private isMinimized: boolean = false;

	constructor() {
		this.container = this.createContainer();
		this.windowEl = this.createWindow();
		this.container.appendChild(this.windowEl);
		document.body.appendChild(this.container);
	}

	private createContainer(): HTMLDivElement {
		const container = document.createElement('div');
		container.className = 'chat-windows-container';
		return container;
	}

	private createWindow(): HTMLDivElement {
		const chatWindow = document.createElement('div');
		chatWindow.className = 'chat-window chat-window-multi hidden';

		const header = document.createElement('div');
		header.className = 'chat-header';

		const friendInfo = document.createElement('div');
		friendInfo.className = 'chat-friend-info';

		const statusDot = document.createElement('span');
		statusDot.className = 'chat-status-dot';

		const friendNameEl = document.createElement('span');
		friendNameEl.className = 'chat-friend-name';
		friendNameEl.textContent = '';

		friendInfo.append(statusDot, friendNameEl);

		const headerActions = document.createElement('div');
		headerActions.className = 'chat-header-actions';

		const minimizeBtn = document.createElement('button');
		minimizeBtn.className = 'chat-action-btn';
		minimizeBtn.innerHTML = '–';
		minimizeBtn.title = t('chat.minimize') || 'Minimize';

		const closeBtn = document.createElement('button');
		closeBtn.className = 'chat-action-btn';
		closeBtn.innerHTML = '×';
		closeBtn.title = t('chat.closeChat') || 'Close';

		headerActions.append(minimizeBtn, closeBtn);
		header.append(friendInfo, headerActions);

		const body = document.createElement('div');
		body.className = 'chat-body';

		this.tabsEl = document.createElement('div');
		this.tabsEl.className = 'chat-tabs';

		this.panelEl = document.createElement('div');
		this.panelEl.className = 'chat-panel';

		body.append(this.tabsEl, this.panelEl);
		chatWindow.append(header, body);

		this.headerNameEl = friendNameEl;
		this.headerStatusDot = statusDot;

		minimizeBtn.addEventListener('click', () => this.toggleMinimize());
		closeBtn.addEventListener('click', () => this.hideWindow());
		header.addEventListener('click', (event) => {
			const target = event.target as HTMLElement;
			if (target.closest('.chat-header-actions'))
				return;
			this.toggleMinimize();
		});

		return chatWindow;
	}

	private toggleMinimize(): void {
		this.isMinimized = !this.isMinimized;
		this.windowEl.classList.toggle('minimized', this.isMinimized);
	}

	private hideWindow(): void {
		this.windowEl.classList.add('hidden');
	}

	private showWindow(): void {
		this.windowEl.classList.remove('hidden');
	}

	private createTab(friendId: number, friendName: string): HTMLButtonElement {
		const tab = document.createElement('button');
		tab.className = 'chat-tab';
		tab.type = 'button';
		tab.setAttribute('data-friend-id', friendId.toString());

		const tabStatus = document.createElement('span');
		tabStatus.className = 'chat-status-dot';
		if (!isFriendOnline(friendId)) {
			tabStatus.classList.add('offline');
		}

		const tabName = document.createElement('span');
		tabName.className = 'chat-tab-name';
		tabName.textContent = friendName;

		const closeBtn = document.createElement('span');
		closeBtn.className = 'chat-tab-close';
		closeBtn.textContent = '×';
		closeBtn.title = t('chat.closeChat') || 'Close';

		closeBtn.addEventListener('click', (event) => {
			event.stopPropagation();
			this.closeChat(friendId);
		});

		tab.append(tabStatus, tabName, closeBtn);

		tab.addEventListener('click', () => this.setActiveChat(friendId));

		return tab;
	}

	private updateHeader(friendId: number | null): void {
		if (friendId === null) {
			this.headerNameEl.textContent = '';
			this.headerStatusDot.classList.remove('offline');
			this.windowEl.querySelector('.chat-header')?.removeAttribute('data-active-friend-id');
			return;
		}
		const chat = this.openChats.get(friendId);
		if (!chat) return;
		this.headerNameEl.textContent = chat.getFriendName();
		const online = isFriendOnline(friendId);
		this.headerStatusDot.classList.toggle('offline', !online);
		(this.windowEl.querySelector('.chat-header') as HTMLElement).setAttribute('data-active-friend-id', friendId.toString());
	}

	private setActiveChat(friendId: number): void {
		if (this.activeFriendId === friendId)
			return;

		if (this.activeFriendId !== null) {
			const previous = this.openChats.get(this.activeFriendId);
			previous?.setActive(false);
			const previousTab = this.tabsEl.querySelector(`.chat-tab[data-friend-id="${this.activeFriendId}"]`);
			previousTab?.classList.remove('active');
		}

		this.activeFriendId = friendId;
		const current = this.openChats.get(friendId);
		current?.setActive(true);
		const currentTab = this.tabsEl.querySelector(`.chat-tab[data-friend-id="${friendId}"]`);
		currentTab?.classList.add('active');
		this.updateHeader(friendId);
	}

	public openChat(friendId: number, friendName: string): void {
		if (!this.openChats.has(friendId)) {
			const chatThread = new ChatWindow(friendId, friendName);
			this.openChats.set(friendId, chatThread);
			this.panelEl.appendChild(chatThread.getElement());
			this.tabsEl.appendChild(this.createTab(friendId, friendName));
		}

		this.showWindow();
		this.setActiveChat(friendId);
	}

	public closeChat(friendId: number): void {
		const chat = this.openChats.get(friendId);
		if (!chat)
			return;

		const tab = this.tabsEl.querySelector(`.chat-tab[data-friend-id="${friendId}"]`);
		tab?.remove();
		chat.getElement().remove();
		this.openChats.delete(friendId);

		if (this.activeFriendId === friendId) {
			const nextChat = this.openChats.keys().next();
			if (!nextChat.done) {
				this.activeFriendId = null;
				this.setActiveChat(nextChat.value);
			} else {
				this.activeFriendId = null;
				this.updateHeader(null);
				this.hideWindow();
			}
		}
	}

	public getOpenChat(friendId: number): ChatWindow | undefined {
		return this.openChats.get(friendId);
	}
}

let chatManager: ChatWindowManager | null = null;

export function getChatManager(): ChatWindowManager {
	if (!chatManager) {
		chatManager = new ChatWindowManager();
	}
	return chatManager;
}

export { ChatWindow, ChatWindowManager };
