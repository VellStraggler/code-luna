import { describe, expect, it } from "vitest"
import MyColors from "../main/MyColors"

describe("MyColors", () => {
    it("formats 24-bit values as six-digit CSS hex", () => {
        expect(MyColors.toCssHex(0x000000)).toBe("#000000")
        expect(MyColors.toCssHex(0x4f46e5)).toBe("#4f46e5")
    })

    it("preserves alpha when formatting 32-bit CSS hex", () => {
        expect(MyColors.toCssHex(0xffffff66)).toBe("#ffffff66")
    })

    it("rejects values outside the unsigned 32-bit color range", () => {
        expect(() => MyColors.toCssHex(-1)).toThrow(RangeError)
        expect(() => MyColors.toCssHex(0x100000000)).toThrow(RangeError)
    })
})
