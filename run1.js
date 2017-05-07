var varsInt = {}, varsFloat = {}, varsString = {}, varsBoolean = {};
var run_flag = false;
var stack = [];
var textarea = null;

class Location
{
	constructor(first_token, last_token)
	{
		this._first_line = first_token.first_line;
		this._last_line = last_token.last_line;
	}
	get first_line(){return this._first_line;}
	get last_line() {return this._last_line;}
}

class RuntimeError
{
	constructor(line, message)
	{
		this._line = line;
		this._message = message;
		run_flag = false;
	}
	get line() {return this._line;}
	get message() {return this._message;}
}

class Value
{
	constructor(v, loc)
	{
		this._value = v;
		this._loc = loc;
	}
	get value() {return this._value;}
	get loc() {return this._loc;}
	get first_line() {return this._loc.first_line;}
	getValue()
	{
		return this;
	}
}

class IntValue extends Value {}
class FloatValue extends Value {}
class StringValue extends Value {}
class BooleanValue extends Value {}

class Add extends Value
{
	constructor(x, y, loc)
	{
		super([x,y], loc);
	}
	getValue()
	{
		let v1 = this.value[0].getValue(), v2 = this.value[1].getValue();
		if(v1 instanceof BooleanValue || v2 instanceof BooleanValue) throw new RuntimeError(first_line, "真偽型の足し算はできません");
		let v = v1.value + v2.value;
		if(v1 instanceof StringValue || v2 instanceof StringValue) return new StringValue(v, this.loc);
		if(v1 instanceof IntValue && v2 instanceof IntValue)
		{
			if(!Number.isSafeInteger(v)) throw new RuntimeError(this.first_line, "整数で表される範囲を越えました");
			return new IntValue(v, this.loc);
		}
		else
		{
			if(!Number.isFinite(v)) throw new RuntimeError(this.first_line, "オーバーフローしました");
			return new FloatValue(v, this.loc);
		} 
	}
}

class Sub extends Value
{
	constructor(x, y, loc)
	{
		super([x,y], loc);
	}
	getValue()
	{
		let v1 = this.value[0].getValue(), v2 = this.value[1].getValue();
		if(v1 instanceof BooleanValue || v2 instanceof BooleanValue) throw new RuntimeError(this.first_line, "真偽型の引き算はできません");
		let v = v1.value - v2.value;
		if(v1 instanceof StringValue || v2 instanceof StringValue) throw new RuntimeError(this.first_line, "文字列の引き算はできません");
		if(v1 instanceof IntValue && v2 instanceof IntValue)
		{
			if(!Number.isSafeInteger(v)) throw new RuntimeError(this.first_line, "整数で表される範囲を越えました");
			return new IntValue(v, this.loc);
		}
		else
		{
			if(!Number.isFinite(v)) throw new RuntimeError(this.first_line, "オーバーフローしました");
			return new FloatValue(v, this.loc);
		} 
	}
}

class Mul extends Value
{
	constructor(x, y, loc)
	{
		super([x,y], loc);
	}
	getValue()
	{
		let v1 = this.value[0].getValue(), v2 = this.value[1].getValue();
		if(v1 instanceof BooleanValue || v2 instanceof BooleanValue) throw new RuntimeError(this.first_line, "真偽型のかけ算はできません");
		if(v1 instanceof StringValue || v2 instanceof StringValue) throw new RuntimeError(this.first_line, "文字列のかけ算はできません");
		let v = v1.value * v2.value;
		if(v1 instanceof IntValue && v2 instanceof IntValue)
		{
			if(!Number.isSafeInteger(v)) throw new RuntimeError(this.first_line, "整数で表される範囲を越えました");
			return new IntValue(v, this.loc);
		}
		else
		{
			if(!Number.isFinite(v)) throw new RuntimeError(this.first_line, "オーバーフローしました");
			return new FloatValue(v, this.loc);
		} 
	}
}

