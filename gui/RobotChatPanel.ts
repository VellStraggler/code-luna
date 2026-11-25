import type MainScene from "../CodeLuna"
import type PublicChat from "../main/PublicChat"
import { getChatPanelY, updateChatScrollOffset, wrapChatText } from "../main/gameRules"
import GameConstants, {
    CHAT_PANEL_BOTTOM_MARGIN,
    CHAT_PANEL_COLLAPSED_HEIGHT,
    CHAT_PANEL_CHARACTERS_PER_LINE,
    CHAT_PANEL_HEADER_HEIGHT,
    CHAT_PANEL_HEIGHT,
    CHAT_PANEL_PADDING,
    CHAT_PANEL_SCROLL_LINES,
    CHAT_PANEL_VISIBLE_LINES,
    CHAT_PANEL_WIDTH,
    WINDOW
} from "../main/constants"
import MyColors from "../main/MyColors"

export default class RobotChatPanel {
    readonly element: HTMLElement
    private readonly header: HTMLDivElement
    private readonly title: HTMLSpanElement
    private readonly toggle: HTMLButtonElement
    private readonly messages: HTMLDivElement
    private scrollOffset = 0
    private previousMaxOffset = 0
    private previousText = ""
    private rows: string[] = []
    private collapsed = true
    private scaleX = 1
    private scaleY = 1

    constructor(private scene: MainScene, private chat: PublicChat) {
        this.element = document.createElement("section")
        this.element.className = "robot-chat-panel"
        Object.assign(this.element.style, {
            position: "fixed",
            zIndex: "10",
            boxSizing: "border-box",
            width: `${CHAT_PANEL_WIDTH}px`,
            height: `${CHAT_PANEL_HEIGHT}px`,
            overflow: "hidden",
            transformOrigin: "top left",
            border: `${GameConstants.chat.outlineWidth}px solid ${MyColors.toCssHex(GameConstants.chat.outlineColor)}`,
            background: this.toRgba(GameConstants.chat.backgroundColor, GameConstants.chat.backgroundAlpha),
            color: GameConstants.chat.textColor,
            fontFamily: "sans-serif"
        })

        this.header = document.createElement("div")
        Object.assign(this.header.style, {
            position: "absolute",
            inset: "0 0 auto",
            display: "flex",
            height: `${CHAT_PANEL_HEADER_HEIGHT}px`,
            boxSizing: "border-box",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `0 ${CHAT_PANEL_PADDING}px`,
            background: MyColors.toCssHex(GameConstants.chat.headerColor),
            cursor: "pointer",
            userSelect: "none"
        })
        this.title = document.createElement("span")
        this.title.textContent = GameConstants.text.robotChatTitle
        Object.assign(this.title.style, {
            color: GameConstants.chat.titleColor,
            fontSize: `${GameConstants.chat.titleFontSize}px`,
            fontWeight: "bold",
            paddingBottom: "0"
        })
        this.toggle = document.createElement("button")
        this.toggle.type = "button"
        this.toggle.setAttribute("aria-label", GameConstants.text.robotChatTitle)
        Object.assign(this.toggle.style, {
            padding: "0",
            border: "0",
            background: "transparent",
            color: GameConstants.chat.textColor,
            font: `bold ${GameConstants.chat.toggleFontSize}px sans-serif`,
            lineHeight: "1",
            cursor: "pointer"
        })
        this.header.append(this.title, this.toggle)
        this.header.addEventListener("click", event => {
            event.stopPropagation()
            this.setCollapsed(!this.collapsed)
        })
        this.toggle.addEventListener("click", event => {
            event.stopPropagation()
            this.setCollapsed(!this.collapsed)
        })

        this.messages = document.createElement("div")
        Object.assign(this.messages.style, {
            position: "absolute",
            left: `${CHAT_PANEL_PADDING}px`,
            right: `${CHAT_PANEL_PADDING}px`,
            bottom: `${CHAT_PANEL_PADDING}px`,
            overflow: "hidden",
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            color: GameConstants.chat.textColor,
            fontSize: `${GameConstants.chat.messageFontSize}px`,
            lineHeight: `${GameConstants.chat.messageFontSize + GameConstants.chat.messageLineSpacing}px`
        })
        this.element.append(this.header, this.messages)
        this.element.addEventListener("wheel", event => {
            event.preventDefault()
            event.stopPropagation()
            if (!this.collapsed) {
                this.setScrollOffset(
                    this.scrollOffset + Math.sign(event.deltaY) * CHAT_PANEL_SCROLL_LINES
                )
            }
        }, { passive: false })
        for (const event of ["pointerdown", "pointerup", "keydown", "keyup"]) {
            this.element.addEventListener(event, event => event.stopPropagation())
        }
        document.body.appendChild(this.element)
        window.addEventListener("resize", this.position)
        this.scene.events.once("shutdown", () => {
            window.removeEventListener("resize", this.position)
            this.element.remove()
        })
        this.position()
        this.update()
        this.setCollapsed(true)
    }

