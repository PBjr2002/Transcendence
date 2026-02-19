import { startGameLocal } from "./script";

export interface DataForGameLocal {
	powerUpsEnabled: boolean;
	player1Settings: any;
	player2Settings: any;
}

export const dataForGame: DataForGameLocal = {
	powerUpsEnabled: false,
	player1Settings: {
		powerUps: ["", "", ""] as string[],
		paddleColor: "#000000",
	},
	player2Settings: {
		powerUps: ["", "", ""] as string[],
		paddleColor: "#000000",
	},
}

/* 



*/

// Cria a pagina para escolher os PowerUps
export function lobbyViewLocal(): string {

  return `
    <div class="flex flex-col items-center justify-center min-h-screen gap-6">
	<div class="flex justify-center gap-16 mb-6">

	  <!-- Player 1 Controls -->
	  <div class="bg-white p-4 rounded-2xl shadow text-center w-72">
	    <h2 class="text-lg font-bold text-blue-600 mb-2">Player 1 Controls</h2>
	    <p class="text-black">
 		<b>Move:</b> 
  		<span class="bg-gray-200 px-2 py-1 rounded">W</span>
  		/
  		<span class="bg-gray-200 px-2 py-1 rounded">S</span>
		</p>
	    <p class="text-black"><b>Power-Ups:</b> Q / E / R</p>
	  </div>

	  <!-- Player 2 Controls -->
	  <div class="bg-white p-4 rounded-2xl shadow text-center w-72">
	    <h2 class="text-lg font-bold text-red-600 mb-2">Player 2 Controls</h2>
	    <p class="text-black">
		<b>Move:</b> 
  		<span class="bg-gray-200 px-2 py-1 rounded">↑</span>
  		/
  		<span class="bg-gray-200 px-2 py-1 rounded">↓</span>
		</p>
	    <p class="text-black"><b>Power-Ups:</b> I / O / P</p>
	  </div>

	</div>
  <!-- MENUS LADO A LADO -->
  <div class="flex gap-8">

    <!-- PLAYER 1 -->
    <div id="menuP1" class="bg-white rounded-3xl p-8 w-96 shadow-2xl">
      <h1 class="text-2xl font-bold text-center text-blue-600 mb-6">
        Player 1
      </h1>

      <div class="mb-4">
        <label class="block text-black font-semibold mb-1">Paddle Color</label>
        <input id="paddleColorP1" type="color" class="w-full h-10 rounded-lg border" />
      </div>

      <div class="mb-4">
        <label class="block text-black font-semibold mb-1">Power-Ups</label>
        ${[0,1,2].map(() => `
          <select class="w-full text-black mb-2 p-2 border rounded-lg powerupP1">
            <option value="doublePoints">Double Points</option>
            <option value="invisibleBall">Invisible Ball</option>
            <option value="shrinkBall">Shrink Ball</option>
            <option value="speedBoostBall">Speed Boost Ball</option>
            <option value="speedBoostPaddle">Speed Boost Paddle</option>
          </select>
        `).join("")}
      </div>
    </div>

    <!-- PLAYER 2 -->
    <div id="menuP2" class="bg-white rounded-3xl p-8 w-96 shadow-2xl">
      <h1 class="text-2xl font-bold text-center text-red-600 mb-6">
        Player 2
      </h1>

      <div class="mb-4">
        <label class="block text-black font-semibold mb-1">Paddle Color</label>
        <input type="color" id="paddleColorP2" class="w-full h-10 rounded-lg border" />
      </div>

      <div class="mb-4">
        <label class="block text-black font-semibold mb-1">Power-Ups</label>
        ${[0,1,2].map(() => `
          <select class="w-full text-black mb-2 p-2 border rounded-lg powerupP2">
            <option value="doublePoints">Double Points</option>
            <option value="invisibleBall">Invisible Ball</option>
            <option value="shrinkBall">Shrink Ball</option>
            <option value="speedBoostBall">Speed Boost Ball</option>
            <option value="speedBoostPaddle">Speed Boost Paddle</option>
          </select>
        `).join("")}
      </div>
    </div>

  </div>

  <!-- TOGGLE GLOBAL POWERUPS -->
  <div class="flex items-center gap-4">
    <span class="font-semibold text-white text-lg">Enable Power-Ups</span>
    <button
      id="togglePowerUps"
      class="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-2 rounded-lg transition"
    >
      OFF
    </button>
  </div>

  <!-- START BUTTON -->
  <button
    id="startLocalGame"
    class="bg-green-500 hover:bg-green-600 text-white font-bold px-12 py-4 rounded-2xl text-xl shadow-xl transition"
  >
    START GAME
  </button>

</div>

  `;
}

