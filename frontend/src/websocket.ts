import * as BABYLON from "@babylonjs/core";
import { gameState } from "./Game/script";
import { navigate } from "./router";
import { loadGame } from "./Game/game";
import type { DataForGame } from "./Game/beforeGame";
import { dataForGame } from "./Game/beforeGame";

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

	ballUpdate(lobbyId: string, ballData: { position: { x: number, y: number, z: number }, velocity: { x: number, y: number, z: number } }) {
		this.ws?.send(JSON.stringify({
			type: 'game:ballUpdate',
			lobbyId: lobbyId,
			userId: this.userId,
			data: ballData
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
				data: goalData
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


	private createConnection() {
		if (this.userId === null)
			return;
		
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = `${protocol}//${window.location.host}/api/wss`;
		
		this.ws = new WebSocket(wsUrl);
		this.ws.onopen = async () => {
			const res = await fetch(`/api/lobby/player`, {
				method: "GET",
				credentials: "include",
			});
			const response = await res.json();
			if (response.data.message === 'In Game') {
				navigate('/home');
				this.ws?.send(JSON.stringify({
					type: 'game:rejoin',
					lobby: response.data.lobby
				}));
			}
			navigate('/home');
			this.reconnectAttempts = 0;
			this.ws?.send(JSON.stringify({
				type: 'user_online',
				userId: this.userId
			}));
		};
		this.ws.onmessage = (event) => {
			const data = JSON.parse(event.data);
			switch (data.type) {
				case 'game:init': {
					//this forces both to the lobby right away, just for testing
					return navigate('/playGame', {}, { lobbyId: data.data.lobbyId });
					//this.invite(data.data);
				}
				case 'game:start':
					return this.startGame(data.data.dataForGame, data.data.lobby);
				case 'game:input':
					return this.input(data.data);
				case 'game:ballUpdate':
					return this.updateBallState(data.data);
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
			}

			//N SEI SE ESTES AINDA SAO NECESSARIOS
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

	/* private async invite(data: { lobbyId: string, leaderId: number, otherUserId: number }) {
		const res = await fetch(`/api/lobby/${data.lobbyId}/invite`, {
			method: "POST",
			credentials: "include",
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ toUserId: data.otherUserId })
		});
		await res.json();
	} */

	private async startGame(dataForGame : DataForGame, lobby : any) {
		await fetch(`/api/lobby/${lobby.lobbyId}/playerGameInfo`, {
			method: "POST",
			credentials: "include",
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ playerGameInfo: dataForGame })
		});
		loadGame(dataForGame, lobby, true, false);
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
				gameState.clock.pause();
				break;
			case 'resume':
				gameState.ballIsPaused = false;
				gameState.clock.start();
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
			readyBtn.textContent = `Ready ${counter}`;
		else
			readyBtn.textContent = `Not Ready ${counter}`;
	}

	private async suspendedGame(lobby: any) {
		gameState.ballIsPaused = true;
		gameState.clock.pause();
		this.startSuspendCountdown(lobby.lobbyId);
	}

	private	async resumedGame() {
		gameState.ballIsPaused = false;
		gameState.clock.start();
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
				">Game in Progress</h2>
				<p style="
					margin: 0 0 25px 0;
					color: #666;
					font-size: 16px;
					line-height: 1.5;
				">You have a game in progress. Would you like to rejoin?</p>
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
					">Rejoin Game</button>
					<button id="dismiss-rejoin-button" style="
						background: #f44336;
						color: white;
						border: none;
						padding: 12px 24px;
						border-radius: 6px;
						font-size: 16px;
						cursor: pointer;
						transition: background 0.3s;
					">Later</button>
				</div>
			</div>
		`;
		rejoinPopup.style.display = 'flex';

		const dismissButton = document.getElementById('dismiss-rejoin-button');
		if (dismissButton) {
			dismissButton.onclick = () => {
				rejoinPopup.style.display = 'none';
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

	private async endGame(data: { lobbyId: string, score: string }) {
		//! Need to complete and to be called after the game ends normally
		const lobbyRes = await fetch(`/api/lobby/${data.lobbyId}`, {
			method: "GET",
			credentials: "include"
		});
		const lobbyResponse = await lobbyRes.json();
		const winnerId = this.userId;
		let	loserId;
		if (lobbyResponse.data.lobby.playerId1 === this.userId)
			loserId = lobbyResponse.data.lobby.playerId2;
		else
			loserId = lobbyResponse.data.lobby.playerId1;
		const matchRes = await fetch(`/api/addNewGame`, {
			method: "POST",
			credentials: "include",
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ user1Id: winnerId, user2Id: loserId })
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

		const winnerId = this.userId;
		let	loserId;
		if (lobbyResponse.data.playerId1 === this.userId)
			loserId = lobbyResponse.data.playerId2;
		else
			loserId = lobbyResponse.data.playerId1;
		const matchRes = await fetch(`/api/addNewGame`, {
			method: "POST",
			credentials: "include",
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ user1Id: winnerId, user2Id: loserId })
		});
		await matchRes.json();

		const res = await fetch(`/api/lobby/${data.lobbyId}/end`, {
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

		readyBtn.textContent = 'Not Ready (0/2)';
		readyBtn.classList.remove("bg-green-500", "hover:bg-green-600");
		readyBtn.classList.add("bg-red-500", "hover:bg-red-600");
		dataForGame.setReadyState?.(false);

		powerUpButton.textContent = data.state ? "ON" : "OFF";
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

	private updateBallState(ballData: { position: { x: number, y: number, z: number }, velocity: { x: number, y: number, z: number } }) {
		if(!gameState.ball || !gameState.scene)
			return;
		
		gameState.ball._ball.position.set(ballData.position.x, ballData.position.y, ballData.position.z);
		gameState.ball._ballVelocity = new BABYLON.Vector3(ballData.velocity.x, ballData.velocity.y, ballData.velocity.z);
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
				this.endSuspendedGame({ lobbyId, score: "" });
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