class Div extends Value
{
	constructor(x, y, loc)
	{
		super([x,y], loc);
	}
	getValue()
	{
		let v1 = this.value[0].getValue(), v2 = this.value[1].getValue();
		if(v1 instanceof BooleanValue || v2 instanceof BooleanValue) throw new RuntimeError(this.first_line, "真偽型のわり算はできません");
		if(v1 instanceof StringValue || v2 instanceof StringValue) throw new RuntimeError(this.first_line, "文字列のわり算はできません");
		if(v2.value == 0) throw RuntimeError(this.first_line, "0でわり算をしました");
		if(v1 instanceof IntValue && v2 instanceof IntValue)
		{
			let v = (v1.value - v1.value % v2.value) / v2.value
			if(!Number.isSafeInteger(v)) throw new RuntimeError(this.first_line, "整数で表される範囲を越えました");
			return new IntValue(v, this.loc);
		}
		else
		{
			let v = v1.value / v2.value;
			if(!Number.isFinite(v)) throw new RuntimeError(this.first_line, "オーバーフローしました");
			return new FloatValue(v, this.loc);
		} 
	}
}

class Mod extends Value
{
	constructor(x, y, loc)
	{
		super([x,y], loc);
	}
	getValue()
	{
		let v1 = this.value[0].getValue(), v2 = this.value[1].getValue();
		if(v1 instanceof IntValue && v2 instanceof IntValue)
		{
			if(v2.value == 0) throw new RuntimeError(this.first_line, "0でわり算をしました");
			let v = v1.value % v2.value;
			if(!Number.isSafeInteger(v)) throw new RuntimeError(this.first_line, "整数で表される範囲を越えました");
			return new IntValue(v, this.loc);
		}
		else
			throw new RuntimeError(this.first_line, "余りを出す計算は整数でしかできません");
	}
}

class Minus extends Value
{
	constructor(x, loc)
	{
		super(x, loc);
	}
	getValue()
	{
		let v1 = this.value.getValue();
		if(v1 instanceof IntValue || v1 instanceof FloatValue)
		{
			let v = -v1.value;
			if(v instanceof IntValue && !Number.isSafeInteger(v)) throw new RuntimeError(this.first_line, "整数で表される範囲を越えました");
			if(v instanceof FloatValue && !Number.isFinite(v)) throw new RuntimeError(this.first_line, "オーバーフローしました");
			return new IntValue(v, this.loc);
		}
		else
			throw new RuntimeError(this.first_line, "マイナスは数値にしかつけられません");
	}
}

class And extends Value
{
	constructor(x, y, loc){super([x,y],loc);}
	getValue()
	{
		let v1 = this.value[0].getValue(), v2 = this.value[1].getValue();
		if(v1 instanceof BooleanValue && v2 instanceof BooleanValue) return new BooleanValue(v1.value && v2.value, this.loc);
		else throw new RuntimeError(this.first_line, "「かつ」は真偽値にしか使えません");
	}
}

class Or extends Value
{
	constructor(x, y, loc){super([x,y],loc);}
	getValue()
	{
		let v1 = this.value[0].getValue(), v2 = this.value[1].getValue();
		if(v1 instanceof BooleanValue && v2 instanceof BooleanValue) return new BooleanValue(v1.value || v2.value, this.loc);
		else throw new RuntimeError(this.first_line, "「または」は真偽値にしか使えません");
	}
}
class Not extends Value
{
	constructor(x, loc){super(x,loc);}
	getValue()
	{
		let v1 = this.value.getValue();
		if(v1 instanceof BooleanValue) return new BooleanValue(!v1.value, this.loc);
		else throw new RuntimeError(this.first_line, "「でない」は真偽値にしか使えません");
	}
}

class EQ extends Value
{
	constructor(x, y, loc){super([x,y], loc);}
	getValue()
	{
		let v1 = this.value[0].getValue(), v2 = this.value[1].getValue();
		return new BooleanValue(v1.value == v2.value, this.loc);
	}
}

class NE extends Value
{
	constructor(x, y, loc){super([x,y], loc);}
	getValue()
	{
		let v1 = this.value[0].getValue(), v2 = this.value[1].getValue();
		return new BooleanValue(v1.value != v2.value, this.loc);
	}
}

class GT extends Value
{
	constructor(x, y, loc){super([x,y], loc);}
	getValue()
	{
		let v1 = this.value[0].getValue(), v2 = this.value[1].getValue();
		return new BooleanValue(v1.value > v2.value, this.loc);
	}
}

