import MainScene from "../CodeLuna"
import Logic from "../main/logic"
import { xy } from "../main/xy"
import { BlockType } from "./parts/BlockType"
import ModularRobot from "./ModularRobot"
import { PartType } from "./parts/PartType"
import { MINING_RATE_MS } from "../main/constants"
import ModularBlock from "./parts/ModularBlock"
import * as Phaser from 'phaser'

export default class ModularRobots {
    robots: ModularRobot[]
    private scene: MainScene
    private offloadingBlocks = new WeakSet<ModularBlock>()
    private offloadedThisStep = new Set<ModularRobot>()
    
    constructor(scene: MainScene, robots: ModularRobot[] = []) {
        this.robots = robots
        this.scene = scene
        scene.physics.world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, () => {
            this.offloadedThisStep.clear()
        })
        for (const robot of robots) this.allowOffloading(robot)
    }

    push(newRobot: ModularRobot) {
        this.robots.push(newRobot)
        this.allowOffloading(newRobot)
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
        let lowestDist = Logic.getDist(this.robots[0].getPosition(), this.scene.player.getPosition())
        let i = 0
        this.robots.forEach((robot, index) => {
            let dist = Logic.getDist(robot.getPosition(), this.scene.player.getPosition())
            if (dist < lowestDist) {
                i = index
                lowestDist = dist
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
        let robot = ModularRobot.create(this.scene, 400, 300, BlockType.sleek)
            .addPart(PartType.partDrill)
            .addPart(PartType.partGun)
            .addBlockType(BlockType.storage, 1, 0)
            .addPart(PartType.partCpu)
            .addBlockType(BlockType.wheel, 0, 1)
            .addBlockType(BlockType.storage, 0, -1)
            .addBlockType(BlockType.wheel, 0, -2)
            .addBlockType(BlockType.wheel, 1, 1)
            .addBlockType(BlockType.wheel, 2, 0)
            .addEnemyCollider(this.scene.player)
            .reload()
        this.robots.push(robot)
        return robot
    }

    allowOffloading(robot: ModularRobot) {
        for (const block of robot.blocks) {
            if (this.offloadingBlocks.has(block)) continue
            this.offloadingBlocks.add(block)
            const collider = this.scene.physics.add.collider(this.scene.base, block.image)
            const overlap = this.scene.physics.add.overlap(this.scene.base.zone, block.image, () => {
                const owner = block.robot
                if (!owner.blocks.includes(block) || this.offloadedThisStep.has(owner)) return
                this.offloadedThisStep.add(owner)
                const amt = MINING_RATE_MS / 100
                const lunestone = Math.min(amt, owner.storedLunestone)
                const cosmorite = Math.min(amt, Math.max(0, owner.storedCosmorite - owner.baseEnergyNeed))
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
                collider.destroy()
                overlap.destroy()
            })
        }
        return this
    }
}