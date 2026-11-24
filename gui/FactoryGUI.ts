import MainScene from "../CodeLuna"
import { BlockDefinition } from "../bots/parts-and-blocks/BlockDefinition"
import FactoryBlock from "../bots/parts-and-blocks/FactoryBlock"
import { PartDefinition } from "../bots/parts-and-blocks/PartDefinition"
import { Dirs, F0, FACTORY_GUI_PADDING, GUI_SIZE, TEXT_SPACING, TOOLBOX_SPACING, TOOLBOX_WIDTH } from "../main/constants"
import MyColors from "../main/MyColors"

export default class FactoryGUI {
    readonly container: Phaser.GameObjects.Container
    isVisible = false
    private factory: FactoryBlock | null = null
    private blockButtons = new Map<BlockDefinition, Phaser.GameObjects.Rectangle>()
    private partButtons = new Map<PartDefinition, Phaser.GameObjects.Rectangle>()
    private directionButtons = new Map<Dirs, {
        button: Phaser.GameObjects.Rectangle
        triangle: Phaser.GameObjects.Text
        cross: Phaser.GameObjects.Graphics
    }>()
    private resourceButtons = new Map<boolean, Phaser.GameObjects.Rectangle>()
    private partLabel: Phaser.GameObjects.Text
    private status: Phaser.GameObjects.Text
    private statusMessage = ""

    constructor(private scene: MainScene) {
        this.container = scene.add.container(0, 0).setVisible(false)
        const blocks = Object.values(BlockDefinition).filter((value): value is BlockDefinition =>
            value instanceof BlockDefinition && value !== BlockDefinition.unknown &&
            scene.textures.exists(this.iconKey(value))
        )
        const parts = Object.values(PartDefinition).filter((value): value is PartDefinition =>
            value instanceof PartDefinition && value !== PartDefinition.unknown &&
            scene.textures.exists(this.iconKey(value))
        )
        const padding = FACTORY_GUI_PADDING
        const contentWidth = GUI_SIZE.x - padding * 2
        const spacing = TOOLBOX_WIDTH + TOOLBOX_SPACING
        const columns = Math.max(1, Math.floor((contentWidth + TOOLBOX_SPACING) / spacing))
        this.text(padding, padding, "Block type")
        blocks.forEach((definition, index) => {
            const x = padding + TOOLBOX_WIDTH / 2 + (index % columns) * spacing
            const y = padding + TEXT_SPACING + TOOLBOX_WIDTH / 2 + Math.floor(index / columns) * spacing
            this.blockButtons.set(definition, this.iconButton(x, y, definition, () => {
                if (!this.factory) return
                this.factory.selectedBlock = definition
                this.statusMessage = ""
                this.update()
            }))
        })
        const partsY = padding + TEXT_SPACING + Math.ceil(blocks.length / columns) * spacing
        this.partLabel = this.text(padding, partsY, "Parts")
        const resetX = GUI_SIZE.x - padding - 36
        this.button(resetX, partsY + 9, 72, 20, () => {
            this.factory?.selectedParts.clear()
            this.statusMessage = ""
            this.update()
        })
        this.text(resetX, partsY + 9, "Reset", 12).setOrigin(0.5)
        parts.forEach((definition, index) => {
            const x = padding + TOOLBOX_WIDTH / 2 + (index % columns) * spacing
            const y = partsY + TEXT_SPACING + TOOLBOX_WIDTH / 2 + Math.floor(index / columns) * spacing
            this.partButtons.set(definition, this.iconButton(x, y, definition, () => {
                if (!this.factory) return
                if (this.factory.selectedParts.has(definition)) {
                    this.factory.selectedParts.delete(definition)
                } else {
                    this.factory.selectedParts.add(definition)
                }
                this.statusMessage = ""
                this.update()
            }))
        })
        const directions: [Dirs, number, number, string][] = [
            [Dirs.up, GUI_SIZE.x / 2, padding / 2, "\u25B2"],
            [Dirs.down, GUI_SIZE.x / 2, GUI_SIZE.y - padding / 2, "\u25BC"],
            [Dirs.left, padding / 2, GUI_SIZE.y / 2, "\u25C0"],
            [Dirs.right, GUI_SIZE.x - padding / 2, GUI_SIZE.y / 2, "\u25B6"]
        ]
        for (const [direction, x, y, triangle] of directions) {
            const button = this.button(x, y, 24, 24, () => {
                if (!this.factory || this.factory.isOutputBlocked(direction)) {
                    this.scene.cancelAction()
                    return
                }
                this.factory.outputDirection = direction
                this.statusMessage = ""
                this.update()
            })
            const triangleText = this.text(x, y, triangle, 18).setOrigin(0.5)
            const cross = scene.add.graphics().setPosition(x, y).setVisible(false)
            cross.lineStyle(2, MyColors.red)
                .lineBetween(-9, -9, 9, 9)
                .lineBetween(-9, 9, 9, -9)
            this.container.add(cross)
            this.directionButtons.set(direction, { button, triangle: triangleText, cross })
        }
        this.status = this.text(padding, GUI_SIZE.y - padding - TOOLBOX_WIDTH - TEXT_SPACING * 2, "", 12)
            .setWordWrapWidth(contentWidth)
        const bottomY = GUI_SIZE.y - TOOLBOX_WIDTH / 2 - padding
        const resourceLabel = this.text(0, bottomY, "get resources", 12).setOrigin(0, 0.5)
        const resourceWidth = 80
        const groupWidth = resourceLabel.width + 8 + resourceWidth * 2 + 4
        const groupX = (GUI_SIZE.x - groupWidth) / 2
        resourceLabel.setX(groupX)
        for (const [index, fromUser] of [true, false].entries()) {
            const x = groupX + resourceLabel.width + 8 + resourceWidth / 2 + index * (resourceWidth + 4)
            this.resourceButtons.set(fromUser, this.button(x, bottomY, resourceWidth, 24, () => {
                if (!this.factory) return
                this.factory.fromUser = fromUser
                this.statusMessage = ""
                this.update()
            }))
            this.text(x, bottomY, fromUser ? "from user" : "from bot", 12).setOrigin(0.5)
        }
        const printX = GUI_SIZE.x - TOOLBOX_WIDTH / 2 - padding
        this.button(printX, bottomY, TOOLBOX_WIDTH, TOOLBOX_WIDTH, () => {
            if (!this.factory) return
            this.statusMessage = this.factory.print()
            this.update()
        })
        const printIcon = scene.add.graphics().setPosition(printX, bottomY)
        printIcon.lineStyle(2, MyColors.white)
            .strokeRect(-12, -6, 24, 15)
            .strokeRect(-8, -14, 16, 8)
            .fillStyle(MyColors.white)
            .fillRect(-8, 3, 16, 11)
            .fillStyle(MyColors.green)
            .fillRect(-5, 6, 10, 1)
            .fillRect(-5, 9, 10, 1)
        this.container.add(printIcon)
    }

