import {XY, xy} from "../../main/XY"
import { PartDefinition } from "./PartDefinition";
import { BLOCK_RES, DRILL_DEPTH, DRILL_TARGET_RANGE_METERS, F0, PART_DEPTH, PART_DRILL_NAME, WELDER_PART } from "../../main/constants";
import ModularBlock from "./ModularBlock";
import IGameItem from "../contracts/IGameItem";
import MainScene from "../../CodeLuna";
import BaseGameItem from "../contracts/BaseGameItem";
import HPImage from "../../main/HPImage";

export class ModularPart extends BaseGameItem {
    parentBlock: ModularBlock;
    readonly partType: PartDefinition

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

    constructor(scene: MainScene, parentBlock: ModularBlock, assetKey: string) {

        const partType = PartDefinition.fromAssetKey(assetKey)
        let x = parentBlock.globalPos.x + partType.offset.x
        let y = parentBlock.globalPos.y + partType.offset.y

        super(
            scene, 
            parentBlock.globalPos, 
            new HPImage(scene, x, y, assetKey + (partType.availableFrames > 1 ? F0 : ""), true)
                .setDepth(assetKey === PART_DRILL_NAME ? DRILL_DEPTH : PART_DEPTH),
            partType.assetKey,
            partType.availableFrames -1
        )
        this.parentBlock = parentBlock;
        this.partType = partType
        this.currentFrame = 0
        this.image.setTexture(this.getFrameName())
    }

    assignPosition(spots:number ,index:number) {
        this.localPos = ModularPart.localPoses[spots-1][index]
    }

    override rotate(amount: number = 0) {
        if (this.assetKey === WELDER_PART) {
            const safeRotation = this.findWelderRotation(amount)
            this.image.setVisible(safeRotation !== null)
            if (safeRotation === null) {
                this.parentBlock.updateFreshness()
                return
            }
            amount = safeRotation
        }
        super.rotate(amount)
        this.updatePosition()
        this.parentBlock.updateFreshness()
    }

    private getPositionAtRotation(rotation: number): XY {
        const offset = this.localPos.add(this.partType.offset)
        const orbiting = this.assetKey === PART_DRILL_NAME || this.assetKey === WELDER_PART
        const angle = orbiting ? rotation : 0
        const cos = Math.cos(angle)
        const sin = Math.sin(angle)
        return xy(
            this.parentBlock.globalPos.x + offset.x * cos - offset.y * sin,
            this.parentBlock.globalPos.y + offset.x * sin + offset.y * cos
        )
    }

    private updatePosition() {
        const position = this.getPositionAtRotation(this.image.rotation)
        this.image.setPosition(position.x, position.y)
    }

    private findWelderRotation(desired: number): number | null {
        const obstacles = this.parentBlock.robot.blocks
            .filter(block => block !== this.parentBlock && block.image.active)
            .map(block => block.image.getBounds())
        const width = Math.abs(this.image.width * this.image.scaleX)
        const height = Math.abs(this.image.height * this.image.scaleY)
        const isClear = (angle: number) => {
            const position = this.getPositionAtRotation(angle)
            const cos = Math.abs(Math.cos(angle))
            const sin = Math.abs(Math.sin(angle))
            const halfWidth = (width * cos + height * sin) / 2
            const halfHeight = (width * sin + height * cos) / 2
            return obstacles.every(bounds =>
                position.x + halfWidth <= bounds.left + 1e-6 ||
                position.x - halfWidth >= bounds.right - 1e-6 ||
                position.y + halfHeight <= bounds.top + 1e-6 ||
                position.y - halfHeight >= bounds.bottom - 1e-6
            )
        }
        if (isClear(desired)) return desired

        let nearest: number | null = null
        let distance = Infinity
        for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
            const difference = Math.abs(Math.atan2(Math.sin(angle - desired), Math.cos(angle - desired)))
            if (difference < distance && isClear(angle)) {
                nearest = angle
                distance = difference
            }
        }
        for (let degree = 1; degree <= 180; degree++) {
            const delta = degree * Math.PI / 180
            if (delta >= distance) break
            if (isClear(desired + delta)) return desired + delta
            if (isClear(desired - delta)) return desired - delta
        }
        return nearest
    }

    /** 0 if part is not activated. */
    public override getEnergyUse() {
        if (this.isActive) {
            return this.partType.energyUsePerMs
        }
        return 0
    }

    override update(animateFrame: boolean = true) {
        const center = this.parentBlock.globalPos
        if (this.assetKey === PART_DRILL_NAME) {
            this.updatePosition()
            const site = this.scene.getNearestMineSite(
                xy(this.image.x, this.image.y), DRILL_TARGET_RANGE_METERS * BLOCK_RES
            )
            if (site) {
                super.rotate(Math.atan2(site.y - center.y, site.x - center.x) + Math.PI / 2)
            }
        } else if (this.assetKey === WELDER_PART) {
            const robot = this.parentBlock.robot
            this.rotate(robot.hasMoved ? robot.movingDirectionRadians + Math.PI / 2 : this.image.rotation)
        }

        this.updatePosition()
        if (!this.isActive && this.maxFrame > 0) {
            this.currentFrame = 0
            this.image.setTexture(this.getFrameName())
        } else {
            this.updateAnimation(animateFrame)
        }
    }
}