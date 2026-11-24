import { describe, expect, it } from "vitest"
import {
    calculateBlockDropResources,
    getChatPanelY,
    hasMiningCapacity,
    isStorageCapacityReached,
    PLACE_SOUND_KEYS,
    proxyRelativePosition,
    removeLegacyStarterFunctions,
    updateChatScrollOffset,
    wrapChatText
} from "../main/gameRules"

describe("robot game rules", () => {
    it("removes only unchanged legacy starter functions", () => {
        expect(removeLegacyStarterFunctions([
            { name: "sendToMine", body: "goToMine()" },
            { name: "sendHome", body: "goHome()" },
            { name: "mine", body: "goToMine()" },
            { name: "weldNearby", body: "weld(); print('ready')" }
        ])).toEqual([
            { name: "mine", body: "goToMine()" },
            { name: "weldNearby", body: "weld(); print('ready')" }
        ])
    })

    it("returns half of a block and all its parts' build costs", () => {
        expect(calculateBlockDropResources(
            { gasCost: 3, stoneCost: 1 },
            [{ gasCost: 5, stoneCost: 3.6 }]
        )).toEqual({ cosmorite: 4, lunestone: 2.3 })
    })

    it("includes half of stored resources without adding cosmorite to a lunestone-only cost", () => {
        expect(calculateBlockDropResources(
            { gasCost: 0, stoneCost: 1 },
            [],
            { cosmorite: 0, lunestone: 0 }
        )).toEqual({ cosmorite: 0, lunestone: 0.5 })
        expect(calculateBlockDropResources(
            { gasCost: 0, stoneCost: 1 },
            [],
            { cosmorite: 0.1, lunestone: 0 }
        )).toEqual({ cosmorite: 0.05, lunestone: 0.5 })
    })

    it("stops starting mining when storage is within 0.1 of capacity", () => {
        expect(hasMiningCapacity(0.1)).toBe(false)
        expect(hasMiningCapacity(0.0999)).toBe(false)
        expect(hasMiningCapacity(0.1001)).toBe(true)
    })

    it("compares capacity at the precision shown in the monitor", () => {
        expect(isStorageCapacityReached(20.96, 21)).toBe(true)
        expect(isStorageCapacityReached(20.94, 21)).toBe(false)
        expect(isStorageCapacityReached(0, 0)).toBe(false)
    })

    it("keeps chat pinned to the bottom only when it was already there", () => {
        expect(updateChatScrollOffset(100, 100, 140)).toBe(140)
        expect(updateChatScrollOffset(40, 100, 140)).toBe(40)
        expect(updateChatScrollOffset(120, 100, 140)).toBe(140)
    })

    it("wraps robot chat into rows sized for the panel", () => {
        expect(wrapChatText("short\n123456789", 5)).toEqual([
            "short", "12345", "6789"
        ])
    })

    it("anchors a collapsed chat panel to the screen bottom and matches expanded margins", () => {
        expect(getChatPanelY(600, 160, 6, true, 22)).toBe(572)
        expect(getChatPanelY(600, 160, 6, false, 22)).toBe(434)
    })

    it("uses the place sound asset for all requested game actions", () => {
        expect(PLACE_SOUND_KEYS).toEqual([
            "walk", "robotMove", "print", "equip", "unequip", "place"
        ])
    })

    it("keeps attached blocks at their exact offset from a non-origin proxy", () => {
        expect(proxyRelativePosition(
            { x: 405.25, y: 297.5 },
            { x: 16, y: -16 },
            { x: 32, y: 0 }
        )).toEqual({ x: 421.25, y: 313.5 })
    })
})
