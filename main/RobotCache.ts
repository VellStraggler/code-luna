import type MainScene from "../CodeLuna"
import ModularRobot from "../bots/ModularRobot"
import ModularBlock from "../bots/parts-and-blocks/ModularBlock"
import FactoryBlock from "../bots/parts-and-blocks/FactoryBlock"
import { BlockDefinition } from "../bots/parts-and-blocks/BlockDefinition"
import { PartDefinition } from "../bots/parts-and-blocks/PartDefinition"
import { BLOCK_RES, Dirs } from "./constants"
import { xy } from "./XY"

const KEY = "code-luna-robots-v1"

type Point = { x: number, y: number }
type BlockReference = { robot: number, block: number }
type SavedPart = { type: string, position: Point, rotation: number }
type SavedFactory = { block: string, parts: string[], direction: Dirs, fromUser: boolean }
type SavedBlock = {
    type: string, position: Point, hp: number, cosmorite: number, lunestone: number,
    age: number, printedBy: BlockReference | null, parts: SavedPart[], factory: SavedFactory | null
}
type SavedRobot = {
    position: Point, direction: number, hasMoved: boolean, proxy: number,
    blocks: SavedBlock[], functions: { name: string, body: string, expanded: boolean }[] | null
}
type Save = { version: 1, robots: SavedRobot[] }

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value)
const point = (value: any): value is Point => value != null && finite(value.x) && finite(value.y)
const blockType = (name: unknown) => typeof name === "string" &&
    (name === BlockDefinition.unknown.assetKey || BlockDefinition.fromAssetKey(name) !== BlockDefinition.unknown)
const partType = (name: unknown) => typeof name === "string" &&
    (name === PartDefinition.unknown.assetKey || PartDefinition.fromAssetKey(name) !== PartDefinition.unknown)

function validSave(value: any): value is Save {
    if (!value || value.version !== 1 || !Array.isArray(value.robots)) return false
    return value.robots.every((robot: any) =>
        robot && point(robot.position) && finite(robot.direction) && typeof robot.hasMoved === "boolean" &&
        Array.isArray(robot.blocks) && robot.blocks.length > 0 &&
        Number.isInteger(robot.proxy) && robot.proxy >= 0 && robot.proxy < robot.blocks.length &&
        (robot.functions === null || (Array.isArray(robot.functions) && robot.functions.every((fn: any) =>
            fn && typeof fn.name === "string" && typeof fn.body === "string" && typeof fn.expanded === "boolean"))) &&
        robot.blocks.every((block: any) =>
            block && blockType(block.type) && point(block.position) &&
            finite(block.hp) && block.hp > 0 && finite(block.cosmorite) && block.cosmorite >= 0 &&
            finite(block.lunestone) && block.lunestone >= 0 && finite(block.age) && block.age >= 0 &&
            (block.printedBy === null || (block.printedBy &&
                Number.isInteger(block.printedBy.robot) && Number.isInteger(block.printedBy.block) &&
                block.printedBy.robot >= 0 && block.printedBy.block >= 0 &&
                block.printedBy.robot < value.robots.length &&
                block.printedBy.block < value.robots[block.printedBy.robot]?.blocks?.length)) &&
            Array.isArray(block.parts) && block.parts.length <= 4 && block.parts.every((part: any) =>
                part && partType(part.type) && point(part.position) && finite(part.rotation)) &&
            (block.factory === null || (block.type === BlockDefinition.factory.assetKey &&
                block.factory && blockType(block.factory.block) && Array.isArray(block.factory.parts) &&
                block.factory.parts.every(partType) && Object.values(Dirs).includes(block.factory.direction) &&
                typeof block.factory.fromUser === "boolean"))
        )
    )
}

export default class RobotCache {
    private enabled = true

    constructor(private scene: MainScene, private warn: () => void) {}

