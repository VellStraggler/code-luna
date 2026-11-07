import { BLOCK_WHEEL_NAME } from "../../main/constants";
import IGameItemType from "../contracts/IGameItemType";

export class BlockType implements IGameItemType{
    public readonly assetName: string;
    public readonly weight: number;
    public readonly gasCost: number;
    public readonly stoneCost: number;
    public readonly researchLevel: number
    
    public readonly partLimit: number;
    public readonly strength: number
    public readonly storage: number;

    public readonly availableFrames: number;
    
    //                               asset           weig gas s p r s storage
    static aluminum = new BlockType('block-aluminum',1   ,0  ,1,1,1,1,1)
    static steel    = new BlockType('block-steel'   ,3   ,2  ,2,1,2,4,1)
    static wheel    = new BlockType(BLOCK_WHEEL_NAME,0.5 ,2  ,1,0,1,1,0,2)
    static frame    = new BlockType('block-frame'   ,0.5 ,3  ,1,4,3,1,0)
    static storage  = new BlockType('block-storage' ,1.5 ,2  ,1,0,2,1,5)
    static tread    = new BlockType('block-tread'   ,0.75,2.5,1,0,2,2,0)
    static factory  = new BlockType('block-factory' ,2   ,3  ,3,0,3,0,0)
    static sleek    = new BlockType('block-sleek'   ,2   ,2  ,1,2,3,2,.5)
    static null     = new BlockType('null')
    
    private static readonly dict: { [key:string]: BlockType } = {};
    static {
        this.dict['block-aluminum'] = BlockType.aluminum;
        this.dict['block-steel'] = BlockType.steel;
        this.dict[BLOCK_WHEEL_NAME] = BlockType.wheel;
        this.dict['block-tread'] = BlockType.tread;
        this.dict['block-factory'] = BlockType.factory;
        this.dict['block-sleek'] = BlockType.sleek;
        this.dict['block-storage'] = BlockType.storage;
        this.dict['block-frame'] = BlockType.frame;

    }

    constructor(
        assetName: string, 
        weight: number = 1, 
        gasCost: number = 1, 
        stoneCost: number = 1, 
        partLimit: number = 1, 
        researchLevel: number = 1,
        strength: number = 1,
        storage:number = 1,
        availableFrames:number = 1
    ) {
        this.assetName = assetName
        this.weight = weight
        this.gasCost = gasCost
        this.stoneCost = stoneCost
        this.partLimit = partLimit
        this.researchLevel = researchLevel
        this.strength = strength
        this.storage = storage
        this.availableFrames = availableFrames
    }

    static get(name:string) {
        if (name in BlockType.dict) {
            return BlockType.dict[name]
        }
        return BlockType.null;
    }

}