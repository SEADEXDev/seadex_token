pragma solidity ^0.4.21;

import "../zeppelin/token/ERC20/StandardToken.sol";
import "../zeppelin/ownership/Ownable.sol";

contract TokenSaleLockTransfer is StandardToken, Ownable {
  uint public saleStartTime;
  uint public saleEndTime;

  address public tokenSaleContract;

  // Force to transfer only by tokenSaleContract during sale period
  modifier onlyWhenTransferEnabled() {
    if (block.timestamp <= saleEndTime && block.timestamp >= saleStartTime) {
      require(msg.sender == tokenSaleContract);
    }
    _;
  }

  // Init supply and set tokenSaleContract ==================================
  function TokenSaleLockTransfer(uint256 tokenTotalAmount, uint256 startTime, uint256 endTime) public {
    // Mint all tokens. Then disable minting forever.
    balances[msg.sender] = tokenTotalAmount;
    totalSupply_ = tokenTotalAmount;
    
    emit Transfer(address(0x0), msg.sender, tokenTotalAmount);

    saleStartTime = startTime;
    saleEndTime = endTime;

    tokenSaleContract = msg.sender;
  }


  // Lock transfer during presale period =====================================
  function transfer(address _to, uint256 _value) onlyWhenTransferEnabled public returns(bool) {
    return super.transfer(_to, _value);
  }

  function transferFrom(address _from, address _to, uint256 _value) onlyWhenTransferEnabled public returns(bool) {
    return super.transferFrom(_from, _to, _value);
  }

  // Setup sale contract ===============================================================
  function setupSaleContract(address _tokenSaleContract) onlyOwner external {
    tokenSaleContract = _tokenSaleContract;
  }

  // Emergency ===============================================================
  function emergencyERC20Drain(uint256 amount) onlyOwner external {       
    this.transfer(owner, amount);
  }
}