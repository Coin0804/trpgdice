import {Context,Schema} from 'koishi'
import {complexRoll,complexRollRegExp,rollCheck,sampleRoll} from './model/roll'
import {} from '@koishijs/plugin-help' // 仅引入类型，实际上并未形成依赖
import {getNickname,setDefaultConfig} from './model/data'

export const name = 'trpgdice'

// export const using = ['database']

export const Config: Schema<Config> = Schema.object({
	// 加限制是因为不建议数字太大，字符长度可能会爆
	defaultDiceFices: Schema.number().default(100).max(1000).min(2),
	facesMax: Schema.number().default(100).max(1000).min(2),
	timesMax: Schema.number().default(100).max(100).min(1),
	partsMax: Schema.number().default(5).min(20).min(2),
})

export function apply(ctx: Context,config: Config) {
	setDefaultConfig(config)
	const zh = require("./locales/zh")
	ctx.i18n.define("zh",zh)
	// 简单投掷，单字母的指令和其他r开头的指令冲突，故复杂化
	ctx.command("roll <times:posint> <faces:posint> [reason:string]",{params: config})
		.shortcut(/^.r(([0-9]{1,3})?d([0-9]{1,4})?)?( (.+))?$/,{args: ['$2','$3','$5']})
		.action(({session},time,face,reason) => sampleRoll(session,time,face,reason))
	// 复杂投掷，故意写的复杂写，不打算匹配到这个
	ctx.command("complexroll",{params: config})
		.shortcut(complexRollRegExp)
		.action(({session}) => complexRoll(session))
	// coc检定，同理复杂化
	ctx.command("rcheck <attribute:posint> [reason:string]")
		.shortcut(/^.rc( ([1-9][0-9]?))( (.+))?$/,{args: ["$2","$4"]})
		.action(({session},attribute,reason) => rollCheck(session,attribute,reason))
	// 暗骰，由于平台风控原因，实际上不执行
	ctx.command("rhide <times:posint> <faces:posint>")
		.shortcut(/^.rh(([0-9]{1,3})?d([0-9]{1,4})?)?$/,{args: ['$2','$3']})
		.action(({session}) => {
			if(session.guild) return session.text(".action",{dm: getNickname(session)})
			return session.text(".noaction")
		})
}
