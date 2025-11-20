import { PowerUp} from './powerUp';

export class speedBoostPaddle extends PowerUp {
	constructor () {
		super("speedBoostPaddle", 15000, 3000);
	}

	activate (context: any): void {
		console.log("⚡ Paddle Goes FAST! ⚡");

		if(!context.player)
			return ;
		const player = context.player;

		player._paddleSpeed *= 2;

		this.setDuration(() => {
			player._paddleSpeed /= 2;
		});

		this.setCooldown();
	}

	cancel() : void {
		this.clearTimeout();
	}
}