const grammar = ohm.grammar(`
steps {
  Exp = Step+

  Step = AnchorStep | GuideStep
  AnchorStep = "(" "anchor" V2Exp ")"
  GuideStep = "(" "guide" LineExp ")"

  TypeRef = relRef | absRef
  ValRef = relRef | absRef
  relRef = "^" digit+
  absRef = "@" digit+
  argRef = ident

  V2Exp = V2Literal | MeasureExp
  V2Literal = "(" number number ")"
  MeasureExp = "(" ident TypeRef (number | ValRef | argRef)* ")"

  LineExp = "(" (V2Exp | ValRef) (V2Exp | ValRef) ")"

  number = "-"? digit+ ("." digit+)?
  ident = letter (letter | digit | "_")*
}`)

const construct = (pcode, env, measures) => {
  const steps = []

  const semantics = grammar.createSemantics()
  semantics.addOperation("e", {
    Exp: (steps) => steps.e(),
    AnchorStep: (_, _1, v2, _2) => { steps.push({ type: "anchor", v: v2.e() }) },
    GuideStep: (_, _1, line, _2) => { steps.push({ type: "guide", v: line.e() }) },
    TypeRef: (ref) => ref.e(),
    ValRef: (ref) => ref.e().v,
    relRef: (_, idx) => steps[steps.length - parseInt(idx.sourceString)],
    absRef: (_, idx) => steps[parseInt(idx.sourceString) - 1],
    argRef: (ident) => env[ident.e()],
    V2Literal: (_, x, y, _1) => ({ x: x.e(), y: y.e() }),
    MeasureExp: (_, ident, ref, args, _1) => measures[ref.e().type][ident.e()](...args.e())(ref.e().v),
    LineExp: (_, a, b, _1) => ({ from: a.e(), to: b.e() }),
    ident: (a, b) => a.sourceString + b.sourceString,
    number: (a, b, c, d) => parseFloat([a,b,c,d].map((v) => v.sourceString).join("")),
  })

  const match_result = grammar.match(pcode)
  if (match_result.failed()) { return [] }
  semantics(match_result).e()
  return steps
}
