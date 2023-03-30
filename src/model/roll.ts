import {Session} from "koishi";
import {getConfig, getGreatSuccessNum, getNickname} from "./data";
import {Dice} from "./dice";

export const complexRollRegExp = /^.r([0-9]{1,3}R)?([0-9]{1,3})?d([0-9]{1,4})?([\+-]([0-9]{1,3}d[0-9]{1,4}|[0-9]{1,3}))*( (.+))?$/

// 简单掷骰
export function sampleRoll(session:Session,times: number = 1,faces: number = getConfig().defaultDiceFices,reason: string){
    if(times > getConfig(session).timesMax || faces > getConfig(session).facesMax || times * faces == 0) {
        return session.text(".overflow",getConfig(session))
    }
    const dice = new Dice(times,faces);
    let result = dice.result[0]+""
    for(let i = 1;i < times;i++) {
        result += "+" + dice.result[i]
    }
    const answer:RollAnswer = {
        player:getNickname(session),
        source:times+"d"+faces,
        reason:reason,
        result:result,
        sum:dice.sum
    }
    switch(times){
        case 1: return session.text(answer.reason?".single":".singleNR",answer)
        default:return session.text(answer.reason?".multi":".multiNR",answer)
    }
}
// 复杂掷骰
export function complexRoll(session:Session) {
    if(!session.content.match(complexRollRegExp)) { 
        // 说明不是通过表达式匹配到的，那就是通过这个原名或者定义的别名，这两种情况都是用不了的
        return session.text(".notExp")
    }
    const [exp,reason] = session.content.split(" ")
    // 初始化部件数组
    const parts: ComplexRollPart[] = []
    const parts2Analyze: Part2Analyze[] = [] 
    let lastIndex = 0
    let flag: 1|-1 = 1
    // 顺序扫描部件，队入待分析数组，之后在分析
    // 更复杂的表达式可以使用栈处理
    // 但其实不是很必要那么复杂的表达式
    for(let i=0;i<exp.length;i++) {
        if(i == exp.length - 1) {
            // 扫描到队尾，剩余部分全部队入
            parts2Analyze.push({flag: flag,text: exp.substring(lastIndex,exp.length)})
        } else if(exp[i].match(/[\+-]/)) {
            // 为加好或减号时，前面部分队入，记录指针
            parts2Analyze.push({flag: flag,text: exp.substring(lastIndex,i)})
            lastIndex = i + 1
            flag = exp[i]=="+"?1:-1
        }
        // 超出部件限制直接返回，不再解析
        if(parts2Analyze.length > getConfig(session).partsMax) {
            return session.text(".overflow",getConfig(session))
        }
    }
    // 从正则解析第一个部件
    let firstPartArgs = parts2Analyze[0].text.match(/.r(([0-9]{1,3})R)?([0-9]{1,3})?d([0-9]{1,3})?/)
    const isMultiRound = !!firstPartArgs[1]
    const round = isMultiRound ? Number(firstPartArgs[2]) : 1
    let times = Number(firstPartArgs[3])||1
    let faces = Number(firstPartArgs[4])||getConfig(session).defaultDiceFices
    parts[0] = {
        flag: 1,
        type: "roll",
        toRoll: {times: times,faces: faces}
    }
    // 解析剩余部件
    for(let i=1;i<parts2Analyze.length;i++){
        const partArgs = parts2Analyze[i].text.match(/^([0-9]{1,3})d([0-9]{1,3})$/)
        if(partArgs){
            // 说明是roll部件
            times = Number(partArgs[1])
            faces = Number(partArgs[2])
            if(times > getConfig(session).timesMax || faces > getConfig(session).facesMax) {
                return session.text(".overflow",getConfig(session))
            }
            parts[i]={
                flag: parts2Analyze[i].flag,
                type: "roll",
                toRoll: {times: times,faces: faces}
            }
        }else{
            // 说明是加值
            parts[i]={
                flag: parts2Analyze[i].flag,
                type: "bouns",
                toAdd: parts2Analyze[i].flag * Number(parts2Analyze[i].text)
            }
        }
    }
    let answer:RollAnswer = {
        player:getNickname(session),
        source:exp,
        reason:reason
    }
    // 部件解析完毕，开始投掷
    if(round > 1) {
        // 多轮掷骰按轮出结果,每轮结果保留sum，排序
        const rollresult = new Array(round).fill(0).map(()=>rollAllParts(parts).sum).sort((a,b) =>b-a)
        // 排序之后大的在前，直接用大括号框起
        let result = "[{" + rollresult[0] + "},"
        for(let i = 1;i < round - 1;i++) {
            result += rollresult[i] + ","
        }
        // 小的在后，用小括号框起
        result += "(" + rollresult[round - 1] + ")]"
        answer.result = result
    } else {// 单轮投掷按段出结果
        let rollresult = rollAllParts(parts)
        answer.result=rollresult.str
        answer.sum=rollresult.sum
    }    
    switch(isMultiRound){
        case true: return session.text(answer.reason?".multi":".multiNR",answer)
        default:return session.text(answer.reason?".single":".singleNR",answer)
    }
}
// 复杂掷骰 子方法
function rollAllParts(parts: ComplexRollPart[]) {
    let result: number[] = [];
    let str = ""
    let sum = 0
    for(let p of parts) {
        if(p.type == "bouns") {
            result.push(p.toAdd)
            sum += p.toAdd
            str += p.flag > 0 ? ("+" + p.toAdd) : p.toAdd
        } else if(p.type == "roll") {
            const dice = new Dice(p.toRoll.times,p.toRoll.faces)
            result = result.concat(dice.result.map((n) => p.flag * n))
            sum += p.flag * dice.sum
            if(!str.length) {
                str += "(" + dice.result[0]
                for(let i = 1;i < dice.times;i++) {
                    str += "+" + dice.result[i]
                }
            } else {
                str += (p.flag > 0 ? "+(" : "-(") + dice.result[0]
                for(let i = 1;i < dice.times;i++) {
                    str += "+" + dice.result[i]
                }
            }
            str += ")"
        }
    }
    return {result: result,str: str,sum: sum}
}
// coc检定
export function rollCheck(session:Session,attribute: number,reason: string) {
    if(attribute < 1 || attribute > 99) return session.text(".overflow")
    const dice = new Dice(1,100)
    const answer:RollCheckAnswer = {
        player:getNickname(session),
        reason:reason,
        result:dice.sum
    }
    switch(true) {
        case dice.sum <= getGreatSuccessNum(session): 
            return session.text(".greatSuccess",answer)
        case dice.sum > 95:
            return session.text(".greatFail",answer)
        case dice.sum / attribute > 1: 
            return session.text(".fail",answer)
        case dice.sum / attribute > 0.5:
            return session.text(".success",answer)
        case dice.sum / attribute > 0.2:
            return session.text(".difficultSuccess",answer)
        default:
            return session.text(".exDifficultSuccess",answer)
    }
}
