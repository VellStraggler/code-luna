import MyColors from "./MyColors"
import { xy, XY } from "./XY"

// Asset keys and animation frames
/**These names are repeated in ModularRobot, BlockDefinition, and PartDefinition,
 * so any changes to this must be made there also.  */
export const PART_DRILL_NAME = 'part-drill'
export const PART_GUN_NAME = 'part-gun'
export const PART_CPU_NAME = 'part-cpu'
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
    PART_CPU_NAME,'part-radio-transmitter','part-receiving-dish','part-battery','part-solar-panel', PART_GUN_NAME,
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
export const GUI_SECONDARY_SIZE = xy(100, GUI_SIZE.y)
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

let nextId = 0
export function generateId() {
    return nextId++;
}
