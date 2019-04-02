import "./app.css";
import Web3 from "web3";
import randomGraphTokenArtifact from "../../build/contracts/RandomGraphToken.json";

const ipfsAPI = require('ipfs-api');
const ipfs = ipfsAPI({host: 'ipfs.infura.io', port: '5001', protocol: 'https'});

const App = {
  web3: null,
  account: null,
  randomGraphToken: null,
  contractAddress: null,

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

      // get accounts
      const accounts = await web3.eth.getAccounts();
      this.account = accounts[0];

      //this.temp();
    } catch (error) {
      console.error("Could not connect to contract or chain.");
    }
  },

  createSVG: async function() {
    $(".create-token").click(function(event) {
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
          uploadJSONMetaData("https://ipfs.io/ipfs/" + response[1].hash + "/graph.svg");
        })
      }, 5000);
    });

    function uploadJSONMetaData(imageURL) {
      var jsonData = {
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
      ipfs.add(Buffer.from(JSON.stringify(jsonData)))
      .then((response) => {
        console.log(response);
        createToken("https://ipfs.io/ipfs/" + response[0].hash);
      });
    }

    function parseGraphAttributes() {
     var e = document.getElementById("graph-type");
     var graphType = e.options[e.selectedIndex].value;
     var charge = $("#charge-dist").html();
     var linkDistance = $("#link-dist").html();
     var textFields = $("#params input");
     var r = null;
     var h = null;
     var n = null;
     var mo = null;
     var m = null;
     var p = null;
     var k = null;
     var alpha = null;
     var beta = null;

     if (graphType == 'BalancedTree') {
      r = textFields[0].value;
      h = textFields[1].value;
     } else if (graphType == 'BarabasiAlbert') {
      n = textFields[0].value;
      mo = textFields[1].value;
      m = textFields[2].value;
     } else if (graphType == 'ErdosRenyi.np') {
      n = textFields[0].value;
      p = textFields[1].value;
     } else if (graphType == 'ErdosRenyi.nm') {
      n = textFields[0].value;
      m = textFields[1].value;
     } else if (graphType == 'WattsStrogatz.alpha') {
      n = textFields[0].value;
      k = textFields[1].value;
      alpha = textFields[2].value;
     } else if (graphType == 'WattsStrogatz.beta') {
      n = textFields[0].value;
      k = textFields[1].value;
      beta = textFields[2].value;
     }
     return {
      graphType: graphType,
      charge: charge,
      linkDistance: linkDistance,
      graphVars: [r, h, n, mo, m, p, k, alpha, beta]
     }
    }

    function createToken(metaDataURL) {
      let attributes = parseGraphAttributes();
      const { createUniqueArt } = this.randomGraphToken.methods;
      createUniqueArt(web3.utils.asciiToHex(attributes.graphType), attributes.charge, attributes.linkDistance,
        attributes.graphVars, metaDataURL).send({gas: 4700000, from: this.account}).then((f) => {
          console.log("Token successfully created");  
        });
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
