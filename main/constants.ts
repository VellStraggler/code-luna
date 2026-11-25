import MyColors from "./MyColors"
import { xy, XY } from "./XY"

// Asset keys and animation frames
/**These names are repeated in ModularRobot, BlockDefinition, and PartDefinition,
 * so any changes to this must be made there also.  */
export const PART_DRILL_NAME = 'part-drill'
export const PART_GUN_NAME = 'part-gun'
export const PART_CPU_NAME = 'part-cpu'
export const PART_DISH_NAME = 'part-receiving-dish'
export const BLOCK_WHEEL_NAME = 'block/wheel'
export const FACTORY_BLOCK = "factory"
export const WHEEL_CHASSIS_NAME = 'wheel-chassis'
export const WELDER_PART = 'part-welder'
export const COSMORITE_ORE = "material-cosmorite-ore"

export const F0 = "-f0"
export const F1 = "-f1"

export const BLOCK_NAMES = [
    'aluminum','steel', 'factory', 'sleek', 'tread', 'storage', 'frame','null'
]

export const BASIC_ASSET_NAMES = [
    'null', 'icon-lunestone','icon-refined-cosmorite', 'icon-cosmorite',
    'material-cosmorite-ore',
    PART_CPU_NAME,'part-radio-transmitter',PART_DISH_NAME,'part-battery','part-solar-panel', PART_GUN_NAME,
    'structure-base', WHEEL_CHASSIS_NAME,
    'tile-ground'
]

export const TWO_FRAME_ASSETS = [
    'player/down','player/up','player/right','player/left', PART_DRILL_NAME, BLOCK_WHEEL_NAME, WELDER_PART
]
// World geometry and positioning
export const WINDOW = xy(800,600)
export const WINDOW_HALF = xy(WINDOW.x/2, WINDOW.y/2)
export const HIDE_POS = xy(-1000,-1000)
export const BLOCK_RES = 16
export const PIXELS_PER_METER = BLOCK_RES * 2
export const BASE_POS = xy(300,300)
export const BASE_ZONE_RADIUS = BLOCK_RES * 4
export const TELEPORT_RANGE = 200
export const DIRECTION_OFFSETS: XY[] = [xy(0,1),xy(0,-1),xy(1,0),xy(-1,0)]

export enum Dirs {
    up = "up",
    down = "down",
    left = "left",
    right = "right"
}

// Monitor dimensions and UI spacing
export const GUI_SIZE = xy(500,300)
export const GUI_SECONDARY_SIZE = xy(120, GUI_SIZE.y)
export const GUI_MARGIN = 4
export const FACTORY_GUI_PADDING = 32
export const GUI_TEXT_START = xy(
    WINDOW_HALF.x - GUI_SIZE.x/2 + GUI_MARGIN,
    WINDOW_HALF.y - GUI_SIZE.y/2 + GUI_MARGIN
)
export const TEXT_SPACING = 20
export const TOOLBOX_WIDTH = 40
export const TOOLBOX_SPACING = 8
export const TOOLBOX_OUTLINE = 3
export const CHAT_PANEL_WIDTH = 250
export const CHAT_PANEL_HEIGHT = 160
export const CHAT_PANEL_HEADER_HEIGHT = 22
export const CHAT_PANEL_COLLAPSED_HEIGHT = CHAT_PANEL_HEADER_HEIGHT
export const CHAT_PANEL_PADDING = 6
export const CHAT_PANEL_BOTTOM_MARGIN = CHAT_PANEL_PADDING
export const CHAT_PANEL_VISIBLE_LINES = 7
export const CHAT_PANEL_CHARACTERS_PER_LINE = 34
export const CHAT_PANEL_SCROLL_LINES = 3
export const RESOURCE_DROP_ATTRACT_RANGE_METERS = 5
export const RESOURCE_DROP_SPEED = 70

// Movement and physics
export const GAME_SPEED = 8000 / 60
export const MAX_SPEED = 80
export const DEFAULT_DRAG = 200

// Update timing and time units
export const LASER_TEST_MS = 15000
export const FRAME_TIME_MS = 100
export const HR_IN_MS = 60*60*1000
export const BLOCK_FRESHNESS_MS = 10000
export const RESOURCE_TRANSFER_INTERVAL_MS = 100

