import { BLOCK_WHEEL_NAME, FACTORY_BLOCK } from "../../main/constants";
import IGameItemDefinition from "../contracts/IGameItemDefinition";

export class BlockDefinition implements IGameItemDefinition{
    public readonly assetKey: string;
    public readonly weight: number;
    public readonly gasCost: number;
    public readonly stoneCost: number;
    public readonly researchLevel: number
    
    public readonly partLimit: number;
    public readonly strength: number
    public readonly storage: number;

    public readonly availableFrames: number;
    
    //                                     asset            weig gas s p r s storage (optional double-frame)
    static aluminum = new BlockDefinition('aluminum'       ,1   ,0  ,1,1,1,2,2)
    static steel    = new BlockDefinition('steel'          ,3   ,2  ,2,1,2,5,2)
    static wheel    = new BlockDefinition(BLOCK_WHEEL_NAME ,0.5 ,2  ,1,0,1,2,0,2)
    static frame    = new BlockDefinition('frame'          ,0.5 ,3  ,1,4,3,1,0.5)
    static storage  = new BlockDefinition('storage'        ,1.5 ,2  ,1,0,2,2,10)
    static tread    = new BlockDefinition('tread'          ,0.75,2.5,1,0,2,3,0)
    static factory  = new BlockDefinition(FACTORY_BLOCK    ,2   ,3  ,3,0,3,1,0)
    static sleek    = new BlockDefinition('sleek'          ,2   ,2  ,1,2,3,3,1)
    static unknown  = new BlockDefinition('null')
    
    private static readonly definitionsByAssetKey: { [key:string]: BlockDefinition } = {};
    static {
        this.definitionsByAssetKey['aluminum'] = BlockDefinition.aluminum;
        this.definitionsByAssetKey['steel'] = BlockDefinition.steel;
        this.definitionsByAssetKey[BLOCK_WHEEL_NAME] = BlockDefinition.wheel;
        this.definitionsByAssetKey['tread'] = BlockDefinition.tread;
        this.definitionsByAssetKey['factory'] = BlockDefinition.factory;
        this.definitionsByAssetKey['sleek'] = BlockDefinition.sleek;
        this.definitionsByAssetKey['storage'] = BlockDefinition.storage;
        this.definitionsByAssetKey['frame'] = BlockDefinition.frame;

    }

    constructor(
        assetKey: string,
        weight: number = 1, 
        gasCost: number = 1, 
        stoneCost: number = 1, 
        partLimit: number = 1, 
        researchLevel: number = 1,
        strength: number = 1,
        storage:number = 1,
        availableFrames:number = 1
    ) {
        this.assetKey = assetKey
        this.weight = weight
        this.gasCost = gasCost
        this.stoneCost = stoneCost
        this.partLimit = partLimit
        this.researchLevel = researchLevel
        this.strength = strength
        this.storage = storage
        this.availableFrames = availableFrames
    }

    static fromAssetKey(assetKey: string) {
        if (assetKey in BlockDefinition.definitionsByAssetKey) {
            return BlockDefinition.definitionsByAssetKey[assetKey]
        }
        return BlockDefinition.unknown;
    }

}