class GE extends Value
{
	constructor(x, y, loc){super([x,y], loc);}
	getValue()
	{
		let v1 = this.value[0].getValue(), v2 = this.value[1].getValue();
		return new BooleanValue(v1.value >= v2.value, this.loc);
	}
}

class LT extends Value
{
	constructor(x, y, loc){super([x,y], loc);}
	getValue()
	{
		let v1 = this.value[0].getValue(), v2 = this.value[1].getValue();
		return new BooleanValue(v1.value < v2.value, this.loc);
	}
}

class LE extends Value
{
	constructor(x, y, loc){super([x,y], loc);}
	getValue()
	{
		let v1 = this.value[0].getValue(), v2 = this.value[1].getValue();
		return new BooleanValue(v1.value <= v2.value, this.loc);
	}
}

class Identifier extends Value
{
	constructor(x, loc){super(x,loc);}
	getValue()
	{
		if(varsInt[this.value] != undefined) return new IntValue(varsInt[this.value], this.loc);
		else if(varsFloat[this.value] != undefined) return new FloatValue(varsFloat[this.value], this.loc);
		else if(varsString[this.value] != undefined) return new StringValue(varsString[this.value], this.loc);
		else if(varsBoolean[this.value] != undefined) return new BooleanValue(varsBoolean[this.value], this.loc);
		else throw new RuntimeError(this.first_line, this.value + "は宣言されていません");
	}
}

class CallFunction extends Value
{
	constructor(funcname, parameter, loc){super({funcname: funcname, parameter:parameter}, loc);}
	getValue()
	{
		let func = value.funcname, param = value.parameter;
		if(func == 'abs')
		{
			if(param.length != 1) throw new runtimeError(o, func + "の引数は1つです");
			var par1 = param[0].getValue();
			if(par1 instanceof IntValue) return new IntValue(Math.abs(par1.value), loc);
			else if(par1 instanceof FloatValue) return new FloatValue(Math.abs(par1.value), loc);
			else throw new RuntimeError(first_line, func + "は数値にしか使えません");
		}
		if(func == 'random')
		{
			if(param.length != 1) throw new runtimeError(o, func + "の引数は1つです");
			var par1 = param[0].getValue();
			return new IntValue(Math.floor(Math.random() * Math.floor(par1.value + 1)), loc);
		}
		if(func == 'ceil')
		{
			if(param.length != 1) throw new runtimeError(o, func + "の引数は1つです");
			var par1 = param[0].getValue();
			return new IntValue(Math.ceil(par1.value), loc);
		}
		if(func == 'floor')
		{
			if(param.length != 1) throw new runtimeError(o, func + "の引数は1つです");
			var par1 = getValue(param[0]);
			return {value: Math.floor(par1.value), type: INTTYPE};
		}
		if(func == 'round')
		{
			if(param.length != 1) throw new runtimeError(o, func + "の引数は1つです");
			var par1 = getValue(param[0]);
			return {value: Math.round(par1.value), type: INTTYPE};
		}
		if(func == 'int')
		{
			if(param.length != 1) throw new runtimeError(o, func + "の引数は1つです");
			var par1 = getValue(param[0]);
			return {value: par1.value >= 0 ? Math.ceil(par1.value) : Math.floor(par1.value), type: INTTYPE};
		}
		if(func == 'sin')
		{
			if(param.length != 1) throw new runtimeError(o, func + "の引数は1つです");
			var par1 = getValue(param[0]);
			return {value: Math.sin(par1.value), type: FLOATTYPE};
		}
		if(func == 'cos')
		{
			if(param.length != 1) throw new runtimeError(o, func + "の引数は1つです");
			var par1 = getValue(param[0]);
			return {value: Math.cos(par1.value), type: FLOATTYPE};
		}
		if(func == 'tan')
		{
			if(param.length != 1) throw new runtimeError(o, func + "の引数は1つです");
			var par1 = getValue(param[0]);
			return {value: Math.tan(par1.value), type: FLOATTYPE};
		}
		if(func == 'sqrt')
		{
			if(param.length != 1) throw new runtimeError(o, func + "の引数は1つです");
			var par1 = getValue(param[0]);
			return {value: Math.sqrt(par1.value), type: FLOATTYPE};
		}
		if(func == 'log')
		{
			if(param.length != 1) throw new runtimeError(o, func + "の引数は1つです");
			var par1 = getValue(param[0]);
			return {value: Math.log(par1.value), type: FLOATTYPE};
		}
		if(func == 'exp')
		{
			if(param.length != 1) throw new runtimeError(o, func + "の引数は1つです");
			var par1 = getValue(param[0]);
			return {value: Math.exp(par1.value), type: FLOATTYPE};
		}
		if(func == 'pow')
		{
			if(param.length != 2) throw new runtimeError(o, func + "の引数は2つです");
			var par1 = getValue(param[0]);
			var par2 = getValue(param[1]);
			var type = par1.type == INTTYPE && par2.type == INTTYPE ? INTTYPE : FLOATTYPE;
			var rtnv = Math.pow(par1.value, par2.value);
			if(type == INTTYPE && !Number.isSafeInteger(rtnv)) throw new runtimeError(o, "オーバーフローしました");
			if(!Number.isFinite(rtnv)) throw new runtimeError(o, "オーバーフローしました");
			if(par1.value < 0 && !Number.isInteger(par2)) throw new runtimeError(o, "負の数の非整数乗はできません");
			return {value: rtnv, type: type};
		}
		else throw new RuntimeError(o, func + "という関数はありません");
	}
}

