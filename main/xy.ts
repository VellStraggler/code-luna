export class XY {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
    // multiply(otherXY: XY): XY;
    // multiply(amt: number): XY;
    multiply(amt: XY | number) {
        let x = this.x
        let y = this.y
        if (typeof amt === 'number') {
            x *= amt
            y *= amt
        } else {
            x *= amt.x
            y *= amt.y
        }
        return xy(x,y)
    }
    static distance(a:XY, b:XY) {
        return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2))
    }
    getDirVector(target:XY) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;

        const length = Math.sqrt(dx * dx + dy * dy);

        const dir = xy(
            dx / length,
            dy / length
        );
        return dir
    }
    /** Default facing angle is up. Be sure that all images that use this point up to start. */
    getFacingAngle(target:XY) {
        const dx = target.x - this.x;
        const dy = target.x - this.y;

        const rotation = Math.atan2(dy, dx) + Math.PI / 2;
        return rotation
    }
    toString() {
        return this.x.toString() + ", " + this.y.toString()
    }
    add(amt:XY | number) {
        let x = this.x
        let y = this.y
        if (typeof amt === 'number') {
            x += amt
            y += amt
        } else {
            x += amt.x
            y += amt.y
        }
        return xy(x,y)
    }
    subtract(amt:XY | number) {
        let x = this.x
        let y = this.y
        if (typeof amt === 'number') {
            x -= amt
            y -= amt
        } else {
            x -= amt.x
            y -= amt.y
        }
        return xy(x,y)
    }
}
export function xy(x:number =0, y:number =0) {
    return new XY(x,y)
}
export default function pos(x:number=0,y:number=0) {
    return xy(x,y)
}