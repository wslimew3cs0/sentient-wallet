require("@nomicfoundation/hardhat-toolbox");

const chainId = Number(process.env.HARDHAT_CHAIN_ID || 31337);
const rpcUrl = process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545";

module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId,
    },
    localhost: {
      chainId,
      url: rpcUrl,
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
