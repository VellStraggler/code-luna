import * as Phaser from "phaser"
import MainStats from "../player/MainStats"
import MainScene from "../CodeLuna"
import GameConstants, { BLOCK_RES, HIDE_POS, GUI_DEPTH, WINDOW, GUI_SIZE, GUI_SECONDARY_SIZE, GUI_MARGIN, MONITOR_GAP, TEXT_SPACING, TOOLBOX_WIDTH, TOOLBOX_SPACING, FACTORY_BLOCK, PART_GUN_NAME, WELDER_PART, F0, RESOURCE_TRANSFER_AMOUNT, RESOURCE_TRANSFER_INTERVAL_MS } from "../main/constants"
import MyColors from "../main/MyColors"
import ModularRobot from "../bots/ModularRobot"
import CpuPart, { GuiState } from "../bots/parts-and-blocks/CpuPart"
import UIColumn from "../ui-components/UITextColumn"
import RobotFunctionEditor from "./RobotFunctionEditor"
import FactoryBlock from "../bots/parts-and-blocks/FactoryBlock"
import FactoryGUI from "./FactoryGUI"
import { PlayerState } from "../player/Player"
import Handbook from "./Handbook"
import RobotChatPanel from "./RobotChatPanel"
import UIStatLine from "../ui-components/StatMessage"
import { getAcceleratedHoldBatch, isStorageCapacityReached } from "../main/gameRules"

type RobotResource = "storedLunestone" | "storedCosmorite"
type NotifierTarget = CpuPart | FactoryBlock

export default class GUI {
    private scene: MainScene

    mainStats: MainStats
    public hud!: UIColumn
    private quota!: UIColumn
    private chatPanel!: RobotChatPanel
    private baseArrow!: Phaser.GameObjects.Graphics
    private handbook!: Handbook
    private handbookInFront = false
    private launchAmount = 0
    private launchText!: Phaser.GameObjects.Text
    private launchControls: Phaser.GameObjects.GameObject[] = []
    private launchHold: {
        pointer?: Phaser.Input.Pointer
        direction: 1 | -1
        started: number
        next: number
    } | null = null

    public guiRects: Phaser.GameObjects.Rectangle[] = []

    public baseGUI!: UIColumn

    public robotGUI!: UIColumn
    private robotStatsGUI!: UIColumn
    private monitorContainer!: Phaser.GameObjects.Container
    private monitorScreens: Phaser.GameObjects.Container[] = []
    private monitorElement!: HTMLDivElement
    private monitorPanels: HTMLDivElement[] = []
    private baseMonitorContent!: HTMLDivElement
    private robotStatsContent!: HTMLDivElement
    private launchAmountLabel!: HTMLDivElement
    private readonly robotStatValues = new Map<string, HTMLElement>()
    private monitorOpen = false

    public playerTools!: UIColumn

    public messageOpenRobotGUI!: Phaser.GameObjects.Text
    public robotOfCPU: ModularRobot | null = null
    private cpuOfGUI: CpuPart | null = null
    private notifierTarget: NotifierTarget | null = null
    public clickMeOutline: Phaser.GameObjects.Rectangle
    private monitorCloseButton!: Phaser.GameObjects.Text
    private robotFunctionEditor: RobotFunctionEditor
    private factoryGUI: FactoryGUI
    private factoryOfGUI: FactoryBlock | null = null
    private baseMonitorDismissed = false
    private messageOpenFactoryGUI!: Phaser.GameObjects.Text
    private factoryOutline!: Phaser.GameObjects.Rectangle
    private saveWarning: Phaser.GameObjects.Text | null = null
    private robotResourceButtons: Phaser.GameObjects.Text[] = []
    private resourceTransferHold: {
        pointer?: Phaser.Input.Pointer
        robot: ModularRobot
        resource: RobotResource
        direction: 1 | -1
        startedAt: number
        nextTransferAt: number
    } | null = null
    
