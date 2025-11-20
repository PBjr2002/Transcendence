import { PowerUp} from './powerUp';

export class speedBoostBall extends PowerUp {
	constructor () {
		super("speedBoostBall", 15000, 4000);
	}

	activate (context: any): void {
		console.log("⚡ Bola Goes FAST! ⚡");

		if(!context.ball)
			return ;
		const ball = context.ball;

		ball._ballVelocity.x *= 1.5;
		ball._ballVelocity.z *= 1.5;
		ball._ballMaxSpeed *= 1.5;

		this.setDuration(() => {
			ball._ballVelocity.x /= 1.5;
			ball._ballVelocity.z /= 1.5;
			ball._ballMaxSpeed /= 1.5;
		});

		this.setCooldown();
	}

	cancel(): void {
		this.clearTimeout();
	}
}