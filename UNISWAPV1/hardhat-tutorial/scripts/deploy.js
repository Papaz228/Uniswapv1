const { ethers } = require("hardhat");
require("dotenv").config({ path: ".env" });
const { CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS } = require("../constants");

async function main() {
  const cryptoDevTokenAddress = CRYPTO_DEV_TOKEN_CONTRACT_ADDRESS;
  /*
  A ContractFactory in ethers.js is an abstraction used to deploy new smart contracts,
  so exchangeContract here is a factory for instances of our Exchange contract.
  */
  const exchangeContract = await ethers.getContractFactory("Exchange");
  const erc20 = await ethers.getContractFactory("MyToken");
  // here we deploy the contract

  const deployedErc20 = await erc20.deploy();
  await deployedErc20.deployed();

  const deployedExchangeContract = await exchangeContract.deploy(
    deployedErc20.address
  );

  await deployedExchangeContract.deployed();

  // print the address of the deployed contract
  console.log("MyToken:", deployedErc20.address)
  console.log("Exchange Contract Address:", deployedExchangeContract.address);
}

// Call the main function and catch if there is any error
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
