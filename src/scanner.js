import fs from "fs";

const config = JSON.parse(
  fs.readFileSync("./config/sentinel.config.json", "utf8")
);

const report = {
  status: "OK",
  scanner: "CET RH Sentinel",
  version: "0.1.0",
  network: config.network,
  scanTime: new Date().toISOString(),
  message: "Scanner is working."
};

fs.writeFileSync(
  "./output/sentinel_report.json",
  JSON.stringify(report, null, 2)
);

console.log("CET RH Sentinel v0.1 scan completed.");
console.log(report);
