import type MainScene from "../CodeLuna"
import { GUI_DEPTH, WINDOW } from "../main/constants"

const pages = [
    {
        title: "WELCOME TO LUNA",
        body: "Your goal is to gather Cosmorite gas and ship it back to Earth.\n\n" +
            "Mine deposits yourself or build programmable robots. Return resources to the player base, " +
            "then deploy gas until the quota is met.\n\n" +
            "Move with WASD or the arrow keys. Select a tool from the numbered toolbar."
    },
    {
        title: "ROBOTS & FACTORIES",
        body: "Approach a CPU or factory and open its monitor. Factories build blocks and parts from " +
            "your resources or the robot's storage.\n\n" +
            "In a CPU monitor, add and edit functions, then press play. Programs keep running when " +
            "the monitor closes. Robots unload resources near the base."
    },
    {
        title: "ROBOT API: ACTIONS",
        body: "move(x, y) - move relative to the robot\n" +
            "aim(x, y), shoot(x, y) - aim or fire at world coordinates\n" +
            "goToMine(), goHome() - set a destination\n" +
            "selectBlock(name), place(x, y, factoryIndex)\n" +
            "weld() - connect nearby blocks\n" +
            "wait(seconds) - pause the program\n" +
            "print(value) - write to public chat"
    },
    {
        title: "ROBOT API: QUERIES",
        body: "canMove(), canMine(), hasCpu(), hasDrill()\n\n" +
            "getLunestone(), getCosmorite(), getFreeStorage(), getMeterRange()\n\n" +
            "getChatText() returns all chat lines. getChatText(0) returns the oldest line; " +
            "indices 0-49 address up to the latest 50 lines. Missing lines return an empty string.\n\n" +
            "Programs support assignments, if/else, while, return and function calls."
    },
    {
        title: "FIELD WARNINGS",
        body: "It is advised to not go through rocky zones, as the moon snakes will most certainly get you\n\n" +
            "Robots need storage space to continue mining and gas to move or fire.\n\n" +
            "A launch consumes its payload plus 100 gas. The quota updates when the rocket has departed."
    }
]

export default class Handbook {
    readonly container: Phaser.GameObjects.Container
    private page = 0
    private title: Phaser.GameObjects.Text
    private body: Phaser.GameObjects.Text
    private pageNumber: Phaser.GameObjects.Text
    private back: Phaser.GameObjects.Text
    private next: Phaser.GameObjects.Text

    constructor(private scene: MainScene, bringForward: () => void, close: () => void) {
        this.container = scene.add.container(20, (WINDOW.y - 500) / 2)
            .setSize(300, 500).setScrollFactor(0).setDepth(GUI_DEPTH + 2).setVisible(false)
        const cover = scene.add.rectangle(0, 0, 300, 500, 0xf6f0df)
            .setOrigin(0).setStrokeStyle(4, 0x55483e)
            .setInteractive().on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, event: Phaser.Types.Input.EventData) => {
                event.stopPropagation()
                bringForward()
            })
        this.title = scene.add.text(24, 28, "", {
            fontSize: "19px", fontStyle: "bold", color: "#40372e", wordWrap: { width: 252 }
        })
        this.body = scene.add.text(24, 76, "", {
            fontSize: "15px", color: "#40372e", lineSpacing: 4, wordWrap: { width: 252 }
        })
        this.pageNumber = scene.add.text(150, 468, "", { fontSize: "13px", color: "#685a4b" }).setOrigin(0.5)
        const button = (x: number, y: number, label: string, action: () => void) =>
            scene.add.text(x, y, label, { fontSize: "22px", fontStyle: "bold", color: "#55483e",
                padding: { x: 8, y: 4 } }).setOrigin(0.5).setInteractive({ useHandCursor: true })
                .on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, event: Phaser.Types.Input.EventData) => {
                    event.stopPropagation()
                    bringForward()
                    action()
                })
        this.back = button(30, 468, "\u25c0", () => this.turn(-1))
        this.next = button(270, 468, "\u25b6", () => this.turn(1))
        const exit = button(278, 18, "X", close)
        this.container.add([cover, this.title, this.body, this.pageNumber, this.back, this.next, exit])
        this.render()
    }

    private turn(direction: number) {
        const next = this.page + direction
        if (next < 0 || next >= pages.length) {
            this.scene.cancelAction()
            return
        }
        this.page = next
        this.render()
    }

    private render() {
        this.title.setText(pages[this.page].title)
        this.body.setText(pages[this.page].body)
        this.pageNumber.setText(`${this.page + 1} / ${pages.length}`)
        this.back.setAlpha(this.page === 0 ? 0.3 : 1)
        this.next.setAlpha(this.page === pages.length - 1 ? 0.3 : 1)
    }
}
