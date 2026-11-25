import type MainScene from "../CodeLuna"
import type ModularRobot from "../bots/ModularRobot"
import GameConstants, { GUI_DEPTH, GUI_MARGIN } from "../main/constants"
import MyColors from "../main/MyColors"
import PythonFunctions, { type RobotFunction } from "../main/PythonFunctions"
import { removeLegacyStarterFunctions } from "../main/gameRules"

export default class RobotFunctionEditor {
    private element: HTMLDivElement
    private viewport: HTMLDivElement
    private robot: ModularRobot | null = null
    private keyboardWasEnabled: boolean | null = null
    private visible = false

    constructor(private scene: MainScene, bringForward: () => void = () => {}) {
        this.element = document.createElement("div")
        this.element.className = "robot-function-editor"
        this.element.style.display = "none"
        this.element.innerHTML = `
            <style>
                .robot-function-editor { position:fixed;box-sizing:border-box;flex-direction:column;color:${MyColors.toCssHex(MyColors.white)};font:14px monospace;transform-origin:top left;z-index:${GUI_DEPTH + 4}; }
                .robot-function-editor .function-list { flex:1;min-height:0;overflow-y:scroll;overflow-x:hidden;overscroll-behavior:contain;scrollbar-color:${MyColors.toCssHex(MyColors.white)} ${MyColors.toCssHex(MyColors.editorScrollbarTrack)};scrollbar-width:thin; }
                .robot-function-editor section { padding:2px 4px 6px 0;border-bottom:1px solid ${MyColors.toCssHex(MyColors.whiteAlpha40)}; }
                .robot-function-editor .function-heading { display:flex;align-items:center;gap:4px;min-height:28px; }
                .robot-function-editor .function-signature { display:inline-flex;align-items:center;min-width:0; }
                .robot-function-editor .function-signature span { flex-shrink:0; }
                .robot-function-editor input { min-width:1ch;flex:0 1 auto;box-sizing:content-box;padding:0;border:0;background:transparent;color:inherit;font:inherit; }
                .robot-function-editor button { flex-shrink:0;padding:2px 4px;border:1px solid ${MyColors.toCssHex(MyColors.white)};background:${MyColors.toCssHex(MyColors.editorBackground)};color:inherit;font:inherit;cursor:pointer; }
                .robot-function-editor .play-function { background:transparent; }
                .robot-function-editor .expand-function { margin-left:auto;border:0;background:transparent;outline:none; }
                .robot-function-editor .delete-function { border:0;background:transparent; }
                .robot-function-editor .delete-function:not([hidden]) { margin-left:auto; }
                .robot-function-editor .delete-function:not([hidden]) + .expand-function { margin-left:0; }
                .robot-function-editor .function-error { margin-top:4px;color:${MyColors.toCssHex(MyColors.editorError)};white-space:pre-wrap;overflow-wrap:anywhere; }
                .robot-function-editor textarea { box-sizing:border-box;width:100%;min-height:60px;margin-top:4px;padding:4px;border:1px solid ${MyColors.toCssHex(MyColors.white)};background:${MyColors.toCssHex(MyColors.editorBackground)};color:inherit;font:inherit;line-height:20px;resize:none;overflow:hidden; }
                .robot-function-editor .function-actions { display:flex;gap:4px;margin-top:4px; }
                .robot-function-editor .function-actions button { flex:1;min-height:28px;text-align:center; }
            </style>
            <div class="function-list" aria-label="${GameConstants.text.functionEditorLabel}"></div>
            <div class="function-actions">
                <button type="button" class="add-function">${GameConstants.text.functionEditorAdd}</button>
                <button type="button" class="stop-function">${GameConstants.text.functionEditorStop}</button>
            </div>
        `
        this.viewport = this.element.querySelector<HTMLDivElement>(".function-list")!
        this.element.querySelector<HTMLButtonElement>(".stop-function")!.addEventListener("click", () => {
            this.robot?.program?.cancel()
        })
        this.element.querySelector<HTMLButtonElement>(".add-function")!.addEventListener("click", () => {
            if (!this.robot) return
            const functions = this.robot.functions!
            const definition = {
                name: `${GameConstants.text.functionDefaultNamePrefix}${functions.length + 1}`,
                body: "",
                expanded: true
            }
            functions.push(definition)
            const name = this.appendFunction(definition)
            this.viewport.scrollTop = this.viewport.scrollHeight
            name.focus()
            name.select()
        })
        this.element.addEventListener("focusin", event => {
            if (!(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) return
            if (this.keyboardWasEnabled !== null) return
            const keyboard = this.scene.input.keyboard
            this.keyboardWasEnabled = keyboard?.enabled ?? false
            keyboard?.resetKeys()
            if (keyboard) keyboard.enabled = false
            this.scene.typing = true
            this.scene.player.setVelocity(0, 0)
        })
        this.element.addEventListener("focusout", event => {
            if (!(event.relatedTarget instanceof HTMLInputElement) &&
                !(event.relatedTarget instanceof HTMLTextAreaElement)) this.restoreKeyboard()
        })
        for (const event of ["pointerdown", "keydown", "keyup", "wheel"]) {
            this.element.addEventListener(event, event => {
                if (event.type === "pointerdown") bringForward()
                event.stopPropagation()
            })
        }
        document.body.appendChild(this.element)
        this.scene.events.once("shutdown", () => {
            this.blur()
            this.element.remove()
        })
    }

    public setRobot(robot: ModularRobot | null) {
        if (this.robot === robot) return
        this.blur()
        this.robot = robot
        this.viewport.replaceChildren()
        if (!robot) return
        const functions = removeLegacyStarterFunctions(robot.functions ?? [])
        robot.functions = functions
        for (const definition of functions) this.appendFunction(definition)
        this.viewport.scrollTop = 0
    }

    private appendFunction(definition: RobotFunction) {
        const row = document.createElement("section")
        row.innerHTML = `
            <div class="function-heading">
                <button type="button" class="play-function" aria-label="${GameConstants.text.functionEditorRun}" title="${GameConstants.text.functionEditorRun}">&#9654;</button>
                <span class="function-signature">
                    <input type="text" aria-label="${GameConstants.text.functionName}" spellcheck="false" autocomplete="off">
                    <span>()</span>
                </span>
                <button type="button" class="delete-function" aria-label="${GameConstants.text.functionEditorDelete}" title="${GameConstants.text.functionEditorDelete}">&#128465;</button>
                <button type="button" class="expand-function" aria-label="${GameConstants.text.functionEditorToggle}"></button>
            </div>
            <textarea aria-label="${GameConstants.text.functionBodyLabel}" placeholder="${GameConstants.text.functionBody}" spellcheck="false" autocapitalize="off"></textarea>
            <div class="function-error" role="alert" hidden></div>
        `
        const name = row.querySelector<HTMLInputElement>("input")!
        const play = row.querySelector<HTMLButtonElement>(".play-function")!
        const toggle = row.querySelector<HTMLButtonElement>(".expand-function")!
        const remove = row.querySelector<HTMLButtonElement>(".delete-function")!
        const body = row.querySelector<HTMLTextAreaElement>("textarea")!
        const error = row.querySelector<HTMLDivElement>(".function-error")!
        if (definition.error) {
            error.textContent = definition.error
            error.hidden = false
        }
        name.value = definition.name
        const resizeName = () => name.style.width = `${Math.max(1, name.value.length)}ch`
        resizeName()
        name.addEventListener("input", () => {
            definition.name = name.value
            resizeName()
        })
        play.addEventListener("click", () => {
            const robot = this.robot
            if (!robot) return
            definition.error = undefined
            error.hidden = true
            try {
                if (!robot.program) robot.program = new PythonFunctions(this.scene, robot)
                robot.program.run(robot.functions!, definition.name, message => {
                    this.scene.cancelAction()
                    definition.error = message
                    error.textContent = message
                    error.hidden = false
                })
            } catch (cause) {
                this.scene.cancelAction()
                definition.error = cause instanceof Error ? cause.message : String(cause)
                error.textContent = definition.error
                error.hidden = false
            }
        })
        body.value = definition.body
        body.addEventListener("input", () => {
            definition.body = body.value
            this.resizeBody(body)
        })
        const updateExpansion = () => {
            remove.hidden = !definition.expanded
            toggle.textContent = definition.expanded ? "\u25B2" : "\u25BC"
            toggle.setAttribute("aria-expanded", String(definition.expanded))
            body.hidden = !definition.expanded
            if (definition.expanded) this.resizeBody(body)
        }
        remove.addEventListener("click", () => {
            const functions = this.robot?.functions
            if (!functions) return
            const index = functions.indexOf(definition)
            if (index < 0) return
            this.robot?.program?.cancel()
            functions.splice(index, 1)
            row.remove()
        })
        toggle.addEventListener("click", () => {
            definition.expanded = !definition.expanded
            updateExpansion()
        })
        this.viewport.appendChild(row)
        updateExpansion()
        return name
    }

    private resizeBody(body: HTMLTextAreaElement) {
        body.style.height = "0px"
        body.style.height = `${body.scrollHeight + 2}px`
    }

    private restoreKeyboard() {
        if (this.keyboardWasEnabled === null) return
        if (this.scene.input.keyboard) this.scene.input.keyboard.enabled = this.keyboardWasEnabled
        this.keyboardWasEnabled = null
        this.scene.typing = false
    }

    private blur() {
        const focused = document.activeElement
        if (focused instanceof HTMLElement && this.element.contains(focused)) focused.blur()
        this.restoreKeyboard()
    }

    public setVisible(visible: boolean) {
        if (this.visible === visible) return
        this.visible = visible
        if (!visible) this.blur()
        this.element.style.display = visible ? "flex" : "none"
        if (visible) {
            for (const body of this.viewport.querySelectorAll<HTMLTextAreaElement>("textarea:not([hidden])")) {
                this.resizeBody(body)
            }
        }
    }

    public setBelowHandbook(below: boolean) {
        this.element.style.zIndex = below ? "9999" : "10002"
    }

    public position(screen: Phaser.GameObjects.Container) {
        const canvas = this.scene.game.canvas.getBoundingClientRect()
        const scaleX = canvas.width / this.scene.scale.gameSize.width
        const scaleY = canvas.height / this.scene.scale.gameSize.height
        const position = screen.getWorldTransformMatrix().transformPoint(GUI_MARGIN, GUI_MARGIN)
        this.element.style.width = `${screen.width - GUI_MARGIN * 2}px`
        this.element.style.height = `${screen.height - GUI_MARGIN * 2}px`
        this.element.style.left = `${canvas.left + position.x * scaleX}px`
        this.element.style.top = `${canvas.top + position.y * scaleY}px`
        this.element.style.transform = `scale(${scaleX}, ${scaleY})`
    }
}
