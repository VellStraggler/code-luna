import MainScene from "../CodeLuna"
import { BASE_ZONE_RADIUS, BLOCK_DEPTH, SHADOW_DEPTH } from "./constants"
import HPImage from "./HPImage"
import MyColors from "./MyColors"
import * as Phaser from 'phaser'

export default class PlayerBase extends HPImage {
    readonly zone: Phaser.GameObjects.Arc

    constructor(scene: MainScene, x: number, y: number) {
        super(scene, x, y, "structure-base")
        this.setImmovable(true).setDepth(BLOCK_DEPTH)

        this.zone = scene.add.circle(x, y, BASE_ZONE_RADIUS, MyColors.blue, 0.15)
            .setDepth(SHADOW_DEPTH - 1)
        scene.baseLayer.push(this.zone)
        scene.uiCamera.ignore(this.zone)
        scene.physics.add.existing(this.zone, true)
        const body = this.zone.body as Phaser.Physics.Arcade.StaticBody
        body.setCircle(BASE_ZONE_RADIUS)
    }

    override setPosition(x: number, y: number) {
        super.setPosition(x, y)
        this.zone?.setPosition(x, y)
        const body = this.zone?.body as Phaser.Physics.Arcade.StaticBody | undefined
        body?.updateFromGameObject()
        return this
    }

    override destroy() {
        this.zone?.destroy()
        super.destroy()
    }
}
