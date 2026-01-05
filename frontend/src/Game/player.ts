import * as BABYLON from "@babylonjs/core";
import { Playground, PowerUp, type powerUpContext} from "./import";
import { createPowerUp } from "./powerUps/powerUpFactory";

export interface playerData {
	playerId: number;
	name: string;
	matColor: BABYLON.Color3;
	handleColor: BABYLON.Color3;
	scene: BABYLON.Scene;
	startPos: number;
	isP1: boolean;
	selectedPowerUps: string[];
	isPowerUps: boolean;
}

export class Player {
	_id: number;
	_name: string;
	_isP1: boolean;
	_paddle: BABYLON.Mesh;
	_score: number;
	_startPosition: number;
	_paddleSpeed: number;
	_powerUps: PowerUp[] | null;
	_isShieldActive: boolean;

	constructor(data: playerData) {
		this._id = data.playerId;
		this._name = data.name;
		this._isP1 = data.isP1;
		this._score = 0;
		this._startPosition = data.startPos;
		this._paddleSpeed = 0.7;
		this._paddle = Playground.createPaddle(data.scene, this._startPosition, data.matColor, data.handleColor);
	
		if(data.isPowerUps)
			this._powerUps = data.selectedPowerUps.map(name => createPowerUp(name)).filter((p): p is PowerUp => p!== null);
		else
			this._powerUps = null;
		
		this._isShieldActive = false;
	}

	updatePowerUps() {
		if(this._powerUps)
			for(const pu of this._powerUps)
				pu.update();
	}

	activatePowerUp(index: number, powerUpContext: powerUpContext) {
		if(this._powerUps)
		{
			const powerUp = this._powerUps[index];
			if (!powerUp) 
				return ;
			console.log("O PowerUp que tentaste ativar esta", powerUp.isReady);
			
			powerUpContext.player = this;
			console.log(`🔥 Player ativou ${powerUp.name}`);
			powerUp.activate(powerUpContext);
		}
	}

}