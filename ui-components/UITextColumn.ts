import MainScene from "../CodeLuna";
import GameConstants, { TEXT_SPACING, TOOLBOX_SPACING, TOOLBOX_WIDTH } from "../main/constants";
import GameGeometry from "../main/GameGeometry";
import { PlayerState } from "../player/Player";
import UIComponent, { type UIObject } from "./UIComponent"
import UIStatLine, { UIFormattedStatLine, UIIconButton, UIIconStatLine, UIStatButtonLine, UITextButtonLine, UITextLine } from "./StatMessage";
import UITextRow from "./UITextRow"

export default class UIColumn implements UIComponent {
    private scene: MainScene
    public list: UITextLine[] = []
    private components: UIComponent[] = []
    public iconButtons: UIIconButton[] = []
    public x: number
    public y: number
    public latestY: number
    public isVisible: boolean
    public backgroundRect: Phaser.GameObjects.Rectangle | null
    public readonly align: string
    private fontSize = GameConstants.ui.defaultFontSize
    private maxTextWidth = Infinity

    constructor(
        scene: MainScene, 
        x:number = TEXT_SPACING, 
        y:number = TEXT_SPACING,
        startVisible: boolean = true,
        align: string = "left",
        width: number = 0,
        height: number = 0,
        backgroundColor: number | null = null,
    ) {
        this.scene = scene
        this.x = x
        this.y = y
        this.latestY = y
        this.isVisible = startVisible
        this.align = align

        if (width != 0 && height != 0 && backgroundColor != null) {
            console.log("Creating background")
            let origin = GameGeometry.originForAlignment(align)
            this.backgroundRect = scene.add.rectangle(x, y, width, height, backgroundColor)
                .setVisible(this.isVisible)
                .setOrigin(origin.x, origin.y)
            // this.scene.cameras.main.ignore(this.backgroundRect)
        } else {
            this.backgroundRect = null
        }
    }

    public addIconStatLine(
        phaserName: string,
        msg: string,
        getVariable: () => any,
        reservedWidth: number = 0,
        fontHeight: number = GameConstants.ui.defaultFontSize,
        backgroundColor?: number,
        foregroundColor?: number
    ) {
        const line = new UIIconStatLine(
            this.scene,
            this.x,
            this.latestY,
            phaserName,
            msg,
            getVariable,
            this.align,
            fontHeight,
            backgroundColor,
            foregroundColor
        )
        line.reservedWidth = reservedWidth
        return this.addStatMessage(line)
    }

    public addStatLine(
        msg: string,
        getVariable: () => any,
        fontHeight: number = GameConstants.ui.defaultFontSize,
        backgroundColor?: number,
        foregroundColor?: number
    ) {
        return this.addStatMessage(
            new UIStatLine(
                this.scene,
                this.x,
                this.latestY,
                msg,
                getVariable,
                this.align,
                fontHeight,
                backgroundColor,
                foregroundColor
            )
        )
    }

    public addFormattedStatLine(format: () => string, fontHeight = GameConstants.ui.defaultFontSize) {
        return this.addStatMessage(
            new UIFormattedStatLine(this.scene, this.x, this.latestY, format, this.align, fontHeight)
        )
    }

    public addButtonLine(msg: string, onClick: () => any, fontHeight: number = GameConstants.ui.defaultFontSize) {
        return this.addStatMessage(
            new UITextButtonLine(
                this.scene,
                this.x,
                this.latestY,
                msg,
                onClick,
                this.align,
                fontHeight
            )
        )
    }

    public addStatButtonLine(msg: string, onClick: () => any, fontHeight: number = GameConstants.ui.defaultFontSize) {
        return this.addStatMessage(
            new UIStatButtonLine(
                this.scene,
                this.x,
                this.latestY,
                msg,
                onClick,
                this.align,
                fontHeight
            )
        )
    }

