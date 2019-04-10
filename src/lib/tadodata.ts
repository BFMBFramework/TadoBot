export class TadoData {
	private _me: TadoMe;

	setTadoMeData(homes: any[]) {
		this._me = new TadoMe(homes);
	}

	get me(): TadoMe {
		return this._me;
	}
}

export class TadoMe {
	private _homes: TadoHome[];

	constructor(homes: any[]) {
		this._homes = homes.map(function(value: any, index: number, array: any[]): TadoHome {
			return new TadoHome(value.id, value.name);
		});
	}

	get homes(): TadoHome[] {
		return this._homes;
	}
}

export class TadoHome {
	private _id: string;
	private _name: string;
	private _zones: TadoZone[];

	constructor(id: string, name: string, zones: TadoZone[] = []) {
		this._id = id;
		this._name = name;
		this._zones = zones;
	}

	get id(): string {
		return this._id;
	}

	get name(): string {
		return this._name;
	}

	get zones(): TadoZone[] {
		return this._zones;
	}

	setZonesData(zones: any[]) {
		this._zones = zones.map(function(value: any, index: number, array: any[]): TadoZone {
			return new TadoZone(value.id, value.name);
		});
	}
}

export class TadoZone {
	private _id: string;
	private _name: string;

	constructor(id: string, name: string) {
		this._id = id;
		this._name = name;
	}

	get id(): string {
		return this._id;
	}

	get name(): string {
		return this._name;
	}
}