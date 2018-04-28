import { duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';

const SEADToken = artifacts.require('./SEADToken.sol');
const SEADSale = artifacts.require('./SEADSale.sol');
// const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

contract('102_module_seadsale.js', function(accounts) {
  let token;
  // let token_name = 'SEA DAX Token';
  let token_symbol = 'SEAD';
  let token_decimals = 18;
  let unit = 10 ** token_decimals;

  let sale_contract;

  let start_time = latestTime();
  let end_time = start_time + duration.years(1);

  // list of accounts
  let account_admin = accounts[0];
  let account_fund = accounts[1];
  let account_reserve = accounts[2];

  beforeEach(async function () {
    token = await SEADToken.deployed();
    sale_contract = await SEADSale.deployed();
  });

  // totalSupply()
  it('should have total supply of 200 M SEAD', async function() {
    let totalSupply = await token.totalSupply();
    assert(totalSupply.eq(200000000 * unit), totalSupply.toString() + ' total supply is available');
  });

  // balanceOf(address tokenOwner)
  it('should assign 120M to the sale account, out of which 50M for founder, ' +
      '50M for private sale, and 20M for angel investors', async function () {
    let balance = await token.balanceOf(sale_contract.address);
    assert(balance.eq(120000000 * unit), balance.toString() + ' ' + token_symbol + ' is in reserve account');
  });

  // balanceOf(address tokenOwner)
  it('should assign 30M to the reserve account', async function () {
    let balance = await token.balanceOf(account_reserve);
    assert(balance.eq(30000000 * unit), (balance / unit).toString() + ' ' + token_symbol + ' is in reserve account');
  });
});
