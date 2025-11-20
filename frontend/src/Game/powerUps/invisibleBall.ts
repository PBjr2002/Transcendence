import { PowerUp} from './powerUp';

export class invisibleBall extends PowerUp {
	constructor () {
		super("invisibleBall", 30000, 1500);
	}

	activate (context: any): void {
		console.log("🤯 A Bola Bazou!! 🤯");

		if(!context.ball)
			return ;
		const ball = context.ball;

		ball._ball.isVisible = false;

		this.setDuration(() => {
			ball._ball.isVisible = true;
		});
	
		this.setCooldown();
	}

	cancel() : void {
		this.clearTimeout();
	}
}