// Carrega a Logica de Escolha de PowerUps e Cor da Paddle, depois envia para o loadLocalGame
export async function initLobbyLocal() {

	const menuP1 = document.getElementById("menuP1")!;
	const menuP2 = document.getElementById("menuP2")!;
	const toggleBtn = document.getElementById("togglePowerUps")! as HTMLButtonElement;
	const matchmakingBtn = document.getElementById("startLocalGame")! as HTMLButtonElement;
	// Change Facing

	// animação pop-up
	requestAnimationFrame(() => {
	  	menuP1.classList.remove("opacity-0", "scale-75");
	  	menuP1.classList.add("opacity-100", "scale-100");
		menuP2.classList.remove("opacity-0", "scale-75");
	  	menuP2.classList.add("opacity-100", "scale-100");
	});
	
	let enabled = false;

	const powerUpsSelectedP1 = document.querySelectorAll<HTMLSelectElement>(".powerupP1");
	const powerUpsSelectedP2 = document.querySelectorAll<HTMLSelectElement>(".powerupP2");

	if(!enabled)
	{
		powerUpsSelectedP1.forEach((otherSelect) => {
			Array.from(otherSelect.options).forEach(option => {
				option.disabled = true;
			});
		});

		powerUpsSelectedP2.forEach((otherSelect) => {
			Array.from(otherSelect.options).forEach(option => {
				option.disabled = true;
			});
		});
	}

	function updatePowerUpSelects() {
		[...powerUpsSelectedP1, ...powerUpsSelectedP2].forEach((select) => {
			Array.from(select.options).forEach(option => {
				if(option.value === "") {
					option.disabled = false; // Sempre permitimos a opção vazia
				} else {
					// Se powerUpsEnabled está OFF, desativamos todas
					option.disabled = !enabled;
				}
			});
		});
	}

	toggleBtn.addEventListener("click", () => {
		enabled = !enabled;
		dataForGame.powerUpsEnabled = enabled;

		if(dataForGame.powerUpsEnabled){
			toggleBtn.classList.remove("bg-red-500", "hover:bg-red-600", "OFF");
			toggleBtn.classList.add("bg-green-500", "hover:bg-green-600", "ON");
			toggleBtn.innerHTML = "ON";
		}
		else
		{
			toggleBtn.classList.remove("bg-green-500", "hover:bg-green-600", "ON");
			toggleBtn.classList.add("bg-red-500", "hover:bg-red-600", "OFF");
			toggleBtn.innerHTML = "OFF";
		}

		updatePowerUpSelects();
	});


	powerUpsSelectedP1.forEach((select, index) => {
		select.value = dataForGame.player1Settings.powerUps[index];
	});

	powerUpsSelectedP2.forEach((select, index) => {
		select.value = dataForGame.player2Settings.powerUps[index];
	});

	powerUpsSelectedP1.forEach((select, index) => {
		select.addEventListener("change", () => {
			dataForGame.player1Settings.powerUps[index] = select.value;

			const selectedValues = dataForGame.player1Settings.powerUps.filter((v:string) => v !== "")

			powerUpsSelectedP1.forEach((otherSelect) => {

				Array.from(otherSelect.options).forEach(option => {
					if(option.value === "" || option.value === otherSelect.value)
						option.disabled = false;
					else
						option.disabled = selectedValues.includes(option.value);
				})
			});
		});
	});

	powerUpsSelectedP2.forEach((select, index) => {
		select.addEventListener("change", () => {
			dataForGame.player2Settings.powerUps[index] = select.value;
			
			const selectedValues = dataForGame.player2Settings.powerUps.filter((v:string) => v !== "")

			powerUpsSelectedP2.forEach((otherSelect) => {

				Array.from(otherSelect.options).forEach(option => {
					if(option.value === "" || option.value === otherSelect.value)
						option.disabled = false;
					else
						option.disabled = selectedValues.includes(option.value);
				})
			});
		});
	});

	const colorInputP1 = document.getElementById("paddleColorP1") as HTMLInputElement
	colorInputP1.addEventListener("input", () => {
		dataForGame.player1Settings.paddleColor = colorInputP1.value;
	});

	const colorInputP2 = document.getElementById("paddleColorP2") as HTMLInputElement
	colorInputP2.addEventListener("input", () => {
		dataForGame.player2Settings.paddleColor = colorInputP2.value;
	});

	matchmakingBtn.addEventListener("click", () => {
		let emptyPowerUps;

		if(dataForGame.powerUpsEnabled)
			emptyPowerUps = dataForGame.player1Settings.powerUps.includes("") || dataForGame.player2Settings.powerUps.includes("");
		if(emptyPowerUps)
			alert("Both Players need to have PowerUps Selected");
		else
			loadGameLocal(dataForGame);

	});
}

