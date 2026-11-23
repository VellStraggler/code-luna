import CpuPart from "../bots/parts-and-blocks/CpuPart";
import MainScene from "../CodeLuna";
import { BLOCK_DEPTH } from "../main/constants";
import HPImage from "../main/HPImage";

export default class Player extends HPImage {
    playerState: PlayerState = PlayerState.holdingNothing
    closestCPU: CpuPart | null = null

    constructor(scene: MainScene, x: number, y: number, texture: string) {
        super(scene, x, y, texture)
        this.updateShadowTexture()
        this.updateShadow()
        this.setScale(0.75)
            .setSize(9,12)
            .setDrag(700)
            .setDepth(BLOCK_DEPTH)

        scene.cameras.main.startFollow(this)
        this.hurtSound = scene.painSound
    }

    override updateShadow() {
        this.shadow?.setPosition(this.x, this.y)
    }

    override setTexture(key: string) {
        super.setTexture(key)
        if (this.shadow) {
            this.updateShadowTexture()
        }
        return this
    }

    private updateShadowTexture() {
        const key = this.texture.key + "-player-shadow"
        const frame = this.frame
        const width = frame.cutWidth
        const height = frame.cutHeight
        const shear = 0.3
        const squash = 0.85
        const canvasWidth = Math.ceil(width + height * shear)

        if (!this.scene.textures.exists(key)) {
            const texture = this.scene.textures.createCanvas(key, canvasWidth, height)
            if (!texture) return
            const context = texture.getContext()
            context.imageSmoothingEnabled = false
            // Keep the feet fixed while pushing the top right and down.
            context.setTransform(1, 0, -shear, squash, height * shear, height * (1 - squash))
            context.drawImage(frame.source.image as CanvasImageSource,
                frame.cutX, frame.cutY, width, height, 0, 0, width, height)
            texture.refresh()
        }
        this.shadow?.setTexture(key)
            .setOrigin(this.originX * width / canvasWidth, this.originY)
    }

    toggleHoldingGun() {
        return this.togglePlayerState(PlayerState.holdingGun)
    }
    toggleHoldingWelder() {
        return this.togglePlayerState(PlayerState.holdingWelder)
    }
    toggleHoldingFactoryBlock() {
        return this.togglePlayerState(PlayerState.holdingFactoryBlock)
    }

    togglePlayerState(newState: PlayerState) {
        if (this.playerState == newState) {
            this.playerState = PlayerState.holdingNothing
            return false
        } else {
            this.scene.player.playerState = newState
            return true
        }
    }
}

export enum PlayerState {
    holdingGun,
    holdingWelder,
    holdingFactoryBlock,
    holdingNothing
}