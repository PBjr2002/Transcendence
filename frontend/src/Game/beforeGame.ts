import { webSocketService } from "../websocket";
//import { loadGame } from "./game";

export interface dataForGame {
	paddleColor: string;
	powerUps: string[];
	powerUpsEnabled: boolean;
	player1Settings: any;
	player2Settings: any;
	p1ApiData: any;
	p2ApiData: any;
}

const dataForGame: dataForGame = {
	paddleColor: "#000000",
	powerUps: ["", "", ""] as string[],
	powerUpsEnabled: false,
	player1Settings: null,
	player2Settings: null,
	p1ApiData: null,
	p2ApiData: null,
}

// Isto vai ter de ser alimentado depois para sabermos quem e o user para desligar ou ligar o botao de PowerUps

/* 
	Save Settings
cada player guarda as suas settings
Objecto Exemplo de settings do player1:
settings: {
	player1: {
		cor: string
		powerUps: [array de strings]
	}
}

Objecto Exemplo de settings do player2:
settings: {
	player2: {
		cor: string
		powerUps: [array de strings]
	}
}

*/

export function lobbyView(): string {

  return `
    <div class="flex items-center justify-center min-h-screen">
      <div
        id="lobbyMenu"
        class="bg-white rounded-3xl p-8 w-96 opacity-0 scale-75 transform transition-all duration-500 shadow-2xl"
      >
        <h1 class="text-2xl font-bold text-center text-blue-600 mb-6">
          Air Hockey Lobby
        </h1>

        <div class="mb-4">
          <label class="block text-black font-semibold mb-1">Paddle Color</label>
          <input id="paddleColor" type="color" class="w-full h-10 rounded-lg border" />
        </div>

        <div class="mb-4">
          <label class="block text-black font-semibold mb-1">Facing</label>
          <ul class="bg-gray-50 border text-black rounded-lg max-h-24 overflow-y-auto">
            <li id="facing" class="px-3 py-1 hover:bg-blue-100">Player 1</li>
          </ul>
        </div>

        <div class="mb-4">
          <label class="block text-black font-semibold mb-1">Power-Ups</label>
          ${[0,1,2].map(() => `
            <select class="w-full text-black mb-2 p-2 border rounded-lg powerup">
              <option value="doublePoints">Double Points</option>
              <option value="invisibleBall">Invisible Ball</option>
			  <option value="shrinkBall">Shrink Ball</option>
			  <option value="speedBoostBall">Speed Boost Ball</option>
			  <option value="speedBoostPaddle">Speed Boost Paddle</option>
            </select>
          `).join("")}
        </div>

        <div class="flex items-center justify-between">
          <span class="font-semibold text-black">Enable Power-Ups</span>
          <button
            id="togglePowerUps"
            class="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg transition OFF"
          >
            OFF
          </button>
        </div>
		<br>
		<button
          id="readyBtn"
          class="w-full mb-4 bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-lg transition"
        >
          Ready
        </button>
		<button
          id="matchmakingBtn"
          class="w-full mb-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-lg transition"
        >
          Matchmaking
        </button>
      </div>
    </div>
  `;
}

