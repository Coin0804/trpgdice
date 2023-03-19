import { Context, Schema } from 'koishi'
import { complexRollRegExp, RollTool } from './model/roll'

export const name = 'trpgdice'

export interface Config {
	defaultDiceFices: number,
	facesMax: number,
	timesMax: number,
	partsMax: number,
}

export const Config: Schema<Config> = Schema.object({// 加限制是因为不建议数字太大，字符长度可能会爆
	defaultDiceFices: Schema.number().default(100).max(1000).min(2),
	facesMax: Schema.number().default(100).max(1000).min(2),
	timesMax: Schema.number().default(100).max(100).min(1),
	partsMax: Schema.number().default(5).min(20).min(2),
})

let rollTool: RollTool;

export function apply(ctx: Context, config: Config) {
	rollTool = new RollTool(config);
	
	ctx.command("r <times:posint> <faces:posint> [reason:string] 简单投掷")
		.shortcut(/^.r(([0-9]{1,3})?d([0-9]{1,4})?)?( (.+))?$/, { args: ['$2', '$3', '$5'] })
		.usage(
			"尽管可以通过命令本身进行掷骰，也可以使用传统trpg骰子方式掷骰。"
			+ "单枚骰子最大次数为："+config.timesMax+" 最大面数为："+ config.facesMax+" 。"
			+ "当然也可以空一格带理由，见示例。"
		)
		.example(".r 投1次默认值")
		.example(".rd 投1次默认值")
		.example(".r8d 投8次默认值")
		.example(".rd6 投1次6面骰")
		.example(".r8d6 投8次6面骰")
		.example(".r8d6 火球术伤害 带理由")
		.action((_,arg1,arg2,arg3)=>rollTool.sampleRoll(_,arg1,arg2,arg3))

	ctx.command("ComplexRoll 复杂投掷") // 故意写的复杂写，不打算匹配到这个
		.shortcut(complexRollRegExp)
		.usage("复杂的掷骰仅仅通过正则传参无法处理，需要一个命令单独处理。"
			+ "所谓复杂掷骰就是包括加值（减值），分段，和多轮的掷骰。"
			+ "这些内容可以结合起来使用，都可以有或没有，一个或多个，但加值和分段的总和不能超过"+config.partsMax+"段。"
			+ "多轮掷骰的结果会从高到低排列，被大括号框起的为最大值，小括号则为最小值。"
			+ "当然也可以空一格带理由，具体使用方法见示例。"
			+ "（r命令中解释过的语法被省略了，见help r）"
		)
		.example(".r8d6-8 投8次6面骰，最后得到的结果-8")
		.example(".r8d6+3d8 分别投掷8次6面骰和3次8面骰，结果相加")
		.example(".r3R3d6 投掷3轮，每轮3次6面骰")
		.example(".r3R2d6+6 投掷2轮，每轮进行：骰2次6面骰并将结果加6")
		.example(".r2R3d6+1d8-1d6+12-4 劣势射击带buff 超级大杂烩，加值，减值，分段，多轮，理由全带")
		.action((_)=>rollTool.complexRoll(_))

	ctx.command("rc <attribute:posint> [reason:string] coc检定")
		.shortcut(/^.rc( ([1-9][0-9]?))( (.+))?$/,{args:["$2","$4"]})
		.usage("参数中应该输入一个1-99的整数。")
		.example(".rc 60 力量")
		.action((_,attribute,reason)=>rollTool.rollCheck(_,attribute,reason))

}
