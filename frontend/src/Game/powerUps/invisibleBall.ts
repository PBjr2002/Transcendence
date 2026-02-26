import { PowerUp} from './powerUp';
import type { powerUpContext } from "../script";

export class invisibleBall extends PowerUp {
	constructor () {
		super("invisibleBall", 30000, 1500);
	}

	activate (context: powerUpContext): void {
//		console.log("🤯 A Bola Bazou!! 🤯");

		if(!context.ball)
			return ;
		const ball = context.ball;

		ball._ball.isVisible = false;

		setTimeout(() => {
			ball._ball.isVisible = true;
		}, this.duration);
	
	}

	cancel() : void {
	}
}