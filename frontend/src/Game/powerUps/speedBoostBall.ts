import { PowerUp} from './powerUp';
import type { powerUpContext } from '../script';

export class speedBoostBall extends PowerUp {
	constructor () {
		super("speedBoostBall", 15000, 4000);
	}

	activate (context: powerUpContext): void {
		console.log("⚡ Bola Goes FAST! ⚡");

		if(!context.ball)
			return ;
		const ball = context.ball;

		ball._ballVelocity.x *= 1.5;
		ball._ballVelocity.z *= 1.5;
		ball._ballMaxSpeed *= 1.5;

		setTimeout(() =>{
			ball._ballVelocity.x /= 1.5;
			ball._ballVelocity.z /= 1.5;
			ball._ballMaxSpeed /= 1.5;
		}, this.duration)
	}

	cancel(): void {
		
	}
}