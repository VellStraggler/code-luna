import MainScene from "../../CodeLuna";
import GameConstants, { HIDE_POS, GUI_DEPTH } from "../../main/constants";
import MyColors from "../../main/MyColors";
import Player from "../../player/Player";
import ModularBlock from "./ModularBlock";
import { ModularPart } from "./ModularPart";
import ModularRobot from "../ModularRobot";
import { PartDefinition } from "./PartDefinition";
import * as Phaser from 'phaser'

export default class CpuPart extends ModularPart {
    guiState = GuiState.closed
    player: Player
    sourceRobot: ModularRobot

    private static openText = GameConstants.text.openMonitorPrompt

    constructor(scene: MainScene, parentBlock: ModularBlock, robot: ModularRobot) {
        super(scene, parentBlock, PartDefinition.partCpu.assetKey)
        this.player = scene.player
        this.sourceRobot = robot
    }

    isNearPlayer(): boolean {
        return (this.getDistanceToPlayer() < GameConstants.game.cpuInteractionRange)
    }

    getDistanceToPlayer(): number {
        if (this.player == null) return GameConstants.game.missingPlayerDistance
        const playerPosition = this.player.getPosition()
        const distance = Phaser.Math.Distance.Between(
            this.parentBlock.image.x,
            this.parentBlock.image.y,
            playerPosition.x,
            playerPosition.y
        )
        return distance
    }

}

export enum GuiState {
    closed,
    open,
    notifying
}