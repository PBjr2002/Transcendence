import * as BABYLON from "@babylonjs/core";
import "@babylonjs/gui";
import "@babylonjs/loaders/glTF";
import { Player, Ball, Table, powerUpManager } from "./import";
import type { playerData} from "./player";
import type { DataForGame } from "./beforeGame";
import { navigate } from "../router";
import { webSocketService } from "../websocket";
import { type DataForGameLocal } from "./localGame";
import { animateBorderGlow, applyPlayerBorderColors} from "./game";


/* 
	TODO
	
	O user nao aparece na pessoa que enviou o friend request quando o outro aceita
	Link para os Terms and Privacy, 2 paginas diferentes
	README (IMPORTANTE)
	
	OnGoing:
	
	
	DONE:
	Fazer o Local Lobby (IMPORTANTE)
	Mudar a cor do texto no User creation correct
	Bola nao sincroniza quando o user volta a dar Reconnect
	Clock a Funcionar com o mesmo timer quando o player da reconnect - Retirado
	Live chat
	Alterar a forma como o jogo acaba (Comecar a trabalhar nisto)
	Quando um player disconecta depois de já ter havido pontos, quando volta leva reset na pontuaçao, ou seja, volta a 0-0 em vez de 1-0 por exemplo
	
	Warnings Existentes:
	WEBGL_debug_renderer_info is deprecated in Firefox and will be removed. Please use RENDERER. - Da este warning por conta do Babylon, so da no Firefox, nao e possivel ser retirado porque e necessario o Babylon em si fazer um update que ainda nao esta available
	
*/

/* 

	Modulos Feitos:

	Web: (8 Pontos)
		Backend Framework (Minor) - 1
		Frontend Framework (Minor) - 1
		Websockets (Major) - 2
		User interaction (Major) - Falta implementar o Live Chat - 2 //
		Public API (Major) - 2

	Accessibility: (2 Pontos)
		Multiple Languages (Minor) - Tem de ser trocar para todas as pages - 1 // 
		Multiple Browsers (Minor) - Precisamos testar - 1 

	User Management: (3 Pontos)
		Standard usage management and authentication (Major) - 2
		2FA (Minor) - Falta Frontend - 1 // 
	
	Gaming and user experience: (7 Pontos)
		Web based Game (Major) - 2
---------------------------------------------------------------------------------------------------------- // Apartir daqui e Bonus
		Remote Players (Major) - 2
		3D (Major) - 2
		Game Customization (Minor) - Falta mapa costumization - 1 // 

	DevOps: (2 Pontos)
		ELK (Major) - 2

	Total Points: 22

*/

/* Game State */

export type TableDimensions = {
	tableDepth: number;
	tableWidth: number;
	tableHeight: number;
}

export type powerUpContext = {
	player: Player,
	ball: Ball,
	scene: BABYLON.Scene,
}

interface GameState {
	isGameOver: boolean;
	ballIsPaused: boolean;
	maxScore: number;
	points: number;
	isLocal: boolean;
	player1: Player | null;
	player2: Player | null;
	scene: BABYLON.Scene | null;
	ball: Ball | null;
	lastValidBallState: {
		position: { x: number, y: number, z: number},
		velocity: { x: number, y: number, z: number}
	} | null
	lastValidScore: {
		player1: number,
		player2: number,
	}

	getPlayerByUserId(userId: number): Player | null;
	processRemoteGoal?: (goalData: { scoringPlayerId: number, isPlayer1Goal: boolean, points: number }) => void;
}

export const gameState: GameState = {
	isGameOver: false,
	ballIsPaused: false,
	maxScore: 11,
	points:1,
	isLocal: true,
	player1: null,
	player2: null,
	scene: null,
	ball: null,
	lastValidBallState: null,
	lastValidScore: {player1: 0, player2: 0},
	
	getPlayerByUserId(userId) {
		if(userId === this.player1?._id)
			return this.player1;
		else
			return this.player2;
	}
};

/* Game Parameters */

const radius = 110;
const beta = radius - 20;

let engine: BABYLON.Engine;
let sceneToRender: BABYLON.Scene;

/* Helper Function */
function clampVectorSpeed(vector: BABYLON.Vector3, maxSpeed: number) {
	const currentSpeed = vector.length();
	if(currentSpeed > maxSpeed)
		vector.normalize().scaleInPlace(maxSpeed);
}

function updateGameScore(p1Score: number, p2Score: number){
	const score1 = document.getElementById("P1Score");
	const score2 = document.getElementById("P2Score");
	if(!score1 || !score2)
		return ;

	score1.innerHTML = p1Score.toString();
	score2.innerHTML = p2Score.toString();
}

export const createScene = (dataForGame: DataForGame, lobby : any, remote : boolean, rejoin: boolean): BABYLON.Scene => Playground.CreateScene(engine, dataForGame, lobby, remote, rejoin);

export const createSceneLocal = (dataForGame: DataForGameLocal): BABYLON.Scene => Playground.CreateSceneLocal(engine, dataForGame);

export function startGame(dataForGame: DataForGame, lobby : any, remote : boolean, rejoin: boolean) {
	const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement

	if(!canvas){
		console.error("Canvas not Found! Did loadGame() run?");
		return ;
	}

	engine = createDefaultEngine(canvas);
	sceneToRender = createScene(dataForGame, lobby, remote, rejoin);

	startRenderLoop(engine);

	window.addEventListener("resize", () => {
		engine.resize();
	})
}

export function startGameLocal(dataForGame: DataForGameLocal){
	const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement

	if(!canvas){
		console.error("Canvas not Found! Did loadGame() run?");
		return ;
	}

	engine = createDefaultEngine(canvas);
	sceneToRender = createSceneLocal(dataForGame);

	startRenderLoop(engine);

	window.addEventListener("resize", () => {
		engine.resize();
	})
}

