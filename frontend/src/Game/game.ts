import { startGame } from "./script";

export function loadGame(){

	const app = document.getElementById("app");
	if (!app) 
		return;
	app.innerHTML = "";
	
	// Creating Canvas Div
	const canvasDiv = document.createElement("div");
	canvasDiv.className = "w-full h-screen z-0";
	canvasDiv.id = "canvasZone";

	// Title
	const titleDiv = document.createElement("div");
	titleDiv.className = "absolute top-4 left-1/2 transform -translate-x-1/2 tex-/xl z-20";
	titleDiv.id = "title";
	titleDiv.innerHTML = "Grande Jogo de Pong";
	canvasDiv.appendChild(titleDiv);

	// P1 and P2 Names and Scores
	const p1NameDiv = document.createElement("div");
	p1NameDiv.className = "absolute top-25 left-1/6 text-black text-xl z-20";
	p1NameDiv.id = "p1Name";
	
	const p1NameH2 = document.createElement("h2");
	p1NameDiv.appendChild(p1NameH2);
	
	
	const p1ScoreDiv = document.createElement("div");
	p1ScoreDiv.className = "absolute top-35 left-1/5 text-black text-xxl z-20";
	p1ScoreDiv.id = "p1Score";
	const p1ScoreB = document.createElement("b");
	p1ScoreB.innerHTML = "0";
	p1ScoreDiv.appendChild(p1ScoreB);
	
	
	const p2NameDiv = document.createElement("div");
	p2NameDiv.className = "absolute top-25 right-1/6 text-black text-xl z-20";
	p2NameDiv.id = "p2Name";

	const p2NameH2 = document.createElement("h2");
	p2NameDiv.appendChild(p2NameH2);

	const p2ScoreDiv = document.createElement("div");
	p2ScoreDiv.className = "absolute top-35 right-1/5 text-black text-xxl z-20";
	p2ScoreDiv.id = "p2Score";
	const p2ScoreB = document.createElement("b");
	p2ScoreB.innerHTML = "0";
	p2ScoreDiv.appendChild(p2ScoreB);
	

	canvasDiv.appendChild(p1NameDiv);
	canvasDiv.appendChild(p1ScoreDiv);
	canvasDiv.appendChild(p2NameDiv);
	canvasDiv.appendChild(p2ScoreDiv);

	// CountDown
	const countdownDiv = document.createElement("div");
	countdownDiv.className = "absolute top-20 left-1/2 text-black text-xxl z-20";
	countdownDiv.id = "countdown";
	canvasDiv.appendChild(countdownDiv);

	// gameOver
	const gameOverDiv = document.createElement("div");
	gameOverDiv.className = "absolute top-1/2 left-1/3 z-20";
	gameOverDiv.id = "gameOverOverlay"
	canvasDiv.appendChild(gameOverDiv);

	// PowerUP HUD
	const HUDDiv = document.createElement("div");
	HUDDiv.className = "fixed top-4 w-full flex justify-between px-6 z-20"
	HUDDiv.id = "hud-container";
	
	const powerUpLeftDiv = document.createElement("div");
	powerUpLeftDiv.className = "fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4";
	powerUpLeftDiv.id = "powerups-left";
	HUDDiv.appendChild(powerUpLeftDiv);

	const powerUpRightDiv = document.createElement("div");
	powerUpRightDiv.className = "fixed right-4 top-1/2 -translate-y-1/2 flex flex-col gap-4";
	powerUpRightDiv.id = "powerups-right";
	HUDDiv.appendChild(powerUpRightDiv);

	canvasDiv.appendChild(HUDDiv);

	// Canvas to render Game
	const renderCanvas = document.createElement("canvas");
	renderCanvas.className = "absolute top-0 left-0 z-0 w-full h-full";
	renderCanvas.id = "renderCanvas";
	canvasDiv.appendChild(renderCanvas);

	app.appendChild(canvasDiv);

	startGame();
}