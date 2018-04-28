var SEADToken = artifacts.require('./SEADToken.sol');
var SEADSale = artifacts.require('./SEADSale.sol');
var VaultVesting = artifacts.require('./utils/VaultVesting.sol');

// ===============================================================
//
//       TEST ONLY VALUE : Must change before real deploy
//
// ==============================================================
// // Deploy PreSale
module.exports = function(deployer, network, accounts) {
  console.log('3. Distribute token for founder and deposit to vault ==============================');

  // Token distribute =========================================
  const million = 1000000;
  const founderAddress = [
    accounts[3], // '0x821aEa9a577a9b44299B9c15c88cf3087F3b5544',
    accounts[4], // '0x0d1d4e623D10F9FBA5Db95830F7d3839406C6AF2',
    accounts[5], // '0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e'
  ];
  const founderSplit = [
    web3.toWei(20 * million, 'ether'),
    web3.toWei(20 * million, 'ether'),
    web3.toWei(10 * million, 'ether')
  ];

  let token_instance;
  let sale_instance;
  let founderVault;

  deployer.then(function() {
    return SEADToken.deployed();
  }).then(function(tinstance) {
    token_instance = tinstance;
    return SEADSale.deployed();
  }).then(function(sinstance) {
    sale_instance = sinstance;
    return sale_instance.founderVault.call();
  }).then(function(_value) {
    return VaultVesting.at(_value);
  }).then(function(_value) {
    founderVault = _value;
    console.log('--- Deposit money for founder ');
    console.log('--- vault ' + founderVault.address);
    return founderVault.getVaultLimit();
  }).then(function(_value) {
    console.log('--- limit ' + web3.fromWei(_value));
  }).then(function() {
    // Distribute for founder ===============================================
    // Founder will be distribute in this phase only
    console.log('--- deposit token');
    return sale_instance.founderDepositMany(founderAddress, founderSplit);
  }).then(function() {
    return token_instance.balanceOf(founderVault.address);
  }).then(function(_value) {
    console.log('--- vault balance ' + web3.fromWei(_value));
  });
};
