// TypeScript Quick Start Tutorial
// tsc tutorial.ts  --> typescript compile
// node tutorial.js --> run outputed js

// 1) Variables with types
let username: string = "David";
let age: number = 30;
let isLearning: boolean = true;

console.log(`Hello ${username}, age ${age}`);

// 2) Functions with typed parameters and return values
function add(a: number, b: number): number {
  return a + b;
}

console.log("2 + 3 =", add(2, 3));

// 3) Arrays
let scores: number[] = [90, 85, 100];
console.log("Scores:", scores);
for(const score of scores) {
  console.log(score)
}
let scoreTexts: string[] = scores.map(num => "" + num)

// 4) Objects with custom types
type User = {
  name: string;
  level: number;
};

const player: User = {
  name: "Bot Alpha",
  level: 5,
};

console.log("Player:", player);

// 5) Classes
class Robot {
  static calculateSpeed(weight: number): number {
      throw new Error("Method not implemented.");
  }
  static calculateWeight(sourceblock: any): number {
      throw new Error("Method not implemented.");
  }
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  move(distance: number): void {
    console.log(`${this.name} moved ${distance} units`);
  }
}

const bot = new Robot("Miner-1");
bot.move(10);

// 6) Async example
async function fetchMessage(): Promise<string> {
  return "TypeScript is working!";
}

fetchMessage().then(console.log);
