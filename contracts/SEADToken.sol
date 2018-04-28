pragma solidity ^0.4.21;

import "./utils/TokenSaleLockTransfer.sol";

contract SEADToken is TokenSaleLockTransfer {
  string public name = "SEA DAX Token";
  string public symbol = "SEAD";
  uint256 public decimals = 18;

  // Init supply and set tokenSaleContract ==================================
  function SEADToken(uint256 tokenTotalAmount, uint256 startTime, uint256 endTime) 
    TokenSaleLockTransfer(tokenTotalAmount, startTime, endTime)
    public 
  {
  }
}