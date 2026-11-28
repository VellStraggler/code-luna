import { afterEach, describe, expect, it, vi } from "vitest"
import FactoryGUI from "../gui/FactoryGUI"
import { BlockDefinition } from "../bots/parts-and-blocks/BlockDefinition"
import { PartDefinition } from "../bots/parts-and-blocks/PartDefinition"

class Element {
    className = ""
    textContent = ""
    style: Record<string, string> = {}
    children: Element[] = []
    classList = { toggle: vi.fn() }
    listeners: Record<string, () => void> = {}
    append(...children: Element[]) { this.children.push(...children) }
    addEventListener(name: string, callback: (event: any) => void) {
        this.listeners[name] = () => callback({ stopPropagation() {}, preventDefault() {} })
    }
    click() { this.listeners.click?.() }
    remove() {}
}

function createGUI() {
    vi.stubGlobal("document", { createElement: () => new Element() })
    const scene: any = { textures: { exists: () => true }, events: { once: vi.fn() }, cancelAction: vi.fn() }
    const gui: any = new FactoryGUI(scene, new Element() as any)
    const factory: any = {
        selectedBlock: BlockDefinition.frame,
        selectedParts: new Set([PartDefinition.partCpu, PartDefinition.partDrill]),
        isOutputBlocked: () => false,
        getPrintCost: () => ({ gas: 0, stone: 0 })
    }
    gui.setFactory(factory)
    return { gui, factory }
}

afterEach(() => vi.unstubAllGlobals())

describe("factory GUI block selection", () => {
    it("clears parts that exceed the newly selected block's capacity", () => {
        const { gui, factory } = createGUI()
        gui.blockButtons.get(BlockDefinition.aluminum).click()
        expect(factory.selectedBlock).toBe(BlockDefinition.aluminum)
        expect(factory.selectedParts.size).toBe(0)
        expect(gui.partLabel.textContent).toContain("(0 / 1)")
        expect(gui.partButtons.get(PartDefinition.partCpu).classList.toggle).toHaveBeenLastCalledWith("selected", false)
    })

    it("retains the selection when it fits", () => {
        const { gui, factory } = createGUI()
        gui.blockButtons.get(BlockDefinition.sleek).click()
        expect([...factory.selectedParts]).toEqual([PartDefinition.partCpu, PartDefinition.partDrill])
        expect(gui.partLabel.textContent).toContain("(2 / 2)")
    })
})
