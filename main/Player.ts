import CpuPart from "../bots/parts/CpuPart";
import MainScene from "../CodeLuna";
import { BLOCK_DEPTH } from "./constants";
import HPImage from "./HPImage";

export default class Player extends HPImage {
    playerState: PlayerState = PlayerState.holdingNothing
    closestCPU: CpuPart | null = null

    constructor(scene: MainScene, x: number, y: number, texture: string) {
        super(scene, x, y, texture)
        this.setScale(0.75)
            .setSize(9,12)
            .setDrag(700)
            .setDepth(BLOCK_DEPTH)
    }
}

export enum PlayerState {
    holdingGun,
    holdingWelder,
    holdingFactoryBlock,
    holdingNothing
}