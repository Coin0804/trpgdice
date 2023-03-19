import { Session } from "koishi";

export async function getUserCard(session:Session){
    
    if(session.guild){
        if(session.platform == "onebot"){
            let bot = session.bot // as OneBotBot
            const info = await bot.internal?.getGroupMemberInfo(session.guildId,session.userId)
            if(info) return info.card
        }
        return session.username
    }    
}