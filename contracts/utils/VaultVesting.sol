pragma solidity ^0.4.21;

import "../zeppelin/ownership/Ownable.sol";
import "../zeppelin/token/ERC20/ERC20.sol";
import "../zeppelin/token/ERC20/SafeERC20.sol";
import "../zeppelin/math/SafeMath.sol";


/**
 * @title VaultVesting
 * @dev A token holder contract that can release its token balance gradually like a
 * typical vesting scheme, with a cliff and vesting period. Optionally revocable by the
 * owner.
 */
contract VaultVesting is Ownable {
  using SafeMath for uint256;
  using SafeERC20 for ERC20;

  ERC20 public token;

  address public reserveWallet;
  uint[] public vestingPeriod;
  uint[] public vestingReleaseRatio;

  uint256 public currentDeposit;
  uint256 public limitTotalDeposit;

  event Released(address indexed beneficiary, uint256 amount);
  event Deposited(address indexed beneficiary, uint256 amount);

  mapping(address => uint256) public deposited;
  mapping(address => uint256) public released;

  /**
   * @param _token  Token to store in vault
   * @param _limitTotalDeposit Number of token accept to store in vault
   * @param _vestingPeriod array of timestamp for each vesting period
   * @param _vestingReleaseRatio array of releasable percentage for each vesting period
   * @param _reserveWallet reserve address to transfer remaining token to
   */
  function VaultVesting(
    ERC20 _token, 
    uint256 _limitTotalDeposit, 
    uint256[] _vestingPeriod, 
    uint256[] _vestingReleaseRatio, 
    address _reserveWallet
  ) public {
    require(_vestingPeriod.length > 0);
    require(_vestingPeriod.length == _vestingReleaseRatio.length);

    token = _token;

    reserveWallet = _reserveWallet;

    vestingPeriod = _vestingPeriod;
    vestingReleaseRatio = _vestingReleaseRatio;

    limitTotalDeposit = _limitTotalDeposit;
  }

  /**
   * @param beneficiary Beneficiary address
   * @param tokenAmount amount to deposit
   */
  function deposit(address beneficiary, uint256 tokenAmount) onlyOwner public {
    uint256 newTotalDeposit = currentDeposit.add(tokenAmount);

    // Token must transfer to vault before setup deposit
    require(newTotalDeposit <= token.balanceOf(this));
    require(newTotalDeposit <= limitTotalDeposit);

    currentDeposit = currentDeposit.add(tokenAmount);
    deposited[beneficiary] = deposited[beneficiary].add(tokenAmount);
    emit Deposited(beneficiary, tokenAmount);
  }

  /**
   * @param _beneficiaries Beneficiary address
   * @param _tokenAmounts amount to deposit
   */
  function depositMany(address[] _beneficiaries, uint256[] _tokenAmounts) onlyOwner public {
    require(_beneficiaries.length == _tokenAmounts.length);
    for (uint256 i = 0; i < _beneficiaries.length; i++) {
      deposit(_beneficiaries[i], _tokenAmounts[i]);
    }
  }  

  /**
   * @notice Proxy transfers vested tokens to beneficiary.
   */
  function releaseFor(address beneficiary) public {  
    uint256 unreleased = releasableAmount(beneficiary);
    require(unreleased > 0);
    released[beneficiary] = released[beneficiary].add(unreleased);
    token.safeTransfer(beneficiary, unreleased);
    emit Released(beneficiary, unreleased);
  }

  /**
   * @notice Transfers vested tokens to sender.
   */
  function release() public {
    releaseFor(msg.sender);
  }


  /**
   * @dev Calculates the amount that has already vested but hasn't been released yet.
   * @param beneficiary address which is being vested
   */
  function releasableAmount(address beneficiary) public view returns (uint256) {
    return vestedAmount(beneficiary).sub(released[beneficiary]);
  }

  /**
   * @dev Calculates the amount that has already vested.
   * @param beneficiary depositor address 
   */
  function vestedAmount(address beneficiary) public view returns (uint256) {
    uint256 depositedValue = deposited[beneficiary];  
    
    if (block.timestamp < vestingPeriod[0]) {
      // Not release before begining of first vested release
      return 0;
    } else if (block.timestamp > vestingPeriod[vestingPeriod.length-1]) {
      // Release all deposit at the end of vesting period
      return depositedValue;
    } else {
      for (uint i = vestingPeriod.length;i > 0;i--) {
        if (block.timestamp > vestingPeriod[i-1]) {
          return depositedValue.mul(vestingReleaseRatio[i-1]).div(100);
        }
      }
    }
    return 0;
  }

  /**
   * @dev Show remaining token in vault of beneficiary
   * @param beneficiary depositor address 
   */
  function getCurrentDeposit(address beneficiary) constant external returns (uint256) {
    return deposited[beneficiary].sub(released[beneficiary]);
  }

  /**
   * @dev Show total token in vault
   */
  function getTotalDeposit() constant external returns (uint256) {
    return token.balanceOf(this);
  }  

  /**
   * @dev Show maximum number allowed to deposit to vault
   */
  function getVaultLimit() constant external returns (uint256) {
    return limitTotalDeposit;
  }

  /**
   * @dev Destroy vault and transfer all token to reserve wallet
   * TODO: Do we need this?
   */  
  function destroy() external onlyOwner {
    // Can destroy after vesting period
    require(block.timestamp > vestingPeriod[vestingPeriod.length-1]);
    // Transfer all remain token to wallet before destroy
    token.safeTransfer(reserveWallet, token.balanceOf(this));
    selfdestruct(owner);
  }

  /**
   * @dev EmergencyDrain transfer all token to reserve wallet
   * @dev ETH balance is always expected to be 0.
   * but in case something went wrong, we use this function to extract the eth.
   * @dev Transfer any token that trafer to this address to reserve wallet
   * TODO: Do we need this?
   * @param anyToken Token address that want to drain to reserve wallet
   */
  function emergencyDrain(ERC20 anyToken) external onlyOwner returns(bool) {
    require(now > vestingPeriod[vestingPeriod.length-1]);

    uint256 balance = address(this).balance;
    if (balance > 0) {
      reserveWallet.transfer(balance);
    }

    if (anyToken != address(0x0)) {
      assert(anyToken.transfer(reserveWallet, anyToken.balanceOf(this)));
    }

    return true;
  }
}
