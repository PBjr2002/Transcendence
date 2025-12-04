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

	// Verificar se troco isto ou nao, ele esta a deixar usar os powerUps sempre por isso isto esta a falhar, tenho ou de trocar isto e sempre que uso um powerUp ele mete a false e a true como fazia antes, ou entao fazer de uma forma diferente
	// The 2 Methods every Class needs to have
	abstract activate (context: powerUpContext): void;
	abstract cancel (context: powerUpContext): void;

}
