import MainScene from "../CodeLuna"
import GameConstants, { GUI_DEPTH, TEXT_SPACING, TOOLBOX_OUTLINE, TOOLBOX_SPACING, TOOLBOX_WIDTH } from "../main/constants"
import GameGeometry from "../main/GameGeometry"
import MyColors from "../main/MyColors"
import { XY, xy } from "../main/XY"
import UIComponent, { type UIObject } from "./UIComponent"

export class UITextLine implements UIComponent {
    public readonly textObject: Phaser.GameObjects.Text
    public origin: XY = xy()
    public reservedWidth = 0

    constructor(
        scene: MainScene, 
        x:number, 
        y:number, 
        staticText: string,
        align: string = "left",
        fontHeight: number = GameConstants.ui.defaultFontSize
    ) {
        this.parseOrigin(align)
        this.textObject = scene.add.text(x, y, staticText)
            .setFontSize(fontHeight)
            .setScrollFactor(0)
            .setDepth(GUI_DEPTH)
            .setOrigin(this.origin.x, this.origin.y)
    }

    public parseOrigin(align: string) {
        this.origin = GameGeometry.originForAlignment(align)
        return this.origin
    }

    public getNextLineXY(): XY {
        return xy(this.textObject.x, this.textObject.y + TEXT_SPACING)
    }

    public setPosition(x: number, y: number): this {
        this.textObject.setPosition(x, y)
        return this
    }

    public getWidth() {
        return this.textObject.width
    }

    public getHeight() {
        return this.textObject.height
    }

    public updateState(): string {
        return this.textObject.text
    }

    public update() {
        this.updateState()
    }

    public setVisibility(visible: boolean) {
        this.getObjects().forEach(object => object.setVisible(visible))
    }

    public getObjects(): UIObject[] {
        return [this.textObject]
    }
}

/** non-standard alignment doesn't really work on this one... These will be centered on the given x-value*/
export class UIIconButton {
    selected: boolean = false
    private bg: Phaser.GameObjects.Rectangle
    private icon: Phaser.GameObjects.Image
    private numberBackground: Phaser.GameObjects.Arc
    private number: Phaser.GameObjects.Text
    private readonly onClick: () => any
    private readonly deselectAll: () => any

    constructor(scene: MainScene, x: number, y: number, iconName: string = GameConstants.toolbar.defaultIcon, onClick: () => any, deselectAll: () => any, number: number, private readonly onDeselect?: () => void) {
        this.onClick = onClick
        this.deselectAll = deselectAll
        this.bg = scene.add.rectangle(x, y, TOOLBOX_WIDTH, TOOLBOX_WIDTH, MyColors.green, 0.6)
            .setStrokeStyle(1, MyColors.white)
            .setInteractive({ useHandCursor: true })
            .setScrollFactor(0)
            .setDepth(GUI_DEPTH)
            .on('pointerdown', () => this.activate())
            
        this.icon = scene.add.image(this.bg.x, this.bg.y, iconName)
            .setScale(GameConstants.toolbar.iconScale)
            .setScrollFactor(0)
            .setDepth(GUI_DEPTH)
        this.number = scene.add.text(
            x - TOOLBOX_WIDTH / 2 + GameConstants.toolbar.numberXOffset,
            y - TOOLBOX_WIDTH / 2 + GameConstants.toolbar.numberYOffset,
            String(number), {
                fontSize: `${GameConstants.toolbar.numberFontSize}px`,
                color: GameConstants.toolbar.numberColor,
                fontStyle: "bold"
            }
        )
            .setScrollFactor(0)
            .setDepth(GUI_DEPTH + GameConstants.toolbar.numberTextDepthOffset)
        this.numberBackground = scene.add.circle(
            this.number.x + this.number.width / 2,
            this.number.y + this.number.height / 2,
            GameConstants.toolbar.numberBackgroundRadius,
            MyColors.white
        )
            .setScrollFactor(0)
            .setDepth(GUI_DEPTH + GameConstants.toolbar.numberBackgroundDepthOffset)
    }

    deselect() {
        const wasSelected = this.selected
        this.selected = false
        this.bg.setStrokeStyle(1, MyColors.white)
        if (wasSelected) this.onDeselect?.()
    }

    activate() {
        if (this.selected) {
            this.deselectAll()
        } else {
            this.deselectAll()
            this.onClick()
            this.select()
        }
    }
    setIcon(newIcon: string) {
        this.icon.setTexture(newIcon)
    }

    select() {
        this.selected = true
        this.bg.setStrokeStyle(TOOLBOX_OUTLINE, MyColors.white)
    }

    public setPosition(x: number, y: number) {
        const dx = x - this.bg.x
        const dy = y - this.bg.y
        this.bg.setPosition(x, y)
        this.icon.setPosition(this.icon.x + dx, this.icon.y + dy)
        this.numberBackground.setPosition(this.numberBackground.x + dx, this.numberBackground.y + dy)
        this.number.setPosition(this.number.x + dx, this.number.y + dy)
        return this
    }

    public getWidth() {
        return this.bg.width
    }

    public getHeight() {
        return this.bg.height + TOOLBOX_SPACING
    }

    public update() {}

