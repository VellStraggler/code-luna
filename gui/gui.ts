import * as Phaser from "phaser"
import MainStats from "../player/MainStats"
import MainScene from "../CodeLuna"
import { BLOCK_RES, HIDE_POS, GUI_DEPTH, WINDOW, GUI_SIZE, GUI_SECONDARY_SIZE, GUI_MARGIN, TEXT_SPACING, TOOLBOX_WIDTH, TOOLBOX_SPACING, FACTORY_BLOCK, PART_GUN_NAME, WELDER_PART, F0, RESOURCE_TRANSFER_AMOUNT, RESOURCE_TRANSFER_INTERVAL_MS } from "../main/constants"
import MyColors from "../main/MyColors"
import ModularRobot from "../bots/ModularRobot"
import CpuPart, { GuiState } from "../bots/parts-and-blocks/CpuPart"
import UIColumn from "./UITextColumn"
import RobotFunctionEditor from "./RobotFunctionEditor"
import FactoryBlock from "../bots/parts-and-blocks/FactoryBlock"
import FactoryGUI from "./FactoryGUI"
import { PlayerState } from "../player/Player"
import Handbook from "./Handbook"
import RobotChatPanel from "./RobotChatPanel"
import UIStatLine from "./StatMessage"
import { isStorageCapacityReached } from "../main/gameRules"

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
    private bookInFront = false
    private launchAmount = 0
    private launchText!: Phaser.GameObjects.Text
    private launchControls: Phaser.GameObjects.GameObject[] = []
    private launchHold: { pointer: Phaser.Input.Pointer, direction: 1 | -1, started: number, next: number } | null = null

    public guiRects: Phaser.GameObjects.Rectangle[] = []

    public baseGUI!: UIColumn

    public robotGUI!: UIColumn
    private robotStatsGUI!: UIColumn
    private monitorContainer!: Phaser.GameObjects.Container
    private monitorScreens: Phaser.GameObjects.Container[] = []

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
        this.chatPanel = new RobotChatPanel(this.scene, this.scene.chat)
        this.initMonitor()
        this.initPlayerTools()
        this.initCommandGUI()
        this.initCpuGUI()
        this.factoryGUI = new FactoryGUI(this.scene)
        this.robotFunctionEditor = new RobotFunctionEditor(this.scene, () => this.bringMonitorForward())
        this.handbook = new Handbook(this.scene, () => this.bringBookForward(), () => this.closeBook())
        const focusMonitorOnCanvasPointerDown = (event: PointerEvent) => {
            if (!this.handbook.isVisible || !this.monitorContainer.visible) return
            const canvas = this.scene.game.canvas
            const bounds = canvas.getBoundingClientRect()
            const x = (event.clientX - bounds.left) * this.scene.scale.gameSize.width / bounds.width
            const y = (event.clientY - bounds.top) * this.scene.scale.gameSize.height / bounds.height
            if (x >= this.monitorContainer.x && x <= this.monitorContainer.x + this.monitorContainer.width &&
                y >= this.monitorContainer.y && y <= this.monitorContainer.y + this.monitorContainer.height) {
                this.bringMonitorForward()
            }
        }
        this.scene.game.canvas.addEventListener("pointerdown", focusMonitorOnCanvasPointerDown, true)
        this.scene.events.once("shutdown", () =>
            this.scene.game.canvas.removeEventListener("pointerdown", focusMonitorOnCanvasPointerDown, true)
        )
        this.monitorScreens[0].add([
            ...this.baseGUI.getAsGameObjects(),
            ...this.launchControls,
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

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape" || event.repeat || event.isComposing ||
                !this.monitorContainer.visible) return
            event.preventDefault()
            event.stopPropagation()
            this.closeMonitor()
        }
        window.addEventListener("keydown", closeOnEscape, true)
        this.scene.events.once("shutdown", () => window.removeEventListener("keydown", closeOnEscape, true))

        this.clickMeOutline = this.scene.add.rectangle(HIDE_POS.x, HIDE_POS.y, 20, 20)
            .setFillStyle(MyColors.white, 0)
            .setDepth(GUI_DEPTH)
            .setVisible(false)
            .setStrokeStyle(1, 0xffffff)
        this.scene.uiCamera.ignore(this.clickMeOutline)
        this.scene.addWorldObject(this.clickMeOutline)
    }

    private initHud() {
        this.hud = new UIColumn(this.scene, TEXT_SPACING, TEXT_SPACING, true)
            .addIconStatLine('icon-lunestone', 'x', () => this.mainStats.getLunestone())
            .addIconStatLine('icon-refined-cosmorite', 'x', () => this.mainStats.getGas())
            .addIconStatLine('part-battery', 'x', () => this.mainStats.getEnergyUseMs() * 1000)
        this.quota = new UIColumn(this.scene, WINDOW.x - TEXT_SPACING, TEXT_SPACING, true, "right")
            .addFormattedStatLine(() => `GAS QUOTA: ${this.mainStats.gasToShip.toFixed(1)}/1000`, 22)
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
            "Robot saving unavailable. Check browser storage.", {
                fontSize: "14px", color: "#ff8080", backgroundColor: "#000000"
            }).setOrigin(0, 1).setScrollFactor(0).setDepth(GUI_DEPTH + 2)
        this.scene.cameras.main.ignore(this.saveWarning)
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
            if (!this.canOpenMonitor()) return
            event.stopPropagation()
            if (this.baseGUI.isVisible || this.factoryGUI.isVisible) return
            const cpu = this.cpuOfGUI
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
        this.scene.addWorldObject(this.messageOpenRobotGUI)
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
        this.launchAmount = Math.min(this.launchAmount, Math.max(0, Math.floor(this.mainStats.getGas() - 100)))
        this.launchText.setText(`Stored gas: ${this.mainStats.getGas().toFixed(1)}\nPayload: [${this.launchAmount.toFixed(1)}]`)
        this.robotStatsGUI.update()
        const capacity = this.robotStatsGUI.list[this.robotStatsGUI.list.length - 1]
        const robot = this.robotOfCPU
        const full = !!robot && isStorageCapacityReached(
            robot.storedLunestone + robot.storedCosmorite,
            robot.storageSpace
        )
        if (capacity instanceof UIStatLine) {
            capacity.statObject.setColor(full ? "#ff3333" : "#ffffff")
        }
        if (this.robotGUI.isVisible && !this.bookInFront) this.robotFunctionEditor.position(this.monitorScreens[0])
        this.updateBaseArrow()
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
            width += screen.width + TEXT_SPACING
        }
        width += outerPadding - TEXT_SPACING
        const height = topPadding + screenHeight + outerPadding + GUI_MARGIN
        this.monitorContainer.setSize(width, height)
            .setPosition((WINDOW.x - width) / 2, (WINDOW.y - height) / 2)
        this.monitorCloseButton.setPosition(width - outerPadding, outerPadding + GUI_MARGIN)
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
        if (available + 1e-9 < RESOURCE_TRANSFER_AMOUNT) { this.scene.cancelAction(); return }
        if (direction === 1) {
            if (robot.getFreeStorage() + 1e-9 < RESOURCE_TRANSFER_AMOUNT) { this.scene.cancelAction(); return }
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
        const y = this.baseGUI.latestY + 10
        this.launchText = this.scene.add.text(GUI_MARGIN, y, "", { fontSize: "16px", color: "#ffffff" })
        this.launchControls.push(this.launchText)
        for (const [direction, offset, label] of [[1, 0, "\u25b2"], [-1, 20, "\u25bc"]] as const) {
            const button = this.scene.add.text(260, y + 18 + offset, label, { fontSize: "16px", color: "#ffffff" })
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
        const deploy = this.scene.add.text(300, y + 28, "[Deploy (costs 100)]", {
            fontSize: "14px", color: "#ffffff"
        }).setInteractive({ useHandCursor: true }).on("pointerdown",
            (_p: unknown, _x: unknown, _y: unknown, event: Phaser.Types.Input.EventData) => {
                event.stopPropagation()
                this.deployRocket()
            })
        this.launchControls.push(deploy)
    }

    public getUILayer(): Phaser.GameObjects.Layer  {
        const uiLayer = this.scene.add.layer(this.hud.getAsGameObjects())
        uiLayer.add([...this.quota.getAsGameObjects(), this.chatPanel.container, this.baseArrow, ...this.playerTools.getAsGameObjects()])
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
        this.bookInFront = true
        this.handbook.setAboveGame(true)
        this.handbook.position()
        this.monitorContainer.setDepth(GUI_DEPTH)
    }

    private bringMonitorForward() {
        this.bookInFront = false
        this.handbook.setAboveGame(false)
        this.monitorContainer.setDepth(GUI_DEPTH + 3)
        if (this.robotGUI.isVisible) {
            this.robotFunctionEditor.setVisible(true)
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
        const max = Math.max(0, Math.floor(this.mainStats.getGas() - 100))
        const next = Phaser.Math.Clamp(this.launchAmount + direction * amount, 0, max)
        if (next === this.launchAmount) this.scene.cancelAction()
        this.launchAmount = next
    }

    private updateLaunchHold() {
        const hold = this.launchHold
        if (!hold) return
        if (!hold.pointer.leftButtonDown() || !this.baseGUI.isVisible) {
            this.launchHold = null
            return
        }
        while (this.scene.time.now >= hold.next) {
            const seconds = Math.floor((hold.next - hold.started) / 1000)
            const interval = seconds < 2 ? 100 : 1
            const step = seconds < 2 ? Math.pow(10, seconds) : 100 * Math.pow(10, Math.min(seconds - 2, 9))
            const end = Math.min(this.scene.time.now, hold.started + (seconds + 1) * 1000 - 0.0001)
            const count = Math.max(1, Math.floor((end - hold.next) / interval) + 1)
            this.adjustLaunchAmount(hold.direction, step * count)
            hold.next += interval * count
        }
    }

    private deployRocket() {
        const amount = this.launchAmount
        if (amount <= 0 || this.mainStats.getGas() < amount + 100) {
            this.scene.cancelAction()
            return
        }
        this.mainStats.incGas(-(amount + 100))
        this.launchAmount = 0
        const bounds = this.scene.playerBase.getBounds()
        const rocket = this.scene.add.image(bounds.left, bounds.top, "null")
        this.scene.addWorldObject(rocket)
        this.scene.tweens.add({
            targets: rocket,
            y: rocket.y - 100 * BLOCK_RES,
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
        this.baseArrow.fillStyle(0x87cefa, 0.9).fillPoints(points, true)
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
        this.launchControls.forEach(control => (control as Phaser.GameObjects.Text).setVisible(this.baseGUI.isVisible))
        this.robotResourceButtons.forEach(button => button.setVisible(this.robotGUI.isVisible))
        if (!this.robotGUI.isVisible) this.resourceTransferHold = null
        let setVisible = false
        if (this.robotGUI.isVisible || this.baseGUI.isVisible || this.factoryGUI.isVisible) {
            setVisible = true
        }
        this.monitorContainer.setVisible(setVisible)
        this.monitorCloseButton.setVisible(setVisible)
        if (setVisible) this.layoutMonitor()
        this.robotFunctionEditor.setRobot(this.robotOfCPU)
        if (this.robotGUI.isVisible) this.robotFunctionEditor.position(this.monitorScreens[0])
        this.robotFunctionEditor.setVisible(this.robotGUI.isVisible && !this.bookInFront)
    }
}