import MainScene from "../../CodeLuna";
import { BLOCK_DEPTH, BLOCK_RES, Dirs, ENERGY_MS_PER_WHEEL, WHEEL_CHASSIS_NAME } from "../../main/constants";
import Logic from "../../main/logic";
import { xy, XY } from "../../main/xy";
import ModularRobot from "../ModularRobot";
import ModularRobots from "../ModularRobots";
import { BlockType } from "./BlockType";
import ModularBlock from "./ModularBlock";
import * as Phaser from 'phaser'

export default class WheelBlock extends ModularBlock {
    chassisImage: Phaser.Physics.Arcade.Image | null

    constructor(scene: MainScene, position: XY, robot: ModularRobot) {
        super(
            scene,
            position, 
            BlockType.wheel,
            robot
        )
        this.chassisImage = null
        this.createChassis(Dirs.down)
    }

    public createChassis(dir: Dirs): void {
        let x = this.globalPos.x
        let y = this.globalPos.y
        
        this.chassisImage = this.scene.physics.add.image(x, y, WHEEL_CHASSIS_NAME)
        .setBodySize(BLOCK_RES-2, BLOCK_RES-2, true)
        .setDepth(BLOCK_DEPTH + 50)
        this.scene.baseLayer.push(this.chassisImage)
        this.rotateChassis(dir)
    }

    public override disconnect(scene: MainScene, robots: ModularRobots) {
        this.chassisImage?.destroy()
        this.chassisImage = null
        this.robot.wheels = this.robot.wheels.filter(wheel => wheel != this)
        super.disconnect(scene, robots)
    }
    
    public override rotateChassis(dir: Dirs): void {
        this.chassisImage?.setRotation(this.determineChassisRotation(dir))
    }
    private determineChassisRotation(dir: Dirs): number {
        let baseRotation = 0
        switch (dir) {
            case (Dirs.left):
                baseRotation =3
                break
            case (Dirs.right):
                baseRotation = 1
                break
            case (Dirs.down):
                baseRotation = 2
                break
            default: //up
                break
        }
        
        return Math.PI/2 * baseRotation
    }

    update(animate: boolean = false) {
        super.update(animate)

        let newx = this.globalPos.x
        let newy = this.globalPos.y
        this.chassisImage?.setPosition(newx, newy)

        if (this.robot != null) {
            this.image.setRotation(this.robot.movingDirectionRadians)
        }

    }

    override getEnergyUse() {
        if (this.isActive) {
            return ENERGY_MS_PER_WHEEL
        }
        return 0
    }
}