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
    
    //                               asset           weig gas s p r s storage
    static aluminum = new BlockDefinition('block-aluminum',1   ,0  ,1,1,1,2,2)
    static steel    = new BlockDefinition('block-steel'   ,3   ,2  ,2,1,2,5,2)
    static wheel    = new BlockDefinition(BLOCK_WHEEL_NAME,0.5 ,2  ,1,0,1,2,0,2)
    static frame    = new BlockDefinition('block-frame'   ,0.5 ,3  ,1,4,3,1,0)
    static storage  = new BlockDefinition('block-storage' ,1.5 ,2  ,1,0,2,2,10)
    static tread    = new BlockDefinition('block-tread'   ,0.75,2.5,1,0,2,3,0)
    static factory  = new BlockDefinition(FACTORY_BLOCK   ,2   ,3  ,3,0,3,1,0)
    static sleek    = new BlockDefinition('block-sleek'   ,2   ,2  ,1,2,3,3,.5)
    static unknown  = new BlockDefinition('null')
    
    private static readonly definitionsByAssetKey: { [key:string]: BlockDefinition } = {};
    static {
        this.definitionsByAssetKey['block-aluminum'] = BlockDefinition.aluminum;
        this.definitionsByAssetKey['block-steel'] = BlockDefinition.steel;
        this.definitionsByAssetKey[BLOCK_WHEEL_NAME] = BlockDefinition.wheel;
        this.definitionsByAssetKey['block-tread'] = BlockDefinition.tread;
        this.definitionsByAssetKey['block-factory'] = BlockDefinition.factory;
        this.definitionsByAssetKey['block-sleek'] = BlockDefinition.sleek;
        this.definitionsByAssetKey['block-storage'] = BlockDefinition.storage;
        this.definitionsByAssetKey['block-frame'] = BlockDefinition.frame;

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