require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  networks: {
    hardhat: { chainId: 50312 },
    somniaTestnet: {
      url: process.env.SOMNIA_RPC_URL ?? "https://dream-rpc.somnia.network",
      chainId: 50312,
      accounts: process.env.DEPLOYER_PK ? [process.env.DEPLOYER_PK] : [],
    },
    somniaMainnet: {
      url: process.env.SOMNIA_MAINNET_RPC_URL ?? "https://rpc.somnia.network",
      chainId: 50312,
      accounts: process.env.DEPLOYER_PK ? [process.env.DEPLOYER_PK] : [],
    },
  },
};
