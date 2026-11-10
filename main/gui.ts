import MainStats from "./MainStats"
import MainScene from "../CodeLuna"
import { xy } from "./xy"
import { HIDE_POS, GUI_DEPTH, WINDOW, GUI_SIZE, GUI_TEXT_START, TEXT_SPACING, TOOLBOX_WIDTH, TOOLBOX_SPACING, FACTORY_BLOCK, PART_GUN_NAME, WELDER_PART, F0 } from "./constants"
import MyColors from "./MyColors"
import ModularRobot from "../bots/ModularRobot"
import { GuiState } from "../bots/parts/CpuPart"
import Logic from "./logic"
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
        this.scene.GUI.hideCpuNotifier()
        this.clickMeOutline.x = this.scene.player.x - 10000
        this.clickMeOutline.y = this.scene.player.y - 10000
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
        this.messageOpenRobotGUI.setInteractive().setDepth(GUI_DEPTH).on('pointerdown', () => {
            this.toggleRobotGUI(true)
            this.hideCpuNotifier()
        })
            .setScale(0.20)
            .setOrigin(0.5, 0.5)
        this.messageOpenRobotGUI.setDepth(GUI_DEPTH + 1)
        this.scene.uiCamera.ignore(this.messageOpenRobotGUI)
    }

    public hideCpuNotifier() {
        this.updateCpuNotifier(HIDE_POS.x, HIDE_POS.y)
    }

    public updateCpuNotifier(x:number, y: number) {
        this.messageOpenRobotGUI.setPosition(x, y)
        this.clickMeOutline.setPosition(x, y)
    }

    update() {
        this.hud.update()
        this.updateRobotGUI()
    }

    public updateRobotGUI() {
        this.robotOfCPU = this.scene.robots.findRobotClosestToPlayer()
        let cpu = this.robotOfCPU?.getCpuPart()

        if (cpu != null) {
            this.scene.player.closestCPU = cpu

            let distToPlayer = Logic.getDist(cpu.parentBlock.globalPos, this.scene.player.getPosition())
            if (distToPlayer < 50) {
                if (this.robotGUI.isVisible) {
                    cpu.guiState = GuiState.open
                    this.messageOpenRobotGUI.setVisible(false)
                }
                else if (cpu.guiState == GuiState.closed) {
                    cpu.guiState = GuiState.notifying
                    this.messageOpenRobotGUI.setVisible(true)
                }
            } else {
                cpu.guiState = GuiState.closed
            }


            switch(cpu.guiState) {
                case GuiState.open:
                    this.toggleRobotGUI(true)
                    this.hideGUI()
                    break
                case GuiState.notifying:
                    this.updateCpuNotifier(cpu.parentBlock.image.x, cpu.parentBlock.image.y)
                    break
                case GuiState.closed:
                    this.hideGUI()
                    this.toggleRobotGUI(false)
                    break
            }
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
            .addStatLine("blocks: ", () => this.robotOfCPU?.allBlocks.length)
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
            .addButtonLine("Locate Mineral Site: ", () => {this.scene.debug_getMineSiteString()})
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
        return uiLayer
    }

    public toggleBaseGUI(visible:boolean) {
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
    }
}