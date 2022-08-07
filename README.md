# Make import maps

Import maps allow a browser to know where to load ES modules from.

See [https://github.com/WICG/import-maps]

## Usage

Create an HTML file including:

```html
  <!--#importmap-->
```

Run a development server (either by installing this package globally or create an npm script).
The path to serve should include all required assets and source files:

```
make-import-map serve .
```

Build an import map for distribution:

```
make-import-map save . import-map.json
```
