import * as BABYLON from "@babylonjs/core";
import "@babylonjs/gui";
import "@babylonjs/loaders/glTF";
import { Player, Ball, Table, powerUpManager } from "./import";

/* Game State */

export type TableDimensions = {
	tableDepth: number;
	tableWidth: number;
	tableHeight: number;
}

type goalPosition = {
	x: number;
	y: number;
}

export type powerUpContext = {
	table: Table,
	ball: Ball,
	player: Player,
	scene: BABYLON.Scene,
}

interface GameState {
	isGameOver: boolean;
	ballIsPaused: boolean;
	maxScore: number;
	points: number;
}

export const gameState: GameState = {
	isGameOver: false,
	ballIsPaused: false,
	maxScore: 11,
	points:1,
};

/* Game Parameters */

const radius = 110;
const beta = radius - 20;

const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;

let engine: BABYLON.Engine;
let sceneToRender: BABYLON.Scene;

// Renderer, Babylon already gives this
const startRenderLoop = function (engine: BABYLON.Engine) {
            engine.runRenderLoop(() => {
                if (sceneToRender && sceneToRender.activeCamera) {
                    sceneToRender.render();
                }
            });
        };

// Game Engine, Babylon already gives this
var createDefaultEngine = (): BABYLON.Engine => {
	return new BABYLON.Engine(canvas, true, { 
		preserveDrawingBuffer: true,
		stencil: true,
		disableWebGL2Support: false
	}); 
};

/* Helper Function */
function clampVectorSpeed(vector: BABYLON.Vector3, maxSpeed: number) {
	const currentSpeed = vector.length();
	if(currentSpeed > maxSpeed)
		vector.normalize().scaleInPlace(maxSpeed);
}

const createScene = (): BABYLON.Scene => Playground.CreateScene(engine);

window.addEventListener("DOMContentLoaded", async () => {
	engine = createDefaultEngine();
	sceneToRender = createScene();
	startRenderLoop(engine);

	window.addEventListener("resize", () => {
		engine.resize();
	});
});

// Imagem Referencia: https://www.olx.pt/d/anuncio/mesa-air-hockey-pro-IDzbOoL.html


const PowerUpManager = new powerUpManager();

const powerUpContext: powerUpContext = {
	ball: null as any,
	player: null as any,
	table: null as any,
	scene: null as any,
};

