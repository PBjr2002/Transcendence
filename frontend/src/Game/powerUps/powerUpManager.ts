import type { powerUpContext } from "../script";
import { doublePoints } from "./doublePoints";
import { invisibleBall } from "./invisibleBall";
import { PowerUp} from "./powerUp";
import { shield } from "./shield";
import { shrinkBall } from "./shrinkBall";
import { speedBoostBall } from "./speedBoostBall";
import { speedBoostPaddle } from "./speedBoostPaddle";

export class powerUpManager {
	powerUps: Record<string, PowerUp>;

	constructor() {
		this.powerUps = {
			shrinkBall: new shrinkBall(),
			speedBoostBall: new speedBoostBall(),
			speedBoostPaddle: new speedBoostPaddle(),
			invisibleBall: new invisibleBall(),
			doublePoints: new doublePoints(),
			shield: new shield(),
		};
	}

	activate(name: string, context: powerUpContext) {
		const powerUp = this.powerUps[name];
		if(powerUp && powerUp.isReady)
			powerUp.activate(context);
	}

	cancelAll(context: powerUpContext){
		for(const key in this.powerUps)
			this.powerUps[key].cancel(context);
	}

	

}
