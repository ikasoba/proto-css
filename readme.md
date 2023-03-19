# Proto.CSS

Proto.CSS is a middle ground between Reset CSS and CSS frameworks and is used to make things look better for now.
[Example here](//ikasoba.github.io/proto-css/example/index.html)

## Usage
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="stylesheet" href="./src/proto.css" />

<main>
  <h1>My wonderful project</h1>
  <button>
    count: 0
  </button>
</main>

<script>
  const counter = document.querySelector("button")
  let i = 0
  counter.addEventListener("click", () => {
    i ++
    counter.childNodes[0].textContent = `count: ${i}`
  })
</script>
```
