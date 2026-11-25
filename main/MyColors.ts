export default class MyColors {
    static readonly clear = 0x00000000
    static readonly white = 0xffffff
    static readonly purple = 0x4f46e5
    static readonly red = 0xff0000
    static readonly green = 0x00aa00
    static readonly blue = 0x0000ff
    static readonly black = 0x000000
    static readonly darkRed = 0x8b0000
    static readonly darkGreen = 0x123d12

    static readonly gameBackground = 0x444444
    static readonly chatHeader = MyColors.darkGreen
    static readonly baseArrow = 0x87cefa
    static readonly warning = 0xff8080
    static readonly capacityWarning = 0xff3333

    static readonly handbookBackground = 0xf6f0df
    static readonly handbookBorder = 0x55483e
    static readonly handbookText = 0x40372e
    static readonly handbookDragBar = 0x55483e22

    static readonly editorScrollbarTrack = 0x173e17
    static readonly editorBackground = 0x123d12
    static readonly editorError = 0xffbaba
    static readonly whiteAlpha40 = 0xffffff66

    static toCssHex(color: number): string {
        if (!Number.isInteger(color) || color < 0 || color > 0xffffffff) {
            throw new RangeError("Color must be an unsigned 32-bit integer")
        }
        const digits = color > 0xffffff ? 8 : 6
        return `#${color.toString(16).padStart(digits, "0")}`
    }
}