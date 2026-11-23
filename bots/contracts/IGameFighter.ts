import HPImage from "../../main/HPImage";
import { XY } from "../../main/XY";

export default interface IGameFighter {
    
    getHP(): number
    getPosition(): XY
    getHitboxes(): HPImage[]
    takeDamage(damageAmount: number, target: any): void
    canShoot(): boolean
    shootLaser(): number
    aim(target:XY): void
}