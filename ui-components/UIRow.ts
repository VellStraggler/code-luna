import { TEXT_SPACING } from "../main/constants"
import UIComponent from "./UIComponent"
import { UITextLine } from "./StatMessage"
import type UIColumn from "./UIColumn"

export default class UIRow implements UIComponent {
    private readonly children: UIComponent[] = []
    private x: number
    private y: number
    private readonly gap: number

    constructor(x: number, y: number, gap = TEXT_SPACING / 2) {
        this.x = x
        this.y = y
        this.gap = gap
    }

    addStatMessage(message: UITextLine) {
        return this.addComponent(message)
    }

    addColumn(column: UIColumn) {
        return this.addComponent(column)
    }

    addComponent(component: UIComponent) {
        this.children.push(component)
        this.layoutChildren()
        return this
    }

    setPosition(x: number, y: number): this {
        this.x = x
        this.y = y
        this.layoutChildren()
        return this
    }

    getWidth() {
        return this.children.reduce(
            (width, child) => width + child.getWidth(),
            Math.max(0, this.children.length - 1) * this.gap
        )
    }

    getHeight() {
        return this.children.reduce((height, child) => Math.max(height, child.getHeight()), 0)
    }

    update() {
        this.children.forEach(child => child.update())
    }

    getObjects() {
        return this.children.flatMap(child => child.getObjects())
    }

    setVisibility(visible: boolean) {
        this.children.forEach(child => child.setVisibility(visible))
    }

    private layoutChildren() {
        let x = this.x
        for (const child of this.children) {
            child.setPosition(x, this.y)
            x += child.getWidth() + this.gap
        }
    }
}
