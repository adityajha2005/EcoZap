App = {
  loading: false,
  contracts: {},
  account: "",

  load: async () => {
    console.log("App connecting...");
    await App.loadWeb3();
    await App.loadAccount();
    await App.loadContracts();
    return false;
  },

  loadWeb3: async () => {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
      } catch (error) {
        console.error("User denied account access");
        alert("Please connect to MetaMask to use this dapp.");
        return;
      }
    } else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    } else {
      console.log("No web3 instance detected, using Ganache");
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(App.web3Provider);

    try {
      const accounts = await web3.eth.getAccounts();
      App.account = accounts[0];
      console.log("Connected account:", App.account);
    } catch (error) {
      console.error("Failed to get accounts", error);
      alert("Failed to connect to your Ethereum account. Please check your wallet connection.");
    }
  },

  loadAccount: async () => {
    try {
      const accounts = await web3.eth.getAccounts();
      App.account = accounts[0];
      console.log("Current account:", App.account);
    } catch (error) {
      console.error("Error loading account:", error);
    }
  },

  loadContracts: async () => {
    try {
      // Load UserAuth contract
      const UserContract = await $.getJSON("/contracts/UserAuth.json");
      const contractAddress = "0x8e100AD19008Cb9726451928d4F5Df3B5D83a6c8";
      App.contracts.user = new web3.eth.Contract(UserContract.abi, contractAddress);

      // Load Emission contract
      const emissionContract = await $.getJSON("/contracts/Emission.json");
      const emissionContractAddress = "0x1CAb1d9C91C23a98c1488b18A9C6B7052d9CB594";
      App.contracts.emission = new web3.eth.Contract(emissionContract.abi, emissionContractAddress);

      // Load GreenCreditToken contract
      const GreenCreditToken = await $.getJSON("/contracts/GreenCreditToken.json");
      const greenCreditTokenAddress = "0x8dE7038D635CD4cE9421975b7AA958F8d814ff2E";
      App.contracts.token = new web3.eth.Contract(GreenCreditToken.abi, greenCreditTokenAddress);

      // Load KYC contract
      const KYCContract = await $.getJSON("/contracts/KYC.json");
      const KYCContractAddress = "0xec0d905264cF3d42A45247bC00080DBB8820ED52";
      App.contracts.kyc = new web3.eth.Contract(KYCContract.abi, KYCContractAddress);

      console.log("Contracts loaded successfully");
    } catch (error) {
      console.error("Error loading contracts:", error);
    }
  },

  connectWalletRegister: async () => {
    await App.load();
    const data = {
      name: document.getElementById("register_name").value,
      role: document.getElementById("register_role").value,
      authority: document.getElementById("register_authority").value,
      wallet_id: App.account
    };

    try {
      if (data.role == "government") {
        await App.contracts.token.methods.grantGovernmentPrivilege(App.account).send({ from: App.account });
      } else if (data.role == "industry") {
        await App.contracts.token.methods.grantIndustryPrivilege(App.account).send({ from: App.account });
      }

      await App.contracts.user.methods.setUser(data.wallet_id, data.name, data.role, data.authority).send({ from: App.account });

      const response = await fetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-type": "application/json;charset=UTF-8" },
      });

      if (response.ok) {
        const result = await response.json();
        alert(data.name + " Welcome to the EcoZap EcoSystem");
        window.location.href = data.role == "industry" ? `/ipfs/kyc-file-upload` : `/dashboard`;
      } else {
        throw new Error("Registration failed");
      }
    } catch (error) {
      console.error("Error during registration:", error);
      alert("Registration failed. Please try again.");
    }
  },

  // ... (rest of the methods remain the same)

  // Example of an updated method:
  EmissionMark: async () => {
    await App.load();

    const walletID = document.getElementById("walletID").value;
    const co2 = document.getElementById("co2").value;
    const emissionDate = document.getElementById("emissionDate").value.toString();
    const etherValue = web3.utils.toWei((parseFloat(0.001) * parseFloat(co2)).toString(), "ether");

    try {
      const result = await App.contracts.emission.methods
        .createEmissionData(walletID, co2, emissionDate)
        .send({ from: App.account, value: etherValue });

      console.log("Emission marked:", result);

      await App.contracts.token.methods.burnToken(App.account, 1).send({ from: App.account });

      alert("Emission marked successfully!");
      window.location.href = "/mark-co2";
    } catch (error) {
      console.error("Error marking emission:", error);
      alert("Failed to mark emission. Please try again.");
    }
  },

  // ... (update other methods similarly)

};

// Initialize the app
$(function() {
  $(window).load(function() {
    App.load();
  });
});