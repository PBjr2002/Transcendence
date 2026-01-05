import type { dataForGame } from "./beforeGame";
import { startGame } from "./script";

/*

	Dados dinamicos:
		Nome dos Players
		Imagens dos 2 Players
		Win Ratio
		Flag Image
		
		Os 3 PowerUps de cada Jogador
		Cores da Paddle

*/

export function createGameClock(element: HTMLElement)
{
	let seconds = 0;
	let intervalId: number | null = null;

	function render() {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		element.innerHTML = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
	}

	return {
		start() {
			if(intervalId !== null)
				return ;
			intervalId = window.setInterval(() => {
				seconds++;
				render();
			}, 1000);
		},
		pause() {
			if(intervalId === null)
				return ;
			clearInterval(intervalId);
			intervalId = null;
		},
		reset() {
			seconds = 0;
			render();
		},
		getTime() {
			return seconds;
		}
	};
}

export async function loadGame(dataForGame: dataForGame, lobby : any){

	const app = document.getElementById("app");
	if (!app) 
		return;
	
	/* const lobbyResult = await fetch('/api/lobby');
	if(lobbyResult.ok)
	{
		const lobbyData = await lobbyResult.json();
		console.log(lobbyData);

		// Ver qual o ID do Lobby
		// Ir buscar os dados do segundo jogador para dar load
		// load dos dados abaixo
		
		/*
				Dados Necessarios
			Nome do jogador
			Win Ratio
			Country
			Profile Picture

			Paddle Color
			Powers Ups = Array (3)
		/*
		
	}
	*/

	const result = await fetch('/api/users/gameScreen', { credentials: 'include' });
	if(result.ok)
	{
		const playerData = await result.json();

		dataForGame.p1ApiData = playerData;

	/* TODO
		Preciso de ir buscar os dados do outro Player
		Esta a ser martelado atualmente, no futuro tem de vir por id ou por name
	*/
	
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
					imgP1.src = /* playerData.data.profile_picture || */ "icons/default.jpg"; // Change to get it from the database

					const nameP1 = document.createElement("h2");
					nameP1.className = "text-2xl font-bold p1Name";
					nameP1.innerHTML = playerData.data.name || "Player 1"; // Change to get it from the database

					const scoreP1 = document.createElement("span");
					scoreP1.className = "text-4xl font-bold";
					scoreP1.id = "P1Score";
					scoreP1.innerHTML = "0";

					const winRatioP1 = document.createElement("div");
					winRatioP1.className = "text-sm";
					winRatioP1.innerHTML = playerData.data ? `Win Ratio: ${playerData.data.wins / (playerData.data.wins + playerData.data.defeats) * 100}` : "Win Ratio" // Change to get it from the database

					const flagP1 = document.createElement("img");
					flagP1.className = "w-10 h-6 object-contain";
					flagP1.src = playerData.data.country || "icons/defaultFlag.jpg" // Change to get it from the database

				player1Div.appendChild(imgP1);
				player1Div.appendChild(nameP1);
				player1Div.appendChild(scoreP1);
				player1Div.appendChild(winRatioP1);
				player1Div.appendChild(flagP1);

				const VSDiv = document.createElement("div");
				VSDiv.className = "text-center text-6xl font-extrabold";
				VSDiv.innerHTML = "VS";

				let player2 = null;
				let p2result = null;

				if(lobby.playerId2 !== -42)
				{
					player2 = await fetch(`/api/users/id/${lobby.data.playerId2}`, { credentials: 'include' })
					p2result = await player2.json();
					dataForGame.p2ApiData = p2result;
				}

				const player2Div = document.createElement("div");
				player2Div.className = "flex flex-col items-center gap-2";

					const imgP2 = document.createElement("img");
					imgP2.className = "w-20 h-20 rounded-full";
					imgP2.src = p2result ? p2result.data.profile_picture : "p2.jpg"; // Change to get it from the database

					const nameP2 = document.createElement("h2");
					nameP2.className = "text-2xl font-bold p2Name";
					nameP2.innerHTML = p2result ? p2result.data.name : "Player 2"; // Change to get it from the database

					const scoreP2 = document.createElement("span");
					scoreP2.className = "text-4xl font-bold";
					scoreP2.id = "P2Score";
					scoreP2.innerHTML = "0";

					const winRatioP2 = document.createElement("div");
					winRatioP2.className = "text-sm";
					winRatioP2.innerHTML = p2result ? `Win Ratio: ${p2result.data.wins / (p2result.data.wins + p2result.data.defeats) * 100}` : "Win Ratio" // Change to get it from the database

					const flagP2 = document.createElement("img");
					flagP2.className = "w-10 h-6";
					flagP2.src = p2result ? p2result.data.country : "icons/defaultFlag.jpg"; // Change to get it from the database

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

				/* 
					const playerProfile = document.createElement("h2");
					playerProfile.className = "text-4xl font-bold";
					playerProfile.innerHTML = "Player Profile"; 
				*/
						
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
				gameSection.className = "flex-1 flex items-center justify-center box-border overflow-hidden";

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

					const timer = document.createElement("div");
					timer.className = "text-center w-20";

						const text = document.createElement("div");
						text.className = "text-xl opacity-80";
						text.innerHTML = "Timer";

						const time = document.createElement("div");
						time.className = "text-4xl font-bold font-mono";
						time.id = "timer";
						time.innerHTML = "00:00";

					timer.appendChild(text);
					timer.appendChild(time);

					const resume = document.createElement("button");
					resume.className = "px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-2xl font-semibold shadow-md transition";
					resume.id = "btn-resume";
					resume.innerHTML = "Resume";

					const pause = document.createElement("button");
					pause.className = "px-6 py-3 bg-yellow-500 hover:bg-yellow-400 rounded-xl text-2xl font-semibold shadow-md transition";
					pause.id = "btn-pause";
					pause.innerHTML = "Pause";

				gameControls.appendChild(resume);
				gameControls.appendChild(timer);
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

		startGame(dataForGame, lobby);
	}
}