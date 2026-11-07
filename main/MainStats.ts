import ModularRobot from "../bots/ModularRobot";
import MainScene from "../CodeLuna";

export default class MainStats {
    private lunestone: number;
    private cosmoriteGas: number;

    private energyUsePerMs: number = 0;

    private static refinedGasPercent = 0.66;

    constructor(lunestone: number = 0, cosmoriteGas: number = 0) {
        this.lunestone = lunestone;
        this.cosmoriteGas = cosmoriteGas;

    }

    getEnergyUseMs() {
        return this.energyUsePerMs
    }
    calcEnergyUseMs(scene: MainScene) {
        let total = 0
        scene.robots.robots.forEach(robot => {
            total += robot.energyUsePerMs
        })
        this.energyUsePerMs = Math.max(0,total)
    }
    /** in seconds*/
    calcTimeLeft() {
        return this.cosmoriteGas / (this.energyUsePerMs * 1000);
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