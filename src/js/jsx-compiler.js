/** @argument {string} src @argument {number} i */
const skipComments = (src, i) => {
  const res = src.slice(i).match(/^(?:\/\/.*|\/\*[\s\S]*\*\/)/)
  return res ? i + res[0].length : null
}

/** @argument {string} src @argument {number} i */
const skipWhiteSpace = (src, i, more = true) => {
  const prevI = i
  for (; i < src.length && /\s/.test(src[i]); i++) continue;
  if (more && prevI == i)return null;
  return i;
}

/** @argument {string} src @argument {number} i @returns {[number, string] | null} */
const takeString = (src, i) => {
  let end, res = ""
  if (src[i] == (end = '"') || src[i] == (end = "'") || src[i] == (end = "`")){
    i ++
    res += end
    for (; i < src.length && src[i] != end; i++){
      res += src[i]
      continue
    }
    i++
    res += end
    return [i, res];
  }
  return null
}

/** @argument {string} src @argument {number} i */
const skipRegex = (src, i) => {
  if (src.length - i >= 2 && src[i] == "/" && src[i + 1] != "/"){
    i += 2;
    for (; i < src.length && src[i] != "/"; i++) continue;
    i++
    return i;
  }
  return null
}

/** @argument {string} src @argument {number} i @returns {[number, string] | null} */
const takeIdent = (src, i) => {
  let res = ""
  const tmp = src.slice(i).match(/^[a-zA-Z_$\p{L}][a-zA-Z_$\p{L}0-9]*(?:(?:-|\s*\.\s*)[a-zA-Z_$\p{L}][a-zA-Z_$\p{L}0-9]+)*/)
  if (tmp == null) return null;
  res += tmp[0]
  i += res.length
  return [i, res]
}

/** @argument {string} src @argument {number} i @returns {[number, string] | null} */
const takeAttrIdent = (src, i) => {
  let res = ""
  const tmp = src.slice(i).match(/^[a-zA-Z_$\p{L}][a-zA-Z_$\p{L}0-9]*(?:-[a-zA-Z_$\p{L}][a-zA-Z_$\p{L}0-9]+)*/)
  if (tmp == null) return null;
  res = tmp[0]
  i += res.length
  return [i, res]
}

/**
 * @argument {string} src
 * @argument {number} i
 * @argument {string} factory
 * @argument {string} fragment
 * @returns {[number, string, string, boolean] | null}
 */
const parseStartJSX = (src, i, factory, fragment) => {
  let res = "/*#__PURE__*/ " + factory + "(", name = fragment, selfClose = false
  if (src[i] == "<"){
    i++;
    i = skipWhiteSpace(src, i) ?? i
    {
      const tmp = takeIdent(src, i)
      if (tmp != null){
        i = tmp[0]
        res += (/^[A-Z_$]/.test(tmp[1]) ? tmp[1] : JSON.stringify(tmp[1])) + ","
        name = tmp[1]
      }else{
        res += name + ","
      }
    }
    {
      const tmp = skipWhiteSpace(src, i, true)
      if (tmp) i = tmp
      if (tmp){
        const tmp = parseAttributes(src, i)
        if (tmp){
          i = tmp[0]
          res += tmp[1] + ","
        }else{
          res += "{},"
        }
      }else{
        res += "{},"
      }
    }
    i = skipWhiteSpace(src, i) ?? i
    if (src[i] == "/"){
      i++;
      i = skipWhiteSpace(src, i) ?? i
      if (src[i] != ">") return null;
      i++;
      selfClose = true
      res += ")"
      return [i, res, name, selfClose]
    }else if (src[i] != ">"){
      return null;
    }
    i++
    return [i, res, name, selfClose]
  }else return null
}

/** @argument {string} src @argument {number} i @argument {string} name @returns {[number, string] | null} */
const parseEndJSX = (src, i, name) => {
  if (src[i] == "<"){
    i ++
    i = skipWhiteSpace(src, i) ?? i
    if (src[i] != "/") return null;
    i++
    i = skipWhiteSpace(src, i) ?? i
    {
      const tmp = takeIdent(src, i)
      if (tmp != null){
        if (tmp[1] != name) return null;
        i = tmp[0]
        i = skipWhiteSpace(src, i) ?? i
        if (src[i] != ">") return null;
        i++
      }
    }
    return [i, ")"]
  }else return null
}

