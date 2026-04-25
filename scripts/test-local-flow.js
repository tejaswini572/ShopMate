const app = require("../index");

function main() {
  console.log("Local flow scaffold check passed.");
  console.log("Available handlers:", Object.keys(app.handlers).join(", "));
  console.log("Available services:", Object.keys(app.services).join(", "));
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
};