// Renderer, Babylon already gives this
const startRenderLoop = function (engine: BABYLON.Engine) {
            engine.runRenderLoop(() => {
                if (sceneToRender && sceneToRender.activeCamera) {
                    sceneToRender.render();
                }
            });
        };

// Game Engine, Babylon already gives this
var createDefaultEngine = (canvas: HTMLCanvasElement): BABYLON.Engine => {
	return new BABYLON.Engine(canvas, true, { 
		preserveDrawingBuffer: true,
		stencil: true,
		disableWebGL2Support: false
	}); 
};

// Imagem Referencia: https://www.olx.pt/d/anuncio/mesa-air-hockey-pro-IDzbOoL.html


const PowerUpManager = new powerUpManager();

const powerUpContext: powerUpContext = {
	ball: null as any,
	player: null as any,
	scene: null as any,
};



export class Playground {
    static CreateScene(engine: BABYLON.Engine, dataForGame: DataForGame, lobby : any, remote : boolean, rejoin: boolean)
	{
		// Apply Beauty Things
		applyPlayerBorderColors(lobby);
		animateBorderGlow(lobby);

		if (remote)
			gameState.isLocal = false;
		gameState.ballIsPaused = true;
		gameState.isGameOver = false;
		
        // This creates a basic Babylon Scene object (non-mesh)
        var scene = new BABYLON.Scene(engine);
		gameState.scene = scene;

		// Parameters: name, alpha, beta, radius, target position, scene
		const camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 20, new BABYLON.Vector3(0, 0, 0), gameState.scene);			
		// Positions the camera overwriting alpha, beta, radius
		camera.setPosition(new BABYLON.Vector3(0, beta, radius));
		
