import { doublePoints } from "./doublePoints";
import { invisibleBall } from "./invisibleBall";
import { PowerUp} from "./powerUp";
/* import { shield } from "./shield"; */
import { shrinkBall } from "./shrinkBall";
import { speedBoostBall } from "./speedBoostBall";
import { speedBoostPaddle } from "./speedBoostPaddle";

type powerUpConstructor = new () => PowerUp;

const powerUpRegistery: Record<string, powerUpConstructor> = {
	doublePoints,
	invisibleBall,
	/* shield, */
	shrinkBall,
	speedBoostBall,
	speedBoostPaddle,
};

export function createPowerUp(name: string): PowerUp | null {
	const powerUpClass = powerUpRegistery[name];
	if(!powerUpClass)
		return null;
	return new powerUpClass();
}