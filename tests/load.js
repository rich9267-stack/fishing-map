// Builds the page the tests run: index.html with its local css/ and js/ files put back inline,
// and the CDN <script>/<link> tags removed (the tests fake those libraries).
const fs = require("fs"), path = require("path");
module.exports = function loadHtml() {
  const root = path.join(__dirname, "..");
  const read = f => fs.readFileSync(path.join(root, f.split("?")[0]), "utf8");
  let html = read("index.html");
  html = html.replace(/<link rel="stylesheet" href="(css\/[^"]+)">/g, (m, h) => "<style>\n" + read(h) + "</style>");
  html = html.replace(/<script src="(js\/[^"]+)"><\/script>/g, (m, s) => "<script>\n" + read(s) + "</script>");
  return html.replace(/<script src=[^>]+><\/script>\n?/g, "").replace(/<link [^>]+>/, "");
};