    public setVisibility(visible: boolean) {
        this.getObjects().forEach(object => object.setVisible(visible))
    }
    public getObjects(): UIObject[] {
        return [this.bg, this.icon, this.numberBackground, this.number]
    }
}

export class UIFormattedStatLine extends UITextLine {
    constructor(scene: MainScene, x: number, y: number, private format: () => string,
        align = "left", fontHeight = GameConstants.ui.defaultFontSize) {
        super(scene, x, y, format(), align, fontHeight)
    }

    public override updateState() {
        const text = this.format()
        this.textObject.setText(text)
        return text
    }
}

export class StatMessage extends UITextLine {

    private readonly getVariable: () => any
    public statObject: Phaser.GameObjects.Text

    constructor(
        scene: MainScene, 
        x:number, 
        y:number, 
        staticPrefix: string, 
        getVariable: () => any,
        align: string = "left",
        fontHeight: number = GameConstants.ui.defaultFontSize,
        backgroundColor: number = MyColors.clear,
        foregroundColor: number = MyColors.white
    ) {
        super(scene, x, y, staticPrefix, align, fontHeight)
        this.getVariable = getVariable
        this.statObject = scene.add.text(
            x + this.textObject.width, 
            y, 
            String(getVariable())
        )
            .setFontSize(fontHeight)
            .setScrollFactor(0)
            .setDepth(GUI_DEPTH)
            .setOrigin(this.origin.x, this.origin.y)
        this.setColors(backgroundColor, foregroundColor)
    }

    public setColors(backgroundColor = MyColors.clear, foregroundColor = MyColors.white) {
        const cssBackground = backgroundColor === MyColors.clear
            ? ""
            : MyColors.toCssHex(backgroundColor)
        const cssColor = MyColors.toCssHex(foregroundColor)
        this.textObject.setBackgroundColor(cssBackground).setColor(cssColor)
        this.statObject.setBackgroundColor(cssBackground).setColor(cssColor)
        return this
    }

    public override setPosition(x: number, y: number): this {
        const dx = x - this.textObject.x
        const dy = y - this.textObject.y
        this.textObject.setPosition(x, y)
        this.statObject.setPosition(this.statObject.x + dx, this.statObject.y + dy)
        return this
    }

    public override updateState(): string {
        const value = this.getVariable() ?? 0
        this.statObject.text = typeof value === "number"
            ? value.toFixed(GameConstants.toolbar.statPrecision)
            : String(value)
        this.statObject.setX(this.textObject.x + this.textObject.width)
        return this.statObject.text
    }

    public override getWidth() {
        return this.textObject.width + this.statObject.width
    }

    public override getHeight() {
        return Math.max(this.textObject.height, this.statObject.height)
    }

    public override getObjects(): UIObject[] {
        return [this.textObject, this.statObject]
    }
}

export default StatMessage

export { StatMessage as UIStatLine }

export class UIIconStatLine extends StatMessage {
    public iconObject: Phaser.GameObjects.Image

    constructor(
        scene: MainScene, 
        x:number, y:number, 
        iconName: string, 
        staticPrefix: string, 
        getVariable: () => any,
        align: string = "left",
        fontHeight: number = GameConstants.ui.defaultFontSize,
        backgroundColor: number = MyColors.clear,
        foregroundColor: number = MyColors.white
    ) {
        super(scene, x + TEXT_SPACING, y, staticPrefix, getVariable, align, fontHeight, backgroundColor, foregroundColor)
        this.iconObject = scene.add.image(x, y, iconName)
            .setScrollFactor(0)
            .setOrigin(this.origin.x, this.origin.y)
            .setDepth(GUI_DEPTH)
    }

    public override getNextLineXY(): XY {
        return xy(this.iconObject.x, this.iconObject.y + TEXT_SPACING)
    }

    public override setPosition(x: number, y: number): this {
        const dx = x - this.iconObject.x
        const dy = y - this.iconObject.y
        this.iconObject.setPosition(x, y)
        super.setPosition(this.textObject.x + dx, this.textObject.y + dy)
        return this
    }

    public override getWidth() {
        return Math.max(this.iconObject.width, super.getWidth() + TEXT_SPACING)
    }

    public override getHeight() {
        return Math.max(this.iconObject.height, super.getHeight())
    }

    public override getObjects(): UIObject[] {
        return [...super.getObjects(), this.iconObject]
    }
}

export class UITextButtonLine extends UITextLine {
    constructor(
        scene: MainScene, 
        x:number, 
        y:number, 
        staticPrefix: string, 
        onClick: () => any,
        align: string = "left",
        fontHeight: number = GameConstants.ui.defaultFontSize
    ) {
        super(scene, x, y, "-" + staticPrefix + "()", align, fontHeight)
        this.textObject
            .setFontStyle('bold')
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                onClick()
            })
            .setOrigin(this.origin.x, this.origin.y)
    }
}

export class UIStatButtonLine extends StatMessage {
    constructor(
        scene: MainScene, 
        x:number, 
        y:number, 
        staticPrefix: string, 
        onClick: () => string,
        align: string = "left",
        fontHeight: number = GameConstants.ui.defaultFontSize
    ) {
        super(scene, x, y, staticPrefix, () => {return onClick()}, align, fontHeight)
        this.textObject
            .setFontStyle('bold')
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                onClick()
            })
            .setOrigin(this.origin.x, this.origin.y)
    }
}