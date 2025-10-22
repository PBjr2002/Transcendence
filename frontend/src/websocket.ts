class WebSocketService {
	private ws: WebSocket | null = null;
	private userId: number | null = null;
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private reconnectInterval: number = 3000;
	private heartbeatInterval: number | null = null;

	connect(userId: number) {
		this.userId = userId;
		this.reconnectAttempts = 0;
		this.createConnection();
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
			this.startHeartbeat();
		};
		this.ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			if (data.type === 'friend_status_change')
				this.updateFriendStatus(data.friendId, data.online);
			else if (data.type === 'friend_request_received')
				this.addPendingRequest(data.requester);
			else if (data.type === 'friend_request_accepted')
				this.addNewFriend(data.newFriend);
			else if (data.type === 'friend_removed')
				this.removeFriend(data.removedFriendId);
		};
		this.ws.onclose = () => {
			this.stopHeartbeat();
			this.attemptReconnect();
		};
		this.ws.onerror = () => {
			this.stopHeartbeat();
			this.attemptReconnect();
		};
	}
	private startHeartbeat() {
		this.stopHeartbeat();
		this.heartbeatInterval = setInterval(() => {
			if (this.ws && this.ws.readyState === WebSocket.OPEN)
				this.ws.send(JSON.stringify({ type: 'ping' }));
		}, 30000);
	}
	private stopHeartbeat() {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
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
		this.stopHeartbeat();
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.userId = null;
	}
	private updateFriendStatus(friendId: number, online: boolean) {
		const friendElement = document.querySelector(`[data-friend-id="${friendId}"]`);
		if (friendElement) {
			const statusIndicator = friendElement.querySelector('.status-indicator');
			if (statusIndicator) {
				if (online)
					statusIndicator.className = "status-indicator w-3 h-3 rounded-full bg-green-500";
				else
					statusIndicator.className = "status-indicator w-3 h-3 rounded-full bg-red-500";
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

			friendNameContainer.appendChild(nameSpan);
			friendNameContainer.appendChild(statusIndicator);	

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
}

export const webSocketService = new WebSocketService();