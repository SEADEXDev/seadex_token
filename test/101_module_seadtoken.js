import {increaseTimeTo, duration} from './helpers/increaseTime';
import latestTime from './helpers/latestTime';
import assertRevert from './helpers/assertRevert';

const BigNumber = web3.BigNumber;
const SEADToken = artifacts.require('./SEADToken.sol');

contract('101_module_seadtoken.js', function(accounts) {
  let token;
  const token_name = 'SEA DAX Token';
  const token_symbol = 'SEAD';
  const token_decimals = 18;
  const unit = new BigNumber(10 ** token_decimals);
  const million = new BigNumber(1000000);

  let start_time;
  let end_time;

  // list of accounts
  let account_admin = accounts[0];

  beforeEach(async function () {
    start_time = latestTime();
    end_time = start_time + duration.years(1);
    //token = await SEADToken.deployed();
    token = await SEADToken.new(200 * million * unit, start_time, end_time);
    token.setupSaleContract('0x0'); // Set sale contract to nobody to disable admin to transfer
  });

  it('should name ' + token_name, async function () {
    let name = await token.name();
    assert.equal(name, token_name);
  });

  it('should have a symbol ' + token_symbol, async function () {
    let symbol = await token.symbol();
    assert.equal(symbol, token_symbol);
  });

  it('should have ' + token_decimals.toString() + ' decimals', async function () {
    let decimals = await token.decimals();
    assert(decimals.eq(token_decimals));
  });

  // totalSupply()
  it('should have total supply of 200 M SEAD', async function() {
    let totalSupply = await token.totalSupply();
    assert(
      totalSupply.eq(200 * million * unit),
      totalSupply.toString() + ' total supply is available');
  });

  // balanceOf(address tokenOwner)
  it('should assign 200M to the admin account', async function () {
    let balance = await token.balanceOf(account_admin);
    assert(
      balance.eq(200 * million * unit),
      balance.toString() + ' ' + token_symbol + ' is in reserve account');
  });

  // transfer(address to, uint tokens)
  it('should NOT be able to transfer tokens before lock expires', async function () {
    let account_sender = accounts[0];
    let account_receiver = accounts[1];
    let balance_sender_before = await token.balanceOf(account_sender);
    let balance_receiver_before = await token.balanceOf(account_receiver);
    let amount = 100 * unit;

    await assertRevert(token.transfer(account_receiver, amount));
  });

  it('should be able to transfer tokens after lock expires', async function () {
    let account_sender = accounts[0];
    let account_receiver = accounts[1];
    let balance_sender_before = await token.balanceOf(account_sender);
    let balance_receiver_before = await token.balanceOf(account_receiver);
    let amount = new BigNumber(100 * unit);

    await increaseTimeTo(end_time + duration.seconds(1));

    await token.transfer(account_receiver, amount);

    let balance_sender_after = await token.balanceOf(account_sender);
    let balance_receiver_after = await token.balanceOf(account_receiver);
    assert(balance_sender_after.eq(balance_sender_before.sub(amount)).toString(),
      (balance_sender_after).toString() + ' is left in sender account');
    assert(balance_receiver_after.eq(balance_receiver_before.add(amount)).toString(),
      (balance_receiver_after).toString() + ' is left in receiver account');
  });

  it('should detect excessive transfer amount, and roll-back', async function () {
    let account_sender = accounts[0];
    let account_receiver = accounts[1];
    let balance_sender_before = await token.balanceOf(account_sender);
    let balance_receiver_before = await token.balanceOf(account_receiver);
    let amount = balance_sender_before.plus(1);

    await increaseTimeTo(end_time + duration.seconds(1));

    // excessive amount, should revert
    await assertRevert(token.transfer(account_receiver, amount));
    let balance_sender_after = await token.balanceOf(account_sender);
    let balance_receiver_after = await token.balanceOf(account_receiver);
    assert(balance_sender_after.eq(balance_sender_before).toString(),
      (balance_sender_after).toString() + ' is left in sender account');
    assert(balance_receiver_after.eq(balance_receiver_before).toString(),
      (balance_receiver_after).toString() + ' is left in receiver account');
  });

  it('should detect negative transfer amount, and roll-back', async function () {
    let account_sender = accounts[0];
    let account_receiver = accounts[1];
    let balance_sender_before = await token.balanceOf(account_sender);
    let balance_receiver_before = await token.balanceOf(account_receiver);
    let amount = (new BigNumber(-1)).times(unit);

    await increaseTimeTo(end_time + duration.seconds(1));

    // excessive amount, should revert
    await assertRevert(token.transfer(account_receiver, amount));
    let balance_sender_after = await token.balanceOf(account_sender);
    let balance_receiver_after = await token.balanceOf(account_receiver);
    assert(balance_sender_after.eq(balance_sender_before).toString(),
      (balance_sender_after).toString() + ' is left in sender account');
    assert(balance_receiver_after.eq(balance_receiver_before).toString(),
      (balance_receiver_after).toString() + ' is left in receiver account');
  });

  // approve(address spender, uint tokens)
  // transferFrom(address from, address to, uint tokens)
  it('should be able to approve spender, and let the spender transfer tokens ' +
      'from specific accounts after lock expires', async function () {
    let account_sender = accounts[0];
    let account_spender = accounts[1];
    let account_receiver = accounts[2];
    const amount_approve = new BigNumber(100 * unit);
    const amount_transfer = new BigNumber(100 * unit);
    await token.approve(account_spender, amount_approve);
    let balance_receiver_before = await token.balanceOf(account_receiver);

    await assertRevert(
      token.transferFrom(
        account_sender, account_receiver,
        amount_transfer.toString(), { from: account_spender }));

    await increaseTimeTo(end_time + duration.seconds(1));

    await token.transferFrom(
      account_sender, account_receiver,
      amount_transfer.toString(), { from: account_spender });

    let balance_receiver_after = await token.balanceOf(account_receiver);
    assert(
      balance_receiver_after.eq(
        balance_receiver_before.add(amount_transfer.toString())).toString(),
        (balance_receiver_after).toString() + ' is left in receiver account');
  });

  it('should NOT allow spending more than approved', async function () {
    let account_sender = accounts[0];
    let account_spender = accounts[1];
    let account_receiver = accounts[2];
    // JS has limited digits, BigNumber does not work out-of-the-box
    let amount_approve = (new BigNumber(100)).times(million).times(unit);
    let amount_transfer = ((new BigNumber(100)).times(million).times(unit)).plus(1);
    await token.approve(account_spender, amount_approve.toString());
    let balance_receiver_before = await token.balanceOf(account_receiver);

    await increaseTimeTo(end_time + duration.seconds(1));
    await assertRevert(token.transferFrom(
      account_sender, account_receiver,
      amount_transfer.toString().toString(), { from: account_spender }));
  });

  it('should NOT allow an unapproved spending', async function () {
    let account_sender = accounts[0];
    let account_spender = accounts[1];
    let account_receiver = accounts[2];
    const amount_transfer = new BigNumber(100 * unit);
    let balance_receiver_before = await token.balanceOf(account_receiver);

    await increaseTimeTo(end_time + duration.seconds(1));
    await assertRevert(token.transferFrom(
      account_sender, account_receiver,
      amount_transfer.toString(), { from: account_spender }));
  });

  it('should NOT allow spending before lock expires', async function () {
    let account_sender = accounts[0];
    let account_spender = accounts[1];
    let account_receiver = accounts[2];
    const amount_approve = new BigNumber(200 * unit);
    const amount_transfer = new BigNumber(100 * unit);

    await token.approve(account_spender, amount_approve.toString());

    let balance_receiver_before = await token.balanceOf(account_receiver);

    await assertRevert(token.transferFrom(
      account_sender, account_receiver,
      amount_transfer.toString(), { from: account_spender }));
  });

  // allowance(address tokenOwner, address spender)
  it('should be able to check spender allowance', async function () {
    let account_sender = accounts[0];
    let account_spender = accounts[1];
    let account_receiver = accounts[2];
    const amount_approve = new BigNumber(200 * unit);
    const amount_transfer = new BigNumber(100 * unit);

    // no allowance
    let allowed = await token.allowance(account_sender, account_spender.toString());
    assert(
      allowed.eq(0),
      allowed.toString() + ' ' + token_symbol + ' is allowed at the start');

    // starting allowance = amount_approve
    await token.approve(account_spender, amount_approve);
    allowed = await token.allowance(account_sender, account_spender.toString());
    assert(
      allowed.eq(amount_approve),
      allowed.toString() + ' ' + token_symbol + ' is allowed after allowance');

    // spend = amount_transfer
    await increaseTimeTo(end_time + duration.seconds(1));
    await token.transferFrom(
      account_sender, account_receiver,
      amount_transfer.toString(), { from: account_spender });

    // allowance should decrease
    allowed = await token.allowance(account_sender, account_spender.toString());
    assert(
      allowed.eq(amount_approve.toString() - amount_transfer.toString()),
      allowed.toString() + ' ' + token_symbol + ' is allowed after transfer');
  });

  // increaseApproval(address _spender, uint _addedValue)
  // decreaseApproval(address _spender, uint _subtractedValue) public returns (bool)
  it('should be able to increase or decrease spender allowance', async function () {
    let account_sender = accounts[0];
    let account_spender = accounts[1];
    let account_receiver = accounts[2];
    const amount_approve = 200 * unit;
    const amount_add = 100 * unit;

    // no allowance
    let allowed = await token.allowance(account_sender, account_spender);
    assert(
      allowed.eq(0),
      allowed.toString() + ' ' + token_symbol + ' is allowed at the start');

    // starting allowance = amount_approve
    await token.approve(account_spender, amount_approve);
    allowed = await token.allowance(account_sender, account_spender);
    assert(
      allowed.eq(amount_approve),
      allowed.toString() + ' ' + token_symbol + ' is allowed after allowance');

    // allowance should increase
    await token.increaseApproval(account_spender, amount_add);
    allowed = await token.allowance(account_sender, account_spender);
    assert(
      allowed.eq(amount_approve + amount_add),
      allowed.toString() + ' ' + token_symbol + ' is allowed after allowance increase');

    // allowance should decrease
    await token.decreaseApproval(account_spender, amount_add);
    allowed = await token.allowance(account_sender, account_spender);
    assert(
      allowed.eq(amount_approve),
      allowed.toString() + ' ' + token_symbol + ' is allowed after allowance decrease');
  });

});
