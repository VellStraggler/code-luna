import MainScene from "../../CodeLuna"
import { XY } from "../../main/xy"

export default interface IGameItem {
    image: Phaser.Physics.Arcade.Image
    readonly id: number
    globalPos: XY
    localPos: XY
    currentFrame: number
    maxFrame: number
    rotation: number
    scene: MainScene
    itemName: string

    update(): void
    rotate(): void
    getFrameName(): void
    equals(other: this): boolean
    toString(): string
    updateAnimation(animateFrame: boolean): void
}