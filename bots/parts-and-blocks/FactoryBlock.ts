import * as Phaser from 'phaser'
import MainScene from "../../CodeLuna"
import GameConstants, { BLOCK_RES, Dirs, PART_DRILL_NAME } from "../../main/constants"
import { xy, XY } from "../../main/XY"
import ModularRobot from "../ModularRobot"
import { BlockDefinition } from "./BlockDefinition"
import { GuiState } from "./CpuPart"
import ModularBlock from "./ModularBlock"
import { PartDefinition } from "./PartDefinition"

export const PrintStrings = {
    success: GameConstants.text.factoryPrinted,
    blocked: GameConstants.text.factoryOutputBlocked,
    unavailable: GameConstants.text.factoryDisconnected,
    unaffordable: GameConstants.text.factoryNotEnoughResources,
    tooManyParts: GameConstants.text.factoryPartLimit

}

export default class FactoryBlock extends ModularBlock {
    guiState = GuiState.closed
    selectedBlock = BlockDefinition.aluminum
    selectedParts = new Set<PartDefinition>()
    outputDirection = Dirs.down
    fromUser = true

    static readonly offsets = {
        [Dirs.up]: xy(0, -1),
        [Dirs.down]: xy(0, 1),
        [Dirs.left]: xy(-1, 0),
        [Dirs.right]: xy(1, 0)
    }

    constructor(scene: MainScene, position: XY, robot: ModularRobot) {
        super(scene, position, BlockDefinition.factory, robot)
    }

    selectBlock(blockName: string = "aluminum") {
        this.selectedBlock = BlockDefinition.fromAssetKey(blockName)
    }

    setDirection(x: number, y: number): boolean {
        const offset = xy(Math.sign(x), Math.sign(y))
        for (const direction of Object.values(Dirs)) {
            if (FactoryBlock.offsets[direction].equals(offset)) {
                this.outputDirection = direction
                return true
            }
        }
        return false
    }

    getDistanceToPlayer() {
        return Phaser.Math.Distance.Between(
            this.image.x, this.image.y, this.scene.player.x, this.scene.player.y
        )
    }

    isNearPlayer() {
        return this.getDistanceToPlayer() < GameConstants.game.factoryInteractionRange
    }

    getPrintCost() {
        let gas = this.selectedBlock.gasCost
        let stone = this.selectedBlock.stoneCost
        for (const part of this.selectedParts) {
            gas += part.gasCost
            stone += part.stoneCost
        }
        return { gas, stone }
    }

    private getOutputPosition(direction: Dirs) {
        return xy(this.image.x, this.image.y).add(FactoryBlock.offsets[direction].multiply(BLOCK_RES))
    }

    private isPositionBlocked(position: XY): boolean {
        const bounds = new Phaser.Geom.Rectangle(
            position.x - BLOCK_RES / 2 + 1, position.y - BLOCK_RES / 2 + 1,
            BLOCK_RES - 2, BLOCK_RES - 2
        )
        for (const robot of this.scene.robots) {
            if (robot.blocks.some(block =>
                block !== this && Phaser.Geom.Intersects.RectangleToRectangle(bounds, block.image.getBounds())
            )) return true
        }
        return false
    }

    private getPrintPlacement(direction: Dirs): { position: XY, retreat: XY | null } | null {
        const position = this.getOutputPosition(direction)
        if (!this.isPositionBlocked(position)) return { position, retreat: null }
        if (this.robot.blocks.length !== 1) return null

        const current = xy(this.image.x, this.image.y)
        const retreat = current.subtract(position.subtract(current))
        if (this.isPositionBlocked(retreat) || this.isPositionBlocked(current)) return null
        return { position: current, retreat }
    }

    isOutputBlocked(direction: Dirs): boolean {
        return this.getPrintPlacement(direction) === null
    }

    print(): string {
        const fail = (message: string) => { this.scene.cancelAction(); return message }
        if (!this.image.active || !this.robot.blocks.includes(this)) return fail(PrintStrings.unavailable)
        if (this.selectedParts.size > this.selectedBlock.partLimit) {
            return fail(PrintStrings.tooManyParts(this.selectedBlock.partLimit))
        }
        const placement = this.getPrintPlacement(this.outputDirection)
        if (!placement) return fail(PrintStrings.blocked)
        const cost = this.getPrintCost()
        const gas = this.fromUser ? this.scene.mainStats.getGas() : this.robot.storedCosmorite
        const stone = this.fromUser ? this.scene.mainStats.getLunestone() : this.robot.storedLunestone
        if (gas < cost.gas || stone < cost.stone) return fail(PrintStrings.unaffordable)

        if (placement.retreat) {
            this.image.setPosition(placement.retreat.x, placement.retreat.y)
            this.image.body?.reset(placement.retreat.x, placement.retreat.y)
            this.robot.position = placement.retreat.subtract(this.localPos)
            this.robot.proxyGlobalBlock = this
            this.update(false)
        }
        const position = placement.position
        const printed = ModularRobot.create(this.scene, position.x, position.y, this.selectedBlock)
        const block = printed.blocks[0]
        block.printedBy = this
        const parts = [...this.selectedParts]
        for (const partType of parts) block.addPart(this.scene, partType, printed)
        const positionedParts = block.modularParts.filter(part => part.assetKey !== PART_DRILL_NAME)
        block.modularParts.filter(part => part.assetKey === PART_DRILL_NAME).forEach(part => part.assignPosition(1, 0))
        positionedParts.forEach((part, index) => {
            part.assignPosition(positionedParts.length, index)
            part.localPos = part.localPos.multiply(BLOCK_RES)
        })
        printed.reload()
        block.update(false)
        if (this.fromUser) {
            this.scene.mainStats.incGas(-cost.gas)
            this.scene.mainStats.incLunestone(-cost.stone)
        } else {
            this.robot.storedCosmorite -= cost.gas
            this.robot.storedLunestone -= cost.stone
        }
        this.scene.robots.push(printed)
        this.scene.robots.connectFreshBlocks()
        this.scene.sound.play("print")
        return PrintStrings.success
    }
}
