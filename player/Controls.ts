import MainScene from "../CodeLuna"
import * as Phaser from 'phaser'
import Player, { PlayerState } from "./Player"
import GameConstants from "../main/constants"
type ControlKeys = {
    up: Phaser.Input.Keyboard.Key
    down: Phaser.Input.Keyboard.Key
    left: Phaser.Input.Keyboard.Key
    right: Phaser.Input.Keyboard.Key
}

export default class Controls {
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
    private controls!: ControlKeys
    player: Player
    scene: MainScene
    private wasMoving = false

    constructor(scene: MainScene, player: Player) {
        this.cursors = scene.input.keyboard!.createCursorKeys()
        this.player = player
        this.scene = scene
        this.controls = scene.input.keyboard!.addKeys({
            up:     Phaser.Input.Keyboard.KeyCodes.W,
            down:   Phaser.Input.Keyboard.KeyCodes.S,
            left:   Phaser.Input.Keyboard.KeyCodes.A,
            right:  Phaser.Input.Keyboard.KeyCodes.D
        }) as ControlKeys
        const onToolbarKeyDown = (event: KeyboardEvent) => {
            if (event.repeat || this.isTyping()) return
            const index = GameConstants.controls.toolbarKeyCodes.indexOf(event.code)
            if (index >= 0) this.scene.GUI.selectToolbarItem(index % GameConstants.controls.toolbarItemCount)
        }
        window.addEventListener("keydown", onToolbarKeyDown)
        scene.events.once("shutdown", () => window.removeEventListener("keydown", onToolbarKeyDown))
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
        return !this.isTyping() && Phaser.Input.Keyboard.JustDown(this.cursors.space)
    }

    isMoving() {
        return !this.isTyping() &&
            (Number(this.rightPressed()) !== Number(this.leftPressed()) ||
             Number(this.downPressed()) !== Number(this.upPressed()))
    }

    private isTyping() {
        const active = document.activeElement
        return this.scene.typing || active instanceof HTMLInputElement ||
            active instanceof HTMLTextAreaElement || (active instanceof HTMLElement && active.isContentEditable)
    }

    onNonButtonClick(pointer: Phaser.Input.Pointer) {
        const hits = this.scene.input.hitTestPointer(pointer)
        if(
            (hits.some(obj => obj instanceof Phaser.GameObjects.Rectangle)) ||
            (hits.some(obj => obj instanceof Phaser.GameObjects.Text)) ||
            this.scene.GUI.baseGUI.isVisible ||
            this.scene.GUI.isFactoryOpen
        ) return

        switch (this.player.playerState) {
            case PlayerState.holdingGun:
                this.scene.shootAtMousePosition(this.player, pointer)
                break
            case PlayerState.holdingFactoryBlock:
                this.scene.debug_summonBlock(this.player, pointer)
                break
            case PlayerState.holdingWelder:
                this.scene.weldAtMousePosition(this.player, pointer)
                break
            default:
                break
        }
    }

    updateMovement(speed: number) {
        if (this.isTyping()) {
            this.player.setVelocity(0, 0)
            this.wasMoving = false
            return
        }

        let goX = 0
        let goY = 0
        if (this.upPressed()) {
            goY -= 1
            this.player.setAnimatedTexture("player/up", this.scene.animateScene)
            if (this.leftPressed()) goX -= 1
            else if (this.rightPressed()) goX += 1
        }
        else if (this.downPressed()) {
            goY += 1
            this.player.setAnimatedTexture("player/down", this.scene.animateScene)
            if (this.leftPressed()) goX -= 1
            else if (this.rightPressed()) goX += 1
        }
        else if (this.leftPressed()) {
            goX -= 1
            this.player.setAnimatedTexture("player/left", this.scene.animateScene)
        }
        else if (this.rightPressed()) {
            goX += 1
            this.player.setAnimatedTexture("player/right", this.scene.animateScene)
        }

        // diagonal movement
        if (goX!=0 && goY!=0) {
            goX *= GameConstants.controls.diagonalMovementScale
            goY *= GameConstants.controls.diagonalMovementScale
        }
        this.player.setVelocity(goX * speed, goY * speed)
        const moving = goX !== 0 || goY !== 0
        if (moving && !this.wasMoving) this.scene.walkSound.play()
        this.wasMoving = moving
    }

}