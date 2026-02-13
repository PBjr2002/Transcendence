import { gameState } from "./Game/script";
import { t } from "./i18n";

class WebSocketService {
	private ws: WebSocket | null = null;
	private userId: number | null = null;
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private reconnectInterval: number = 3000;

	connect(userId: number) {
		if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        	return;
    	}
		this.userId = userId;
		this.reconnectAttempts = 0;
		this.createConnection();
	}

	async ensureConnected(): Promise<void> {
		if (this.ws && this.ws.readyState === WebSocket.OPEN)
			return;
		if (this.userId !== null) {
			this.connect(this.userId);
			return;
		}
		try {
			const res = await fetch('/api/me', { credentials: 'include' });
			if (!res.ok)
				return;
			const data = await res.json();
			const safeUser = data?.data?.safeUser || data?.safeUser || data?.data || data;
			const userId = safeUser?.id;
			if (userId)
				this.connect(userId);
		} catch (err) {
			console.error('Failed to ensure websocket connection:', err);
		}
	}

	pause(lobbyId : string) {
		this.ws?.send(JSON.stringify({
			type: 'game:input',
			lobbyId: lobbyId,
			userId: this.userId,
			input: 'pause'
		}));
	}

	resume(lobbyId : string) {
		this.ws?.send(JSON.stringify({
			type: 'game:input',
			lobbyId: lobbyId,
			userId: this.userId,
			input: 'resume'
		}));
	}

	private createConnection() {
		if (this.userId === null)
			return;
		
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${window.location.host}/api/wss`;
		
		this.ws = new WebSocket(wsUrl);
		this.ws.onopen = () => {
			this.reconnectAttempts = 0;
			this.ws?.send(JSON.stringify({
				type: 'user_online',
				userId: this.userId
			}));
		};
		this.ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
		console.log('[WebSocket] Message received:', data);
		if (data.type === 'friend_status_change') {
			console.log(`[WebSocket] Friend status change: friendId=${data.friendId}, online=${data.online}`);
			this.updateFriendStatus(data.friendId, data.online);
		}
			else if (data.type === 'message' || data.message)
				this.handleChatMessage(data);
			else if (data.type === 'friend_request_received')
				this.addPendingRequest(data.newFriend);
			else if (data.type === 'friend_request_accepted')
				this.addNewFriend(data.newFriend);
			else if (data.type === 'friend_removed')
				this.removeFriend(data.removedFriendId);
			else if (data.type === 'game_invite_received')
				this.showGameInvite(data.invitation);
			else if (data.type === 'game:init')
				this.invite(data.data);
			else if (data.type === 'game:start')
				this.startGame();
			else if (data.type === 'game:input')
				this.input(data.data);
			else if (data.type === 'game:score')
				this.score(data.data.userId);
			else if (data.type === 'game:end')
				this.endGame(data.data);
		};
		this.ws.onclose = () => {
			this.attemptReconnect();
		};
		this.ws.onerror = () => {
			this.attemptReconnect();
		};
	}

	private handleChatMessage(payload: any) {
		let message = payload.message || payload.newMessage || payload.data || payload;
		
		if (message && typeof message === 'object' && message.success && message.message && !message.messageText && !message.fromId) {
			message = message.message;
		}
		
		const senderId = message.fromUserId ?? message.senderId ?? message.fromId ?? message.userId;
		
		if (!senderId || senderId === this.userId)
			return;
		
		const roomId = message.chatRoomId ?? message.roomId;
		const text = message.messageText ?? message.text ?? '';
		
		if (!text)
			return;

		const friendElement = document.querySelector(`[data-friend-id="${senderId}"]`);
		const friendName = friendElement?.querySelector('span')?.textContent || 'Friend';

		import('./components/ChatWindow').then(({ getChatManager }) => {
			const chatManager = getChatManager();
			chatManager.openChat(senderId, friendName);
			const chat = chatManager.getOpenChat(senderId);
			if (chat && roomId)
				chat.setRoomId(roomId);
			chat?.applyIncomingMessage(message);
		});
	}
	private attemptReconnect() {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			setTimeout(() => {
				this.createConnection();
			}, this.reconnectInterval);
		}
	}
	disconnect() {
		this.reconnectAttempts = this.maxReconnectAttempts;
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.userId = null;
	}

	getCurrentUserId(): number | null {
		return this.userId;
	}
	private updateFriendStatus(friendId: number, online: boolean) {
		console.log(`[updateFriendStatus] Looking for friend ${friendId}, online=${online}`);
		const friendElement = document.querySelector(`[data-friend-id="${friendId}"]`);
		console.log(`[updateFriendStatus] Friend element found:`, friendElement);
		if (friendElement) {
			const statusSpan = friendElement.querySelector('.friend-status') as HTMLElement | null;
			console.log(`[updateFriendStatus] Status span found:`, statusSpan);
			if (statusSpan) {
				const oldClass = statusSpan.className;
				if (online)
					statusSpan.className = 'friend-status online';
				else
					statusSpan.className = 'friend-status offline';
				console.log(`[updateFriendStatus] Class changed from "${oldClass}" to "${statusSpan.className}"`);
			}

			const statusIndicator = friendElement.querySelector('.status-indicator') as HTMLElement | null;
			if (statusIndicator) {
				statusIndicator.classList.toggle('bg-green-500', online);
				statusIndicator.classList.toggle('bg-red-500', !online);
			}
		} else {
			console.warn(`[updateFriendStatus] Friend element not found for friendId ${friendId}`);
		}

		const chatTab = document.querySelector(`.chat-tab[data-friend-id="${friendId}"]`);
		if (chatTab) {
			const chatStatusDot = chatTab.querySelector('.chat-status-dot') as HTMLElement | null;
			if (chatStatusDot) {
				chatStatusDot.classList.toggle('offline', !online);
			}
		}

		const chatHeader = document.querySelector('.chat-window-multi .chat-header') as HTMLElement | null;
		if (chatHeader && chatHeader.getAttribute('data-active-friend-id') === friendId.toString()) {
			const headerStatusDot = chatHeader.querySelector('.chat-status-dot') as HTMLElement | null;
			if (headerStatusDot) {
				headerStatusDot.classList.toggle('offline', !online);
			}
		}
	}

	private addPendingRequest(requesterData: { id: number; name: string }) {
		const requestList = document.querySelector('ul.space-y-2');
		if (requestList) {
			const noRequestsMsg = requestList.querySelector('li.text-gray-600');
			if (noRequestsMsg)
				noRequestsMsg.remove();
			const li = document.createElement("li");
			li.className = "bg-white p-3 rounded shadow";

			const nameContainer = document.createElement("div");
			nameContainer.className = "flex items-center";
			
			const name = document.createElement("span");
			name.textContent = `From: ${requesterData.name}`;
			name.className = "text-gray-800";
			nameContainer.appendChild(name);
			li.appendChild(nameContainer);
			
			const buttonDiv = document.createElement("div");
			buttonDiv.className = "flex items-center space-x-2 mt-1";
			
			const acceptButton = document.createElement("button");
			acceptButton.textContent = "Accept";
			acceptButton.className = "accept-friend-button bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded";
			acceptButton.setAttribute('data-requester-id', requesterData.id.toString());
			
			const rejectButton = document.createElement("button");
			rejectButton.textContent = "Reject";
			rejectButton.className = "reject-friend-button bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded";
			rejectButton.setAttribute('data-requester-id', requesterData.id.toString());

			buttonDiv.appendChild(acceptButton);
			buttonDiv.appendChild(rejectButton);
			li.appendChild(buttonDiv);
			requestList.appendChild(li);
		}
	}

	private addNewFriend(friendData: { id: number; name: string; online: boolean }) {
		const friendsList = document.querySelector('ul.space-y-1');
		if (friendsList) {
			const noFriendsMsg = friendsList.querySelector('li.text-gray-600');
			if (noFriendsMsg)
				noFriendsMsg.remove();

			const li = document.createElement("li");
			li.className = "bg-white p-3 rounded shadow flex justify-between items-center";
			li.setAttribute('data-friend-id', friendData.id.toString());

			const friendNameContainer = document.createElement("div");
			friendNameContainer.className = "flex items-center space-x-2";

			const statusIndicator = document.createElement("span");
			if (friendData.online)
				statusIndicator.className = "status-indicator w-3 h-3 rounded-full bg-green-500";
			else
				statusIndicator.className = "status-indicator w-3 h-3 rounded-full bg-red-500";

			const nameSpan = document.createElement("span");
			nameSpan.textContent = friendData.name;

			friendNameContainer.appendChild(statusIndicator);
			friendNameContainer.appendChild(nameSpan);	

			const removeFriendButton = document.createElement("button");
			removeFriendButton.textContent = "Remove";
			removeFriendButton.className = "remove-friend-button bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded";
			removeFriendButton.setAttribute('data-friend-id', friendData.id.toString());

			li.appendChild(friendNameContainer);
			li.appendChild(removeFriendButton);
			friendsList.appendChild(li);
		}
	}

	private removeFriend(removedFriendId: number) {
		const friendElement = document.querySelector(`[data-friend-id="${removedFriendId}"]`);
		if (friendElement) {
			friendElement.remove();
			const friendsList = document.querySelector('ul.space-y-1');
			if (friendsList && friendsList.children.length === 0) {
				const noFriendsLi = document.createElement("li");
				noFriendsLi.className = "text-gray-600";
				noFriendsLi.textContent = "No friends yet.";
				friendsList.appendChild(noFriendsLi);
			}
		}
	}

	private showGameInvite(invitation: { fromUserId: number, fromUserName: string, lobbyId?: string, roomId?: number, lobbyMeta?: any }) {
		let notificationContainer = document.querySelector('#game-invite-notifications') as HTMLElement | null;
		if (!notificationContainer) {
			notificationContainer = document.createElement('div') as HTMLElement;
			notificationContainer.id = 'game-invite-notifications';
			notificationContainer.className = 'fixed z-50 space-y-2 max-w-sm';
			notificationContainer.style.top = '140px';
			notificationContainer.style.left = '60px';
			document.body.appendChild(notificationContainer);
		}

		const inviteWrapper = document.createElement('div');
		inviteWrapper.className = 'relative overflow-hidden rounded-2xl';
		inviteWrapper.style.background = 'rgba(4, 18, 32, 0.82)';
		inviteWrapper.style.border = '1px solid rgba(0, 180, 255, 0.18)';
		inviteWrapper.style.boxShadow = '0 40px 80px rgba(0, 0, 0, 0.45), inset 0 0 40px rgba(0, 122, 255, 0.08)';
		
		const timerBar = document.createElement('div');
		timerBar.className = 'absolute top-0 left-0 h-1 transition-all ease-linear';
		timerBar.style.background = 'linear-gradient(90deg, #00b4ff, #ff003b)';
		timerBar.style.width = '0%';
		timerBar.style.transitionDuration = '30000ms';
		timerBar.style.boxShadow = '0 0 20px rgba(0, 180, 255, 0.6)';
		
		const inviteDiv = document.createElement('div');
		inviteDiv.className = 'relative z-10';
		inviteDiv.style.padding = '24px';
		
		const title = document.createElement('h3');
		title.className = 'font-bold text-lg mb-2';
		title.style.color = 'rgba(255, 255, 255, 0.95)';
		title.textContent = `🎮 ${t('game.invite')}`;
		
		const message = document.createElement('p');
		message.className = 'mb-4 text-sm';
		message.style.color = 'rgba(255, 255, 255, 0.72)';
		if (invitation.lobbyId) {
			message.textContent = `${invitation.fromUserName} ${t('game.invitedLobby')}`;
		} else {
			message.textContent = `${invitation.fromUserName} ${t('game.invitedGame')}`;
		}
		
		const buttonContainer = document.createElement('div');
		buttonContainer.className = 'flex gap-2';
		
		const acceptButton = document.createElement('button');
		acceptButton.className = 'flex-1 rounded font-semibold px-4 py-2 transition-all border-none cursor-pointer';
		acceptButton.style.background = 'linear-gradient(120deg, #00b4ff, #00ff88)';
		acceptButton.style.color = '#fff';
		acceptButton.style.boxShadow = '0 10px 30px rgba(0, 180, 255, 0.35)';
		acceptButton.textContent = t('friends.accept');
		acceptButton.onmouseover = () => {
			acceptButton.style.boxShadow = '0 15px 40px rgba(0, 180, 255, 0.5)';
			acceptButton.style.transform = 'translateY(-2px)';
		};
		acceptButton.onmouseout = () => {
			acceptButton.style.boxShadow = '0 10px 30px rgba(0, 180, 255, 0.35)';
			acceptButton.style.transform = 'translateY(0)';
		};
		
		const declineButton = document.createElement('button');
		declineButton.className = 'flex-1 rounded font-semibold px-4 py-2 transition-all border-none cursor-pointer';
		declineButton.style.background = 'rgba(255, 0, 59, 0.1)';
		declineButton.style.color = 'rgba(255, 100, 130, 0.9)';
		declineButton.style.border = '1px solid rgba(255, 0, 59, 0.3)';
		declineButton.style.boxShadow = '0 0 15px rgba(255, 0, 59, 0.15)';
		declineButton.textContent = t('friends.reject');
		declineButton.onmouseover = () => {
			declineButton.style.background = 'rgba(255, 0, 59, 0.15)';
			declineButton.style.boxShadow = '0 0 25px rgba(255, 0, 59, 0.25)';
			declineButton.style.transform = 'translateY(-2px)';
		};
		declineButton.onmouseout = () => {
			declineButton.style.background = 'rgba(255, 0, 59, 0.1)';
			declineButton.style.boxShadow = '0 0 15px rgba(255, 0, 59, 0.15)';
			declineButton.style.transform = 'translateY(0)';
		};
		
		let isHandled = false;
		
		acceptButton.addEventListener('click', async () => {
			if (isHandled) return;
			isHandled = true;
			
			if (invitation.lobbyId) {
				try {
					const res = await fetch(`/api/lobby/${invitation.lobbyId}/join`, {
						method: 'PUT',
						credentials: 'include'
					});
					if (res.ok) {
						console.log('Successfully joined lobby:', invitation.lobbyId);
					}
				} catch (error) {
					console.error('Failed to join lobby:', error);
				}
			} else if (invitation.roomId) {
				console.log('Accepted chat room game invite from room:', invitation.roomId);
			}
			inviteWrapper.remove();
		});
		
		const handleReject = () => {
			if (isHandled) return;
			isHandled = true;
			
			if (invitation.lobbyId) {
				fetch(`/api/lobby/${invitation.lobbyId}/reject`, {
					method: 'POST',
					credentials: 'include'
				}).catch(error => console.error('Failed to send rejection:', error));
			}
			
			inviteWrapper.remove();
		};
		
		declineButton.addEventListener('click', handleReject);
		
		buttonContainer.appendChild(acceptButton);
		buttonContainer.appendChild(declineButton);
		
		inviteDiv.appendChild(title);
		inviteDiv.appendChild(message);
		inviteDiv.appendChild(buttonContainer);
		
		inviteWrapper.appendChild(timerBar);
		inviteWrapper.appendChild(inviteDiv);
		notificationContainer.appendChild(inviteWrapper);
		
		setTimeout(() => {
			timerBar.style.width = '100%';
		}, 50);
		
		const autoRejectTimeout = setTimeout(() => {
			if (inviteWrapper.parentElement && !isHandled) {
				handleReject();
			}
		}, 30000);
		
		inviteWrapper.addEventListener('remove', () => {
			clearTimeout(autoRejectTimeout);
		});
	}

	private async invite(data: { lobbyId: string, leaderId: number, otherUserId: number }) {
		const res = await fetch(`/api/lobby/${data.lobbyId}/invite`, {
			method: "POST",
			credentials: "include",
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ toUserId: data.otherUserId })
		});
		await res.json();
	}

	private async startGame() {
	}

	private async input(inputData: { userId: number, input: string }) {
		if (inputData.input === 'up')
			return;
		else if (inputData.input === 'down')
			return;
		else if (inputData.input === 'pause')
			gameState.ballIsPaused = true;
		else if (inputData.input === 'resume')
			gameState.ballIsPaused = false;
	}

	private async score(userId: number) {
		console.log("UserId:", userId);
	}

	private async endGame(data: { lobbyId: string, score: string }) {
		const res = await fetch(`/api/lobby/${data.lobbyId}/leave`, {
			method: "PUT",
			credentials: "include"
		});
		const response = await res.json();
		console.log("RESP:", response);
	}
}

export const webSocketService = new WebSocketService();
(window as any).webSocketService = webSocketService;