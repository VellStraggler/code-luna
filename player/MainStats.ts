import MainScene from "../CodeLuna";

export default class MainStats {
    private lunestone: number;
    private cosmoriteGas: number;
    public gasToShip = 0

    private energyUsePerMs: number = 0;

    constructor(lunestone: number = 0, cosmoriteGas: number = 0, private onFailure: () => void = () => {}) {
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
        if (amount < 0 && this.cosmoriteGas <= 0) this.onFailure()
        this.cosmoriteGas = Math.max(amount + this.cosmoriteGas, 0);
    }
    incLunestone(amount: number) {
        if (amount < 0 && this.lunestone <= 0) this.onFailure()
        this.lunestone = Math.max(amount + this.lunestone, 0);
    }
    incCosmorite(amount: number) {
        this.incGas(amount)
    }
}