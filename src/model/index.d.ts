interface RollAble{
    faces:number,
    times:number,
    result:number[],
    roll():void
}
interface ComplexRollPart{
    flag:-1|1,
    type:"roll"|"bouns",
    toRoll?:{times:number,faces:number},
    toAdd?:number
}
interface Part2An{
    flag:-1|1
    text:string
}