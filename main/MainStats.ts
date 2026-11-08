import MainScene from "../CodeLuna";

export default class MainStats {
    private lunestone: number;
    private cosmoriteGas: number;

    private energyUsePerMs: number = 0;

    constructor(lunestone: number = 0, cosmoriteGas: number = 0) {
        this.lunestone = lunestone;
        this.cosmoriteGas = cosmoriteGas;

    }

    getEnergyUseMs() {
        return this.energyUsePerMs
    }
    deltaDrainGas(delta:number) {
        this.incGas(-delta*this.energyUsePerMs);
    }
    drainGas(amt: number) {
        this.incGas(-amt)
    }

    getGas() {
        return this.cosmoriteGas;
    }
    getLunestone() {
        return this.lunestone;
    }
    getCosmorite() {
        return this.cosmoriteGas;
    }

    incGas(amt: number) {
        this.cosmoriteGas = Math.max(amt + this.cosmoriteGas, 0);
    }
    incLunestone(amt: number) {
        this.lunestone = Math.max(amt + this.lunestone, 0);
    }
    incCosmorite(amt: number) {
        this.cosmoriteGas = Math.max(amt + this.cosmoriteGas, 0);
    }
}