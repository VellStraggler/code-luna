import { XY } from "../../main/xy";

export default interface IGameFighter {
    
    getHP(): number
    getPosition(): XY
    takeDamage(amt:number, target:any): void
    getHitboxes(): Phaser.Physics.Arcade.Image[]
    canShoot(): boolean
    shootLaser(): number
    aim(target:XY): void
}