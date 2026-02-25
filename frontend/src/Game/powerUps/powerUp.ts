import type { powerUpContext } from "../script";

export abstract class PowerUp {
	cooldown: number;
	duration: number;
	name: string;
	lastUsed: number;
	isReady: boolean = true;
	protected timeoutId: any = null;

	constructor (name: string, cooldown: number, duration: number) {
		this.name = name;
		this.cooldown = cooldown;
		this.duration = duration;
		this.lastUsed = -Infinity;
	}

	use(context: powerUpContext) {
		if(!this.isReady)
			return ;
		this.isReady = false;
		this.lastUsed = performance.now();
		this.activate(context);
	}

	update() {
		if(!this.isReady)
		{
			const elapsed = performance.now() - this.lastUsed;
			if(elapsed >= this.cooldown)
				this.isReady = true;
		}
	}

	// The 2 Methods every Class needs to have
	abstract activate (context: powerUpContext): void;
	abstract cancel (context: powerUpContext): void;

}
