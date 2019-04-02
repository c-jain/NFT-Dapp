const RandomGraphToken = artifacts.require("./RandomGraphToken");


module.exports = function(deployer) {
  deployer.deploy(RandomGraphToken);
};
