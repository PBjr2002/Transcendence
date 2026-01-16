import { gameState } from "./Game/script";
import { navigate } from "./router";
import { loadGame } from "./Game/game";
import type { dataForGame } from "./Game/beforeGame";

class WebSocketService {
	private ws: WebSocket | null = null;
	private userId: number | null = null;
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private reconnectInterval: number = 3000;
	private suspendCountdownInterval: number | null = null;
	private suspendCountdownSeconds: number = 30;

	connect(userId: number) {
		this.userId = userId;
		this.reconnectAttempts = 0;
		if (this.ws && this.ws.readyState === WebSocket.OPEN)
			return;
		this.createConnection();
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

	start(dataForGame : any, lobby : any) {
		this.ws?.send(JSON.stringify({
			type: 'game:start',
			lobbyId: lobby.lobbyId,
			leaderId: this.userId,
			dataForGame
		}));
	}

	//Just for testing
	forcePlayer(lobbyId : string) {
		this.ws?.send(JSON.stringify({
			type: 'game:init',
			lobbyId: lobbyId,
			userId: this.userId,
		}));
	}

	up(lobbyId: string){
		this.ws?.send(JSON.stringify({
			type: 'game:input',
			lobbyId: lobbyId,
			userId: this.userId,
			input: 'up'
		}));
	}

	down(lobbyId: string){
		this.ws?.send(JSON.stringify({
			type: 'game:input',
			lobbyId: lobbyId,
			userId: this.userId,
			input: 'down'
		}));
	}

	ready(lobbyId: string) {
		this.ws?.send(JSON.stringify({
			type: 'game:playerState',
			lobbyId: lobbyId,
			userId: this.userId,
			state: true
		}));
	}

	notReady(lobbyId: string) {
		this.ws?.send(JSON.stringify({
			type: 'game:playerState',
			lobbyId: lobbyId,
			userId: this.userId,
			state: false,
		}));
	}

	powerUpsSwitch(lobbyId: string, state: boolean){
		this.ws?.send(JSON.stringify({
			type: 'game:powerUps',
			lobbyId: lobbyId,
			userId: this.userId,
			state: state,
		}));
	}

	firstPowerUp(lobbyId: string){
		this.ws?.send(JSON.stringify({
			type: 'game:input',
			lobbyId: lobbyId,
			userId: this.userId,
			input: 'powerUp1',
		}));
	}

	secondPowerUp(lobbyId: string){
		this.ws?.send(JSON.stringify({
			type: 'game:input',
			lobbyId: lobbyId,
			userId: this.userId,
			input: 'powerUp2',
		}));
	}

	thirdPowerUp(lobbyId: string){
		this.ws?.send(JSON.stringify({
			type: 'game:input',
			lobbyId: lobbyId,
			userId: this.userId,
			input: 'powerUp3',
		}));
	}

	suspendGame(lobbyId: string) {
		this.ws?.send(JSON.stringify({
			type: 'game:suspended',
			lobbyId: lobbyId,
			state: false
		}));
	}

	resumeGame(lobbyId: string) {
		this.ws?.send(JSON.stringify({
			type: 'game:resumed',
			lobbyId: lobbyId,
			state: true
		}));
	}


	private createConnection() {
		if (this.userId === null)
			return;
		
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${window.location.host}/api/wss`;
		
		this.ws = new WebSocket(wsUrl);
		this.ws.onopen = async () => {
			console.log("ABRIU");
			const res = await fetch(`/api/lobby/player`, {
				method: "GET",
				credentials: "include",
			});
			const response = await res.json();
			if (response.data.message === 'In Game') {
				//Now the problem is that since the game doesnt end yet neither player can leave -_-
				/* const res2 = await fetch(`/api/lobby/${response.data.lobby.lobbyId}/playerGameInfo`, {
					method: "GET",
					credentials: "include",
				});
				const response2 = await res2.json();
				loadGame(response2.data.playerGameInfo, response.data.lobby, true); */
				//Uncomment this part when the game end is finished
				navigate('/home');
				this.resumeGame(response.data.lobby.lobbyId);
				/* Maybe before forcing the player to the game send it to the home page
				and there give him the option to come back */
			}
			this.reconnectAttempts = 0;
			this.ws?.send(JSON.stringify({
				type: 'user_online',
				userId: this.userId
			}));
		};
		this.ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			if (data.type === 'friend_status_change')
				this.updateFriendStatus(data.friendId, data.online);
			else if (data.type === 'friend_request_received')
				this.addPendingRequest(data.newFriend);
			else if (data.type === 'friend_request_accepted')
				this.addNewFriend(data.newFriend);
			else if (data.type === 'friend_removed')
				this.removeFriend(data.removedFriendId);
			else if (data.type === 'game:init') {
				//this forces both to the lobby right away, just for testing
				navigate('/playGame', {}, { lobbyId: data.data.lobbyId });
				//this.invite(data.data);
			}
			else if (data.type === 'game:start')
				this.startGame(data.data.dataForGame, data.data.lobby);
			else if (data.type === 'game:input')
				this.input(data.data);
			else if (data.type === 'game:score')
				this.score(data.data.userId);
			else if (data.type === 'game:suspended') {
				//start the timer on the screen until the game collapses
				gameState.ballIsPaused = true;
				this.startSuspendCountdown(data.lobby.lobbyId);
			}
			else if (data.type === 'game:resumed') {
				//remove the timer and resume the game
				gameState.ballIsPaused = false;
				this.stopSuspendCountdown();
			}
			else if (data.type === 'game:end')
				this.endGame(data.data);
			else if (data.type === 'game:ended') {
				//maybe call the function that will close the game smoothly
				navigate('/home');
			}
			// Not sure if needed
			else if (data.type === 'game:powerUps')
				this.switchPowerUp(data.data)
		};
		this.ws.onclose = async (data: any = {}) => {
			const res = await fetch(`/api/lobby/player`, {
				method: "GET",
				credentials: "include",
			});
			const response = await res.json();
			if (response.data.message === 'In Game') {
				await fetch(`/api/lobby/${response.data.lobby.lobbyId}/playerGameInfo`, {
					method: "POST",
					credentials: "include",
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ playerGameInfo: data })
				});
			}
			this.attemptReconnect();
		};
		this.ws.onerror = () => {
			this.attemptReconnect();
		};
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

	/* private async invite(data: { lobbyId: string, leaderId: number, otherUserId: number }) {
		const res = await fetch(`/api/lobby/${data.lobbyId}/invite`, {
			method: "POST",
			credentials: "include",
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ toUserId: data.otherUserId })
		});
		await res.json();
	} */

	private async startGame(dataForGame : dataForGame, lobby : any) {
		await fetch(`/api/lobby/${lobby.lobbyId}/playerGameInfo`, {
			method: "POST",
			credentials: "include",
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ playerGameInfo: dataForGame })
		});
		loadGame(dataForGame, lobby, true);
	}

	private async input(inputData: { userId: number, input: string }) {
		// ToDo
		const player = gameState.getPlayerByUserId(inputData.userId);

		if(!player)
			return ;
		if(!gameState.ball || !gameState.scene)
			return ;

		switch (inputData.input){
			case 'powerUp1':
				if(!player._powerUps)
					break ;
				player._powerUps[0].use({player: player, ball: gameState.ball, scene: gameState.scene});
				break;
			case 'powerUp2':
				if(!player._powerUps)
					break ;
				player._powerUps[1].use({player: player, ball: gameState.ball, scene: gameState.scene});
				break;
			case 'powerUp3':
				if(!player._powerUps)
					break ;
				player._powerUps[2].use({player: player, ball: gameState.ball, scene: gameState.scene});
				break;
			case 'pause':
				gameState.ballIsPaused = true;
				break;
			case 'resume':
				gameState.ballIsPaused = false;
				break;
			case 'up':
				/* Top Wall Collision */
				let topWall = gameState.scene.getMeshByName("Upper Wall");

				player._paddle.position.z -= player._paddleSpeed;
				if(topWall && player._paddle.intersectsMesh(topWall, false))
						player._paddle.position.z += player._paddleSpeed;
				break;
			case 'down':
				/* Down Wall Collision */
				let downWall = gameState.scene.getMeshByName("Lower Wall");
			
				player._paddle.position.z += player._paddleSpeed;
				if(downWall && player._paddle.intersectsMesh(downWall, false))
						player._paddle.position.z -= player._paddleSpeed;
				break;
		}
	}

	private async score(userId: number) {
		//change the score to the user that scored
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

	private async switchPowerUp(data: { lobbyId: string, state: boolean, userId: number}){
		const powerUpButton = document.getElementById("togglePowerUps");
		const powerUpsSelected = document.querySelectorAll<HTMLSelectElement>(".powerup");

		if(!powerUpButton || !powerUpsSelected)
			return ;

		powerUpButton.textContent = data.state ? "ON" : "OFF";
  	
		if(!data.state)
		{
			powerUpsSelected.forEach((otherSelect) => {
				Array.from(otherSelect.options).forEach(option => {
					option.disabled = true;
				})
			});
		}
		else
		{
			powerUpsSelected.forEach((otherSelect) => {
				Array.from(otherSelect.options).forEach(option => {
					option.disabled = false;
				})
			});
		}
	}

	private startSuspendCountdown(lobbyId: string) {
		this.stopSuspendCountdown();
		let countdownOverlay = document.getElementById('suspend-countdown-overlay');
		if (!countdownOverlay) {
			countdownOverlay = document.createElement('div');
			countdownOverlay.id = 'suspend-countdown-overlay';
			countdownOverlay.style.cssText = `
				position: fixed;
				top: 50%;
				left: 50%;
				transform: translate(-50%, -50%);
				background: rgba(0, 0, 0, 0.8);
				color: white;
				padding: 30px 50px;
				border-radius: 10px;
				font-size: 24px;
				z-index: 9999;
				text-align: center;
			`;
			document.body.appendChild(countdownOverlay);
		}
		let remainingSeconds = this.suspendCountdownSeconds;
		countdownOverlay.innerHTML = `
			<div style="margin-bottom: 10px;">Game Paused</div>
			<div style="font-size: 48px; font-weight: bold; color: #ff6b6b;">${remainingSeconds}</div>
			<div style="margin-top: 10px; font-size: 18px;">Waiting for player to return...</div>
		`;
		this.suspendCountdownInterval = setInterval(() => {
			remainingSeconds--;
			if (remainingSeconds <= 0) {
				this.stopSuspendCountdown();
				if (countdownOverlay) {
					countdownOverlay.innerHTML = `
						<div style="font-size: 32px; color: #ff6b6b;">Game Ended</div>
						<div style="margin-top: 10px;">Player did not return in time</div>
					`;
					setTimeout(() => {
						countdownOverlay?.remove();
					}, 3000);
				}
				this.endGame({ lobbyId, score: "" });
				return;
			}
			if (countdownOverlay) {
				const color = remainingSeconds <= 10 ? '#ff6b6b' : '#ffd93d';
				countdownOverlay.innerHTML = `
					<div style="margin-bottom: 10px;">Game Paused</div>
					<div style="font-size: 48px; font-weight: bold; color: ${color};">${remainingSeconds}</div>
					<div style="margin-top: 10px; font-size: 18px;">Waiting for player to return...</div>
				`;
			}
		}, 1000);
	}

	private stopSuspendCountdown() {
		if (this.suspendCountdownInterval) {
			clearInterval(this.suspendCountdownInterval);
			this.suspendCountdownInterval = null;
		}
		const countdownOverlay = document.getElementById('suspend-countdown-overlay');
		if (countdownOverlay)
			countdownOverlay.remove();
	}
}

export const webSocketService = new WebSocketService();