export class Playground {
    static CreateScene(engine: BABYLON.Engine)
	{
        // This creates a basic Babylon Scene object (non-mesh)
        var scene = new BABYLON.Scene(engine);
		// Parameters: name, alpha, beta, radius, target position, scene
		const camera = new BABYLON.ArcRotateCamera("Camera", 0, 0, 20, new BABYLON.Vector3(0, 0, 0), scene);			
		// Positions the camera overwriting alpha, beta, radius
		camera.setPosition(new BABYLON.Vector3(0, beta, radius));
		
		// Uncomment to move camera around
		//camera.attachControl(canvas, true);
		// This removes the Panning
		camera.panningSensibility = 0;
        // This creates a light, aiming 0,1,0 - to the sky (non-mesh)
        var light = new BABYLON.HemisphericLight("light1", new BABYLON.Vector3(0, 1, 0), scene);
        // Default intensity is 1.
        light.intensity = 0.7;
        
		// Table and all its components
		var table = new Table(scene);

		// Create Both Players
		let player1: Player = new Player("Default 1", new BABYLON.Color3(0, 0, 1), new BABYLON.Color3(0.4510, 0.6549, 0.9922), scene, 56, true);
		let player2: Player = new Player("Default 2",new BABYLON.Color3(0.5490, 0.0118, 0.0118), new BABYLON.Color3(0.8549, 0.1529, 0.1529), scene, -56, false);
		
		// Set Name on Website
		const p1Element = document.querySelector<HTMLDivElement>("#p1Name h2");
		const p2Element = document.querySelector<HTMLDivElement>("#p2Name h2");

		if(p1Element)
			p1Element.textContent = player1._name;
		if(p2Element)
			p2Element.textContent = player2._name;
		
		// Position Table on the page
		table.positionTable(player1, player2);

		// Create Ball Class
        var ball = new Ball(scene);

		// Position Ball on the Page/Table
		ball.positionBall();

		// Save the values so they can be used on the powerUps later on
		powerUpContext.table = table;
		powerUpContext.scene = scene;
		powerUpContext.ball = ball;

		// Add the Controls so each player can move, Keyboard inputs basically
		Playground.addControls(scene, player1, player2, powerUpContext);

		// Decide to where the ball is going the first time
		// 50% chance that it goes to either player, seems logical
		let randomNumber: number = Math.random() < 0.5 ? 0 : 1;

		if(randomNumber == 0) 
			ball._ballVelocity = new BABYLON.Vector3(ball._initialSpeed * 0.7, 0,0);
		else 
			ball._ballVelocity = new BABYLON.Vector3(-ball._initialSpeed * 0.7, 0,0);

		// Save Previous position so we can change the values and keep the last ones
		// Used on the Collision with the Walls
		let previousP1PaddlePosition: BABYLON.Vector3 = player1._paddle.position.clone();
		let previousP2PaddlePosition: BABYLON.Vector3 = player2._paddle.position.clone();

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
				const bounceAngle = normalizedImpact * ball._maxBounceAngle;
				const outgoingXDirection = isP2Paddle ? 1 : -1;

				const newDirection = new BABYLON.Vector3(
					Math.cos(bounceAngle) * outgoingXDirection,
					0,
					Math.sin(bounceAngle)
				).normalize();

				// Apply new Velocity
				const currentBallSpeed = Math.max(9, ball._ballVelocity.length());
				ball._ballVelocity = newDirection.scale(currentBallSpeed);

				// Add Paddle Velocity Influence
				ball._ballVelocity.addInPlace(paddleVelocity.scale(ball._paddleImpulseFactor));

				// Apply Restituiton and clamp speed
				ball._ballVelocity.scaleInPlace(ball._restituiton);
				clampVectorSpeed(ball._ballVelocity, ball._ballMaxSpeed);

				// Push Ball slightly away to avoid multiple collisions
				const smallPush = newDirection.scale(0.05);
				ball._ball.position.addInPlace(smallPush);
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
			player1._isShieldActive = false;
			player2._isShieldActive = false;

		    showCountdown(3, () => {

				const dirX = isP1Point ? -1 : 1;

				const dirZ = Math.random() < 0.5 ? -1 : 1;

		        ball._ballVelocity.x = dirX * ball._initialSpeed;
		        ball._ballVelocity.z = dirZ * (ball._initialSpeed / 2);

				gameState.ballIsPaused = false;
				console.log("▶️ Bola retomada!");
		    });
		}

