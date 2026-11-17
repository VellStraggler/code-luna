import { BLOCK_RES, ENERGY_USE_MULT, PART_DRILL_NAME, WELDER_PART } from "../../main/constants";
import IGameItemDefinition from "../contracts/IGameItemDefinition"
import { XY, xy } from "../../main/xy";

/**
 * Animatable if "-f" is included in the file name i.e.: part-drill-f0.png
 */
export class PartDefinition implements IGameItemDefinition{
    public readonly assetKey: string;
    public readonly weight: number;
    public readonly gasCost: number;
    public readonly stoneCost: number;
    public readonly researchLevel: number;

    // note that this is only when the part is active
    public readonly energyUsePerMs: number;

    public readonly availableFrames: number;

    public readonly offset: XY;
    
    //                                    assetKey                  wgt  gas  stn  r&d energy-use
    static partCpu   =       new PartDefinition('part-cpu',               0.2, 3,   1,   1,  0)
    static partDrill =       new PartDefinition(PART_DRILL_NAME,          1,   3,   1,   1,  1  * ENERGY_USE_MULT, xy(0,-BLOCK_RES), 2)
    static partTransmitter = new PartDefinition('part-radio-transmitter', 0.2, 2,   0.5, 3,  0.5  * ENERGY_USE_MULT)
    static partDish  =       new PartDefinition('part-receiving-dish',    0.5, 1,   1,   2,  0.5  * ENERGY_USE_MULT)
    static partBattery =     new PartDefinition('part-battery',           1,   6,   1,   1,  0  * ENERGY_USE_MULT)
    static partCamera =      new PartDefinition('part-camera',            0.4, 3,   1,   2,  1  * ENERGY_USE_MULT)
    static partGun =         new PartDefinition('part-gun',               0.5, 3,   1,   2,  0 * ENERGY_USE_MULT) //active only when firing
    static partWelder =      new PartDefinition(WELDER_PART,              0.5, 3,   1,   2,  0 * ENERGY_USE_MULT, xy(0,-BLOCK_RES), 2)
    static partQR =          new PartDefinition('part-qr',                0,   0.1, 1,   3,  0  * ENERGY_USE_MULT)
    static partSolar =       new PartDefinition('part-solar-panel',       1,   5,   2,   3,  -1 * ENERGY_USE_MULT)
    static unknown =         new PartDefinition('part-null',              0,   0,   0,   1,  0)
    private static readonly definitionsByAssetKey: { [key:string]: PartDefinition } = {};

    static {
        this.definitionsByAssetKey['part-cpu'] = PartDefinition.partCpu;
        this.definitionsByAssetKey[PART_DRILL_NAME] = PartDefinition.partDrill
        this.definitionsByAssetKey['part-radio-transmitter'] = PartDefinition.partTransmitter
        this.definitionsByAssetKey['part-receiving-dish'] = PartDefinition.partDish
        this.definitionsByAssetKey['part-battery'] = PartDefinition.partBattery
        this.definitionsByAssetKey['part-camera'] = PartDefinition.partCamera
        this.definitionsByAssetKey['part-gun'] = PartDefinition.partGun
        this.definitionsByAssetKey[WELDER_PART] = PartDefinition.partWelder
        this.definitionsByAssetKey['part-qr'] = PartDefinition.partQR
        this.definitionsByAssetKey['part-solar-panel'] = PartDefinition.partSolar
    }

    constructor(
        assetKey: string,
        weight: number = .5, 
        gasCost: number = 1, 
        stoneCost: number = 1,
        researchLevel: number = 1,
        energyUsePerMs: number = .001,
        offset: XY = xy(),
        availableFrames: number = 1
    ) {
        this.assetKey = assetKey
        this.weight = weight
        this.gasCost = gasCost
        this.stoneCost = stoneCost
        this.researchLevel = researchLevel
        this.energyUsePerMs = energyUsePerMs
        this.offset = offset
        this.availableFrames = availableFrames
    }

    static fromAssetKey(assetKey: string) {
        if (assetKey in PartDefinition.definitionsByAssetKey) {
            return PartDefinition.definitionsByAssetKey[assetKey]
        }
        return PartDefinition.unknown
    }
}