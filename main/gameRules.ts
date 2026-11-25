import GameConstants, { PIXELS_PER_METER } from "./constants"

export const MINING_STORAGE_RESERVE = GameConstants.game.miningStorageReserve
export const CHAT_SCROLL_BOTTOM_THRESHOLD = GameConstants.game.chatScrollBottomThreshold

export type ResourceCosts = {
    gasCost: number
    stoneCost: number
}

export type Position = { x: number, y: number }

export function metersToPixels(meters: number) {
    return meters * PIXELS_PER_METER
}

export function getAcceleratedHoldBatch(now: number, startedAt: number, nextAt: number) {
    let steps = 0
    while (now >= nextAt) {
        const seconds = Math.floor((nextAt - startedAt) / 1000)
        const interval = seconds < 2 ? 100 : 1
        const step = seconds < 2 ? Math.pow(10, seconds) : 100 * Math.pow(10, Math.min(seconds - 2, 9))
        const end = Math.min(now, startedAt + (seconds + 1) * 1000 - 0.0001)
        const count = Math.max(1, Math.floor((end - nextAt) / interval) + 1)
        steps += step * count
        nextAt += interval * count
    }
    return { steps, nextAt }
}

export function accumulateMovementIdleMs(
    previousSamplePosition: Position,
    currentSamplePosition: Position,
    idleMs: number,
    frameDeltaMs: number
) {
    if (previousSamplePosition.x !== currentSamplePosition.x ||
        previousSamplePosition.y !== currentSamplePosition.y) return 0
    return idleMs + Math.max(0, frameDeltaMs)
}

export function getMovementIdleSample(
    elapsedMs: number,
    frameDeltaMs: number,
    intervalMs: number
) {
    const totalElapsedMs = Math.max(0, elapsedMs) + Math.max(0, frameDeltaMs)
    if (totalElapsedMs < intervalMs) {
        return { shouldSample: false, elapsedMs: 0, remainderMs: totalElapsedMs }
    }
    return {
        shouldSample: true,
        elapsedMs: totalElapsedMs,
        remainderMs: 0
    }
}

export function proxyRelativePosition(
    proxyPosition: Position,
    proxyLocalPosition: Position,
    objectLocalPosition: Position
): Position {
    return {
        x: proxyPosition.x - proxyLocalPosition.x + objectLocalPosition.x,
        y: proxyPosition.y - proxyLocalPosition.y + objectLocalPosition.y
    }
}

export function calculateBlockDropResources(
    block: ResourceCosts,
    parts: ResourceCosts[],
    stored: { cosmorite: number, lunestone: number } = { cosmorite: 0, lunestone: 0 }
) {
    const total = parts.reduce((resources, part) => ({
        gasCost: resources.gasCost + part.gasCost,
        stoneCost: resources.stoneCost + part.stoneCost
    }), { gasCost: block.gasCost, stoneCost: block.stoneCost })
    return {
        cosmorite: (total.gasCost + stored.cosmorite) / 2,
        lunestone: (total.stoneCost + stored.lunestone) / 2
    }
}

export function hasMiningCapacity(freeStorage: number) {
    return freeStorage > MINING_STORAGE_RESERVE
}

export function removeLegacyStarterFunctions<T extends { name: string, body: string }>(functions: T[]) {
    const starterBodies = new Map([
        ["sendToMine", "goToMine()"],
        ["sendHome", "goHome()"],
        ["weldNearby", "weld()"]
    ])
    return functions.filter(functionDefinition =>
        starterBodies.get(functionDefinition.name) !== functionDefinition.body
    )
}

export function isStorageCapacityReached(stored: number, capacity: number, precision = 1) {
    return capacity > 0 &&
        Number(stored.toFixed(precision)) >= Number(capacity.toFixed(precision))
}

export function updateChatScrollOffset(
    scrollOffset: number,
    previousMaxOffset: number,
    nextMaxOffset: number
) {
    const wasAtBottom = previousMaxOffset - scrollOffset <= CHAT_SCROLL_BOTTOM_THRESHOLD
    return wasAtBottom
        ? nextMaxOffset
        : Math.max(0, Math.min(scrollOffset, nextMaxOffset))
}

export function wrapChatText(text: string, maxCharacters: number) {
    return text.split("\n").flatMap(line => {
        if (line.length <= maxCharacters) return [line]
        const wrapped: string[] = []
        for (let start = 0; start < line.length; start += maxCharacters) {
            wrapped.push(line.slice(start, start + maxCharacters))
        }
        return wrapped
    })
}

export function getChatPanelY(
    windowHeight: number,
    panelHeight: number,
    bottomPadding: number,
    collapsed: boolean,
    collapsedHeight: number
) {
    return windowHeight - (collapsed ? collapsedHeight + bottomPadding : panelHeight + bottomPadding)
}

export const PLACE_SOUND_KEYS = [
    "walk",
    "robotMove",
    "print",
    "equip",
    "unequip",
    "place"
] as const
