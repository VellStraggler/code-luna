import { XY } from "../../main/xy";

export default interface IGameFighter {
    
    getHP(): number
    getPosition(): XY
    takeDamage(amt:number, target:any): void
    canShoot(): boolean
    shootLaser(): any
    aim(target:XY): void
}