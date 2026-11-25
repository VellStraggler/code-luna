import GameConstants from "./constants"

type ChatNode = { text: string, next: ChatNode | null }

export default class PublicChat {
    private first: ChatNode | null = null
    private last: ChatNode | null = null
    private length = 0

    print(value: string) {
        for (const text of value.split(/\r\n|\r|\n/)) {
            const node: ChatNode = { text, next: null }
            if (this.last) this.last.next = node
            else this.first = node
            this.last = node
            if (++this.length > GameConstants.game.publicChatMaxLines) {
                this.first = this.first!.next
                this.length--
            }
        }
    }

    getText(index?: number): string {
        if (index !== undefined && (!Number.isInteger(index) || index < 0 || index >= this.length)) return ""
        const lines: string[] = []
        let node = this.first
        while (node) {
            lines.push(node.text)
            node = node.next
        }
        return index === undefined ? lines.join("\n") : lines[index]
    }
}
