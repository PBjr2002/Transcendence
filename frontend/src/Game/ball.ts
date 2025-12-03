import * as BABYLON from "@babylonjs/core";
export class Ball {
	_ball: BABYLON.Mesh;
	_ballMat: BABYLON.StandardMaterial;
	_ballVelocity: BABYLON.Vector3;
	_ballOriginalSize: BABYLON.Vector3;
	_ballMaxSpeed: number;
	_maxBounceAngle: number;
	_initialSpeed: number;
	_restituiton: number;
	_paddleImpulseFactor: number;


	constructor(scene: BABYLON.Scene){
		this._ball = BABYLON.MeshBuilder.CreateCylinder("sphere", { diameter: 4, height: 1 }, scene);
		this._ballMat = new BABYLON.StandardMaterial("Mat", scene);
		this._ballVelocity = new BABYLON.Vector3(0,0,0);
		this._ballOriginalSize = this._ball.scaling.clone();
		this._ballMaxSpeed = 80;
		this._maxBounceAngle = (50 * Math.PI)/ 180;
		this._initialSpeed = 30;
		this._restituiton = 1.15;
		this._paddleImpulseFactor = 0.25;
	}

	positionBall(): void {
		this._ball.position.y = 0.42;
		this._ballMat.diffuseColor = new BABYLON.Color3(0.2314, 0.2157, 0.2157);
		this._ball.material = this._ballMat;
	}

}