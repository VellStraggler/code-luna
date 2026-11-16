export default interface IGameItemDefinition {
    readonly assetKey: string;
    readonly weight: number;
    readonly gasCost: number;
    readonly stoneCost: number;
    readonly researchLevel: number;
    readonly availableFrames: number;

    // also write a static fromAssetKey method, but I don't get how to put
    // that in an interface:

    // static fromAssetKey(assetKey: string): this | null
}