export async function initLobby(lobby: any) {

  	const menu = document.getElementById("lobbyMenu")!;
  	const toggleBtn = document.getElementById("togglePowerUps")! as HTMLButtonElement;
	const matchmakingBtn = document.getElementById("matchmakingBtn")! as HTMLButtonElement;
	const readyBtn = document.getElementById("readyBtn")!;

	// Change Facing

  	// animação pop-up
  	requestAnimationFrame(() => {
  	  menu.classList.remove("opacity-0", "scale-75");
  	  menu.classList.add("opacity-100", "scale-100");
  	});
	
	// lobby ID

	const res = await fetch("/api/me", {
		method: "GET",
		credentials: "include"
	});

	const response = await res.json();

	let creator = lobby.leaderId === response.data.safeUser.id

	/* API request to know which User we are facing and get his ID */

	let opponent = lobby.playerId1 === response.data.safeUser.id ? lobby.playerId2 : lobby.playerId1;
	const facingElement = document.getElementById("facing")!;
	{
		const reqOpponentName = await fetch(`/api/users/id/${opponent}`,{
			method: "GET",
			credentials: "include",
		});
		const resOpponentName = await reqOpponentName.json();
		opponent = resOpponentName.data.name;
	}
	
	facingElement.innerHTML = opponent;
	
  	let enabled = false;

	const powerUpsSelected = document.querySelectorAll<HTMLSelectElement>(".powerup");

	if(!enabled)
	{
		powerUpsSelected.forEach((otherSelect) => {
			Array.from(otherSelect.options).forEach(option => {
				option.disabled = true;
			});
		});
	}

	if(!creator)
	{
		matchmakingBtn.disabled = true;
		matchmakingBtn.classList.remove("bg-blue-500", "hover:bg-blue-600");
		matchmakingBtn.classList.add("bg-gray-400", "text-gray-700", "cursor-not-allowed","opacity-70");
		toggleBtn.disabled = true;
		toggleBtn.classList.remove("bg-red-500", "hover:bg-red-600");
		toggleBtn.classList.add("bg-gray-400", "text-gray-700", "cursor-not-allowed","opacity-70");
	}
	else
	{
		toggleBtn.classList.remove("bg-gray-400", "text-gray-700", "cursor-not-allowed","opacity-70");
		toggleBtn.classList.add("bg-red-500", "hover:bg-red-600");
	}

  	toggleBtn.addEventListener("click", () => {
  	  	enabled = !enabled;
		/* Send information to the other user so he knows he has to switch the powerUp state */
		webSocketService.powerUpsSwitch(lobby.lobbyId, enabled);
		dataForGame.powerUpsEnabled = toggleBtn.classList.contains("ON") ? false : true;

		if(dataForGame.powerUpsEnabled){
			toggleBtn.classList.remove("bg-red-500", "hover:bg-red-600", "OFF");
			toggleBtn.classList.add("bg-green-500", "hover:bg-green-600", "ON");
		}
		else
		{
			toggleBtn.classList.remove("bg-green-500", "hover:bg-green-600", "ON");
			toggleBtn.classList.add("bg-red-500", "hover:bg-red-600", "OFF");
		}
	});


		powerUpsSelected.forEach((select, index) => {
			select.value = dataForGame.powerUps[index];
		});

		powerUpsSelected.forEach((select, index) => {
			select.addEventListener("change", () => {
				dataForGame.powerUps[index] = select.value;

				const selectedValues = dataForGame.powerUps.filter(v => v!== "")

				powerUpsSelected.forEach((otherSelect, otherIndex) => {
					if(otherIndex === index)
						return ;
					Array.from(otherSelect.options).forEach(option => {
						option.disabled = option.value !== "" && selectedValues.includes(option.value);
					});
				});
			});
		});

	const colorInput = document.getElementById("paddleColor") as HTMLInputElement
	colorInput.addEventListener("input", () => {
			dataForGame.paddleColor = colorInput.value;
	});

	/* 
			PowerUps Enabled
				TRUE
					Se dataForGame.powerUps.includes("") === True -> readyToPlay = false
					Se dataForGame.powerUps.includes("") === False -> readyToPlay = true
				FALSE
					readyToPlay = true 
	*/

	readyBtn.addEventListener("click", async () => {
		colorInput.value = dataForGame.paddleColor;
		dataForGame.powerUpsEnabled = toggleBtn.classList.contains("ON") ? true : false;

		let readyToPlay = true;
		
		if(dataForGame.powerUpsEnabled)
			dataForGame.powerUps.includes("") ? readyToPlay = false : readyToPlay = true;
				
		if(!readyToPlay)
			alert("Choose 3 PowerUps");
		else {
			const player = {
				powerUps: dataForGame.powerUps,
				paddleColor: dataForGame.paddleColor
			}
			const res = await fetch(`/api/lobby/${lobby.lobbyId}/settings`, {
				method: "POST",
				credentials: "include",
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ settings: player })
			});
			const response = await res.json();
			if(!response.success)
				console.log("Deu Merda");
			readyBtn.classList.remove("bg-red-500", "hover:bg-red-600");
			readyBtn.classList.add("bg-green-500", "hover:bg-green-600")
			webSocketService.ready(lobby.lobbyId);
		}
	});

	matchmakingBtn.addEventListener("click", async () => {
		const res = await fetch(`/api/lobby/${lobby.lobbyId}`, {
			method: "GET",
			credentials: "include",
		});
		const response = await res.json();
		const lobbyFromResponse = response.data;
		let emptyPowerUps;

		if(dataForGame.powerUpsEnabled)
			emptyPowerUps = lobbyFromResponse.player1Settings.powerUps.includes("") || lobbyFromResponse.player2Settings.powerUps.includes("");
		let readyToPlay = lobbyFromResponse.player1Ready && lobbyFromResponse.player2Ready;
		
		if(!readyToPlay)
			alert("Both players need to be ready");
		else if(emptyPowerUps && dataForGame.powerUpsEnabled)
			alert("Both Players need to have PowerUps Selected");
		else {
			webSocketService.start(dataForGame, lobby);
		}
	});
}

const app = document.getElementById("app")!;

export async function goToLobby(data: any = {}) {
	const { lobbyId } = data;
	
	const serverRes = await fetch("/api/me", {
		method: "GET",
		credentials: "include"
	});
	const serverResponse = await serverRes.json();
	webSocketService.connect(serverResponse.data.safeUser.id);

	if (lobbyId) {
		const res = await fetch(`/api/lobby/${lobbyId}`, {
			method: "GET",
			credentials: "include"
		});
		const response = await res.json();

		app.innerHTML = lobbyView();
		initLobby(response.data);
	}
}