    public addTextLine(msg: string, fontHeight: number = GameConstants.ui.defaultFontSize) {
        return this.addStatMessage(
            new UITextLine(this.scene, this.x, this.latestY, msg, this.align, fontHeight)
        )
    }

    public addStatMessage(message: UITextLine) {
        message.setPosition(this.x, this.latestY)
        message.setVisibility(this.isVisible)
        this.list.push(message)
        this.components.push(message)
        this.latestY += Math.max(TEXT_SPACING, message.getHeight())
        return this
    }

    public addRow(row: UITextRow) {
        return this.addComponent(row)
    }

    public addColumn(column: UIColumn) {
        return this.addComponent(column)
    }

    public addComponent(component: UIComponent) {
        component.setPosition(this.x, this.latestY)
        component.setVisibility(this.isVisible)
        this.components.push(component)
        this.latestY += Math.max(TEXT_SPACING, component.getHeight())
        return this
    }

    public update() {
        for (const component of this.components) {
            component.update()
        }
        if (Number.isFinite(this.maxTextWidth)) {
            this.setFontSize(this.fontSize, this.maxTextWidth)
        }
    }

    public setFontSize(size: number, maxWidth: number = Infinity) {
        this.fontSize = size
        this.maxTextWidth = maxWidth
        for (const line of this.list) {
            const textObjects = line instanceof UIStatLine
                ? [line.textObject, line.statObject]
                : [line.textObject]
            textObjects.forEach(text => text.setFontSize(size))
            const textWidth = textObjects.reduce((width, text) => width + text.width, 0)
            const availableWidth = maxWidth - (line.textObject.x - this.x) - line.reservedWidth
            if (textWidth > availableWidth) {
                const fittedSize = Math.max(1, Math.floor(size * availableWidth / textWidth))
                textObjects.forEach(text => text.setFontSize(fittedSize))
            }
            if (line instanceof UIStatLine) {
                line.statObject.setX(line.textObject.x + line.textObject.width)
                line.updateState()
            }
        }
        return this
    }

    public addIconButton(iconName: string, fun: () => boolean, closeMonitor = true) {
        const button = new UIIconButton(
                this.scene, 
                this.x, 
                this.latestY, 
                iconName, 
                () => {
                    if (closeMonitor) this.scene.GUI.selectTool()
                    fun()
                },
                () => this.deselectButtons(), this.iconButtons.length + 1)
        this.iconButtons.push(button)
        this.components.push(button)
        this.latestY += TOOLBOX_WIDTH + TOOLBOX_SPACING
        return this
    }

    public deselectButtons() {
        const wasEquipped = this.scene.player.playerState !== PlayerState.holdingNothing
        if (wasEquipped) this.scene.sound.play("unequip")
        this.scene.player.playerState = PlayerState.holdingNothing
        for (const button of this.iconButtons) button.deselect()
    }

    public activateIconButton(index: number) {
        this.iconButtons[index]?.activate()
    }

    public getObjects(): UIObject[] {
        return [
            ...(this.backgroundRect ? [this.backgroundRect] : []),
            ...this.components.flatMap(component => component.getObjects())
        ]
    }

    public getAsGameObjects() {
        return this.getObjects()
    }

    public setPosition(x: number, y: number): this {
        const dx = x - this.x
        const dy = y - this.y
        this.x = x
        this.y = y
        let nextY = y
        this.components.forEach(component => {
            component.setPosition(x, nextY)
            nextY += Math.max(TEXT_SPACING, component.getHeight())
        })
        this.latestY = nextY
        this.backgroundRect?.setPosition(this.backgroundRect.x + dx, this.backgroundRect.y + dy)
        return this
    }

    public getWidth() {
        return this.components.reduce((width, component) => Math.max(width, component.getWidth()), 0)
    }

    public getHeight() {
        return this.latestY - this.y
    }

    public setVisibility(isVisible: boolean) {
        this.isVisible = isVisible
        this.components.forEach(component => component.setVisibility(isVisible))
        this.backgroundRect?.setVisible(isVisible)
    }
}