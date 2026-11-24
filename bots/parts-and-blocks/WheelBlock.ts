import MainScene from "../../CodeLuna";
import { BLOCK_DEPTH, Dirs, ENERGY_MS_PER_WHEEL, WHEEL_CHASSIS_NAME } from "../../main/constants";
import { XY } from "../../main/XY";
import ModularRobot from "../ModularRobot";
import { BlockDefinition } from "./BlockDefinition";
import ModularBlock from "./ModularBlock";
import * as Phaser from 'phaser'

export default class WheelBlock extends ModularBlock {
    chassisImages: Partial<Record<Dirs, Phaser.GameObjects.Image>> = {}

    constructor(scene: MainScene, position: XY, robot: ModularRobot) {
        super(
            scene,
            position, 
            BlockDefinition.wheel,
            robot
        )
    }

    public createChassis(dir: Dirs): void {
        let chassis = this.chassisImages[dir]
        if (!chassis) {
            chassis = this.scene.add.image(this.globalPos.x, this.globalPos.y, WHEEL_CHASSIS_NAME)
                .setDepth(BLOCK_DEPTH + 50)
            this.chassisImages[dir] = chassis
            this.scene.uiCamera.ignore(chassis)
            this.scene.addWorldObject(chassis)
        }
        chassis.setPosition(this.globalPos.x, this.globalPos.y)
            .setRotation(this.determineChassisRotation(dir))
            .setVisible(true)
        this.updateDamageTint()
        this.updateFreshness()
    }

    public resetChassis() {
        for (const chassis of Object.values(this.chassisImages)) {
            chassis?.setVisible(false)
        }
        this.updateFreshness()
    }

    protected override getFreshnessSources(): Phaser.GameObjects.Image[] {
        return [
            ...super.getFreshnessSources(),
            ...Object.values(this.chassisImages ?? {}).filter(
                (image): image is Phaser.GameObjects.Image => image !== undefined
            )
        ]
    }

    override updateDamageTint() {
        super.updateDamageTint()
        for (const chassis of Object.values(this.chassisImages ?? {})) {
            if (this.image.isTinted) {
                chassis?.setTint(this.image.tintTopLeft)
            } else {
                chassis?.clearTint()
            }
        }
    }

    public override destroy() {
        for (const chassis of Object.values(this.chassisImages)) {
            chassis?.destroy()
        }
        this.chassisImages = {}
        super.destroy()
    }
    
    private determineChassisRotation(dir: Dirs): number {
        // The chassis artwork points down before rotation.
        let baseRotation = 0
        switch (dir) {
            case (Dirs.left):
                baseRotation = 1
                break
            case (Dirs.right):
                baseRotation = 3
                break
            case (Dirs.up):
                baseRotation = 2
                break
            default: //down
                break
        }
        
        return Math.PI/2 * baseRotation
    }

    update(animate: boolean = false) {
        super.update(animate)

        let newx = this.globalPos.x
        let newy = this.globalPos.y
        for (const chassis of Object.values(this.chassisImages)) {
            chassis?.setPosition(newx, newy)
        }

        if (this.robot != null) {
            this.image.setRotation(this.robot.movingDirectionRadians)
            this.updateFreshness()
        }

    }

    override getEnergyUse() {
        if (this.isActive) {
            return ENERGY_MS_PER_WHEEL
        }
        return 0
    }
}