    constructor(scene: MainScene, mainStats: MainStats) {
        this.scene = scene
        this.mainStats = mainStats

        this.initHud()
        this.chatPanel = new RobotChatPanel(this.scene, this.scene.chat)
        this.initMonitor()
        this.initPlayerTools()
        this.initCommandGUI()
        this.initCpuGUI()
        this.initHTMLMonitorContent()
        this.factoryGUI = new FactoryGUI(this.scene, this.monitorPanels[0])
        this.robotFunctionEditor = new RobotFunctionEditor(this.scene, () => this.bringMonitorForward())
        this.handbook = new Handbook(this.scene, () => this.bringBookForward(), () => this.closeBook())
        const updateOverlayLayout = () => {
            this.handbook.position()
            if (this.monitorOpen) this.layoutHTMLMonitor()
            this.updateHandbookMonitorLayer()
        }
        window.addEventListener("resize", updateOverlayLayout)
        this.scene.events.once("shutdown", () => window.removeEventListener("resize", updateOverlayLayout))
        this.monitorScreens[0].add([
            ...this.baseGUI.getAsGameObjects(),
            ...this.launchControls,
            ...this.robotGUI.getAsGameObjects()
        ])
        this.monitorScreens[1].add([
            ...this.robotStatsGUI.getAsGameObjects(),
            ...this.robotResourceButtons
        ])
        this.layoutMonitor()
        this.initMessageOpenCPU()
        this.initMessageOpenFactory()
        this.hideAll()

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape" || event.repeat || event.isComposing ||
                (!this.monitorOpen && !this.handbook.isVisible)) return
            event.preventDefault()
            event.stopPropagation()
            if (this.handbook.isVisible && (this.handbookInFront || !this.monitorOpen)) {
                this.closeBook()
            } else {
                this.closeMonitor()
            }
        }
        window.addEventListener("keydown", closeOnEscape, true)
        this.scene.events.once("shutdown", () => window.removeEventListener("keydown", closeOnEscape, true))
        const stopHolds = () => {
            this.launchHold = null
            this.resourceTransferHold = null
        }
        window.addEventListener("pointerup", stopHolds)
        window.addEventListener("pointercancel", stopHolds)
        this.scene.events.once("shutdown", () => {
            window.removeEventListener("pointerup", stopHolds)
            window.removeEventListener("pointercancel", stopHolds)
            this.monitorElement.remove()
        })

        this.clickMeOutline = this.scene.add.rectangle(HIDE_POS.x, HIDE_POS.y, 20, 20)
            .setFillStyle(MyColors.white, 0)
            .setDepth(GUI_DEPTH)
            .setVisible(false)
            .setStrokeStyle(1, MyColors.white)
        this.scene.uiCamera.ignore(this.clickMeOutline)
        this.scene.addWorldObject(this.clickMeOutline)
    }

    private initHud() {
        this.hud = new UIColumn(this.scene, TEXT_SPACING, TEXT_SPACING, true)
            .addIconStatLine('icon-lunestone', 'x', () => this.mainStats.getLunestone())
            .addIconStatLine('icon-refined-cosmorite', 'x', () => this.mainStats.getGas())
            .addIconStatLine('part-battery', 'x', () => this.mainStats.getEnergyUseMs() * 1000)
        this.quota = new UIColumn(this.scene, WINDOW.x - TEXT_SPACING, TEXT_SPACING, true, "right")
            .addFormattedStatLine(() =>
                `${GameConstants.text.gasQuotaLabel}: ${this.mainStats.gasToShip.toFixed(GameConstants.toolbar.statPrecision)}/${GameConstants.game.gasQuota}`,
                GameConstants.ui.quotaFontSize
            )
        this.baseArrow = this.scene.add.graphics().setScrollFactor(0).setDepth(GUI_DEPTH - 1)
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

    public showSaveWarning() {
        if (this.saveWarning) return
        this.saveWarning = this.scene.add.text(TEXT_SPACING, WINDOW.y - TEXT_SPACING,
            GameConstants.text.robotSavingUnavailable, {
                fontSize: `${GameConstants.ui.buttonFontSize}px`,
                color: MyColors.toCssHex(MyColors.warning),
                backgroundColor: MyColors.toCssHex(MyColors.black)
            }).setOrigin(0, 1).setScrollFactor(0).setDepth(GUI_DEPTH + 2)
        this.scene.cameras.main.ignore(this.saveWarning)
    }

    private initMessageOpenCPU() {
        this.messageOpenRobotGUI = this.scene.add.text(HIDE_POS.x, HIDE_POS.y, GameConstants.text.openMonitorPrompt, {
            fontSize: `${GameConstants.prompts.fontSize}px`,
            color: MyColors.toCssHex(MyColors.black),
            fontStyle: 'bold',
            stroke: MyColors.toCssHex(MyColors.white),
            strokeThickness: GameConstants.prompts.outlineWidth,
            padding: {x:GameConstants.prompts.padding, y:GameConstants.prompts.padding},
            align: 'center'
        })
        this.messageOpenRobotGUI.setInteractive({ useHandCursor: true }).setDepth(GUI_DEPTH).on('pointerdown', (
            _pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData
        ) => {
            if (!this.canOpenMonitor()) return
            event.stopPropagation()
            if (this.baseGUI.isVisible || this.factoryGUI.isVisible) return
            const cpu = this.cpuOfGUI
            if (!cpu?.isNearPlayer()) return
            cpu.guiState = GuiState.open
            this.toggleRobotGUI(true)
            this.hideCpuNotifier()
        })
            .setScale(GameConstants.prompts.scale)
            .setOrigin(0.5, 0.5)
            .setVisible(false)
        this.messageOpenRobotGUI.setDepth(GUI_DEPTH + 1)
        this.scene.uiCamera.ignore(this.messageOpenRobotGUI)
        this.scene.addWorldObject(this.messageOpenRobotGUI)
    }

    private initMessageOpenFactory() {
        this.messageOpenFactoryGUI = this.scene.add.text(HIDE_POS.x, HIDE_POS.y, GameConstants.text.openFactoryPrompt, {
            fontSize: `${GameConstants.prompts.fontSize}px`,
            color: MyColors.toCssHex(MyColors.black),
            fontStyle: "bold",
            stroke: MyColors.toCssHex(MyColors.white),
            strokeThickness: GameConstants.prompts.outlineWidth,
            padding: { x: GameConstants.prompts.padding, y: GameConstants.prompts.padding },
            align: "center"
        })
            .setScale(GameConstants.prompts.scale)
            .setOrigin(0.5)
            .setDepth(GUI_DEPTH + 1)
            .setVisible(false)
            .setInteractive({ useHandCursor: true })
            .on("pointerdown", (
                _pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData
            ) => {
                if (!this.canOpenMonitor()) return
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
        this.scene.addWorldObject(this.messageOpenFactoryGUI)
        this.scene.addWorldObject(this.factoryOutline)
    }

    private hideFactoryNotifier() {
        this.messageOpenFactoryGUI.setPosition(HIDE_POS.x, HIDE_POS.y).setVisible(false)
        this.factoryOutline.setPosition(HIDE_POS.x, HIDE_POS.y).setVisible(false)
    }

    private canOpenMonitor() {
        const state = this.scene.player.playerState
        return state === PlayerState.holdingNothing || state === PlayerState.holdingHandbook
    }

    private selectNotifierTarget() {
        if (this.baseGUI.isVisible || !this.canOpenMonitor()) {
            this.notifierTarget = null
            return
        }
        const targets: NotifierTarget[] = []
        for (const robot of this.scene.robots) {
            for (const block of robot.blocks) {
                if (!block.image.active || !block.image.visible || !block.image.body?.enable) continue
                if (block instanceof FactoryBlock) targets.push(block)
                for (const part of block.modularParts) {
                    if (part instanceof CpuPart && part.image.active && part.image.visible && part.image.body?.enable) {
                        targets.push(part)
                    }
                }
            }
        }
        const current = this.notifierTarget
        if (current && targets.includes(current) && current.guiState === GuiState.open &&
            current.getDistanceToPlayer() < 50) return

        const nearby = targets.filter(target => target.isNearPlayer() &&
            Phaser.Math.Distance.Between(target.image.x, target.image.y,
                this.scene.playerBase.x, this.scene.playerBase.y) > BLOCK_RES * 2)
        if (nearby.length <= 1) {
            this.notifierTarget = nearby[0] ?? null
            return
        }
        const pointer = this.scene.input.activePointer
        const point = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y)
        const hovered = nearby.filter(target =>
            target.image.getBounds().contains(point.x, point.y) ||
            (target instanceof CpuPart && target.parentBlock.image.getBounds().contains(point.x, point.y))
        )
        hovered.sort((a, b) =>
            Math.hypot(a.image.x - point.x, a.image.y - point.y) -
            Math.hypot(b.image.x - point.x, b.image.y - point.y))
        if (hovered.length > 0) {
            this.notifierTarget = hovered[0]
            return
        }
        const prompt = current instanceof CpuPart ? this.messageOpenRobotGUI : this.messageOpenFactoryGUI
        this.notifierTarget = current && nearby.includes(current) && prompt.visible &&
            prompt.getBounds().contains(point.x, point.y) ? current : null
    }

    private updateFactoryGUI() {
        const closest = this.notifierTarget instanceof FactoryBlock ? this.notifierTarget : null
        if (this.factoryOfGUI && this.factoryOfGUI !== closest) {
            this.factoryOfGUI.guiState = GuiState.closed
            this.toggleFactoryGUI(false)
        }
        this.factoryOfGUI = closest
        this.factoryGUI.setFactory(closest)
        if (!closest || this.baseGUI.isVisible || this.robotGUI.isVisible ||
            !this.canOpenMonitor()) {
            if (closest) closest.guiState = GuiState.closed
            this.hideFactoryNotifier()
            this.toggleFactoryGUI(false)
            return
        }
        if (closest.guiState === GuiState.open) {
            if (closest.getDistanceToPlayer() >= 50) closest.guiState = GuiState.closed
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
        if (this.baseMonitorDismissed && !this.scene.physics.overlap(this.scene.player, this.scene.playerBase)) {
            this.baseMonitorDismissed = false
        }
        this.hud.update()
        this.quota.update()
        this.chatPanel.update()
        this.selectNotifierTarget()
        this.updateFactoryGUI()
        this.updateRobotGUI()
        this.updateResourceTransfer()
        this.updateLaunchHold()
        this.launchAmount = Math.min(
            this.launchAmount,
            Math.max(0, Math.floor(this.mainStats.getGas() - GameConstants.game.launchGasCost))
        )
        this.launchText.setText(
            `${GameConstants.text.launchGasLabel}: ${this.mainStats.getGas().toFixed(GameConstants.toolbar.statPrecision)}\n` +
            `${GameConstants.text.launchPayloadLabel}: [${this.launchAmount.toFixed(GameConstants.toolbar.statPrecision)}]`
        )
        this.robotStatsGUI.update()
        const capacity = this.robotStatsGUI.list[this.robotStatsGUI.list.length - 1]
        const robot = this.robotOfCPU
        const full = !!robot && isStorageCapacityReached(
            robot.storedLunestone + robot.storedCosmorite,
            robot.storageSpace
        )
        if (capacity instanceof UIStatLine) {
            capacity.setColors(MyColors.clear, full ? MyColors.darkRed : MyColors.white)
        }
        this.updateHTMLMonitorContent()
        if (this.robotGUI.isVisible) this.robotFunctionEditor.position(this.monitorScreens[0])
        this.updateBaseArrow()
        this.updateHandbookMonitorLayer()
    }

    public updateRobotGUI() {
        const previousCpu = this.cpuOfGUI
        const cpu = this.notifierTarget instanceof CpuPart ? this.notifierTarget : null
        this.cpuOfGUI = cpu
        this.robotOfCPU = cpu?.parentBlock.robot ?? null
        this.robotFunctionEditor.setRobot(this.robotOfCPU)
        this.scene.player.closestCPU = cpu ?? null
        if (previousCpu && previousCpu !== cpu) previousCpu.guiState = GuiState.closed

        if (!cpu || this.baseGUI.isVisible || this.factoryGUI.isVisible ||
            !this.canOpenMonitor()) {
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
        this.monitorElement = document.createElement("div")
        this.monitorElement.className = "html-monitor"
        Object.assign(this.monitorElement.style, {
            position: "fixed",
            display: "none",
            boxSizing: "border-box",
            transformOrigin: "top left",
            zIndex: "10001",
            color: MyColors.toCssHex(MyColors.white),
            fontFamily: "monospace"
        })
        const style = document.createElement("style")
        style.textContent = `
            .html-monitor { font-size:${GameConstants.ui.defaultFontSize}px; }
            .html-monitor-panel { position:absolute;box-sizing:border-box;padding:${GUI_MARGIN}px;background:${MyColors.toCssHex(MyColors.green)}99;border:2px solid ${MyColors.toCssHex(MyColors.white)};overflow:hidden; }
            .html-monitor button { color:${MyColors.toCssHex(MyColors.white)};font:inherit; }
            .html-monitor .monitor-action { display:block;width:100%;margin:0 0 3px;padding:2px 4px;text-align:left;background:${MyColors.toCssHex(MyColors.darkGreen)};border:1px solid ${MyColors.toCssHex(MyColors.white)};cursor:pointer; }
            .html-monitor .monitor-launch { margin-top:10px; }
            .html-monitor .monitor-launch-row { display:flex;gap:6px;align-items:center;margin-top:5px; }
            .html-monitor .monitor-small-button { min-width:18px;min-height:18px;padding:0 2px;background:${MyColors.toCssHex(MyColors.darkGreen)};border:1px solid ${MyColors.toCssHex(MyColors.white)};cursor:pointer; }
            .html-monitor .monitor-stats { font-size:12px;line-height:1.25; }
            .html-monitor .monitor-stat-row { display:flex;align-items:center;gap:4px;min-height:${TEXT_SPACING}px;white-space:nowrap; }
            .html-monitor .monitor-stat-icon { width:16px;height:16px;object-fit:contain;image-rendering:pixelated; }
            .html-monitor .monitor-resource-value { min-width:22px; }
            .html-monitor-close { position:absolute;right:${GUI_MARGIN}px;top:${GUI_MARGIN}px;background:transparent;border:0;font-weight:bold;cursor:pointer; }
        `
        this.monitorElement.append(style)
        for (let index = 0; index < 2; index++) {
            const panel = document.createElement("div")
            panel.className = "html-monitor-panel"
            this.monitorPanels.push(panel)
            this.monitorElement.append(panel)
        }
        const closeButton = document.createElement("button")
        closeButton.type = "button"
        closeButton.className = "html-monitor-close"
        closeButton.textContent = GameConstants.text.closeMonitor
        closeButton.setAttribute("aria-label", GameConstants.text.closeMonitor)
        closeButton.addEventListener("pointerdown", event => event.stopPropagation())
        closeButton.addEventListener("click", event => {
            event.stopPropagation()
            this.closeMonitor()
        })
        this.monitorElement.append(closeButton)
        this.monitorElement.addEventListener("pointerdown", () => this.bringMonitorForward(), true)
        for (const event of ["keydown", "keyup", "wheel"]) {
            this.monitorElement.addEventListener(event, event => event.stopPropagation())
        }
        document.body.append(this.monitorElement)

        for (const size of [GUI_SIZE, GUI_SECONDARY_SIZE]) {
            const screen = this.scene.add.container(0, 0).setSize(size.x, size.y)
            const box = this.scene.add.rectangle(0, 0, size.x, size.y, MyColors.green)
                .setOrigin(0, 0)
                .setAlpha(0.6)
                .setStrokeStyle(2, MyColors.white)
                .setInteractive()
                .on("pointerdown", (_p: unknown, _x: unknown, _y: unknown, event: Phaser.Types.Input.EventData) => {
                    event.stopPropagation()
                    this.bringMonitorForward()
                })
            screen.add(box)
            this.guiRects.push(box)
            this.monitorScreens.push(screen)
            this.monitorContainer.add(screen)
        }
        this.monitorCloseButton = this.scene.add.text(
            0, 0,
            GameConstants.text.closeMonitor,
            {
                fontSize: `${GameConstants.ui.defaultFontSize}px`,
                color: MyColors.toCssHex(MyColors.white),
                fontStyle: "bold",
                padding: { x: 4, y: 2 }
            }
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
                this.closeMonitor()
            })
        this.monitorContainer.add(this.monitorCloseButton)
    }

    private layoutMonitor(outerPadding = 0) {
        const factoryOpen = this.factoryGUI.isVisible
        const topPadding = outerPadding + this.monitorCloseButton.height + GUI_MARGIN + GUI_MARGIN / 2
        const columns = factoryOpen ? [] :
            this.baseGUI.isVisible ? [this.baseGUI] : [this.robotGUI, this.robotStatsGUI]
        const sizes = [GUI_SIZE, GUI_SECONDARY_SIZE]
        let screenHeight = 0
        let width = outerPadding
        for (const [index, screen] of this.monitorScreens.entries()) {
            screen.setVisible(!factoryOpen || index === 0)
            if (factoryOpen && index !== 0) continue
            const size = sizes[index]
            const height = Math.max(size.y, (columns[index]?.latestY ?? 0) + GUI_MARGIN)
            screen.setPosition(width, topPadding).setSize(size.x, height)
            this.guiRects[index].setSize(size.x, height)
            screenHeight = Math.max(screenHeight, height)
            width += screen.width + MONITOR_GAP
        }
        width += outerPadding - MONITOR_GAP
        const height = topPadding + screenHeight + outerPadding + GUI_MARGIN
        this.monitorContainer.setSize(width, height)
            .setPosition((WINDOW.x - width) / 2, (WINDOW.y - height) / 2)
        this.monitorCloseButton.setPosition(width - outerPadding, outerPadding + GUI_MARGIN)
        this.layoutHTMLMonitor()
        this.updateHandbookMonitorLayer()
    }

    private layoutHTMLMonitor() {
        const canvas = this.scene.game.canvas.getBoundingClientRect()
        const scaleX = canvas.width / this.scene.scale.gameSize.width
        const scaleY = canvas.height / this.scene.scale.gameSize.height
        Object.assign(this.monitorElement.style, {
            left: `${canvas.left + this.monitorContainer.x * scaleX}px`,
            top: `${canvas.top + this.monitorContainer.y * scaleY}px`,
            width: `${this.monitorContainer.width}px`,
            height: `${this.monitorContainer.height}px`,
            transform: `scale(${scaleX}, ${scaleY})`
        })
        for (const [index, panel] of this.monitorPanels.entries()) {
            const screen = this.monitorScreens[index]
            panel.style.left = `${screen.x}px`
            panel.style.top = `${screen.y}px`
            panel.style.width = `${screen.width}px`
            panel.style.height = `${screen.height}px`
            panel.style.display = this.factoryGUI?.isVisible && index === 0
                ? "block"
                : this.factoryGUI?.isVisible
                    ? "none"
                    : screen.visible ? "block" : "none"
        }
    }

    private updateHandbookMonitorLayer() {
        if (this.monitorElement) {
            this.monitorElement.style.zIndex = this.handbookInFront ? "9998" : "10001"
            this.monitorElement.style.display = this.monitorOpen ? "block" : "none"
        }
        this.handbook?.setAboveGame(this.handbookInFront)
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
            .addIconButton("null", () => {
                this.scene.player.playerState = PlayerState.holdingHandbook
                this.handbook.setVisible(true)
                this.bringBookForward()
                return true
            }, false)
    }

    private initCpuGUI() {
        this.robotGUI = new UIColumn(this.scene, GUI_MARGIN, GUI_MARGIN, false)
        this.robotStatsGUI = new UIColumn(this.scene, GUI_MARGIN, GUI_MARGIN, false)
            .addTextLine(GameConstants.text.storageLabel)
        this.addRobotResourceRow("storedLunestone", "icon-lunestone")
        this.addRobotResourceRow("storedCosmorite", "icon-refined-cosmorite")
        this.robotStatsGUI
            .addIconStatLine('part-battery', GameConstants.text.resourcePrefix, () => this.robotOfCPU?.getCalculatedEnergyUse())
            .addTextLine(GameConstants.text.blocksLabel)
            .addStatLine(" ", () => String(this.robotOfCPU?.blocks.length ?? 0))
            .addTextLine(GameConstants.text.meterRangeLabel)
            .addStatLine(" ", () => this.robotOfCPU?.getMeterRange())
            .addTextLine(GameConstants.text.capacityLabel)
            .addStatLine(" ", () => {
                const robot = this.robotOfCPU
                const stored = robot ? robot.storedLunestone + robot.storedCosmorite : 0
                return `${stored.toFixed(GameConstants.toolbar.statPrecision)}/${(robot?.storageSpace ?? 0).toFixed(GameConstants.toolbar.statPrecision)}`
            })
            .setFontSize(12, GUI_SECONDARY_SIZE.x - GUI_MARGIN * 2)
    }

    private initHTMLMonitorContent() {
        this.baseMonitorContent = document.createElement("div")
        this.baseMonitorContent.style.display = "none"
        const action = (label: string, callback: () => void) => {
            const button = document.createElement("button")
            button.type = "button"
            button.className = "monitor-action"
            button.textContent = label
            button.addEventListener("pointerdown", event => event.stopPropagation())
            button.addEventListener("click", event => {
                event.stopPropagation()
                callback()
            })
            this.baseMonitorContent.append(button)
        }
        action(GameConstants.text.buildBot, () => this.scene.debug_summonRobot())
        const distance = GameConstants.game.debugRobotMoveDistance
        action(GameConstants.text.robotMoveUp.replace("{distance}", String(distance)),
            () => this.scene.robots.debug_moveAllRobots(0, -distance))
        action(GameConstants.text.robotMoveDown.replace("{distance}", String(distance)),
            () => this.scene.robots.debug_moveAllRobots(0, distance))
        action(GameConstants.text.robotMoveLeft.replace("{distance}", String(distance)),
            () => this.scene.robots.debug_moveAllRobots(-distance, 0))
        action(GameConstants.text.robotMoveRight.replace("{distance}", String(distance)),
            () => this.scene.robots.debug_moveAllRobots(distance, 0))
        const launch = document.createElement("div")
        launch.className = "monitor-launch"
        const gas = document.createElement("div")
        gas.dataset.launchGas = "true"
        const payload = document.createElement("div")
        this.launchAmountLabel = payload
        const row = document.createElement("div")
        row.className = "monitor-launch-row"
        const holdButton = (label: string, direction: 1 | -1) => {
            const button = document.createElement("button")
            button.type = "button"
            button.className = "monitor-small-button"
            button.textContent = label
            button.addEventListener("pointerdown", event => {
                event.preventDefault()
                event.stopPropagation()
                this.adjustLaunchAmount(direction, 1)
                this.launchHold = {
                    direction,
                    started: this.scene.time.now,
                    next: this.scene.time.now + 100
                }
            })
            return button
        }
        row.append(holdButton("\u25b2", 1), holdButton("\u25bc", -1))
        const deploy = document.createElement("button")
        deploy.type = "button"
        deploy.className = "monitor-small-button"
        deploy.textContent = GameConstants.text.deployRocket(GameConstants.game.launchGasCost)
        deploy.addEventListener("pointerdown", event => event.stopPropagation())
        deploy.addEventListener("click", event => {
            event.stopPropagation()
            this.deployRocket()
        })
        row.append(deploy)
        launch.append(gas, payload, row)
        this.baseMonitorContent.append(launch)
        this.monitorPanels[0].append(this.baseMonitorContent)

        this.robotStatsContent = document.createElement("div")
        this.robotStatsContent.className = "monitor-stats"
        this.appendHTMLStat(this.robotStatsContent, GameConstants.text.storageLabel)
        this.appendHTMLResourceRow("storedLunestone", "icon-lunestone")
        this.appendHTMLResourceRow("storedCosmorite", "icon-refined-cosmorite")
        this.addHTMLStatValue("energy", GameConstants.text.resourcePrefix)
        this.appendHTMLStat(this.robotStatsContent, GameConstants.text.blocksLabel)
        this.addHTMLStatValue("blocks", "")
        this.appendHTMLStat(this.robotStatsContent, GameConstants.text.meterRangeLabel)
        this.addHTMLStatValue("range", "")
        this.appendHTMLStat(this.robotStatsContent, GameConstants.text.capacityLabel)
        this.addHTMLStatValue("capacity", "")
        this.monitorPanels[1].append(this.robotStatsContent)
    }

    private appendHTMLStat(parent: HTMLElement, label: string) {
        const row = document.createElement("div")
        row.className = "monitor-stat-row"
        row.textContent = label
        parent.append(row)
    }

    private addHTMLStatValue(key: string, label: string) {
        const row = document.createElement("div")
        row.className = "monitor-stat-row"
        const text = document.createElement("span")
        text.textContent = label
        const value = document.createElement("span")
        value.className = "monitor-resource-value"
        row.append(text, value)
        this.robotStatsContent.append(row)
        this.robotStatValues.set(key, value)
    }

    private appendHTMLResourceRow(resource: RobotResource, icon: string) {
        const row = document.createElement("div")
        row.className = "monitor-stat-row"
        const image = document.createElement("img")
        image.className = "monitor-stat-icon"
        image.src = `${import.meta.env.BASE_URL}assets/${icon}.png`
        image.alt = ""
        const value = document.createElement("span")
        value.className = "monitor-resource-value"
        const makeTransferButton = (direction: 1 | -1, label: string) => {
            const button = document.createElement("button")
            button.type = "button"
            button.className = "monitor-small-button"
            button.textContent = label
            button.addEventListener("pointerdown", event => {
                event.preventDefault()
                event.stopPropagation()
                const robot = this.robotOfCPU
                if (!robot) return
                this.resourceTransferHold = {
                    robot, resource, direction,
                    startedAt: this.scene.time.now,
                    nextTransferAt: this.scene.time.now + RESOURCE_TRANSFER_INTERVAL_MS
                }
                this.transferRobotResource(robot, resource, direction)
            })
            return button
        }
        row.append(
            image,
            value,
            makeTransferButton(1, "+"),
            makeTransferButton(-1, "\u2212")
        )
        this.robotStatsContent.append(row)
        this.robotStatValues.set(resource, value)
    }

    private updateHTMLMonitorContent() {
        this.baseMonitorContent.style.display = this.baseGUI.isVisible ? "block" : "none"
        const robot = this.robotOfCPU
        const setValue = (key: string, value: string) => {
            const element = this.robotStatValues.get(key)
            if (element) element.textContent = value
        }
        setValue("storedLunestone", (robot?.storedLunestone ?? 0).toFixed(GameConstants.toolbar.statPrecision))
        setValue("storedCosmorite", (robot?.storedCosmorite ?? 0).toFixed(GameConstants.toolbar.statPrecision))
        setValue("energy", (robot?.getCalculatedEnergyUse() ?? 0).toFixed(GameConstants.toolbar.statPrecision))
        setValue("blocks", String(robot?.blocks.length ?? 0))
        setValue("range", (robot?.getMeterRange() ?? 0).toFixed(GameConstants.toolbar.statPrecision))
        const stored = robot ? robot.storedLunestone + robot.storedCosmorite : 0
        setValue("capacity", `${stored.toFixed(GameConstants.toolbar.statPrecision)}/${(robot?.storageSpace ?? 0).toFixed(GameConstants.toolbar.statPrecision)}`)
        const capacity = this.robotStatValues.get("capacity")
        if (capacity) {
            capacity.style.color = robot && isStorageCapacityReached(stored, robot.storageSpace)
                ? MyColors.toCssHex(MyColors.darkRed)
                : MyColors.toCssHex(MyColors.white)
        }
        const gasLabel = this.baseMonitorContent.querySelector<HTMLElement>("[data-launch-gas]")
        if (gasLabel) {
            gasLabel.textContent =
                `${GameConstants.text.launchGasLabel}: ${this.mainStats.getGas().toFixed(GameConstants.toolbar.statPrecision)}`
        }
        if (this.launchAmountLabel) {
            this.launchAmountLabel.textContent =
                `${GameConstants.text.launchPayloadLabel}: [${this.launchAmount.toFixed(GameConstants.toolbar.statPrecision)}]`
        }
    }

    private addRobotResourceRow(resource: RobotResource, icon: string) {
        const y = this.robotStatsGUI.latestY
        this.robotStatsGUI.addIconStatLine(icon, GameConstants.text.resourcePrefix, () => this.robotOfCPU?.[resource], 40)
        for (const [index, direction] of ([1, -1] as const).entries()) {
            const button = this.scene.add.text(
                GUI_SECONDARY_SIZE.x - GUI_MARGIN - 36 + index * 18, y,
                direction === 1 ? "+" : "-",
                {
                    fontSize: `${GameConstants.ui.buttonFontSize}px`,
                    fontStyle: "bold",
                    color: MyColors.toCssHex(MyColors.white),
                    align: "center"
                }
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
                        startedAt: this.scene.time.now,
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
        if ((held.pointer && !held.pointer.leftButtonDown()) ||
            !this.robotGUI.isVisible || this.robotOfCPU !== held.robot) {
            this.resourceTransferHold = null
            return
        }
        while (this.scene.time.now >= held.nextTransferAt) {
            const batch = getAcceleratedHoldBatch(
                this.scene.time.now, held.startedAt, held.nextTransferAt
            )
            held.nextTransferAt = batch.nextAt
            if (batch.steps > 0) {
                this.transferRobotResource(
                    held.robot, held.resource, held.direction,
                    RESOURCE_TRANSFER_AMOUNT * batch.steps
                )
            }
        }
    }

    private transferRobotResource(
        robot: ModularRobot,
        resource: RobotResource,
        direction: 1 | -1,
        requestedAmount = RESOURCE_TRANSFER_AMOUNT
    ) {
        const gas = resource === "storedCosmorite"
        const available = direction === 1
            ? gas ? this.mainStats.getGas() : this.mainStats.getLunestone()
            : robot[resource]
        const transferAmount = Math.min(
            requestedAmount,
            available,
            direction === 1 ? robot.getFreeStorage() : requestedAmount
        )
        if (transferAmount < 1e-9) { this.scene.cancelAction(); return }
        const amount = transferAmount * direction
        robot[resource] += amount
        if (gas) this.mainStats.incGas(-amount)
        else this.mainStats.incLunestone(-amount)
    }

    private initCommandGUI() {
        this.baseGUI = new UIColumn(this.scene, GUI_MARGIN, GUI_MARGIN, false)
            .addButtonLine(GameConstants.text.buildBot, () => {this.scene.debug_summonRobot()})
            .addButtonLine(GameConstants.text.robotMoveUp.replace("{distance}", String(GameConstants.game.debugRobotMoveDistance)),
                () => {this.scene.robots.debug_moveAllRobots(0,-GameConstants.game.debugRobotMoveDistance)})
            .addButtonLine(GameConstants.text.robotMoveDown.replace("{distance}", String(GameConstants.game.debugRobotMoveDistance)),
                () => {this.scene.robots.debug_moveAllRobots(0,GameConstants.game.debugRobotMoveDistance)})
            .addButtonLine(GameConstants.text.robotMoveLeft.replace("{distance}", String(GameConstants.game.debugRobotMoveDistance)),
                () => {this.scene.robots.debug_moveAllRobots(-GameConstants.game.debugRobotMoveDistance,0)})
            .addButtonLine(GameConstants.text.robotMoveRight.replace("{distance}", String(GameConstants.game.debugRobotMoveDistance)),
                () => {this.scene.robots.debug_moveAllRobots(GameConstants.game.debugRobotMoveDistance,0)})
        const y = this.baseGUI.latestY + 10
        this.launchText = this.scene.add.text(
            GUI_MARGIN, y, "", {
                fontSize: `${GameConstants.ui.defaultFontSize}px`,
                color: MyColors.toCssHex(MyColors.white)
            }
        )
        this.launchControls.push(this.launchText)
        for (const [direction, offset, label] of [[1, 0, "\u25b2"], [-1, 20, "\u25bc"]] as const) {
            const button = this.scene.add.text(
                260, y + 18 + offset, label, {
                    fontSize: `${GameConstants.ui.defaultFontSize}px`,
                    color: MyColors.toCssHex(MyColors.white)
                }
            )
                .setInteractive({ useHandCursor: true })
                .on("pointerdown", (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
                    event.stopPropagation()
                    this.adjustLaunchAmount(direction, 1)
                    this.launchHold = { pointer, direction, started: this.scene.time.now, next: this.scene.time.now + 100 }
                })
            const stop = () => { this.launchHold = null }
            button.on("pointerup", stop).on("pointerout", stop)
            this.launchControls.push(button)
        }
        const deploy = this.scene.add.text(
            300, y + 28,
            GameConstants.text.deployRocket(GameConstants.game.launchGasCost),
            {
                fontSize: `${GameConstants.ui.buttonFontSize}px`,
                color: MyColors.toCssHex(MyColors.white)
            }
        ).setInteractive({ useHandCursor: true }).on("pointerdown",
            (_p: unknown, _x: unknown, _y: unknown, event: Phaser.Types.Input.EventData) => {
                event.stopPropagation()
                this.deployRocket()
            })
        this.launchControls.push(deploy)
    }

    public getUILayer(): Phaser.GameObjects.Layer  {
        const uiLayer = this.scene.add.layer(this.hud.getAsGameObjects())
        uiLayer.add([...this.quota.getAsGameObjects(), this.baseArrow, ...this.playerTools.getAsGameObjects()])
        uiLayer.add(this.monitorContainer)
        return uiLayer
    }

    public closeRobotGUI() {
        const cpu = this.cpuOfGUI
        if (cpu) cpu.guiState = GuiState.closed
        this.toggleRobotGUI(false)
        this.hideCpuNotifier()
    }

    private closeMonitor() {
        if (this.baseGUI.isVisible) {
            this.baseMonitorDismissed = true
            this.toggleBaseGUI(false)
            this.scene.player.setVisible(true)
        } else if (this.factoryGUI.isVisible) {
            if (this.factoryOfGUI) this.factoryOfGUI.guiState = GuiState.closed
            this.toggleFactoryGUI(false)
            this.hideFactoryNotifier()
        } else if (this.robotGUI.isVisible) {
            this.closeRobotGUI()
        }
    }

    public selectTool() {
        this.closeMonitor()
    }

    public selectToolbarItem(index: number) {
        this.playerTools.activateIconButton(index)
    }

    private bringBookForward() {
        this.handbookInFront = true
        this.handbook.setAboveGame(true)
        this.robotFunctionEditor.setBelowHandbook(this.robotGUI.isVisible)
        this.handbook.position()
        this.monitorContainer.setDepth(GUI_DEPTH)
        this.updateHandbookMonitorLayer()
    }

    private bringMonitorForward() {
        this.handbookInFront = false
        this.monitorContainer.setDepth(GUI_DEPTH + 3)
        this.updateHandbookMonitorLayer()
        if (this.robotGUI.isVisible) {
            this.robotFunctionEditor.setVisible(true)
            this.robotFunctionEditor.setBelowHandbook(this.handbookInFront)
            this.robotFunctionEditor.position(this.monitorScreens[0])
        }
    }

    public closeBook() {
        this.handbook.setVisible(false)
        if (this.scene.player.playerState === PlayerState.holdingHandbook) {
            this.scene.player.playerState = PlayerState.holdingNothing
            this.playerTools.iconButtons.forEach(button => button.deselect())
        }
        this.bringMonitorForward()
    }

    private adjustLaunchAmount(direction: 1 | -1, amount: number) {
        const max = Math.max(0, Math.floor(this.mainStats.getGas() - GameConstants.game.launchGasCost))
        const next = Phaser.Math.Clamp(this.launchAmount + direction * amount, 0, max)
        if (next === this.launchAmount) this.scene.cancelAction()
        this.launchAmount = next
    }

    private updateLaunchHold() {
        const hold = this.launchHold
        if (!hold) return
        if ((hold.pointer && !hold.pointer.leftButtonDown()) || !this.baseGUI.isVisible) {
            this.launchHold = null
            return
        }
        const batch = getAcceleratedHoldBatch(this.scene.time.now, hold.started, hold.next)
        hold.next = batch.nextAt
        if (batch.steps > 0) this.adjustLaunchAmount(hold.direction, batch.steps)
    }

    private deployRocket() {
        const amount = this.launchAmount
        if (amount <= 0 || this.mainStats.getGas() < amount + GameConstants.game.launchGasCost) {
            this.scene.cancelAction()
            return
        }
        this.mainStats.incGas(-(amount + GameConstants.game.launchGasCost))
        this.launchAmount = 0
        const bounds = this.scene.playerBase.getBounds()
        const rocket = this.scene.add.image(bounds.left, bounds.top, "null")
        this.scene.addWorldObject(rocket)
        this.scene.tweens.add({
            targets: rocket,
            y: rocket.y - GameConstants.game.rocketLaunchHeightBlocks * BLOCK_RES,
            alpha: 0,
            duration: 4000,
            onComplete: () => {
                this.mainStats.gasToShip += amount
                rocket.destroy()
            }
        })
    }

    private updateBaseArrow() {
        this.baseArrow.clear()
        const camera = this.scene.cameras.main
        const topLeft = camera.getWorldPoint(0, 0)
        const base = this.scene.playerBase
        const x = (base.x - topLeft.x) * camera.zoom
        const y = (base.y - topLeft.y) * camera.zoom
        if (Phaser.Geom.Intersects.RectangleToRectangle(camera.worldView, base.getBounds())) return
        const dx = x - WINDOW.x / 2
        const dy = y - WINDOW.y / 2
        const t = Math.min((WINDOW.x / 2 - 24) / Math.max(Math.abs(dx), 1e-9),
            (WINDOW.y / 2 - 24) / Math.max(Math.abs(dy), 1e-9))
        const tipX = WINDOW.x / 2 + dx * t
        const tipY = WINDOW.y / 2 + dy * t
        const angle = Math.atan2(y - tipY, x - tipX)
        const ux = Math.cos(angle), uy = Math.sin(angle)
        const px = -uy, py = ux
        const points = [
            new Phaser.Math.Vector2(tipX, tipY),
            new Phaser.Math.Vector2(tipX - ux * 32 + px * 13, tipY - uy * 32 + py * 13),
            new Phaser.Math.Vector2(tipX - ux * 25, tipY - uy * 25),
            new Phaser.Math.Vector2(tipX - ux * 32 - px * 13, tipY - uy * 32 - py * 13)
        ]
        this.baseArrow.fillStyle(MyColors.baseArrow, 0.9).fillPoints(points, true)
    }

    public isPointerOverChat(x: number, y: number) {
        return this.chatPanel.containsPoint(x, y)
    }

    get isFactoryOpen() {
        return this.factoryGUI.isVisible
    }

    private toggleFactoryGUI(visible: boolean) {
        if (visible && this.baseGUI.isVisible) return
        if (this.factoryGUI.isVisible === visible) return
        if (visible) {
            this.playerTools.deselectButtons()
            this.bringMonitorForward()
            const cpu = this.cpuOfGUI
            if (cpu) cpu.guiState = GuiState.closed
            this.robotGUI.setVisibility(false)
            this.robotStatsGUI.setVisibility(false)
            this.hideCpuNotifier()
        }
        this.factoryGUI.setVisible(visible)
        this.toggleScreen()
    }

    public toggleBaseGUI(visible:boolean) {
        if (visible && this.baseMonitorDismissed) return
        if (visible) {
            this.hideCpuNotifier()
            this.hideFactoryNotifier()
            if (this.factoryOfGUI) this.factoryOfGUI.guiState = GuiState.closed
            this.factoryGUI.setVisible(false)
            const cpu = this.cpuOfGUI
            if (cpu) cpu.guiState = GuiState.closed
        }
        if(this.baseGUI.isVisible == visible) return
        if (visible) {
            this.robotGUI.setVisibility(false)
            this.robotStatsGUI.setVisibility(false)
            this.playerTools.deselectButtons()
            this.bringMonitorForward()
        }
        this.baseGUI.setVisibility(visible)
        this.toggleScreen()
    }
    
    public toggleRobotGUI(visible: boolean) {
        if (visible && (this.baseGUI.isVisible || this.factoryGUI.isVisible)) return
        if(this.robotGUI.isVisible == visible) return
        if (visible) {
            this.baseGUI.setVisibility(false)
            this.playerTools.deselectButtons()
            this.bringMonitorForward()
        }
        this.robotGUI.setVisibility(visible)
        this.robotStatsGUI.setVisibility(visible)
        this.toggleScreen()
    }

    public toggleScreen() {
        if (!this.robotGUI.isVisible) this.resourceTransferHold = null
        this.monitorOpen = this.robotGUI.isVisible || this.baseGUI.isVisible || this.factoryGUI.isVisible
        this.monitorContainer.setVisible(false)
        this.monitorCloseButton.setVisible(false)
        if (this.monitorOpen) this.layoutMonitor()
        else this.updateHandbookMonitorLayer()
        this.robotFunctionEditor.setRobot(this.robotOfCPU)
        if (this.robotGUI.isVisible) this.robotFunctionEditor.position(this.monitorScreens[0])
        this.robotFunctionEditor.setBelowHandbook(this.robotGUI.isVisible && this.handbookInFront)
        this.robotFunctionEditor.setVisible(this.robotGUI.isVisible)
    }
}