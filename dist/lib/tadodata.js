"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class TadoData {
    set tadoMeData(homes) {
        this.me = new TadoMe(homes);
    }
    get tadoMe() {
        return this.me;
    }
}
exports.TadoData = TadoData;
class TadoMe {
    constructor(homes) {
        this.homes = homes.map(function (value, index, array) {
            return new TadoHome(value.id, value.name);
        });
    }
    get myHomes() {
        return this.homes;
    }
}
exports.TadoMe = TadoMe;
class TadoHome {
    constructor(id, name) {
        this.id = id;
        this.name = name;
    }
    get homeId() {
        return this.id;
    }
    get homeName() {
        return this.name;
    }
}
exports.TadoHome = TadoHome;