// Health and health-bar appearance
export const HP_BAR_DISPLAY_TIME_MS = 1500
export const STARTING_HEALTH = 100
export const HP_BAR_BG_COLOR = MyColors.white
export const HP_BAR_FG_COLOR = MyColors.purple
export const HP_X_OFFSET = 20
export const HP_Y_OFFSET = 20
export const HP_HALF_HEIGHT = 2
export const HP_BG_WIDTH = 42
export const HP_FG_WIDTH = 40
export const HP_BG_HEIGHT = 6
export const HP_FG_HEIGHT = 4

// Rendering layers and shadows
export const BLOCK_FRESHNESS_START_WHITENESS = 0.8
export const GUI_DEPTH =    500
export const GUI_BG_DEPTH = 490
export const HP_BAR_DEPTH = 400
export const DRILL_DEPTH =  350
export const PART_DEPTH =   300
export const BLOCK_DEPTH =  200
export const SHADOW_DEPTH = 100
export const SHADOW_OFFSET = xy(4,-2)

// Energy storage and consumption
export const STARTING_GAS_PER_ITEM = 0.1
export const RESOURCE_TRANSFER_AMOUNT = 0.1
export const BATTERY_SIZE = 10
export const ENERGY_USE_MULT = 0.0001
export const ENERGY_MS_PER_WHEEL = 0.0005 
export const LASER_ENERGY_USE = 1

// Laser combat
export const LASER_DAMAGE = 1
export const LASER_SPEED = 400
export const LASER_LIFE = 2

// Mining and refining
export const DRILL_TARGET_RANGE_METERS = 10
export const REFINEMENT_RATE_MS = 0.2
export const MINING_RATE_MS = 2
export const STONE_MINE_RATE = 0.34
export const GAS_MINE_RATE = 0.66

// Shared errors and ID generation
export const IMPLEMENTATION_ERROR = "This method should be overridden, but it wasn't."

const PUBLIC_CHAT_MAX_LINES = 50
const LAUNCH_GAS_COST = 100

export default class GameConstants {
    static readonly toolbar = {
        numberFontSize: 11,
        numberXOffset: 2,
        numberYOffset: 1,
        numberBackgroundRadius: 5,
        numberBackgroundDepthOffset: 1,
        numberTextDepthOffset: 2,
        iconScale: 2,
        statPrecision: 1,
        numberColor: MyColors.toCssHex(MyColors.black),
        defaultIcon: "null"
    }

    static readonly chat = {
        backgroundColor: MyColors.green,
        backgroundAlpha: 0.6,
        headerColor: MyColors.chatHeader,
        headerAlpha: 1,
        outlineColor: MyColors.white,
        outlineWidth: 1,
        titleFontSize: 12,
        titleBottomPadding: 2,
        toggleFontSize: 17,
        toggleBottomPadding: 4,
        expandedHeaderHeight: 18,
        messageFontSize: 12,
        messageLineSpacing: 2,
        textColor: MyColors.toCssHex(MyColors.white),
        titleColor: MyColors.toCssHex(MyColors.white)
    }

    static readonly player = {
        scale: 0.75,
        bodyWidth: 9,
        bodyHeight: 12,
        drag: 700,
        shadowShear: 0.3,
        shadowSquash: 0.85
    }

    static readonly laser = {
        width: 2,
        height: 16,
        bodyRadius: 2,
        bodyOffsetX: -1,
        bodyOffsetY: 0,
        secondsPerMillisecond: 1000
    }

    static readonly audio = {
        drillingVolume: 0.5
    }

    static readonly handbook = {
        width: 300,
        height: 500,
        horizontalMargin: 20,
        padding: 24,
        borderWidth: 4,
        dragBarHeight: 24,
        titleFontSize: 19,
        bodyFontSize: 15,
        footerMarginTop: 12,
        buttonFontSize: 22,
        closeButtonFontSize: 18,
        pageDisabledOpacity: 0.3
    }

