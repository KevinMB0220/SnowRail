const hre = require("hardhat");

async function main() {
  const networkName = hre.network.name;

  let routerAddress;
  if (networkName === "fuji") {
    routerAddress = process.env.ROUTER_ADDRESS_FUJI;
  } else if (networkName === "avalanche") {
    routerAddress = process.env.ROUTER_ADDRESS_AVALANCHE;
  } else {
    throw new Error(`Unsupported network: ${networkName}`);
  }

  if (!routerAddress) {
    throw new Error(
      `Missing router address env var for network ${networkName}. ` +
        `Set ROUTER_ADDRESS_FUJI or ROUTER_ADDRESS_AVALANCHE before deploying.`
    );
  }

  if (!process.env.PRIVATE_KEY) {
    throw new Error("Missing PRIVATE_KEY env var. Export your wallet private key before deploying.");
  }

  // Normalize router address - use lowercase to avoid checksum validation issues
  // The contract will accept it, and we can update it later if needed
  routerAddress = routerAddress.toLowerCase();

  console.log(`Deploying SnowRailTreasury to ${networkName}...`);
  console.log(`Using router address: ${routerAddress}`);

  const Treasury = await hre.ethers.getContractFactory("SnowRailTreasury");
  const treasury = await Treasury.deploy(routerAddress);

  await treasury.waitForDeployment();

  const address = await treasury.getAddress();
  console.log(`SnowRailTreasury deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


