import { PowerUp} from './powerUp.ts';
import { gameState } from '../script.ts';

export class doublePoints extends PowerUp {
	constructor () {
		super("doublePoints", 360000, 3000);
	}

	activate (): void {
//		console.log("🤯 Duplicacao de Pontos!!!! 🤯");
		gameState.points *= 2;

		setTimeout(() =>{
			gameState.points /= 2;
		}, this.duration)
	}

	cancel() : void {
		
	}
}