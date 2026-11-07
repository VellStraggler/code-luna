import MainScene from "../CodeLuna"
import * as Phaser from 'phaser'
type ControlKeys = {
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
}

export default class Controls {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    private controls!: ControlKeys

    constructor(scene: MainScene) {
        this.cursors = scene.input.keyboard!.createCursorKeys()
        this.controls = scene.input.keyboard!.addKeys({
            up:     Phaser.Input.Keyboard.KeyCodes.W,
            down:   Phaser.Input.Keyboard.KeyCodes.S,
            left:   Phaser.Input.Keyboard.KeyCodes.A,
            right:  Phaser.Input.Keyboard.KeyCodes.D
        }) as ControlKeys
    }

    leftPressed() {
        return this.cursors.left.isDown || this.controls.left.isDown
    }

    rightPressed() {
        return this.cursors.right.isDown || this.controls.right.isDown
    }

    upPressed() {
        return this.cursors.up.isDown || this.controls.up.isDown
    }

    downPressed() {
        return this.cursors.down.isDown || this.controls.down.isDown
    }
    spaceJustDown() {
        return Phaser.Input.Keyboard.JustDown(this.cursors.space)
    }

}