/**
 * 为了未来做打算，这个模块是必须的，因为最终插件都要和数据库打交道的。
 */

import {Session} from "koishi";

let defaultConfig:Config

export function setDefaultConfig(config:Config){
    defaultConfig = config
}

export function getConfig(session?:Session):Config{
    return defaultConfig
}

export function getNickname(session:Session){
    // 这里应该写泛型的，可是我不会写啊！
    if((session.user as any).name){
        return (session.user as any).name
    }
    return session.username
}

export function getGreatSuccessNum(session:Session){
    return 1
}

