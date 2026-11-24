import MainScene from "../CodeLuna"
import { BASE_ZONE_RADIUS, BLOCK_DEPTH, SHADOW_DEPTH } from "../main/constants"
import HPImage from "../main/HPImage"
import MyColors from "../main/MyColors"
import * as Phaser from 'phaser'

export default class PlayerBase extends HPImage {
    readonly zone: Phaser.GameObjects.Arc

    constructor(scene: MainScene, x: number, y: number) {
        super(scene, x, y, "structure-base")
        this.setImmovable(true).setDepth(BLOCK_DEPTH)
        this.zone = scene.add.circle(x, y, BASE_ZONE_RADIUS, MyColors.blue, 0.15)
            .setDepth(SHADOW_DEPTH - 1)
        scene.addWorldObject(this.zone)
        scene.uiCamera.ignore(this.zone)
        scene.physics.add.existing(this.zone, true)
        scene.physics.add.overlap(scene.player, this, () => {
            this.isOverlapped = true
        })
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
