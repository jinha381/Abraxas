const fs = require("fs");
const { reporters } = require("mocha");
module.exports = class HatchMindReporter extends reporters.Spec {
  constructor(runner, options) {
    super(runner, options);
    const tests = [];
    runner.on("pass", t => tests.push({ name: t.title, status: "PASS", duration_ms: t.duration }));
    runner.on("fail", (t, err) => tests.push({ name: t.title, status: "FAIL", error: err.message }));
    runner.on("pending", t => tests.push({ name: t.title, status: "PENDING" }));
    runner.once("end", () => {
      fs.mkdirSync(".local", { recursive: true });
      fs.writeFileSync(".local/onchain-results.json", JSON.stringify({
        date: new Date().toISOString(), stats: runner.stats, tests
      }, null, 2));
    });
  }
};
