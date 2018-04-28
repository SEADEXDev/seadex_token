const SEADToken = artifacts.require('./SEADToken.sol');
const SEADSale = artifacts.require('./SEADSale.sol');

// ===============================================================
//
//       TEST ONLY VALUE : Must change before real deploy
//
// ==============================================================
// // Deploy PreSale
module.exports = function(deployer, network, accounts) {
  console.log('2. Setup sale contract limitation ==============================');
  
  const openingTime = new Date().getTime() / 1000 | 0; // Now
  const startInvestorSaleTime = openingTime;
  const startPrivateSaleTime = 1521511200; // March 20, 2018 9:00:00 AM GMT+07:00
  const startPublicSaleTime1 = 1525053600; // April 30, 2018 9:00:00 AM GMT+07:00
  const startPublicSaleTime2 = 1525485600; // May 5, 2018 9:00:00 AM GMT+07:00
  const startPublicSaleTime3 = 1525917600; // May 10, 2018 9:00:00 AM GMT+07:00  

  // Wallet setting ============================================
  // admin wallet to deploy contract and control all contract
  const adminWallet = accounts[0]; // '0x627306090abaB3A6e1400e9345bC60c78a8BEf57';
  
  // Exchange Rate
  const rate_sead_to_gwei_private        = 588000;
  const rate_sead_to_gwei_public_round_1 = 788000;
  const rate_sead_to_gwei_public_round_2 = 824000;
  const rate_sead_to_gwei_public_round_3 = 859000;

  const founderVaultPeriod = [
    openingTime, // release 20 % when sale start, 1521079200 March 15, 2018 9:00:00 AM GMT+07:00
    1552615200, // March 15, 2019 9:00:00 AM GMT+07:00
    1584237600, // March 15, 2020 9:00:00 AM GMT+07:00
    1615773600, // March 15, 2021 9:00:00 AM GMT+07:00
    1647309600 // March 15, 2022 9:00:00 AM GMT+07:00
  ];
  const founderVaultRatio = [20, 40, 60, 80, 100];
  
  const investorVaultPeriod = [
    1536976800 // September 15, 2018 9:00:00 AM GMT+07:00
  ];
  const investorVaultRatio = [100];

  const privateVaultPeriod = [
    1536976800 // September 15, 2018 9:00:00 AM GMT+07:00
  ];
  const privateVaultRatio = [100];

  let token_instance;
  let sale_instance;

  deployer.then(function() {
    return SEADToken.deployed();
  }).then(function(tinstance) {
    token_instance = tinstance;
    return SEADSale.deployed();
  }).then(function(sinstance) {
    sale_instance = sinstance;

    return token_instance.balanceOf(adminWallet);
  }).then(function(balance) {
    console.log('- admin balance : ' + web3.fromWei(balance));
    console.log('- Transfer all balance to sale wallet');
    // Transfer all token to sale contract
    return token_instance.transfer(sale_instance.address, balance);
  }).then(function() {
    console.log('- initail schedule');
    return sale_instance.initialDate(
      startPrivateSaleTime,
      startPublicSaleTime1,
      startPublicSaleTime2,
      startPublicSaleTime3
    );
  }).then(function() {
    // Transfer sale manager to sale contract
    console.log('- Set token transfer in sale period to sale contract');
    return token_instance.setupSaleContract(sale_instance.address);
  }).then(function() {
    console.log('- initail vault');
    console.log('-- founder ' + founderVaultPeriod + ' : ' + founderVaultRatio);
    console.log('-- investor ' + investorVaultPeriod + ' : ' + investorVaultRatio);
    console.log('-- private ' + privateVaultPeriod + ' : ' + privateVaultRatio);
    return sale_instance.initialVault(
      founderVaultPeriod, founderVaultRatio,
      investorVaultPeriod, investorVaultRatio,
      privateVaultPeriod, privateVaultRatio
    );
  }).then(function() {
    console.log('- initail sale');
    return sale_instance.initialSale();
  }).then(function() {
    return token_instance.balanceOf(sale_instance.address);
  }).then(function(balance) {
    console.log('- sale contract balance : ' + web3.fromWei(balance));

    console.log(' - set token exchange rate');
    return sale_instance.setTokenToGWeiRate(
      rate_sead_to_gwei_private,
      rate_sead_to_gwei_public_round_1,
      rate_sead_to_gwei_public_round_2,
      rate_sead_to_gwei_public_round_3
    );
  }).then(function() {
    console.log(' --- SEAD to GWei');
    console.log(' --- private : ' + rate_sead_to_gwei_private);
    console.log(' --- public1 : ' + rate_sead_to_gwei_public_round_1);
    console.log(' --- public2 : ' + rate_sead_to_gwei_public_round_2);
    console.log(' --- public3 : ' + rate_sead_to_gwei_public_round_3);
  });
};
