import { BLOCK_RES, ENERGY_USE_MULT, PART_DRILL_NAME, WELDER_PART } from "../../main/constants";
import IGameItemType from "../contracts/IGameItemType"
import { XY, xy } from "../../main/xy";

/**
 * Animatable if "-f" is included in the file name i.e.: part-drill-f0.png
 */
export class PartType implements IGameItemType{
    public readonly assetName: string;
    public readonly weight: number;
    public readonly gasCost: number;
    public readonly stoneCost: number;
    public readonly researchLevel: number;

    // note that this is only when the part is active
    public readonly energyUsePerMs: number;

    public readonly availableFrames: number;

    public readonly offset: XY;
    
    //                                    assetName                 wgt  gas  stn  r&d energy-use
    static partCpu   =       new PartType('part-cpu',               0.2, 3,   1,   1,  0)
    static partDrill =       new PartType(PART_DRILL_NAME,          1,   3,   1,   1,  1  * ENERGY_USE_MULT, xy(0,-BLOCK_RES), 2)
    static partTransmitter = new PartType('part-radio-transmitter', 0.2, 2,   0.5, 3,  0.5  * ENERGY_USE_MULT)
    static partDish  =       new PartType('part-receiving-dish',    0.5, 1,   1,   2,  0.5  * ENERGY_USE_MULT)
    static partBattery =     new PartType('part-battery',           1,   6,   1,   1,  0  * ENERGY_USE_MULT)
    static partCamera =      new PartType('part-camera',            0.4, 3,   1,   2,  1  * ENERGY_USE_MULT)
    static partGun =         new PartType('part-gun',               0.5, 3,   1,   2,  0 * ENERGY_USE_MULT) //active only when firing
    static partWelder =      new PartType(WELDER_PART,              0.5, 3,   1,   2,  0 * ENERGY_USE_MULT) //active only when firing
    static partQR =          new PartType('part-qr',                0,   0.1, 1,   3,  0  * ENERGY_USE_MULT)
    static partSolar =       new PartType('part-solar-panel',       1,   5,   2,   3,  -1 * ENERGY_USE_MULT)
    static partNull =        new PartType('part-null',              0,   0,   0,   1,  0)
    private static dict: { [key:string]: PartType } = {};

    static {
        this.dict['part-cpu'] = PartType.partCpu;
        this.dict[PART_DRILL_NAME] = PartType.partDrill
        this.dict['part-radio-transmitter'] = PartType.partTransmitter
        this.dict['part-receiving-dish'] = PartType.partBattery
        this.dict['part-battery'] = PartType.partBattery
        this.dict['part-camera'] = PartType.partCamera
        this.dict['part-gun'] = PartType.partGun
        this.dict[WELDER_PART] = PartType.partWelder
        this.dict['part-qr'] = PartType.partQR
    }

    constructor(
        assetName: string, 
        weight: number = .5, 
        gasCost: number = 1, 
        stoneCost: number = 1,
        researchLevel: number = 1,
        energyUsePerMs: number = .001,
        offset: XY = xy(),
        availableFrames: number = 1
    ) {
        this.assetName = assetName
        this.weight = weight
        this.gasCost = gasCost
        this.stoneCost = stoneCost
        this.researchLevel = researchLevel
        this.energyUsePerMs = energyUsePerMs
        this.offset = offset
        this.availableFrames = availableFrames
    }

    static get(name:string) {
        if (name in PartType.dict) {
            return PartType.dict[name]
        }
        return PartType.partNull
    }
}