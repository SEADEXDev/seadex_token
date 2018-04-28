SEADEX Token contract
===
ERC20 token under the name SEAD (SEA-DEX coin). There will be a total of 200 million SEAD coins which can never be increased. SEAD will initailly be used for payment of service within SEA-DEX.

# Sale Condition
## Supply:
**Total Coin**     : 200 Million  
**Allocation** :  
- Founder      : 50 Million  
- Investor     : 20 Million  
- Private Sale : 50 Million  
- Public Sale  : 50 Million  
- Reserve      : 30 Million  

## Sale Condition:
- Investor : will buy offline and get token deposit to vault directly from sale contract.  
- Private Sale : Subscribers can purchase token after approve to whitelist. Rate 2 token per 1 USD.  
- Public Sale: Subscribers can purchase token after approve to whitelist. Sale will devided into 3 consecutive round   
  - Round 1 : Rate : 0.67 USD / 1 Token, Allocation 10 Million Token  
  - Round 2 : Rate : 0.70 USD / 1 Token, Allocation 15 Million Token  
  - Round 3 : Rate : 0.73 USD / 1 Token, Allocation 25 Million Token  

**Note : Remaining token after each phase will carry to next sale phase.*  

## Lockup Period :
**Investor** : Total amount locked for 6 months  
**Private Sale** : 40% locked for 6 months  
**Public Sale** : No locked period  
**Founder** :   
- Initail release : 20%  
- After 1 year : 20%  
- After 2 year : 20%  
- After 3 year : 20%  
- After 4 year : 20%  

# Test Result
```
  Contract: 001_systemTesting_timeline_main.js
    At Contract Initialization: time_contract_init
      √ total supply should be 200 M
      √ should create founderVault and set max deposit to 50 M
      √ should create investorVault and set max deposit to 20 M
      √ should create privateSaleVault and set max deposit to 50 M
      √ should put 50 M SEADToken to founderVault
      √ should have correct balance in vault for each founder address (47ms)
      √ should put 30 M SEADToken to reserve account
      √ should have remaining token 120 M SEADToken for sale
    Before Public-Sale Period: time_investor_sale_start, time_private_sale_start
      √ time travel to 1 minute after angel investor sale starts (205ms)
      √ should allow 20% founder tokens to be released (582ms)
      √ should allow 100K tokens off-chain purchase for angel investors (57ms)
      √ should allow 0% of angle investor tokens to be released
      √ time travel to 1 minute after private sale starts (183ms)
      √ should NOT allow private sale of non-listed account
      √ should allow private sale whitelisting (38ms)
      √ should NOT allow below minimum purchase
      √ should allow purchase of 0.5 ETH for private sale by buyTokens function (81ms)
      √ should allow purchase of 0.5 ETH for private sale by Transfer ether (259ms)
      √ should have 60% of token in private sale account
      √ should have weiRaised equal to 1 ETH
      √ should allow purchase to maximum amount for private sale (83ms)
      √ should NOT allow any private sale investor to buy token more than maximum
    Public-Sale Round 1: time_public_sale_1_start
      √ time travel to 1 minute before round 1 starts (192ms)
      √ should NOT be able to buy token before round 1 starts
      √ time travel to 1 second after round 1 starts (178ms)
      √ should NOT allow public sale of non-listed account (50ms)
      √ should allow public sale whitelisting (86ms)
      √ should allow public sale investor 1 to buy 1 ETH worth of token,and get token in balance immediately (71ms)
      √ should NOT allow below minimum purchase
      √ should allow public sale investor 2 to buy maximum amount, less 1 ETH from previous buy (73ms)
      √ should NOT allow any public sale investor to buy more than maximum amount (44ms)
      √ should NOT allow any public sale investor to buy 0 ETH worth of token (46ms)
    Public-Sale Round 2: time_public_sale_2_start
      √ time travel to 1 second after round 2 starts (230ms)
      √ should allow public sale investor 2 to buy maximum amount, minus 1 ETH worth (73ms)
      √ should NOT allow any public sale investor to buy more than 1 ETH worth of tokens (46ms)
      √ should NOT allow tokens transfer between accounts
    Public-Sale Round 3: time_public_sale_3_start
      √ time travel to 1 second after round 3 starts (211ms)
      √ should allow public sale investor 2 to buy round 3 maximum amount (68ms)
      √ should allow public sale investor 1 to buy 0.9 ETH worth of tokens carried from round 2 with round 3 rate (74ms)
      √ should NOT allow any public sale investor to buy more token than maximum (55ms)
    After Last Round of Public Sale: time_public_sale_3_end
      √ time travel to 1 second after round 3 ends (191ms)
      √ should NOT allow public sale after public sale phase ends
    After transferrable: time_transferrable
      √ time travel to 1 minute after transferrable (199ms)
      √ should allow transfer of 1 token between accounts
    Just before 6 months after start
      √ time travel to 1 minute before 6 months (176ms)
      √ should allow 0% tokens for angel investor
    After 6 months from start
      √ time travel to 1 second after 6 months (209ms)
      √ should allow 100K of angel investor tokens to be released
      √ should allow admin to release tokens for angel investors to the maximum releasable amount (64ms)
      √ should have 40% of private sale investor tokens to be released (60% has already been released)
      √ should allow private sale investors to release tokens by themselves to the maximum releasable amount (78ms)
    After 1 year from start
      √ time travel to 1 second after 1 year (211ms)
      √ should allow 40% of founder tokens to be released (636ms)
    After 2 years from start
      √ time travel to 1 second after 2 years (180ms)
      √ should allow 60% of founder tokens to be released (567ms)
    After 3 years from start
      √ time travel to 1 second after 3 years (187ms)
      √ should allow 80% of founder tokens to be released (561ms)
    After 4 years from start
      √ time travel to 1 second after 4 years (205ms)
      √ should allow 100% of founder tokens to be released (567ms)
      √ should allow each founder to release tokens by himself/herself (205ms)

  Contract: 101_module_seadtoken.js
    √ should name SEA DAX Token
    √ should have a symbol SEAD
    √ should have 18 decimals
    √ should have total supply of 200 M SEAD
    √ should assign 200M to the admin account
    √ should NOT be able to transfer tokens before lock expires (51ms)
    √ should be able to transfer tokens after lock expires (338ms)
    √ should detect excessive transfer amount, and roll-back (291ms)
    √ should detect negative transfer amount, and roll-back (273ms)
    √ should be able to approve spender, and let the spender transfer tokens from specific accounts after lock expires (277ms)
    √ should NOT allow spending more than approved (267ms)
    √ should NOT allow an unapproved spending (246ms)
    √ should NOT allow spending before lock expires (67ms)
    √ should be able to check spender allowance (298ms)
    √ should be able to increase or decrease spender allowance (131ms)

  Contract: 102_module_seadsale.js
    √ should have total supply of 200 M SEAD
    √ should assign 120M to the sale account, out of which 50M for founder, 50M for private sale, and 20M for angel investors
    √ should assign 30M to the reserve account


  78 passing (31s)
```