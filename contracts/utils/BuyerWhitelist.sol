pragma solidity ^0.4.21;

import "../zeppelin/ownership/Ownable.sol";

/**
 * @title WhitelistedCrowdsale
 * @dev Whitelist contract provide simple list to store user address and
 * basic function to add and remove user from list
 */
contract BuyerWhitelist is Ownable {

  address private admin;
  address private approver;
  mapping(address => bool) public whitelist;

  event WhitelistedAddressAdded(address addr);
  event WhitelistedAddressRemoved(address addr);
  
  modifier onlyApprover() {
    require(msg.sender == owner || msg.sender == admin || msg.sender == approver);
    _;
  }  

  modifier onlyAdmin() {
    require(msg.sender == owner || msg.sender == admin);
    _;
  }

  function BuyerWhitelist(address adminAddr) public {
    admin = adminAddr;
  }

  /**
   * @dev add a address to be an admin to add approver 
   * @param addr address
   */
  function setAdmin(address addr) onlyOwner public {
    admin = addr;
  }

  /**
   * @dev add a address to an approver list
   * @param addr address
   */
  function setApprover(address addr) onlyAdmin public {
    approver = addr;
  }  

  /**
   * @dev Adds single address to whitelist.
   * @param _beneficiary Address to be added to the whitelist
   */
  function addToWhitelist(address _beneficiary) onlyApprover public returns(bool success) {
    if (!whitelist[_beneficiary]) {
      whitelist[_beneficiary] = true;
      emit WhitelistedAddressAdded(_beneficiary);
      success = true;
    }
  }
  
  /**
   * @dev Adds list of addresses to whitelist. Not overloaded due to limitations with truffle testing. 
   * @param _beneficiaries Addresses to be added to the whitelist
   */
  function addManyToWhitelist(address[] _beneficiaries) onlyApprover public returns(bool success) {
    for (uint256 i = 0; i < _beneficiaries.length; i++) {
      if (addToWhitelist(_beneficiaries[i])) {
        success = true;
      }
    }
  }

  /**
   * @dev Removes single address from whitelist. 
   * @param _beneficiary Address to be removed to the whitelist
   */
  function removeFromWhitelist(address _beneficiary) onlyAdmin public returns(bool success) {
    if (whitelist[_beneficiary]) {
      whitelist[_beneficiary] = false;
      emit WhitelistedAddressRemoved(_beneficiary);
      success = true;
    }
  }

  /**
   * @dev Check if beneficiary is whitelisted.
   * @param _beneficiary Address to check if address already add to the whitelist
   */
  function isWhitelisted(address _beneficiary) public view returns (bool) {
    return whitelist[_beneficiary];
  }
}
