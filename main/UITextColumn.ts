import MainScene from "../CodeLuna";
import { TEXT_SPACING, TOOLBOX_SPACING, TOOLBOX_WIDTH } from "./constants";
import GameGeometry from "./GameGeometry";
import { PlayerState } from "./Player";
import UIStatLine, { UIIconButton, UIIconStatLine, UIStatButtonLine, UITextButtonLine, UITextLine } from "./StatMessage";

export default class UIColumn {
    private scene: MainScene
    public list: UITextLine[] = []
    public iconButtons: UIIconButton[] = []
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

    public addIconButton(iconName: string, fun: () => boolean) {
        this.iconButtons.push(
            new UIIconButton(
                this.scene, 
                this.x, 
                this.latestY, 
                iconName, 
                fun,
                () => { 
                    this.scene.player.playerState = PlayerState.holdingNothing
                    for(const button of this.iconButtons) {
                        button.deselect()
                    }
                })
        )
        this.latestY += TOOLBOX_WIDTH + TOOLBOX_SPACING
        return this
    }

    public getAsGameObjects(): (Phaser.GameObjects.Text | Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle)[] {
        return [
            ...this.list.flatMap(line => line.getObjects()),
            ...this.iconButtons.flatMap(button => button.getObjects())
        ]
    }

    public setVisibility(isVisible: boolean) {
        this.isVisible = isVisible
        this.getAsGameObjects().forEach(gameObject => {
            gameObject.setVisible(isVisible)
        })
    }
}