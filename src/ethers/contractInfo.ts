export const fairIntGenAddr = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
export const storeDataAddr = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const fairIntGenAbi = [
    "event uploadHash(address indexed from, address indexed to, uint8 indexed types, bytes32 infoHash)",
    "event UpLoadNum(address indexed from, address indexed to, uint8 indexed types, uint8 state)",
    "function setReqHash(address receiver, bytes32 mHash) public",
    `function setResHash(address sender, bytes32 mHash) public`,
    `function setReqInfo(address receiver, uint256 ni, uint256 ri) public`,
    `function setResInfo(address sender, uint256 ni, uint256 ri) public`,
    "function getReqExecuteTime(address receiver) public view returns (uint256, uint256, uint256)",
    "function getResExecuteTime(address sender) public view returns (uint256, uint256, uint256)",
    `function verifyInfo(address sender, address receiver, uint256 index) public view returns (string memory)`,
    "function reuploadNum(address sender, address receiver, uint256 index, uint8 source, uint ni, uint ri) public",
    "function showNum(address sender, address receiver, uint256 index) public view returns (uint256, uint256, uint8)",
    "function getState(address sender, address receiver, uint256 index) public view returns (uint8)",
];

export const storeDataAbi = [
    "event storeDataEvent(address indexed from, address indexed to, bytes data)",
    "function setPublicKey(bytes memory publicKey) public",
    `function getPublicKey(address user) public view returns (bytes memory)`,
    "function setData(address receiver, bytes memory data) public",
    "function getData(address sender, address receiver, uint index) public view returns (bytes memory)",
];
