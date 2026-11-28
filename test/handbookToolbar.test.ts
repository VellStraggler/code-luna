import { describe, expect, it, vi } from "vitest"

vi.mock("phaser", () => ({}))
vi.mock("../main/GameGeometry", () => ({ default: {} }))
vi.mock("../player/Player", () => ({
    PlayerState: { holdingGun: 0, holdingWelder: 1, holdingFactoryBlock: 2, holdingHandbook: 3, holdingNothing: 4 }
}))
vi.mock("../bots/parts-and-blocks/CpuPart", () => ({ GuiState: { closed: 0 } }))
vi.mock("../bots/parts-and-blocks/FactoryBlock", () => ({ default: class {} }))
vi.mock("../bots/ModularRobot", () => ({ default: class {} }))
vi.mock("../gui/RobotFunctionEditor", () => ({ default: class {} }))
vi.mock("../gui/FactoryGUI", () => ({ default: class {} }))
vi.mock("../gui/Handbook", () => ({ default: class {} }))
vi.mock("../gui/RobotChatPanel", () => ({ default: class {} }))

import GUI from "../gui/gui"
import { PlayerState } from "../player/Player"

function createToolbar() {
    const images: { texture: string, setTexture: (texture: string) => unknown }[] = []
    const object = () => {
        const obj: any = { x: 0, y: 0, width: 20, height: 20 }
        for (const method of ["setStrokeStyle", "setInteractive", "setScrollFactor", "setDepth", "on",
            "setScale", "setPosition", "setVisible"]) obj[method] = () => obj
        return obj
    }
    const scene: any = {
        add: {
            rectangle: object,
            circle: object,
            text: object,
            image: (_x: number, _y: number, texture: string) => {
                const image = Object.assign(object(), {
                    texture,
                    setTexture(key: string) { this.texture = key; return this }
                })
                images.push(image)
                return image
            }
        },
        sound: { play: vi.fn() },
        player: {
            playerState: PlayerState.holdingNothing,
            toggleHoldingGun() { this.playerState = PlayerState.holdingGun; return true }
        }
    }
    const gui: any = Object.create(GUI.prototype)
    scene.GUI = gui
    gui.scene = scene
    gui.handbook = {
        isVisible: false,
        setVisible(visible: boolean) { this.isVisible = visible }
    }
    gui.bringBookForward = vi.fn()
    gui.bringMonitorForward = vi.fn()
    gui.selectTool = vi.fn()
    gui.initPlayerTools()
    return { gui, scene, bookImage: images[3] }
}

describe("handbook toolbar", () => {
    it("toggles the book and its texture on repeated activation", () => {
        const { gui, scene, bookImage } = createToolbar()
        gui.selectToolbarItem(3)
        expect(gui.handbook.isVisible).toBe(true)
        expect(bookImage.texture).toBe("openBook")
        expect(scene.player.playerState).toBe(PlayerState.holdingHandbook)

        gui.selectToolbarItem(3)
        expect(gui.handbook.isVisible).toBe(false)
        expect(bookImage.texture).toBe("closedBook")
        expect(scene.player.playerState).toBe(PlayerState.holdingNothing)
        expect(gui.playerTools.iconButtons[3].selected).toBe(false)
    })

    it("closes on tool switch or external close and can reopen", () => {
        const { gui, scene, bookImage } = createToolbar()
        gui.selectToolbarItem(3)
        gui.selectToolbarItem(0)
        expect(gui.handbook.isVisible).toBe(false)
        expect(bookImage.texture).toBe("closedBook")
        expect(scene.player.playerState).toBe(PlayerState.holdingGun)
        gui.selectToolbarItem(3)
        gui.closeBook()
        expect(gui.playerTools.iconButtons[3].selected).toBe(false)
        expect(bookImage.texture).toBe("closedBook")
        gui.selectToolbarItem(3)
        expect(gui.handbook.isVisible).toBe(true)
    })

    it("keeps the book selected when opening a monitor", () => {
        const { gui, scene } = createToolbar()
        gui.selectToolbarItem(3)
        gui.baseGUI = { isVisible: false, setVisibility: vi.fn() }
        gui.factoryGUI = { isVisible: false }
        gui.robotGUI = { isVisible: false, setVisibility: vi.fn() }
        gui.robotStatsGUI = { setVisibility: vi.fn() }
        gui.toggleScreen = vi.fn()
        gui.toggleRobotGUI(true)
        expect(gui.handbook.isVisible).toBe(true)
        expect(gui.playerTools.iconButtons[3].selected).toBe(true)
        expect(scene.player.playerState).toBe(PlayerState.holdingHandbook)
        gui.selectToolbarItem(3)
        expect(gui.handbook.isVisible).toBe(false)
    })
})
