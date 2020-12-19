import comptrollerAbi from 'abi/creamComptroller.json';
import priceOracleAbi from 'abi/creamPriceOracle.json';
import CErc20DelegatorAbi from 'abi/CErc20Delegator.json';
import erc20Abi from 'abi/erc20.json';
import { selectAccount } from 'containers/ConnectionProvider/selectors';
import { selectReady } from 'containers/App/selectors';
import {
  COMPTROLLER_ADDRESS,
  PRICE_ORACLE_ADDRESS,
  INITIALIZE_CREAM,
} from 'containers/Cream/constants';

import { addContracts } from 'containers/DrizzleProvider/actions';
import {
  takeLatest,
  put,
  call,
  select,
  setContext,
  getContext,
} from 'redux-saga/effects';

function* subscribeToCreamData(action) {
  const initialized = yield getContext('initialized');
  const appReady = yield select(selectReady());
  const { web3, batchCall } = action;
  if (initialized || !appReady) {
    return;
  }
  yield setContext({ initialized: true });
  const account = yield select(selectAccount());
  const creamComptroller = new web3.eth.Contract(
    comptrollerAbi,
    COMPTROLLER_ADDRESS,
  );
  const cTokenAddresses = yield call(
    creamComptroller.methods.getAllMarkets().call,
  );

  const underlyingTokensResponse = yield call(
    [batchCall, batchCall.execute],
    [
      {
        namespace: 'underlyingTokens',
        abi: CErc20DelegatorAbi,
        addresses: cTokenAddresses,
        readMethods: [{ name: 'underlying' }],
      },
    ],
  );

  const underlyingTokenAddresses = _.map(
    underlyingTokensResponse,
    item => item.underlying,
  );

  const subscriptions = [
    {
      namespace: 'creamComptroller',
      abi: comptrollerAbi,
      addresses: [COMPTROLLER_ADDRESS],
      readMethods: _.concat(
        [
          {
            name: 'getAssetsIn',
            args: [account],
          },
        ],
        _.map(cTokenAddresses, cTokenAddress => ({
          name: 'markets',
          args: [cTokenAddress],
        })),
      ),
    },
    {
      namespace: 'creamCTokens',
      abi: CErc20DelegatorAbi,
      addresses: cTokenAddresses,
      readMethods: [
        { name: 'name' },
        { name: 'symbol' }, // just testing
        { name: 'decimals' },
        { name: 'borrowRatePerBlock' },
        { name: 'supplyRatePerBlock' },
        { name: 'exchangeRateStored' },
        { name: 'getCash' },
        {
          name: 'balanceOf',
          args: [account],
        },
        {
          name: 'borrowBalanceStored',
          args: [account],
        },
        { name: 'underlying' },
      ],
    },
    {
      namespace: 'tokens',
      abi: erc20Abi,
      addresses: underlyingTokenAddresses,
      tags: ['creamUnderlyingTokens'],
      readMethods: [
        { name: 'name' },
        { name: 'symbol' },
        { name: 'decimals' },
        { name: 'balanceOf', args: [account] },
      ],
    },
    {
      namespace: 'creamOracle',
      addresses: [PRICE_ORACLE_ADDRESS],
      abi: priceOracleAbi,
      readMethods: _.map(cTokenAddresses, cTokenAddress => ({
        name: 'getUnderlyingPrice',
        args: [cTokenAddress],
      })),
    },
  ];

  yield put(addContracts(subscriptions));
}

export default function* watchers() {
  yield takeLatest(INITIALIZE_CREAM, subscribeToCreamData);
}
