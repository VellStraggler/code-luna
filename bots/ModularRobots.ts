import MainScene from "../CodeLuna"
import Logic from "../main/logic"
import { xy } from "../main/xy"
import { BlockType } from "./parts/BlockType"
import ModularRobot from "./ModularRobot"
import { PartType } from "./parts/PartType"
import { MINING_RATE_MS } from "../main/constants"

export default class ModularRobots {
    robots: ModularRobot[]
    private scene: MainScene
    
    constructor(scene: MainScene, robots: ModularRobot[] = []) {
        this.robots = robots
        this.scene = scene
    }

    push(newRobot: ModularRobot) {
        this.robots.push(newRobot)
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
            .addBlockType(BlockType.storage, 0, 1)
            .addPart(PartType.partCpu)
            .addBlockType(BlockType.wheel, 1, 0)
            .addBlockType(BlockType.storage, 0, -1)
            .addBlockType(BlockType.wheel, 0, -2)
            .addBlockType(BlockType.wheel, 1, 1)
            .addBlockType(BlockType.wheel, 0, 2)
            .addEnemyCollider(this.scene.player)
            .reload()
        this.robots.push(robot)
        this.allowOffloading(robot)
        return robot
    }

    allowOffloading(robot: ModularRobot) {
        if (robot.blocks.length == 0) return this
        this.scene.physics.add.collider(this.scene.base, robot.blocks[0].image, () => {
            let amt = MINING_RATE_MS / 100
            if (robot.storedLunestone - amt > 0) {
                this.scene.mainStats.incLunestone(amt)
                robot.storedLunestone -= amt
            }
            if (robot.storedCosmorite - amt > robot.baseEnergyNeed) {
                this.scene.mainStats.incCosmorite(amt)
                robot.storedCosmorite -= amt
            }
        })
    }
}