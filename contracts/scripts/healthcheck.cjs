const http = require("node:http");

const endpoint = new URL(process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545");
const payload = JSON.stringify({
  jsonrpc: "2.0",
  method: "eth_chainId",
  params: [],
  id: 1,
});

const request = http.request(
  endpoint,
  {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "content-length": Buffer.byteLength(payload),
    },
    timeout: 1_500,
  },
  (response) => {
    let body = "";
    response.setEncoding("utf8");
    response.on("data", (chunk) => {
      body += chunk;
    });
    response.on("end", () => {
      try {
        const parsed = JSON.parse(body);
        process.exit(response.statusCode === 200 && parsed.result ? 0 : 1);
      } catch {
        process.exit(1);
      }
    });
  },
);

request.on("timeout", () => request.destroy());
request.on("error", () => process.exit(1));
request.write(payload);
request.end();
