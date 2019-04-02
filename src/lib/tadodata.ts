export class TadoData {
	private me: TadoMe;

	set tadoMeData(homes: any[]) {
		this.me = new TadoMe(homes);
	}

	get tadoMe(): TadoMe {
		return this.me;
	}
}

export class TadoMe {
	private homes: TadoHome[];

	constructor(homes: any[]) {
		this.homes = homes.map(function(value: any, index: number, array: any[]): TadoHome {
			return new TadoHome(value.id, value.name);
		});
	}

	get myHomes(): TadoHome[] {
		return this.homes;
	}
}

export class TadoHome {
	private id: string;
	private name: string;

	constructor(id: string, name: string) {
		this.id = id;
		this.name = name;
	}

	get homeId(): string {
		return this.id;
	}

	get homeName(): string {
		return this.name;
	}
}