class Append extends Value
{
	constructor(x,y,loc){super([x,y],loc);}
	getValue()
	{
		let v1 = this.value[0].getValue(), v2 = this.value[1].getValue();
		let v = String(v1) + String(v2);
		return new StgringValue(v, this.loc);
	}
}

class Statement
{
	constructor(loc)
	{
		this._loc = loc;
	}
	get first_line() {return this._loc.first_line;}
	get last_line() {return this._loc.last_line;}
	get loc(){return this._loc;}
	run(index){}
}

class DefinitionInt extends Statement
{
	constructor(x, loc)
	{
		super(loc);
		this.vars = x;
	}
	run(index)
	{
		for(var i = 0; i < this.vars.length; i++)
		{
			let varname = this.vars[i];
			if(varsInt[varname] != undefined || varsFloat[varname] != undefined
			|| varsString[varname] != undefined || varsBoolean[varname] != undefined)
			 	throw new RuntimeError(this.first_line, varname + "の宣言が重複しています");
			varsInt[varname] = 0;
		}
		return index + 1;
	}
}
class DefinitionFloat extends Statement
{
	constructor(x, loc)
	{
		super(loc);
		this.vars = x;
	}
	run(index)
	{
		for(var i = 0; i < this.vars.length; i++)
		{
			let varname = this.vars[i];
			if(varsInt[varname] != undefined || varsFloat[varname] != undefined
			|| varsString[varname] != undefined || varsBoolean[varname] != undefined)
			 	throw new RuntimeError(this.first_line, varname + "の宣言が重複しています");
			varsFloat[varname] = 0;
		}
		return index + 1;
	}
}
class DefinitionString extends Statement
{
	constructor(x, loc)
	{
		super(loc);
		this.vars = x;
	}
	run(index)
	{
		for(var i = 0; i < this.vars.length; i++)
		{
			let varname = this.vars[i];
			if(varsInt[varname] != undefined || varsFloat[varname] != undefined
			|| varsString[varname] != undefined || varsBoolean[varname] != undefined)
			 	throw new RuntimeError(this.first_line, varname + "の宣言が重複しています");
			varsString[varname] = 0;
		}
		return index + 1;
	}
}
class DefinitionBoolean extends Statement
{
	constructor(x, loc)
	{
		super(loc);
		this.vars = x;
	}
	run(index)
	{
		for(var i = 0; i < this.vars.length; i++)
		{
			let varname = this.vars[i];
			if(varsInt[varname] != undefined || varsFloat[varname] != undefined
			|| varsString[varname] != undefined || varsBoolean[varname] != undefined)
			 	throw new RuntimeError(this.first_line, varname + "の宣言が重複しています");
			varsBoolean[varname] = 0;
		}
		return index + 1;
	}
}

