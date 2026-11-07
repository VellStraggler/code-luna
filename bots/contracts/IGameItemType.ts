export default interface IGameItemType {
    readonly assetName: string;
    readonly weight: number;
    readonly gasCost: number;
    readonly stoneCost: number;
    readonly researchLevel: number;
    readonly availableFrames: number;

    // also write a static get method, but I don't get how to put
    // that in an interface:

    // static get(name:string) : this | null
}