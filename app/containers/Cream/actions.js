/**
 * Placeholders for API data loading
 */
// import { CREAM_DATA_LOADED } from './constants';
// export function creamDataLoaded(payload) {
//   return {
//     type: CREAM_DATA_LOADED,
//     payload,
//   };
// }

import {
  CREAM_ENTER_MARKETS,
  INITIALIZE_CREAM,
  CREAM_APPROVE_TX,
} from './constants';

export function initializeCream() {
  return {
    type: INITIALIZE_CREAM,
  };
}

export function creamEnterMarkets(cTokenAddress) {
  return {
    type: CREAM_ENTER_MARKETS,
    cTokenAddress,
  };
}

export function approveTxSpend(tokenContractAddress, spenderAddress) {
  return {
    type: CREAM_APPROVE_TX,
    tokenContractAddress,
    spenderAddress,
  };
}
