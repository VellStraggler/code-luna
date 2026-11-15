import {XY, xy} from "../../main/xy"
import { BLOCK_DEPTH, BLOCK_RES, DEFAULT_DRAG, DIRECTION_OFFSETS, Dirs, generateId, MAX_SPEED, PART_CPU_NAME } from "../../main/constants";
import { ModularPart } from "./ModularPart";
import { BlockType } from "./BlockType";
import MainScene from "../../CodeLuna";
import HPImage from "../../main/HPImage";
import ModularRobot from "../ModularRobot";
import { PartType } from "./PartType";
import ModularRobots from "../ModularRobots";
import CpuPart from "./CpuPart";
import BaseGameItem from "../contracts/BaseGameItem";

export default class ModularBlock extends BaseGameItem {

    robot: ModularRobot
    modularParts: ModularPart[] = [];

    readonly blockType: BlockType;
    private energyStored = 0
    hp = 0

    constructor(
        scene: MainScene,
        offset:XY, 
        blockType: BlockType, 
        robot: ModularRobot
    ) {
        let globalPos = robot.getPosition()
        let localPos = offset
        let x = globalPos.x + localPos.x
        let y = globalPos.y + localPos.y

        super(
            scene,
            robot.position ?? offset,
            new HPImage(scene, x, y, blockType.assetName),
            blockType.assetName,
            blockType.availableFrames -1
        )
        this.robot = robot
        this.localPos = localPos
        this.blockType = blockType
        this.resetHP()

        // derive starting health from the blockType
        this.hp = blockType.strength

        this.image.setBodySize(BLOCK_RES-2, BLOCK_RES-2, true)
            .setDrag(DEFAULT_DRAG)
            .setDepth(BLOCK_DEPTH)
        scene.baseLayer.push(this.image)
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

    addPart(scene: MainScene, partType: PartType, robot: ModularRobot | undefined = undefined):this {
        let part!: ModularPart
        if (partType.assetName == PART_CPU_NAME && robot instanceof ModularRobot) {
            part = new CpuPart(scene, this, robot)
            robot.latestCpuPart = part as CpuPart
        } else {
            part = new ModularPart(scene, this, partType.assetName)
        }
        this.modularParts.push(part)
        return this
    }
    
    public disconnect(scene: MainScene, robots: ModularRobots, robot: ModularRobot | null = null) {

        robot?.remove(this)
        let newRobot = ModularRobot.createFromBlock(scene, this)
        
        for (const part of this.modularParts) {
            part.globalPos = this.globalPos;
            part.image.setPosition(this.globalPos.x, this.globalPos.y);
            part.update(scene.animateScene);
        }
        robots.push(newRobot)
    }

    takeDamage(amt: number) {
        this.robot.takeDamage(amt, this)
    }

    resetHP() {
        this.hp = this.blockType.strength
    }

    getEnergyStored() {
        return this.energyStored
    }

    // returns amount that didn't fit in storage
    storeEnergy(amount:number): number {
        let total = this.getEnergyStored() + amount
        if (total > this.getEnergyLimit() ) {
            let leftovers = total - this.getEnergyLimit()
            this.energyStored = this.getEnergyLimit()
            return leftovers
        } else {
            this.energyStored += amount
            return 0
        }
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