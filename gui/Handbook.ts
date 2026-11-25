import type MainScene from "../CodeLuna"
import GameConstants, { WINDOW } from "../main/constants"
import MyColors from "../main/MyColors"

export default class Handbook {
    readonly element: HTMLElement
    private page = 0
    private readonly title: HTMLHeadingElement
    private readonly body: HTMLDivElement
    private readonly pageNumber: HTMLSpanElement
    private readonly back: HTMLButtonElement
    private readonly next: HTMLButtonElement
    private positionX = GameConstants.handbook.horizontalMargin
    private positionY = (WINDOW.y - GameConstants.handbook.height) / 2
    private scaleX = 1
    private scaleY = 1

    constructor(private scene: MainScene, bringForward: () => void, close: () => void) {
        Object.assign(this.scene.game.canvas.style, {
            position: "relative",
            zIndex: "1"
        })
        this.element = document.createElement("section")
        this.element.className = "game-handbook"
        Object.assign(this.element.style, {
            position: "fixed",
            zIndex: "10000",
            display: "none",
            boxSizing: "border-box",
            width: `${GameConstants.handbook.width}px`,
            height: `${GameConstants.handbook.height}px`,
            padding: `${GameConstants.handbook.padding}px`,
            overflow: "hidden",
            transformOrigin: "top left",
            flexDirection: "column",
            background: MyColors.toCssHex(MyColors.handbookBackground),
            border: `${GameConstants.handbook.borderWidth}px solid ${MyColors.toCssHex(MyColors.handbookBorder)}`,
            color: MyColors.toCssHex(MyColors.handbookText),
            fontFamily: "sans-serif"
        })

        const style = document.createElement("style")
        style.textContent = `
            .game-handbook { user-select:none; }
            .game-handbook .handbook-drag-bar { height:${GameConstants.handbook.dragBarHeight}px;flex:none;cursor:move;background:${MyColors.toCssHex(MyColors.handbookDragBar)};touch-action:none; }
            .game-handbook h2 { margin:12px 0;font-size:${GameConstants.handbook.titleFontSize}px; }
            .game-handbook .handbook-body { flex:1;overflow:auto;white-space:pre-wrap;font-size:${GameConstants.handbook.bodyFontSize}px;line-height:1.45; }
            .game-handbook .handbook-footer { display:flex;align-items:center;justify-content:space-between;margin-top:${GameConstants.handbook.footerMarginTop}px; }
            .game-handbook button { border:0;background:transparent;color:${MyColors.toCssHex(MyColors.handbookBorder)};font-size:${GameConstants.handbook.buttonFontSize}px;font-weight:bold;cursor:pointer; }
            .game-handbook .handbook-close { position:absolute;top:4px;right:4px;font-size:${GameConstants.handbook.closeButtonFontSize}px; }
        `
        this.element.appendChild(style)

        const dragBar = document.createElement("div")
        dragBar.className = "handbook-drag-bar"
        dragBar.addEventListener("pointerdown", event => {
            if (event.button !== 0) return
            event.preventDefault()
            event.stopPropagation()
            bringForward()
            dragBar.setPointerCapture(event.pointerId)
            const startX = event.clientX
            const startY = event.clientY
            const initialX = this.positionX
            const initialY = this.positionY
            const move = (moveEvent: PointerEvent) => {
                this.positionX = Math.max(0, Math.min(
                    WINDOW.x - GameConstants.handbook.width,
                    initialX + (moveEvent.clientX - startX) / this.scaleX
                ))
                this.positionY = Math.max(0, Math.min(
                    WINDOW.y - GameConstants.handbook.height,
                    initialY + (moveEvent.clientY - startY) / this.scaleY
                ))
                this.applyPosition()
            }
            const stop = () => {
                dragBar.removeEventListener("pointermove", move)
                dragBar.removeEventListener("pointerup", stop)
                dragBar.removeEventListener("pointercancel", stop)
            }
            dragBar.addEventListener("pointermove", move)
            dragBar.addEventListener("pointerup", stop, { once: true })
            dragBar.addEventListener("pointercancel", stop, { once: true })
        })

        this.title = document.createElement("h2")
        this.body = document.createElement("div")
        this.body.className = "handbook-body"
        const footer = document.createElement("div")
        footer.className = "handbook-footer"
        this.pageNumber = document.createElement("span")
        const makeButton = (text: string, label: string, action: () => void) => {
            const button = document.createElement("button")
            button.type = "button"
            button.textContent = text
            button.setAttribute("aria-label", label)
            button.addEventListener("pointerdown", event => {
                event.stopPropagation()
                bringForward()
            })
            button.addEventListener("click", event => {
                event.stopPropagation()
                action()
            })
            return button
        }
        this.back = makeButton("\u25c0", GameConstants.text.handbookPrevious, () => this.turn(-1))
        this.next = makeButton("\u25b6", GameConstants.text.handbookNext, () => this.turn(1))
        const closeButton = makeButton("X", GameConstants.text.handbookClose, close)
        closeButton.className = "handbook-close"
        footer.append(this.back, this.pageNumber, this.next)
        this.element.append(dragBar, this.title, this.body, footer, closeButton)
        this.element.addEventListener("pointerdown", event => {
            event.stopPropagation()
            bringForward()
        })
        for (const event of ["keydown", "keyup", "wheel"]) {
            this.element.addEventListener(event, event => event.stopPropagation())
        }
        document.body.appendChild(this.element)
        this.scene.events.once("shutdown", () => this.element.remove())
        this.render()
        this.position()
    }

    setVisible(visible: boolean) {
        this.element.style.display = visible ? "flex" : "none"
        if (visible) this.position()
    }

    get isVisible() {
        return this.element.style.display !== "none"
    }

    setAboveGame(above: boolean) {
        this.element.style.zIndex = above ? "10000" : "9998"
    }

    position() {
        const canvas = this.scene.game.canvas.getBoundingClientRect()
        this.scaleX = canvas.width / this.scene.scale.gameSize.width
        this.scaleY = canvas.height / this.scene.scale.gameSize.height
        this.applyPosition(canvas.left, canvas.top)
    }

    private applyPosition(left = this.scene.game.canvas.getBoundingClientRect().left,
        top = this.scene.game.canvas.getBoundingClientRect().top) {
        this.element.style.left = `${left + this.positionX * this.scaleX}px`
        this.element.style.top = `${top + this.positionY * this.scaleY}px`
        this.element.style.transform = `scale(${this.scaleX}, ${this.scaleY})`
    }

    private turn(direction: number) {
        const nextPage = this.page + direction
        if (nextPage < 0 || nextPage >= GameConstants.handbookPages.length) {
            this.scene.cancelAction()
            return
        }
        this.page = nextPage
        this.render()
    }

    private render() {
        this.title.textContent = GameConstants.handbookPages[this.page].title
        this.body.textContent = GameConstants.handbookPages[this.page].body
        this.pageNumber.textContent = `${this.page + 1} / ${GameConstants.handbookPages.length}`
        this.back.style.opacity = this.page === 0
            ? String(GameConstants.handbook.pageDisabledOpacity)
            : "1"
        this.next.style.opacity = this.page === GameConstants.handbookPages.length - 1
            ? String(GameConstants.handbook.pageDisabledOpacity)
            : "1"
    }
}
