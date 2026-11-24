import MainScene from "../CodeLuna"
import GameGeometry from "../main/GameGeometry"
import { xy } from "../main/XY"
import { BlockDefinition } from "./parts-and-blocks/BlockDefinition"
import ModularRobot from "./ModularRobot"
import { PartDefinition } from "./parts-and-blocks/PartDefinition"
import { BLOCK_RES, MINING_RATE_MS } from "../main/constants"
import ModularBlock from "./parts-and-blocks/ModularBlock"
import * as Phaser from 'phaser'

export default class ModularRobots {
    robots: ModularRobot[]
    private scene: MainScene
    private registeredBlocks = new WeakSet<ModularBlock>()
    private collisionBlocks: Phaser.GameObjects.Group
    private blocksByImage = new WeakMap<object, ModularBlock>()
    private offloadedThisStep = new Set<ModularRobot>()
    
    constructor(scene: MainScene, robots: ModularRobot[] = []) {
        this.robots = robots
        this.scene = scene
        this.collisionBlocks = scene.add.group()
        scene.physics.add.collider(this.collisionBlocks, this.collisionBlocks, (first, second) => {
            const firstBlock = this.blocksByImage.get(first)!
            const secondBlock = this.blocksByImage.get(second)!
            firstBlock.robot.proxyGlobalBlock = firstBlock
            secondBlock.robot.proxyGlobalBlock = secondBlock
        }, (first, second) => {
            const firstBlock = this.blocksByImage.get(first)
            const secondBlock = this.blocksByImage.get(second)
            return firstBlock != null && secondBlock != null &&
                firstBlock.robot !== secondBlock.robot &&
                firstBlock.robot.blocks.includes(firstBlock) &&
                secondBlock.robot.blocks.includes(secondBlock)
        })
        scene.physics.world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, () => {
            this.offloadedThisStep.clear()
        })
        for (const robot of robots) this.registerBlocks(robot)
    }

    push(newRobot: ModularRobot) {
        this.robots.push(newRobot)
        this.registerBlocks(newRobot)
    }

    connectWeldingBlocks(target?: ModularRobot) {
        let welded = false
        for (const robot of target ? [target] : [...this.robots]) {
            for (const welder of [...robot.parts]) {
                if (welder.partType !== PartDefinition.partWelder) continue
                welder.deactivate()
                if (!robot.hasCpu() || welder.parentBlock.robot !== robot ||
                    !robot.blocks.includes(welder.parentBlock) ||
                    !welder.image.active || !welder.image.visible || !welder.image.body?.enable) continue
                const bounds = welder.image.getBounds()
                let connected = false
                for (const otherRobot of [...this.robots]) {
                    if (otherRobot === robot) continue
                    for (const block of otherRobot.blocks) {
                        if (!block.image.active || !block.image.visible || !block.image.body?.enable) continue
                        if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, block.image.getBounds()) &&
                            welder.parentBlock.connectRobotAt(block)) {
                            if (welder.image.active) {
                                welder.activate()
                                welder.updateAnimation(true)
                                welder.parentBlock.updateFreshness()
                            }
                            connected = true
                            welded = true
                            break
                        }
                    }
                    return welded
                    if (connected) break
                }
            }
        }
    }

    connectFreshBlocks() {
        for (const robot of [...this.robots]) {
            for (const block of [...robot.blocks]) {
                if (!block.isFresh || block.robot !== robot) continue
                let connected = false
                for (const otherRobot of [...this.robots]) {
                    if (otherRobot === block.robot) continue
                    for (const other of otherRobot.blocks) {
                        if (!block.canAutoConnectTo(other)) continue
                        const dx = Math.abs(block.image.x - other.image.x)
                        const dy = Math.abs(block.image.y - other.image.y)
                        const adjacent = (Math.abs(dx - BLOCK_RES) <= 2 && dy < BLOCK_RES / 2) ||
                            (Math.abs(dy - BLOCK_RES) <= 2 && dx < BLOCK_RES / 2)
                        if (adjacent && other.connectRobotAt(block)) {
                            connected = true
                            break
                        }
                    }
                    if (connected) break
                }
            }
        }
    }

    get(index:number) {
        return this.robots[index]
    }

    [Symbol.iterator](): Iterator<ModularRobot> {
        return this.robots[Symbol.iterator]()
    }

    getBySourceBlockId(id:number ): ModularRobot | null{
        this.robots.forEach(robot => {
            if(robot.id == id) {
                return robot
            }
        })
        return null
    }

    findRobotClosestToPlayer(): ModularRobot | null {
        if (this.robots.length == 0) return null
        let closestDistance = GameGeometry.distanceBetween(
            this.robots[0].getPosition(), this.scene.player.getPosition()
        )
        let i = 0
        this.robots.forEach((robot, index) => {
            const distanceToPlayer = GameGeometry.distanceBetween(
                robot.getPosition(), this.scene.player.getPosition()
            )
            if (distanceToPlayer < closestDistance) {
                i = index
                closestDistance = distanceToPlayer
            }
        })
        return this.robots[i]
    }

    debug_moveAllRobots(x:number, y:number) {
        for(const robot of this.scene.robots) {
            robot.setGoal(xy(robot.getPosition().x + x, robot.getPosition().y + y))
        }
    }

    debug_createRobot(): ModularRobot {
        let robot = ModularRobot.create(this.scene, 400, 300, BlockDefinition.sleek)
            .addPart(PartDefinition.partDrill)
            .addPart(PartDefinition.partGun)
            .addBlockType(BlockDefinition.storage, 1, 0)
            .addPart(PartDefinition.partCpu)
            .addBlockType(BlockDefinition.wheel, 0, 1)
            .addBlockType(BlockDefinition.storage, 0, -1)
            .addBlockType(BlockDefinition.wheel, 0, -2)
            .addBlockType(BlockDefinition.wheel, 1, 1)
            .addBlockType(BlockDefinition.wheel, 2, 0)
            .addEnemyCollider(this.scene.player)
            .reload()
        this.push(robot)
        return robot
    }

    registerBlocks(robot: ModularRobot) {
        for (const block of robot.blocks) {
            if (this.registeredBlocks.has(block)) continue
            this.registeredBlocks.add(block)
            this.blocksByImage.set(block.image, block)
            this.collisionBlocks.add(block.image)
            const overlap = this.scene.physics.add.overlap(this.scene.playerBase.zone, block.image, () => {
                const owner = block.robot
                if (!owner.blocks.includes(block)) return
                if (block.hp < block.maxHP) block.resetHP()
                if (this.offloadedThisStep.has(owner)) return
                this.offloadedThisStep.add(owner)
                const transferAmount = MINING_RATE_MS / 100
                const lunestone = Math.min(transferAmount, owner.storedLunestone)
                const cosmorite = Math.min(transferAmount, Math.max(0, owner.storedCosmorite - owner.baseEnergyNeed))
                if (lunestone > 0) {
                    this.scene.mainStats.incLunestone(lunestone)
                    owner.storedLunestone -= lunestone
                }
                if (cosmorite > 0) {
                    this.scene.mainStats.incCosmorite(cosmorite)
                    owner.storedCosmorite -= cosmorite
                }
            })
            block.image.once(Phaser.GameObjects.Events.DESTROY, () => {
                overlap.destroy()
            })
        }
        return this
    }
}