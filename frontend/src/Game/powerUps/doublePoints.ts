import { PowerUp} from './powerUp';
import { gameState } from '../script.ts';

export class doublePoints extends PowerUp {
	constructor () {
		super("doublePoints", 360000, 3000);
	}

	activate (context: any): void {
		context = null;
		console.log("🤯 Duplicacao de Pontos!!!! 🤯");
		gameState.points *= 2;

		this.setDuration(() =>{
			gameState.points /= 2;
		})
		this.setCooldown();
	}

	cancel() : void {
		this.clearTimeout();
	}
}