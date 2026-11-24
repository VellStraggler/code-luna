import * as Phaser from "phaser"
import type MainScene from "../CodeLuna"
import type Player from "../player/Player"
import { BLOCK_DEPTH, BLOCK_RES, RESOURCE_DROP_ATTRACT_RANGE_METERS, RESOURCE_DROP_SPEED } from "./constants"

export default class ResourceDrop {
    readonly image: Phaser.GameObjects.Image
    private x: number
    private y: number
    private elapsed = 0

    constructor(
        private scene: MainScene,
        x: number,
        y: number,
        private texture: "icon-cosmorite" | "icon-lunestone",
        readonly amount: number
    ) {
        this.x = x
        this.y = y
        this.image = scene.add.image(x, y, texture)
            .setScale(0.75)
            .setDepth(BLOCK_DEPTH + 1)
        scene.uiCamera.ignore(this.image)
        scene.addWorldObject(this.image)
    }

    update(delta: number, player: Player, collect: (texture: string, amount: number) => void) {
        this.elapsed += delta
        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y)
        if (distance <= RESOURCE_DROP_ATTRACT_RANGE_METERS * BLOCK_RES) {
            const step = Math.min(distance, RESOURCE_DROP_SPEED * delta / 1000)
            if (distance > 0) {
                this.x += (player.x - this.x) / distance * step
                this.y += (player.y - this.y) / distance * step
            }
        }

        this.image.setPosition(this.x, this.y + Math.sin(this.elapsed / 500) * 2)
        if (!Phaser.Geom.Intersects.RectangleToRectangle(
            this.image.getBounds(), player.getBounds()
        )) return true

        collect(this.texture, this.amount)
        this.image.destroy()
        return false
    }
}
