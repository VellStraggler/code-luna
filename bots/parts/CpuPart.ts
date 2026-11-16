import MainScene from "../../CodeLuna";
import { HIDE_POS, GUI_DEPTH } from "../../main/constants";
import MyColors from "../../main/MyColors";
import Player from "../../main/Player";
import ModularBlock from "./ModularBlock";
import { ModularPart } from "./ModularPart";
import ModularRobot from "../ModularRobot";
import { PartDefinition } from "./PartDefinition";
import * as Phaser from 'phaser'

export default class CpuPart extends ModularPart {
    guiState = GuiState.closed
    player: Player
    sourceRobot: ModularRobot

    private static openText = 'open\n\n\nmonitor'

    constructor(scene: MainScene, parentBlock: ModularBlock, robot: ModularRobot) {
        super(scene, parentBlock, PartDefinition.partCpu.assetKey)
        this.player = scene.player
        this.sourceRobot = robot
    }

    isNearPlayer(): boolean {
        return (this.getDistanceToPlayer() < 30)
    }

    getDistanceToPlayer(): number {
        if (this.player == null) return 10000
        const playerPosition = this.player.getPosition()
        const distance = Phaser.Math.Distance.Between(
            this.parentBlock.globalPos.x,
            this.parentBlock.globalPos.y,
            playerPosition.x,
            playerPosition.y
        )
        return distance
    }

    override update(animateFrame?: boolean) {
        super.update(animateFrame)
        const closestRobot = this.scene.robots.findRobotClosestToPlayer()
        if(this.sourceRobot !== closestRobot) {
            this.guiState = GuiState.closed
        }
    }
}

export enum GuiState {
    closed,
    open,
    notifying
}