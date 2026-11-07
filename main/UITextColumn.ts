import MainScene from "../CodeLuna";
import { TEXT_SPACING } from "./constants";
import UIStatLine, { UIIconStatLine, UIStatButtonLine, UITextButtonLine, UITextLine } from "./StatMessage";

export default class UITextColumn {
    private scene: MainScene
    public list: UITextLine[] = []
    public readonly x: number
    public readonly y: number
    public latestY: number
    private visibilityOn: boolean

    constructor(scene: MainScene, x:number = TEXT_SPACING, y:number = TEXT_SPACING, startVisible: boolean = true) {
        this.scene = scene
        this.x = x
        this.y = y
        this.latestY = y
        this.visibilityOn = startVisible
    }

    public addIconStatLine(phaserName: string, msg: string, getVariable: () => any) {
        this.list.push(
            new UIIconStatLine(
                this.scene,
                this.x,
                this.latestY,
                phaserName,
                msg,
                getVariable
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
                getVariable
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
                onClick
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
                onClick
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
        this.getAsGameObjects().forEach(gameObject => {
            gameObject.setVisible(isVisible)
        })
    }
}