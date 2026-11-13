import {XY, xy} from "../../main/xy"
import { PartType } from "./PartType";
import { generateId, PART_DEPTH } from "../../main/constants";
import ModularBlock from "./ModularBlock";
import IGameItem from "../contracts/IGameItem";
import MainScene from "../../CodeLuna";
import BaseGameItem from "../contracts/BaseGameItem";
import HPImage from "../../main/HPImage";

export class ModularPart extends BaseGameItem {
    parentBlock: ModularBlock;
    readonly partType: PartType

    /** row index is # of used spots -1, col is ordered position */
    private static localPoses: XY[][] = [
        //1 spot 
        [xy(0,0)],
        //2 spots 
        [xy(-.25, 0), xy(.25, 0)],
        //3 spots
        [xy(0, .25), xy(-.25, -.3), xy(.25, -.3)],
        //4 spots
        [xy(-.25,.25), xy(.25, .25), xy(-.25, -.25), xy(.25, -.25)]
    ]

    constructor(scene: MainScene, parentBlock: ModularBlock, type: string) {

        let partType = PartType.get(type)
        let x = parentBlock.globalPos.x + parentBlock.localPos.x + partType.offset.x
        let y = parentBlock.globalPos.y + parentBlock.localPos.y + partType.offset.y

        super(
            scene, 
            parentBlock.globalPos, 
            new HPImage(scene, x, y, type, true)
                .setDepth(PART_DEPTH),
            partType.assetName,
            partType.availableFrames -1
        )
        this.parentBlock = parentBlock;
        this.partType = partType
    }

    assignPosition(spots:number ,index:number) {
        this.localPos = ModularPart.localPoses[spots-1][index]
    }

    /** 0 if part is not activated. */
    public override getEnergyUse() {
        if (this.isActive) {
            return this.partType.energyUsePerMs
        }
        return 0
    }

    override update(animateFrame: boolean = true) {
        let x = this.parentBlock.globalPos.x + this.localPos.x + this.partType.offset.x
        let y = this.parentBlock.globalPos.y + this.localPos.y + this.partType.offset.y

        this.image.setPosition(x,y)
        // match velocity
        if (this.parentBlock.image.body) {
            this.image.setVelocity(this.parentBlock.image.body.velocity.x, this.parentBlock.image.body.velocity.y)
        }

        this.updateAnimation(animateFrame)
    }
}