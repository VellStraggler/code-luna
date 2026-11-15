import MainStats from "./MainStats"
import MainScene from "../CodeLuna"
import { xy } from "./xy"
import { HIDE_POS, GUI_DEPTH, WINDOW, GUI_SIZE, GUI_MARGIN, GUI_TEXT_START, TEXT_SPACING, TOOLBOX_WIDTH, TOOLBOX_SPACING, FACTORY_BLOCK, PART_GUN_NAME, WELDER_PART, F0 } from "./constants"
import MyColors from "./MyColors"
import ModularRobot from "../bots/ModularRobot"
import { GuiState } from "../bots/parts/CpuPart"
import UIColumn from "./UITextColumn"
import { PlayerState } from "./Player"

export default class GUI {
    private scene: MainScene

    mainStats: MainStats
    public hud!: UIColumn

    public guiRects: Phaser.GameObjects.Rectangle[] = []

    public baseGUI!: UIColumn

    public robotGUI!: UIColumn

    public playerTools!: UIColumn

    public messageOpenRobotGUI!: Phaser.GameObjects.Text
    public robotOfCPU: ModularRobot | null = null
    public clickMeOutline: Phaser.GameObjects.Rectangle
    private monitorCloseButton!: Phaser.GameObjects.Text
    
    constructor(scene: MainScene, mainStats: MainStats) {
        this.scene = scene
        this.mainStats = mainStats

        this.initHud()
        this.initMonitor()
        this.initPlayerTools()
        this.initCommandGUI()
        this.initCpuGUI()
        this.initMessageOpenCPU()
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
            .addIconStatLine('icon-lunestone', 'Lunestone: ', () => this.mainStats.getLunestone())
            .addIconStatLine('icon-refined-cosmorite', 'Cosmorite Gas: ', () => this.mainStats.getGas())
            .addIconStatLine('part-battery', 'Energy Use Per Second: ', () => {this.mainStats.getEnergyUseMs() * 1000})
    }

    private hideAll() {
        this.robotGUI.setVisibility(false)
        this.baseGUI.setVisibility(false)
    }

    hideGUI() {
        this.hideCpuNotifier()
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
            if (this.baseGUI.isVisible) return
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
        this.updateRobotGUI()
    }

    public updateRobotGUI() {
        const previousCpu = this.robotOfCPU?.getCpuPart()
        this.robotOfCPU = this.scene.robots.findRobotClosestToPlayer()
        const cpu = this.robotOfCPU?.getCpuPart()
        this.scene.player.closestCPU = cpu ?? null
        if (previousCpu && previousCpu !== cpu) previousCpu.guiState = GuiState.closed

        if (!cpu || this.baseGUI.isVisible) {
            if (cpu) cpu.guiState = GuiState.closed
            this.hideCpuNotifier()
            this.toggleRobotGUI(false)
            this.robotGUI.update()
            return
        }

        // Closing may show the nearby prompt again, but must not reopen the monitor.
        if (cpu.guiState == GuiState.open) {
            if (cpu.getDistToPlayer() >= 50) cpu.guiState = GuiState.closed
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
        // transparent bounding box
        let box = this.scene.add.rectangle(
            WINDOW.x/2, WINDOW.y/2, 
            GUI_SIZE.x, GUI_SIZE.y, 
            MyColors.green
        )
            .setAlpha(0.6)
            .setStrokeStyle(2, MyColors.white)
            .setVisible(false)
        this.guiRects.push(box)
        this.monitorCloseButton = this.scene.add.text(
            (WINDOW.x + GUI_SIZE.x)/2 - GUI_MARGIN,
            (WINDOW.y - GUI_SIZE.y)/2 + GUI_MARGIN,
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
                this.closeRobotGUI()
            })
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
        this.robotGUI = new UIColumn(this.scene, GUI_TEXT_START.x, GUI_TEXT_START.y, false)
            .addStatLine("blocks: ", () => this.robotOfCPU?.blocks.length)
            .addStatLine("stored lunestone: ", () => this.robotOfCPU?.storedLunestone)
            .addStatLine("stored cosmorite: ", () => this.robotOfCPU?.storedCosmorite)
            .addStatLine("storage limit: ", () => this.robotOfCPU?.storageSpace)
            .addStatLine("seconds left: ", () => this.robotOfCPU?.calcTimeLeft())
            .addStatLine("Estimated range (m): ", () => this.robotOfCPU?.getMeterRange())
            .addButtonLine("sendToMine", () => this.robotOfCPU?.setGoal(this.scene.debug_getMineSiteXY()))
            .addButtonLine("sendHome", () => this.robotOfCPU?.setGoal(this.scene.base.getPosition()))
    }

    private initCommandGUI() {
        this.baseGUI = new UIColumn(this.scene, GUI_TEXT_START.x, GUI_TEXT_START.y, false)
            .addButtonLine("Build bot", () => {this.scene.debug_summonRobot()})
            // .addButtonLine("Locate Mineral Site: ", () => {this.scene.debug_getMineSiteString()})
            .addButtonLine("Move 100 UP    ^: ", () => {this.scene.robots.debug_moveAllRobots(0,-100)})
            .addButtonLine("Move 100 DOWN  v: ", () => {this.scene.robots.debug_moveAllRobots(0,100)})
            .addButtonLine("Move 100 LEFT  <: ", () => {this.scene.robots.debug_moveAllRobots(-100,0)})
            .addButtonLine("Move 100 RIGHT >: ", () => {this.scene.robots.debug_moveAllRobots(100,0)})
    }

    public getUILayer(): Phaser.GameObjects.Layer  {
        const uiLayer = this.scene.add.layer(this.hud.getAsGameObjects())
        uiLayer.add(this.baseGUI.getAsGameObjects())
        uiLayer.add(this.robotGUI.getAsGameObjects())
        uiLayer.add(this.guiRects)
        uiLayer.add(this.monitorCloseButton)
        return uiLayer
    }

    public closeRobotGUI() {
        const cpu = this.robotOfCPU?.getCpuPart()
        if (cpu) cpu.guiState = GuiState.closed
        this.toggleRobotGUI(false)
        this.hideCpuNotifier()
    }

    public toggleBaseGUI(visible:boolean) {
        if (visible) {
            this.hideCpuNotifier()
            const cpu = this.robotOfCPU?.getCpuPart()
            if (cpu) cpu.guiState = GuiState.closed
        }
        if(this.baseGUI.isVisible == visible) return
        if (visible) {
            this.robotGUI.setVisibility(false)
            this.playerTools.setVisibility(false)
        } else {
            this.playerTools.setVisibility(true)
        }
        this.baseGUI.setVisibility(visible)
        this.toggleScreen()
    }
    
    public toggleRobotGUI(visible: boolean) {
        if (visible && this.baseGUI.isVisible) return
        if(this.robotGUI.isVisible == visible) return
        if (visible) {
            this.baseGUI.setVisibility(false)
            this.playerTools.setVisibility(false)
        } else {
            this.playerTools.setVisibility(true)
        }
        this.robotGUI.setVisibility(visible)
        this.toggleScreen()
    }

    public toggleScreen() {
        let setVisible = false
        if (this.robotGUI.isVisible || this.baseGUI.isVisible) {
            setVisible = true
        }
        this.guiRects[0].setVisible(setVisible)
        this.monitorCloseButton.setVisible(this.robotGUI.isVisible)
    }
}