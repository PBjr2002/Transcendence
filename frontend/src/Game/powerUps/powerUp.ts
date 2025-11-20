export abstract class PowerUp {
	canUse: boolean = true;
	cooldown: number;
	duration: number;
	name: string;
	protected timeoutId: any = null;

	constructor (name: string, cooldown: number, duration: number) {
		this.name = name;
		this.cooldown = cooldown;
		this.duration = duration;
	}

	// The 2 Methods every Class needs to have
	abstract activate (context: any): void;
	abstract cancel (context: any): void;

	// Cooldown function, you cant use it before the cooldown finishes
	protected setCooldown() {
		this.canUse = false;
		setTimeout(() => this.canUse = true, this.cooldown);
	}
	// Duration function, how long the power up lasts
	protected setDuration(callback: () => void) {
		this.timeoutId = setTimeout(callback, this.duration);
	}

	clearTimeout() {
		if(this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}
	}
}
