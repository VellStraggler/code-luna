export const MINING_STORAGE_RESERVE = 0.1
export const CHAT_SCROLL_BOTTOM_THRESHOLD = 2

export type ResourceCosts = {
    gasCost: number
    stoneCost: number
}

export type Position = { x: number, y: number }

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
