interface ComplexRollPart{
    flag:-1|1,
    type:"roll"|"bouns",
    toRoll?:{times:number,faces:number},
    toAdd?:number
}
interface Part2Analyze{
    flag:-1|1
    text:string
}

interface RollAnswer{
    player:string,
    source:string,
    reason?:string,
    result?:string,
    sum?:number
}

interface RollCheckAnswer{
    player:string,
    reason?:string,
    result:number
}


