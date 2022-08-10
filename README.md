# Make import maps

Import maps allow a browser to know where to load ES modules from. Bundler not required.

See [https://github.com/WICG/import-maps]

## Example usage:

Create an HTML file, for example:

```html
<html>
<head>
  <!--#importmap-->
</head>
<body>
  <script type="module">
    import which from "which-export";
    document.body.append(which);
  </script>
</body>
</html>
```

Run a development server (either by installing this package globally or create an npm script).
The path to serve should include all required `node_modules` directories and source files:

```
make-import-map serve .
```

The comment in HTML will be replaced by an import map. If `which-export` is a dependency in `package.json` and is installed then the import will load it from `node_modules`.

Build an import map for distribution:

```
make-import-map save . import-map.json
```
