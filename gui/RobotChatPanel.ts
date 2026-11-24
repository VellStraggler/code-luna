import * as Phaser from "phaser"
import MainScene from "../CodeLuna"
import PublicChat from "../main/PublicChat"
import { getChatPanelY, updateChatScrollOffset, wrapChatText } from "../main/gameRules"
import {
    CHAT_PANEL_BOTTOM_MARGIN,
    CHAT_PANEL_COLLAPSED_HEIGHT,
    CHAT_PANEL_CHARACTERS_PER_LINE,
    CHAT_PANEL_HEADER_HEIGHT,
    CHAT_PANEL_HEIGHT,
    CHAT_PANEL_PADDING,
    CHAT_PANEL_SCROLL_LINES,
    CHAT_PANEL_VISIBLE_LINES,
    CHAT_PANEL_WIDTH,
    GUI_DEPTH,
    WINDOW
} from "../main/constants"

export default class RobotChatPanel {
    readonly container: Phaser.GameObjects.Container
    private readonly background: Phaser.GameObjects.Rectangle
    private readonly messages: Phaser.GameObjects.Text
    private readonly viewportY = CHAT_PANEL_HEADER_HEIGHT + CHAT_PANEL_PADDING
    private scrollOffset = 0
    private previousMaxOffset = 0
    private previousText = ""
    private rows: string[] = []
    private collapsed = false
    private readonly wheelListener: (
        pointer: Phaser.Input.Pointer,
        objects: Phaser.GameObjects.GameObject[],
        deltaX: number,
        deltaY: number,
        deltaZ: number,
        event: WheelEvent
    ) => void

    constructor(private scene: MainScene, private chat: PublicChat) {
        const x = CHAT_PANEL_PADDING
        const y = getChatPanelY(
            WINDOW.y, CHAT_PANEL_HEIGHT, CHAT_PANEL_BOTTOM_MARGIN, false, CHAT_PANEL_COLLAPSED_HEIGHT
        )
        this.container = scene.add.container(x, y)
            .setScrollFactor(0)
            .setDepth(GUI_DEPTH)
            .setSize(CHAT_PANEL_WIDTH, CHAT_PANEL_HEIGHT)
        this.background = scene.add.rectangle(0, 0, CHAT_PANEL_WIDTH, CHAT_PANEL_HEIGHT, 0x000000, 0.7)
            .setOrigin(0)
        const header = scene.add.rectangle(0, 0, CHAT_PANEL_WIDTH, CHAT_PANEL_HEADER_HEIGHT, 0x163c66, 0.95)
            .setOrigin(0)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", (_pointer: unknown, _x: unknown, _y: unknown, event: Phaser.Types.Input.EventData) => {
                event.stopPropagation()
                this.setCollapsed(!this.collapsed)
            })
        const title = scene.add.text(CHAT_PANEL_PADDING, CHAT_PANEL_HEADER_HEIGHT / 2, "Robot chat", {
            fontSize: "13px", color: "#ffffff", fontStyle: "bold"
        }).setOrigin(0, 0.5)
        const toggle = scene.add.text(
            CHAT_PANEL_WIDTH - CHAT_PANEL_PADDING,
            CHAT_PANEL_HEADER_HEIGHT / 2,
            "\u2212",
            {
            fontSize: "17px", color: "#ffffff", fontStyle: "bold"
            }
        ).setOrigin(1, 0.5).setInteractive({ useHandCursor: true })
            .on("pointerdown", (_pointer: unknown, _x: unknown, _y: unknown, event: Phaser.Types.Input.EventData) => {
                event.stopPropagation()
                this.setCollapsed(!this.collapsed)
            })
        this.messages = scene.add.text(
            CHAT_PANEL_PADDING,
            this.viewportY,
            "",
            {
                fontSize: "12px",
                color: "#ffffff",
                lineSpacing: 2
            }
        )
        this.container.add([this.background, header, title, toggle, this.messages])

        this.wheelListener = (pointer, _objects, _deltaX, deltaY, _deltaZ, event) => {
            if (this.collapsed || !this.containsPoint(pointer.x, pointer.y)) return
            event.stopPropagation()
            this.setScrollOffset(this.scrollOffset + Math.sign(deltaY) * CHAT_PANEL_SCROLL_LINES)
        }
        scene.input.on("wheel", this.wheelListener)
        scene.events.once("shutdown", () => {
            scene.input.off("wheel", this.wheelListener)
        })
        this.update()
    }

    update() {
        const nextRows = wrapChatText(this.chat.getText(), CHAT_PANEL_CHARACTERS_PER_LINE)
        const nextText = nextRows.join("\n")
        if (nextText === this.previousText) return

        this.rows = nextRows
        this.messages.setText(this.rows.slice(
            this.scrollOffset,
            this.scrollOffset + CHAT_PANEL_VISIBLE_LINES
        ).join("\n"))
        this.previousText = nextText
        const nextMaxOffset = Math.max(0, this.rows.length - CHAT_PANEL_VISIBLE_LINES)
        this.scrollOffset = updateChatScrollOffset(
            this.scrollOffset,
            this.previousMaxOffset,
            nextMaxOffset
        )
        this.previousMaxOffset = nextMaxOffset
        this.renderVisibleRows()
    }

    containsPoint(x: number, y: number) {
        const left = this.container.x
        const top = this.container.y
        return x >= left && x <= left + CHAT_PANEL_WIDTH &&
            y >= top && y <= top + this.background.height
    }

    private setScrollOffset(offset: number) {
        this.scrollOffset = Math.max(0, Math.min(offset, this.previousMaxOffset))
        this.renderVisibleRows()
    }

    private renderVisibleRows() {
        this.messages
            .setY(this.viewportY)
            .setText(this.rows.slice(
                this.scrollOffset,
                this.scrollOffset + CHAT_PANEL_VISIBLE_LINES
            ).join("\n"))
    }

    private setCollapsed(collapsed: boolean) {
        this.collapsed = collapsed
        const height = collapsed ? CHAT_PANEL_COLLAPSED_HEIGHT : CHAT_PANEL_HEIGHT
        this.container.setSize(
            CHAT_PANEL_WIDTH,
            height
        ).setY(getChatPanelY(
            WINDOW.y,
            CHAT_PANEL_HEIGHT,
            CHAT_PANEL_BOTTOM_MARGIN,
            collapsed,
            CHAT_PANEL_COLLAPSED_HEIGHT
        ))
        this.background.setSize(
            CHAT_PANEL_WIDTH,
            height
        )
        this.messages.setVisible(!collapsed)
    }
}
