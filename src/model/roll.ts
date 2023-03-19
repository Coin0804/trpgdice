import { Argv } from "koishi";
import { Config } from "..";
import { Dice } from "./dice";



export const complexRollRegExp = /^.r[0-9]{1,3}(R[0-9]{1,3})?d[0-9]{1,4}([\+-]([0-9]{1,3}d[0-9]{1,4}|[0-9]{1,3}))*( (.+))?$/

export class RollTool{	
    config: Config
    overflowinfo:string

    constructor(config: Config) {
        this.config = config
        this.overflowinfo = "输入数值超出边间，最大面数：" + this.config.facesMax
            + " 最多次数：" + this.config.timesMax + " 复杂骰最大部件数：" + this.config.partsMax
            + " 次数和面数都不能为0"
    }
    // 简单掷骰
    sampleRoll(argv: Argv, times: number=1, faces: number=this.config.defaultDiceFices, reason: string): string {
        const user = argv.session.username
        let answer: string
        let head = user + (reason ? "由于" + reason + " " : " ")
        if (times > this.config.timesMax || faces > this.config.facesMax || times * faces == 0) {
            answer = this.overflowinfo
        } else {
            const dice = new Dice(times, faces);
            let result = "投掷了" + times + "d" + faces + "=" + dice.result[0]
            if (times > 1) {
                for (let i = 1; i < times; i++) {
                    result += "+" + dice.result[i]
                }
                result += "=" + dice.sum
            }
            answer = head + result
        }
        return answer
    }
    // 复杂掷骰
    complexRoll(argv: Argv){
        if(!argv.session.content.match(complexRollRegExp)){ // 说明不是通过表达式匹配到的，那就是通过这个原名或者定义的别名，正两种情况都是用不了的
            return "可以使用命令help complexRoll了解详细使用方法。"
        }
        const temp = argv.session.content.split(" ")
        const user = argv.session.username
        const exp = temp[0]
        let head = user + (temp[1] ? "由于" + temp[1] + " " : " ")
        let tail = ""
        // 初始化部件数组
        const parts:ComplexRollPart[] = []
        // 如果表达式没问题，那么直接从加号或减号拆开就行了
        const parts2An:Part2An[] = [] // 待分析部件数组
        let lastIndex = 0
        let flag:1|-1 = 1
        for(let i=0;i<exp.length;i++){
            if(i == exp.length -1){
                parts2An.push({flag:flag,text:exp.substring(lastIndex,exp.length)})
            }else if(exp[i] == "+"){
                parts2An.push({flag:flag,text:exp.substring(lastIndex,i)})
                lastIndex = i+1
                flag = 1
            }else if(exp[i] == "-"){
                parts2An.push({flag:flag,text:exp.substring(lastIndex,i)})
                lastIndex = i+1
                flag = -1
            }
            // 超出部件限制直接返回，不再解析
            if(parts2An.length>this.config.partsMax){
                return this.overflowinfo
            }
        }
        // 判断是否是多轮投掷
        let firstPartArgs = parts2An[0].text.match(/.r([0-9]{1,3})(R([0-9]{1,3}))?d([0-9]{1,3})/)
        const isMultiRound = firstPartArgs[3]
        const round = isMultiRound?Number(firstPartArgs[1]):1
        let times = Number(firstPartArgs[round>1?3:1])
        let faces = Number(firstPartArgs[4])
        parts[0] = {flag:1,type:"roll",toRoll:{times:times,faces:faces}}
        // 解析部件
        for(let i=1;i<parts2An.length;i++){
            const part = parts2An[i].text
            const matched = part.match(/^([0-9]{1,3})d([0-9]{1,3})$/)
            if(matched){
                times = Number(matched[1])
                faces = Number(matched[2])
                if(times>this.config.timesMax || faces>this.config.facesMax){
                    return this.overflowinfo
                }
                parts[i]={
                    flag:parts2An[i].flag,
                    type:"roll",
                    toRoll:{
                        times:times,
                        faces:faces
                    }
                }
            }else{
                parts[i]={
                    flag:parts2An[i].flag,
                    type:"bouns",
                    toAdd:parts2An[i].flag*Number(part)
                }
            }
        }
        // 逐步处理
        tail = "投掷了"+exp.split(".")[1]+"="
        if(round>1){// 多轮掷骰按轮出结果
            const t = this
            const rollresult = new Array(round).fill(1).map(()=>t.rollAllParts(parts).sum).sort((a,b)=>b-a)
            // 排序之后大的在前，直接用大括号框起
            tail += "[{"+rollresult[0]+"},"
            for (let i=1;i<round-1; i++) {
                tail += rollresult[i]+","
            }
            // 小的在后，用小括号框起
            tail += "("+rollresult[round-1]+")]"
        }else{// 单轮投掷按段出结果
            let rollresult = this.rollAllParts(parts)
            tail += rollresult.str+"="+rollresult.sum
        }
        return head+tail
    }
    // 复杂掷骰子方法
    rollAllParts(parts:ComplexRollPart[]){
        let result:number[] = [];
        let str = ""
        let sum = 0
        for(let p of parts){
            if(p.type == "bouns"){
                result.push(p.toAdd)
                sum += p.toAdd
                str += p.flag>0?("+"+p.toAdd):p.toAdd
            }else if(p.type == "roll"){
                const dice = new Dice(p.toRoll.times,p.toRoll.faces)
                result = result.concat(dice.result.map((n)=>p.flag*n))
                sum += p.flag*dice.sum
                if(!str.length){
                    str += "("+dice.result[0]
                    for(let i=1;i<dice.times;i++){
                        str += "+"+dice.result[i]
                    }
                }else{
                    str += (p.flag>0?"+(":"-(")+dice.result[0] // 此处括号应该不需要，加上为了看着更清楚
                    for(let i=1;i<dice.times;i++){
                        str += "+"+dice.result[i]
                    }
                }
                str += ")"
            }
        }
        return {result:result,str:str,sum:sum}
    }
    //
    async rollCheck(argv: Argv, attribute: number, reason: string){
        if(attribute<1 || attribute > 99) return "输入不规范，详见help rc"
        const user = argv.session.username
        const dice = new Dice(1,100)
        let answer= user + "进行了" + (reason ?reason:"") 
            + "检定,1d100=" + dice.sum + " "
        switch(true){
            case dice.sum == 1: answer += "大成功";break;// 私货：本人是极度原教旨主义者，大成功只能是1，不接受村规所以不提供配置或村规掷骰
            case dice.sum > 95: answer += "大失败";break;
            case dice.sum/attribute > 1 :answer+="失败";break;
            case dice.sum/attribute > 0.5 :answer+="成功";break;
            case dice.sum/attribute > 0.2 :answer+="困难成功";break;
            default:answer+="极难成功";
        }
        return answer
	}

}
