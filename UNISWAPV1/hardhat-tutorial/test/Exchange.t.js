const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Exchange", function () {
  let exchange;
  let token;
  let owner;
  let user1;
  let user2;

  const ETH_RESERVE = ethers.utils.parseEther("10");
  const TOKEN_RESERVE = ethers.utils.parseEther("100");

  before(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MyToken");
    token = await Token.deploy();
    await token.deployed();

    const Exchange = await ethers.getContractFactory("Exchange");
    exchange = await Exchange.deploy(token.address);
    await exchange.deployed();

    await token.transfer(exchange.address, TOKEN_RESERVE);
    await owner.sendTransaction({
      to: exchange.address,
      value: ETH_RESERVE,
    });
  });

  it("should initialize with correct reserves", async function () {
    expect(await exchange.getReserve()).to.equal(TOKEN_RESERVE);
    expect(await exchange.balanceOf(owner.address)).to.equal(ETH_RESERVE);
  });

  it("should add liquidity", async function () {
    const amount = ethers.utils.parseEther("1");

    // Approve token transfer to exchange
    await token.connect(user1).approve(exchange.address, amount);

    // Add liquidity
    await expect(
      exchange.connect(user1).addLiquidity(amount, { value: amount })
    )
      .to.emit(exchange, "Transfer")
      .withArgs(user1.address, exchange.address, amount)
      .to.emit(exchange, "Transfer")
      .withArgs(exchange.address, user1.address, amount);

    // Check LP token balance
    expect(await exchange.balanceOf(user1.address)).to.equal(amount);
  });

  it("should remove liquidity", async function () {
    const lpTokens = ethers.utils.parseEther("0.5");
    const lpTokenBalanceBefore = await exchange.balanceOf(user1.address);

    // Remove liquidity
    await expect(exchange.connect(user1).removeLiquidity(lpTokens))
      .to.emit(exchange, "Transfer")
      .withArgs(exchange.address, user1.address, lpTokens)
      .to.emit(token, "Transfer")
      .withArgs(exchange.address, user1.address, TOKEN_RESERVE.mul(lpTokens).div(ETH_RESERVE))
      .to.changeEtherBalance(user1, ETH_RESERVE.mul(lpTokens).div(lpTokenBalanceBefore));

    // Check LP token balance
    expect(await exchange.balanceOf(user1.address)).to.equal(lpTokenBalanceBefore.sub(lpTokens));
  });

  it("should swap ETH for CryptoDev tokens", async function () {
    const ethAmount = ethers.utils.parseEther("0.1");
    const tokenAmount = await exchange.getAmountOfTokens(ethAmount, ETH_RESERVE.sub(ethAmount), TOKEN_RESERVE);

    // Swap ETH for tokens
    await expect(exchange.connect(user2).ethToCryptoDevToken(tokenAmount))
      .to.emit(token, "Transfer")
      .withArgs(exchange.address, user2.address, tokenAmount);

    // Check token balance
    expect(await token.balanceOf(user2.address)).to.equal(tokenAmount);
  });

  it("should swap CryptoDev tokens for ETH", async function () {
    const tokenAmount = ethers.utils.parseEther("10");
    const ethAmount = await exchange.getAmountOfTokens(tokenAmount, TOKEN_RESERVE, ETH_RESERVE);

    // Transfer tokens to exchange
    await token.connect(user2).transfer(exchange.address, tokenAmount);

    // Swap tokens for ETH
    await expect(exchange.connect(user2).cryptoDevTokenToEth(tokenAmount, ethAmount))
      .to.emit(token, "Transfer")
      .withArgs(user2.address, exchange.address, tokenAmount)
      .to.changeEtherBalance(user2, ethAmount);

    // Check ETH balance
    expect(await ethers.provider.getBalance(exchange.address)).to.equal(ETH_RESERVE);
  });
});
