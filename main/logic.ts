import { Dirs } from "./constants";
import { xy, XY } from "./xy";
import * as Phaser from 'phaser'

export default class Logic {

    public static getDist(xy1: XY, xy2: XY): number {
        return Phaser.Math.Distance.Between(
            xy1.x, xy1.y, xy2.x, xy2.y
        )
    }

    public static getDir(xy1: XY, xy2: XY): Dirs {
        if (xy1.x < xy2.x) {
            return Dirs.right
        } else if (xy1.x > xy2.x) {
            return Dirs.left
        } else if (xy1.y < xy2.y) {
            return Dirs.down
        } else
            return Dirs.up
    }

    public static parseOrigin(align: string) {
        let origin = xy()
        switch(align) {
            case "left":
                break
            case "right":
                origin.x = 1
                break
            case "center":
                origin.x = 0.5
                break
            default:
                break
        }
        return origin
    }
}