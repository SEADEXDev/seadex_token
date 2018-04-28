const SEADToken = artifacts.require('./SEADToken.sol');
const SEADSale = artifacts.require('./SEADSale.sol');

// ===============================================================
//
//       TEST ONLY VALUE : Must change before real deploy
//
// ==============================================================
// // Deploy PreSale
module.exports = function(deployer, network, accounts) {
  console.log('1. Deploy token and sale contract ==============================');

  // Overall sale period =======================================
  // const openingTime = new Date('Sun, 10 Dec 2017 06:00:00 GMT').getUnixTime();
  // const closingTime = new Date('Sun, 10 Dec 2017 06:00:00 GMT').getUnixTime();
  const openingTime = new Date().getTime() / 1000 | 0; // Now
  const closingTime = 1526349600; // May 15, 2018 9:00:00 AM GMT+07:00

  // Initial exchange rate =====================================
  // RecievedToken = Rate*Wei
  const rate = new web3.BigNumber(1);

  // Wallet setting ============================================
  // admin wallet to deploy contract and control all contract
  // const adminWallet = accounts[0]; // '0x627306090abaB3A6e1400e9345bC60c78a8BEf57';
  // All ethereum will go here
  const fundWallet = accounts[1]; // '0xf17f52151EbEF6C7334FAD080c5704D77216b732';
  // Reserve wallet will hold reserve token and remaining token after sale
  const reserveWallet = accounts[2]; // '0xC5fdf4076b8F3A5357c5E395ab970B5B54098Fef';

  // Token distribute =========================================
  const million = 1000000;
  const totalSupply = web3.toWei(200 * million, 'ether');

  deployer.deploy(
    SEADToken, totalSupply, openingTime, closingTime
  ).then(function() {
    return deployer.deploy(SEADSale,
      rate,
      fundWallet,
      SEADToken.address,
      openingTime,
      closingTime,

      reserveWallet
    );
  }).then(function() {
    console.log('SEAD Token : ' + SEADToken.address);
    console.log('SEAD openingTime : ' + openingTime);
    console.log('SEAD closingTime : ' + closingTime);
    console.log('SEAD Sale : ' + SEADSale.address);
  });
};
