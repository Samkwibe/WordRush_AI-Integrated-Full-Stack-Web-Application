// Lightweight syntax highlighter — no external dependencies.
// Returns an array of { text, type } tokens for rendering.

const KEYWORDS = {
  python: new Set([
    "False", "None", "True", "and", "as", "assert", "async", "await", "break",
    "class", "continue", "def", "del", "elif", "else", "except", "finally",
    "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal",
    "not", "or", "pass", "raise", "return", "try", "while", "with", "yield",
    "print", "self", "range", "len", "int", "str", "float", "list", "dict", "set",
    "tuple", "bool", "type", "super", "isinstance", "enumerate", "zip", "map", "filter",
  ]),
  javascript: new Set([
    "async", "await", "break", "case", "catch", "class", "const", "continue",
    "debugger", "default", "delete", "do", "else", "export", "extends", "false",
    "finally", "for", "from", "function", "if", "import", "in", "instanceof",
    "let", "new", "null", "of", "return", "static", "super", "switch", "this",
    "throw", "true", "try", "typeof", "undefined", "var", "void", "while", "with", "yield",
    "console", "log", "Math", "JSON", "Object", "Array", "Promise", "setTimeout",
  ]),
  typescript: null, // filled below
  java: new Set([
    "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
    "class", "continue", "default", "do", "double", "else", "enum", "extends",
    "false", "final", "finally", "float", "for", "if", "implements", "import",
    "instanceof", "int", "interface", "long", "native", "new", "null", "package",
    "private", "protected", "public", "return", "short", "static", "strictfp",
    "super", "switch", "synchronized", "this", "throw", "throws", "transient",
    "true", "try", "void", "volatile", "while", "String", "System", "out", "println",
  ]),
  go: new Set([
    "break", "case", "chan", "const", "continue", "default", "defer", "else",
    "fallthrough", "for", "func", "go", "goto", "if", "import", "interface",
    "map", "package", "range", "return", "select", "struct", "switch", "type",
    "var", "true", "false", "nil", "fmt", "Println", "Printf", "Sprintf",
    "append", "len", "cap", "make", "new", "error", "string", "int", "bool",
  ]),
  rust: new Set([
    "as", "async", "await", "break", "const", "continue", "crate", "dyn",
    "else", "enum", "extern", "false", "fn", "for", "if", "impl", "in",
    "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return",
    "self", "Self", "static", "struct", "super", "trait", "true", "type",
    "unsafe", "use", "where", "while", "println", "vec", "String", "Option",
    "Some", "None", "Result", "Ok", "Err", "Box", "Vec", "i32", "u32", "f64",
  ]),
  css: new Set([
    "color", "background", "display", "flex", "grid", "margin", "padding",
    "border", "width", "height", "position", "top", "left", "right", "bottom",
    "font", "text", "align", "justify", "content", "items", "none", "block",
    "inline", "relative", "absolute", "fixed", "sticky", "hidden", "visible",
    "auto", "inherit", "initial", "important", "hover", "focus", "active",
    "before", "after", "root", "var", "calc", "rgba", "hsl", "transition",
    "transform", "animation", "opacity", "overflow", "z-index", "gap",
  ]),
  html: new Set([
    "div", "span", "p", "a", "img", "ul", "ol", "li", "h1", "h2", "h3",
    "h4", "h5", "h6", "table", "tr", "td", "th", "form", "input", "button",
    "label", "select", "option", "textarea", "section", "header", "footer",
    "nav", "main", "article", "aside", "class", "id", "src", "href", "alt",
    "type", "name", "value", "style", "script", "link", "meta", "title",
  ]),
};
KEYWORDS.typescript = new Set([...KEYWORDS.javascript, "type", "interface", "enum", "as", "keyof", "readonly", "any", "never", "unknown", "namespace", "declare"]);