    static readonly game = {
        initialCameraZoom: 2,
        cameraZoomSpeed: 0.005,
        minCameraZoom: 0.1,
        maxCameraZoom: 3,
        uiCameraZoom: 1,
        initialPlayerX: 400,
        initialPlayerY: 350,
        initialOreX: 500,
        initialOreY: 300,
        initialResourceAmount: 10,
        robotSaveIntervalMs: 1000,
        robotMovementIdleTimeoutMs: 1000,
        robotMovementIdleCheckIntervalMs: 100,
        cpuInteractionRange: 30,
        factoryInteractionRange: 30,
        missingPlayerDistance: 10000,
        publicChatMaxLines: PUBLIC_CHAT_MAX_LINES,
        debugRobotMoveDistance: 100,
        gasQuota: 1000,
        launchGasCost: LAUNCH_GAS_COST,
        rocketLaunchHeightBlocks: 100,
        miningStorageReserve: 0.05,
        chatScrollBottomThreshold: 2
    }

    static readonly robotProgram = {
        maxSourceLength: 20000,
        maxSteps: 100000,
        stepsPerUpdate: 500,
        maxCallDepth: 32,
        maxExpressionTokens: 512,
        maxNestingDepth: 32
    }

    static readonly controls = {
        toolbarItemCount: 4,
        diagonalMovementScale: 0.7,
        toolbarKeyCodes: [
            "Digit1", "Digit2", "Digit3", "Digit4",
            "Numpad1", "Numpad2", "Numpad3", "Numpad4"
        ]
    }

    static readonly prompts = {
        fontSize: 32,
        scale: 0.2,
        outlineWidth: 4,
        padding: 12
    }

    static readonly ui = {
        defaultFontSize: 16,
        compactFontSize: 12,
        buttonFontSize: 14,
        arrowFontSize: 18,
        quotaFontSize: 22
    }

    static readonly text = {
        robotSavingUnavailable: "Robot saving unavailable. Check browser storage.",
        robotChatTitle: "Robot Chat",
        chatCollapsedLabel: "+",
        chatExpandedLabel: "\u2212",
        storageLabel: "storage:",
        blocksLabel: "blocks:",
        meterRangeLabel: "meter range:",
        capacityLabel: "capacity:",
        buildBot: "Build bot",
        gasQuotaLabel: "GAS QUOTA",
        launchGasLabel: "Stored gas",
        launchPayloadLabel: "Payload",
        deployRocket: (gasCost: number) => `[Deploy (costs ${gasCost})]`,
        closeMonitor: "X",
        resourcePrefix: "x ",
        robotMoveUp: "Move all {distance} UP    ^: ",
        robotMoveDown: "Move all {distance} DOWN  v: ",
        robotMoveLeft: "Move all {distance} LEFT  <: ",
        robotMoveRight: "Move all {distance} RIGHT >: ",
        openMonitorPrompt: "open\n\n\nmonitor",
        openFactoryPrompt: "open\n\n\nfactory",
        factoryBlockType: "Block type",
        factoryParts: "Parts",
        factoryReset: "Reset",
        factoryResources: "get resources",
        factoryFromUser: "from user",
        factoryFromBot: "from bot",
        factoryPrint: "Print",
        factoryCost: "Cost:",
        gasUnit: "gas",
        stoneUnit: "stone",
        factoryPrinted: "Printed.",
        factoryOutputBlocked: "Output blocked. Clear the selected side.",
        factoryDisconnected: "Factory disconnected.",
        factoryNotEnoughResources: "Not enough resources.",
        factoryPartLimit: (limit: number) => `This block holds at most ${limit} parts.`,
        handbookNext: "Next page",
        handbookPrevious: "Previous page",
        handbookClose: "Close handbook",
        functionName: "Function name",
        functionBody: "Function body...",
        functionEditorLabel: "Robot functions",
        functionDefaultNamePrefix: "function",
        functionBodyLabel: "Function body",
        functionEditorAdd: "+ Add function",
        functionEditorStop: "Stop program",
        functionEditorRun: "Run function",
        functionEditorDelete: "Delete function",
        functionEditorToggle: "Toggle function body"
    }

