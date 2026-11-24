import * as Phaser from 'phaser'
import { F0, F1, HP_BAR_BG_COLOR, HP_BAR_DEPTH, HP_BAR_DISPLAY_TIME_MS, HP_BAR_FG_COLOR, HP_BG_HEIGHT, HP_BG_WIDTH, HP_FG_HEIGHT, HP_FG_WIDTH, HP_HALF_HEIGHT, HP_X_OFFSET, HP_Y_OFFSET, LASER_ENERGY_USE, SHADOW_DEPTH, SHADOW_OFFSET, STARTING_HEALTH, TELEPORT_RANGE, TWO_FRAME_ASSETS } from './constants.ts'
import { xy, XY } from './XY.ts'
import MainScene from '../CodeLuna.ts'
import IGameFighter from '../bots/contracts/IGameFighter.ts'
import MyColors from './MyColors.ts'

/** Provides a health bar and associated functionality. */
export default class HPImage extends Phaser.Physics.Arcade.Image implements IGameFighter {
    private hp: number = 0
    private hpBarBG!: Phaser.GameObjects.Rectangle
    private hpBar!: Phaser.GameObjects.Rectangle
    private hpDispTimer: Phaser.Time.TimerEvent | null = null
    public isOverlapped: boolean = false
    public isAnimated: boolean = false
    public readonly textureless: boolean
    public hurtSound!: HTMLAudioElement
    public isFrameOne: boolean = false
    protected shadow: Phaser.Physics.Arcade.Image | null
    scene: MainScene
    
    constructor(scene: MainScene, x: number, y:number, 
        texture:string = "__UNDEFINED", hasShadow: boolean = true
    ) {
        super(scene, x, y, texture)
        this.textureless = (texture == "__UNDEFINED")
        
        if (hasShadow) {
            this.shadow = scene.physics.add.image( x + SHADOW_OFFSET.x, y + SHADOW_OFFSET.y, texture)
                .setTint(MyColors.black)
                .setAlpha(0.3)
                .setDepth(SHADOW_DEPTH)
            scene.uiCamera.ignore(this.shadow)
            scene.addWorldObject(this.shadow)
        } else {
            this.shadow = null
        }
        scene.add.existing(this)
        scene.physics.add.existing(this)
        scene.addWorldObject(this)
        this.scene = scene
        
        /// Health Bar ///
        this.hp = STARTING_HEALTH
        this.hpBarBG = scene.add.rectangle(
            x,   
            y - HP_Y_OFFSET,
            HP_BG_WIDTH,
            HP_BG_HEIGHT, 
            HP_BAR_BG_COLOR)
        this.hpBar =   scene.add.rectangle(
            x - HP_X_OFFSET,
            y - HP_Y_OFFSET - HP_HALF_HEIGHT,
            HP_FG_WIDTH,
            HP_FG_HEIGHT, 
            HP_BAR_FG_COLOR)
        for(var bar of [this.hpBarBG, this.hpBar]) {
            bar.setVisible(false)
            bar.setDepth(HP_BAR_DEPTH)
            scene.uiCamera.ignore(bar)
        }
        this.hpBar.setOrigin(0,0) //top-left for easy math
        scene.addWorldObject(this.hpBarBG)
        scene.addWorldObject(this.hpBar)
    }

    updateShadow() {
        if (this.shadow != undefined) {
            this.shadow.x = this.x + SHADOW_OFFSET.x
            this.shadow.y = this.y + SHADOW_OFFSET.y
        }
    }

    getHitboxes(): HPImage[] {
        return [this]
    }

    barVisible(isVisible: boolean = true) {
        this.hpBarBG.setVisible(isVisible)
        this.hpBar.setVisible(isVisible)
    }

    override setVisible(value: boolean) {
        super.setVisible(value)
        this.shadow?.setVisible(value)
        return this
    }

    override destroy() {
        this.hpBar.destroy()
        this.hpBarBG.destroy()
        this.shadow?.destroy()
        super.destroy()
    }

    
    canShoot(): boolean { return this.scene.mainStats.getGas() >= LASER_ENERGY_USE }
    shootLaser(): number {
        if (this.canShoot()) {
            this.scene.mainStats.drainGas(LASER_ENERGY_USE)
            return LASER_ENERGY_USE
        }return 0
    }

    /** Displays the sprite's health bar for exactly one second*/
    showHPOnlyNow(ms:number = HP_BAR_DISPLAY_TIME_MS) {
        this.hpBar.setSize(HP_FG_WIDTH * (this.hp/STARTING_HEALTH), HP_FG_HEIGHT)
        this.barVisible()
        this.hpDispTimer?.remove(false)
        this.hpDispTimer = this.scene.time.delayedCall(ms, () => {
            this.hpDispTimer = null
            this.barVisible(false)
        })
    }
    getPosition() {
        const center = this.getCenter()
        return xy(center.x, center.y)
    }
    getHP() {
        return this.hp
    }

    takeDamage(damageAmount: number) {
        if(!this.visible) {
            return
        }
        this.hp = Math.max(0,this.hp - damageAmount)
        if (this.isDead()) {
            this.respawn()
            this.randomTeleport()
        } else {   
            this.showHPOnlyNow()
        }
        this.hurtSound?.play()
    }
    isDead() {
        return (this.hp <= 0)
    }

    respawn() {
        this.setVisible(true)
        this.hp = STARTING_HEALTH
    }
    randomTeleport(bounds: number = TELEPORT_RANGE) {
        let x = Math.random() * bounds
        let y = Math.random() * bounds
        this.setPosition(x, y)
    }

    override setVelocity(x:number, y:number | undefined) {
        super.setVelocity(x,y)
        if (y == undefined) y = x
        for (const bar of [this.hpBarBG, this.hpBar]) {
            let body = bar.body as Phaser.Physics.Arcade.Body
            body?.setVelocity(x,y)
        }
        this.updateShadow()
        this.updateHPBar()
        return this
    }
    override setPosition(x:number, y:number) {
        super.setPosition(x,y)
        this.updateShadow()
        this.updateHPBar()
        return this
    }

    override setRotation(radians: number) {
        super.setRotation(radians)
        this.shadow?.setRotation(radians)
        return this
    }

    updateHPBar() {
        this.hpBarBG?.setPosition(this.x, this.y-HP_Y_OFFSET)
        this.hpBar?.setPosition(this.x-HP_X_OFFSET, this.y-HP_Y_OFFSET-HP_HALF_HEIGHT)
    }

    override setScale(scale: number) {
        super.setScale(scale)
        this.shadow?.setScale(scale)
        return this
    }

    public aim(target: XY) {
        // do nothing
    }

    setAnimatedTexture(asset: string, animateFrame: boolean = false) {
        if (animateFrame) {
            this.isFrameOne = !this.isFrameOne
        }
        if (TWO_FRAME_ASSETS.includes(asset)) {
            if (this.isFrameOne) {
                asset += F0 
            } else {
                asset += F1
            }
        } 
        this.setTexture(asset)
    }
    
    override setTexture(key: string) {
        super.setTexture(key)
        this.shadow?.setTexture(key)
        return this
    }
}