// Carrega a pagina principal do Jogo, no final envia para criar a Babylon Scene
export async function loadGameLocal(dataForGame: DataForGameLocal){

	const app = document.getElementById("app");
	if (!app) 
		return;
	
	app.innerHTML = "";
		app.className = "h-screen flex flex-col overflow-hidden";
		
		// Header
		const header = document.createElement("div");
		header.className = "w-full grid grid-cols-[1fr_1.5fr_1fr] items-center py-6 flex-none overflow-hidden";
			
			//Left Div
			const leftDiv = document.createElement("div");
			leftDiv.className = "flex flex-col items-center gap-2";
	
				const projectName = document.createElement("h2");
				projectName.className = "text-4xl font-bold";
				projectName.innerHTML = "Project Name";
	
				const projectNameImg = document.createElement("img");
				projectNameImg.className = "w-32 h-32";
				projectNameImg.src = "icon.png";
	
			leftDiv.appendChild(projectName);
			leftDiv.appendChild(projectNameImg);
	
				// Middle Div
			const middleDiv = document.createElement("div");
			middleDiv.className = "flex items-center justify-center gap-8";
					
				const player1Div = document.createElement("div");
				player1Div.className = "flex flex-col items-center gap-2";
	
					const imgP1 = document.createElement("img");
					imgP1.className = "w-20 h-20 rounded-full object-contain";
					imgP1.src = "icons/default.jpg"; 
	
					const nameP1 = document.createElement("h2");
					nameP1.className = "text-2xl font-bold p1Name";
					nameP1.innerHTML = "Player 1";
	
					const scoreP1 = document.createElement("span");
					scoreP1.className = "text-4xl font-bold";
					scoreP1.id = "P1Score";
					scoreP1.innerHTML = "0";
	
					const winRatioP1 = document.createElement("div");
					winRatioP1.className = "text-sm";
					winRatioP1.innerHTML = "Local Game!!";
					
					const flagP1 = document.createElement("img");
					flagP1.className = "w-10 h-6 object-contain";
					flagP1.src = "icons/defaultFlag.jpg"
	
				player1Div.appendChild(imgP1);
				player1Div.appendChild(nameP1);
				player1Div.appendChild(scoreP1);
				player1Div.appendChild(winRatioP1);
				player1Div.appendChild(flagP1);
	
				const VSDiv = document.createElement("div");
				VSDiv.className = "text-center text-6xl font-extrabold";
				VSDiv.innerHTML = "VS";
	
				const player2Div = document.createElement("div");
				player2Div.className = "flex flex-col items-center gap-2";
	
					const imgP2 = document.createElement("img");
					imgP2.className = "w-20 h-20 rounded-full";
					imgP2.src = "p2.jpg";
	
					const nameP2 = document.createElement("h2");
					nameP2.className = "text-2xl font-bold p2Name";
					nameP2.innerHTML = "Player 2";
	
					const scoreP2 = document.createElement("span");
					scoreP2.className = "text-4xl font-bold";
					scoreP2.id = "P2Score";
					scoreP2.innerHTML = "0";
	
					const winRatioP2 = document.createElement("div");
					winRatioP2.className = "text-sm";
					winRatioP2.innerHTML = "Local Game!!";
				
					const flagP2 = document.createElement("img");
					flagP2.className = "w-10 h-6";
					flagP2.src = "icons/defaultFlag.jpg";
	
				player2Div.appendChild(imgP2);
				player2Div.appendChild(nameP2);
				player2Div.appendChild(scoreP2);
				player2Div.appendChild(winRatioP2);
				player2Div.appendChild(flagP2);
	
			middleDiv.appendChild(player1Div);
			middleDiv.appendChild(VSDiv);
			middleDiv.appendChild(player2Div)
	
			// Right Div
			const rightDiv = document.createElement("div");
			rightDiv.className = "flex flex-col items-center gap-2";
							
				const playerProfileImg = document.createElement("img");
				playerProfileImg.className = "w-32 h-32 object-contain";
				playerProfileImg.src = "icons/default.jpg"; 
	
				const backButton = document.createElement("button");
				backButton.className = "px-6 py-3 bg-blue-500 hover:bg-blue-400 rounded-xl text-2xl text-white font-semibold shadow-md transition"
				backButton.innerHTML = "Home";
				backButton.id = "btn-home";
	
			/* rightDiv.appendChild(playerProfile); */
			rightDiv.appendChild(playerProfileImg);
			rightDiv.appendChild(backButton);
	
	
			header.appendChild(leftDiv);
			header.appendChild(middleDiv);
			header.appendChild(rightDiv);
	
		app.appendChild(header);
	
			const main = document.createElement("main");
			main.className = "flex flex-1 box-border overflow-hidden min-w-0";
				const leftAside = document.createElement("aside");
				leftAside.className = "w-48 flex flex-col items-end gap-6 p-6 box-border powerups-left";
				if(dataForGame.powerUpsEnabled)
				{
					const p1PowerUps = document.createElement("h3");
					p1PowerUps.className = "text-2xl font-bold";
					p1PowerUps.innerHTML = "P1 PowerUps";
	
					const powerUpsDiv = document.createElement("div");
					powerUpsDiv.className = "flex flex-col gap-4";
	
						const pu1 = document.createElement("div");
						pu1.className = "relative w-20 h-20 bg-gray-700 rounded bg-center bg-cover bg-contain bg-no-repeat";
						pu1.id = "p1PowerUp0";
						const pu2 = document.createElement("div");
						pu2.className = "relative w-20 h-20 bg-gray-700 rounded bg-center bg-cover bg-contain bg-no-repeat";
						pu2.id = "p1PowerUp1";
						const pu3 = document.createElement("div");
						pu3.className = "relative w-20 h-20 bg-gray-700 rounded bg-center bg-cover bg-contain bg-no-repeat";
						pu3.id = "p1PowerUp2";
					powerUpsDiv.appendChild(pu1);
					powerUpsDiv.appendChild(pu2);
					powerUpsDiv.appendChild(pu3);
	
				leftAside.appendChild(p1PowerUps);
				leftAside.appendChild(powerUpsDiv);
				}
	
				const gameSection = document.createElement("div");
				gameSection.className = "game-border flex-1 flex items-center justify-center box-border overflow-hidden";
	
					const canvas = document.createElement("canvas");
					canvas.id = "renderCanvas";
					canvas.className = "w-full h-full block";
	
				gameSection.appendChild(canvas);
				
	
				const rightAside = document.createElement("aside");
				rightAside.className = "w-48 flex flex-col items-start gap-6 p-6 box-border powerups-right";
				if(dataForGame.powerUpsEnabled)
				{
					const p2PowerUps = document.createElement("h3");
					p2PowerUps.className = "text-2xl font-bold";
					p2PowerUps.innerHTML = "P2 PowerUps";
	
					const powerUpsDivP2 = document.createElement("div");
					powerUpsDivP2.className = "flex flex-col gap-4";
	
						const P2pu1 = document.createElement("div");
						P2pu1.className = "relative w-20 h-20 bg-gray-700 rounded bg-center bg-cover bg-contain bg-no-repeat";
						P2pu1.id = "p2PowerUp0";
						const P2pu2 = document.createElement("div");
						P2pu2.className = "relative w-20 h-20 bg-gray-700 rounded bg-center bg-cover bg-contain bg-no-repeat";
						P2pu2.id = "p2PowerUp1";
						const P2pu3 = document.createElement("div");
						P2pu3.className = "relative w-20 h-20 bg-gray-700 rounded bg-center bg-cover bg-contain bg-no-repeat";
						P2pu3.id = "p2PowerUp2";
					powerUpsDivP2.appendChild(P2pu1);
					powerUpsDivP2.appendChild(P2pu2);
					powerUpsDivP2.appendChild(P2pu3);
	
				rightAside.appendChild(p2PowerUps);
				rightAside.appendChild(powerUpsDivP2);
				}
				
			main.appendChild(leftAside);
			main.appendChild(gameSection);
			main.appendChild(rightAside);
	
			
		app.appendChild(main);
	
			const bottomDiv = document.createElement("div");
			bottomDiv.className = "w-full grid grid-cols-[1fr_1.5fr_1fr] items-center py-6 flex-none overflow-hidden";
	
				const iconLeft = document.createElement("img");
	
				const gameControls = document.createElement("div");
				gameControls.className = "flex items-center gap-12 bg-black/40 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/20 shadow-lg mx-auto max-w-[500px] w-full";
	
					const resume = document.createElement("button");
					resume.className = "px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-2xl font-semibold shadow-md transition";
					resume.id = "btn-resume";
					resume.innerHTML = "Resume";
	
					const pause = document.createElement("button");
					pause.className = "px-6 py-3 bg-yellow-500 hover:bg-yellow-400 rounded-xl text-2xl font-semibold shadow-md transition";
					pause.id = "btn-pause";
					pause.innerHTML = "Pause";
	
				gameControls.appendChild(resume);
				gameControls.appendChild(pause);
	
				const iconRight = document.createElement("img");
	
			bottomDiv.appendChild(iconLeft);
			bottomDiv.appendChild(gameControls);
			bottomDiv.appendChild(iconRight);
			
		app.appendChild(bottomDiv);
	
			// Count Down
			const countdownDiv = document.createElement("div");
			countdownDiv.className = "absolute top-20 left-1/2 text-white text-xxl z-20";
			countdownDiv.id = "countdown";
			
			// gameOver
			const gameOverDiv = document.createElement("div");
			gameOverDiv.className = "absolute top-1/2 left-1/3 z-20";
			gameOverDiv.id = "gameOverOverlay"
				
				
		app.appendChild(countdownDiv);
		app.appendChild(gameOverDiv);
	
		startGameLocal(dataForGame);	
}