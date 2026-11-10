import MainScene from "../CodeLuna";
import { TEXT_SPACING } from "./constants";
import Logic from "./logic";
import UIStatLine, { UIIconStatLine, UIStatButtonLine, UITextButtonLine, UITextLine } from "./StatMessage";

export default class UITextColumn {
    private scene: MainScene
    public list: UITextLine[] = []
    public readonly x: number
    public readonly y: number
    public latestY: number
    public isVisible: boolean
    public backgroundRect: Phaser.GameObjects.Rectangle | null
    public readonly align: string

    constructor(
        scene: MainScene, 
        x:number = TEXT_SPACING, 
        y:number = TEXT_SPACING,
        startVisible: boolean,
        width: number = 0,
        height: number = 0,
        backgroundColor: number | null = null,
        align: string = "left"
    ) {
        this.scene = scene
        this.x = x
        this.y = y
        this.latestY = y
        this.isVisible = startVisible
        this.align = align

        if (width != 0 && height != 0 && backgroundColor != null) {
            console.log("Creating background")
            let origin = Logic.parseOrigin(align)
            this.backgroundRect = scene.add.rectangle(x, y, width, height, backgroundColor)
                .setVisible(this.isVisible)
                .setOrigin(origin.x, origin.y)
            // this.scene.cameras.main.ignore(this.backgroundRect)
        } else {
            this.backgroundRect = null
        }
    }

    public addIconStatLine(phaserName: string, msg: string, getVariable: () => any) {
        this.list.push(
            new UIIconStatLine(
                this.scene,
                this.x,
                this.latestY,
                phaserName,
                msg,
                getVariable,
                this.align
            )
        )
        this.latestY += TEXT_SPACING
        return this
    }

    public addStatLine(msg: string, getVariable: () => any) {
        this.list.push(
            new UIStatLine(
                this.scene,
                this.x,
                this.latestY,
                msg,
                getVariable,
                this.align
            )
        )
        this.latestY += TEXT_SPACING
        return this
    }

    public addButtonLine(msg: string, onClick: () => any) {
        this.list.push(
            new UITextButtonLine(
                this.scene,
                this.x,
                this.latestY,
                msg,
                onClick,
                this.align
            )
        )
        this.latestY += TEXT_SPACING
        return this
    }

    public addStatButtonLine(msg: string, onClick: () => any) {
        this.list.push(
            new UIStatButtonLine(
                this.scene,
                this.x,
                this.latestY,
                msg,
                onClick,
                this.align
            )
        )
        this.latestY += TEXT_SPACING
        return this
    }

    public update() {
        for (const uiText of this.list) {
            uiText.updateState()
        }
    }

    public getAsGameObjects(): (Phaser.GameObjects.Text | Phaser.GameObjects.Image)[] {
        return this.list.flatMap(line => line.getObjects())
    }

    public setVisibility(isVisible: boolean) {
        this.isVisible = isVisible
        this.getAsGameObjects().forEach(gameObject => {
            gameObject.setVisible(isVisible)
        })
    }
}