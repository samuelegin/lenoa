export const CONTRACTS = {
  LOAN_FACTORY: import.meta.env.VITE_LOAN_FACTORY_ADDRESS,
  LOAN_NFT: import.meta.env.VITE_LOAN_NFT_ADDRESS,
  COLLATERAL_VAULT: import.meta.env.VITE_COLLATERAL_VAULT_ADDRESS,
};

export const TOKENS = {
  ETH: '0x0000000000000000000000000000000000000000',
  DAI: '0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357',
  USDC: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8',
  LINK: '0x779877A7B0D9E8603169DdbD7836e478b4624789',
  WETH: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
};

export const TOKEN_INFO = {
  [TOKENS.ETH]: {
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    icon: '⟠',
  },
  [TOKENS.DAI]: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    icon: '◈',
  },
  [TOKENS.USDC]: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    icon: '⊙',
  },
  [TOKENS.LINK]: {
    symbol: 'LINK',
    name: 'Chainlink',
    decimals: 18,
    icon: '⬡',
  },
  [TOKENS.WETH]: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    icon: '⟠',
  },
};

export const LOAN_STATUS = {
  PENDING: 0,
  ACTIVE: 1,
  REPAID: 2,
  DEFAULTED: 3,
  CANCELLED: 4,
};

export const STATUS_LABELS = {
  0: 'Pending',
  1: 'Active',
  2: 'Repaid',
  3: 'Defaulted',
  4: 'Cancelled',
};

export const FEES = {
  ORIGINATION_PERCENT: 0.5,
  INTEREST_PERCENT: 5,
};

export const LIMITS = {
  MAX_INTEREST_RATE: 50,
  MAX_DURATION_DAYS: 90, 
  MIN_LOAN_AMOUNTS: {
    [TOKENS.ETH]: '0.01',
    [TOKENS.DAI]: '100',
    [TOKENS.USDC]: '100',
    [TOKENS.LINK]: '10',
    [TOKENS.WETH]: '0.01',
  },
  MAX_LOAN_AMOUNTS: {
    [TOKENS.ETH]: '10',
    [TOKENS.DAI]: '10000',
    [TOKENS.USDC]: '10000',
    [TOKENS.LINK]: '1000',
    [TOKENS.WETH]: '10',
  },
};

export const NETWORK = {
  CHAIN_ID: 11155111,
  NAME: 'Sepolia',
  RPC_URL: import.meta.env.VITE_SEPOLIA_RPC_URL,
  EXPLORER: 'https://sepolia.etherscan.io',
};

export const TX_CONFIRMATIONS = 1;

export const STORAGE_KEYS = {
  RECENT_LOANS: 'lenoa_recent_loans',
  FAVORITE_LOANS: 'lenoa_favorite_loans',
};