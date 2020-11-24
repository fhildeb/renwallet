import React from 'react';
import RenJS from "@renproject/ren";
import Web3 from "web3";
import './App.css';

import ABI from "./ABI.json";

/** 
 * Contract Address on Kovan Testnet
 * Code can be found within ./rencontract.sol
 *
 * This Contract connects to the GatewayRegistry
 * which is currently deployed to following address:
 * 0x557e211EC5fc9a6737d2C6b7a1aDe3e0C11A8D5D 
 */
const contractAddress = "0x3Aa969d343BD6AE66c4027Bb61A382DC96e88150";

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {

      // Minimal
      balance: 0,
      message: "",
      error: "",

      // Custom
      depositamount: 0.001,
      metamask: "",
      walleterror: "Loading information",
      ether: 0,

      // Advanced View
      logdeposit: "",
      logstatus: "",
      logtxhash: "",
      logconfirmations: 0,
      logreceipt: "",

      // Initiate Ren on Kovan testnet
      renJS: new RenJS("testnet"),
    }
  }

  /**
   * When webcomponents from render()
   * are displayed correctly, this function
   * will be called to execute JS code.
   */
  componentDidMount = async () => {

    // Calling Advanced Mode once, to enable the functionality
    this.toggleAdvancedMode();

    /**
     * Accesing Metamask
     */

    // Initiate a wallet provider for older brownsers
    let web3Provider;

    // For modern browsers
    if (window.ethereum) {
      web3Provider = window.ethereum;
      try {
        // Request Account Access
        await window.ethereum.enable();
      } catch (error) {
        // User denied Account Access
        this.logMetaMask("Please allow access to MetaMask");
        return;
      }
    }
    // For old browsers
    else if (window.web3) {
      web3Provider = window.web3.currentProvider;
    }
    // Default
    else {
      this.logMetaMask("Please install MetaMask");
      return;
    }

    /**
     * Accessing Kovan Network
     */

    //create web3 wrapper for ethereum modules
    const web3 = new Web3(web3Provider);

    // Compare network ID´s
    const networkID = await web3.eth.net.getId();
    if (networkID !== 42) {
      this.logMetaMask("Please set your network to Kovan");
      return;
    }
    // Kovan selected
    else {
      this.logMetaMask("MetaMask connected to Kovan Wallet");
    }
    
    // Refresh if permission request is still pending
    if(this.state.metamask === "Loading information" ){
      this.refreshPage();
    }

    // Update Bitcion and Ether balances every 10 seconds
    this.setState({ web3 }, () => {
      this.updateBalances();
      setInterval(() => {
        this.updateBalances();
      }, 10 * 1000);
    });

    // Start Listner to Catch certain Withdrawel Errors
    this.CatchUndefError();

    /**
     * Process pending Tokenizing Transactions
     */

    // Check for incomplete transfers in Local Storage
    const currentTransfer = this.getTransfer();

    // Check Transaction Bar for pending Tokenization
    this.updateEthBar();

    // Transfer is a deposit load tx and start animation
    if (currentTransfer && currentTransfer.sendToken === RenJS.Tokens.BTC.Btc2Eth) {
      this.deposit(currentTransfer);
      this.PicturePulse(1);
    }
    // Transfer is a withdrawal, load tx and start animation
    if (currentTransfer && currentTransfer.sendToken === RenJS.Tokens.BTC.Eth2Btc) {
        this.withdraw(currentTransfer);
        this.PicturePulse(1);
    }
  }

  /**
   * Will render all tags from React
   * into one webpage and binding the
   * state variables into the frontend.
   * 
   * Formatting is done with CSS
   * in ./App.css
   */
  render = () => {
    const { balance, 
            message, 
            error, 
            walleterror, 
            depositamount, 
            ether, 
            logdeposit, 
            logstatus, 
            logtxhash, 
            logconfirmations, 
          } = this.state;
    return (
      <div className="App">
        <div className="RenContainer">
          <div className="WalletStatusContainer">
            <div className="WalletStatusBar">
              <div className="WalletStatusLeft" >
                <img className="MetamaskPicture" alt="MetaMask" src="./metamask_logo_w.png"></img>
              </div>
              <div className="WalletStatusRight">
                <p className="StatusBarText">{walleterror}</p>
              </div>
            </div>
          </div>
          <div>
            <div className="WalletOverview">
              <div className="WalletOverviewLeft">
                <img id="pic" className="RenPicture" alt="Ren Project" src="./ren_logo_W.png"></img>
              </div>
              <div className="WalletOverviewRight">
                <p className="WalletHeading" >My Wallet</p>
                <p>{balance} BTC</p>
                <p>{ether} ETH</p>
              </div>
            </div>
            <div className="Ren">
                <div className="RenFunctionBar">
                  <button className="RenButton" onClick={() => this.deposit().catch(this.logError)}><span>Deposit {depositamount} BTC</span></button>
                  <button className="RenButton" onClick={() => this.withdraw().catch(this.logError)}><span>Withdraw {balance} BTC</span></button>
                </div>
                <div className="RenStatusBar">
                  <p className="RenStatusBarHeading" >Status Bar:</p>
                  <p>{message}</p>
                  <p>{error}</p>
                </div>
              </div>
          </div>
        </div>
        <div className="OptionWindow">
            <div><button className="OptionButton" onClick={() => this.clearCache()}>Clear Cache</button></div>
            <p></p>
            <div><button className="OptionButton" onClick={() => this.refreshPage()}>Refresh Page</button></div>
            <p></p>
            <div><button className="OptionButton" onClick={() => this.toggleAdvancedMode()}>Advanced View</button></div>
        </div>
        <div className="AdvancedWindow" id="toggle">
            <div className="AdvancedMessageBox">
              <p className="AdvancedHeading" >Attribute Logs</p>
                <div>
                  <p className="AdvancedAttribute">Deposit from the Bitcoin Blockchain:</p>
                  <pre className="PreDeposit">{logdeposit}</pre>
                </div>
                <div>
                  <p className="AdvancedAttribute">Status of the Deposit Transaction:</p>
                  <pre>{logstatus}</pre>
                </div>
                <div>
                  <p className="AdvancedAttribute">Transaction Hash from the Ethereum Blockchain:</p>
                  <pre>{logtxhash}</pre>
                </div>
                <div>
                  <p className="AdvancedAttribute">Receipt will download in Advanced View after full confirmation.</p>
                  <div className="EthTXBar">
                    <progress className="EthTXProgress" id="ethbar" value="0" max="24"></progress>
                  </div>
                  <p className="EthTXText">(currently {logconfirmations}/24)</p>
                </div>
            </div>
          </div>
      </div>
    );
  }

  /**
   * Functions declared within the App class
   */

  /**
   * Loading the current balances of Bitcoin 
   * and Ethereum from the wallets
   * 
   * Asincronus function, so information can be
   * resolved besides the regular program flow
   */
  updateBalances = async () => {
    const { web3 } = this.state;
    const contract = new web3.eth.Contract(ABI, contractAddress);
    const btcbalance = await contract.methods.balance().call();

    var accountaddress = web3.currentProvider.selectedAddress;
    const ethbalance = await web3.eth.getBalance(accountaddress);
    this.setState({ balance: Number(parseInt(btcbalance.toString()) / 10 ** 8).toFixed(6) });
    this.setState({ ether: Number(web3.utils.fromWei(ethbalance)).toFixed(6) });
  }

  /**
   * Save error to state
   * 
   * @param {raw string} error 
   */
  logError = (error) => {
    this.setState({ error: String(( error || {}).message || error) });
    
    // Shorten words to maximum lenght of 40 chars
    var words = this.state.error.split(" ");
    for(var i = 0; i < words.length; i++){
        if (words[i].length >= 40){
          words[i] = words[i].substring(0,37).concat(" ...");
        }
    }
    this.setState({ error: words.join(" ")})
  }

  /**
   * Save wallet related errors to state
   * 
   * @param {raw string} walleterror 
   */
  logMetaMask = (walleterror) => {
    this.setState({ walleterror: String((walleterror || {}).metamask || walleterror) });
  }

  /**
   * Save Current executed process to state
   * 
   * @param {raw string} message 
   */
  log = (message) => {
    this.setState({ message });
  }

  /**
   * Load and Execute a BTC-to-ETH Tokenization
   * with RenJS
   * 
   * Asincronus function, so information can be
   * resolved besides the regular program flow
   * 
   * @param {json, saved in local storage} transfer 
   */
  deposit = async (transfer) => {
    // Reset error and start animation
    this.logError(""); 
    this.PicturePulse(1);

    // Connect state and fetch amount of bitcoins
    const { web3, renJS } = this.state;
    const amount = this.state.depositamount; // BTC

    // If no transfer in local storage, create a new one
    transfer = transfer || {
      // Send BTC from the Bitcoin blockchain to the Ethereum blockchain.
      sendToken: RenJS.Tokens.BTC.Btc2Eth,

      /**
       * Contract we interact with
       * code found at ./ren_contract.sol 
       */
      sendTo: contractAddress,

      // Name and nonce for the function we want to call
      contractFn: "deposit",
      nonce: renJS.utils.randomNonce(),

      // Arguments expected for calling `deposit`
      contractParams: [
        {
          name: "_msg",
          type: "bytes",
          value: web3.utils.fromAscii(`Depositing ${amount} BTC`),
        }
      ],

      // Web3 provider for submitting mint to Ethereum
      web3Provider: web3.currentProvider,
    };

    // Save transaction and initiate mint process
    this.storeTransfer(transfer);
    const mint = renJS.lockAndMint(transfer);
    
    // Show address for transfer of their BTC.
    const gatewayAddress = await mint.gatewayAddress();
    this.log(`Deposit ${amount} BTC to ${gatewayAddress}`);

    // Wait for the Darknodes to detect the BTC transfer.
    const confirmations = 0;
    const deposit = await mint.wait(confirmations)
    .on("deposit", deposit => this.updateAdvancedView(0, deposit));
    
    // Retrieve signature from RenVM.
    this.log("Submitting to RenVM...");
    const signature = await deposit.submit()
      .on("status", status => this.updateAdvancedView(1, status))

    // Submit the signature to Ethereum and receive zBTC.
    this.log("Submitting to smart contract...");
    await signature.submitToEthereum(web3.currentProvider)
      .on("transactionHash", txHash => this.updateAdvancedView(2, txHash))
      .on("confirmation", confirmation => this.updateAdvancedView(3, confirmation))
      .on("receipt", receipt => this.download(JSON.stringify(receipt, null, 4), 'receipt.txt', 'text/plain'));
    this.log(`Deposited ${amount} BTC.`);
    
    // Clear transfer from local storage and stop animation
    this.storeTransfer(undefined);
    this.PicturePulse(0);
  }

  /**
   * Load and Execute a ETH-to-BTC Tokenization
   * with RenJS
   * 
   * Asincronus function, so information can be
   * resolved besides the regular program flow
   * 
   * @param {json, stored in local storage} transfer 
   */
  withdraw = async (transfer) => {
    // Reset error and start animation
    this.logError("");
    this.PicturePulse(1);
  
    // Connect state
    const { web3, renJS, balance } = this.state;
  
    // No current transfer
    if (!transfer) {
      const amount = balance;
      const recipient = prompt("Enter BTC recipient:");
      const from = (await web3.eth.getAccounts())[0];
      const contract = new web3.eth.Contract(ABI, contractAddress);
  
      // Prepare Withdrawal
      this.log("Calling `withdraw` on smart contract...");
      const ethereumTxHash = await new Promise((resolve, reject) => {
        contract.methods.withdraw(
          // Message
          web3.utils.fromAscii(`Depositing ${amount} BTC`),
          // Receiving Address
          RenJS.utils.btc.addressToHex(recipient),
           // Amount in Satoshis
          Math.floor(amount * (10 ** 8)),
        ).send({ from })
          .on("transactionHash", resolve)
          .catch(reject);
      });
  
      // Save transaction in local storage
      transfer = {
        // Send BTC from the Ethereum blockchain to the Bitcoin blockchain.
        sendToken: RenJS.Tokens.BTC.Eth2Btc,

        // The web3 provider to talk to Ethereum
        web3Provider: web3.currentProvider,
  
        // The transaction hash of our contract call
        ethereumTxHash,
      };
      this.storeTransfer(transfer);
    }
  
    // Burn BTC on Ethereum and release BTC on the Bitcoin blockchain
    this.log(`Retrieving burn event from contract...`);
    const burn = await renJS.burnAndRelease({ ...transfer, web3Provider: web3.currentProvider }).readFromEthereum();
  
    // Submit the burn transaction
    this.log(`Submitting to RenVM...`);
    await burn.submit();
  
    this.log(`Withdrew BTC successfully.`);
  
    // Clear transfer from local storage and stop animation
    this.storeTransfer(undefined);
    this.PicturePulse(0);
  }

  /**
   * Store transfer details to local storage
   * 
   * @param {json} transfer 
   */
  storeTransfer = (transfer) => {
    localStorage.setItem("transfer", JSON.stringify(transfer));
  }

  /**
   * Retrieve a transfer's details from 
   * local storage, if there is one
   * 
   * Will return undefined json object
   * if no current transaction
   */
  getTransfer = () => {
    try {
      return JSON.parse(localStorage.getItem("transfer"));
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Option Window Function: 
   * Manually refresh Page
   * from frontend
   */
  refreshPage = () => {
    window.location.reload();
  }

  /**
   * Option Window Function:
   * Manually wipe current transaction 
   * which is saved in local storage
   */
  clearCache = () => {
    this.storeTransfer(undefined);
    this.refreshPage();
  }

  /**
   * Option Window Function:
   * Open the Advanced View for extra information about the 
   * current deposit transaction and to download the receipt
   */
  toggleAdvancedMode = () => {
    var target = document.getElementById("toggle");
    if (target.style.display === "none") {
      target.style.display = "block";
    } 
    else {
      target.style.display = "none";
    }
  }

  /**
   * Write received transaction metadata
   * into Advanced View frontend
   * 
   * @param {int} attrNumber 
   * @param {json} attrInfo 
   */
  updateAdvancedView(attrNumber, attrInfo) {

    // Format attributes within json keys
    var jsonkeys = [];
    for(var key in attrInfo) {
      if(attrNumber !== 4 && attrInfo[key].toString().length >= 100){
        attrInfo[key] = attrInfo[key].substring(0,97).concat(" ...");
      }
      jsonkeys.push(key);
      if(attrNumber !== 4 && typeof attrInfo[key] === "object") {
        var jsonsubkeys = this.updateAdvancedView(attrNumber, attrInfo[key]);
        jsonkeys = jsonkeys.concat(jsonsubkeys.map(function(subkey) {
            if(attrInfo[key][subkey].toString().length >= 100){
              attrInfo[key][subkey] = attrInfo[key][subkey].substring(0,20).concat(" ...");
            }
          return `${key}.${subkey}`;
        }));
      }
    }
    // Write formated attributes into state
    switch(attrNumber){
      case 0: 
        this.setState({ logdeposit: JSON.stringify(attrInfo, undefined, 2) });
        break;
      case 1: 
        this.setState({ logstatus: JSON.stringify(attrInfo, undefined, 2) });
        break;
      case 2: 
        this.setState({ logtxhash: JSON.stringify(attrInfo, undefined, 2) });
        break;
      case 3: 
        this.setState({ logconfirmations: JSON.stringify(attrInfo, undefined, 2) });
        this.updateEthBar();
        break;
      case 4: 
        this.setState({ logreceipt: JSON.stringify(attrInfo, undefined, 2) });
        break;
      default:
        this.logError("Advanced View could not be updated with format");
    }
    return jsonkeys;
  }

  /**
   * Download attribute information into file
   * 
   * Used in Advanced View for Receipt to
   * be downloaded automatically
   * 
   * @param {json} content 
   * @param {string, [name].[ending]} fileName 
   * @param {string} contentType 
   */
  download(content, fileName, contentType) {

    // Preperating file
    var a = document.createElement("a");
    var file = new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;

    // When active, initiate download
    var target = document.getElementById("toggle");
    if (target.style.display === "block") {
      a.click();
    } 
    // Remove link for future deposits
    URL.revokeObjectURL(a.href)
  }

  /**
   * Start a Listener to catch 'unhandledrejection' Error.
   * 
   * This may happen from wrong inputs or transactions from
   * withdraw(). The transaction is revoked automatically
   * by renJS and cleared from local storage. Due to less
   * overhead compared to GatewayJS, manual catching may
   * be needed in certain cases. 
   */
  CatchUndefError(){
    // Start listener
    window.addEventListener('unhandledrejection', function(event) {
      
      // Clear local storage
      localStorage.setItem("transfer", JSON.stringify(undefined));

      // Reload Window without stuck error and pending animation
      window.location.reload();
      this.PicturePulse(0);
    });
  }

  /**
   * Animates the logo from RenProject within the Wallet
   * to indicate there is a pending transaction saved
   * in local storage
   * 
   * @param {boolean, indicates activity} bool 
   */
  PicturePulse(bool) {
    // Enable animation
    if(bool === 1){
      document.getElementById("pic").className="RenPicture PicturePulse"
    }
    else{
      document.getElementById("pic").className="RenPicture"
    }
  }

  /**
   * Update the progress bar which shows the status of
   * transaction confirmations on the Ethereum blockchain
   */
  updateEthBar() {
    document.getElementById("ethbar").setAttribute("value", this.state.logconfirmations);
  }
}
export default App;