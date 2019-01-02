simflow
=======

Simply define and run your flows in Chrome.

## Install

```
npm i -g simflow
```

## Usage

```
simflow <flows...> [options...]
```

Flows are defined in JSON config file.

### Example

This example demonstrates a simple flow of searching GitHub project and take
a sreenshot of search results.

* Create `example-gh-simflow.json`:

  ```json
  {
    "url": "https://github.com",
    "references": {
      "searchField": "[name='q']",
      "searchButton": "[type='submit']"
    },
    "flows": {
      "search": [
        "Goto '/search'",
        "See searchField",
        "Type in searchField 'simflow'",
        "See searchButton",
        "Click searchButton",
        "Wait page { to: 'reload' }",
        "Save screenshot as 'search-results.png'",
        "Save page as 'search-results.html'"
      ]
    }
  } 
  ```

* Run `search` flow from `example-gh-simflow.json` config file:

  ```
  simflow search -c ./example-gh-simflow.json
  ```

## Config

*This is under heavy development and structure may changes.*

| Key | Type | Description |
| --- | ---- | ----------- |
| `url` | `string` | **Required**. Base URL. New page opens this URL. Defined path (i.e., `Goto /path`) in steps section uses this base URL. |
| `references` | `object` | List of references to be used in steps of a flow. |
| `flows` | `objects` |  **Required**. Flow names mapped to array of steps. Named flows are passed to `simflow` as args. |

### Step

Step is a string with grammar defined in a [PEG](https://en.wikipedia.org/wiki/Parsing_expression_grammar) file [`lib/step.pegjs`](./lib/step.pegjs).

Some example of steps:

```
// Use reference.
Click namedSelector
Click namedSelector@frameName

// Use literal string for selector.
Click '.header h1'@'frameName'

Type into namedSelector "hello world"

Press 'Enter'

// Step arguments.
Press 'Enter' { delay: 1000 }
Save screenshot as './screenshots/filename.png' { fullPage: true }
Save page as './pages/index.pdf' { output: 'pdf' }
```