/** @argument {string} src @argument {number} i @argument {string} name @argument {string} factory @argument {string} fragment @returns {[number, string]} */
const parseChild = (src, i, name, factory, fragment) => {
  let res = "", inString = false
  for (; i < src.length; ){
    const tmp = jsxExpr(src, i)
    if (tmp == null){
      const tmp = parseJSX(src, i, factory, fragment)
      if (tmp == null){
        const tmp = parseEndJSX(src, i, name)
        if (tmp){
          if (inString){
            res += '",'
            inString = false
          }
          break;
        }
        if (inString == false){
          res += '"'
          inString = true
        }
        res += src[i].replace(/(["\r\n\t\\])/g, "\\$1")
        i++
        continue
      }
      if (inString){
        res += '",'
        inString = false
      }
      i = tmp[0]
      res += tmp[1]
      continue
    }
    if (inString){
      res += '",'
      inString = false
    }
    i = tmp[0]
    res += tmp[1] + ","
  }
  return [i, res]
}

/** @argument {string} src @argument {number} i @returns {[number, string] | null} */
const jsxExpr = (src, i) => {
  let res = "", bracketCount = 1
  if (src[i] != "{") return null;
  i++;
  for (; i < src.length && bracketCount; i++){
    if (src[i] == "{"){
      bracketCount++;
    }else if (src[i] == "}"){
      bracketCount--;
      if (bracketCount == 0){
        i++
        break
      }
    }
    res += src[i]
  }
  if (!i)return null;
  return [i, res]
}

/** @argument {string} src @argument {number} i @returns {[number, string] | null} */
const parseAttributes = (src, i) => {
  let res = "{";
  while (true){
    {
      const tmp = takeAttrIdent(src, i)
      if (tmp == null)break;
      i = tmp[0]
      res += JSON.stringify(tmp[1]) + ":"
    }
    i = skipWhiteSpace(src, i) ?? i
    if (src[i] == ">"){
      res += "true"
      break
    }else if (src[i] != "="){
      res += "true,"
      continue
    }
    i++
    i = skipWhiteSpace(src, i) ?? i
    {
      const tmp = takeString(src, i) ?? jsxExpr(src, i)
      if (tmp == null)break;
      i = tmp[0]
      res += tmp[1] + ","
    }
    if (src[i] == ">"){
      break
    }
  }
  res += "}"
  return [i, res]
}

/** @argument {string} src @argument {number} i @argument {string} factory @argument {string} fragment @returns {[number, string] | null} */
const parseJSX = (src, i, factory, fragment) => {
  let res = "", name = fragment
  {
    const tmp = parseStartJSX(src, i, factory, fragment)
    if (tmp == null) return null;
    i = tmp[0]
    res += tmp[1]
    name = tmp[2]
    if (tmp[3])return [i, res]
  }
  {
    const tmp = parseChild(src, i, name, factory, fragment)
    if (tmp == null) return null;
    i = tmp[0]
    res += tmp[1]
  }
  {
    const tmp = parseEndJSX(src, i, name)
    if (tmp == null) return null;
    i = tmp[0]
    res += tmp[1]
  }
  return [i, res]
}

/** @argument {string} src @argument {string} factory @argument {string} fragment */
export const transpileJSX = (src, factory = "React.createElement", fragment = "React.Fragment") => {
  let res = ""
  for (let i = 0; i < src.length; ){
    {
      const tmp = skipWhiteSpace(src, i) ?? skipComments(src, i) ?? takeString(src, i)?.[0] ?? skipRegex(src, i) ?? parseJSX(src, i, factory, fragment)
      if (tmp != null){
        if (tmp instanceof Array){
          i = tmp[0]
          res += tmp[1]
          continue
        }else{
          let prevI = 0
          prevI = i
          i = tmp
          res += src.slice(prevI, i)
          continue
        }
      }else{
        res += src[i]
        i++
      }
    }
    
  }
  return res
}