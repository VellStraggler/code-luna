import { describe, expect, it, vi } from "vitest"
import { BLOCK_RES, Dirs } from "../main/constants"
import { xy } from "../main/XY"

vi.mock("phaser", () => ({}))
vi.mock("../main/HPImage", () => ({ default: class {} }))
vi.mock("../bots/parts-and-blocks/ModularBlock", () => ({ default: class {} }))
vi.mock("../bots/parts-and-blocks/CpuPart", () => ({ GuiState: { closed: 0 } }))
vi.mock("../bots/ModularRobot", () => ({ default: { create: vi.fn() } }))

import ModularRobot from "../bots/ModularRobot"
import FactoryBlock, { PrintStrings } from "../bots/parts-and-blocks/FactoryBlock"
import { ModularPart } from "../bots/parts-and-blocks/ModularPart"
import { PartDefinition } from "../bots/parts-and-blocks/PartDefinition"

function printParts(parts: PartDefinition[], partLimit = 4) {
    const block: any = {
        modularParts: [],
        addPart(_scene: unknown, type: PartDefinition) {
            const part = Object.create(ModularPart.prototype)
            part.assetKey = type.assetKey
            part.partType = type
            part.localPos = xy()
            this.modularParts.push(part)
        },
        update: vi.fn()
    }
    vi.mocked(ModularRobot.create).mockReturnValue({ blocks: [block], reload: vi.fn() } as any)
    const factory: any = Object.create(FactoryBlock.prototype)
    factory.image = { active: true }
    factory.robot = { blocks: [factory] }
    factory.localPos = xy()
    factory.selectedBlock = { partLimit, gasCost: 0, stoneCost: 0 }
    factory.selectedParts = new Set(parts)
    factory.outputDirection = Dirs.down
    factory.fromUser = true
    factory.getPrintPlacement = () => ({ position: xy(), retreat: null })
    factory.scene = {
        cancelAction: vi.fn(),
        mainStats: { getGas: () => 100, getLunestone: () => 100, incGas: vi.fn(), incLunestone: vi.fn() },
        robots: { push: vi.fn(), connectFreshBlocks: vi.fn() },
        sound: { play: vi.fn() }
    }
    return { result: factory.print(), block }
}

describe("factory part layout", () => {
    it.each([
        [PartDefinition.partDrill, PartDefinition.partCpu],
        [PartDefinition.partCpu, PartDefinition.partDrill]
    ])("centers the CPU alongside the drill regardless of selection order", (...parts) => {
        const { result, block } = printParts(parts)
        expect(result).toBe(PrintStrings.success)
        const drill = block.modularParts.find((part: ModularPart) => part.partType === PartDefinition.partDrill)
        const cpu = block.modularParts.find((part: ModularPart) => part.partType === PartDefinition.partCpu)
        expect(cpu.localPos).toEqual(xy())
        expect(drill.localPos).toEqual(xy())
        drill.parentBlock = { image: { x: 0, y: 0 } }
        expect(drill.getPositionAtRotation(0)).toEqual(xy(0, -BLOCK_RES))
    })

    it("positions non-drill parts as if the drill were absent", () => {
        const { block } = printParts([PartDefinition.partDrill, PartDefinition.partCpu, PartDefinition.partBattery])
        expect(block.modularParts.map((part: ModularPart) => part.localPos)).toEqual([
            xy(), xy(-BLOCK_RES / 4, 0), xy(BLOCK_RES / 4, 0)
        ])
        const withoutDrill = printParts([PartDefinition.partCpu, PartDefinition.partBattery])
        expect(withoutDrill.block.modularParts.map((part: ModularPart) => part.localPos)).toEqual([
            xy(-BLOCK_RES / 4, 0), xy(BLOCK_RES / 4, 0)
        ])
    })

    it("handles a drill alone without changing the factory part limit", () => {
        expect(printParts([PartDefinition.partDrill]).block.modularParts[0].localPos).toEqual(xy())
        expect(printParts([PartDefinition.partDrill, PartDefinition.partCpu], 1).result)
            .toBe(PrintStrings.tooManyParts(1))
    })
})
