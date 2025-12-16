import * as BABYLON from "@babylonjs/core";
import { Playground, PowerUp, type powerUpContext, shrinkBall, doublePoints, invisibleBall} from "./import";

export class Player {
	_name: string;
	_isP1: boolean;
	_paddle: BABYLON.Mesh;
	_score: number;
	_startPosition: number;
	_paddleSpeed: number;
	_powerUps: PowerUp[];
	_isShieldActive: boolean;
	//_paddleSkin: void;

	constructor(name: string, matColor: BABYLON.Color3, handleColor: BABYLON.Color3, scene: BABYLON.Scene, startPos: number, isP1: boolean) {
		this._name = name;
		this._isP1 = isP1;
		this._score = 0;
		this._startPosition = startPos;
		this._paddleSpeed = 0.7;
		this._paddle = Playground.createPaddle(scene, this._startPosition, matColor, handleColor);
		//this._paddleSkin = BABYLON.SceneLoader.ImportMesh("", "/blender/", "paddle.glb", scene);
	
		this._powerUps = [
			new doublePoints(),
			new shrinkBall(),
			new invisibleBall(),
		];
		this._isShieldActive = false;
	}

	updatePowerUps() {
		for(const pu of this._powerUps)
			pu.update();
	}

	activatePowerUp(index: number, powerUpContext: powerUpContext) {
		const powerUp = this._powerUps[index];
		if (!powerUp) 
			return ;
		console.log("O PowerUp que tentaste ativar esta", powerUp.isReady);
		if (!powerUp.isReady) {
			// Vai ser visto no HUD dos PowerUps
			return ;
		}
		powerUpContext.player = this;
		console.log(`🔥 Player ativou ${powerUp.name}`);
		powerUp.activate(powerUpContext);
	}

}