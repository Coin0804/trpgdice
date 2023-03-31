declare interface Config {
	defaultDiceFices: number,
	facesMax: number,
	timesMax: number,
	partsMax: number,
}

declare interface ComplexRollPart{
    flag:-1|1,
    type:"roll"|"bouns",
    toRoll?:{times:number,faces:number},
    toAdd?:number
}
declare interface Part2Analyze{
    flag:-1|1
    text:string
}

declare interface RollAnswer{
    player:string,
    source:string,
    reason?:string,
    result?:string,
    sum?:number
}

declare interface RollCheckAnswer{
    player:string,
    reason?:string,
    result:number
}


