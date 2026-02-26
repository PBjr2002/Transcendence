import type { powerUpContext } from '../script';
import { PowerUp} from './powerUp';

export class shrinkBall extends PowerUp {
	constructor () {
		super("shrinkBall", 15000, 4000);
	}

	activate (context: powerUpContext): void {
		if(!context.ball)
			return ;

//		console.log("🔽 Bola encolheu!");
		const ball = context.ball;

		if(!ball._ballOriginalSize)
			ball._ballOriginalSize = ball._ball.scaling.clone();
		
		ball._ball.scaling = ball._ballOriginalSize.clone().scale(0.75);
	}

	cancel (context: powerUpContext): void {
		if(!context.ball)
			return ;

		const ball = context.ball;

		if(ball._ballOriginalSize)
			ball._ball.scaling = ball._ballOriginalSize.clone();
	}
}