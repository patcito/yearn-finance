import { takeLatest, select, put, call } from 'redux-saga/effects';
import BigNumber from 'bignumber.js';
import request from 'utils/request';
import { selectAccount } from 'containers/ConnectionProvider/selectors';
import { selectContractData } from 'containers/App/selectors';
import { zapperDataLoaded, zapInError, zapOutError } from './actions';
import { MAX_UINT256 } from 'containers/Cover/constants.js';
import {
  INIT_ZAPPER,
  ZAP_IN,
  ETH_ADDRESS,
  ZAP_OUT,
  MIGRATE_PICKLE_GAUGE,
} from './constants';
import {
  ZAP_YVECRV_ETH_LP_ADDRESS,
  PICKLEJAR_ADDRESS,
} from 'containers/Vaults/constants';
const ZAPPER_API = 'https://api.zapper.fi/v1';
const { ZAPPER_APIKEY } = process.env;

const isEth = (address) => address === ETH_ADDRESS;

const encodeParams = (params) =>
  Object.entries(params)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}[]=${value.join(',')}`;
      }

      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');

const getZapperApi = (endpoint, params) =>
  `${ZAPPER_API}${endpoint}?api_key=${ZAPPER_APIKEY}${
    params ? `&${encodeParams(params)}` : ''
  }`;

function* initializeZapper() {
  const account = yield select(selectAccount());

  try {
    const tokens = yield call(request, getZapperApi('/prices'));
    const yvaults = yield call(request, getZapperApi('/vault-stats/yearn'));
    const pickleVaults = yield call(
      request,
      getZapperApi('/vault-stats/pickle', {
        addresses: [account],
      }),
    );
    console.log('noCONCAT VAULTS', yvaults);
    console.log('noCONCAT pickle VAULTS', pickleVaults);
    const vaults = yvaults.concat(pickleVaults);
    console.log('CONCAT VAULTS', vaults);
    console.log('CONCAT pickle VAULTS', pickleVaults);
    const balances = yield call(
      request,
      getZapperApi('/balances/tokens', {
        addresses: [account],
      }),
    );

    yield put(
      zapperDataLoaded({
        tokens,
        vaults,
        balances: balances[account],
        pickleVaults,
      }),
    );
  } catch (err) {
    console.log(err);
  }
}

function* migratePickleGauge(action) {
  let {
    pickleDepositAmount,
    zapPickleMigrateContract,
    tokenContract,
  } = action.payload;
  const account = yield select(selectAccount());

  //https://api.zapper.fi/v1/vault-stats/pickle?api_key=5d1237c2-3840-4733-8e92-c5a58fe81b88
  let lpyveCRVVaultv2 = {};
  let lpyveCRVDAO = {};
  alert('jello from zapper');
  try {
    // yield call(oldPickleGaugeContract.methods.exit().send, { from: account });
    yield call(
      tokenContract.methods.approve(
        zapPickleMigrateContract._address,
        MAX_UINT256,
      ).send,
      { from: account },
    );

    const picklePrices = yield call(
      request,
      getZapperApi('/vault-stats/pickle', {}),
    );
    console.log('PICKLEPRICE', picklePrices);
    //    incomingLP={quantity of pSUSHI ETH / yveCRV-DAO tokens sent by user}
    //minPTokens={(quantity of pSUSHI ETH / yveCRV-DAO tokens sent by user * pSUSHI ETH / yveCRV-DAO pricePerToken) /
    //  pSUSHI yveCRV Vault (v2) / ETH pricePerToken}
    picklePrices.map((pp) => {
      //PICKLEJAR_ADDRESS
      if (
        pp.address.toLowerCase() ===
        ZAP_YVECRV_ETH_LP_ADDRESS.toLocaleLowerCase()
      ) {
        lpyveCRVVaultv2 = pp;
      } else if (
        pp.address.toLowerCase() === PICKLEJAR_ADDRESS.toLocaleLowerCase()
      ) {
        lpyveCRVDAO = pp;
      }
    });
    console.log(
      'FOUNDPRICE',
      lpyveCRVDAO,
      lpyveCRVVaultv2,
      pickleDepositAmount,
    );
    const minPTokens =
      (pickleDepositAmount * lpyveCRVDAO.pricePerToken) /
      lpyveCRVVaultv2.pricePerToken;
    yield call(
      zapPickleMigrateContract.methods.Migrate(
        pickleDepositAmount,
        new BigNumber(minPTokens).times(10 ** 18),
      ).send,
      { from: account },
    );
    //    const gasPrice = new BigNumber(gasPrices.fast).times(10 ** 9);
  } catch (error) {
    console.error('failed exit', error);
  }
}

function* zapIn(action) {
  const {
    web3,
    poolAddress,
    sellTokenAddress,
    sellAmount,
    slippagePercentage,
    protocol,
  } = action.payload;

  const zapProtocol = protocol ? protocol : 'yearn';

  const ownerAddress = yield select(selectAccount());
  const isSellTokenEth = isEth(sellTokenAddress);

  try {
    const gasPrices = yield call(
      request,
      getZapperApi('/gas-price', {
        sellTokenAddress,
        ownerAddress,
      }),
    );
    const gasPrice = new BigNumber(gasPrices.fast).times(10 ** 9);

    if (!isSellTokenEth) {
      const approvalState = yield call(
        request,
        getZapperApi(`/zap-in/${zapProtocol}/approval-state`, {
          sellTokenAddress,
          ownerAddress,
        }),
      );

      if (!approvalState.isApproved) {
        const approvalTransaction = yield call(
          request,
          getZapperApi(`/zap-in/${zapProtocol}/approval-transaction`, {
            gasPrice,
            sellTokenAddress,
            ownerAddress,
          }),
        );
        yield call(web3.eth.sendTransaction, approvalTransaction);
      }
    }

    const zapInTransaction = yield call(
      request,
      getZapperApi(`/zap-in/${zapProtocol}/transaction`, {
        slippagePercentage: 0.3,
        gasPrice,
        poolAddress,
        sellTokenAddress,
        sellAmount,
        ownerAddress,
      }),
    );
    console.log('faiiiiiiiiiil', zapInTransaction);
    yield call(web3.eth.sendTransaction, zapInTransaction);
  } catch (error) {
    console.log('Zap Failed', error);
    console.log('faiiiiiiiiiil', error.message);
    yield put(
      zapInError({ message: `Zap Failed. ${error.message}`, poolAddress }),
    );
  }
}

function* zapOut(action) {
  const {
    web3,
    slippagePercentage,
    vaultContract,
    withdrawalAmount,
    decimals,
    selectedWithdrawToken,
  } = action.payload;

  const ownerAddress = yield select(selectAccount());
  const vaultContractData = yield select(
    selectContractData(vaultContract.address),
  );

  const v2Vault = _.get(vaultContractData, 'pricePerShare');
  let sharesForWithdrawal;
  if (v2Vault) {
    const sharePrice = _.get(vaultContractData, 'pricePerShare');
    sharesForWithdrawal = new BigNumber(withdrawalAmount)
      .dividedBy(sharePrice / 10 ** decimals)
      .decimalPlaces(0)
      .toFixed(0);
  } else {
    const sharePrice = _.get(vaultContractData, 'getPricePerFullShare');
    sharesForWithdrawal = new BigNumber(withdrawalAmount)
      .dividedBy(sharePrice / 10 ** 18)
      .decimalPlaces(0)
      .toFixed(0);
  }

  try {
    const gasPrices = yield call(
      request,
      getZapperApi('/gas-price', {
        sellTokenAddress: vaultContract.address.toLowerCase(),
        ownerAddress,
      }),
    );
    const gasPrice = new BigNumber(gasPrices.fast).times(10 ** 9);

    const approvalState = yield call(
      request,
      getZapperApi(`/zap-out/${zapProtocol}/approval-state`, {
        sellTokenAddress: vaultContract.address.toLowerCase(),
        ownerAddress,
      }),
    );

    if (!approvalState.isApproved) {
      const approvalTransaction = yield call(
        request,
        getZapperApi(`/zap-out/${zapProtocol}/approval-transaction`, {
          gasPrice,
          sellTokenAddress: vaultContract.address.toLowerCase(),
          ownerAddress,
        }),
      );
      yield call(web3.eth.sendTransaction, approvalTransaction);
    }

    const zapOutTransaction = yield call(
      request,
      getZapperApi(`/zap-out/${zapProtocol}/transaction`, {
        slippagePercentage,
        gasPrice,
        poolAddress: vaultContract.address.toLowerCase(),
        toTokenAddress: selectedWithdrawToken.address.toLowerCase(),
        sellAmount: sharesForWithdrawal,
        ownerAddress,
      }),
    );
    yield call(web3.eth.sendTransaction, zapOutTransaction);
  } catch (error) {
    console.log('Zap Failed', error);
    yield put(
      zapOutError({ message: `Zap Failed. ${error.message}`, vaultContract }),
    );
  }
}

export default function* rootSaga() {
  yield takeLatest(INIT_ZAPPER, initializeZapper);
  yield takeLatest(ZAP_IN, zapIn);
  yield takeLatest(ZAP_OUT, zapOut);
  yield takeLatest(MIGRATE_PICKLE_GAUGE, migratePickleGauge);
}
