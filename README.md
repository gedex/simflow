simflow
=======

Simply define and run your flows in Chrome.

## Install

```
npm i -g simflow
```

## Usage

```
simflow
```

* Flows are defined in JSON config file. Template config can be found in `~/.simflow.json`.
* Running `simflow` without specifying `-c` (config file) will use template config.

### Example

This example demonstrates a simple flow of searching GitHub project and take
a sreenshot of search results.

* Copy template config:

  ```
  simflow test # This will generate template config in ~/.simflow.json
  cp ~/.simflow.json ./example-gh-project.json
  ```

* Modify `example-gh-simflow.json` content:

  ```json
  {
    "url": "https://github.com",
    "selectors": {
      "searchField": "[name='q']",
      "searchButton": "[type='submit']"
    },
    "initialState": "notLoggedIn",
    "flows": {
      "search": {
        "inputState": "notLoggedIn",
        "steps": [
          "Goto /search",
          "See searchField",
          "Type in searchField simflow",
          "See searchButton",
          "Click searchButton",
          "Page reloads",
          "Take screenshot search-results.png"
        ],
        "outputState": "loggedIn"
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
| `selectors` | `object` | Named [CSS selectors](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Selectors) to refer in steps of a flow. 
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

Step can be a `string` or `object`. For example:

```
Click namedSelector
```

or:

```
{
	"step": "Click namedSelector",
	"skippable": true,
	"args": { "timeout": 1000 }
}
```

| Key | Type | Description |
| --- | ---- | ----------- |
| `step` | `string` | Step. |
| `skippable` | `boolean` | If set to true, failed step is marked as skipped. |
| `args` | `object` | Arguments to be passed to `click` handler. |
