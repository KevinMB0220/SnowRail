const hre = require("hardhat");
const { ethers } = hre;

// Dirección del contrato desplegado
const TREASURY_ADDRESS = "0xcba2318C6C4d9c98f7732c5fDe09D1BAe12c27be";

// ABI mínimo del contrato
const TREASURY_ABI = [
  "function owner() view returns (address)",
  "function router() view returns (address)",
  "function swapAllowances(address, address) view returns (uint256)",
  "function requestPayment(address payee, uint256 amount, address token)",
  "function authorizeSwap(address fromToken, address toToken, uint256 maxAmount)",
  "function executePayment(address payer, address payee, uint256 amount, address token)",
  "function getTokenBalance(address token) view returns (uint256)",
  "event PaymentRequested(address indexed payer, address indexed payee, uint256 amount, address token)",
  "event PaymentExecuted(address indexed payer, address indexed payee, uint256 amount, address token)",
  "event PaymentFailed(address indexed payer, address indexed payee, uint256 amount, address token, string reason)",
  "event SwapAuthorized(address indexed owner, address indexed fromToken, address indexed toToken, uint256 maxAmount)",
];

async function main() {
  console.log("🧪 Iniciando pruebas del contrato SnowRailTreasury...\n");

  // Obtener el signer (tu wallet)
  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  console.log(`📝 Wallet conectada: ${signerAddress}`);
  console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(signerAddress))} AVAX\n`);

  // Conectar al contrato
  const treasury = new ethers.Contract(TREASURY_ADDRESS, TREASURY_ABI, signer);
  console.log(`📄 Contrato: ${TREASURY_ADDRESS}\n`);

  // 1. Leer información del contrato
  console.log("1️⃣ Leyendo información del contrato...");
  try {
    const owner = await treasury.owner();
    const router = await treasury.router();
    console.log(`   ✅ Owner: ${owner}`);
    console.log(`   ✅ Router: ${router}`);
    console.log(`   ${owner.toLowerCase() === signerAddress.toLowerCase() ? "✅ Eres el owner" : "❌ NO eres el owner"}\n`);
  } catch (error) {
    console.log(`   ❌ Error leyendo contrato: ${error.message}\n`);
  }

  // 2. Probar requestPayment (no requiere ser owner, solo emite evento)
  console.log("2️⃣ Probando requestPayment...");
  try {
    // Usar una dirección de prueba como payee (dirección válida)
    // Usando una dirección conocida válida (Trader Joe Router como ejemplo)
    const testPayee = "0x60aE616a2155Ee3d9A68541Ba4544862310933d4"; // Dirección válida de ejemplo
    const testAmount = ethers.parseEther("1.0"); // 1 token (asumiendo 18 decimals)
    const testToken = ethers.getAddress("0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"); // USDC en Avalanche (6 decimals)
    
    console.log(`   📤 Enviando requestPayment...`);
    console.log(`      Payee: ${testPayee}`);
    console.log(`      Amount: ${ethers.formatEther(testAmount)} tokens`);
    console.log(`      Token: ${testToken}`);
    
    const tx = await treasury.requestPayment(testPayee, testAmount, testToken);
    console.log(`   ⏳ Transacción enviada: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ Transacción confirmada en bloque: ${receipt.blockNumber}`);
    console.log(`   💸 Gas usado: ${receipt.gasUsed.toString()}\n`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // 3. Probar getTokenBalance (función view, no requiere transacción)
  console.log("3️⃣ Probando getTokenBalance...");
  try {
    const usdcAddress = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"; // USDC en Avalanche
    const balance = await treasury.getTokenBalance(usdcAddress);
    console.log(`   ✅ Balance de USDC en treasury: ${balance.toString()} (raw)`);
    console.log(`   💰 Balance formateado: ${ethers.formatUnits(balance, 6)} USDC\n`); // USDC tiene 6 decimals
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  // 4. Probar authorizeSwap (solo owner puede hacerlo)
  console.log("4️⃣ Probando authorizeSwap (solo owner)...");
  try {
    const fromToken = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"; // USDC
    const toToken = "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7"; // USDT en Avalanche
    const maxAmount = ethers.parseUnits("1000", 6); // 1000 USDC (6 decimals)
    
    console.log(`   📤 Autorizando swap...`);
    console.log(`      From: ${fromToken} (USDC)`);
    console.log(`      To: ${toToken} (USDT)`);
    console.log(`      Max Amount: ${ethers.formatUnits(maxAmount, 6)} USDC`);
    
    const tx = await treasury.authorizeSwap(fromToken, toToken, maxAmount);
    console.log(`   ⏳ Transacción enviada: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ Swap autorizado en bloque: ${receipt.blockNumber}`);
    console.log(`   💸 Gas usado: ${receipt.gasUsed.toString()}`);
    
    // Verificar que se guardó correctamente
    const allowance = await treasury.swapAllowances(fromToken, toToken);
    console.log(`   ✅ Allowance guardada: ${ethers.formatUnits(allowance, 6)} USDC\n`);
  } catch (error) {
    if (error.message.includes("Not owner")) {
      console.log(`   ⚠️  No eres el owner, esta función requiere permisos de owner\n`);
    } else {
      console.log(`   ❌ Error: ${error.message}\n`);
    }
  }

  // 5. Verificar swapAllowances
  console.log("5️⃣ Verificando swapAllowances...");
  try {
    const fromToken = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"; // USDC
    const toToken = "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7"; // USDT
    const allowance = await treasury.swapAllowances(fromToken, toToken);
    console.log(`   ✅ Allowance USDC -> USDT: ${ethers.formatUnits(allowance, 6)} USDC\n`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }

  console.log("✨ Pruebas completadas!");
  console.log(`\n🔍 Ver transacciones en Snowtrace:`);
  console.log(`   https://snowtrace.io/address/${TREASURY_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

