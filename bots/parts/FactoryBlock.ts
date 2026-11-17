import * as Phaser from 'phaser'
import MainScene from "../../CodeLuna"
import { BLOCK_RES, Dirs } from "../../main/constants"
import { xy, XY } from "../../main/xy"
import ModularRobot from "../ModularRobot"
import { BlockDefinition } from "./BlockDefinition"
import { GuiState } from "./CpuPart"
import ModularBlock from "./ModularBlock"
import { PartDefinition } from "./PartDefinition"

export default class FactoryBlock extends ModularBlock {
    guiState = GuiState.closed
    selectedBlock = BlockDefinition.aluminum
    selectedParts = new Set<PartDefinition>()
    outputDirection = Dirs.down
    fromUser = true

    constructor(scene: MainScene, position: XY, robot: ModularRobot) {
        super(scene, position, BlockDefinition.factory, robot)
    }

    getDistanceToPlayer() {
        return Phaser.Math.Distance.Between(
            this.image.x, this.image.y, this.scene.player.x, this.scene.player.y
        )
    }

    isNearPlayer() {
        return this.getDistanceToPlayer() < 30
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

    print(): string {
        if (!this.image.active || !this.robot.blocks.includes(this)) return "Factory disconnected."
        if (this.selectedParts.size > this.selectedBlock.partLimit) {
            return `This block holds at most ${this.selectedBlock.partLimit} parts.`
        }
        const offsets = {
            [Dirs.up]: xy(0, -1),
            [Dirs.down]: xy(0, 1),
            [Dirs.left]: xy(-1, 0),
            [Dirs.right]: xy(1, 0)
        }
        const position = xy(this.image.x, this.image.y).add(offsets[this.outputDirection].multiply(BLOCK_RES))
        const bounds = new Phaser.Geom.Rectangle(
            position.x - BLOCK_RES / 2 + 1, position.y - BLOCK_RES / 2 + 1,
            BLOCK_RES - 2, BLOCK_RES - 2
        )
        for (const robot of this.scene.robots) {
            if (robot.blocks.some(block =>
                Phaser.Geom.Intersects.RectangleToRectangle(bounds, block.image.getBounds())
            )) return "Output blocked. Clear the selected side."
        }
        const cost = this.getPrintCost()
        const gas = this.fromUser ? this.scene.mainStats.getGas() : this.robot.storedCosmorite
        const stone = this.fromUser ? this.scene.mainStats.getLunestone() : this.robot.storedLunestone
        if (gas < cost.gas || stone < cost.stone) return "Not enough resources."

        const printed = ModularRobot.create(this.scene, position.x, position.y, this.selectedBlock)
        const block = printed.blocks[0]
        block.printedBy = this
        const parts = [...this.selectedParts]
        for (const partType of parts) block.addPart(this.scene, partType, printed)
        block.modularParts.forEach((part, index) => {
            part.assignPosition(parts.length, index)
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
        return "Printed."
    }
}