    load(): boolean {
        let save: Save
        try {
            const raw = localStorage.getItem(KEY)
            if (raw === null) return false
            const data: unknown = JSON.parse(raw)
            if (!validSave(data)) throw new Error("Unrecognized robot save")
            save = data
        } catch (error) {
            this.disable(error)
            return false
        }

        const restored: ModularRobot[] = []
        try {
            for (const saved of save.robots) {
                const first = saved.blocks[0]
                const robot = ModularRobot.create(this.scene, saved.position.x, saved.position.y, BlockDefinition.fromAssetKey(first.type))
                restored.push(robot)
                robot.movingDirectionRadians = saved.direction
                robot.hasMoved = saved.hasMoved
                robot.functions = saved.functions?.map(fn => ({ ...fn })) ?? null
                for (const [index, data] of saved.blocks.entries()) {
                    if (index > 0) robot.addBlockType(BlockDefinition.fromAssetKey(data.type), data.position.x / BLOCK_RES, data.position.y / BLOCK_RES)
                    const block = robot.blocks[index]
                    block.localPos = xy(data.position.x, data.position.y)
                    block.globalPos = robot.position.add(block.localPos)
                    block.image.setPosition(block.globalPos.x, block.globalPos.y)
                    for (const part of data.parts) {
                        block.addPart(this.scene, PartDefinition.fromAssetKey(part.type), robot)
                        const added = block.modularParts[block.modularParts.length - 1]
                        added.localPos = xy(part.position.x, part.position.y)
                        added.image.setRotation(part.rotation)
                    }
                    block.storedCosmorite = data.cosmorite
                    block.storedLunestone = data.lunestone
                    block.hp = data.hp
                    block.createdAt = this.scene.time.now - data.age
                    if (block instanceof FactoryBlock && data.factory) {
                        block.selectedBlock = BlockDefinition.fromAssetKey(data.factory.block)
                        block.selectedParts = new Set(data.factory.parts.map(name => PartDefinition.fromAssetKey(name)))
                        block.outputDirection = data.factory.direction
                        block.fromUser = data.factory.fromUser
                    }
                    block.updateDamageTint()
                    block.updateFreshness()
                }
                robot.proxyGlobalBlock = robot.blocks[saved.proxy]
                robot.reload()
                for (const block of robot.blocks) block.update(false)
                robot.addEnemyCollider(this.scene.player)
                this.scene.robots.push(robot)
            }
            for (const [robotIndex, saved] of save.robots.entries()) {
                for (const [blockIndex, data] of saved.blocks.entries()) {
                    if (data.printedBy) {
                        restored[robotIndex].blocks[blockIndex].printedBy =
                            restored[data.printedBy.robot].blocks[data.printedBy.block]
                    }
                }
            }
            return true
        } catch (error) {
            for (const robot of restored) robot.destroy()
            this.disable(error)
            return false
        }
    }

    save() {
        if (!this.enabled) return
        try {
            const robots = this.scene.robots.robots
            const references = new Map<ModularBlock, BlockReference>()
            robots.forEach((robot, robotIndex) => robot.blocks.forEach((block, blockIndex) =>
                references.set(block, { robot: robotIndex, block: blockIndex })))
            const save: Save = {
                version: 1,
                robots: robots.map(robot => ({
                    position: { x: robot.position.x, y: robot.position.y },
                    direction: robot.movingDirectionRadians,
                    hasMoved: robot.hasMoved,
                    proxy: Math.max(0, robot.blocks.indexOf(robot.proxyGlobalBlock!)),
                    functions: robot.functions?.map(({ name, body, expanded }) => ({ name, body, expanded })) ?? null,
                    blocks: robot.blocks.map(block => ({
                        type: block.blockType.assetKey,
                        position: { x: block.localPos.x, y: block.localPos.y },
                        hp: block.hp,
                        cosmorite: block.storedCosmorite,
                        lunestone: block.storedLunestone,
                        age: Math.max(0, this.scene.time.now - block.createdAt),
                        printedBy: block.printedBy ? references.get(block.printedBy) ?? null : null,
                        parts: block.modularParts.map(part => ({
                            type: part.partType.assetKey,
                            position: { x: part.localPos.x, y: part.localPos.y },
                            rotation: part.image.rotation
                        })),
                        factory: block instanceof FactoryBlock ? {
                            block: block.selectedBlock.assetKey,
                            parts: [...block.selectedParts].map(part => part.assetKey),
                            direction: block.outputDirection,
                            fromUser: block.fromUser
                        } : null
                    }))
                }))
            }
            if (!validSave(save)) throw new Error("Robot state cannot be saved")
            localStorage.setItem(KEY, JSON.stringify(save))
        } catch (error) {
            this.disable(error)
        }
    }

    private disable(error: unknown) {
        this.enabled = false
        console.warn("Robot cache unavailable; existing data was not overwritten.", error)
        this.warn()
    }
}
