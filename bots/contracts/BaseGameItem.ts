import MainScene from "../../CodeLuna";
import { generateId, IMPLEMENTATION_ERROR } from "../../main/constants";
import HPImage from "../../main/HPImage";
import { xy, XY } from "../../main/xy";
import IGameItem from "./IGameItem";

export default class BaseGameItem implements IGameItem {
    image: HPImage
    readonly id: number
    localPos: XY = xy()
    globalPos: XY
    currentFrame: number;
    maxFrame: number;
    rotation: number;
    scene: MainScene
    itemName: string
    isActive: boolean = true
    
    constructor(
        scene: MainScene, 
        globalPos: XY,
        image: HPImage,
        itemName: string,
        maxFrames: number
    ) {
        this.id = generateId();
        this.rotation = 0
        this.scene = scene
        this.currentFrame = 0
        this.maxFrame = maxFrames
        this.globalPos = globalPos
        this.image = image
        this.itemName = itemName
        
        scene.baseLayer.push(this.image)

        this.updateAnimation(true)
        this.deactivate()
    }

    public activate() {
        this.isActive = true
    }
    public deactivate() {
        this.isActive = false
    }
    public getEnergyUse() {
        return 0
    }
    public destroy() {
        this.image.destroy()
    }

    rotate(amount:number = 0) {
        this.image.setRotation(amount)
    }

    equals(other: this) {
        return (this.id == other.id)
    }

    updateAnimation(animateFrame: boolean): void {
        if (animateFrame && this.isActive) {
            if (this.maxFrame > 0) {
                this.currentFrame = (this.currentFrame + 1)%(this.maxFrame + 1)
                this.image.setTexture(this.getFrameName())
            }
        }
    }

    toString() {
        return this.itemName + ", id: " + this.id + ", xy: " + this.globalPos
    }

    getFrameName() {
        if (this.maxFrame > 0) {
            return this.itemName + "-f" + String(this.currentFrame)
        }
        return this.itemName
    }

    update() {
        throw Error(IMPLEMENTATION_ERROR)
    }


}