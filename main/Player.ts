import CpuPart from "../bots/parts/CpuPart";
import HPImage from "./HPImage";

export default class Player extends HPImage {
    playerState: PlayerState = PlayerState.holdingNothing
    closestCPU: CpuPart | null = null
}

export enum PlayerState {
    holdingGun,
    holdingWelder,
    holdingFactoryBlock,
    holdingNothing
}