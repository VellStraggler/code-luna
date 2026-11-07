import MainScene from "../CodeLuna"
import { GUI_DEPTH, TEXT_SPACING } from "./constants"
import { XY, xy } from "./xy"

export class UITextLine {
    public readonly textObject: Phaser.GameObjects.Text

    constructor(
        scene: MainScene, 
        x:number, 
        y:number, 
        staticText: string
    ) {
        this.textObject = scene.add.text(x, y, staticText)
            .setScrollFactor(0)
            .setDepth(GUI_DEPTH)
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


export default class UIStatLine extends UITextLine {

    private readonly getVariable: () => any
    public statObject: Phaser.GameObjects.Text

    constructor(
        scene: MainScene, 
        x:number, 
        y:number, 
        staticPrefix: string, 
        getVariable: () => any
    ) {
        super(scene, x, y, staticPrefix)
        this.getVariable = getVariable
        this.statObject = scene.add.text(
            x + this.textObject.width, 
            y, 
            String(getVariable())
        )
            .setScrollFactor(0)
            .setDepth(GUI_DEPTH)
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
        getVariable: () => any
    ) {
        super(scene, x + TEXT_SPACING, y, staticPrefix, getVariable)
        this.iconObject = scene.add.image(x, y, iconName)
            .setScrollFactor(0)
            .setOrigin(0,0)
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
        onClick: () => any
    ) {
        super(scene, x, y, "-" + staticPrefix + "()")

        this.textObject
            .setFontStyle('bold')
            .setInteractive()
            .on('pointerdown', () => {
                onClick()
            })
    }
}

export class UIStatButtonLine extends UIStatLine {
    constructor(
        scene: MainScene, 
        x:number, 
        y:number, 
        staticPrefix: string, 
        onClick: () => string
    ) {
        super(scene, x, y, staticPrefix, () => {return onClick()})

        this.textObject
            .setFontStyle('bold')
            .setInteractive()
            .on('pointerdown', () => {
                onClick()
            })
    }
}