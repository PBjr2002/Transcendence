import type { DataForGame } from "./beforeGame";
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

export function applyPlayerBorderColors(data: any){
	const border = document.querySelector(".game-border") as HTMLElement;
	if(!border)
		return ;

	const p1Color = data.player1Settings.paddleColor;
	const p2Color = data.player2Settings.paddleColor;

	border.style.background = `
		linear-gradient(
		to right,
		${p1Color} 0%,
		${p1Color} 50%,
		${p2Color} 50%,
		${p2Color} 100%
		)
	`;

	border.style.boxShadow = `
	0 0 10px ${p1Color},
	0 0 20px ${p1Color},
	0 0 10px ${p2Color} inset
	`;
}

export function animateBorderGlow(data: any){
	const border = document.querySelector(".game-border") as HTMLElement;
	if(!border)
		return ;

	const p1Color = data.player1Settings.paddleColor;
	const p2Color = data.player2Settings.paddleColor;

	let grow = true;
	let intensity = 10;

	setInterval(() => {
		intensity += grow ? 2 : -2;

		if(intensity > 30)
			grow = false;
		if(intensity < 10)
			grow = true;

		border.style.boxShadow = `
      	0 0 ${intensity}px ${p1Color},
      	0 0 ${intensity * 2}px ${p1Color},
     	0 0 ${intensity}px ${p2Color} inset
    `;
	}, 80);
}

export async function loadGame(dataForGame: DataForGame, lobby : any, remote : boolean, rejoin: boolean){

	const app = document.getElementById("app");
	if (!app) 
		return;

	const player1Req = await fetch(`/api/users/gameScreen/${lobby.playerId1}`, { credentials: 'include' });
	const player1Res = await player1Req.json();

	dataForGame.p1ApiData = player1Res;

	let player2Req = null;
	let player2Res = null;

	if(lobby.playerId2 !== -42)
	{
		player2Req = await fetch(`/api/users/gameScreen/${lobby.playerId2}`, { credentials: 'include' })
		player2Res = await player2Req.json();
		dataForGame.p2ApiData = player2Res;
	}

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
			projectName.innerHTML = "Hockey Pong";

			const projectNameImg = document.createElement("img");
			projectNameImg.className = "w-32 h-32";
			projectNameImg.src = "profile_pictures/favicon.svg";

		leftDiv.appendChild(projectName);
		leftDiv.appendChild(projectNameImg);

			// Middle Div
		const middleDiv = document.createElement("div");
		middleDiv.className = "flex items-center justify-center gap-8";
				
			const player1Div = document.createElement("div");
			player1Div.className = "flex flex-col items-center gap-2";

				const imgP1 = document.createElement("img");
				imgP1.className = "w-20 h-20 rounded-full";
				imgP1.id = "p1ProfilePic";
				imgP1.src = "profile_pictures/" + player1Res.data.profile_picture || "profile_pictures/default.jpg";

				const nameP1 = document.createElement("h2");
				nameP1.className = "text-2xl font-bold p1Name";
				nameP1.innerHTML = player1Res.data.name || "Player 1";

				const scoreP1 = document.createElement("span");
				scoreP1.className = "text-4xl font-bold";
				scoreP1.id = "P1Score";
				scoreP1.innerHTML = "0";

				const winRatioP1 = document.createElement("div");
				winRatioP1.className = "text-sm";
				if(player1Res.data.wins === 0 && player1Res.data.defeats === 0)
					winRatioP1.innerHTML = "First Game!!";
				else
					winRatioP1.innerHTML = player1Res.data ? `Win Ratio: ${Number(player1Res.data.win_ratio).toFixed(2)}% [${player1Res.data.wins} W ${player1Res.data.defeats} L]` : "Win Ratio"

				const flagP1 = document.createElement("img");
				flagP1.className = "w-10 h-6 object-contain";
				flagP1.src = player1Res.data.country ? "profile_pictures/" + player1Res.data.country : "profile_pictures/defaultFlag.jpg"

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
				imgP2.src = player2Res ? "profile_pictures/" + player2Res.data.profile_picture : "profile_pictures/default.jpg";

				const nameP2 = document.createElement("h2");
				nameP2.className = "text-2xl font-bold p2Name";
				nameP2.innerHTML = player2Res ? player2Res.data.name : "Player 2";

				const scoreP2 = document.createElement("span");
				scoreP2.className = "text-4xl font-bold";
				scoreP2.id = "P2Score";
				scoreP2.innerHTML = "0";

				const winRatioP2 = document.createElement("div");
				winRatioP2.className = "text-sm";
				if(player2Res.data.wins === 0 && player2Res.data.defeats === 0)
					winRatioP2.innerHTML = "First Game!!";
				else
					winRatioP2.innerHTML = player2Res.data ? `Win Ratio: ${Number(player2Res.data.win_ratio).toFixed(2)}% [${player2Res.data.wins} W ${player2Res.data.defeats} L]` : "Win Ratio"

				const flagP2 = document.createElement("img");
				flagP2.className = "w-10 h-6";
				flagP2.src = player2Res.data.country ? "profile_pictures/" + player2Res.data.country : "profile_pictures/defaultFlag.jpg";

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
			playerProfileImg.src = "profile_pictures/favicon.svg";

			const backButton = document.createElement("button");
			backButton.className = "px-6 py-3 bg-blue-500 hover:bg-blue-400 rounded-xl text-2xl text-white font-semibold shadow-md transition"
			backButton.innerHTML = "Home";
			backButton.id = "btn-home";

		/* rightDiv.appendChild(playerProfile); */
		rightDiv.appendChild(backButton);
		rightDiv.appendChild(playerProfileImg);
	

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
		bottomDiv.className = "w-full grid items-center py-6 flex-none overflow-hidden";

			const iconLeft = document.createElement("img");

			const gameControls = document.createElement("div");
			gameControls.className = "flex items-center justify-center gap-12 bg-black/40 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg mx-auto max-w-[500px]";

				const resume = document.createElement("button");
				resume.className = "px-6 py-3 bg-green-600 hover:bg-green-500 rounded-xl text-2xl font-semibold shadow-md transition";
				resume.id = "btn-resume";
				resume.innerHTML = "Resume";
				resume.hidden = true;

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

	startGame(dataForGame, lobby, remote, rejoin);
}