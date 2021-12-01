App = {
	web3Provider: null,
	contracts: {},
	emptyAddress: "0x0000000000000000000000000000000000000000",
	sku: 0,
	upc: 0,
	metamaskAccountID: "0x0000000000000000000000000000000000000000",
	ownerID: "0x0000000000000000000000000000000000000000",
	originFarmerID: "0x0000000000000000000000000000000000000000",
	originFarmName: null,
	originFarmInformation: null,
	originFarmLatitude: null,
	originFarmLongitude: null,
	productNotes: null,
	productPrice: 0,
	distributorID: "0x0000000000000000000000000000000000000000",
	retailerID: "0x0000000000000000000000000000000000000000",
	consumerID: "0x0000000000000000000000000000000000000000",
	web3ProviderURL: "",
	contractAddress: "",
	jsonSupplyChain: "./SupplyChain.json",

	init: async function (clear) {

		App.readForm();

		let settingsJson = window.localStorage['settings'] || '{"web3ProviderURL":"","contractAddress":""}';
		let settings = JSON.parse(settingsJson);

		async function init(e){
			try {
				if (e){
					settings.web3ProviderURL = $('#web3ProviderURL').val();
					settings.contractAddress = $('#contractAddress').val();
				}
				await App.initWeb3(settings);
				await App.getMetaskAccountID();
				await App.initSupplyChain(settings);
				
				window.localStorage['settings'] = JSON.stringify(settings);
				App.bindEvents();
				$('.main').fadeIn();
				$('#contractAddressRO').text(settings.contractAddress + ' (unlink)');
				App.settings = settings;

			} catch (err) {
				App.handleError(err,App.init);
			}
		}

		if ((settings.web3ProviderURL.length == 0 || settings.contractAddress.length == 0) || clear){
			$('#providerModal')
				.one('click','.save',init)
				.one('click','#deployContract', App.deploy)
				.modal();
		}
		else {
			init();
		}
	},

	deploy: async function() {

		const web3ProviderURL = $('#web3ProviderURL').val();
		const web3 = await App.getWeb3(web3ProviderURL);
		web3.eth.getAccounts(function (err, res) { 
			if (err) return App.handleError(err,App.init);
			if(res.length == 0) {
				return App.handleError(new Error('No account selected.'),App.init);
			} 
			var account = res[0];
			App.loading(true,'Deploying contract..');
			var result = new web3.eth.Contract(App.SupplyChainArtifact.abi)
			.deploy({data:App.SupplyChainArtifact.bytecode})
			.send({from:account})
			.then(contract=>{
				window.localStorage['settings'] = JSON.stringify({web3ProviderURL:web3ProviderURL,contractAddress:contract.options.address});
				App.init();
			})
			.catch(App.handleError); // '0x33cc555402163Ab11a48BE7b7d9Ce7E72C13008a'//data.networks[Object.keys(data.networks)[1]].address);
		});
	},

	readForm: function () {
		App.sku = $("#sku").val();
		App.upc = $("#upc").val();
		App.ownerID = $("#ownerID").val();
		App.originFarmerID = $("#originFarmerID").val();
		App.originFarmName = $("#originFarmName").val();
		App.originFarmInformation = $("#originFarmInformation").val();
		App.originFarmLatitude = $("#originFarmLatitude").val();
		App.originFarmLongitude = $("#originFarmLongitude").val();
		App.productNotes = $("#productNotes").val();
		App.productPrice = $("#productPriceRO").val();
		App.distributorID = $("#distributorID").val();
		App.retailerID = $("#retailerID").val();
		App.consumerID = $("#consumerID").val();
	},

	getWeb3: async function(providerURL){
		let web3Provider = null;
		if (window.ethereum) {
			web3Provider = window.ethereum;
			try {
				// Request account access
				await window.ethereum.request({ method: 'eth_requestAccounts' });
				return new Web3(web3Provider);
			} catch (error) {
				// User denied account access...
				console.error("User denied account access");
				App.handleError(err);
			}
		}
		// Legacy dapp browsers...
		else if (window.web3) {
			web3Provider = window.web3.currentProvider;
			return new Web3(web3Provider);
		}
		// If no injected web3 instance is detected, fall back to Ganache
		else {
			App.web3Provider = new Web3.providers.HttpProvider(providerURL);
			return new Web3(web3Provider);
		}
		return null;
	},

	initWeb3: async function (settings) {
		/// Find or Inject Web3 Provider
		/// Modern dapp browsers...
		if (window.ethereum) {
			App.web3Provider = window.ethereum;
			try {
				// Request account access
				await window.ethereum.request({ method: 'eth_requestAccounts' });
			} catch (error) {
				// User denied account access...
				console.error("User denied account access");
				App.handleError(err);
			}
		}
		// Legacy dapp browsers...
		else if (window.web3) {
			App.web3Provider = window.web3.currentProvider;
		}
		// If no injected web3 instance is detected, fall back to Ganache
		else {
			App.web3Provider = new Web3.providers.HttpProvider(
				settings.web3ProviderURL
				//"http://localhost:7545"
			);
		}
		window.web3 = new Web3(App.web3Provider);
			
	},

	getMetaskAccountID: function () {

		// Retrieving accounts
		return web3.eth.getAccounts(function (err, res) {
			if (err) {
				console.log("Error:", err);
				return;
			}
			//console.log("getMetaskID:", res);
			App.metamaskAccountID = res[0];
			if (App.contracts.SupplyChain && App.contracts.SupplyChain.methods)
			App.contracts.SupplyChain.methods.isOwner().call({from:App.metamaskAccountID})
			.then(isOwner=>{
				$('#acc').text(App.metamaskAccountID + (isOwner ? " (OWNER)" : ""));
			});
		});
	},

	initSupplyChain: function (settings) {
		/// Source the truffle compiled smart contracts
		App.contracts.SupplyChain = new web3.eth.Contract(App.SupplyChainArtifact.abi, settings.contractAddress); // '0x33cc555402163Ab11a48BE7b7d9Ce7E72C13008a'//data.networks[Object.keys(data.networks)[1]].address);
		App.contracts.SupplyChain.setProvider(App.web3Provider);
		App.fetchEvents();
		App.lookupItem();
	},

	bindEvents: function () {
		if (this.eventsBound) return;
		$(document).on("click", App.handleButtonClick);
		$(document).on('click','.role.active',function(e){
			let span = $(this);
			let role = span.attr('id').substr(4);
			$('#confirmationModal').find('.message').text('Do you want to renounce this role?');
			$('#confirmationModal').modal().one('click','.confirm',function(e){
				App.renounceRole(role);
			});
		});
		$(document).on('click','#contractAddressRO',function(e){
			$('#web3ProviderURL').val(App.settings.web3ProviderURL);
			$('#contractAddress').val(App.settings.contractAddress);
			delete window.localStorage['settings'];
			delete App.settings;
			$('.main').fadeOut();
			App.init();
		});
		App.loading(false);
		setInterval(App.refresh,1000);
		this.eventsBound = true;
	},

	handleButtonClick: async function (event) {

		var processId = $(event.target).data("id");
		if (!processId) return;

		event.preventDefault();

		console.log("processId", processId);

		App.loading();

		switch (processId) {
			case 1:
				return await App.harvestItem(event);
			case 2:
				return await App.processItem(event);
			case 3:
				return await App.packItem(event);
			case 4:
				return await App.sellItem(event);
			case 5:
				return await App.buyItem(event);
			case 6:
				return await App.shipItem(event);
			case 7:
				return await App.receiveItem(event);
			case 8:
				return await App.purchaseItem(event);
			case 9:
				return await App.lookupItem();
			case "addRole":
				return await App.addRole();
		}
	},
	refresh: function(){
		App.getMetaskAccountID();
		App.contracts.SupplyChain.methods.getRoles().call({from:App.metamaskAccountID})
		.then(roles=>{

			$('.roles').find('.role').each((idx,item)=>{
				item = $(item);
				var hasRole = roles[idx];
				if (hasRole) item.addClass('active');
				else item.removeClass('active');
			});
		});
	},
	handleError: function(err,callback){
		callback = callback || function() {};
		console.error(err);
		$('#errorModal').find('.error').text(err.message || err);
		$('#errorModal').one('click','.close',function(){
			setTimeout(callback,1000);
		}).modal();
		App.loading(false);
	},
	loading: function(show=true,text=""){
		if (show){
			$('.loadingText').text(text);
			$('.loading').fadeIn();
		}
		else {
			$('.loading').fadeOut();
		}
	},
	addRole: async function(){
		const selectedRole = $( "#role option:selected" ).text();
		const addRoleMethodName = 'add' + selectedRole;
		const roleAddress = $('#roleAddress').val();
		const method = App.contracts.SupplyChain.methods[addRoleMethodName];
		if (method){
			method(roleAddress).send({from:App.metamaskAccountID})
			.catch(App.handleError);
		}
	},
	renounceRole: async function(role){
		let methodName = 'renounce' + role;
		const method = App.contracts.SupplyChain.methods[methodName];
		if (method){
			method().send({from:App.metamaskAccountID})
			.catch(App.handleError);
		}
	},
	lookupItem: async function(_sku){
		try {
			App.sku = _sku | $('#sku').val();
			const stateMapping = ['Harvested','Processed','Packed','ForSale','Sold','Shipped','Received','Purchased'];
			const buffer1 = await App.contracts.SupplyChain.methods.fetchItemBufferOne(App.sku).call();
			const buffer2 = await App.contracts.SupplyChain.methods.fetchItemBufferTwo(App.sku).call();
			$('#sku').val(buffer1.itemSKU);
			$('#upc').val(buffer1.itemUPC);
			$('#upcRO').val(buffer1.itemUPC);
			$('#originFarmInformation').val(buffer1.originFarmInformation);
			$('#originFarmLatitude').val(buffer1.originFarmLatitude);
			$('#originFarmLongitude').val(buffer1.originFarmLongitude);
			$('#originFarmName').val(buffer1.originFarmName);
			$('#originFarmerID').val(buffer1.originFarmerID);
			$('#ownerID').val(buffer1.ownerID);

			$('#state').val(stateMapping[buffer2.itemState]);
			$('#consumerID').val(buffer2.consumerID);
			$('#distributorID').val(buffer2.distributorID);
			$('#productID').val(buffer2.productID);
			$('#productNotes').val(buffer2.productNotes);
			$('#productNotesRO').val(buffer2.productNotes);
			$('#productPrice').val(web3.utils.fromWei(buffer2.productPrice,"ether"));
			$('#productPriceRO').val(web3.utils.fromWei(buffer2.productPrice,"ether"));
			$('#retailerID').val(buffer2.retailerID);

			App.fetchEvents();
			App.loading(false);	

		} catch (err) {
			App.handleError(err);
		}

	},
	harvestItem: function (event) {
		App.readForm();
		App.contracts.SupplyChain.methods.harvestItem(
					App.upc,
					App.metamaskAccountID,
					App.originFarmName,
					App.originFarmInformation,
					App.originFarmLatitude,
					App.originFarmLongitude,
					App.productNotes
		).send({ from: App.metamaskAccountID })
		.on('receipt',receipt=>{
			if (receipt.events.Harvested && receipt.events.Harvested.returnValues.sku){
				App.sku = receipt.events.Harvested.returnValues.sku;
				$('#sku').val(App.sku);
			}
			App.fetchEvents();
			App.lookupItem();
			App.fetchItemBufferOne();
			App.fetchItemBufferTwo();
			App.loading(false);
		})
		.catch(App.handleError);
	},

	processItem: function (event) {

		App.contracts.SupplyChain.methods.processItem(App.sku).send({ from: App.metamaskAccountID })
		.then(function (result) {
			App.lookupItem();
		})
		.then(()=>App.loading(false))
		.catch(App.handleError);
	},

	packItem: function (event) {

		App.contracts.SupplyChain.methods.packItem(App.sku).send({ from: App.metamaskAccountID })
		.then(function (result) {
			App.lookupItem();
		})
		.then(()=>App.loading(false))
		.catch(App.handleError);
	},

	sellItem: function (event) {
		$('#sellItemModal').one('click','#sellItem',function(e){
			const price = web3.utils.toWei($('#productPriceForSale').val(),"ether");
			App.contracts.SupplyChain.methods.sellItem(App.sku,price).send({ from: App.metamaskAccountID })
			.then(function (result) {
				App.lookupItem();
			})
			.then(()=>App.loading(false))
			.catch(App.handleError);
		}).modal();
	},

	buyItem: function (event) {
		const price = web3.utils.toWei($('#productPriceRO').val(),"ether");
		App.contracts.SupplyChain.methods.buyItem(App.sku).send({ from: App.metamaskAccountID, value: price })
		.then(function (result) {
			App.lookupItem();
		})
		.then(()=>App.loading(false))
		.catch(App.handleError);
	},

	shipItem: function (event) {
		App.contracts.SupplyChain.methods.shipItem(App.sku).send({ from: App.metamaskAccountID })
		.then(function (result) {
			App.lookupItem();
		})
		.then(()=>App.loading(false))
		.catch(App.handleError);
	},

	receiveItem: function (event) {
		App.contracts.SupplyChain.methods.receiveItem(App.sku).send({ from: App.metamaskAccountID })
		.then(function (result) {
			App.lookupItem();
		})
		.then(()=>App.loading(false))
		.catch(App.handleError);
	},

	purchaseItem: function (event) {
		const price = web3.utils.toWei($('#productPriceRO').val(),"ether");
		App.contracts.SupplyChain.methods.purchaseItem(App.sku).send({ from: App.metamaskAccountID, value:price })
		.then(function (result) {
			App.lookupItem();
		})
		.then(()=>App.loading(false))
		.catch(App.handleError);
	},

	fetchItemBufferOne: function () {
		App.sku = $("#sku").val();

		App.contracts.SupplyChain.methods.fetchItemBufferOne(App.sku).call()
		.then(function (result) {
			$("#ftc-item").text(result);
		})
		.catch(App.handleError);
	},

	fetchItemBufferTwo: function () {
		App.contracts.SupplyChain.methods.fetchItemBufferTwo(App.sku).call()
		.then(function (result) {
			$("#ftc-item").text(result);
		})
		.catch(App.handleError);
	},

	fetchEvents: function () {
		if (
			typeof App.contracts.SupplyChain.currentProvider.sendAsync !== "function"
		) {
			App.contracts.SupplyChain.currentProvider.sendAsync = function () {
				return App.contracts.SupplyChain.currentProvider.send.apply(
					App.contracts.SupplyChain.currentProvider,
					arguments
				);
			};
		}


		var events = App.contracts.SupplyChain.getPastEvents("allEvents",{fromBlock:'earliest'},function (err, events) {
			if (!err){
				$("#ftc-events").children().remove();
				for(let i = events.length - 1; i > events.length - 6; --i){
					let event = events[i];
					$("#ftc-events").append(
						"<li>" + event.event + '<br/><span style="font-size: 10px;">TX: ' + event.transactionHash + '<br/>Block: ' + event.blockNumber + "</span></li>"
					);
				}
			}
			else 
				App.handleError(err);				
				
		});

	},
};

$(function () {
	$(window).load(function () {
		$.getJSON(App.jsonSupplyChain).then((data) => {
			App.SupplyChainArtifact = data;
			App.init();
		});
		
	});
});
