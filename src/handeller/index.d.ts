interface filterResult{
    isCommend:boolean,
    commendName?:string
}
interface Commend{
    //实际上是正则表达式的一部分，表示指令前部分。但编译器不检查，自己小心一些
    RegExp:string,
    //键是该参数的名称，值是该参数在match完后数组中的序号
    args?:{[keys:string]:number}
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
interface ComplexRollHandleResult{
    stat:"overflow"|"ok",
    text:string
}



