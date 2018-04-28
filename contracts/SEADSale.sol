pragma solidity ^0.4.21;

import "./zeppelin/token/ERC20/SafeERC20.sol";
import "./zeppelin/math/SafeMath.sol";

import "./utils/SaleWithListAndVault.sol";
import "./SEADToken.sol";

/**
 * @title SEADSale
 * @dev SEADSale is a extend contract for managing a token crowdsale,
 * allowing investors to purchase tokens with ether.
 */

contract SEADSale is SaleWithListAndVault {
  using SafeMath for uint256;
  using SafeERC20 for SEADToken;

  uint256 public millionUnit = 10 ** 24; // 18 Decimals + 6 To_Million

  uint256 public tokenPrivateToGWei = 588000;
  uint256 public tokenPublic1ToGWei = 788000;
  uint256 public tokenPublic2ToGWei = 824000;
  uint256 public tokenPublic3ToGWei = 859000;

  /**
   * @param _rate Number of token units a buyer gets per wei
   * @param _fundWallet Address where collected funds will be forwarded to
   * @param _token Address of the token being sold
   */
  function SEADSale (
    uint256 _rate,
    address _fundWallet,
    SEADToken _token,
    uint256 _openingTime,
    uint256 _closingTime,

    address _reserveWallet
  )
  public
    SaleWithListAndVault(
      _rate,
      _fundWallet,
      _token,
      _openingTime,
      _closingTime,
      _reserveWallet
      )
    {

    supplyFounder = 50 * millionUnit;
    supplyInvestor = 20 * millionUnit;
    supplyPrivate = 50 * millionUnit;

    softCap = 20 * millionUnit;
  }

  /* 
  * @dev Setup timestamp for each sale phase
  */
  function initialDate(
    uint256 _startPrivateSaleTime,
    uint256 _startPublicSaleTime1,
    uint256 _startPublicSaleTime2,
    uint256 _startPublicSaleTime3
  ) external onlyOwner {
    startPrivateSaleTime = _startPrivateSaleTime;
    startPublicSaleTime1 = _startPublicSaleTime1;
    startPublicSaleTime2 = _startPublicSaleTime2;
    startPublicSaleTime3 = _startPublicSaleTime3;
  }

  /* 
  * @dev Setup token allocation limitaion for each sale phase
  */
  function initialSale() external onlyOwner {
    token.safeTransfer(reserveWallet, 30 * millionUnit); // transfer reserve token to reserve wallet
    limitInvestorSaleToken = 20 * millionUnit;
    limitPrivateSaleToken = 50 * millionUnit;
    limitPublicSaleToken1 = limitPrivateSaleToken.add(10 * millionUnit);
    limitPublicSaleToken2 = limitPublicSaleToken1.add(15 * millionUnit);
    limitPublicSaleToken3 = limitPublicSaleToken2.add(25 * millionUnit);
  }

  /* 
  * @dev Transfer token to buyer in each sale phase. Some phase will transfer to vault
  */
  function _deliverTokens(address _beneficiary, uint256 _tokenAmount) internal {
    require(address(privateSaleVault) != address(0x0));  // Should assign vault
    require(address(investorVault) != address(0x0));  // Should assign vault

    if (block.timestamp > startPublicSaleTime1) {
      token.safeTransfer(_beneficiary, _tokenAmount);

    } else if (block.timestamp > startPrivateSaleTime) {
      // Transfer 60% to wallet and 40% to vault
      // then set deposit value
      uint256 lockToken = _tokenAmount.mul(40).div(100);
      uint256 transferToken = _tokenAmount.sub(lockToken);
      token.safeTransfer(_beneficiary, transferToken); // 40% transfer to beneficiary
      token.safeTransfer(address(privateSaleVault), lockToken); // 60% lock in vault
      privateSaleVault.deposit(_beneficiary, lockToken);
    }
  }

  /* 
  * @dev Interface for admin to deposit token to founder vault
  * @param _beneficiaries founder address
  * @param _tokenAmounts token to deposoit
  */
  function founderDepositMany(address[] _beneficiaries, uint256[] _tokenAmounts) external onlyOwner {
    vaultDepositMany(founderVault, _beneficiaries, _tokenAmounts);
  }

  /* 
  * @dev Interface for admin to deposit token to investor vault
  * @param _beneficiaries investor address
  * @param _tokenAmounts token to deposoit
  */
  function investorDepositMany(address[] _beneficiaries, uint256[] _tokenAmounts) external onlyOwner {
    vaultDepositMany(investorVault, _beneficiaries, _tokenAmounts);
  }

  /* 
  * @dev Set exchange rate from wei to token for each sale phase
  * @param _privateRate rate for private sale
  * @param _public1Rate rate for public sale round 1
  * @param _public2Rate rate for public sale round 2
  * @param _public3Rate rate for public sale round 3
  */
  function setTokenToGWeiRate(uint256 _privateRate, uint256 _public1Rate, uint256 _public2Rate, uint256 _public3Rate) onlyOwner external {
    tokenPrivateToGWei = _privateRate;
    tokenPublic1ToGWei = _public1Rate;
    tokenPublic2ToGWei = _public2Rate;
    tokenPublic3ToGWei = _public3Rate;
  }

  /**
   * @dev the way in which ether is converted to tokens. Use different rate for each phase.
   * @param _weiAmount Value in wei to be converted into tokens
   * @return Number of tokens that can be purchased with the specified _weiAmount
   */
  function _getTokenAmount(uint256 _weiAmount) internal view returns (uint256) {
    if (block.timestamp > startPublicSaleTime3) {
      return _weiAmount.mul(1000000000).div(tokenPublic3ToGWei);
    } else if (block.timestamp > startPublicSaleTime2) {
      return _weiAmount.mul(1000000000).div(tokenPublic2ToGWei);
    } else if (block.timestamp > startPublicSaleTime1) {
      return _weiAmount.mul(1000000000).div(tokenPublic1ToGWei);
    } else if (block.timestamp > startPrivateSaleTime) {
      return _weiAmount.mul(1000000000).div(tokenPrivateToGWei);
    }
  }

  /*
  * @dev Interface to release token for founder vault
  */
  function releaseFounderToken(address _beneficiary) external {
    founderVault.releaseFor(_beneficiary);
  }

  /*
  * @dev Interface to release token for investor vault
  */
  function releaseInvestorToken(address _beneficiary) external {
    investorVault.releaseFor(_beneficiary);
  }

  /*
  * @dev Interface to release token for private buyer vault
  */
  function releasePrivateToken(address _beneficiary) external {
    privateSaleVault.releaseFor(_beneficiary);
  }
}
