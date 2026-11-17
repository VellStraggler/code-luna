import MainStats from "./MainStats"
import MainScene from "../CodeLuna"
import { HIDE_POS, GUI_DEPTH, WINDOW, GUI_SIZE, GUI_SECONDARY_SIZE, GUI_MARGIN, TEXT_SPACING, TOOLBOX_WIDTH, TOOLBOX_SPACING, FACTORY_BLOCK, PART_GUN_NAME, WELDER_PART, F0, RESOURCE_TRANSFER_AMOUNT, RESOURCE_TRANSFER_INTERVAL_MS } from "./constants"
import MyColors from "./MyColors"
import ModularRobot from "../bots/ModularRobot"
import { GuiState } from "../bots/parts/CpuPart"
import UIColumn from "./UITextColumn"
import RobotFunctionEditor from "./RobotFunctionEditor"
import FactoryBlock from "../bots/parts/FactoryBlock"
import FactoryGUI from "./FactoryGUI"

type RobotResource = "storedLunestone" | "storedCosmorite"

export default class GUI {
    private scene: MainScene

    mainStats: MainStats
    public hud!: UIColumn

    public guiRects: Phaser.GameObjects.Rectangle[] = []

    public baseGUI!: UIColumn

    public robotGUI!: UIColumn
    private robotStatsGUI!: UIColumn
    private monitorContainer!: Phaser.GameObjects.Container
    private monitorScreens: Phaser.GameObjects.Container[] = []

    public playerTools!: UIColumn

    public messageOpenRobotGUI!: Phaser.GameObjects.Text
    public robotOfCPU: ModularRobot | null = null
    public clickMeOutline: Phaser.GameObjects.Rectangle
    private monitorCloseButton!: Phaser.GameObjects.Text
    private robotFunctionEditor: RobotFunctionEditor
    private factoryGUI: FactoryGUI
    private factoryOfGUI: FactoryBlock | null = null
    private messageOpenFactoryGUI!: Phaser.GameObjects.Text
    private factoryOutline!: Phaser.GameObjects.Rectangle
    private robotResourceButtons: Phaser.GameObjects.Text[] = []
    private resourceTransferHold: {
        pointer: Phaser.Input.Pointer
        robot: ModularRobot
        resource: RobotResource
        direction: 1 | -1
        nextTransferAt: number
    } | null = null
    
    constructor(scene: MainScene, mainStats: MainStats) {
        this.scene = scene
        this.mainStats = mainStats

        this.initHud()
        this.initMonitor()
        this.initPlayerTools()
        this.initCommandGUI()
        this.initCpuGUI()
        this.factoryGUI = new FactoryGUI(this.scene)
        this.robotFunctionEditor = new RobotFunctionEditor(this.scene)
        this.monitorScreens[0].add([
            ...this.baseGUI.getAsGameObjects(),
            ...this.robotGUI.getAsGameObjects()
        ])
        this.monitorScreens[0].add(this.factoryGUI.container)
        this.monitorScreens[1].add([
            ...this.robotStatsGUI.getAsGameObjects(),
            ...this.robotResourceButtons
        ])
        this.layoutMonitor()
        this.initMessageOpenCPU()
        this.initMessageOpenFactory()
        this.hideAll()

        this.clickMeOutline = this.scene.add.rectangle(HIDE_POS.x, HIDE_POS.y, 20, 20)
            .setFillStyle(MyColors.white, 0)
            .setDepth(GUI_DEPTH)
            .setVisible(false)
            .setStrokeStyle(1, 0xffffff)
        this.scene.uiCamera.ignore(this.clickMeOutline)
    }

    private initHud() {
        this.hud = new UIColumn(this.scene, TEXT_SPACING, TEXT_SPACING, true)
            .addIconStatLine('icon-lunestone', 'x ', () => this.mainStats.getLunestone())
            .addIconStatLine('icon-refined-cosmorite', 'x ', () => this.mainStats.getGas())
            .addIconStatLine('part-battery', 'x ', () => this.mainStats.getEnergyUseMs() * 1000)
    }

    private hideAll() {
        this.robotGUI.setVisibility(false)
        this.robotStatsGUI.setVisibility(false)
        this.baseGUI.setVisibility(false)
        this.factoryGUI.setVisible(false)
    }

    hideGUI() {
        this.hideCpuNotifier()
        this.hideFactoryNotifier()
    }

