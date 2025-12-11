import { startGame } from "./script";

export function loadGame(){

	const app = document.getElementById("app");
	if (!app) 
		return;
	app.innerHTML = "";
	app.className = "h-screen flex flex-col overflow-hidden";
	
	

}