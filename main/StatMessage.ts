import MainScene from "../CodeLuna"
import { GUI_DEPTH, TEXT_SPACING, TOOLBOX_WIDTH } from "./constants"
import GameGeometry from "./GameGeometry"
import MyColors from "./MyColors"
import { XY, xy } from "./xy"

export class UITextLine {
    public readonly textObject: Phaser.GameObjects.Text
    public origin: XY = xy()

    constructor(
        scene: MainScene, 
        x:number, 
        y:number, 
        staticText: string,
        align: string = "left"
    ) {
        this.parseOrigin(align)
        this.textObject = scene.add.text(x, y, staticText)
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

    public updateState(): string {
        return this.textObject.text
    }

    public getObjects(): (Phaser.GameObjects.Text | Phaser.GameObjects.Image)[] {
        return [this.textObject]
    }
}

/** non-standard alignment doesn't really work on this one... These will be centered on the given x-value*/
export class UIIconButton {
    selected: boolean = false
    private bg: Phaser.GameObjects.Rectangle
    private icon: Phaser.GameObjects.Image

    constructor(scene: MainScene, x: number, y: number, iconName: string = "null", onClick: () => any, deselectAll: () => any) {
        this.bg = scene.add.rectangle(x, y, TOOLBOX_WIDTH, TOOLBOX_WIDTH, MyColors.white)
            .setStrokeStyle(0, MyColors.black)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                if (this.selected) {
                    deselectAll()
                } else {
                    deselectAll()
                    onClick()
                    this.select()
                }
            })
            
        this.icon = scene.add.image(this.bg.x, this.bg.y, iconName)
            .setScale(2)
    }

    deselect() {
        this.selected = false
        this.bg.setStrokeStyle(0)
    }
    select() {
        this.selected = true
        this.bg.setStrokeStyle(2)
    }
    public getObjects(): (Phaser.GameObjects.Rectangle | Phaser.GameObjects.Image)[] {
        return [this.bg, this.icon]
    }
}

export default class UIStatLine extends UITextLine {

    private readonly getVariable: () => any
    public statObject: Phaser.GameObjects.Text

    constructor(
        scene: MainScene, 
        x:number, 
        y:number, 
        staticPrefix: string, 
        getVariable: () => any,
        align: string = "left"
    ) {
        super(scene, x, y, staticPrefix, align)
        this.getVariable = getVariable
        this.statObject = scene.add.text(
            x + this.textObject.width, 
            y, 
            String(getVariable())
        )
            .setScrollFactor(0)
            .setDepth(GUI_DEPTH)
            .setOrigin(this.origin.x, this.origin.y)
    }

    public override updateState(): string {
        return this.statObject.text = (Math.round(this.getVariable() * 10) / 10).toString()
    }

    public override getObjects(): (Phaser.GameObjects.Text | Phaser.GameObjects.Image)[] {
        return [this.textObject, this.statObject]
    }
}

export class UIIconStatLine extends UIStatLine {
    public iconObject: Phaser.GameObjects.Image

    constructor(
        scene: MainScene, 
        x:number, y:number, 
        iconName: string, 
        staticPrefix: string, 
        getVariable: () => any,
        align: string = "left"
    ) {
        super(scene, x + TEXT_SPACING, y, staticPrefix, getVariable, align)
        this.iconObject = scene.add.image(x, y, iconName)
            .setScrollFactor(0)
            .setOrigin(this.origin.x, this.origin.y)
            .setDepth(GUI_DEPTH)
    }

    public override getNextLineXY(): XY {
        return xy(this.iconObject.x, this.iconObject.y + TEXT_SPACING)
    }

    public override getObjects(): (Phaser.GameObjects.Text | Phaser.GameObjects.Image)[] {
        return [this.textObject, this.statObject, this.iconObject]
    }
}

export class UITextButtonLine extends UITextLine {
    constructor(
        scene: MainScene, 
        x:number, 
        y:number, 
        staticPrefix: string, 
        onClick: () => any,
        align: string = "left"
    ) {
        super(scene, x, y, "-" + staticPrefix + "()", align)
        this.textObject
            .setFontStyle('bold')
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                onClick()
            })
            .setOrigin(this.origin.x, this.origin.y)
    }
}

export class UIStatButtonLine extends UIStatLine {
    constructor(
        scene: MainScene, 
        x:number, 
        y:number, 
        staticPrefix: string, 
        onClick: () => string,
        align: string = "left"
    ) {
        super(scene, x, y, staticPrefix, () => {return onClick()}, align)
        this.textObject
            .setFontStyle('bold')
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                onClick()
            })
            .setOrigin(this.origin.x, this.origin.y)
    }
}