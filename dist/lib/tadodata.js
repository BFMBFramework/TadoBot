"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TadoData {
    setTadoMeData(homes) {
        this._me = new TadoMe(homes);
    }
    get me() {
        return this._me;
    }
}
exports.TadoData = TadoData;
class TadoMe {
    constructor(homes) {
        this._homes = homes.map(function (value, index, array) {
            return new TadoHome(value.id, value.name);
        });
    }
    get homes() {
        return this._homes;
    }
}
exports.TadoMe = TadoMe;
class TadoHome {
    constructor(id, name, zones = []) {
        this._id = id;
        this._name = name;
        this._zones = zones;
    }
    get id() {
        return this._id;
    }
    get name() {
        return this._name;
    }
    get zones() {
        return this._zones;
    }
    setZonesData(zones) {
        this._zones = zones.map(function (value, index, array) {
            return new TadoZone(value.id, value.name);
        });
    }
}
exports.TadoHome = TadoHome;
class TadoZone {
    constructor(id, name) {
        this._id = id;
        this._name = name;
    }
    get id() {
        return this._id;
    }
    get name() {
        return this._name;
    }
}
exports.TadoZone = TadoZone;
