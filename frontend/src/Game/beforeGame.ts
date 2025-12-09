export function loadBeforeGame(){

	const app = document.getElementById("app");
	if (!app) 
		return;
	app.innerHTML = "";

	const header = document.createElement("header");
	header.className = "w-full grid grid-cols-3 items-center py-6";
		
		//Player 1 Div
		const player1Div = document.createElement("div");
		player1Div.className = "flex flex-col items-center gap-2 border-4";

			const imgP1 = document.createElement("img");
			imgP1.className = "w-20 h-20 rounded-full";
			imgP1.src = "p1.jpg"; // Change to get it from the database

			const nameP1 = document.createElement("h2");
			nameP1.className = "text-2xl font-bold";
			nameP1.innerHTML = "Player 1"; // Change to get it from the database

			const scoreP1 = document.createElement("span");
			scoreP1.className = "text-4xl font-bold";
			scoreP1.innerHTML = "0";

			const winRatioP1 = document.createElement("div");
			winRatioP1.className = "text-sm";
			winRatioP1.innerHTML = "Win Ratio" // Change to get it from the database

			const flagP1 = document.createElement("img");
			flagP1.className = "w-10 h-6";
			flagP1.src = "flag1.jpg" // Change to get it from the database

		player1Div.appendChild(imgP1);
		player1Div.appendChild(nameP1);
		player1Div.appendChild(scoreP1);
		player1Div.appendChild(winRatioP1);
		player1Div.appendChild(flagP1);
		//

		// VS Div
		const vsDiv = document.createElement("div");
		vsDiv.className = "text-center border-4";

			const h1Vs = document.createElement("h2");
			h1Vs.className = "text-6xl font-extrabold";
			h1Vs.innerHTML = "VS";
		vsDiv.append(h1Vs);
		//

		// Player 2 Div
		const player2Div = document.createElement("div");
		player2Div.className = "flex flex-col items-center gap-2 border-4";

			const img2 = document.createElement("img");
			img2.className = "w-20 h-20 rounded-full";
			img2.src = "p2.jpg"; // Change to get it from the database

			const name2 = document.createElement("h2");
			name2.className = "text-2xl font-bold";
			name2.innerHTML = "Player 2"; // Change to get it from the database

			const score2 = document.createElement("span");
			score2.className = "text-4xl font-bold";
			score2.innerHTML = "0";

			const winRatio2 = document.createElement("div");
			winRatio2.className = "text-sm";
			winRatio2.innerHTML = "Win Ratio" // Change to get it from the database

			const flag2 = document.createElement("img");
			flag2.className = "w-10 h-6";
			flag2.src = "flag1.jpg" // Change to get it from the database

		player2Div.appendChild(img2);
		player2Div.appendChild(name2);
		player2Div.appendChild(score2);
		player2Div.appendChild(winRatio2);
		player2Div.appendChild(flag2);
		//


		header.appendChild(player1Div);
		header.appendChild(vsDiv);
		header.appendChild(player2Div);

	app.appendChild(header);

		const main = document.createElement("main");
		main.className = "flex flex-1 border-4";

			const leftAside = document.createElement("aside");
			leftAside.className = "w-64 flex flex-col items-center gap-6 p-6 ";
			
				const projectName = document.createElement("h2");
				projectName.className = "text-4xl font-bold";
				projectName.innerHTML = "Project Name";

				const projectNameImg = document.createElement("img");
				projectNameImg.className = "w-32 h-32";
				projectNameImg.src = "icon.png";

				const p1PowerUps = document.createElement("h3");
				p1PowerUps.className = "text-2xl font-bold";
				p1PowerUps.innerHTML = "P1 PowerUps";

				const powerUpsDiv = document.createElement("div");
				powerUpsDiv.className = "flex flex-col gap-4";

					const pu1 = document.createElement("div");
					pu1.className = "w-20 h-20 bg-gray-700 rounded";
					const pu2 = document.createElement("div");
					pu2.className = "w-20 h-20 bg-gray-700 rounded";
					const pu3 = document.createElement("div");
					pu3.className = "w-20 h-20 bg-gray-700 rounded";
				powerUpsDiv.appendChild(pu1);
				powerUpsDiv.appendChild(pu2);
				powerUpsDiv.appendChild(pu3);

			leftAside.appendChild(projectName);
			leftAside.appendChild(projectNameImg);
			leftAside.appendChild(p1PowerUps);
			leftAside.appendChild(powerUpsDiv);
		
		main.appendChild(leftAside);

			const gameSection = document.createElement("section");
			gameSection.className = "flex-1 flex items-center justify-center border-4";

				const canvas = document.createElement("canvas");
				canvas.id = "renderCanvas";
				canvas.className = "w-full h-full";
			gameSection.appendChild(canvas);
		
		main.appendChild(gameSection);

		const rightAside = document.createElement("aside");
			rightAside.className = "w-64 flex flex-col items-center gap-6 p-6 border-4";
			
				const playerProfile = document.createElement("h2");
				playerProfile.className = "text-4xl font-bold";
				playerProfile.innerHTML = "Player Profile";

				const playerProfileImg = document.createElement("img");
				playerProfileImg.className = "w-32 h-32";
				playerProfileImg.src = "icon.png";

				const p2PowerUps = document.createElement("h3");
				p2PowerUps.className = "text-2xl font-bold";
				p2PowerUps.innerHTML = "P2 PowerUps";

				const powerUpsDivP2 = document.createElement("div");
				powerUpsDivP2.className = "flex flex-col gap-4";

					const P2pu1 = document.createElement("div");
					P2pu1.className = "w-20 h-20 bg-gray-700 rounded";
					const P2pu2 = document.createElement("div");
					P2pu2.className = "w-20 h-20 bg-gray-700 rounded";
					const P2pu3 = document.createElement("div");
					P2pu3.className = "w-20 h-20 bg-gray-700 rounded";
				powerUpsDivP2.appendChild(P2pu1);
				powerUpsDivP2.appendChild(P2pu2);
				powerUpsDivP2.appendChild(P2pu3);

			rightAside.appendChild(playerProfile);
			rightAside.appendChild(playerProfileImg);
			rightAside.appendChild(p2PowerUps);
			rightAside.appendChild(powerUpsDivP2);
		
		main.appendChild(rightAside);
	
	app.appendChild(main);

		const footer = document.createElement("footer");
		footer.className = "w-full flex items-center justify-center gap-16 py-6 bg-gray-800 border-4"

			const timer = document.createElement("div");
			timer.className = "text-center";

				const text = document.createElement("div");
				text.innerHTML = "Timer";

				const time = document.createElement("div");
				time.innerHTML = "00:00"; //Change it with a function later
			timer.appendChild(text);
			timer.appendChild(time);
		
		footer.appendChild(timer);

			const resume = document.createElement("button");
			resume.className = "px-6 py-3 bg-green-600 rounded-xl text-2xl";
			resume.innerHTML = "Resume";

			const pause = document.createElement("button");
			pause.className = "px-6 py-3 bg-yellow-600 rounded-xl text-2xl";
			pause.innerHTML = "Pause";

			const musicOffOn = document.createElement("button");
			musicOffOn.className = "px-6 py-3 bg-blue-600 rounded-xl text-xl";
			musicOffOn.innerHTML = "Music On/Off";

		footer.appendChild(resume);
		footer.appendChild(pause);
		footer.appendChild(musicOffOn);
	
	app.appendChild(footer);



}