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
    "selectors": {
      "searchField": "[name='q']",
      "searchButton": "[type='submit']"
    },
    "initialState": "",
    "flows": {
      "search": {
        "inputState": ".",
        "steps": [
          "Goto '/search'",
          "See searchField",
          "Type in searchField 'simflow'",
          "See searchButton",
          "Click searchButton",
          "Wait page { to: 'reload' }",
          "Save screenshot as 'search-results.png'"
          "Save page as 'search-results.html'"
        ],
        "outputState": "."
      }
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
| `users` | `object` |  Named users to refer in steps of a flow. |
| `frames` | `object` | Named frames to refer (in combination with selector) to refer in steps of a flow (i.e. `See selector@frameName`). It accepts regex pattern to match the frame name. |
| `selectors` | `object` | Named [CSS selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors) to refer in steps of a flow. |
| `initialState` | `string` | **Required**. Initial state before executing steps in flows. |
| `flows` | `objects` |  **Required**. Named flows to be passed `simflow`. |

### Users

| Key | Type | Description |
| --- | ---- | ----------- |
| `username` | `string` | Username |
| `password` | `string` | Password |

### Flows

| Key | Type | Description |
| --- | ---- | ----------- |
| `requireUser` | `boolean` or `string` | If set to true, it requires passing `--user` option to `simflow`. If set to string, it requires a user in `users` section to be passed (i.e. `simflow -u admin`). |
| `inputState` | `string` | **Required**. Expected state before running this flow. |
| `steps` | `array` | **Required**. List of steps in this flow. |
| `outputState` | `string` | **Required**. Output step after running this flow. |

### Flow Steps

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
