type Token =
  | { t: 'num'; v: number }
  | { t: 'op'; v: string }
  | { t: 'lp' }
  | { t: 'rp' }
  | { t: 'fn'; v: string }
  | { t: 'comma' };

const MAX_LENGTH = 200;
const FN_ARITY: Record<string, number> = {
  sqrt: 1,
  abs: 1,
  round: 1,
  floor: 1,
  ceil: 1,
  min: 2,
  max: 2,
  pow: 2,
};

function tokenize(expr: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === ' ') {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
      const raw = expr.slice(i, j);
      if (!/^\d+(\.\d+)?$/.test(raw)) return null;
      tokens.push({ t: 'num', v: parseFloat(raw) });
      i = j;
      continue;
    }
    if ('+-*/%^'.includes(c)) {
      tokens.push({ t: 'op', v: c });
      i++;
      continue;
    }
    if (c === '(') {
      tokens.push({ t: 'lp' });
      i++;
      continue;
    }
    if (c === ')') {
      tokens.push({ t: 'rp' });
      i++;
      continue;
    }
    if (c === ',') {
      tokens.push({ t: 'comma' });
      i++;
      continue;
    }
    if (/[a-z]/i.test(c)) {
      let j = i;
      while (j < expr.length && /[a-z]/i.test(expr[j])) j++;
      const name = expr.slice(i, j).toLowerCase();
      if (!(name in FN_ARITY)) return null;
      tokens.push({ t: 'fn', v: name });
      i = j;
      continue;
    }
    return null;
  }
  return tokens;
}

function applyFn(name: string, args: number[]): number {
  const arity = FN_ARITY[name];
  if (args.length !== arity) throw new Error(`Function ${name} expects ${arity} argument(s)`);
  let result: number;
  switch (name) {
    case 'sqrt':
      if (args[0] < 0) throw new Error('sqrt of negative number');
      result = Math.sqrt(args[0]);
      break;
    case 'abs':
      result = Math.abs(args[0]);
      break;
    case 'round':
      result = Math.round(args[0]);
      break;
    case 'floor':
      result = Math.floor(args[0]);
      break;
    case 'ceil':
      result = Math.ceil(args[0]);
      break;
    case 'min':
      result = Math.min(args[0], args[1]);
      break;
    case 'max':
      result = Math.max(args[0], args[1]);
      break;
    case 'pow':
      result = Math.pow(args[0], args[1]);
      break;
    default:
      throw new Error(`Unknown function ${name}`);
  }
  if (!Number.isFinite(result)) throw new Error('Result is not finite');
  return result;
}

/**
 * Safe arithmetic evaluator: no eval(), no globals, whitelisted operators
 * and functions only. Throws on invalid input (use for AI tool execution).
 */
export function evaluate(expr: string): number {
  if (!expr || expr.length > MAX_LENGTH) throw new Error('Invalid expression length');
  const tokens = tokenize(expr);
  if (!tokens) throw new Error('Invalid characters in expression');

  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];

  function parseExpr(): number {
    let v = parseTerm();
    let p = peek();
    while (p?.t === 'op' && (p.v === '+' || p.v === '-')) {
      const t = next();
      if (t.t !== 'op') throw new Error('Expected operator');
      const op = t.v;
      const r = parseTerm();
      v = op === '+' ? v + r : v - r;
      p = peek();
    }
    return v;
  }

  function parseTerm(): number {
    let v = parseFactor();
    let p = peek();
    while (p?.t === 'op' && ['*', '/', '%', '^'].includes(p.v)) {
      const t = next();
      if (t.t !== 'op') throw new Error('Expected operator');
      const op = t.v;
      const r = parseFactor();
      if (op === '*') v *= r;
      else if (op === '/') {
        if (r === 0) throw new Error('Division by zero');
        v /= r;
      } else if (op === '%') {
        if (r === 0) throw new Error('Modulo by zero');
        v %= r;
      } else {
        v = Math.pow(v, r);
      }
      p = peek();
    }
    return v;
  }

  function parseFactor(): number {
    const t = next();
    if (!t) throw new Error('Unexpected end of expression');
    if (t.t === 'num') return t.v;
    if (t.t === 'op' && (t.v === '-' || t.v === '+')) {
      const v = parseFactor();
      return t.v === '-' ? -v : v;
    }
    if (t.t === 'lp') {
      const v = parseExpr();
      const close = next();
      if (close?.t !== 'rp') throw new Error('Expected closing parenthesis');
      return v;
    }
    if (t.t === 'fn') {
      if (next()?.t !== 'lp') throw new Error('Expected ( after function name');
      const args: number[] = [];
      if (peek()?.t === 'rp') {
        next();
      } else {
        args.push(parseExpr());
        while (peek()?.t === 'comma') {
          next();
          args.push(parseExpr());
        }
        if (next()?.t !== 'rp') throw new Error('Expected closing parenthesis');
      }
      return applyFn(t.v, args);
    }
    throw new Error('Unexpected token');
  }

  const result = parseExpr();
  if (i !== tokens.length) throw new Error('Trailing tokens in expression');
  if (!Number.isFinite(result)) throw new Error('Result is not finite');
  return result;
}