const COMMENT_PATTERNS = {
  python:     { line: "#",  block: null },
  javascript: { line: "//", block: ["/*", "*/"] },
  typescript: { line: "//", block: ["/*", "*/"] },
  java:       { line: "//", block: ["/*", "*/"] },
  go:         { line: "//", block: ["/*", "*/"] },
  rust:       { line: "//", block: ["/*", "*/"] },
  css:        { line: null, block: ["/*", "*/"] },
  html:       { line: null, block: ["<!--", "-->"] },
};

/**
 * Tokenize code into syntax-highlighted tokens.
 * @param {string} code - The source code to tokenize
 * @param {string} lang - Language identifier
 * @returns {{ text: string, type: string }[]}
 */
export function tokenize(code, lang = "python") {
  const keywords = KEYWORDS[lang] || KEYWORDS.python;
  const comments = COMMENT_PATTERNS[lang] || COMMENT_PATTERNS.python;
  const tokens = [];
  let i = 0;

  function push(text, type) {
    if (text) tokens.push({ text, type });
  }

  while (i < code.length) {
    const rest = code.slice(i);

    // Block comments
    if (comments.block && rest.startsWith(comments.block[0])) {
      const end = code.indexOf(comments.block[1], i + comments.block[0].length);
      const closeAt = end >= 0 ? end + comments.block[1].length : code.length;
      push(code.slice(i, closeAt), "comment");
      i = closeAt;
      continue;
    }

    // Line comments
    if (comments.line && rest.startsWith(comments.line)) {
      const nl = code.indexOf("\n", i);
      const end = nl >= 0 ? nl : code.length;
      push(code.slice(i, end), "comment");
      i = end;
      continue;
    }

    // Strings (single, double, template literals for JS/TS)
    if (rest[0] === '"' || rest[0] === "'" || rest[0] === "`") {
      const q = rest[0];
      let j = 1;
      while (j < rest.length) {
        if (rest[j] === "\\" && j + 1 < rest.length) { j += 2; continue; }
        if (rest[j] === q) { j++; break; }
        if (rest[j] === "\n" && q !== "`") { break; }
        j++;
      }
      push(rest.slice(0, j), "string");
      i += j;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(rest[0]) && (i === 0 || /[^a-zA-Z_]/.test(code[i - 1]))) {
      const m = rest.match(/^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|[0-9][0-9_]*\.?[0-9_]*(?:[eE][+-]?[0-9]+)?)/);
      if (m) {
        push(m[0], "number");
        i += m[0].length;
        continue;
      }
    }

    // Words (identifiers / keywords)
    if (/[a-zA-Z_$]/.test(rest[0])) {
      const m = rest.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/);
      if (m) {
        const word = m[0];
        // Check if it's a function call
        const afterWord = code.slice(i + word.length);
        if (keywords.has(word)) {
          push(word, "keyword");
        } else if (/^\s*\(/.test(afterWord)) {
          push(word, "function");
        } else {
          push(word, "normal");
        }
        i += word.length;
        continue;
      }
    }

    // Operators
    if (/[+\-*/%=<>!&|^~?:]/.test(rest[0])) {
      const m = rest.match(/^(===|!==|==|!=|<=|>=|=>|->|\.\.\.|&&|\|\||<<|>>|\+\+|--|[+\-*/%=<>!&|^~?:])/);
      if (m) {
        push(m[0], "operator");
        i += m[0].length;
        continue;
      }
    }

    // Newlines
    if (rest[0] === "\n") {
      push("\n", "normal");
      i++;
      continue;
    }

    // Everything else (whitespace, punctuation)
    push(rest[0], "normal");
    i++;
  }

  return tokens;
}

// CSS class names for each token type
export const TOKEN_COLORS = {
  keyword:  "syn-keyword",
  string:   "syn-string",
  comment:  "syn-comment",
  number:   "syn-number",
  function: "syn-function",
  operator: "syn-operator",
  normal:   "syn-normal",
};
