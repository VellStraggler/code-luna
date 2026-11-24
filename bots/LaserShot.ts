import { generateId, LASER_DAMAGE, LASER_LIFE, LASER_SPEED, PART_DEPTH } from "../main/constants";
import MainScene from "../CodeLuna";
import { XY } from "../main/XY";
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

    constructor(
        scene: MainScene,
        shooter: IGameFighter,
        enemies: IGameFighter[],
        targetPosition?: XY,
        sourcePosition?: XY
    ) {
        // Enemy list only: Shoot at random
        const destination = targetPosition ?? enemies[Math.floor(Math.random() * enemies.length)].getPosition()

        const start = sourcePosition ?? shooter.getPosition()
        this.vec = start.getDirVector(destination)
        this.id = generateId()
        // place it at the from-Object
        this.image = scene.add.rectangle(start.x, start.y, 2, 16, MyColors.red).setDepth(PART_DEPTH)
        scene.addWorldObject(this.image)
        this.image.rotation = Math.atan2(this.vec.y, this.vec.x) + Math.PI / 2

        scene.uiCamera.ignore(this.image)
        scene.physics.add.existing(this.image)
        const body = this.image.body as Phaser.Physics.Arcade.Body
        body.setCircle(2, -1)
        body.setVelocity(this.vec.x * this.speed, this.vec.y * this.speed)

        for(const enemy of enemies) {
            for(let i = 0; i < (enemy.getHitboxes().length); i++) {
                const hitbox = enemy.getHitboxes()[i]
                const targetBlock = enemy instanceof ModularRobot ? enemy.blocks[i] : null
                scene.physics.add.collider(this.image, hitbox, () => {
                    if (this.dead) return
                    this.dead = true
                    hitbox.setBounce(1)
                    if (targetBlock) {
                        targetBlock.takeDamage(LASER_DAMAGE)
                    } else {
                        enemy.takeDamage(LASER_DAMAGE, enemy)
                    }
                    body.setVelocity(0,0)
                })
            }
        }
        scene.physics.add.collider(this.image, scene.playerBase, () => {
            this.dead = true
        })

        scene.sound.play("laser")
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