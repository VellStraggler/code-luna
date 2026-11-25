import type * as Phaser from "phaser"

export type UIObject =
    | Phaser.GameObjects.Text
    | Phaser.GameObjects.Image
    | Phaser.GameObjects.Rectangle
    | Phaser.GameObjects.Arc

export default interface UIComponent {
    getObjects(): UIObject[]
    setPosition(x: number, y: number): this
    getWidth(): number
    getHeight(): number
    update(): void
    setVisibility(visible: boolean): void
}
