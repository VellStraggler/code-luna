import {XY, xy} from "../../main/xy"
import { BLOCK_DEPTH, BLOCK_RES, DEFAULT_DRAG, DIRECTION_OFFSETS, Dirs, generateId, MAX_SPEED, PART_CPU_NAME } from "../../main/constants";
import { ModularPart } from "./ModularPart";
import { BlockDefinition } from "./BlockDefinition";
import MainScene from "../../CodeLuna";
import HPImage from "../../main/HPImage";
import ModularRobot from "../ModularRobot";
import { PartDefinition } from "./PartDefinition";
import ModularRobots from "../ModularRobots";
import CpuPart from "./CpuPart";
import BaseGameItem from "../contracts/BaseGameItem";
import * as Phaser from 'phaser'


export default class ModularBlock extends BaseGameItem {

    robot: ModularRobot
    modularParts: ModularPart[] = [];

    readonly blockType: BlockDefinition;
    storedCosmorite = 0
    storedLunestone = 0
    hp = 0

    constructor(
        scene: MainScene,
        offset:XY, 
        blockType: BlockDefinition,
        robot: ModularRobot
    ) {
        let globalPos = robot.getPosition()
        let localPos = offset
        let x = globalPos.x + localPos.x
        let y = globalPos.y + localPos.y

        super(
            scene,
            xy(x, y),
            new HPImage(scene, x, y, blockType.assetKey),
            blockType.assetKey,
            blockType.availableFrames -1
        )
        this.robot = robot
        this.localPos = localPos
        this.blockType = blockType
        this.resetHP()

        this.image.setBodySize(BLOCK_RES-2, BLOCK_RES-2, true)
            .setDrag(DEFAULT_DRAG)
            .setDepth(BLOCK_DEPTH)
        scene.baseLayer.push(this.image)
    }

    public connectRobotAt(otherBlock: ModularBlock): boolean {
        if (this.robot === otherBlock.robot) return false

        const dx = otherBlock.image.x - this.image.x
        const dy = otherBlock.image.y - this.image.y
        const direction = Math.abs(dx) >= Math.abs(dy)
            ? xy(dx < 0 ? -1 : 1, 0)
            : xy(0, dy < 0 ? -1 : 1)
        const offset = this.localPos.add(direction.multiply(BLOCK_RES)).subtract(otherBlock.localPos)

        // Move the entire donor by one translation, without overlapping the survivor.
        if (otherBlock.robot.blocks.some(block =>
            this.robot.blocks.some(existing => existing.localPos.equals(block.localPos.add(offset)))
        )) return false

        this.robot.position = xy(this.image.x, this.image.y).subtract(this.localPos)
        this.robot.absorb(otherBlock.robot, offset)
        return true
    }

    /** adds block. Assigns global position and this as the parent block.
     * Applies an offset of up to one BLOCK_RESOLUTION_AMOUNT away. If dir is not set, the local position will be
     * assumed as already assigned
     */
    public connectBlock(block: this, dir: string = "") {
        block.globalPos = this.globalPos // from source block
        this.robot.addBlock(block)
        
        if (dir!="") {
            let offset = DIRECTION_OFFSETS[0]
            switch(dir){
                case("down"):
                    offset = DIRECTION_OFFSETS[0]
                    break
                case("up"):
                    offset = DIRECTION_OFFSETS[1]
                    break
                case("right"):
                    offset = DIRECTION_OFFSETS[2]
                    break
                default://left
                    offset = DIRECTION_OFFSETS[3]
                    break
            }
            block.localPos = this.localPos.add(offset.multiply(BLOCK_RES))
        }

        block.update(this.scene.animateScene)
    }

    rotateChassis(dir: Dirs) {}

    addPart(scene: MainScene, partType: PartDefinition, robot: ModularRobot | undefined = undefined):this {
        let part!: ModularPart
        if (partType.assetKey == PART_CPU_NAME && robot instanceof ModularRobot) {
            part = new CpuPart(scene, this, robot)
            robot.latestCpuPart = part as CpuPart
        } else {
            part = new ModularPart(scene, this, partType.assetKey)
        }
        this.modularParts.push(part)
        this.scene.uiCamera.ignore(part.image)
        this.updateDamageTint()
        return this
    }
    
    public disconnect(scene: MainScene, robots: ModularRobots, robot: ModularRobot | null = null) {
        const sourceRobot = robot ?? this.robot
        if (!sourceRobot.blocks.includes(this) || sourceRobot.blocks.length <= 1) return
        sourceRobot.remove(this)
        this.resetHP()
        let newRobot = ModularRobot.createFromBlock(scene, this)
        robots.push(newRobot)
        sourceRobot.splitDisconnected()
        return newRobot
    }

    takeDamage(damageAmount: number) {
        this.robot.takeDamage(damageAmount, this)
    }

    /** Strength sets the 1-damage laser hit count (minimum one).
     * Block and part redness tracks health lost; detaching resets health and tint.
     */
    get maxHP() {
        return Math.max(1, this.blockType.strength)
    }

    resetHP() {
        this.hp = this.maxHP
        this.updateDamageTint()
    }

    updateDamageTint() {
        const healthFraction = Math.max(0, Math.min(1, this.hp / this.maxHP))
        const channel = Math.round(255 * healthFraction)
        const tint = Phaser.Display.Color.GetColor(255, channel, channel)
        for (const image of [this.image, ...this.modularParts.map(part => part.image)]) {
            if (healthFraction == 1) {
                image.clearTint()
            } else {
                image.setTint(tint)
            }
        }
    }

    getEnergyStored() {
        return this.storedCosmorite
    }

    // returns amount that didn't fit in storage
    storeEnergy(amount:number): number {
        const free = Math.max(0, this.getEnergyLimit() - this.storedCosmorite - this.storedLunestone)
        const stored = Math.min(Math.max(0, amount), free)
        this.storedCosmorite += stored
        return amount - stored
    }

    getEnergyLimit() {
        return this.blockType.storage
    }

    addEnemyCollider(scene: MainScene, offender: HPImage | Phaser.Physics.Arcade.Image) {
        scene.physics.add.collider(offender, this.image, () => {
            if(this.robot.blocks.includes(this)) {
                this.robot.proxyGlobalBlock = this
            }
        })
    }

    override destroy() {
        this.modularParts.forEach(part => part.destroy())
        this.modularParts = []
        super.destroy()
    }

    /** 
     * Recognizes when it becomes a parent block and sets its own global position. Otherwise 
     * update based on the global position.
     * Handles velocity clamping as well
    */
    override update(animateScene: boolean = false) {
        this.image.update()
        if (this.image.body == undefined) return
            // Derive position from physics
             
        let newPos = this.image.getCenter()
        this.globalPos.x = newPos.x
        this.globalPos.y = newPos.y 
        this.image.updateShadow()

        // velocity clamping
        if (this.image.body!.velocity.length() > MAX_SPEED) {
            this.image.body?.velocity.normalize().scale(MAX_SPEED)
        }

        this.updateAnimation(animateScene)

        for(const part of this.modularParts) {
            part.update(animateScene)
        }

    }
}