    static readonly errors = {
        unexpectedCharacter: (character: string) => `Unexpected character: ${character}`,
        unexpectedToken: (token: string) => `Unexpected token: ${token}`,
        expectedToken: (token: string) => `Expected '${token}'`,
        lineError: (line: number, message: string) => `Line ${line}: ${message}`,
        invalidFunctionName: (name: string) => `Invalid or reserved function name: ${name}`,
        duplicateFunction: (name: string) => `Duplicate function: ${name}`,
        unknownFunction: (name: string) => `Unknown function: ${name}`,
        unknownVariable: (name: string) => `Unknown variable: ${name}`,
        functionArgumentCount: (name: string) => `${name} takes no arguments`,
        commandArgumentCount: (name: string, range: string) => `${name} expects ${range} arguments`,
        namedRequiresNumbers: (name: string) => `${name} requires finite numbers`,
        operatorRequiresNumbers: (operator: string) => `${operator} requires numbers`,
        namedRequiresBlockName: (name: string) => `${name} requires a block name`,
        expressionTooLong: "Expression is too long",
        expectedExpression: "Expected an expression",
        functionBodyTooLong: "Function body is too long",
        tooManyNestedBlocks: "Too many nested blocks",
        useSpacesForIndentation: "Use spaces for indentation",
        unexpectedIndentation: "Unexpected indentation",
        expectedIndentedBlock: "Expected an indented block",
        expectedBlockAfterElse: "Expected an indented block after else",
        unexpectedElse: "Unexpected else",
        instructionLimit: "Instruction limit exceeded",
        callDepthLimit: "Function call depth exceeded",
        waitSeconds: "wait requires a non-negative number of seconds",
        unaryNumber: "Unary arithmetic requires a number",
        divisionByZero: "Division by zero",
        invalidRobotSave: "Unrecognized robot save",
        robotSaveInvalid: "Robot state cannot be saved",
        robotChatRequiresDish: "Robot chat requires a receiving dish",
        robotCacheUnavailable: "Robot cache unavailable; existing data was not overwritten."
    }

    static readonly persistence = {
        storageKey: "code-luna-robots-v1",
        version: 1 as const,
        maxPartsPerBlock: 4
    }

    static readonly handbookPages = [
        {
            title: "WELCOME TO LUNA",
            body: "Your goal is to gather Cosmorite gas and ship it back to Earth.\n\n" +
                "Mine deposits yourself or build programmable robots. Return resources to the player base, " +
                "then deploy gas until the quota is met.\n\n" +
                "Move with WASD or the arrow keys. Select a tool from the numbered toolbar."
        },
        {
            title: "ROBOTS & FACTORIES",
            body: "Approach a CPU or factory and open its monitor. Factories build blocks and parts from " +
                "your resources or the robot's storage.\n\n" +
                "In a CPU monitor, add and edit functions, then press play. Programs keep running when " +
                "the monitor closes. Robots unload resources near the base."
        },
        {
            title: "ROBOT API: ACTIONS",
            body: "move(x, y) - move relative to the robot in meters (1 block = 1 meter)\n" +
                "aim(x, y), shoot(x, y) - aim or fire at world coordinates\n" +
                "goToMine(), goHome() - set a destination\n" +
                "selectBlock(name), place(x, y, factoryIndex)\n" +
                "weld() - connect nearby blocks\n" +
                "wait(seconds) - pause the program\n" +
                "print(value) - write to public chat"
        },
        {
            title: "ROBOT API: QUERIES",
            body: "canMove(), canMine(), hasCpu(), hasDrill()\n\n" +
                "getLunestone(), getCosmorite(), getFreeStorage(), getMeterRange()\n\n" +
                `getChatText() returns all chat lines. getChatText(0) returns the oldest line; ` +
                `indices 0-${PUBLIC_CHAT_MAX_LINES - 1} address up to the latest ${PUBLIC_CHAT_MAX_LINES} lines. Missing lines return an empty string.\n\n` +
                "Programs support assignments, if/else, while, return and function calls."
        },
        {
            title: "FIELD WARNINGS",
            body: "It is advised to not go through rocky zones, as the moon snakes will most certainly get you\n\n" +
                "Robots need storage space to continue mining and gas to move or fire.\n\n" +
                `A launch consumes its payload plus ${LAUNCH_GAS_COST} gas. The quota updates when the rocket has departed.`
        }
    ]
}

let nextId = 0
export function generateId() {
    return nextId++;
}
