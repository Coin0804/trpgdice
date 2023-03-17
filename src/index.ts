import { Context, Schema } from 'koishi'
import { filter,handeller } from './handeller/handeller'

export const name = 'trpgdice'

export interface Config {}

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.on("message",(s)=>{
    let result = filter(s);
    if(result.isCommend){
      handeller(s,result.commendName)
    }
  })
}
