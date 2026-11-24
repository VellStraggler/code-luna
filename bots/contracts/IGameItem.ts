import MainScene from "../../CodeLuna"
import { XY } from "../../main/XY"

export default interface IGameItem {
    image: Phaser.Physics.Arcade.Image
    readonly id: number
    localPos: XY
    currentFrame: number
    maxFrame: number
    rotation: number
    scene: MainScene
    assetKey: string

    update(): void
    rotate(): void
    getFrameName(): void
    equals(other: this): boolean
    toString(): string
    updateAnimation(animateFrame: boolean): void
}