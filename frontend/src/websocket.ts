import { gameState } from "./Game/script";
import { t } from "./i18n";
import * as BABYLON from "@babylonjs/core";
import { navigate } from "./router";
import { loadGame } from "./Game/game";
import type { DataForGame } from "./Game/beforeGame";
import { dataForGame } from "./Game/beforeGame";
//import { refreshFriendsList } from "./app";

class WebSocketService {
	private ws: WebSocket | null = null;
	private userId: number | null = null;
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private reconnectInterval: number = 3000;
	private suspendCountdownInterval: number | null = null;
	private suspendCountdownSeconds: number = 30;

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
		if (gameState.whoPausedGame === -1) {
			this.ws?.send(JSON.stringify({
				type: 'game:input',
				lobbyId: lobbyId,
				userId: this.userId,
				input: 'pause'
			}));
		}
	}

	resume(lobbyId : string) {
		if (this.userId === gameState.whoPausedGame) {
			this.ws?.send(JSON.stringify({
				type: 'game:input',
				lobbyId: lobbyId,
				userId: this.userId,
				input: 'resume'
			}));
		}
	}

	start(dataForGame : any, lobby : any) {
		this.ws?.send(JSON.stringify({
			type: 'game:start',
			lobbyId: lobby.lobbyId,
			leaderId: this.userId,
			dataForGame
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

	ballUpdate(lobby: any, ballData: { position: { x: number, y: number, z: number }, velocity: { x: number, y: number, z: number } }) {
		this.ws?.send(JSON.stringify({
			type: 'game:ballUpdate',
			lobby: lobby,
			userId: this.userId,
			ballData: ballData
		}));
	}

	paddleCollision(lobbyId: string, collisionData: { userId: number, ballVelocity: { x: number, y: number, z: number }, ballPosition: { x: number, y: number, z: number } }) {
		this.ws?.send(JSON.stringify({
			type: 'game:paddleCollision',
			lobbyId: lobbyId,
			userId: this.userId,
			data: collisionData
		}));
	}

	wallCollision(lobbyId: string, collisionData: { wall: string, ballVelocity: { x: number, y: number, z: number }, ballPosition: { x: number, y: number, z: number } }) {
		this.ws?.send(JSON.stringify({
			type: 'game:wallCollision',
			lobbyId: lobbyId,
			userId: this.userId,
			data: collisionData
		}));
	}

	goal(lobbyId: string, goalData: { scoringPlayerId: number, isPlayer1Goal: boolean, points: number }) {
		if (goalData.scoringPlayerId === this.userId) {
			this.ws?.send(JSON.stringify({
				type: 'game:goal',
				lobbyId: lobbyId,
				userId: this.userId,
				goalData: goalData
			}));
		}
	}

	rejoinNotification(lobby: any) {
		this.ws?.send(JSON.stringify({
			type: 'game:rejoin',
			lobby: lobby
		}));
	}

	suspendGame(lobbyId: string) {
		this.ws?.send(JSON.stringify({
			type: 'game:playerLeft',
			lobbyId: lobbyId,
			userId: this.userId
		}));
		this.ws?.send(JSON.stringify({
			type: 'game:suspended',
			lobbyId: lobbyId,
			userId: this.userId
		}));
	}

	resumeGame(lobbyId: string) {
		this.ws?.send(JSON.stringify({
			type: 'game:playerRejoined',
			lobbyId: lobbyId,
			userId: this.userId
		}));
		this.ws?.send(JSON.stringify({
			type: 'game:resumed',
			lobbyId: lobbyId
		}));
	}

	gameOver(lobbyId: string, winnerId: number, loserId: number){
		this.ws?.send(JSON.stringify({
			type: 'game:end',
			lobbyId: lobbyId,
			winnerId: winnerId,
			loserId: loserId,
			userId: this.userId
		}));
	}


	private createConnection() {
		if (this.userId === null)
			return;
		
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${window.location.host}/api/wss`;
		
		this.ws = new WebSocket(wsUrl);
		this.ws.onopen = async () => {
			this.reconnectAttempts = 0;
			this.ws?.send(JSON.stringify({
				type: 'user_online',
				userId: this.userId
			}));

			try {
				const res = await fetch(`/api/lobby/player`, {
					method: "GET",
					credentials: "include",
				});
				if (!res.ok)
					return;
				const response = await res.json();
				if (window.location.pathname === '/playGame' && response?.data?.message === 'Not In Game Or Lobby')
					return navigate('/home');
				if (response?.data?.message === 'In Game' && response?.data?.lobby) {
					return this.ws?.send(JSON.stringify({
						type: 'game:rejoin',
						lobby: response.data.lobby
					}));
				}
				if (response?.data?.message === 'In Lobby' && response?.data?.lobby) {
					return this.ws?.send(JSON.stringify({
						type: 'lobby:goHome',
						lobby: response.data.lobby
					}));
				}
			} catch (err) {
				console.error('Error checking player game status on WebSocket open:', err);
			}
		};
		this.ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			switch (data.type) {
				case 'friend_request_accepted':
				case 'friend_removed':
					return this.refreshFriendsList();
				case 'friend_status_change':
					return this.updateFriendStatus(data.friendId, data.online);
				case 'lobby:goHome':
					return navigate('/home');
				case 'game_invite_received':
					return this.showGameInvite(data.invitation);
				case 'game_invite_sent':
					return this.hideGameInvite(data.invitation);
				case 'game_invite_rejected':
					return this.notifyOfRejection(data.data);
				case 'lobby:enterLobby':
					return navigate('/playGame', {}, { lobbyId: data.lobby.lobbyId });
				case 'game:init':
					return this.invite(data.data);
				case 'game:start':
					return this.startGame(data.data.dataForGame, data.data.lobby);
				case 'game:input':
					return this.input(data.data);
				case 'game:ballUpdate':
					return this.updateBallState(data.data.ballData);
				case 'game:paddleCollision':
					return this.handleRemotePaddleCollision(data.data);
				case 'game:wallCollision':
					return this.handleRemoteWallCollision(data.data);
				case 'game:goal':
					return this.handleRemoteGoal(data.data);
				case 'game:score':
					return this.score(data.data.userId);
				case 'game:playerState':
					return this.updateReadyBtn(data.data.lobby);
				case 'game:rejoin':
					return this.notifyToRejoin(data.lobby);
				case 'game:suspended':
					return this.suspendedGame(data.lobby);
				case 'game:resumed':
					return this.resumedGame();
				case 'game:end':
					return this.endGame(data.data);
				case 'game:ended':
					return navigate('/home');
				case 'game:stopCountdown':
					return this.stopSuspendCountdown();
				case 'game:powerUps':
					return this.switchPowerUp(data.data);
				case 'message':
					return this.handleChatMessage(data);
			}
		};
		this.ws.onclose = async (data: any = {}) => {
			try {
				const res = await fetch(`/api/lobby/player`, {
					method: "GET",
					credentials: "include",
				});
				if (!res.ok) {
					this.attemptReconnect();
					return;
				}
				const response = await res.json();
				if (response?.data?.message === 'In Game' && response?.data?.lobby) {
					await fetch(`/api/lobby/${response.data.lobby.lobbyId}/playerGameInfo`, {
						method: "POST",
						credentials: "include",
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ playerGameInfo: data })
					});
				}
			} catch (err) {
				console.error('Error in WebSocket close handler:', err);
			}
			this.attemptReconnect();
		};
		this.ws.onerror = () => {
			this.attemptReconnect();
		};
	}

	private refreshFriendsList() {
		const refresh = (window as any).refreshFriendsList;
		if (typeof refresh === 'function') {
			refresh();
			return;
		}
		window.dispatchEvent(new CustomEvent('friends:refresh'));
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

	private async invite(data: { lobbyId: string, leaderId: number, otherUserId: number }) {
		const res = await fetch(`/api/lobby/${data.lobbyId}/invite`, {
			method: "POST",
			credentials: "include",
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ toUserId: data.otherUserId })
		});
		await res.json();
	}

	private async startGame(dataForGame : DataForGame, lobby : any) {
		await fetch(`/api/lobby/${lobby.lobbyId}/playerGameInfo`, {
			method: "POST",
			credentials: "include",
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ playerGameInfo: dataForGame })
		});
		loadGame(dataForGame, lobby, true, false);
	}

	private async input(inputData: { lobbyId: string, userId: number, input: string }) {

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
			case 'pause': {
				gameState.whoPausedGame = inputData.userId;
				gameState.ballIsPaused = true;
				const resumeBtn = document.getElementById('btn-resume')! as HTMLButtonElement;
				const pauseBtn = document.getElementById('btn-pause')! as HTMLButtonElement;
				if (this.userId === inputData.userId) {
					resumeBtn.hidden = false;
					pauseBtn.hidden = true;
				}
				else {
					pauseBtn.disabled = true;
					pauseBtn.classList.remove("bg-yellow-500", "hover:bg-yellow-400");
					pauseBtn.classList.add("bg-gray-400", "text-gray-700", "cursor-not-allowed","opacity-70");
				}
				break;
			}
			case 'resume': {
				gameState.whoPausedGame = -1;
				gameState.ballIsPaused = false;
				const resumeBtn = document.getElementById('btn-resume')! as HTMLButtonElement;
				const pauseBtn = document.getElementById('btn-pause')! as HTMLButtonElement;
				if (this.userId === inputData.userId) {
					resumeBtn.hidden = true;
					pauseBtn.hidden = false;
				}
				else {
					pauseBtn.disabled = false;
					pauseBtn.classList.remove("bg-gray-400", "text-gray-700", "cursor-not-allowed","opacity-70");
					pauseBtn.classList.add("bg-yellow-500", "hover:bg-yellow-400");
				}
				break;
			}
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

	private async updateReadyBtn(lobby: any) {
		const readyBtn = document.getElementById("readyBtn")! as HTMLButtonElement;
		let counter;
		if (lobby.player1Ready && lobby.player2Ready)
			counter = '(2/2)';
		else if (lobby.player1Ready || lobby.player2Ready)
			counter = '(1/2)';
		else
			counter = '(0/2)';

		if ((this.userId === lobby.playerId1 && lobby.player1Ready) || (this.userId === lobby.playerId2 && lobby.player2Ready))
			readyBtn.textContent = `${t("beforeGame.ready")} ${counter}`;
		else
			readyBtn.textContent = `${t("beforeGame.notReady")} ${counter}`;
	}

	private async suspendedGame(lobby: any) {
		gameState.ballIsPaused = true;
		this.startSuspendCountdown(lobby.lobbyId);
	}

	private	async resumedGame() {
		gameState.ballIsPaused = false;
		this.stopSuspendCountdown();
	}

	private async notifyToRejoin(lobby: any) {
		let rejoinPopup = document.getElementById('rejoin-game-popup');

		if (!rejoinPopup) {
			rejoinPopup = document.createElement('div');
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
		}

		rejoinPopup.innerHTML = `
			<div style="
				background: white;
				padding: 30px 40px;
				border-radius: 12px;
				box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
				max-width: 400px;
				text-align: center;
			">
				<h2 style="
					margin: 0 0 15px 0;
					color: #333;
					font-size: 24px;
					font-weight: bold;
				">${t("beforeGame.gameInProgress")}</h2>
				<p style="
					margin: 0 0 25px 0;
					color: #666;
					font-size: 16px;
					line-height: 1.5;
				">${t("beforeGame.gameInProgressMessage")}</p>
				<div style="
					display: flex;
					gap: 12px;
					justify-content: center;
				">
					<button id="rejoin-game-button" data-lobby-id="${lobby.lobbyId}" style="
						background: #4CAF50;
						color: white;
						border: none;
						padding: 12px 24px;
						border-radius: 6px;
						font-size: 16px;
						cursor: pointer;
						transition: background 0.3s;
					">${t("beforeGame.rejoinGame")}</button>
					<button id="dismiss-rejoin-button" style="
						background: #f44336;
						color: white;
						border: none;
						padding: 12px 24px;
						border-radius: 6px;
						font-size: 16px;
						cursor: pointer;
						transition: background 0.3s;
					">${t("beforeGame.later")}</button>
				</div>
			</div>
		`;
		rejoinPopup.style.display = 'flex';

		const dismissButton = document.getElementById('dismiss-rejoin-button');
		if (dismissButton) {
			dismissButton.onclick = () => {
				rejoinPopup.style.display = 'none';
				navigate('/home');
			};
		}
		const rejoinButton = document.getElementById('rejoin-game-button');
		if (rejoinButton) {
			rejoinButton.onclick = async () => {
				rejoinPopup.style.display = 'none';
				const res = await fetch(`/api/lobby/${lobby.lobbyId}/playerGameInfo`, {
					method: "GET",
					credentials: "include",
				});
				const response = await res.json();
				navigate('/playGame');
				loadGame(response.data.playerGameInfo, lobby, true, true);
				this.resumeGame(lobby.lobbyId);
			};
		}
	}

	private async endGame(data: { lobbyId: string, winnerId: number, loserId: number }) {
		if (this.userId !== data.winnerId)
			return;
		const matchRes = await fetch(`/api/addNewGame`, {
			method: "POST",
			credentials: "include",
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ user1Id: data.winnerId, user2Id: data.loserId })
		});
		await matchRes.json();
		const res = await fetch(`/api/lobby/${data.lobbyId}/end`, {
			method: "PUT",
			credentials: "include"
		});
		await res.json();
	}

	private async endSuspendedGame(data: { lobbyId: string, score: string }) {
		const lobbyRes = await fetch(`/api/lobby/${data.lobbyId}`, {
			method: "GET",
			credentials: "include"
		});
		const lobbyResponse = await lobbyRes.json();
		const lobby = lobbyResponse?.data?.lobby || lobbyResponse?.data || {};

		const winnerId = this.userId;
		let	loserId;
		if (lobby.playerId1 === this.userId)
			loserId = lobby.playerId2;
		else
			loserId = lobby.playerId1;
		const matchRes = await fetch(`/api/addNewGame`, {
			method: "POST",
			credentials: "include",
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ user1Id: winnerId, user2Id: loserId })
		});
		await matchRes.json();

		const res = await fetch(`/api/lobby/${data.lobbyId}/endSuspendedGame`, {
			method: "PUT",
			credentials: "include"
		});
		await res.json();
	}

	private async switchPowerUp(data: { lobbyId: string, state: boolean}){
		const powerUpButton = document.getElementById("togglePowerUps");
		const powerUpsSelected = document.querySelectorAll<HTMLSelectElement>(".powerup");
		const readyBtn = document.getElementById("readyBtn")! as HTMLButtonElement;

		if(!powerUpButton || !powerUpsSelected)
			return ;

		readyBtn.textContent = `'${t("beforeGame.notReady")} (0/2)';`
		readyBtn.classList.remove("bg-green-500", "hover:bg-green-600");
		readyBtn.classList.add("bg-red-500", "hover:bg-red-600");
		dataForGame.setReadyState?.(false);

		powerUpButton.textContent = data.state ? `"${t("beforeGame.on")}"` : `"${t("beforeGame.off")}"`;
		if(!data.state)
		{
			powerUpButton.classList.remove("ON");
			powerUpButton.classList.add("OFF");
			powerUpsSelected.forEach((otherSelect) => {
				Array.from(otherSelect.options).forEach(option => {
					option.disabled = true;
				})
			});
		}
		else
		{
			powerUpButton.classList.remove("OFF");
			powerUpButton.classList.add("ON");
			powerUpsSelected.forEach((otherSelect) => {
				Array.from(otherSelect.options).forEach(option => {
					option.disabled = false;
				})
			});
		}
	}

	private updateBallState(ballData: { position?: { x: number, y: number, z: number }, velocity?: { x: number, y: number, z: number } }) {
		if(!gameState.ball || !gameState.scene || gameState.ballIsPaused || gameState.isGameOver)
			return;

		const validPosition =
        	ballData?.position &&
        	ballData.position.x !== undefined &&
        	ballData.position.y !== undefined &&
        	ballData.position.z !== undefined;

    	const validVelocity =
        	ballData?.velocity &&
        	!(ballData.velocity.x === 0 &&
          	ballData.velocity.y === 0 &&
          	ballData.velocity.z === 0);

		if(ballData.position && ballData.velocity && validPosition && validVelocity)
		{
			gameState.ball._ball.position.set(
        		ballData.position.x,
        		ballData.position.y,
        		ballData.position.z
    		);

			gameState.ball._ballVelocity.set(
				ballData.velocity.x,
				ballData.velocity.y,
				ballData.velocity.z
			);

			gameState.lastValidBallState = {
				position: { ...ballData.position },
				velocity: { ...ballData.velocity }
			};
			return ;
		}

		if (gameState.lastValidBallState)
    	{	
	        const saved = gameState.lastValidBallState;
			
	        gameState.ball._ball.position.set(
	            saved.position.x,
	            saved.position.y,
	            saved.position.z
	        );
		
	        gameState.ball._ballVelocity.set(
	            saved.velocity.x,
	            saved.velocity.y,
	            saved.velocity.z
	        );
    	}
	}

	private handleRemotePaddleCollision(collisionData: { userId: number, ballVelocity: { x: number, y: number, z: number }, ballPosition: { x: number, y: number, z: number } }) {
		if(!gameState.ball || !gameState.scene)
			return;
		
		gameState.ball._ball.position.set(collisionData.ballPosition.x, collisionData.ballPosition.y, collisionData.ballPosition.z);
		gameState.ball._ballVelocity = new BABYLON.Vector3(collisionData.ballVelocity.x, collisionData.ballVelocity.y, collisionData.ballVelocity.z);
	}

	private handleRemoteWallCollision(collisionData: { wall: string, ballVelocity: { x: number, y: number, z: number }, ballPosition: { x: number, y: number, z: number } }) {
		if(!gameState.ball || !gameState.scene)
			return;
		
		gameState.ball._ball.position.set(collisionData.ballPosition.x, collisionData.ballPosition.y, collisionData.ballPosition.z);
		gameState.ball._ballVelocity = new BABYLON.Vector3(collisionData.ballVelocity.x, collisionData.ballVelocity.y, collisionData.ballVelocity.z);
	}
	private handleRemoteGoal(goalData: { scoringPlayerId: number, isPlayer1Goal: boolean, points: number }) {
		if ((gameState as any).processRemoteGoal) {
			(gameState as any).processRemoteGoal(goalData);
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
			<div style="margin-bottom: 10px;">${t("beforeGame.gamePaused")}</div>
			<div style="font-size: 48px; font-weight: bold; color: #ff6b6b;">${remainingSeconds}</div>
			<div style="margin-top: 10px; font-size: 18px;">${t("beforeGame.waitingReturn")}</div>
		`;
		this.suspendCountdownInterval = setInterval(() => {
			remainingSeconds--;
			if (remainingSeconds <= 0) {
				this.stopSuspendCountdown();
				if (countdownOverlay) {
					countdownOverlay.innerHTML = `
						<div style="font-size: 32px; color: #ff6b6b;">${t("beforeGame.gameEnded")}</div>
						<div style="margin-top: 10px;">${t("beforeGame.noReturn")}</div>
					`;
					setTimeout(() => {
						countdownOverlay?.remove();
					}, 3000);
				}
				this.endSuspendedGame({ lobbyId, score: "" });
				return;
			}
			if (countdownOverlay) {
				const color = remainingSeconds <= 10 ? '#ff6b6b	return this.updateFriendStatus(data.friendId, data.online);' : '#ffd93d';
				countdownOverlay.innerHTML = `
					<div style="margin-bottom: 10px;">${t("beforeGame.gamePaused")}</div>
					<div style="font-size: 48px; font-weight: bold; color: ${color};">${remainingSeconds}</div>
					<div style="margin-top: 10px; font-size: 18px;">${t("beforeGame.waitingReturn")}</div>
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

	private showGameInvite(invitation: { fromUserId: number, fromUserName: string, lobbyId?: string, roomId?: number, lobbyMeta?: any }) {
		let	inviteBtn = document.getElementById(`send-game-invite-${invitation.fromUserId}`);
		if (inviteBtn)
			inviteBtn.style.display = 'none';
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

			this.ws?.send(JSON.stringify({
				type: 'game_invite_rejected',
				lobbyId: invitation.lobbyId
			}));
			
			if (invitation.lobbyId) {
				fetch(`/api/lobby/${invitation.lobbyId}/reject`, {
					method: 'PUT',
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

	private	hideGameInvite(invitation: { fromUserId: number, fromUserName: string, invitedUserId: number, lobbyId?: string, roomId?: number, lobbyMeta?: any }) {
		let	inviteBtn = document.getElementById(`send-game-invite-${invitation.invitedUserId}`);
		if (inviteBtn)
			inviteBtn.style.display = 'none';
	}

	private	notifyOfRejection(data: { playerId1: number, playerId2: number }) {
		let	inviteBtn;
		if (this.userId === data.playerId1)
			inviteBtn = document.getElementById(`send-game-invite-${data.playerId2}`);
		else
			inviteBtn = document.getElementById(`send-game-invite-${data.playerId1}`);
		inviteBtn!.style.display = 'flex';
	}
}

export const webSocketService = new WebSocketService();
(window as any).webSocketService = webSocketService;