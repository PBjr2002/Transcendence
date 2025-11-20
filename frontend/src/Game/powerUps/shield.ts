import { PowerUp} from './powerUp';
import * as BABYLON from "@babylonjs/core";

export class shield extends PowerUp {
	constructor () {
		super("shield", 60000, 3000);
	}

	activate (context: any): void {
		console.log("🛡️ Shield Ativo! 🛡️");

		console.log(context.player);
		if(!context.player)
			return ;
		const player = context.player;
		if(!context.table)
			return ;
		const table = context.table;
		
		if(!context.scene)
			return ;
		const scene = context.scene;
		player._isShieldActive = true;

		let shieldGoal: BABYLON.Mesh = BABYLON.MeshBuilder.CreateBox("Shield", {height: 4.5, width: table._Dimensions.tableDepth, depth: 0.1, faceColors: Array(6).fill(new BABYLON.Color4(0,0,0,0))}, scene);
		shieldGoal.rotation = new BABYLON.Vector3(0, 1.56, 0);
		shieldGoal.position.x = player._isP1 ? table._leftGoal.position.x - 2.5 : table._rightGoal.position.x;
		
		this.setDuration(() => {
			shieldGoal.dispose();
			player._isShieldActive = false;
		});

		this.setCooldown();
	}

	cancel (): void {
		this.clearTimeout();
	}
}