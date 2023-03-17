import { Session } from "@koishijs/core";
import { Dice } from "../dice/dice";

let defaultDiceFices = 100
let facesMax = 100
let timesMax = 100
let partsMax = 5
function overflowinfo(){
    return "输入数值超出边间，最大面数："+facesMax+"最多次数："+timesMax+"复杂骰最大部件数："+partsMax
}


const resonReg = " (.+)$"
const commends:{[name:string]:Commend} = {
    r:{
        RegExp:"^.r"
    },
    rd:{
        RegExp:"^.r([0-9]{1,3})?d([0-9]{1,3})?",
        args:{
            times:1,
            faces:2
        }
    },
    crd:{
        RegExp:"^.r[0-9]{1,3}(R[0-9]{1,3})?d[0-9]{1,3}([\+-]([0-9]{1,3}d[0-9]{1,3}|[0-9]{1,3}))*"
    }
}


export function filter(session:Session):filterResult{
    if(session.content){
        const info = session.content
        for(let name in commends){
            const exp = commends[name].RegExp+"$"
            const expwr = commends[name].RegExp+resonReg
            if(info.match(exp) || info.match(expwr)) {
                return {isCommend:true,commendName:name}
            }
        }
    }
    return {isCommend:false}
}

export function handeller(session:Session,commendName:string){
    const player = session.username
    const info = session.content
    const matchWithReason = info.match("^.*"+resonReg)
    const reason = matchWithReason?.reverse()[0]
    let answer:string
    let head = player+(reason?"由于"+reason+" ":" ")
    // 此处可以抽象，因为对每个简单指令做的事情都差不多，但我指令不多，就if得了
    if(commendName=="r"){
        answer = head+simpleRoll()
    }else if(commendName=="rd"){
        const matchResult = info.match(commends["rd"].RegExp)
        const times = Number(matchResult[commends["rd"].args.times]||1)
        const faces = Number(matchResult[commends["rd"].args.faces]||defaultDiceFices)
        // 这里应该不会有问题，就不做异常处理了
        if(times>timesMax || faces > facesMax || times*faces == 0){
            answer = overflowinfo()
        }else{
            answer = head+simpleRoll(times,faces)
        }
    }else if(commendName=="crd"){
        let result = handelComplexRoll(info)
        if(result.stat == "ok"){
            answer = head+result.text
        }else if(result.stat == "overflow"){
            answer = overflowinfo()
        }
    }
    session.send(answer)
}

function simpleRoll(times:number=1,faces:number=defaultDiceFices):string{
    const dice = new Dice(faces,times);
    let result = "投掷了"+times+"d"+faces+"="+dice.result[0]
    if(times>=1){
        for(let i=1;i<times;i++){
            result += "+"+dice.result[i]
        }
        result += "="+dice.sum
    }
    return result
}

function handelComplexRoll(info:string):ComplexRollHandleResult{
    const result:ComplexRollHandleResult = {stat:"overflow",text:""}
    // 初始化部件数组
    const parts:ComplexRollPart[] = []
    // 如果上面写的表达式没问题，那么直接从加号或减号拆开就行了
    const maininfo = info.split(" ")[0] //去掉理由
    const parts2An:Part2An[] = []
    let lastIndex = 0
    let flag:1|-1 = 1
    for(let i=0;i<maininfo.length;i++){
        if(i == maininfo.length -1){
            parts2An.push({flag:flag,text:maininfo.substring(lastIndex,maininfo.length)})
        }else if(maininfo[i] == "+"){
            parts2An.push({flag:flag,text:maininfo.substring(lastIndex,i)})
            lastIndex = i+1
            flag = 1
        }else if(maininfo[i] == "-"){
            parts2An.push({flag:flag,text:maininfo.substring(lastIndex,i)})
            lastIndex = i+1
            flag = -1
        }
        // 超出部件限制直接返回，不再解析
        if(parts2An.length>partsMax){
            return result
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
            if(times>timesMax || faces>facesMax){
                return result
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
    result.stat = "ok"
    result.text = "投掷了"+maininfo.split(".")[1]+"="

    if(round>1){// 多轮掷骰按轮出结果
        result.text += "["+rollAllParts(parts).sum
        for(let i=1;i<round;i++){
            result.text += ","+rollAllParts(parts).sum
        }
        result.text += "]"
    }else{// 单轮投掷按段出结果
        let rollresult = rollAllParts(parts)
        result.text += rollresult.str+"="+rollresult.sum
    }
    return result
}

function rollAllParts(parts:ComplexRollPart[]){
    let result:number[] = [];
    let str = ""
    let sum = 0
    for(let p of parts){
        if(p.type == "bouns"){
            result.push(p.toAdd)
            sum += p.toAdd
            str += p.flag>0?("+"+p.toAdd):p.toAdd
        }else if(p.type == "roll"){
            const dice = new Dice(p.toRoll.faces,p.toRoll.times)
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