    update() {
        const nextRows = wrapChatText(this.chat.getText(), CHAT_PANEL_CHARACTERS_PER_LINE)
        const nextText = nextRows.join("\n")
        if (nextText === this.previousText) return

        this.rows = nextRows
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
        const panelY = getChatPanelY(
            WINDOW.y,
            CHAT_PANEL_HEIGHT,
            CHAT_PANEL_BOTTOM_MARGIN,
            this.collapsed,
            CHAT_PANEL_COLLAPSED_HEIGHT
        )
        return x >= CHAT_PANEL_PADDING && x <= CHAT_PANEL_PADDING + CHAT_PANEL_WIDTH &&
            y >= panelY && y <= panelY + (this.collapsed ? CHAT_PANEL_COLLAPSED_HEIGHT : CHAT_PANEL_HEIGHT)
    }

    private readonly position = () => {
        const canvas = this.scene.game.canvas.getBoundingClientRect()
        this.scaleX = canvas.width / this.scene.scale.gameSize.width
        this.scaleY = canvas.height / this.scene.scale.gameSize.height
        const y = getChatPanelY(
            WINDOW.y,
            CHAT_PANEL_HEIGHT,
            CHAT_PANEL_BOTTOM_MARGIN,
            this.collapsed,
            CHAT_PANEL_COLLAPSED_HEIGHT
        )
        Object.assign(this.element.style, {
            left: `${canvas.left + CHAT_PANEL_PADDING * this.scaleX}px`,
            top: `${canvas.top + y * this.scaleY}px`,
            transform: `scale(${this.scaleX}, ${this.scaleY})`
        })
    }

    private setScrollOffset(offset: number) {
        this.scrollOffset = Math.max(0, Math.min(offset, this.previousMaxOffset))
        this.renderVisibleRows()
    }

    private renderVisibleRows() {
        this.messages.textContent = this.rows.slice(
            this.scrollOffset,
            this.scrollOffset + CHAT_PANEL_VISIBLE_LINES
        ).join("\n")
    }

    private setCollapsed(collapsed: boolean) {
        this.collapsed = collapsed
        this.toggle.textContent = collapsed
            ? GameConstants.text.chatCollapsedLabel
            : GameConstants.text.chatExpandedLabel
        this.toggle.setAttribute("aria-expanded", String(!collapsed))
        this.element.style.height = `${collapsed ? CHAT_PANEL_COLLAPSED_HEIGHT : CHAT_PANEL_HEIGHT}px`
        const headerHeight = collapsed
            ? CHAT_PANEL_HEADER_HEIGHT
            : GameConstants.chat.expandedHeaderHeight
        this.header.style.height = `${headerHeight}px`
        const bottomPadding = collapsed
            ? GameConstants.chat.titleBottomPadding
            : 0
        this.title.style.paddingBottom = `${bottomPadding}px`
        this.toggle.style.paddingBottom = collapsed
            ? `${GameConstants.chat.toggleBottomPadding}px`
            : "0"
        this.messages.style.top = `${headerHeight + CHAT_PANEL_PADDING}px`
        this.messages.style.display = collapsed ? "none" : "block"
        this.position()
    }

    private toRgba(color: number, alpha: number) {
        return `rgba(${(color >> 16) & 0xff}, ${(color >> 8) & 0xff}, ${color & 0xff}, ${alpha})`
    }
}