class Assign extends Statement
{
	constructor(varname,val,loc)
	{
		super(loc);
		this.varname = varname;
		this.val = val;
	}
	run(index)
	{
		let vn = this.varname;
		let vl = this.val.getValue();
		if(varsInt[vn] != undefined)
		{
			if(vl instanceof IntValue) varsInt[vn] = vl.value;
			else if(vl instanceof FloatValue) varsInt[vn] = Math.floor(vl.value);
			else throw new RuntimeError(this.first_line, vn + "に数値以外の値を代入しようとしました");
			if(!Number.isSafeInteger(varsInt[vn])) throw new RuntimeError(this.first_line, "オーバーフローしました");
		}
		else if(varsFloat[vn] != undefined)
		{
			if(vl instanceof IntValue || vl instanceof FloatValue) varsFloat[vn] = vl.value;
			else throw new RuntimeError(this.first_line, vn + "に数値以外の値を代入しようとしました");
			if(!Number.isFinite(varsFloat[vn])) throw new RuntimeError(this.first_line, "オーバーフローしました");
		}
		else if(varsString[vn] != undefined)
		{
			if(vl instanceof StringValue) varsString[vn] = vl.value;
			else throw new RuntimeError(this.first_line, vn + "に文字列以外の値を代入しようとしました");
		}
		else if(varsBoolean[vn] != undefined)
		{
			if(vl instanceof BooleanValue) varsBoolean[vn] = vl.value;
			else throw new RuntimeError(this.first_line, vn + "に真偽以外の値を代入しようとしました");
		}
		return index + 1;
	}
}

class Input extends Statement
{
	constructor(x, loc)
	{
		super(loc);
		this.varname = x;
	}
	run(index)
	{
		let varname = this.varname;
		let value;
		value = prompt("入力してください");
		if(varsInt[varname] != undefined) varsInt[varname] = parseInt(value);
		else if(varsFloat[varname] != undefined) varsFloat[varname] = parseFloat(value);
		else if(varsString[varname] != undefined) varsString[varname] = value;
		else if(varsBoolean[varname] != undefined) varsBoolean[varname] = (value == "true");
		else throw new RuntimeError(this.first_line, varname + "が宣言されていません");
		return index + 1;
	}
}

class Output extends Statement
{
	constructor(x, ln, loc)
	{
		super(loc);
		this.value = x;
		this.ln = ln;
	}
	run(index)
	{
		textarea.value += this.value.getValue().value + (this.ln ? "\n" : "");
		return index + 1;
	}
}

class If extends Statement
{
	constructor(condition, state1, state2, loc)
	{
		super(loc);
		this.condition = condition;
		this.state1 = state1;
		this.state2 = state2;
	}
	run(index)
	{
		if(this.condition.getValue() instanceof BooleanValue)
		{
			if(this.condition.getValue().value) stack.push({statementlist: this.state1, index: 0});
			else if(this.state2 != null) stack.push({statementlist: this.state2, index: 0});
		}
		else throw new RuntimeError(this.first_line, "もし〜の構文で条件式が使われていません");
		return index + 1;
	}
}

class LoopBegin extends Statement
{
	constructor(condition, continuous, loc)
	{
		super(loc);
		this.condition = condition;
		this.continuous = continuous;
	}
	run(index)
	{
		if(this.condition == null || this.condition.getValue().value == this.continuous) return index + 1;
		else return -1;
	}
}

class LoopEnd extends Statement
{
	constructor(condition, continuous, loc)
	{
		super(loc);
		this.condition = condition;
		this.continuous = continuous;
	}
	run(index)
	{
		if(this.condition == null || this.condition.getValue().value == this.continuous) return 0;
		else return -1;
	}
}

class ForInc extends Statement
{
	constructor(varname, begin, end, step, state,loc)
	{
		super(loc);
		this.varname = varname;
		this.begin = begin;
		this.end = end;
		this.step = step;
		this.state = state;
	}
	run(index)
	{
		let last_token = {first_line: this.last_line, last_line: this.last_line};
		let last_loc = new Location(last_token, last_token);
		if(varsInt[this.varname] != undefined || varsFloat[this.varname] != undefined)
		{
			let assign = new Assign(this.varname, this.begin.getValue(), this.loc);
			assign.run(0);
			let loop = [new LoopBegin(new LE(new Identifier(this.varname, this.loc), this.end, this.loc), true, this.loc)];
			for(let i = 0; i < this.state.length; i++)loop.push(this.state[i]);
			loop.push(new Assign(this.varname, new Add(new Identifier(this.varname, this.loc), this.step, last_loc), last_loc));
			loop.push(new LoopEnd(null, true, last_loc));
			stack.push({statementlist: loop, index: 0});
		}
		else throw new RuntimeError(this.first_line, this.varname + "は数値型の変数ではありません");
		return index + 1;
	}
}

