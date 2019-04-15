import "./app.css";
import Web3 from "web3";
import randomGraphTokenArtifact from "../../build/contracts/RandomGraphToken.json";
import simpleExchangeArtifact from "../../build/contracts/SimpleExchange.json";

const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI({host: 'ipfs.infura.io', port: '5001', protocol: 'https'});

const App = {
  web3: null,
  account: null,
  randomGraphToken: null,
  simpleExchange: null,
  contractAddress: null,
  contractAddress1:null,

  start: async function() {
    const { web3 } = this;

    try {
      // get contract instance
      const networkId = await web3.eth.net.getId();
      const deployedNetwork = randomGraphTokenArtifact.networks[networkId];
      this.contractAddress = deployedNetwork.address;
      this.randomGraphToken = new web3.eth.Contract(
        randomGraphTokenArtifact.abi,
        deployedNetwork.address,
      );
      const deployedNetwork1 = simpleExchangeArtifact.networks[networkId];
      this.contractAddress1 = deployedNetwork1.address;
      this.simpleExchange = new web3.eth.Contract(
        simpleExchangeArtifact.abi,
        deployedNetwork1.address,
      );

      // get accounts
      const accounts = await web3.eth.getAccounts();
      this.account = accounts[0];

      await this.renderToken();
      
    } catch (error) {
      console.log(error);
      console.error("Could not connect to contract or chain.");
    }
  },

  renderToken: async function() {
    const { web3 } = this;
    if(new URLSearchParams(window.location.search).get('filter') === 'owned') {
      await App.renderExchangeDetails();
      const { balanceOf } = this.randomGraphToken.methods;
      var balance = await balanceOf(this.account).call();
      if(balance == 0) {
        $("#nft-list").addClass("alert alert-danger").html("You don't have any tokens. Create one now!");
      } else {
        for(var i=0; i < balance; i++) {
          const { tokenOfOwnerByIndex } = this.randomGraphToken.methods;
          var id = await tokenOfOwnerByIndex(this.account, i).call();
          const { tokenURI } = this.randomGraphToken.methods;
          var uri = await tokenURI(id).call();
          setTimeout(function() {
            $.getJSON(uri, function(data) {
              App.displayToken(id, data, uri);
            });
          }, 10000);
        }
      }
    } else {
        $("#approve-div").hide();
        const { totalSupply } = this.randomGraphToken.methods;
        var numberOfNFTs = await totalSupply().call();
        for(var i=0; i<numberOfNFTs; i++) {
          const { tokenByIndex } = this.randomGraphToken.methods;
          var id = await tokenByIndex(i).call();
          const { tokenURI } = this.randomGraphToken.methods;
          var uri = await tokenURI(id).call();
          setTimeout(function() {
            $.getJSON(uri, function(data) {
              App.displayToken(id, data, uri);
            });
          }, 10000);
        }
    }
  },

  renderExchangeDetails: async function() {
    const { web3 } = this;
    const { isApprovedForAll } = this.randomGraphToken.methods;
    var approved = await isApprovedForAll(this.account, App.simpleExchange._address).call();
    if(approved == true) {
      $("#msg").addClass("alert alert-success").html("You have approved the exchange to sell tokens on your behalf!");
      $("#approve-div").hide();
    } else {
      $("#msg").addClass("alert alert-danger").html("Approve the exchange to sell tokens on your behalf");
    }
  },

  displayToken: async function(tokenId, metaData, uri) {
    const { web3 } = this;
    var node = $("<div/>");
    node.addClass("col-sm-3 text-center col-margin-bottom-1 product");
    node.append("<img src='" + metaData.properties.image.description + "' />");
    node.append("<a href='" + metaData.properties.image.description + "' target='_blank'>Full Size</a>");
    node.append("<br>");
    node.append("<a href='" + uri + "' target='_blank'>Metadata</a>");
    
    const { isApprovedForAll } = this.randomGraphToken.methods;
    var approved = await isApprovedForAll(this.account, App.simpleExchange._address).call();
    if(approved == true) {
      await App.renderPriceBox(tokenId, node);
    } else {
      const { listingPrice } = this.simpleExchange.methods;
      var result = await listingPrice(tokenId).call();
      if(result > 0) {
        await App.renderPurchaseButton(tokenId, node);      
      }
    }

    $("#nft-list").append(node);
  },

  renderPurchaseButton: async function(tokenId, node) {
    const { web3 } = this;
    const { listingPrice } = this.simpleExchange.methods;
    var price = await listingPrice(tokenId).call();
    var etherPrice = web3.utils.fromWei(price, 'ether');
    node.append("<div><a href='#' class='btn btn-primary buy-token' onclick='App.buyingToken(" + tokenId + ", " + price + "); return false;' data-token='" + tokenId + "' data-price='" + price + "'>Buy for " + etherPrice + "Ether </a></div>");
  },

  renderPriceBox: async function(tokenId, node) {
    const { web3 } = this;
    const { listingPrice } = this.simpleExchange.methods;
    var result = await listingPrice(tokenId).call();
    if(result > 0) {
      var price = await listingPrice(tokenId).call();
      node.append("<div>Token sale for " + web3.utils.fromWei(price, 'ether') + " Ether</div>");
    } else {
      node.append("<div><input id='token-" + tokenId + "' placeholder='0.1'><a href='#' class='btn btn-primary list-token' onclick='App.listingToken(" + tokenId + "); return false;' data-token='" + tokenId + "'>List for Sale</a></div>");
    }
  }, 

  listingToken: async function(tokenId) {
    const { web3 } = this;
    const { listToken } = App.simpleExchange.methods;
    var price = $("#token-" + tokenId).val();
    await listToken(tokenId, web3.utils.toWei(price, 'ether')).send({gas: 4700000, from: this.account});
    alert("Your NFT has been listed for sale!");
    location.reload("/");
  },

  buyingToken: async function(tokenId, price) {
    const { web3 } = this;
    const { buyToken } = this.simpleExchange.methods;
    await buyToken(tokenId).send({gas: 4700000, value: price,from: this.account});
    alert("You have successfully purchased the NFT!");
    location.reload("/");
  },

  setApproval: async function() {
    const { web3 } = this;
    const { setApprovalForAll } = this.randomGraphToken.methods;
    await setApprovalForAll(App.simpleExchange._address, true).send({gas: 4700000, from: this.account});
    alert("You have successfully approved the exchange to sell tokens on your behalf!");
    location.reload();
  },

  createNFT: async function() {
    var blob = saveSVG();
    console.log(blob);
    var reader = new window.FileReader();
    reader.readAsArrayBuffer(blob);
    setTimeout(function() {
      var val = Buffer.from(reader.result);
      const data = {path: 'graph.svg', content: val}
      ipfs.add(data, {wrapWithDirectory: true})
      .then((response) => {
        console.log(response);
        App.uploadJSONMetaData("https://ipfs.io/ipfs/" + response[1].hash + "/graph.svg"); 
      })
    }, 5000);  
  },

  uploadJSONMetaData: async function(imageURL) {
      let jsonData = {
        "title": "Asset Metadata",
        "type": "object",
        "properties": {
            "name": {
                "type": "string",
                "description": "Random Graph Token"
            },
            "description": {
                "type": "string",
                "description": "NFT to represent Random Graph"
            },
            "image": {
                "type": "string",
                "description": imageURL
            }
        }
      }
      ipfs.add(Buffer.from(JSON.stringify(jsonData))).then(function(value) {
        console.log("hash",value);
        App.createToken("https://ipfs.io/ipfs/" + value[0].hash);
      });
    },

  createToken: async function(metaDataURL) {
    const { web3 } = this;
    var attributes = App.parseGraphAttributes();
    const { createUniqueArt } = this.randomGraphToken.methods;
    createUniqueArt(web3.utils.asciiToHex(attributes.graphType), attributes.charge, attributes.linkDistance,
                          attributes.graphVars, metaDataURL).send({gas: 4700000, from: this.account});
    console.log("Token successfully created");
  },

  parseGraphAttributes: function() {
   var e = document.getElementById("graph-type");
   var graphType = e.options[e.selectedIndex].value;
   var charge = $("#charge-dist").html();
   var linkDistance = $("#link-dist").html();
   var textFields = $("#params input");
   var r = 0;
   var h = 0;
   var n = 0;
   var mo = 0;
   var m = 0;
   var p = 0;
   var k = 0;
   var alpha = 0;
   var beta = 0;

   if (graphType == 'BalancedTree') {
    r = parseInt(textFields[0].value);
    h = parseInt(textFields[1].value);
   } else if (graphType == 'BarabasiAlbert') {
    n = parseInt(textFields[0].value);
    mo = parseInt(textFields[1].value);
    m = parseInt(textFields[2].value);
   } else if (graphType == 'ErdosRenyi.np') {
    n = parseInt(textFields[0].value);
    p = parseInt(textFields[1].value);
   } else if (graphType == 'ErdosRenyi.nm') {
    n = parseInt(textFields[0].value);
    m = parseInt(textFields[1].value);
   } else if (graphType == 'WattsStrogatz.alpha') {
    n = parseInt(textFields[0].value);
    k = parseInt(textFields[1].value);
    alpha = parseInt(textFields[2].value);
   } else if (graphType == 'WattsStrogatz.beta') {
    n = parseInt(textFields[0].value);
    k = parseInt(textFields[1].value);
    beta = parseInt(textFields[2].value);
   }
   return {
    graphType: graphType,
    charge: charge,
    linkDistance: linkDistance,
    graphVars: [r, h, n, mo, m, p, k, alpha, beta]
   }
  }
};

window.App = App;

window.addEventListener("load", function() {
  if (window.ethereum) {
    // use MetaMask's provider
    App.web3 = new Web3(window.ethereum);
    window.ethereum.enable(); // get permission to access accounts
  } else {
    console.warn(
      "No web3 detected. Falling back to http://127.0.0.1:9545. You should remove this fallback when you deploy live",
    );
    // fallback - use your fallback strategy (local node / hosted node + in-dapp id mgmt / fail)
    App.web3 = new Web3(
      new Web3.providers.HttpProvider("http://127.0.0.1:8545"),
    );
  }

  App.start();
});