    private iconKey(definition: BlockDefinition | PartDefinition) {
        return definition.assetKey + (definition.availableFrames > 1 ? F0 : "")
    }

    private text(x: number, y: number, message: string, size = 14) {
        const text = this.scene.add.text(x, y, message, { fontSize: `${size}px`, color: "#ffffff" })
        this.container.add(text)
        return text
    }

    private button(x: number, y: number, width: number, height: number, action: () => void) {
        const button = this.scene.add.rectangle(x, y, width, height, MyColors.white, 0.12)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", (
                _pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData
            ) => {
                event.stopPropagation()
                action()
            })
        this.container.add(button)
        return button
    }

    private iconButton(x: number, y: number, definition: BlockDefinition | PartDefinition, action: () => void) {
        const button = this.button(x, y, TOOLBOX_WIDTH, TOOLBOX_WIDTH, action)
        this.container.add(this.scene.add.image(x, y, this.iconKey(definition)).setScale(2))
        return button
    }

    setFactory(factory: FactoryBlock | null) {
        if (this.factory === factory) return
        this.factory = factory
        this.statusMessage = ""
        this.update()
    }

    setVisible(visible: boolean) {
        this.isVisible = visible
        this.container.setVisible(visible)
        if (visible) this.update()
    }

    update() {
        const factory = this.factory
        if (!factory) return
        for (const [definition, button] of this.blockButtons) {
            button.setStrokeStyle(factory.selectedBlock === definition ? 2 : 0, MyColors.white)
        }
        for (const [definition, button] of this.partButtons) {
            button.setStrokeStyle(factory.selectedParts.has(definition) ? 2 : 0, MyColors.white)
        }
        for (const [direction, { button, triangle, cross }] of this.directionButtons) {
            const blocked = factory.isOutputBlocked(direction)
            button.setStrokeStyle(factory.outputDirection === direction ? 2 : 0, MyColors.white)
                .setAlpha(blocked ? 0.35 : 1)
            triangle.setAlpha(blocked ? 0.35 : 1)
            cross.setVisible(blocked)
        }
        for (const [fromUser, button] of this.resourceButtons) {
            button.setFillStyle(MyColors.white, 0)
                .setStrokeStyle(factory.fromUser === fromUser ? 2 : 0, MyColors.white)
        }
        this.partLabel.setText(`Parts (${factory.selectedParts.size} / ${factory.selectedBlock.partLimit})`)
        const cost = factory.getPrintCost()
        this.status.setText(this.statusMessage || `Cost: ${cost.gas.toFixed(1)} gas / ${cost.stone.toFixed(1)} stone`)
    }
}
