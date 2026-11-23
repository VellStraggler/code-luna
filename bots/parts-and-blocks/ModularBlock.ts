import {XY, xy} from "../../main/XY"
import { BLOCK_DEPTH, BLOCK_FRESHNESS_MS, BLOCK_FRESHNESS_START_WHITENESS, BLOCK_RES, DEFAULT_DRAG, DIRECTION_OFFSETS, generateId, MAX_SPEED, PART_CPU_NAME, PART_DRILL_NAME, STARTING_GAS_PER_ITEM } from "../../main/constants";
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
    // Starter gas is available even on blocks without storage.
    storedCosmorite = STARTING_GAS_PER_ITEM
    storedLunestone = 0
    hp = 0
    createdAt: number
    printedBy: ModularBlock | null = null
    private freshnessImages = new Map<Phaser.GameObjects.Image, Phaser.GameObjects.Image>()

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
        this.createdAt = scene.time.now
        this.resetHP()

        this.image.setBodySize(BLOCK_RES-2, BLOCK_RES-2, true)
            .setDrag(DEFAULT_DRAG)
            .setDepth(BLOCK_DEPTH)
        scene.baseLayer.push(this.image)
        this.updateFreshness()
    }

    get isFresh() {
        return this.scene.time.now - this.createdAt < BLOCK_FRESHNESS_MS
    }

    protected getFreshnessSources(): Phaser.GameObjects.Image[] {
        return [this.image, ...this.modularParts.map(part => part.image)]
    }

    public updateFreshness() {
        if (!this.isFresh) {
            for (const overlay of this.freshnessImages.values()) overlay.destroy()
            this.freshnessImages.clear()
            return
        }
        const alpha = BLOCK_FRESHNESS_START_WHITENESS *
            Math.pow(1 - (this.scene.time.now - this.createdAt) / BLOCK_FRESHNESS_MS, 3)
        for (const image of this.getFreshnessSources()) {
            let overlay = this.freshnessImages.get(image)
            if (!overlay) {
                overlay = this.scene.add.image(image.x, image.y, image.texture.key, image.frame.name)
                    .setTint(0xffffff)
                    .setTintMode(Phaser.TintModes.FILL)
                this.freshnessImages.set(image, overlay)
                this.scene.uiCamera.ignore(overlay)
                this.scene.baseLayer.push(overlay)
            }
            overlay.setTexture(image.texture.key, image.frame.name)
                .setPosition(image.x, image.y)
                .setRotation(image.rotation)
                .setScale(image.scaleX, image.scaleY)
                .setOrigin(image.originX, image.originY)
                .setDepth(image.depth + 1)
                .setVisible(image.visible)
                .setAlpha(alpha * image.alpha)
        }
    }

    public canAutoConnectTo(other: ModularBlock): boolean {
        if (this.robot === other.robot || (!this.isFresh && !other.isFresh)) return false
        if (this.blockType === BlockDefinition.wheel && other.blockType === BlockDefinition.wheel) return false
        return !this.robot.blocks.some(block => block.printedBy?.robot === other.robot) &&
            !other.robot.blocks.some(block => block.printedBy?.robot === this.robot)
    }

    public connectRobotAt(otherBlock: ModularBlock): boolean {
        if (this.robot === otherBlock.robot) return false
        if (this.blockType === BlockDefinition.wheel && otherBlock.blockType === BlockDefinition.wheel) return false
        if (this.robot.blocks.length < otherBlock.robot.blocks.length) return otherBlock.connectRobotAt(this)

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
        this.scene.sound.play("weld")
        return true
    }

    /** adds block. Assigns global position and this as the parent block.
     * Applies an offset of up to one BLOCK_RESOLUTION_AMOUNT away. If dir is not set, the local position will be
     * assumed as already assigned
     */
    public connectBlock(block: this, dir: string = "") {
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

        this.robot.addBlock(block)
        this.robot.reload()
        block.update(this.scene.animateScene)
    }

    addPart(scene: MainScene, partType: PartDefinition, robot: ModularRobot | undefined = undefined):this {
        let part!: ModularPart
        if (partType.assetKey == PART_CPU_NAME && robot instanceof ModularRobot) {
            part = new CpuPart(scene, this, robot)
            robot.latestCpuPart = part as CpuPart
        } else {
            part = new ModularPart(scene, this, partType.assetKey)
        }
        this.modularParts.push(part)
        this.storedCosmorite += STARTING_GAS_PER_ITEM
        this.scene.uiCamera.ignore(part.image)
        this.updateDamageTint()
        this.updateFreshness()
        return this
    }
    
    removePart(part: ModularPart): boolean {
        const index = this.modularParts.indexOf(part)
        if (index < 0) return false
        this.modularParts.splice(index, 1)
        this.freshnessImages.get(part.image)?.destroy()
        this.freshnessImages.delete(part.image)
        part.destroy()
        this.updateFreshness()
        return true
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
        for (const overlay of this.freshnessImages.values()) overlay.destroy()
        this.freshnessImages.clear()
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

        const animateRobot = animateScene && this.robot.hasCpu()
        this.updateAnimation(animateRobot)

        for(const part of this.modularParts) {
            part.update(animateRobot || (animateScene && part.assetKey === PART_DRILL_NAME))
        }
        this.updateFreshness()

    }
}