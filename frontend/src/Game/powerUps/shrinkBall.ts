import { PowerUp} from './powerUp';

export class shrinkBall extends PowerUp {
	constructor () {
		super("shrinkBall", 15000, 4000);
	}

	activate (context: any): void {
		console.log("🔽 Bola encolheu!");

		if(!context.ball)
			return ;
		const ball = context.ball;

		if(!ball._ballOriginalSize)
			ball._ballOriginalSize = ball._ball.scaling.clone();
		
		ball._ball.scaling = ball._ballOriginalSize.clone().scale(0.75);
		
		this.setDuration(() => {
			ball._ball.scaling = ball._ballOriginalSize.clone();
		});

		this.setCooldown();
	}

	cancel (context: any): void {
		this.clearTimeout();
		if(context.ball)
		{
			const ball = context.ball._ball;
			if((ball as any)._ballOriginalSize)
				ball.scaling = (ball as any)._ballOriginalSize.clone();
		}
	}
}