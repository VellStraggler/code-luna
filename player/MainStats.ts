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
    drainGas(amount: number) {
        this.incGas(-amount)
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

    incGas(amount: number) {
        this.cosmoriteGas = Math.max(amount + this.cosmoriteGas, 0);
    }
    incLunestone(amount: number) {
        this.lunestone = Math.max(amount + this.lunestone, 0);
    }
    incCosmorite(amount: number) {
        this.cosmoriteGas = Math.max(amount + this.cosmoriteGas, 0);
    }
}