    private initMessageOpenCPU() {
        this.messageOpenRobotGUI = this.scene.add.text(-1000, -1000, 'open\n\n\nmonitor', {
            fontSize: '32px',
            color: '#000000',
            fontStyle: 'bold',
            stroke: '#ffffff',
            strokeThickness: 4,
            padding: {x:12, y:12},
            align: 'center'
        })
        this.messageOpenRobotGUI.setInteractive({ useHandCursor: true }).setDepth(GUI_DEPTH).on('pointerdown', (
            _pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData
        ) => {
            event.stopPropagation()
            if (this.baseGUI.isVisible || this.factoryGUI.isVisible) return
            const cpu = this.robotOfCPU?.getCpuPart()
            if (!cpu?.isNearPlayer()) return
            cpu.guiState = GuiState.open
            this.toggleRobotGUI(true)
            this.hideCpuNotifier()
        })
            .setScale(0.20)
            .setOrigin(0.5, 0.5)
            .setVisible(false)
        this.messageOpenRobotGUI.setDepth(GUI_DEPTH + 1)
        this.scene.uiCamera.ignore(this.messageOpenRobotGUI)
    }

    private initMessageOpenFactory() {
        this.messageOpenFactoryGUI = this.scene.add.text(HIDE_POS.x, HIDE_POS.y, "open\n\n\nfactory", {
            fontSize: "32px", color: "#000000", fontStyle: "bold",
            stroke: "#ffffff", strokeThickness: 4, padding: { x: 12, y: 12 }, align: "center"
        })
            .setScale(0.20)
            .setOrigin(0.5)
            .setDepth(GUI_DEPTH + 1)
            .setVisible(false)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", (
                _pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData
            ) => {
                event.stopPropagation()
                if (this.baseGUI.isVisible || !this.factoryOfGUI?.isNearPlayer()) return
                this.factoryOfGUI.guiState = GuiState.open
                this.toggleFactoryGUI(true)
                this.hideFactoryNotifier()
            })
        this.factoryOutline = this.scene.add.rectangle(HIDE_POS.x, HIDE_POS.y, 20, 20)
            .setFillStyle(MyColors.white, 0)
            .setStrokeStyle(1, MyColors.white)
            .setDepth(GUI_DEPTH)
            .setVisible(false)
        this.scene.uiCamera.ignore([this.messageOpenFactoryGUI, this.factoryOutline])
    }

    private hideFactoryNotifier() {
        this.messageOpenFactoryGUI.setPosition(HIDE_POS.x, HIDE_POS.y).setVisible(false)
        this.factoryOutline.setPosition(HIDE_POS.x, HIDE_POS.y).setVisible(false)
    }

    private updateFactoryGUI() {
        let closest: FactoryBlock | null = null
        let distance = Infinity
        for (const robot of this.scene.robots) {
            for (const block of robot.blocks) {
                if (!(block instanceof FactoryBlock) || !block.image.active || !block.image.body) continue
                const nextDistance = block.getDistanceToPlayer()
                if (nextDistance < distance) {
                    closest = block
                    distance = nextDistance
                }
            }
        }
        if (this.factoryOfGUI && this.factoryOfGUI !== closest) {
            this.factoryOfGUI.guiState = GuiState.closed
            this.toggleFactoryGUI(false)
        }
        this.factoryOfGUI = closest
        this.factoryGUI.setFactory(closest)
        if (!closest || this.baseGUI.isVisible || this.robotGUI.isVisible) {
            if (closest) closest.guiState = GuiState.closed
            this.hideFactoryNotifier()
            this.toggleFactoryGUI(false)
            return
        }
        if (closest.guiState === GuiState.open) {
            if (distance >= 50) closest.guiState = GuiState.closed
        } else {
            closest.guiState = closest.isNearPlayer() ? GuiState.notifying : GuiState.closed
        }
        if (closest.guiState === GuiState.open) {
            this.toggleFactoryGUI(true)
            this.hideFactoryNotifier()
            this.factoryGUI.update()
        } else {
            this.toggleFactoryGUI(false)
            if (closest.guiState === GuiState.notifying) {
                this.messageOpenFactoryGUI.setPosition(closest.image.x, closest.image.y).setVisible(true)
                this.factoryOutline.setPosition(closest.image.x, closest.image.y).setVisible(true)
            } else {
                this.hideFactoryNotifier()
            }
        }
    }

    public hideCpuNotifier() {
        this.messageOpenRobotGUI.setPosition(HIDE_POS.x, HIDE_POS.y).setVisible(false)
        this.clickMeOutline.setPosition(HIDE_POS.x, HIDE_POS.y).setVisible(false)
    }

    public updateCpuNotifier(x:number, y: number) {
        this.messageOpenRobotGUI.setPosition(x, y).setVisible(true)
        this.clickMeOutline.setPosition(x, y).setVisible(true)
    }

    update() {
        this.hud.update()
        this.updateFactoryGUI()
        this.updateRobotGUI()
        this.updateResourceTransfer()
        this.robotStatsGUI.update()
        if (this.robotGUI.isVisible) this.robotFunctionEditor.position(this.monitorScreens[0])
    }

    public updateRobotGUI() {
        const previousCpu = this.robotOfCPU?.getCpuPart()
        this.robotOfCPU = this.scene.robots.findRobotClosestToPlayer()
        this.robotFunctionEditor.setRobot(this.robotOfCPU)
        const cpu = this.robotOfCPU?.getCpuPart()
        this.scene.player.closestCPU = cpu ?? null
        if (previousCpu && previousCpu !== cpu) previousCpu.guiState = GuiState.closed

        if (!cpu || this.baseGUI.isVisible || this.factoryGUI.isVisible) {
            if (cpu) cpu.guiState = GuiState.closed
            this.hideCpuNotifier()
            this.toggleRobotGUI(false)
            this.robotGUI.update()
            return
        }

        // Closing may show the nearby prompt again, but must not reopen the monitor.
        if (cpu.guiState == GuiState.open) {
            if (cpu.getDistanceToPlayer() >= 50) cpu.guiState = GuiState.closed
        } else {
            cpu.guiState = cpu.isNearPlayer() ? GuiState.notifying : GuiState.closed
        }

        switch(cpu.guiState) {
            case GuiState.open:
                this.toggleRobotGUI(true)
                this.hideCpuNotifier()
                break
            case GuiState.notifying:
                this.toggleRobotGUI(false)
                this.updateCpuNotifier(cpu.parentBlock.image.x, cpu.parentBlock.image.y)
                break
            case GuiState.closed:
                this.hideCpuNotifier()
                this.toggleRobotGUI(false)
                break
        }

        this.robotGUI.update()
    }

    private initMonitor() {
        this.monitorContainer = this.scene.add.container(0, 0)
            .setScrollFactor(0)
            .setDepth(GUI_DEPTH)
            .setVisible(false)
        for (const size of [GUI_SIZE, GUI_SECONDARY_SIZE]) {
            const screen = this.scene.add.container(0, 0).setSize(size.x, size.y)
            const box = this.scene.add.rectangle(0, 0, size.x, size.y, MyColors.green)
                .setOrigin(0, 0)
                .setAlpha(0.6)
                .setStrokeStyle(2, MyColors.white)
            screen.add(box)
            this.guiRects.push(box)
            this.monitorScreens.push(screen)
            this.monitorContainer.add(screen)
        }
        this.monitorCloseButton = this.scene.add.text(
            0, 0,
            "X",
            { fontSize: "16px", color: "#ffffff", fontStyle: "bold", padding: { x: 4, y: 2 } }
        )
            .setOrigin(1, 0)
            .setScrollFactor(0)
            .setDepth(GUI_DEPTH + 1)
            .setVisible(false)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', (
                _pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData
            ) => {
                event.stopPropagation()
                if (this.factoryGUI.isVisible) {
                    if (this.factoryOfGUI) this.factoryOfGUI.guiState = GuiState.closed
                    this.toggleFactoryGUI(false)
                    this.hideFactoryNotifier()
                } else {
                    this.closeRobotGUI()
                }
            })
        this.monitorContainer.add(this.monitorCloseButton)
    }

    private layoutMonitor() {
        const factoryOpen = this.factoryGUI.isVisible
        const sidePadding = factoryOpen ? 32 : 0
        const topPadding = Math.max(this.monitorCloseButton.height + GUI_MARGIN + GUI_MARGIN / 2, sidePadding)
        const columns = factoryOpen ? [] :
            this.baseGUI.isVisible ? [this.baseGUI] : [this.robotGUI, this.robotStatsGUI]
        const sizes = [GUI_SIZE, GUI_SECONDARY_SIZE]
        let screenHeight = 0
        let width = sidePadding
        for (const [index, screen] of this.monitorScreens.entries()) {
            screen.setVisible(!factoryOpen || index === 0)
            if (factoryOpen && index !== 0) continue
            const size = sizes[index]
            const height = Math.max(size.y, (columns[index]?.latestY ?? 0) + GUI_MARGIN)
            screen.setPosition(width, topPadding).setSize(size.x, height)
            this.guiRects[index].setSize(size.x, height)
            screenHeight = Math.max(screenHeight, height)
            width += screen.width + TEXT_SPACING
        }
        width += sidePadding - TEXT_SPACING
        const height = topPadding + screenHeight + (factoryOpen ? sidePadding : GUI_MARGIN)
        this.monitorContainer.setSize(width, height)
            .setPosition((WINDOW.x - width) / 2, (WINDOW.y - height) / 2)
        this.monitorCloseButton.setPosition(width, GUI_MARGIN)
    }

    private initPlayerTools() {
        let startX = WINDOW.x - TEXT_SPACING - TOOLBOX_SPACING
        let startY = WINDOW.y/2 - (1 * (TOOLBOX_WIDTH + 4))

        this.playerTools = new UIColumn(
            this.scene, 
            startX, 
            startY,
            true,
            "right"
        )
            .addIconButton(PART_GUN_NAME, () => this.scene.player.toggleHoldingGun())
            .addIconButton(WELDER_PART + F0, () => this.scene.player.toggleHoldingWelder())
            .addIconButton(FACTORY_BLOCK, () => this.scene.player.toggleHoldingFactoryBlock())
    }

    private initCpuGUI() {
        this.robotGUI = new UIColumn(this.scene, GUI_MARGIN, GUI_MARGIN, false)
        this.robotStatsGUI = new UIColumn(this.scene, GUI_MARGIN, GUI_MARGIN, false)
            .addTextLine("storage:")
        this.addRobotResourceRow("storedLunestone", "icon-lunestone")
        this.addRobotResourceRow("storedCosmorite", "icon-refined-cosmorite")
        this.robotStatsGUI
            .addIconStatLine('part-battery', 'x ', () => this.robotOfCPU?.getCalculatedEnergyUse())
            .addTextLine("blocks:")
            .addStatLine(" ", () => String(this.robotOfCPU?.blocks.length ?? 0))
            .addTextLine("meter range:")
            .addStatLine(" ", () => this.robotOfCPU?.getMeterRange())
            .addTextLine("capacity:")
            .addStatLine(" ", () => {
                const robot = this.robotOfCPU
                const stored = robot ? robot.storedLunestone + robot.storedCosmorite : 0
                return `${stored.toFixed(1)} / ${(robot?.storageSpace ?? 0).toFixed(1)}`
            })
            .setFontSize(12, GUI_SECONDARY_SIZE.x - GUI_MARGIN * 2)
    }

    private addRobotResourceRow(resource: RobotResource, icon: string) {
        const y = this.robotStatsGUI.latestY
        this.robotStatsGUI.addIconStatLine(icon, "x ", () => this.robotOfCPU?.[resource], 40)
        for (const [index, direction] of ([1, -1] as const).entries()) {
            const button = this.scene.add.text(
                GUI_SECONDARY_SIZE.x - GUI_MARGIN - 36 + index * 18, y,
                direction === 1 ? "+" : "-",
                { fontSize: "14px", fontStyle: "bold", color: "#ffffff", align: "center" }
            )
                .setFixedSize(18, TEXT_SPACING)
                .setScrollFactor(0)
                .setDepth(GUI_DEPTH)
                .setVisible(false)
                .setInteractive({ useHandCursor: true })
                .on("pointerdown", (
                    pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData
                ) => {
                    event.stopPropagation()
                    const robot = this.robotOfCPU
                    if (!pointer.leftButtonDown() || !this.robotGUI.isVisible || !robot) return
                    this.resourceTransferHold = {
                        pointer, robot, resource, direction,
                        nextTransferAt: this.scene.time.now + RESOURCE_TRANSFER_INTERVAL_MS
                    }
                    this.transferRobotResource(robot, resource, direction)
                })
            const stopTransfer = (pointer: Phaser.Input.Pointer) => {
                if (this.resourceTransferHold?.pointer === pointer) this.resourceTransferHold = null
            }
            button.on("pointerup", stopTransfer).on("pointerout", stopTransfer)
            this.robotResourceButtons.push(button)
        }
    }

    private updateResourceTransfer() {
        const held = this.resourceTransferHold
        if (!held) return
        if (!held.pointer.leftButtonDown() || !this.robotGUI.isVisible || this.robotOfCPU !== held.robot) {
            this.resourceTransferHold = null
            return
        }
        while (this.scene.time.now >= held.nextTransferAt) {
            this.transferRobotResource(held.robot, held.resource, held.direction)
            held.nextTransferAt += RESOURCE_TRANSFER_INTERVAL_MS
        }
    }

    private transferRobotResource(robot: ModularRobot, resource: RobotResource, direction: 1 | -1) {
        const gas = resource === "storedCosmorite"
        const available = direction === 1
            ? gas ? this.mainStats.getGas() : this.mainStats.getLunestone()
            : robot[resource]
        if (available + 1e-9 < RESOURCE_TRANSFER_AMOUNT) return
        if (direction === 1) {
            const free = robot.blocks.reduce((total, block) => total + Math.max(
                0, block.blockType.storage - block.storedCosmorite - block.storedLunestone
            ), 0)
            if (free + 1e-9 < RESOURCE_TRANSFER_AMOUNT) return
        }
        const amount = RESOURCE_TRANSFER_AMOUNT * direction
        robot[resource] += amount
        if (gas) this.mainStats.incGas(-amount)
        else this.mainStats.incLunestone(-amount)
    }

    private initCommandGUI() {
        this.baseGUI = new UIColumn(this.scene, GUI_MARGIN, GUI_MARGIN, false)
            .addButtonLine("Build bot", () => {this.scene.debug_summonRobot()})
            .addButtonLine("Move all 100 UP    ^: ", () => {this.scene.robots.debug_moveAllRobots(0,-100)})
            .addButtonLine("Move all 100 DOWN  v: ", () => {this.scene.robots.debug_moveAllRobots(0,100)})
            .addButtonLine("Move all 100 LEFT  <: ", () => {this.scene.robots.debug_moveAllRobots(-100,0)})
            .addButtonLine("Move all 100 RIGHT >: ", () => {this.scene.robots.debug_moveAllRobots(100,0)})
    }

    public getUILayer(): Phaser.GameObjects.Layer  {
        const uiLayer = this.scene.add.layer(this.hud.getAsGameObjects())
        uiLayer.add(this.monitorContainer)
        return uiLayer
    }

    public closeRobotGUI() {
        const cpu = this.robotOfCPU?.getCpuPart()
        if (cpu) cpu.guiState = GuiState.closed
        this.toggleRobotGUI(false)
        this.hideCpuNotifier()
    }

    get isFactoryOpen() {
        return this.factoryGUI.isVisible
    }

    private toggleFactoryGUI(visible: boolean) {
        if (visible && this.baseGUI.isVisible) return
        if (this.factoryGUI.isVisible === visible) return
        if (visible) {
            const cpu = this.robotOfCPU?.getCpuPart()
            if (cpu) cpu.guiState = GuiState.closed
            this.robotGUI.setVisibility(false)
            this.robotStatsGUI.setVisibility(false)
            this.hideCpuNotifier()
        }
        this.factoryGUI.setVisible(visible)
        this.playerTools.setVisibility(!visible && !this.baseGUI.isVisible && !this.robotGUI.isVisible)
        this.toggleScreen()
    }

    public toggleBaseGUI(visible:boolean) {
        if (visible) {
            this.hideCpuNotifier()
            this.hideFactoryNotifier()
            if (this.factoryOfGUI) this.factoryOfGUI.guiState = GuiState.closed
            this.factoryGUI.setVisible(false)
            const cpu = this.robotOfCPU?.getCpuPart()
            if (cpu) cpu.guiState = GuiState.closed
        }
        if(this.baseGUI.isVisible == visible) return
        if (visible) {
            this.robotGUI.setVisibility(false)
            this.robotStatsGUI.setVisibility(false)
            this.playerTools.setVisibility(false)
        } else {
            this.playerTools.setVisibility(true)
        }
        this.baseGUI.setVisibility(visible)
        this.toggleScreen()
    }
    
    public toggleRobotGUI(visible: boolean) {
        if (visible && (this.baseGUI.isVisible || this.factoryGUI.isVisible)) return
        if(this.robotGUI.isVisible == visible) return
        if (visible) {
            this.baseGUI.setVisibility(false)
            this.playerTools.setVisibility(false)
        } else {
            this.playerTools.setVisibility(true)
        }
        this.robotGUI.setVisibility(visible)
        this.robotStatsGUI.setVisibility(visible)
        this.toggleScreen()
    }

    public toggleScreen() {
        this.robotResourceButtons.forEach(button => button.setVisible(this.robotGUI.isVisible))
        if (!this.robotGUI.isVisible) this.resourceTransferHold = null
        let setVisible = false
        if (this.robotGUI.isVisible || this.baseGUI.isVisible || this.factoryGUI.isVisible) {
            setVisible = true
        }
        this.monitorContainer.setVisible(setVisible)
        this.monitorCloseButton.setVisible(this.robotGUI.isVisible || this.factoryGUI.isVisible)
        if (setVisible) this.layoutMonitor()
        this.robotFunctionEditor.setRobot(this.robotOfCPU)
        if (this.robotGUI.isVisible) this.robotFunctionEditor.position(this.monitorScreens[0])
        this.robotFunctionEditor.setVisible(this.robotGUI.isVisible)
    }
}