class ForDec extends Statement
{
	constructor(varname, begin, end, step, state,loc)
	{
		super(loc);
		this.varname = varname;
		this.begin = begin;
		this.end = end;
		this.step = step;
		this.state = state;
	}
	run(index)
	{
		let last_token = {first_line: this.last_line, last_line: this.last_line};
		let last_loc = new Location(last_token, last_token);
		if(varsInt[this.varname] != undefined || varsFloat[this.varname] != undefined)
		{
			let assign = new Assign(this.varname, this.begin.getValue(), this.loc);
			assign.run(0);
			let loop = [new LoopBegin(new GE(new Identifier(this.varname, this.loc), this.end, this.loc), true, this.loc)];
			for(let i = 0; i < this.state.length; i++)loop.push(this.state[i]);
			loop.push(new Assign(this.varname, new Sub(new Identifier(this.varname, this.loc), this.step, last_loc), last_loc));
			loop.push(new LoopEnd(null, true, last_loc));
			stack.push({statementlist: loop, index: 0});
		}
		else throw new RuntimeError(this.first_line, this.varname + "は数値型の変数ではありません");
		return index + 1;
	}
}

class Until extends Statement
{
	constructor(state, condition, loc)
	{
		super(loc);
		this.condition = condition;
		this.state = state;
	}
	run(index)
	{
		let last_token = {first_line: this.last_line, last_line: this.last_line};
		let loop = [new LoopBegin(null, true, this.loc)];
		for(var i = 0; i < this.state.length; i++) loop.push(this.state[i]);
		loop.push(new LoopEnd(this.condition, false, new Location(last_token, last_token)));
		stack.push({statementlist: loop, index: 0});
		return index + 1;
	}
}

class While extends Statement
{
	constructor(condition, state, loc)
	{
		super(loc);
		this.condition = condition;
		this.state = state;
	}
	run(index)
	{
		let last_token = {first_line: this.last_line, last_line: this.last_line};
		let loop = [new LoopBegin(this.condition, true, this.loc)];
		for(var i = 0; i < this.state.length; i++) loop.push(this.state[i]);
		loop.push(new LoopEnd(null, false, new Location(last_token, last_token)));
		stack.push({statementlist: loop, index: 0});
		return index + 1;
	}
}


function reset(resultTextArea)
{
	varsInt = {}, varsFloat = {}, varsString = {}, varsBoolean = {};
	textarea = resultTextArea;
	textarea.value = '';
	run_flag = false;
	stack = [];
	$(".codelines").children().removeClass("lineselect");
}

function run(parse,  step_flag)
{
	if(!run_flag) 
	{
		reset(textarea);
		stack.push({statementlist: parse, index: 0});
		run_flag = true;
//		getElementById("sourceTextarea").readOnly = true;
	}
	if(step_flag)
	{
		step();
		if(stack.length == 0)
		{
			textarea.value += "---\n";
			run_flag = false;
		}
	}
	else {
		do{
			step();
		}while(stack.length > 0);
		textarea.value += "---\n";
		run_flag = false;
	}
//	_run(parse);

	function step()
	{
		var depth = stack.length - 1;
		var index = stack[depth].index;
		var line = -1;
		let statement = stack[depth].statementlist[index];
//		if(!stack[depth].statementlist[index]) return;
		if(statement) 
		{
			line = statement.first_line;
			index = statement.run(index);
		}
		else index++;
		if(index < 0) index = stack[depth].statementlist.length;
		
		$(".codelines").children().removeClass("lineselect");
		$(".codelines :nth-child("+line+")").addClass("lineselect");
		stack[depth].index = index;
		if(index > stack[depth].statementlist.length) stack.pop();
	}
}
