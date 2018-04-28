pragma solidity ^0.4.21;

import "../zeppelin/token/ERC20/SafeERC20.sol";
import "../zeppelin/token/ERC20/ERC20.sol";
import "../zeppelin/math/SafeMath.sol";

import "../zeppelin/crowdsale/Crowdsale.sol";
import "../zeppelin/ownership/Ownable.sol";

import "./VaultVesting.sol";
import "./BuyerWhitelist.sol";


/**
 * @title SaleWithListAndVault
 * @dev SaleWithListAndVault is a base contract for managing a token crowdsale 
 * with whitelist and vault feature
 */

contract SaleWithListAndVault is Crowdsale, Ownable {
  using SafeMath for uint256;
  using SafeERC20 for ERC20;

  ERC20 public token;
  address public reserveWallet;

  // Emergency halt sale
  bool public haltSale;
  uint256 public openingTime;
  uint256 public closingTime;

  BuyerWhitelist public publicWhitelist;
  BuyerWhitelist public privateWhitelist;

  VaultVesting public founderVault;
  VaultVesting public investorVault;
  VaultVesting public privateSaleVault;

  uint256 public startPrivateSaleTime;
  uint256 public startPublicSaleTime1;
  uint256 public startPublicSaleTime2;
  uint256 public startPublicSaleTime3;

  uint256 public softCap;
  uint256 public limitInvestorSaleToken;
  uint256 public limitPrivateSaleToken;
  uint256 public limitPublicSaleToken1;
  uint256 public limitPublicSaleToken2;
  uint256 public limitPublicSaleToken3;

  uint256 public totalTokenSale;
  uint256 public supplyFounder;
  uint256 public supplyReserve;
  uint256 public supplyInvestor;
  uint256 public supplyPrivate;

  /**
   * @dev Reverts if not in crowdsale time range.
   */
  modifier onlyWhileOpen {
    require(now >= openingTime && now <= closingTime);
    _;
  }

  /**
   * @param _rate Number of token units a buyer gets per wei
   * @param _fundWallet Address where collected funds will be forwarded to
   * @param _token Address of the token being sold
   * @param _openingTime Start time for sale period
   * @param _closingTime End time for sale period
   * @param _reserveWallet Reserve wallet to store remaining token from sale and vault
   */
  function SaleWithListAndVault (
    uint256 _rate,
    address _fundWallet,
    ERC20 _token,
    uint256 _openingTime,
    uint256 _closingTime,

    address _reserveWallet
  )
  public
    Crowdsale(_rate, _fundWallet, _token)
  {
    // require(_openingTime >= now);
    require(_closingTime >= _openingTime);

    openingTime = _openingTime;
    closingTime = _closingTime;

    token = _token;

    totalTokenSale = 0;

    reserveWallet = _reserveWallet;

    publicWhitelist = new BuyerWhitelist(msg.sender);
    privateWhitelist = new BuyerWhitelist(msg.sender);
  }

  /**
   * @dev Set halt sale state
   * if true sale validation will always throw
   */
  function setHaltStatus(bool halt) onlyOwner external {
    haltSale = halt;
  }

  /**
   * @dev Set exchange rate from wei to token
   * @param _rate Number of token units a buyer gets per wei
   */
  function setRate(uint256 _rate) onlyOwner external {
    rate = _rate;
  }

  /**
   * @dev Returns the rate of tokens per wei at the present time.
   * @return The number of tokens a buyer gets per wei at a given time
   */
  function getCurrentRate() public view returns (uint256) {
    return rate;
  }

  /**
   * @dev Deliver token to vault or wallet depend on sale phase
   * @param _beneficiary Address performing the token purchase
   * @param _tokenAmount Number of tokens to be emitted
   */
  function _deliverTokens(address _beneficiary, uint256 _tokenAmount) internal {
    require(address(privateSaleVault) != address(0x0));  // Should assign vault
    require(address(investorVault) != address(0x0));  // Should assign vault

    if (block.timestamp > startPublicSaleTime1) {
      token.transfer(_beneficiary, _tokenAmount);

    } else if (block.timestamp > startPrivateSaleTime) {
      token.transfer(address(privateSaleVault), _tokenAmount);
      privateSaleVault.deposit(_beneficiary, _tokenAmount);

    }
  }

  /**
   * @dev Update total token sale count
   * @param _beneficiary Address receiving the tokens
   * @param _tokenAmount Number of tokens to be purchased
   */
  function _processPurchase(address _beneficiary, uint256 _tokenAmount) internal {
    _deliverTokens(_beneficiary, _tokenAmount);
    totalTokenSale = totalTokenSale.add(_tokenAmount);
  }

  /**
   * @dev Extend parent behavior to check require condition for each phase
   * check whitelist for public and private sale
   * check total sale not exceed sale limit for each phase
   * requiring halt state to be false or will throw
   * @param _beneficiary Token purchaser
   * @param _weiAmount Amount of wei contributed
   */
  function _preValidatePurchase(address _beneficiary, uint256 _weiAmount) internal onlyWhileOpen {
    require(!haltSale);
    // set minimum wei purchase
    require(_weiAmount >= 0.01 ether);

    // limit token allocation for each phase
    if (block.timestamp > startPublicSaleTime3) {
      require(publicWhitelist.isWhitelisted(_beneficiary));
      require(limitPublicSaleToken3 > totalTokenSale.add(_getTokenAmount(_weiAmount)));

    } else if (block.timestamp > startPublicSaleTime2) {
      require(publicWhitelist.isWhitelisted(_beneficiary));
      require(limitPublicSaleToken2 > totalTokenSale.add(_getTokenAmount(_weiAmount)));

    } else if (block.timestamp > startPublicSaleTime1) {
      require(publicWhitelist.isWhitelisted(_beneficiary));
      require(limitPublicSaleToken1 > totalTokenSale.add(_getTokenAmount(_weiAmount)));

    } else if (block.timestamp > startPrivateSaleTime) {
      require(privateWhitelist.isWhitelisted(_beneficiary));
      require(limitPrivateSaleToken > totalTokenSale.add(_getTokenAmount(_weiAmount)));

    }

    super._preValidatePurchase(_beneficiary, _weiAmount);
  }

  /*
  * @dev Create vault for each party (founder, investor, private buyer) to hold token for specific period
  * only owner can run and must run after deployed this contract. 
  * Seperate to new function to avoid block gas limit 
  * @param _founderVaultPeriod 
  * @param _founderVaultRatio
  * @param _investorVaultPeriod
  * @param _investorVaultRatio
  * @param _privateVaultPeriod
  * @param _privateVaultRatio
  */
  function initialVault(
    uint256[] _founderVaultPeriod,
    uint256[] _founderVaultRatio,
    uint256[] _investorVaultPeriod,
    uint256[] _investorVaultRatio,
    uint256[] _privateVaultPeriod,
    uint256[] _privateVaultRatio
    ) external onlyOwner
    {
    founderVault = new VaultVesting(token, supplyFounder, _founderVaultPeriod, _founderVaultRatio, reserveWallet);
    investorVault = new VaultVesting(token, supplyInvestor, _investorVaultPeriod, _investorVaultRatio, reserveWallet);
    privateSaleVault = new VaultVesting(token, supplyPrivate, _privateVaultPeriod, _privateVaultRatio, reserveWallet);
  }

  /*
  * @dev Interface to deposit token to specific vault for many addresses
  * @param _vault Vault to deposit token to
  * @param _beneficiaries list of address to keep token in vault
  * @param _tokenAmounts list of token amout to deposit for each address
  */
  function vaultDepositMany(VaultVesting _vault, address[] _beneficiaries, uint256[] _tokenAmounts) public onlyOwner {
    require(_tokenAmounts.length > 0);
    require(_beneficiaries.length == _tokenAmounts.length);

    // sum amount to save gas
    uint256 totalAmount = 0;
    for (uint256 i = 0; i < _tokenAmounts.length; i++) {
      totalAmount = totalAmount.add(_tokenAmounts[i]);
    }
    // transfer token to vault and set deposit value
    token.safeTransfer(address(_vault), totalAmount);
    _vault.depositMany(_beneficiaries, _tokenAmounts);
  }

  /**
   * @dev Adds single address to public whitelist.
   * @param _beneficiary Address to be added to the whitelist
   */
  function addToPublicWhitelist(address _beneficiary) external onlyOwner {
    publicWhitelist.addToWhitelist(_beneficiary);
  }

  /**
   * @dev Adds list of addresses to public whitelist. Not overloaded due to limitations with truffle testing.
   * @param _beneficiaries Addresses to be added to the whitelist
   */
  function addManyToPublicWhitelist(address[] _beneficiaries) external onlyOwner {
    publicWhitelist.addManyToWhitelist(_beneficiaries);
  }

  /**
   * @dev Removes single address from public whitelist.
   * @param _beneficiary Address to be removed to the whitelist
   */
  function removeFromPublicWhitelist(address _beneficiary) external onlyOwner {
    publicWhitelist.removeFromWhitelist(_beneficiary);
  }

  /**
   * @dev Interface to add admin for public whitelist
   * @param addr new admin address
   */
  function setAdminPublicWhitelist(address addr) external onlyOwner {
    publicWhitelist.setAdmin(addr);
  }

  /**
   * @dev Adds single address to private whitelist.
   * @param _beneficiary Address to be added to the whitelist
   */
  function addToPrivateWhitelist(address _beneficiary) external onlyOwner {
    privateWhitelist.addToWhitelist(_beneficiary);
  }

  /**
   * @dev Adds list of addresses to private whitelist. Not overloaded due to limitations with truffle testing.
   * @param _beneficiaries Addresses to be added to the whitelist
   */
  function addManyToPrivateWhitelist(address[] _beneficiaries) external onlyOwner {
    privateWhitelist.addManyToWhitelist(_beneficiaries);
  }

  /**
   * @dev Removes single address from private whitelist.
   * @param _beneficiary Address to be removed to the whitelist
   */
  function removeFromPrivateWhitelist(address _beneficiary) external onlyOwner {
    privateWhitelist.removeFromWhitelist(_beneficiary);
  }

  /**
   * @dev Interface to add admin for private whitelist
   * @param addr new admin address
   */
  function setAdminPrivateWhitelist(address addr) external onlyOwner {
    privateWhitelist.setAdmin(addr);
  }

  /**
   * @dev Checks whether the period in which the crowdsale is open has already elapsed.
   * @return Whether crowdsale period has elapsed
   */
  function hasClosed() public view returns (bool) {
    return block.timestamp > closingTime;
  }

  // Emergency ===============================================================
  function emergencyERC20Drain(uint256 amount) onlyOwner external {
    token.safeTransfer(reserveWallet, amount);
  }
}
