import { describe, expect, it, vi } from "vitest"

vi.mock("phaser", () => ({}))
vi.mock("../player/Player", () => ({ PlayerState: {} }))

import Controls from "../player/Controls"

function createControls() {
    const controls: any = Object.create(Controls.prototype)
    const keys = { up: false, down: false, left: false, right: false, typing: false }
    controls.wasMoving = false
    controls.isTyping = () => keys.typing
    controls.upPressed = () => keys.up
    controls.downPressed = () => keys.down
    controls.leftPressed = () => keys.left
    controls.rightPressed = () => keys.right
    controls.scene = { animateScene: false, walkSound: { play: vi.fn(), stop: vi.fn() } }
    controls.player = { setVelocity: vi.fn(), setAnimatedTexture: vi.fn() }
    return { controls, keys, sound: controls.scene.walkSound }
}

describe("walking sound", () => {
    it("starts once while moving, stops on release, and restarts on movement", () => {
        const { controls, keys, sound } = createControls()
        controls.updateMovement(100)
        expect(sound.play).not.toHaveBeenCalled()
        keys.up = true
        controls.updateMovement(100)
        controls.updateMovement(100)
        keys.right = true
        controls.updateMovement(100)
        expect(sound.play).toHaveBeenCalledTimes(1)
        expect(sound.stop).not.toHaveBeenCalled()
        keys.up = false
        keys.right = false
        controls.updateMovement(100)
        controls.updateMovement(100)
        expect(sound.stop).toHaveBeenCalledTimes(1)
        keys.left = true
        controls.updateMovement(100)
        expect(sound.play).toHaveBeenCalledTimes(2)
    })

    it("stops when typing interrupts movement and resumes afterward", () => {
        const { controls, keys, sound } = createControls()
        keys.up = true
        controls.updateMovement(100)
        keys.typing = true
        controls.updateMovement(100)
        controls.updateMovement(100)
        expect(sound.stop).toHaveBeenCalledTimes(1)
        keys.typing = false
        controls.updateMovement(100)
        expect(sound.play).toHaveBeenCalledTimes(2)
    })
})
