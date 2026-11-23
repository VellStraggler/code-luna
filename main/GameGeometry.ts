import { Dirs } from "./constants";
import HPImage from "./HPImage";
import { xy, XY } from "./XY";
import * as Phaser from 'phaser'

export default class GameGeometry {

    public static distanceBetween(firstPosition: XY, secondPosition: XY): number {
        return Phaser.Math.Distance.Between(
            firstPosition.x, firstPosition.y, secondPosition.x, secondPosition.y
        )
    }

    public static distanceFromPointer(image: HPImage, pointer: Phaser.Input.Pointer) {
        return Phaser.Math.Distance.Between(
            image.getPosition().x, image.getPosition().y,
            pointer.worldX, pointer.worldY
        )
    }

    public static directionBetween(firstPosition: XY, secondPosition: XY): Dirs {
        if (firstPosition.x < secondPosition.x) {
            return Dirs.right
        } else if (firstPosition.x > secondPosition.x) {
            return Dirs.left
        } else if (firstPosition.y < secondPosition.y) {
            return Dirs.down
        } else
            return Dirs.up
    }

    public static originForAlignment(alignment: string) {
        let origin = xy()
        switch(alignment) {
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