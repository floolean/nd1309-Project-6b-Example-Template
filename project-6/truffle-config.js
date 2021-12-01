const PRIVKEY = process.env['PRIVKEY'];
const INFURAKEY = process.env['INFURAKEY'];
const HDWalletProvider = require("@truffle/hdwallet-provider");

let configs = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "5777" // Match any network id
    }
  }
};

if (PRIVKEY && INFURAKEY) {
	configs.networks['rinkeby'] =
	{
		provider: function() { 
			return new HDWalletProvider([PRIVKEY], INFURAKEY);
		 },
		 network_id: 4
	};
}

module.exports = configs;