		// Uncomment to move camera around
		//camera.attachControl(canvas, true);
		// This removes the Panning
		camera.panningSensibility = 0;
        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), gameState.scene);
        // Default intensity is 1.
        light.intensity = 0.7;
        
		// Table and all its components
		var table = new Table(gameState.scene);
		
		// Create Both Players
		// Alimentado pela API
		const player1Data: playerData = {
			playerId: lobby.playerId1,
			name: dataForGame.p1ApiData.data.name,
			matColor: BABYLON.Color3.FromHexString(lobby.player1Settings.paddleColor),
			handleColor: BABYLON.Color3.FromHexString(lobby.player1Settings.paddleColor),
			scene: gameState.scene,
			startPos: 56,
			isP1: true,
			selectedPowerUps: lobby.player1Settings.powerUps,
			isPowerUps: dataForGame.powerUpsEnabled,
		};

		// Alimentado pela API
		const player2Data: playerData = {
			playerId: lobby.playerId2,
			name: dataForGame.p2ApiData ? dataForGame.p2ApiData.data.name : "Player 2",
			matColor: BABYLON.Color3.FromHexString(lobby.player2Settings.paddleColor),
			handleColor: BABYLON.Color3.FromHexString(lobby.player2Settings.paddleColor),
			scene: gameState.scene,
			startPos: -56,
			isP1: false,
			selectedPowerUps: lobby.player2Settings.powerUps,
			isPowerUps: dataForGame.powerUpsEnabled,
		}

		gameState.player1 = new Player(player1Data);
		gameState.player2 = new Player(player2Data);


		// Position Table on the page
		table.positionTable(gameState.player1, gameState.player2);

		// Create Ball Class
        var ball = new Ball(gameState.scene);
		gameState.ball = ball;

		// Position Ball on the Page/Table
		ball.positionBall();

		// Save the values so they can be used on the powerUps later on

		powerUpContext.scene = gameState.scene;
		powerUpContext.ball = ball;

		// Add the Controls so each player can move, Keyboard inputs basically
		Playground.addControls(gameState.scene, gameState.player1, gameState.player2, powerUpContext, lobby);
		
		if(rejoin && lobby.ball.position && lobby.ball.velocity)
		{
			if(!lobby.ball.position._x && !lobby.ball.position._y && !lobby.ball.position._z && !lobby.ball.velocity._x && !lobby.ball.velocity._y && !lobby.ball.velocity._z)
			{
				lobby.ball.position = gameState.ball._ball.position;
				lobby.ball.velocity = gameState.ball._ballVelocity;
			}

			updateGameScore(lobby.score.player1, lobby.score.player2);
			gameState.player1._score = lobby.score.player1;
			gameState.player2._score = lobby.score.player2;

			gameState.ballIsPaused = false;
			gameState.isGameOver = false;

			ball._ball.position.set(
				lobby.ball.position._x,
				lobby.ball.position._y,
				lobby.ball.position._z,
			);
			ball._ballVelocity.set(
				lobby.ball.velocity._x,
				lobby.ball.velocity._y,
				lobby.ball.velocity._z,
			);

			ball._ball.isVisible = true;
			ball._ball.setEnabled(true);
		}
		else
		{
			// Decide to where the ball is going the first time
			// 50% chance that it goes to either player, seems logical

			let randomNumber: number = Math.random() < 0.5 ? 0 : 1;

			if(randomNumber == 0)
				ball._ballVelocity = new BABYLON.Vector3(ball._initialSpeed * 0.7, 0,0);
			else 
				ball._ballVelocity = new BABYLON.Vector3(-ball._initialSpeed * 0.7, 0,0);

			// Sincronizar velocidade inicial da bola via WebSocket
			webSocketService.ballUpdate(lobby, {
				position: {
					x: ball._ball.position._x,
					y: ball._ball.position._y,
					z: ball._ball.position._z
				},
				velocity: {
					x: ball._ballVelocity._x,
					y: ball._ballVelocity._y,
					z: ball._ballVelocity._z
				}
			});
		}

		// Save Previous position so we can change the values and keep the last ones
		// Used on the Collision with the Walls
		let previousP1PaddlePosition: BABYLON.Vector3 = gameState.player1._paddle.position.clone();
		let previousP2PaddlePosition: BABYLON.Vector3 = gameState.player2._paddle.position.clone();

		createPowerUpHUD(gameState.player1);
		createPowerUpHUD(gameState.player2);

			document.getElementById("btn-pause")?.addEventListener("click", () => {
				if(!gameState.ballIsPaused)
					webSocketService.pause(lobby.lobbyId);
			});

			document.getElementById("btn-resume")?.addEventListener("click", () => {
				if(gameState.ballIsPaused)
					webSocketService.resume(lobby.lobbyId);
			});

			document.getElementById("btn-home")?.addEventListener("click", () => {
				lobby.ball.velocity = ball._ballVelocity;
				lobby.ball.position = ball._ball.position;
				// Fix this after leaving with Refresh is done
				gameState.lastValidScore.player1 = gameState.player1!._score;
				gameState.lastValidScore.player2 = gameState.player2!._score;

				engine.stopRenderLoop();
				scene.dispose();
				webSocketService.suspendGame(lobby.lobbyId);
				navigate('/home');
				webSocketService.rejoinNotification(lobby);
			});

		// Game Starts after this!
		if (!rejoin) {
			showCountdown(3, () => {
				if (lobby.player1Ready && lobby.player2Ready)
					gameState.ballIsPaused = false;
			});
		}

		// Método para processar golo remoto
		(gameState as any).processRemoteGoal = (goalData: { scoringPlayerId: number, isPlayer1Goal: boolean, points: number }) => {
			if(!gameState.player1 || !gameState.player2)
				return ;
			if (goalData.isPlayer1Goal) {
				gameState.player1._score += goalData.points;
				lobby.score.player1 = gameState.player1._score;
				
				updateScoreDisplay(gameState.player1, gameState.player2);
				
				if (gameState.player1!._score >= gameState.maxScore)
					endGame(gameState.player1._name);
				
				resetBallAndPlayers(ball, gameState.player1, gameState.player2, true);
			} else {
				gameState.player2._score += goalData.points;
				lobby.score.player2 = gameState.player2._score;
				
				updateScoreDisplay(gameState.player1, gameState.player2);
				
				if (gameState.player2!._score >= gameState.maxScore)
					endGame(gameState.player2._name);
				
				resetBallAndPlayers(ball, gameState.player1!, gameState.player2!, false);
			}
		};


		// Paddle Collision Handler
		function handlePaddleCollision(paddleMesh: BABYLON.Mesh, paddleVelocity: BABYLON.Vector3, isP2Paddle: boolean){
				if(!paddleMesh)
					return ;
				if(!ball._ball.intersectsMesh(paddleMesh, false))
					return ;

				const relativeImpactZ = ball._ball.position.z - paddleMesh.position.z;
				const paddleHalfHeight = paddleMesh.getBoundingInfo().boundingBox.extendSize.z;
				const normalizedImpact = Math.max(-1, Math.min(1, relativeImpactZ / paddleHalfHeight));

				// Calculate Bounce Angle
				let bounceAngle = normalizedImpact * ball._maxBounceAngle;

				const minAngle = 0.1;
				if(Math.abs(bounceAngle) < minAngle)
				{
					bounceAngle = bounceAngle >= 0 ? minAngle : -minAngle;
				}

				const outgoingXDirection = isP2Paddle ? 1 : -1;

				const newDirection = new BABYLON.Vector3(
					Math.cos(bounceAngle) * outgoingXDirection,
					0,
					Math.sin(bounceAngle)
				).normalize();

				// Apply new Velocity
				const currentBallSpeed = Math.max(ball._initialSpeed, ball._ballVelocity.length());
				ball._ballVelocity = newDirection.scale(currentBallSpeed);

				// Add Paddle Velocity Influence
				ball._ballVelocity.addInPlace(paddleVelocity.clone().scale(ball._paddleImpulseFactor));

				// Apply Restituiton and clamp speed
				ball._ballVelocity.scaleInPlace(ball._restituiton);
				clampVectorSpeed(ball._ballVelocity, ball._ballMaxSpeed);

				// Push Ball slightly away to avoid multiple collisions
				const smallPush = newDirection.scale(0.05);
				ball._ball.position.addInPlace(smallPush);

				// Sincronizar colisão com raquete via WebSocket
				if (!gameState.isLocal) {
					const collidingPlayerId = isP2Paddle ? gameState.player2?._id : gameState.player1?._id;
					if (collidingPlayerId) {
						webSocketService.paddleCollision(lobby.lobbyId, {
							userId: collidingPlayerId,
							ballVelocity: {
								x: ball._ballVelocity.x,
								y: ball._ballVelocity.y,
								z: ball._ballVelocity.z
							},
							ballPosition: {
								x: ball._ball.position.x,
								y: ball._ball.position.y,
								z: ball._ball.position.z
							}
						});
					}
				}
			}

		// Function that resets everthing after a player scores a point
		// This includes Player Position, powerUp cancelation, Ball Position and Speed

		function resetBallAndPlayers(ball: Ball, p1: Player, p2: Player, isP1Point: boolean) {
		    PowerUpManager.cancelAll(powerUpContext);
			
			// coloca no centro
		    ball._ball.position.set(0,0.5,0);
			if(ball._ballOriginalSize)
				ball._ball.scaling = ball._ballOriginalSize.clone();

			p1._paddle.position.set(0,0,0);
			p1._paddleSpeed = 0.7;
			p2._paddle.position.set(0,0,0);
			p2._paddleSpeed = 0.7;

			gameState.ballIsPaused = true;
			gameState.points = 1;

		    ball._ballVelocity.set(0, 0, 0);
			ball._ball.isVisible = true;

			webSocketService.ballUpdate(lobby, {
				position: {
					x: ball._ball.position._x,
					y: ball._ball.position._y,
					z: ball._ball.position._z
				},
				velocity: {
					x: ball._ballVelocity._x,
					y: ball._ballVelocity._y,
					z: ball._ballVelocity._z
				}
			});

		    showCountdown(3, () => {

				const dirX = isP1Point ? -1 : 1;

				const maxAngle = Math.PI / 4;
				const randomAngle = (Math.random() * 2 - 1) * maxAngle;
				const speed = ball._initialSpeed;

				// const dirZ = Math.random() < 0.5 ? -1 : 1;

		        ball._ballVelocity.x = dirX * speed * Math.cos(randomAngle);
		        ball._ballVelocity.z = speed * Math.sin(randomAngle);
			
				// Sincronizar reset da bola via WebSocket
				webSocketService.ballUpdate(lobby, {
					position: {
						x: ball._ball.position._x,
						y: ball._ball.position._y,
						z: ball._ball.position._z
					},
					velocity: {
						x: ball._ballVelocity._x,
						y: ball._ballVelocity._y,
						z: ball._ballVelocity._z
					}
				});
				if (lobby.player1Ready && lobby.player2Ready)
					gameState.ballIsPaused = false;
				gameState.points = 1;
			});
		}

		// Basic Function to update the display
		function updateScoreDisplay(p1: Player, p2: Player){
			const p1Element = document.getElementById("P1Score");
			const p2Element = document.getElementById("P2Score");

			if (p1Element) 
				p1Element.innerHTML = p1._score.toString();
    		if (p2Element) 
				p2Element.innerHTML = p2._score.toString();
		}

		// Function that Makes the 3/2/1 that you see after the score is updated
		function showCountdown(seconds: number, onComplete: () => void) {
			if(gameState.isGameOver)
				return ;
			const countdownDiv = document.getElementById("countdown")!;
			let current = seconds;

			countdownDiv.style.display = "block";
			countdownDiv.innerText = current.toString();

			const interval = setInterval(() => {
			    current--;
			
			    if (current > 0) {
			      countdownDiv.innerText = current.toString();
			    } else {
			      clearInterval(interval);
			      countdownDiv.style.display = "none";
			      onComplete();
			    }
			}, 333);
		}

		// Function to cancel PowerUps
		function cancelAllPowerUps() {
			PowerUpManager.cancelAll(powerUpContext);
		}
		
		// Function that is called when the reachs the max Points, it finishs the game and shows a button to go back to the "Main Page"
		function endGame(winner: string) {
			cancelAllPowerUps();
			console.log(`🏆 ${winner} wins!`);
			
			gameState.isGameOver = true;
			gameState.ballIsPaused = true;

			table.hideTable();
			ball._ball.setEnabled(false);

			const overlay = document.getElementById("gameOverOverlay");
			if(!overlay)
				return ;
			overlay.style.display = "flex";

			overlay.innerHTML = `
			<div class="flex flex-col items-center justify-center gap-6 bg-black/80 p-10 rounded-xl text-white">
				<h1 class="text-4xl font-bold text-green-400">
				🏆 ${winner} wins!
				</h1>
			
				<div class="text-xl">
					<p><strong>${gameState.player1?._name}</strong> vs <strong>${gameState.player2?._name}</strong>
					<p class="mt-2">Final Score:</p>
					<p class="text-2xl font-bold">${gameState.player1?._score} - ${gameState.player2?._score}</p>
				</div>
			
				<button id="btn-home2"
					class="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold">
					Home
				</button>
			</div>`;

			//Isto é aqui para acabar o jogo antes de voltar à homepage
			if (gameState.player1!._score > gameState.player2!._score)
				webSocketService.gameOver(lobby.lobbyId, gameState.player1!._id, gameState.player2!._id);
			else
				webSocketService.gameOver(lobby.lobbyId, gameState.player2!._id, gameState.player1!._id);

			document.getElementById("btn-home2")?.addEventListener("click", () => {
				engine.stopRenderLoop();
				scene.dispose();
				navigate('/home');
			});
		}
		
		// Function that creates the HUD for
		function createPowerUpHUD(player: Player) {
			const bar = player._isP1 === true ? document.getElementById("powerups-left") : document.getElementById("powerups-right");
			let index:number = 0;
			let id:string = player._isP1 === true ? "p1" : "p2";
			id += "PowerUp"; 
			
			if(player._powerUps)
			{
				player._powerUps.forEach((powerUp) => {
					const PUDivs = document.getElementById(id + index.toString());
					if(!PUDivs)
						return ;
					PUDivs.style.backgroundImage = `url("icons/${powerUp.name}.png")`;


					const overlay = document.createElement("div");
					overlay.className = `
					absolute inset-0
					bg-red-600
					opacity-100
					transition-opacity duration-${powerUp.cooldown}
					`;

					PUDivs.appendChild(overlay);
					bar?.appendChild(PUDivs);

					(powerUp as any).uiElement = overlay;
					(powerUp as any).iconElement = PUDivs;

					index++;
				});
			}
		}

		function updatePowerUpHUD(player: Player) {
			if(player._powerUps)
			{
    			for (const pu of player._powerUps) {
        			const overlay = (pu as any).uiElement;
					const icon = (pu as any).iconElement

        			if (!overlay || !icon) 
						continue ;

					if(!pu.lastUsed)
					{
						overlay.style.opacity = "1";
						icon.classList.remove("border-green-400");
						icon.classList.add("border-white/20");
						continue ;
					}

					const now = performance.now();
        			const elapsed = now - pu.lastUsed;
        			const ratio = Math.min(elapsed / pu.cooldown, 1);

        			if(ratio >= 1)
					{
						overlay.style.opacity = "0";
						icon.classList.remove("border-white/20");
						icon.classList.add("border-green-400");

					}
					else
					{
						overlay.style.opacity = (1 - ratio).toString();
						icon.classList.remove("border-green-400");
						icon.classList.add("border-white/20");
					}
    			}
			}
		}

		// Render function, super important because it updates all the values before the rendering, checks ball position and collisions with the walls
		// Returns the Scene to be renderer after
		scene.registerBeforeRender(() => {
			if(gameState.isGameOver || gameState.ballIsPaused)
				return ;
			
			const deltaTimeSeconds = engine.getDeltaTime() / 1000;
			if(!deltaTimeSeconds)
				return ;

			if(gameState.ballIsPaused || gameState.isGameOver)
				return ;

			if(!gameState.player1 || !gameState.player2)
				return ;

			// Update Ball position
			const ballDisplacement = ball._ballVelocity.scale(deltaTimeSeconds);
			ball._ball.position.addInPlace(ballDisplacement);
			webSocketService.ballUpdate(lobby, {
				position: {
					x: ball._ball.position._x,
					y: ball._ball.position._y,
					z: ball._ball.position._z
				},
				velocity: {
					x: ball._ballVelocity._x,
					y: ball._ballVelocity._y,
					z: ball._ballVelocity._z
				}
			});

			lobby.ball.position = ball._ball.position
			lobby.ball.velocity = ball._ballVelocity
			gameState.ball = ball;

			// Table Collision
			
			// Paredes Baixo e Cima
			if (ball._ball.position.z > table._Dimensions.tableDepth / 2) {
    			ball._ball.position.z = table._Dimensions.tableDepth / 2;
    			ball._ballVelocity.z *= -ball._restituiton;
    			if (Math.abs(ball._ballVelocity.z) > ball._ballMaxSpeed) {
    			    ball._ballVelocity.z = Math.sign(ball._ballVelocity.z) * ball._ballMaxSpeed;
    			}
				// Sincronizar colisão com parede via WebSocket
				if (!gameState.isLocal) {
					webSocketService.wallCollision(lobby.lobbyId, {
						wall: 'top',
						ballVelocity: {
							x: ball._ballVelocity.x,
							y: ball._ballVelocity.y,
							z: ball._ballVelocity.z
						},
						ballPosition: {
							x: ball._ball.position.x,
							y: ball._ball.position.y,
							z: ball._ball.position.z
						}
					});
				}
			} else if (ball._ball.position.z < -table._Dimensions.tableDepth / 2) {
			    ball._ball.position.z = -table._Dimensions.tableDepth / 2;
			    ball._ballVelocity.z *= -ball._restituiton;
			
			    if (Math.abs(ball._ballVelocity.z) > ball._ballMaxSpeed) {
			        ball._ballVelocity.z = Math.sign(ball._ballVelocity.z) * ball._ballMaxSpeed;
			    }
				// Sincronizar colisão com parede via WebSocket
				if (!gameState.isLocal) {
					webSocketService.wallCollision(lobby.lobbyId, {
						wall: 'bottom',
						ballVelocity: {
							x: ball._ballVelocity.x,
							y: ball._ballVelocity.y,
							z: ball._ballVelocity.z
						},
						ballPosition: {
							x: ball._ball.position.x,
							y: ball._ball.position.y,
							z: ball._ball.position.z
						}
					});
				}
			}
			// Left and Right Wall		
			// Goal Check on Player 1 Goal
			
			if (ball._ball.position.x > table._leftGoal.position.x) {
				// Sincronizar golo via WebSocket
				if (!gameState.isLocal && gameState.player2?._id) {
					
					webSocketService.goal(lobby.lobbyId, {
						scoringPlayerId: gameState.player2._id,
						isPlayer1Goal: false,
						points: gameState.points
					});
					resetBallAndPlayers(ball, gameState.player1, gameState.player2, false);
				} 
			} 
			// Goal Check on Player 2 Goal
			else if (ball._ball.position.x < table._rightGoal.position.x) {
				// Sincronizar golo via WebSocket
				if (!gameState.isLocal && gameState.player1?._id) {
					webSocketService.goal(lobby.lobbyId, {
						scoringPlayerId: gameState.player1._id,
						isPlayer1Goal: true,
						points: gameState.points
					});
					resetBallAndPlayers(ball, gameState.player1, gameState.player2, true);
				}
			}

			// Paddle Velocities
			const p1PaddleVelocity = gameState.player1._paddle.position.subtract(previousP1PaddlePosition).scale(1 / deltaTimeSeconds);
			const p2PaddleVelocity = gameState.player2._paddle.position.subtract(previousP2PaddlePosition).scale(1 / deltaTimeSeconds);

			previousP1PaddlePosition.copyFrom(gameState.player1._paddle.position);
			previousP2PaddlePosition.copyFrom(gameState.player2._paddle.position);

			// Handle Paddle Collisions			
			handlePaddleCollision(gameState.player1._paddle, p1PaddleVelocity, false);
			handlePaddleCollision(gameState.player2._paddle, p2PaddleVelocity, true);

			// Updating PowerUps
			gameState.player1.updatePowerUps();
			gameState.player2.updatePowerUps();

			updatePowerUpHUD(gameState.player1);
			updatePowerUpHUD(gameState.player2);
		});
		
		return scene;
    }
	
	static CreateSceneLocal(engine: BABYLON.Engine, dataForGame: DataForGameLocal) {

	// Apply Beauty Things
	applyPlayerBorderColors(dataForGame);
	animateBorderGlow(dataForGame);
	gameState.isLocal = true;
	gameState.ballIsPaused = true;
	gameState.isGameOver = false;

	// Cria a cena Babylon
	const scene = new BABYLON.Scene(engine);
	gameState.scene = scene;

	// Câmera
	const camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 20, new BABYLON.Vector3(0, 0, 0), scene);
	camera.setPosition(new BABYLON.Vector3(0, beta, radius));
	camera.panningSensibility = 0;

	// Luz
	const light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
	light.intensity = 0.7;

	// Tabela
	const table = new Table(scene);

	// Jogadores
	const player1Data: playerData = {
		playerId: 1,
		name: "Player 1",
		matColor: BABYLON.Color3.FromHexString(dataForGame.player1Settings.paddleColor),
		handleColor: BABYLON.Color3.FromHexString(dataForGame.player1Settings.paddleColor),
		scene,
		startPos: 56,
		isP1: true,
		selectedPowerUps: dataForGame.player1Settings.powerUps,
		isPowerUps: dataForGame.powerUpsEnabled,
	};

	const player2Data: playerData = {
		playerId: 2,
		name: "Player 2",
		matColor: BABYLON.Color3.FromHexString(dataForGame.player2Settings.paddleColor),
		handleColor: BABYLON.Color3.FromHexString(dataForGame.player2Settings.paddleColor),
		scene,
		startPos: -56,
		isP1: false,
		selectedPowerUps: dataForGame.player2Settings.powerUps,
		isPowerUps: dataForGame.powerUpsEnabled,
	};

	gameState.player1 = new Player(player1Data);
	gameState.player2 = new Player(player2Data);

	// Posiciona a tabela
	table.positionTable(gameState.player1, gameState.player2);

	// Bola
	const ball = new Ball(scene);
	gameState.ball = ball;
	ball.positionBall();

	// PowerUps
	powerUpContext.scene = scene;
	powerUpContext.ball = ball;

	// Controles
	Playground.addControls(scene, gameState.player1, gameState.player2, powerUpContext, {});

	// Velocidade inicial da bola
	const dirX = Math.random() < 0.5 ? 1 : -1;
	ball._ballVelocity = new BABYLON.Vector3(dirX * ball._initialSpeed * 0.7, 0, 0);

	// Guarda posições anteriores das raquetes
	let previousP1PaddlePosition = gameState.player1._paddle.position.clone();
	let previousP2PaddlePosition = gameState.player2._paddle.position.clone();

	// HUD PowerUps
	createPowerUpHUD(gameState.player1);
	createPowerUpHUD(gameState.player2);

	document.getElementById("btn-pause")?.addEventListener("click", () => {
		gameState.ballIsPaused = true;
	});

	document.getElementById("btn-resume")?.addEventListener("click", () => {
		gameState.ballIsPaused = false;
	});

	document.getElementById("btn-home")?.addEventListener("click", () => {
		engine.stopRenderLoop();
		scene.dispose();
		navigate('/home');
	});

	// Inicia o jogo
	showCountdown(3, () => {
		gameState.ballIsPaused = false;
	});

	// Funções auxiliares
	function handlePaddleCollision(paddleMesh: BABYLON.Mesh, paddleVelocity: BABYLON.Vector3, isP2Paddle: boolean) {
		if (!paddleMesh || !ball._ball.intersectsMesh(paddleMesh, false)) return;

		const relativeImpactZ = ball._ball.position.z - paddleMesh.position.z;
		const paddleHalfHeight = paddleMesh.getBoundingInfo().boundingBox.extendSize.z;
		const normalizedImpact = Math.max(-1, Math.min(1, relativeImpactZ / paddleHalfHeight));
		let bounceAngle = normalizedImpact * ball._maxBounceAngle;

		const minAngle = 0.1;
				if(Math.abs(bounceAngle) < minAngle)
				{
					bounceAngle = bounceAngle >= 0 ? minAngle : -minAngle;
				}

		const outgoingXDirection = isP2Paddle ? 1 : -1;

		const newDirection = new BABYLON.Vector3(
			Math.cos(bounceAngle) * outgoingXDirection,
			0,
			Math.sin(bounceAngle)
		).normalize();

		const currentBallSpeed = Math.max(9, ball._ballVelocity.length());
		ball._ballVelocity = newDirection.scale(currentBallSpeed);
		ball._ballVelocity.addInPlace(paddleVelocity.clone().scale(ball._paddleImpulseFactor));
		ball._ballVelocity.scaleInPlace(ball._restituiton);
		clampVectorSpeed(ball._ballVelocity, ball._ballMaxSpeed);

		const smallPush = newDirection.scale(0.05);
		ball._ball.position.addInPlace(smallPush);
	}

	function resetBallAndPlayers(ball: Ball, p1: Player, p2: Player, isP1Point: boolean) {
		PowerUpManager.cancelAll(powerUpContext);

		ball._ball.position.set(0, 0.5, 0);
		if (ball._ballOriginalSize) ball._ball.scaling = ball._ballOriginalSize.clone();

		p1._paddle.position.set(0, 0, 0);
		p1._paddleSpeed = 0.7;
		p2._paddle.position.set(0, 0, 0);
		p2._paddleSpeed = 0.7;

		gameState.ballIsPaused = true;
		gameState.points = 1;
		ball._ballVelocity.set(0, 0, 0);
		ball._ball.isVisible = true;

		showCountdown(3, () => {
			const dirX = isP1Point ? -1 : 1;

			const maxAngle = Math.PI / 4;
			const randomAngle = (Math.random() * 2 - 1) * maxAngle;
			const speed = ball._initialSpeed;

			// const dirZ = Math.random() < 0.5 ? -1 : 1;

		    ball._ballVelocity.x = dirX * speed * Math.cos(randomAngle);
		    ball._ballVelocity.z = speed * Math.sin(randomAngle);

			gameState.ballIsPaused = false;
			gameState.points = 1;
		});
	}

	function updateScoreDisplay(p1: Player, p2: Player) {
		const p1Element = document.getElementById("P1Score");
		const p2Element = document.getElementById("P2Score");
		if (p1Element) p1Element.innerHTML = p1._score.toString();
		if (p2Element) p2Element.innerHTML = p2._score.toString();
	}

	function showCountdown(seconds: number, onComplete: () => void) {
		if (gameState.isGameOver) return;
		const countdownDiv = document.getElementById("countdown")!;
		let current = seconds;

		countdownDiv.style.display = "block";
		countdownDiv.innerText = current.toString();

		const interval = setInterval(() => {
			current--;
			if (current > 0) {
				countdownDiv.innerText = current.toString();
			} else {
				clearInterval(interval);
				countdownDiv.style.display = "none";
				onComplete();
			}
		}, 1000);
	}

	// Render loop
	scene.registerBeforeRender(() => {
		if (gameState.isGameOver || gameState.ballIsPaused) return;

		const deltaTimeSeconds = engine.getDeltaTime() / 1000;
		if (!deltaTimeSeconds || !gameState.player1 || !gameState.player2) return;

		// Atualiza bola
		ball._ball.position.addInPlace(ball._ballVelocity.scale(deltaTimeSeconds));

		// Colisão com paredes (Top/Bottom)
		if (ball._ball.position.z > table._Dimensions.tableDepth / 2 || ball._ball.position.z < -table._Dimensions.tableDepth / 2) {
			ball._ball.position.z = Math.max(Math.min(ball._ball.position.z, table._Dimensions.tableDepth / 2), -table._Dimensions.tableDepth / 2);
			ball._ballVelocity.z *= -ball._restituiton;
			if (Math.abs(ball._ballVelocity.z) > ball._ballMaxSpeed) ball._ballVelocity.z = Math.sign(ball._ballVelocity.z) * ball._ballMaxSpeed;
		}

		// Golo
		if (ball._ball.position.x > table._leftGoal.position.x) {
			gameState.player2._score += gameState.points;
			updateScoreDisplay(gameState.player1, gameState.player2);
			if (gameState.player2._score >= gameState.maxScore) 
				endGame(gameState.player2._name);
			resetBallAndPlayers(ball, gameState.player1, gameState.player2, false);
		} else if (ball._ball.position.x < table._rightGoal.position.x) {
			gameState.player1._score += gameState.points;
			updateScoreDisplay(gameState.player1, gameState.player2);
			if (gameState.player1._score >= gameState.maxScore) 
				endGame(gameState.player1._name);
			resetBallAndPlayers(ball, gameState.player1, gameState.player2, true);
		}

		// Velocidade das raquetes
		const p1PaddleVelocity = gameState.player1._paddle.position.subtract(previousP1PaddlePosition).scale(1 / deltaTimeSeconds);
		const p2PaddleVelocity = gameState.player2._paddle.position.subtract(previousP2PaddlePosition).scale(1 / deltaTimeSeconds);

		previousP1PaddlePosition.copyFrom(gameState.player1._paddle.position);
		previousP2PaddlePosition.copyFrom(gameState.player2._paddle.position);

		// Colisões com paddles
		handlePaddleCollision(gameState.player1._paddle, p1PaddleVelocity, false);
		handlePaddleCollision(gameState.player2._paddle, p2PaddleVelocity, true);

		// PowerUps
		gameState.player1.updatePowerUps();
		gameState.player2.updatePowerUps();
		updatePowerUpHUD(gameState.player1);
		updatePowerUpHUD(gameState.player2);
	});

	function createPowerUpHUD(player: Player) {
			const bar = player._isP1 === true ? document.getElementById("powerups-left") : document.getElementById("powerups-right");
			let index:number = 0;
			let id:string = player._isP1 === true ? "p1" : "p2";
			id += "PowerUp"; 
			
			if(player._powerUps)
			{
				player._powerUps.forEach((powerUp) => {
					const PUDivs = document.getElementById(id + index.toString());
					if(!PUDivs)
						return ;
					PUDivs.style.backgroundImage = `url("icons/${powerUp.name}.png")`;


					const overlay = document.createElement("div");
					overlay.className = `
					absolute inset-0
					bg-red-600
					opacity-100
					transition-opacity duration-${powerUp.cooldown}
					`;

					PUDivs.appendChild(overlay);
					bar?.appendChild(PUDivs);

					(powerUp as any).uiElement = overlay;
					(powerUp as any).iconElement = PUDivs;

					index++;
				});
			}
	}
	
	/* Util Functions */

	function endGame(winner: string) {
		cancelAllPowerUps();
			console.log(`🏆 ${winner} wins!`);
			
			gameState.isGameOver = true;
			gameState.ballIsPaused = true;

			table.hideTable();
			ball._ball.setEnabled(false);

			const overlay = document.getElementById("gameOverOverlay");
			if(!overlay)
				return ;
			overlay.style.display = "flex";

			overlay.innerHTML = `
			<div class="flex flex-col items-center justify-center gap-6 bg-black/80 p-10 rounded-xl text-white">
				<h1 class="text-4xl font-bold text-green-400">
				🏆 ${winner} wins!
				</h1>
			
				<div class="text-xl">
					<p><strong>${gameState.player1?._name}</strong> vs <strong>${gameState.player2?._name}</strong>
					<p class="mt-2">Final Score:</p>
					<p class="text-2xl font-bold">${gameState.player1?._score} - ${gameState.player2?._score}</p>
				</div>
			
				<button id="btn-home2"
					class="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-lg font-semibold">
					Home
				</button>
			</div>`;

			document.getElementById("btn-home2")?.addEventListener("click", () => {
				engine.stopRenderLoop();
				scene.dispose();
				navigate('/home');
			});
		}

	function cancelAllPowerUps() {
			PowerUpManager.cancelAll(powerUpContext);
	}

	function updatePowerUpHUD(player: Player) {
		if(player._powerUps)
		{
    		for (const pu of player._powerUps) {
        		const overlay = (pu as any).uiElement;
				const icon = (pu as any).iconElement

        		if (!overlay || !icon) 
					continue ;

				if(!pu.lastUsed)
				{
					overlay.style.opacity = "1";
					icon.classList.remove("border-green-400");
					icon.classList.add("border-white/20");
					continue ;
				}

				const now = performance.now();
        		const elapsed = now - pu.lastUsed;
        		const ratio = Math.min(elapsed / pu.cooldown, 1);

        		if(ratio >= 1)
				{
					overlay.style.opacity = "0";
					icon.classList.remove("border-white/20");
					icon.classList.add("border-green-400");
				}
				else
				{
					overlay.style.opacity = (1 - ratio).toString();
					icon.classList.remove("border-green-400");
					icon.classList.add("border-white/20");
				}
    		}
		}
	}

	return scene;
	}


	// Method to create the Paddles that the player uses
	static createPaddle(scene: BABYLON.Scene, playerStartPos: number, MatColor: BABYLON.Color3, HandleMatColor: BABYLON.Color3): BABYLON.Mesh
	{
		// Create Meshs
		var PaddleWalls = BABYLON.MeshBuilder.CreateTorus("Wall", {diameter: 9, thickness: 2.1, tessellation: 24})
		var PaddleFloor = BABYLON.MeshBuilder.CreateCylinder("Floor", {height: 0.5,diameter: 9}, scene)
		var PaddleHandle = BABYLON.MeshBuilder.CreateCapsule("Handle", {height: 8, radius: 1.3}, scene);
		
		// Position Meshs
		PaddleWalls.position.set(playerStartPos,0,0);
		PaddleFloor.position.set(playerStartPos,0.2,0);
		PaddleHandle.position.set(playerStartPos,0,0);
		PaddleFloor.rotation.y = 1.56;

		// Create Materials
		const Mat = new BABYLON.StandardMaterial("Mat", scene);
		const handleMat = new BABYLON.StandardMaterial("handleMat", scene);
		
		// Set Colors to Materials
		Mat.diffuseColor = MatColor;
		handleMat.diffuseColor = HandleMatColor;
		
		// Set Meshs Materials
		PaddleWalls.material = Mat;
		PaddleFloor.material = Mat;
		PaddleHandle.material = handleMat;

		return BABYLON.Mesh.MergeMeshes([PaddleWalls, PaddleHandle, PaddleFloor], true, false, undefined, false, true)!;
	}
	

	// Method that handles the keyboard input
	private static addControls(scene: BABYLON.Scene, player1: Player, player2: Player, powerUpContext: powerUpContext, lobby: any): void 
	{
    	const keys: Record<string, boolean> = {};

		// Mesh Colliders
		const topWall = scene.getMeshByName("Upper Wall");
		const downWall = scene.getMeshByName("Lower Wall");

    	window.addEventListener("keydown", (e) => (keys[e.key] = true));
    	window.addEventListener("keyup", (e) => (keys[e.key] = false));

    	scene.onBeforeRenderObservable.add(() => {
      		if(gameState.ballIsPaused || gameState.isGameOver)
				return ;
			if(!gameState.player1 || !gameState.player2)
				return ;

			// Local Game YupY!!!
			if(gameState.isLocal)
			{
				// Player 1 (W/S)
      			if (keys["w"] || keys["W"]){
					player1._paddle.position.z -= player1._paddleSpeed;
					if(topWall && player1._paddle.intersectsMesh(topWall, false)) {
						player1._paddle.position.z += player1._paddleSpeed;
					}
				}
				if (keys["s"] || keys["S"]){
					player1._paddle.position.z += player1._paddleSpeed;
					if(downWall && player1._paddle.intersectsMesh(downWall, false)) {
						player1._paddle.position.z -= player1._paddleSpeed;
					}
				}

      			// Player 2 (↑/↓)
      			if (keys["ArrowUp"]){
					player2._paddle.position.z -= player2._paddleSpeed;
					if(topWall && player2._paddle.intersectsMesh(topWall, false)) {
						player2._paddle.position.z += player2._paddleSpeed;
					}
				}
      			if (keys["ArrowDown"]) {
					player2._paddle.position.z += player2._paddleSpeed;
					if(downWall && player2._paddle.intersectsMesh(downWall, false)) {
						player2._paddle.position.z -= player2._paddleSpeed;
					}
				}

				// PowerUps (Q/E/R (Player 1) / I/O/P (Player 2))
				if(player1._powerUps && player2._powerUps)
				{
					// Call webSocketService functions of powerUps
					if(keys["q"] || keys["Q"])
						player1._powerUps[0].use(powerUpContext);
					else if (keys["e"] || keys["E"])
						player1._powerUps[1].use(powerUpContext);
					else if (keys["r"] || keys["R"])
						player1._powerUps[2].use(powerUpContext);
					else if (keys["i"] || keys["I"])
						player2._powerUps[0].use(powerUpContext);
					else if (keys["o"] || keys["O"])
						player2._powerUps[1].use(powerUpContext);
					else if (keys["p"] || keys["P"])
						player2._powerUps[2].use(powerUpContext);
				}
			}
			// Remote Game!!!!
			else
			{
				// Do With WebSockets
				if (keys["w"] || keys["W"])
					webSocketService.up(lobby.lobbyId);
				if (keys["s"] || keys["S"])
					webSocketService.down(lobby.lobbyId);
				if (keys["q"] || keys["Q"])
					webSocketService.firstPowerUp(lobby.lobbyId);
				if (keys["e"] || keys["E"])
					webSocketService.secondPowerUp(lobby.lobbyId);
				if (keys["r"] || keys["R"])
					webSocketService.thirdPowerUp(lobby.lobbyId);	
			}
		});
  	}
}