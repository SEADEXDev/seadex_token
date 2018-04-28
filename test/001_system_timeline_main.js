import { increaseTimeTo, duration } from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import assertRevert from './helpers/assertRevert';

const SEADToken = artifacts.require('../contracts/SEADToken.sol');
const SEADSale = artifacts.require('../contracts/SEADSale.sol');
const VaultVesting = artifacts.require('../utils/VaultVesting.sol');
const BuyerWhitelist = artifacts.require('../utils/BuyerWhitelist.sol');

const BigNumber = web3.BigNumber;

contract('001_systemTesting_timeline_main.js', function (accounts) {
  // const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

  const token_decimals = 18;
  const unit = new BigNumber(10 ** token_decimals);
  const million = new BigNumber(1000000);
  const toUnit = (amount) => amount.div(unit);

  const supply_total = new BigNumber(200 * million * unit);
  const supply_reserve = new BigNumber(30 * million * unit);
  const supply_founder = new BigNumber(50 * million * unit);
  const supply_investor = new BigNumber(20 * million * unit);
  const supply_private = new BigNumber(50 * million * unit);
  const supply_public = new BigNumber(50 * million * unit); // all rounds
  const supply_public_round_1 = new BigNumber(10 * million * unit); // round 1
  const supply_public_round_2 = new BigNumber(15 * million * unit); // round 2
  const supply_public_round_3 = new BigNumber(25 * million * unit); // round 3
  const supply_remain = supply_total.sub(supply_reserve).sub(supply_founder);

  const account_admin    = accounts[0];
  const account_fund     = accounts[1]; // ETH account
  const account_reserve  = accounts[2];
  const account_private  = accounts[6]; // Private sale investor
  const account_public_1 = accounts[7]; // Public sale investor 1, retail
  const account_public_2 = accounts[8]; // Public sale investor 2, super-rich
  const account_investor = accounts[9]; // Angel investor

  const founder_address = [
    accounts[3], // '0x821aEa9a577a9b44299B9c15c88cf3087F3b5544',
    accounts[4], // '0x0d1d4e623D10F9FBA5Db95830F7d3839406C6AF2',
    accounts[5], // '0x2932b7A2355D6fecc4b5c0B6BD44cC31df247a2e'
  ];
  const founder_split = [
    new BigNumber(20 * million * unit),
    new BigNumber(20 * million * unit),
    new BigNumber(10 * million * unit)
  ];

  // Timeline
  const time_contract_init       = latestTime();

  const time_investor_sale_start = time_contract_init;
  const time_private_sale_start  = 1521511200;

  const time_public_sale_1_start = 1525053600; // April 30, 2018 9:00:00 AM GMT+07:00
  const time_public_sale_1_end   = 1525485600; // May 5, 2018 9:00:00 AM GMT+07:00
  const time_public_sale_2_start = 1525485600; // May 5, 2018 9:00:00 AM GMT+07:00
  const time_public_sale_2_end   = 1525917600; // May 10, 2018 9:00:00 AM GMT+07:00
  const time_public_sale_3_start = 1525917600; // May 10, 2018 9:00:00 AM GMT+07:00
  const time_public_sale_3_end   = 1526349600; // May 15, 2018 9:00:00 AM GMT+07:00

  // TODO: clarify if transferrable time should be later than public sale 3 end
  const time_transferrable       = 1526349600; // May 15, 2018 9:00:00 AM GMT+07:00
  const time_lock_up_6_months    = 1536976800; // Sept 15, 2018 9:00:00 AM GMT+07:00

  const time_founder_1_year      = 1552615200; // March 15, 2019 9:00:00 AM GMT+07:00
  const time_founder_2_year      = 1584237600; // March 15, 2020 9:00:00 AM GMT+07:00
  const time_founder_3_year      = 1615773600; // March 15, 2021 9:00:00 AM GMT+07:00
  const time_founder_4_year      = 1647309600; // March 15, 2022 9:00:00 AM GMT+07:00

  // const endTime = 1526349600; // May 15, 2018 9:00:00 AM GMT+07:00

  // Exchange Rate
  /* For Reference
  const eth_per_usd = new BigNumber(850);
  const rate_usd_to_sead_private  = 0.50;
  const rate_usd_to_sead_public_1 = 0.67;
  const rate_usd_to_sead_public_2 = 0.70;
  const rate_usd_to_sead_public_3 = 0.73;
  */
  const rate_sead_to_eth_private        = 0.000588;
  const rate_sead_to_eth_public_round_1 = 0.000788;
  const rate_sead_to_eth_public_round_2 = 0.000824;
  const rate_sead_to_eth_public_round_3 = 0.000859;
  const rate_eth_to_sead_private        = new BigNumber(1).div(rate_sead_to_eth_private);
  const rate_eth_to_sead_public_round_1 = new BigNumber(1).div(rate_sead_to_eth_public_round_1);
  const rate_eth_to_sead_public_round_2 = new BigNumber(1).div(rate_sead_to_eth_public_round_2);
  const rate_eth_to_sead_public_round_3 = new BigNumber(1).div(rate_sead_to_eth_public_round_3);

  // Other parameters
  const minimum_purchase_eth = web3.toWei(0.01, 'ether');
  const below_minimum_purchase_eth = web3.toWei(0.00999999, 'ether');

  // Truffle Clean-Room Hook
  beforeEach(async function () {
    this.token = await SEADToken.deployed();
    this.sale = await SEADSale.deployed();

    this.startTime = latestTime();
    this.founderVault = await VaultVesting.at(await this.sale.founderVault.call());
    this.investorVault = await VaultVesting.at(await this.sale.investorVault.call());
    this.privateSaleVault = await VaultVesting.at(await this.sale.privateSaleVault.call());

    this.publicWhitelist = await BuyerWhitelist.at(await this.sale.publicWhitelist.call());
    this.privateWhitelist = await BuyerWhitelist.at(await this.sale.privateWhitelist.call());
  });

  // Begin Test Cases
  describe('At Contract Initialization: time_contract_init', function () {
    it('total supply should be ' + Math.round(supply_total / (million * unit)) + ' M', async function () {
      const totalSupply = await this.token.totalSupply();
      assert.equal(totalSupply.toString(), supply_total.toString());
    });

    it('should create founderVault and set max deposit to ' +
        Math.round(supply_founder / (million * unit)) + ' M', async function () {
      const vaultAddress = await this.sale.founderVault.call();
      assert.notEqual(vaultAddress, '0x0000000000000000000000000000000000000000');
      const vaultInstance = await VaultVesting.at(vaultAddress);
      const totalVaultLimit = await vaultInstance.getVaultLimit();
      assert.equal(totalVaultLimit.toString(), supply_founder.toString(), 'founder vault accept over supply');
    });

    it('should create investorVault and set max deposit to ' +
        Math.round(supply_investor / (million * unit)) + ' M', async function () {
      const vaultAddress = await this.sale.investorVault.call();
      assert.notEqual(vaultAddress, '0x0000000000000000000000000000000000000000');
      const vaultInstance = await VaultVesting.at(vaultAddress);
      const totalVaultLimit = await vaultInstance.getVaultLimit();
      assert.equal(totalVaultLimit.toString(), supply_investor.toString(), 'investor vault accept over supply');
    });

    it('should create privateSaleVault and set max deposit to ' +
        Math.round(supply_private / (million * unit)) + ' M', async function () {
      const vaultAddress = await this.sale.privateSaleVault.call();
      assert.notEqual(vaultAddress, '0x0000000000000000000000000000000000000000');
      const vaultInstance = await VaultVesting.at(vaultAddress);
      const totalVaultLimit = await vaultInstance.getVaultLimit();
      assert.equal(totalVaultLimit.toString(), supply_private.toString(), 'private vault accept over supply');
    });

    it('should put ' + Math.round(supply_founder / (million * unit)) +
        ' M SEADToken to founderVault', async function () {
      const vaultAddress = await this.sale.founderVault.call();
      const vaultInstance = await VaultVesting.at(vaultAddress);

      const totalVaultDeposit = await vaultInstance.getTotalDeposit();
      assert.equal(totalVaultDeposit.toString(), supply_private.toString(), 'private vault accept over supply');
    });

    it('should have correct balance in vault for each founder address', async function () {
      const vaultAddress = await this.sale.founderVault.call();
      const vaultInstance = await VaultVesting.at(vaultAddress);

      for (let i = 0; i < founder_address.length; i++) {
        let locked_balance = await vaultInstance.getCurrentDeposit(founder_address[i]);
        assert.equal(locked_balance.toString(), founder_split[i].toString(),
          'Token deposit to vault not match expected value');
      }
    });

    it('should put ' + Math.round(supply_reserve / (million * unit)) +
        ' M SEADToken to reserve account', async function () {
      const balance = await this.token.balanceOf(account_reserve);
      assert.equal(balance.toString(), supply_reserve.toString(),
        Math.round(supply_reserve / (million * unit)) + ' M wasn\'t in the first account');
    });

    it('should have remaining token ' +
        Math.round(supply_remain / (million * unit)) +
        ' M SEADToken for sale', async function () {
      const balance = await this.token.balanceOf(this.sale.address);
      assert.equal(balance.toString(), supply_remain.toString(),
        Math.round(supply_remain / (million * unit)) + ' M wasn\'t in the first account');
    });
  });

  describe('Before Public-Sale Period: time_investor_sale_start, time_private_sale_start', function () {
    it('time travel to 1 minute after angel investor sale starts', async function () {
      await increaseTimeTo(time_investor_sale_start + duration.minutes(1));
    });

    // Founder
    it('should allow 20% founder tokens to be released', async function () {
      for (let i = 0; i < founder_address.length; i++) {
        const amount_releasable = await this.founderVault.releasableAmount(founder_address[i]);
        const actual_releasable = founder_split[i].times(2).div(10);
        assert(
          amount_releasable.eq(actual_releasable),
          amount_releasable.toString() + ' not equal ' + actual_releasable.toString() + ' is releasable from address ' +
            founder_address[i].toString() + ' at ' + latestTime());
      }
    });

    // Angel Investor
    it('should allow 100K tokens off-chain purchase for angel investors', async function () {
      const account_sender = account_admin;
      const balance_receiver_before = await this.token.balanceOf(account_investor);
      const amount_sale = (new BigNumber(100000)).times(unit);

      // Deposit with vault contract
      // await this.investorVault.deposit(account_receiver, amount_sale)

      // TODO: Update this part
      const investor_addresses = [ account_investor ];
      const investor_deposit_amounts = [ amount_sale ];
      this.sale.investorDepositMany(investor_addresses, investor_deposit_amounts);

      const amount_deposited = await this.investorVault.getCurrentDeposit(account_investor);

      assert(
        amount_deposited.eq(amount_sale.toString()),
        amount_deposited.toString() + ' is in investor vault');
    });

    it('should allow 0% of angle investor tokens to be released', async function () {
      const expected_releasable = 0;

      const amount_releasable = await this.investorVault.releasableAmount(account_investor);
      assert.equal(expected_releasable.toString(), amount_releasable.toString(), '');
    });

    // Private Sale
    it('time travel to 1 minute after private sale starts', async function () {
      await increaseTimeTo(time_private_sale_start + duration.minutes(1));
    });

    it('should NOT allow private sale of non-listed account', async function () {
      const buy_value = web3.toWei(0.5, 'ether');
      await assertRevert(this.sale.buyTokens(account_private, { from: account_private, value: buy_value }));
    });

    it('should allow private sale whitelisting', async function () {
      await this.sale.addToPrivateWhitelist(account_private);
      const whiteistCheck = await this.privateWhitelist.isWhitelisted(account_private);
      assert.isOk(whiteistCheck);
    });

    it('should NOT allow below minimum purchase', async function () {
      const buy_value = below_minimum_purchase_eth;

      await assertRevert(this.sale.buyTokens(account_private, { from: account_private, value: buy_value }));
    });

    it('should allow purchase of 0.5 ETH for private sale by buyTokens function', async function () {
      const buy_value = web3.toWei(0.5, 'ether');
      await this.sale.buyTokens(account_private, { from: account_private, value: buy_value });
    });

    it('should allow purchase of 0.5 ETH for private sale by Transfer ether', async function () {
      const buy_value = web3.toWei(0.5, 'ether');
      await web3.eth.sendTransaction({ from: account_private, to: this.sale.address, value: buy_value, gas: 1000000 });
    });

    it('should have 60% of token in private sale account', async function () {
      const buy_value = web3.toWei(1, 'ether');
      const expected_token = rate_eth_to_sead_private.times(buy_value).times(6).div(10);

      // const amount_releasable = await this.privateSaleVault.releasableAmount(account_private);
      // assert.equal(expected_releasable.toString(), amount_releasable.toString(), '');
      const balance = await this.token.balanceOf(account_private);
      assert.equal(parseFloat(expected_token), parseFloat(balance));
    });

    it('should have weiRaised equal to 1 ETH', async function () {
      const buy_value = web3.toWei(1, 'ether');

      const amount_raised = await this.sale.weiRaised();
      assert.equal(buy_value.toString(), amount_raised.toString(), '');
    });

    it('should allow purchase to maximum amount for private sale', async function () {
      const balance_before = await this.token.balanceOf(account_private);

      const max_token = supply_private;
      const buy_value = (max_token.times(rate_sead_to_eth_private)).sub(web3.toWei(1, 'ether'));
      await this.sale.buyTokens(account_private, { from: account_private, value: buy_value });

      const expected_token_balance = rate_eth_to_sead_private.times(buy_value).times(6).div(10);
      const balance_after = await this.token.balanceOf(account_private);
      assert.equal(parseFloat(balance_after.sub(balance_before)), parseFloat(expected_token_balance));
    });

    it('should NOT allow any private sale investor to buy token more than maximum', async function () {
      const buy_value = web3.toWei(1, 'ether');

      await assertRevert(this.sale.buyTokens(account_private, { from: account_private, value: buy_value }));
    });

  });

  describe('Public-Sale Round 1: time_public_sale_1_start', function () {
    it('time travel to 1 minute before round 1 starts', async function () {
      await increaseTimeTo(time_public_sale_1_start - duration.minutes(1));
    });

    it('should NOT be able to buy token before round 1 starts', async function () {
      const buy_value = web3.toWei(1, 'ether');
      await assertRevert(this.sale.buyTokens(account_public_1, { from: account_public_1, value: buy_value }));

      const balance = await this.token.balanceOf(account_public_1);
      assert.equal(balance.toString(), '0', 'Early purchasing should NOT be allowed');
    });

    it('time travel to 1 second after round 1 starts', async function () {
      await increaseTimeTo(time_public_sale_1_start + duration.seconds(1));
    });

    it('should NOT allow public sale of non-listed account', async function () {
      const buy_value = web3.toWei(1, 'ether');
      await assertRevert(this.sale.buyTokens(account_public_1, { from: account_public_1, value: buy_value }));
      await assertRevert(this.sale.buyTokens(account_public_2, { from: account_public_2, value: buy_value }));
    });

    it('should allow public sale whitelisting', async function () {
      await this.sale.addToPublicWhitelist(account_public_1);
      const whiteistCheck1 = await this.publicWhitelist.isWhitelisted(account_public_1);
      assert.isOk(whiteistCheck1);

      await this.sale.addToPublicWhitelist(account_public_2);
      const whiteistCheck2 = await this.publicWhitelist.isWhitelisted(account_public_2);
      assert.isOk(whiteistCheck2);
    });

    it('should allow public sale investor 1 to buy 1 ETH worth of token,' +
        'and get token in balance immediately', async function () {
      const buy_value = web3.toWei(1, 'ether'); // 1 ether
      const balance_before = await this.token.balanceOf(account_public_1);
      await this.sale.buyTokens(account_public_1, { from: account_public_1, value: buy_value });

      const token_balance = rate_eth_to_sead_public_round_1.times(buy_value);
      const balance_after = await this.token.balanceOf(account_public_1);
      assert.equal(parseFloat(balance_after.sub(balance_before)), parseFloat(token_balance));
    });

    it('should NOT allow below minimum purchase', async function () {
      const buy_value = below_minimum_purchase_eth;

      await assertRevert(this.sale.buyTokens(account_public_1, { from: account_public_1, value: buy_value }));
    });

    it('should allow public sale investor 2 to buy maximum amount, less 1 ETH from previous buy', async function () {
      const balance_before = await this.token.balanceOf(account_public_2);

      const max_token = supply_public_round_1;
      const buy_value = max_token.times(rate_sead_to_eth_public_round_1).sub(web3.toWei(1, 'ether'));
      await this.sale.buyTokens(account_public_2, { from: account_public_2, value: buy_value });

      const expected_token_balance = rate_eth_to_sead_public_round_1.times(buy_value);
      const balance_after = await this.token.balanceOf(account_public_2);
      assert.equal(parseFloat(balance_after.sub(balance_before)), parseFloat(expected_token_balance));
    });

    it('should NOT allow any public sale investor to buy more than maximum amount', async function () {
      const buy_value = web3.toWei(1, 'ether');

      await assertRevert(this.sale.buyTokens(account_public_1, { from: account_public_1, value: buy_value }));

      await assertRevert(this.sale.buyTokens(account_public_2, { from: account_public_2, value: buy_value }));
    });

    it('should NOT allow any public sale investor to buy 0 ETH worth of token', async function () {
      const buy_value = web3.toWei(0, 'ether'); // 1 ether

      await assertRevert(this.sale.buyTokens(account_public_1, { from: account_public_1, value: buy_value }));

      await assertRevert(this.sale.buyTokens(account_public_2, { from: account_public_2, value: buy_value }));
    });
  });

  describe('Public-Sale Round 2: time_public_sale_2_start', function () {
    it('time travel to 1 second after round 2 starts', async function () {
      await increaseTimeTo(time_public_sale_2_start + duration.seconds(1));
    });

    // Assumption: Round 1 is sold out
    it('should allow public sale investor 2 to buy maximum amount, minus 1 ETH worth', async function () {
      // Buy all tokens but 1 ETH-worth in Round 2
      const max_token_2 = supply_public_round_2;
      const buy_value = max_token_2.times(rate_sead_to_eth_public_round_2).sub(web3.toWei(1, 'ether'));
      const balance_before = await this.token.balanceOf(account_public_2);
      await this.sale.buyTokens(account_public_2, { from: account_public_2, value: buy_value });

      const token_balance = rate_eth_to_sead_public_round_2.times(buy_value);
      const balance_after = await this.token.balanceOf(account_public_2);
      assert.equal(parseFloat(balance_after.sub(balance_before)), parseFloat(token_balance));
    });

    it('should NOT allow any public sale investor to buy more than 1 ETH worth of tokens', async function () {
      const buy_value = web3.toWei(2, 'ether');

      await assertRevert(this.sale.buyTokens(account_public_1, { from: account_public_1, value: buy_value }));

      await assertRevert(this.sale.buyTokens(account_public_2, { from: account_public_2, value: buy_value }));
    });

    it('should NOT allow tokens transfer between accounts', async function () {
      let amount_transfer = 1 * unit;
      let account_sender = account_public_2;
      let account_receiver = account_public_1;
      await assertRevert(this.token.transfer(account_receiver, amount_transfer,  { from: account_sender }));
    });

  });

  describe('Public-Sale Round 3: time_public_sale_3_start', function () {
    it('time travel to 1 second after round 3 starts', async function () {
      await increaseTimeTo(time_public_sale_3_start + duration.seconds(1));
    });

    // Assumption: Round 2 has 1ETH worth of tokens left
    it('should allow public sale investor 2 to buy round 3 maximum amount', async function () {
      const max_token_3 = supply_public_round_3;
      const buy_value = max_token_3.times(rate_sead_to_eth_public_round_3);
      const balance_before = await this.token.balanceOf(account_public_2);
      await this.sale.buyTokens(account_public_2, { from: account_public_2, value: buy_value });

      const token_balance = rate_eth_to_sead_public_round_3.times(buy_value);
      const balance_after = await this.token.balanceOf(account_public_2);
      assert.equal(parseFloat(balance_after.sub(balance_before)), parseFloat(token_balance));
    });

    it('should allow public sale investor 1 to buy 0.9 ETH worth of tokens carried' +
        ' from round 2 with round 3 rate', async function () {
      const buy_value = web3.toWei(0.9, 'ether');
      const balance_before = await this.token.balanceOf(account_public_1);
      await this.sale.buyTokens(account_public_1, { from: account_public_1, value: buy_value });

      const token_balance = rate_eth_to_sead_public_round_3.times(buy_value);
      const balance_after = await this.token.balanceOf(account_public_1);
      assert.equal(parseFloat(balance_after.sub(balance_before)), parseFloat(token_balance));
    });

    it('should NOT allow any public sale investor to buy more token than maximum', async function () {
      const buy_value = web3.toWei(1, 'ether');

      await assertRevert(this.sale.buyTokens(account_public_1, { from: account_public_1, value: buy_value }));

      await assertRevert(this.sale.buyTokens(account_public_2, { from: account_public_2, value: buy_value }));
    });
  });

  describe('After Last Round of Public Sale: time_public_sale_3_end', async function () {
    it('time travel to 1 second after round 3 ends', async function () {
      await increaseTimeTo(time_public_sale_3_end + duration.seconds(1));
    });

    // There should be 0.1 ETH worth of tokens left at this point
    it('should NOT allow public sale after public sale phase ends', async function () {
      const buy_value = web3.toWei(0.01, 'ether');
      await assertRevert(this.sale.buyTokens(account_public_1, { from: account_public_1, value: buy_value }));
    });
  });

  describe('After transferrable: time_transferrable', async function () {
    // Test transferrable between accounts
    it('time travel to 1 minute after transferrable', async function () {
      await increaseTimeTo(time_transferrable + duration.minutes(1));
    });

    it('should allow transfer of 1 token between accounts', async function () {
      let amount_transfer = 1 * unit;
      let account_sender = account_public_2;
      let account_receiver = account_public_1;
      await this.token.transfer(account_receiver, amount_transfer,  { from: account_sender });
    });

  });

  describe('Just before 6 months after start', async function () {
    it('time travel to 1 minute before 6 months', async function () {
      await increaseTimeTo(time_lock_up_6_months - duration.minutes(1));
    });

    it('should allow 0% tokens for angel investor', async function () {
      const amount_releasable_before_6_months = await this.investorVault.releasableAmount(account_investor)
      assert(
        amount_releasable_before_6_months.eq('0'),
        amount_releasable_before_6_months.toString() + ' is releasable before 6 months');
    });
  });

  describe('After 6 months from start', async function () {
    it('time travel to 1 second after 6 months', async function () {
      await increaseTimeTo(time_lock_up_6_months + duration.seconds(1));
    });

    it('should allow 100K of angel investor tokens to be released', async function () {
      const expected_releasable = 100000 * unit;

      const amount_releasable = await this.investorVault.releasableAmount(account_investor)
      assert.equal(expected_releasable.toString(), amount_releasable.toString(), '');
    });

    it('should allow admin to release tokens for angel investors to the maximum releasable amount', async function () {
      const amount_releasable = await this.investorVault.releasableAmount(account_investor)
      await this.investorVault.releaseFor(account_investor, { from: account_admin })

      const balance_after = await this.token.balanceOf(account_investor);
      assert.equal(amount_releasable.toString(), balance_after.toString(), '');
    });

    // Assuming private sale is sold out
    it('should have 40% of private sale investor tokens to be released (60% has already been released)', async function () {
      const expected_releasable = supply_private.times(4).div(10);

      const amount_releasable = await this.privateSaleVault.releasableAmount(account_private)
      assert.equal(parseFloat(expected_releasable), parseFloat(amount_releasable));
    });

    it('should allow private sale investors to release tokens by themselves to the maximum releasable amount', async function () {
      const balance_before = await this.token.balanceOf(account_private);

      const amount_releasable = await this.privateSaleVault.releasableAmount(account_private)
      await this.privateSaleVault.release({ from: account_private })

      const balance_after = await this.token.balanceOf(account_private);
      assert.equal(parseFloat(balance_after.sub(balance_before)), parseFloat(amount_releasable));
    });
  });

  describe('After 1 year from start', async function () {
    it('time travel to 1 second after 1 year', async function () {
      await increaseTimeTo(time_founder_1_year + duration.seconds(1));
    });

    it('should allow 40% of founder tokens to be released', async function () {
      for (let i = 0; i < founder_address.length; i++) {
        let amount_releasable = await this.founderVault.releasableAmount(founder_address[i]);
        assert(
          amount_releasable.eq(founder_split[i].times(4).div(10)),
          amount_releasable.toString() + ' is releasable from address ' +
            founder_address[i].toString() + ' at ' + latestTime());
      }
    });
  });

  describe('After 2 years from start', async function () {
    it('time travel to 1 second after 2 years', async function () {
      await increaseTimeTo(time_founder_2_year + duration.seconds(1));
    });

    it('should allow 60% of founder tokens to be released', async function () {
      for (let i = 0; i < founder_address.length; i++) {
        let amount_releasable = await this.founderVault.releasableAmount(founder_address[i]);
        assert(
          amount_releasable.eq(founder_split[i].times(6).div(10)),
          amount_releasable.toString() + ' is releasable from address ' +
            founder_address[i].toString() + ' at ' + latestTime());
      }
    });
  });

  describe('After 3 years from start', async function () {
    it('time travel to 1 second after 3 years', async function () {
      await increaseTimeTo(time_founder_3_year + duration.seconds(1));
    });

    it('should allow 80% of founder tokens to be released', async function () {
      for (let i = 0; i < founder_address.length; i++) {
        let amount_releasable = await this.founderVault.releasableAmount(founder_address[i]);
        assert(
          amount_releasable.eq(founder_split[i].times(8).div(10)),
          amount_releasable.toString() + ' is releasable from address ' +
            founder_address[i].toString() + ' at ' + latestTime());
      }
    });
  });

  describe('After 4 years from start', async function () {
    it('time travel to 1 second after 4 years', async function () {
      await increaseTimeTo(time_founder_4_year + duration.seconds(1));
    });

    it('should allow 100% of founder tokens to be released', async function () {
      for (let i = 0; i < founder_address.length; i++) {
        let amount_releasable = await this.founderVault.releasableAmount(founder_address[i]);
        assert(
          amount_releasable.eq(founder_split[i]),
          amount_releasable.toString() + ' is releasable from address ' +
            founder_address[i].toString() + ' at ' + latestTime());
      }
    });

    it('should allow each founder to release tokens by himself/herself', async function () {
      for (let i = 0; i < founder_address.length; i++) {
        let balance_before = await this.token.balanceOf(founder_address[i]);

        let amount_releasable = await this.founderVault.releasableAmount(founder_address[i]);
        await this.founderVault.release({ from: founder_address[i] });

        let balance_after = await this.token.balanceOf(founder_address[i]);
        assert.equal(amount_releasable.toString(), balance_after.sub(balance_before).toString(), '');
      }
    });
  });
});
