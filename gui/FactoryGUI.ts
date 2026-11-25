import MainScene from "../CodeLuna"
import { BlockDefinition } from "../bots/parts-and-blocks/BlockDefinition"
import FactoryBlock from "../bots/parts-and-blocks/FactoryBlock"
import { PartDefinition } from "../bots/parts-and-blocks/PartDefinition"
import GameConstants, { Dirs, F0, FACTORY_GUI_PADDING } from "../main/constants"
import MyColors from "../main/MyColors"

export default class FactoryGUI {
    readonly element: HTMLDivElement
    isVisible = false
    private factory: FactoryBlock | null = null
    private readonly blockButtons = new Map<BlockDefinition, HTMLButtonElement>()
    private readonly partButtons = new Map<PartDefinition, HTMLButtonElement>()
    private readonly directionButtons = new Map<Dirs, HTMLButtonElement>()
    private readonly resourceButtons = new Map<boolean, HTMLButtonElement>()
    private readonly partLabel: HTMLDivElement
    private readonly status: HTMLDivElement
    private statusMessage = ""

    constructor(private scene: MainScene, parent: HTMLElement) {
        this.element = document.createElement("div")
        this.element.className = "factory-monitor"
        Object.assign(this.element.style, {
            position: "absolute",
            inset: "0",
            display: "none",
            boxSizing: "border-box",
            padding: `${FACTORY_GUI_PADDING}px`,
            color: MyColors.toCssHex(MyColors.white),
            font: `${GameConstants.ui.compactFontSize}px monospace`
        })
        const style = document.createElement("style")
        style.textContent = `
            .factory-monitor { display:flex;flex-direction:column;gap:6px; }
            .factory-monitor button { border:1px solid ${MyColors.toCssHex(MyColors.white)};background:transparent;color:inherit;font:inherit;cursor:pointer; }
            .factory-monitor button.selected { outline:2px solid ${MyColors.toCssHex(MyColors.white)}; }
            .factory-monitor .factory-scroll { display:flex;gap:4px;overflow:auto;min-height:44px; }
            .factory-monitor .factory-icon { flex:0 0 40px;width:40px;height:40px;padding:2px; }
            .factory-monitor .factory-icon img { width:100%;height:100%;object-fit:contain;image-rendering:pixelated; }
            .factory-monitor .factory-direction { position:absolute;width:26px;height:26px; }
            .factory-monitor .factory-status { min-height:20px;white-space:pre-wrap; }
            .factory-monitor .factory-bottom { display:flex;align-items:center;gap:4px;margin-top:auto; }
            .factory-monitor .factory-bottom button { min-height:24px;padding:2px 6px; }
            .factory-monitor .factory-print { width:40px;height:40px;margin-left:auto; }
        `
        this.element.append(style)

        const blocks = Object.values(BlockDefinition).filter((value): value is BlockDefinition =>
            value instanceof BlockDefinition && value !== BlockDefinition.unknown &&
            scene.textures.exists(this.iconKey(value))
        )
        const parts = Object.values(PartDefinition).filter((value): value is PartDefinition =>
            value instanceof PartDefinition && value !== PartDefinition.unknown &&
            scene.textures.exists(this.iconKey(value))
        )
        const blockLabel = document.createElement("div")
        blockLabel.textContent = GameConstants.text.factoryBlockType
        const blockList = document.createElement("div")
        blockList.className = "factory-scroll"
        blocks.forEach(definition => {
            const button = this.iconButton(definition, () => {
                if (!this.factory) return
                this.factory.selectedBlock = definition
                this.statusMessage = ""
                this.update()
            })
            this.blockButtons.set(definition, button)
            blockList.append(button)
        })
        this.partLabel = document.createElement("div")
        const partHeader = document.createElement("div")
        partHeader.style.display = "flex"
        partHeader.style.justifyContent = "space-between"
        partHeader.append(this.partLabel, this.button(GameConstants.text.factoryReset, () => {
            this.factory?.selectedParts.clear()
            this.statusMessage = ""
            this.update()
        }))
        const partList = document.createElement("div")
        partList.className = "factory-scroll"
        parts.forEach(definition => {
            const button = this.iconButton(definition, () => {
                if (!this.factory) return
                if (this.factory.selectedParts.has(definition)) this.factory.selectedParts.delete(definition)
                else this.factory.selectedParts.add(definition)
                this.statusMessage = ""
                this.update()
            })
            this.partButtons.set(definition, button)
            partList.append(button)
        })

        const directionGlyphs: Record<Dirs, string> = {
            [Dirs.up]: "\u25B2",
            [Dirs.down]: "\u25BC",
            [Dirs.left]: "\u25C0",
            [Dirs.right]: "\u25B6"
        }
        const directionPositions: Record<Dirs, [string, string]> = {
            [Dirs.up]: ["50%", "0"],
            [Dirs.down]: ["50%", "auto"],
            [Dirs.left]: ["0", "50%"],
            [Dirs.right]: ["auto", "50%"]
        }
        for (const direction of Object.values(Dirs)) {
            const button = this.button(directionGlyphs[direction], () => {
                if (!this.factory || this.factory.isOutputBlocked(direction)) {
                    this.scene.cancelAction()
                    return
                }
                this.factory.outputDirection = direction
                this.statusMessage = ""
                this.update()
            })
            button.className = "factory-direction"
            const [left, top] = directionPositions[direction]
            button.style.left = left
            button.style.top = top
            if (direction === Dirs.up || direction === Dirs.down) button.style.transform = "translateX(-50%)"
            if (direction === Dirs.down) button.style.bottom = "0"
            if (direction === Dirs.right) button.style.right = "0"
            this.directionButtons.set(direction, button)
            this.element.append(button)
        }

        this.status = document.createElement("div")
        this.status.className = "factory-status"
        const bottom = document.createElement("div")
        bottom.className = "factory-bottom"
        const resourceLabel = document.createElement("span")
        resourceLabel.textContent = GameConstants.text.factoryResources
        bottom.append(resourceLabel)
        for (const [fromUser, label] of [
            [true, GameConstants.text.factoryFromUser],
            [false, GameConstants.text.factoryFromBot]
        ] as const) {
            const button = this.button(label, () => {
                if (!this.factory) return
                this.factory.fromUser = fromUser
                this.statusMessage = ""
                this.update()
            })
            this.resourceButtons.set(fromUser, button)
            bottom.append(button)
        }
        bottom.append(this.button(GameConstants.text.factoryPrint, () => {
            if (!this.factory) return
            this.statusMessage = this.factory.print()
            this.update()
        }, "factory-print"))
        this.element.append(blockLabel, blockList, partHeader, partList, this.status, bottom)
        parent.append(this.element)
        this.scene.events.once("shutdown", () => this.element.remove())
    }

