import { generateId, LASER_LIFE, LASER_SPEED } from "../main/constants";
import MainScene from "../CodeLuna";
import { XY } from "../main/xy";
import HPImage from "../main/HPImage";
import IGameFighter from "./contracts/IGameFighter";
import ModularRobot from "./ModularRobot";
import MyColors from "../main/MyColors";

/** By default the list of available enemies is all robots and
 * the position is that of a random robot. You may hit your own!
 */
export default class LaserShot {
    readonly image!: Phaser.GameObjects.Rectangle
    readonly id: number;
    vec:XY
    public dead:boolean = false
    readonly speed: number = LASER_SPEED
    timeleft:number = LASER_LIFE //seconds

    constructor(scene: MainScene, fromObj: IGameFighter, pos: XY)
    constructor(scene: MainScene, fromObj: IGameFighter, pos: XY, enemies: IGameFighter[])
    constructor(scene: MainScene, fromObj: IGameFighter, enemies: IGameFighter[])
    constructor(scene: MainScene, fromObj: IGameFighter, enemy: IGameFighter)
    constructor(
        scene: MainScene,
        fromObj: IGameFighter,
        arg3: XY | IGameFighter[] | IGameFighter,
        arg4?: IGameFighter[]
    ) {
        var enemies: IGameFighter[] = []
        var pos:XY

        // Enemy list only: Shoot at random
        if (Array.isArray(arg3)) {
            enemies = arg3
            pos = enemies[Math.floor(Math.random() * enemies.length)].getPosition()
        } else if (arg3 instanceof HPImage || arg3 instanceof ModularRobot) {
            enemies.push(arg3)
            pos = arg3.getPosition()
        } else if (arg3 instanceof XY) { // position only, robots as enemies
            pos = arg3
            enemies = scene.robots.robots
        } else {
            throw Error("Bad argument for arg3. XY or a single/list of IGameFighter interface")
        }
        if (arg4) {
            enemies = arg4
        }

        let fromPos = fromObj.getPosition()
        this.vec = fromPos.getDirVector(pos)
        this.id = generateId()
        // place it at the from-Object
        this.image = scene.add.rectangle(fromPos.x, fromPos.y, 2, 16, MyColors.red)
        this.image.rotation = Math.atan2(this.vec.y, this.vec.x) + Math.PI / 2

        scene.uiCamera.ignore(this.image)
        scene.physics.add.existing(this.image)
        const body = this.image.body as Phaser.Physics.Arcade.Body
        body.setCircle(2, -1)
        body.setVelocity(this.vec.x * this.speed, this.vec.y * this.speed)

        for(const toObj of enemies) {
            for(let i = 0; i < (toObj.getHitboxes().length); i++) {
                const hitbox = toObj.getHitboxes()[i]
                scene.physics.add.collider(this.image, hitbox, () => {
                    hitbox.setBounce(1)
                    try {
                        let toObjR = toObj as ModularRobot
                        toObj.takeDamage(10, toObjR.blocks[i])
                    } catch {
                        toObj.takeDamage(10, toObj)
                    }
                    body.setVelocity(0,0)
                    this.dead = true
                })
            }
        }
        scene.physics.add.collider(this.image, scene.base, () => {
            this.dead = true
        })

        scene.laserSound.play()
        scene.lasers.push(this)
        this.update(0)
    }

    update(delta: number) {
        if(this.timeleft > 0 && !this.dead) {
            this.timeleft -= (delta/1000)
        } else {
            this.dead = true
            this.image.destroy()
        }
    }
}