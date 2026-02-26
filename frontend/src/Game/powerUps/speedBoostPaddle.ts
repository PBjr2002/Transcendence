import { PowerUp} from './powerUp';
import type { powerUpContext } from '../script';

export class speedBoostPaddle extends PowerUp {
	constructor () {
		super("speedBoostPaddle", 15000, 3000);
	}

	activate (context: powerUpContext): void {
//		console.log("⚡ Paddle Goes FAST! ⚡");

		if(!context.player)
			return ;
		const player = context.player;

		player._paddleSpeed *= 2;

		setTimeout(() => {
			context.player._paddleSpeed /= 2;
		}, this.duration);
	}

	cancel() : void {
		
	}
}