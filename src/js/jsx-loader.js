(async () => {
  const {transpileJSX} = await import("./jsx-compiler.js")
  /** @type {NodeListOf<HTMLScriptElement>} */
  const scripts = document.querySelectorAll(`script[type="jsx" i], script[type="text/babel" i]`)
  for (const script of scripts){
    if (script.src == ""){
      const out = transpileJSX(script.text, script.getAttribute("factory") ?? undefined)
      script.type = "module"
      script.text = out
    }else{
      const out = transpileJSX(await (await fetch(script.src)).text(), script.getAttribute("factory") ?? undefined)
      script.type = "module"
      script.text = out
    }
  }
})()