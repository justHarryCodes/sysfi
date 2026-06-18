// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Deploy with OpenZeppelin Contracts v5.x
// npm install @openzeppelin/contracts  (or use Foundry: forge install OpenZeppelin/openzeppelin-contracts)

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title Wrapped SYN (WSYN)
/// @notice ERC20 + ERC20Permit + ERC20Burnable.
///         The full 100 M supply is minted to the contract on deployment.
///         Tokens are distributed via admin-signed vouchers.
///         Each address is hard-capped at 10,000 WSYN total minted.
///
/// Voucher signing (backend, Node/viem):
///   const encoded = encodeAbiParameters(
///     [{type:'uint256'},{type:'address'},{type:'address'},
///      {type:'uint256'},{type:'bytes32'},{type:'uint256'},{type:'uint256'}],
///     [chainId, contractAddress, recipient, amount, nonce, validFrom, validUntil]
///   );
///   const hash = keccak256(encoded);
///   const sig  = await account.signMessage({ message: { raw: toBytes(hash) } });
///
contract WSYN is ERC20, ERC20Permit, ERC20Burnable, Ownable {

    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant MAX_SUPPLY   = 100_000_000 * 1e18; // 100 million WSYN
    uint256 public constant MAX_PER_USER =      10_000 * 1e18; // per-address lifetime cap
    uint256 public constant MAX_PER_TX   =      10_000 * 1e18; // per-transaction cap

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @notice Address authorised to sign mint vouchers (admin hot wallet)
    address public signer;

    /// @notice ETH fee per mint — forwarded immediately to feeRecipient on every mint
    uint256 public mintFee;

    /// @notice Address that receives the mint fee on every call (no accumulation)
    address public feeRecipient;

    /// @notice Lifetime WSYN minted to each address via vouchers
    mapping(address => uint256) public mintedPerUser;

    /// @notice Prevents voucher replay attacks
    mapping(bytes32  => bool)   public usedNonces;

    // ─── Errors ───────────────────────────────────────────────────────────────

    error InvalidTimeWindow();
    error NonceAlreadyUsed();
    error ExceedsTransactionCap();
    error ExceedsUserCap();
    error InvalidSignature();
    error InsufficientMintFee();
    error FeeTransferFailed();
    error ZeroAddress();
    error ZeroAmount();

    // ─── Events ───────────────────────────────────────────────────────────────

    event TokensMinted(address indexed recipient, uint256 amount, bytes32 indexed nonce);
    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event MintFeeUpdated(uint256 oldFee, uint256 newFee);

    // ─── Constructor ─────────────────────────────────────────────────────────

    /// @param _signer        Admin wallet that signs mint vouchers
    /// @param _feeRecipient  Address that receives the 0.0001 ETH fee on every mint
    constructor(address _signer, address _feeRecipient)
        ERC20("Wrapped SYN", "WSYN")
        ERC20Permit("Wrapped SYN")
        Ownable(msg.sender)
    {
        if (_signer       == address(0)) revert ZeroAddress();
        if (_feeRecipient == address(0)) revert ZeroAddress();
        signer       = _signer;
        feeRecipient = _feeRecipient;
        mintFee      = 0.0001 ether;
        // Pre-mint entire supply to the contract; distributed through vouchers
        _mint(address(this), MAX_SUPPLY);
    }

    // ─── Voucher minting ─────────────────────────────────────────────────────

    /// @notice Mint WSYN using an admin-signed voucher.
    ///         The mint fee (msg.value) is forwarded directly to feeRecipient —
    ///         it never sits in this contract.
    /// @param recipient  Address that receives the tokens (must match signed data)
    /// @param amount     Token amount in wei (e.g. 1000 * 1e18 = 1000 WSYN)
    /// @param nonce      One-time random bytes32 — prevents replay
    /// @param validFrom  UNIX timestamp when the voucher becomes valid
    /// @param validUntil UNIX timestamp when the voucher expires (15-min window)
    /// @param sig        ECDSA signature produced by the admin signer
    function mintWithVoucher(
        address        recipient,
        uint256        amount,
        bytes32        nonce,
        uint256        validFrom,
        uint256        validUntil,
        bytes calldata sig
    ) external payable {
        if (block.timestamp < validFrom || block.timestamp > validUntil)
            revert InvalidTimeWindow();
        if (usedNonces[nonce])
            revert NonceAlreadyUsed();
        if (amount == 0)
            revert ZeroAmount();
        if (amount > MAX_PER_TX)
            revert ExceedsTransactionCap();
        if (mintedPerUser[recipient] + amount > MAX_PER_USER)
            revert ExceedsUserCap();
        if (msg.value < mintFee)
            revert InsufficientMintFee();

        // Verify admin signature
        bytes32 hash = keccak256(abi.encode(
            block.chainid,
            address(this),
            recipient,
            amount,
            nonce,
            validFrom,
            validUntil
        ));
        bytes32 ethHash = MessageHashUtils.toEthSignedMessageHash(hash);
        if (ECDSA.recover(ethHash, sig) != signer)
            revert InvalidSignature();

        // Forward fee directly to feeRecipient — no ETH held in contract
        if (msg.value > 0) {
            (bool ok,) = feeRecipient.call{value: msg.value}("");
            if (!ok) revert FeeTransferFailed();
        }

        // Record and transfer tokens
        usedNonces[nonce]         = true;
        mintedPerUser[recipient] += amount;
        _transfer(address(this), recipient, amount);

        emit TokensMinted(recipient, amount, nonce);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function setSigner(address _signer) external onlyOwner {
        if (_signer == address(0)) revert ZeroAddress();
        emit SignerUpdated(signer, _signer);
        signer = _signer;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        if (_feeRecipient == address(0)) revert ZeroAddress();
        emit FeeRecipientUpdated(feeRecipient, _feeRecipient);
        feeRecipient = _feeRecipient;
    }

    function setMintFee(uint256 _fee) external onlyOwner {
        emit MintFeeUpdated(mintFee, _fee);
        mintFee = _fee;
    }

    /// @notice Recover unallocated WSYN from the contract reserve to owner
    function recoverTokens(uint256 amount) external onlyOwner {
        _transfer(address(this), owner(), amount);
    }
}
