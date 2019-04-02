pragma solidity >=0.5.0 <0.6.0;
import "./../app/node_modules/openzeppelin-solidity/contracts/token/ERC721/ERC721Full.sol";

contract RandomGraphToken is ERC721Full {

	uint public index;

	struct Graph {
		bytes32 graphType;
		uint[9] graphAttributes;
		uint charge;
		uint linkDistance;
		address creator;
	}	

	uint32[15] public cooldowns = [
		uint32(1 minutes),
		uint32(2 minutes),
		uint32(5 minutes),
		uint32(10 minutes),
		uint32(30 minutes),
		uint32(1 hours),
		uint32(2 hours),
		uint32(4 hours),
		uint32(8 hours),
		uint32(6 hours),
		uint32(1 days),
		uint32(2 days),
		uint32(4 days),
		uint32(7 days),
		uint32(10 days)
	];

	mapping(bytes32 => Graph) userGraphs;
	mapping(address => uint) nextGraphCreationBlock;
	mapping(address => uint) totalTokensCreated;

	constructor() public ERC721Full("Graph Art Token", "GAT") {
		index = 0;
	}

	function createUniqueArt(bytes32 _graphType, uint _charge, uint _linkDistance,
		                     uint[9] memory _graphAttributes, string memory _tokenURI) public returns (uint) {
		//validate graph type

		require(_graphType == 'BalancedTree' || _graphType == 'BarabasiAlbert' ||
			    _graphType == 'ErdosRenyi.np' || _graphType == 'ErdosRenyi.nm' ||
			    _graphType == 'WattsStrogatz.alpha' || _graphType == 'WattsStrogatz.beta');

		require(nextGraphCreationBlock[msg.sender] <= block.number);
		bytes32 hash = keccak256(abi.encodePacked(_graphType, _charge, _linkDistance, _graphAttributes));
		require(userGraphs[hash].creator == address(0));
		userGraphs[hash] = Graph(_graphType, _graphAttributes, _charge, _linkDistance, msg.sender);
		//Check if this graph with variables is unique
		//create a graph token
		index += 1;
		_mint(msg.sender, index);
		_setTokenURI(index, _tokenURI);

		totalTokensCreated[msg.sender] += 1;	
		nextGraphCreationBlock[msg.sender] = cooldowns[totalTokensCreated[msg.sender] % 15]/15 + block.number;

		return index;
	}

	//check when someone created a token
	//block them from creating the next token until X time has passed
}