    private iconKey(definition: BlockDefinition | PartDefinition) {
        return definition.assetKey + (definition.availableFrames > 1 ? F0 : "")
    }

    private iconUrl(definition: BlockDefinition | PartDefinition) {
        const key = this.iconKey(definition)
        const asset = definition instanceof BlockDefinition && !key.startsWith("block/")
            ? `block/${key}`
            : key
        return `${import.meta.env.BASE_URL}assets/${asset}.png`
    }

    private button(label: string, action: () => void, className = "") {
        const button = document.createElement("button")
        button.type = "button"
        button.className = className
        button.textContent = label
        button.addEventListener("pointerdown", event => {
            event.preventDefault()
            event.stopPropagation()
        })
        button.addEventListener("click", event => {
            event.stopPropagation()
            action()
        })
        return button
    }

    private iconButton(definition: BlockDefinition | PartDefinition, action: () => void) {
        const button = this.button("", action, "factory-icon")
        const image = document.createElement("img")
        image.src = this.iconUrl(definition)
        image.alt = definition.assetKey
        button.append(image)
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
        this.element.style.display = visible ? "flex" : "none"
        if (visible) this.update()
    }

    update() {
        const factory = this.factory
        if (!factory) return
        for (const [definition, button] of this.blockButtons) {
            button.classList.toggle("selected", factory.selectedBlock === definition)
        }
        for (const [definition, button] of this.partButtons) {
            button.classList.toggle("selected", factory.selectedParts.has(definition))
        }
        for (const [direction, button] of this.directionButtons) {
            const blocked = factory.isOutputBlocked(direction)
            button.classList.toggle("selected", factory.outputDirection === direction)
            button.style.opacity = blocked ? "0.35" : "1"
            button.textContent = blocked ? "\u2715" : ({
                [Dirs.up]: "\u25B2",
                [Dirs.down]: "\u25BC",
                [Dirs.left]: "\u25C0",
                [Dirs.right]: "\u25B6"
            } as Record<Dirs, string>)[direction]
        }
        for (const [fromUser, button] of this.resourceButtons) {
            button.classList.toggle("selected", factory.fromUser === fromUser)
        }
        this.partLabel.textContent =
            `${GameConstants.text.factoryParts} (${factory.selectedParts.size} / ${factory.selectedBlock.partLimit})`
        const cost = factory.getPrintCost()
        this.status.textContent = this.statusMessage ||
            `${GameConstants.text.factoryCost} ${cost.gas.toFixed(GameConstants.toolbar.statPrecision)} ${GameConstants.text.gasUnit} / ` +
            `${cost.stone.toFixed(GameConstants.toolbar.statPrecision)} ${GameConstants.text.stoneUnit}`
    }
}
