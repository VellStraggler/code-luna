import MainScene from "../../CodeLuna";
import { HIDE_POS, GUI_DEPTH } from "../../main/constants";
import MyColors from "../../main/MyColors";
import Player from "../../main/Player";
import ModularBlock from "./ModularBlock";
import { ModularPart } from "./ModularPart";
import ModularRobot from "../ModularRobot";
import { PartType } from "./PartType";
import * as Phaser from 'phaser'

export default class CpuPart extends ModularPart {
    guiState = GuiState.closed
    player: Player
    sourceRobot: ModularRobot

    private static openText = 'open\n\n\nmonitor'

    constructor(scene: MainScene, parentBlock: ModularBlock, robot: ModularRobot) {
        super(scene, parentBlock, PartType.partCpu.assetName)
        this.player = scene.player
        this.sourceRobot = robot
    }

    isNearPlayer(): boolean {
        return (this.getDistToPlayer() < 30)
    }

    getDistToPlayer(): number {
        if (this.player == null) return 10000
        let playerPos = this.player.getPosition()
        let dist = Phaser.Math.Distance.Between(
            this.parentBlock.globalPos.x,
            this.parentBlock.globalPos.y,
            playerPos.x,
            playerPos.y
        )
        return dist
    }

    override update(animateFrame?: boolean) {
        super.update(animateFrame)
        let closestBot = this.scene.robots.findRobotClosestToPlayer()
        if(this.sourceRobot !== closestBot) {
            this.guiState = GuiState.closed
        }
    }
}

export enum GuiState {
    closed,
    open,
    notifying
}