		// Basic Function to update the display
		function updateScoreDisplay(p1: Player, p2: Player){
			const p1Element = document.querySelector<HTMLDivElement>("#p1Score b");
			const p2Element = document.querySelector<HTMLDivElement>("#p2Score b");

			if (p1Element) 
				p1Element.textContent = p1._score.toString();
    		if (p2Element) 
				p2Element.textContent = p2._score.toString();
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
			}, 1000);
		}

		// Function to be done, probably will erase it later depends how we treat the movement inside the page
		function goToLobby() {
			const overlay = document.getElementById("gameOverOverlay");
			overlay!.style.display = "none";

			document.getElementById("app")!.innerHTML = `
				<h1>Lobby<h1>
				<button id="startGame">Start Game</button>
			`;
			document.getElementById("startGame")!.addEventListener("click", () => {
				//startNewGame();
			})
		}

		// Name says it all
		function turnOffDisplay() {
			const p1Name = document.getElementById("p1Name");
			const p2Name = document.getElementById("p2Name");
			const p1Score = document.getElementById("p1Score");
			const p2Score = document.getElementById("p2Score");
			if(p1Name)
				p1Name.style.display = "none";
			if(p2Name)
				p2Name.style.display = "none";
			if(p1Score)
				p1Score.style.display = "none";
			if(p2Score)
				p2Score.style.display = "none";
		}

		// Function to cancel 
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
			player1._paddle.setEnabled(false);
			player2._paddle.setEnabled(false);
			ball._ball.setEnabled(false);
			turnOffDisplay();

			const overlay = document.getElementById("gameOverOverlay");
			overlay!.style.display = "flex";
			overlay!.innerHTML = `<h1>${winner} Wins!</h1><button id="returnLobby" class="absolute top-20 left-1/2">Return to Lobby</button>`;
		
			document.getElementById("returnLobby")!.addEventListener("click", () => {
				goToLobby();
			});
		}

		// Render function, super important because it updates all the values before the rendering, checks ball position and collisions with the walls
		// Returns the Scene to be renderer after
		scene.registerBeforeRender(() => {
			
			const deltaTimeSeconds = engine.getDeltaTime() / 1000;
			if(!deltaTimeSeconds)
				return ;

			if(gameState.ballIsPaused || gameState.isGameOver)
				return ;
			// Update Ball position
			const ballDisplacement = ball._ballVelocity.scale(deltaTimeSeconds);
			ball._ball.position.addInPlace(ballDisplacement);

			// Table Collision
			// Paredes Baixo e Cima
			if (ball._ball.position.z > table._Dimensions.tableDepth / 2) {
    			ball._ball.position.z = table._Dimensions.tableDepth / 2;
    			ball._ballVelocity.z *= -ball._restituiton;
    			if (Math.abs(ball._ballVelocity.z) > ball._ballMaxSpeed) {
    			    ball._ballVelocity.z = Math.sign(ball._ballVelocity.z) * ball._ballMaxSpeed;
    			}
			} else if (ball._ball.position.z < -table._Dimensions.tableDepth / 2) {
			    ball._ball.position.z = -table._Dimensions.tableDepth / 2;
			    ball._ballVelocity.z *= -ball._restituiton;
			
			    if (Math.abs(ball._ballVelocity.z) > ball._ballMaxSpeed) {
			        ball._ballVelocity.z = Math.sign(ball._ballVelocity.z) * ball._ballMaxSpeed;
			    }
			}
			// Left and Right Wall		
			// Goal Check on Player 1 Goal
			
			if ((ball._ball.position.x > table._leftGoal.position.x) && !player1._isShieldActive) {
				player2._score += gameState.points;
				updateScoreDisplay(player1, player2);
				
				if(player2._score >= gameState.maxScore)
					endGame("Player 2");

				resetBallAndPlayers(ball, player1, player2, false);

			} 
			// Goal Check on Player 2 Goal
			else if ((ball._ball.position.x < table._rightGoal.position.x) && !player2._isShieldActive) {
				player1._score += gameState.points;
				updateScoreDisplay(player1, player2);

				if(player1._score >= gameState.maxScore)
					endGame("Player 1");
				
				resetBallAndPlayers(ball, player1, player2, true);
				
			}
			// Shield Active Situation
			else if ((ball._ball.position.x >  table._leftGoal.position.x) && player1._isShieldActive)
			{
				ball._ball.position.x = table._leftGoal.position.x;
    			ball._ballVelocity.x *= -ball._restituiton;
    			if (Math.abs(ball._ballVelocity.x) > ball._ballMaxSpeed) {
    			    ball._ballVelocity.x = Math.sign(ball._ballVelocity.x) * ball._ballMaxSpeed;
    			}
			}
			else if ((ball._ball.position.x < table._rightGoal.position.x) && player2._isShieldActive)
			{
				ball._ball.position.x = table._rightGoal.position.x;
    			ball._ballVelocity.x *= -ball._restituiton;
    			if (Math.abs(ball._ballVelocity.x) > ball._ballMaxSpeed) {
    			    ball._ballVelocity.x = Math.sign(ball._ballVelocity.x) * ball._ballMaxSpeed;
    			}
			}

			// Paddle Velocities
			const p1PaddleVelocity = player1._paddle.position.subtract(previousP1PaddlePosition).scale(1 / deltaTimeSeconds);
			const p2PaddleVelocity = player2._paddle.position.subtract(previousP2PaddlePosition).scale(1 / deltaTimeSeconds);

			previousP1PaddlePosition.copyFrom(player1._paddle.position);
			previousP2PaddlePosition.copyFrom(player2._paddle.position);

			// Handle Paddle Collisions			
			handlePaddleCollision(player1._paddle, p1PaddleVelocity, false);
			handlePaddleCollision(player2._paddle, p2PaddleVelocity, true);
		});
		
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
		PaddleFloor.position.set(playerStartPos,-1,0);
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
	private static addControls(scene: BABYLON.Scene, player1: Player, player2: Player, powerUpContext: powerUpContext): void 
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
			
			// PowerUps (Q/E/R (Player 1) / P/I/U (Player 2))
			if(keys["q"] || keys["Q"])
				player1.activatePowerUp(0, powerUpContext);
			if (keys["e"] || keys["E"])
				player1.activatePowerUp(1, powerUpContext);
			if (keys["r"] || keys["R"])
				player1.activatePowerUp(2, powerUpContext);
			if (keys["i"] || keys["I"])
				player2.activatePowerUp(0, powerUpContext);
			if (keys["o"] || keys["O"])
				player2.activatePowerUp(1, powerUpContext);
			if (keys["p"] || keys["P"])
				player2.activatePowerUp(2, powerUpContext);
		});
  }
}