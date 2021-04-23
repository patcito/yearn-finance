import ButtonFilled from 'components/ButtonFilled';
import RoundedInput from 'components/RoundedInput';
import RoundedSelect from 'components/RoundedSelect';
import Grid from '@material-ui/core/Grid';
import { useContract } from 'containers/DrizzleProvider/hooks';
import { useWeb3 } from 'containers/ConnectionProvider/hooks';
import { Contract } from 'web3-eth-contract';
import OldPickleGaugeAbi from 'abi/oldPickleGauge.json';
import {
  withdrawFromVault,
  withdrawAllFromVault,
  depositToVault,
  zapPickle,
  depositPickleSLPInFarm,
  exitOldPickleGauge,
} from 'containers/Vaults/actions';
import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import BigNumber from 'bignumber.js';
import { first } from 'lodash';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { selectTokenAllowance } from 'containers/App/selectors';
import { selectMigrationData } from 'containers/Vaults/selectors';
import {
  selectZapperVaults,
  selectZapperPickleVaults,
  selectZapperTokens,
  selectZapperBalances,
  selectZapperError,
} from 'containers/Zapper/selectors';
import { zapIn, zapOut, migratePickleGauge } from 'containers/Zapper/actions';
import { DEFAULT_SLIPPAGE } from 'containers/Zapper/constants';
import BackscratcherClaim from 'components/BackscratcherClaim';
import MigrateVault from 'components/MigrateVault';
import {
  BACKSCRATCHER_ADDRESS,
  MASTER_CHEF_ADDRESS,
  V2_WETH_VAULT_ADDRESS,
  YVBOOST_ADDRESS,
  ZAP_YVECRV_ETH_LP_ADDRESS,
  PICKLE_GAUGE_ADDRESS,
  OLD_PICKLE_GAUGE_ADDRESS,
  ZAP_MIGRATE_PICKLE_ADDRESS,
} from 'containers/Vaults/constants';
import Box from 'components/Box';
import Text from 'components/Text';
import Label from 'components/Label';
import PickleJarAbi2 from 'abi/pickleJar2.json';
import PickleGaugeAbi from 'abi/pickleGauge.json';
import ZapPickleMigrateAbi from 'abi/zapPickleMigrate.json';
const MaxWrapper = styled.div`
  cursor: pointer;
  display: flex;
  align-items: center;
  color: initial;
  position: relative;
  top: -2px;
`;

const PickleControl = styled.div`
  margin-top: 1rem;
  margin-bottom: 1rem;
`;

const StyledRoundedInput = styled(RoundedInput)`
  width: 100%;
`;
const StyledRoundedSelect = styled(RoundedSelect)`
  width: 100%;
`;

const ActionGroup = styled(Box)`
  display: ${(props) => (props.hide ? 'none' : 'flex')};
  flex-direction: ${(props) => props.direction || 'column'};
`;

const ButtonGroup = styled(Box)`
  display: flex;
  justify-content: start;
  align-items: center;
`;

const Wrapper = styled.div`
  display: flex;
  width: 100%;
`;

const StyledErrorMessage = styled(Text)`
  color: ${(props) => props.theme.blocksRed};
`;

const getNormalizedAmount = (amount, decimals) =>
  new BigNumber(amount).dividedBy(10 ** decimals).toFixed(2);

export default function VaultControls(props) {
  const {
    vault,
    vaultBalance,
    walletBalance,
    balanceOf,
    tokenBalance,
    pickleContractsData,
    balanceDecimalPlacesCount,
    account,
    walletConnected,
    oldPickleGaugeBalance,
    oldPickleGaugeContract,
  } = props;
  const {
    address: vaultAddress,
    totalAssets,
    token,
    decimals,
    pureEthereum,
    depositLimit,
    zapAddress,
    emergencyShutdown,
  } = vault;
  let yvBoostContract = null;
  console.log('useoldgauge', oldPickleGaugeBalance);
  if (vaultAddress === ZAP_YVECRV_ETH_LP_ADDRESS)
    console.log('VAULTADDRESS', vaultAddress);
  if (pickleContractsData) {
    console.log('pickle', pickleContractsData);
  }
  const v2Vault = vault.type === 'v2' || vault.apiVersion;
  const vaultIsBackscratcher = vault.address === BACKSCRATCHER_ADDRESS;
  const vaultIsPickle = vault.address === MASTER_CHEF_ADDRESS;
  const vaultIsYvBoost = vault.address === YVBOOST_ADDRESS;
  if (vaultIsYvBoost) {
    yvBoostContract = useContract(vaultAddress);
    let zyvBoostContract = useContract(zapAddress);
    console.log('YESYVBOOST', zyvBoostContract, yvBoostContract, vault);
  } else {
    console.log(
      'NOTYVBOOST',
      useContract(vaultAddress),
      useContract(zapAddress),
      vault,
    );
  }

  let vaultBalanceOf;
  if (v2Vault) {
    vaultBalanceOf = new BigNumber(balanceOf)
      .times(vault.pricePerShare / 10 ** decimals)
      .toFixed();
  } else {
    vaultBalanceOf = new BigNumber(balanceOf)
      .times(vault.getPricePerFullShare / 10 ** 18)
      .toFixed();
  }

  const isScreenMd = useMediaQuery('(min-width:960px)');
  const dispatch = useDispatch();
  let vaultContract = useContract(vaultAddress);
  const zapContract = useContract(zapAddress);
  if (zapContract) {
    vaultContract = { ...vaultContract, zapContract };
  }
  const migrationData = useSelector(selectMigrationData);
  const isMigratable = !!migrationData[vaultAddress];

  // ----- ZAPPER
  const web3 = useWeb3();
  const zapperVaults = useSelector(selectZapperVaults());
  const zapperPickleVaults = useSelector(selectZapperPickleVaults());
  console.log('zapperpicklevaults', zapperPickleVaults);
  console.log('zapperpicklevaults2', zapperVaults);
  const zapperTokens = useSelector(selectZapperTokens());
  const zapperBalances = useSelector(selectZapperBalances());
  const zapperError = useSelector(selectZapperError());
  const zapperVaultData = zapperVaults[vaultAddress.toLowerCase()];
  const isZappable = !!zapperVaultData;
  const isSupportedToken = ({ address, hide }) =>
    address !== token.address && !hide && !!zapperTokens[address];
  const isSameToken = ({ label, address }) =>
    (vaultAddress === V2_WETH_VAULT_ADDRESS &&
      (label === 'ETH' || label === 'WETH')) ||
    address === token.address.toLowerCase();
  const supportedTokenOptions = Object.values(zapperBalances)
    .filter(isSupportedToken)
    .filter((option) => !isSameToken(option))
    .map(({ address, label, img }) => ({
      value: address,
      label,
      icon: `https://zapper.fi/images/${img}`,
    }));
  supportedTokenOptions.unshift({
    value: token.address,
    label: pureEthereum
      ? 'ETH'
      : token.displayName
      ? token.displayName
      : token.symbol.replace('yveCRV-DAO', 'yveCRV'),
    icon: `https://raw.githack.com/iearn-finance/yearn-assets/master/icons/tokens/${token.address}/logo-128.png`,
  });
  const [selectedSellToken, setSelectedSellToken] = useState(
    first(supportedTokenOptions),
  );
  const [yvContract, setYvBoostContract] = useState(yvBoostContract);
  const sellToken = zapperBalances[selectedSellToken.value];

  const willZapIn =
    selectedSellToken && selectedSellToken.value !== token.address;

  // ------

  const tokenContract = useContract(token.address);

  const tokenOptions = [
    {
      value: 'eth',
      label: 'ETH',
      icon:
        'https://raw.githack.com/iearn-finance/yearn-assets/master/icons/tokens/0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE/logo-128.png',
    },
    {
      value: 'crv',
      label: 'CRV',
      icon:
        'https://raw.githack.com/iearn-finance/yearn-assets/master/icons/tokens/0xD533a949740bb3306d119CC777fa900bA034cd52/logo-128.png',
    },
  ];
  const [selectedPickleTokenType, setSelectedPickleTokenType] = useState(
    tokenOptions[0],
  );
  const [pickleUnstakeGweiAmount, setPickleUnstakeGweiAmount] = useState(0);
  const [pickleUnstakeAmount, setPickleUnstakeAmount] = useState(0);

  const [pickleDepositGweiAmount, setPickleDepositGweiAmount] = useState(0);

  const [pickleDepositAmount, setPickleDepositAmount] = useState(0);
  const [withdrawalAmount, setWithdrawalAmount] = useState(0);
  const [depositAmount, setDepositAmount] = useState(0);
  const [withdrawalGweiAmount, setWithdrawalGweiAmount] = useState(0);
  const [depositGweiAmount, setDepositGweiAmount] = useState(0);
  const zapperImgUrl = 'https://zapper.fi/images/';

  const tmpWithdrawTokens = [];
  [
    {
      label: 'ETH',
      address: '0x0000000000000000000000000000000000000000',
      icon: `${zapperImgUrl}ETH-icon.png`,
      value: 'ETH',
    },
    {
      label: 'DAI',
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      icon: `${zapperImgUrl}DAI-icon.png`,
      value: 'DAI',
    },
    {
      label: 'USDC',
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      icon: `${zapperImgUrl}USDC-icon.png`,
      value: 'USDC',
    },
    {
      label: 'USDT',
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      icon: `${zapperImgUrl}USDT-icon.png`,
      value: 'USDT',
    },
    {
      label: 'WBTC',
      address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      icon: `${zapperImgUrl}WBTC-icon.png`,
      value: 'WBTC',
    },
  ].map((t) => {
    if (t.label !== vault.displayName) {
      tmpWithdrawTokens.push(t);
    }
    return t;
  });

  if (vault.displayName === 'yvBOOST') {
    console.log('yvyv', vault);
    tmpWithdrawTokens.unshift({
      label: 'yveCRV',
      address: vault.token.address,
      isVault: true,
      icon:
        'https://raw.githubusercontent.com/iearn-finance/yearn-assets/master/icons/tokens/0xc5bDdf9843308380375a611c18B50Fb9341f502A/logo-128.png',
      value: vault.displayName,
    });
  } else {
    tmpWithdrawTokens.unshift({
      label: vault.displayName,
      address: vault.token.address,
      isVault: true,
      icon: vault.token.icon,
      value: vault.displayName,
    });
  }
  const withdrawTokens = tmpWithdrawTokens;

  const [selectedWithdrawToken, setSelectedWithdrawToken] = useState(
    withdrawTokens[0],
  );

  const tokenContractAddress =
    (tokenContract && tokenContract.address) || '0x0';
  const vaultContractAddress =
    (vaultContract && vaultContract.address) || '0x0';
  const tokenAllowance = useSelector(
    selectTokenAllowance(tokenContractAddress, vaultContractAddress),
  );

  const depositLimitBN = useMemo(() => new BigNumber(depositLimit), [
    depositLimit,
  ]);

  const totalAssetsBN = useMemo(() => new BigNumber(totalAssets), [
    totalAssets,
  ]);

  const approvalExplainer =
    'Before depositing for the first time, users must submit an approval transaction to allow Yearn to accept your funds. Once this approval transaction has confirmed, you can deposit any amount, forever, from this address.';

  const depositsDisabled = useMemo(() => {
    if (vault.type === 'v2') {
      if (
        !willZapIn &&
        totalAssetsBN.plus(depositGweiAmount).gte(depositLimitBN)
      ) {
        console.log('vault limit reached', vault.symbol);
        return 'Vault deposit limit reached.';
      }
      // fix: disable deposit button if value is 0
      // note: resolves issue #252 from iearn-finance repo
      // this issue only affects v2 & is mis-ticketed as v1 (iearn-finance)
      if (depositGweiAmount <= 0) {
        console.log('gwei amount', vault.symbol);
        return 'Value must be greater than 0.';
      }
    } else if (
      vault.type === 'v1' &&
      vault.address === '0xBA2E7Fed597fd0E3e70f5130BcDbbFE06bB94fe1'
    ) {
      console.log('vault address', vault.symbol);
      return 'Inactive with YIP-56: Buyback and Build';
    }

    if (emergencyShutdown) {
      console.log('emergency', vault.symbol);
      return 'Vault deposits temporarily disabled';
    }
    console.log('ok deposit', vault.symbol, depositAmount);

    return undefined;
  }, [depositAmount, totalAssets, depositLimit, emergencyShutdown]);

  useEffect(() => {
    setSelectedPickleTokenType(tokenOptions[0]);
    setDepositAmount(0);
    setPickleDepositAmount(0);
    setWithdrawalAmount(0);
    setDepositGweiAmount(0);
    setWithdrawalGweiAmount(0);
  }, [walletBalance, vaultBalance]);
  useEffect(() => {
    0xbd17b1ce622d73bd438b9e658aca5996dc394b0d;
  });
  const [yvBOOSTBalance, setYvBOOSTBalance] = useState(0);
  const [
    yvBOOSTPickleGaugeAllowance,
    setYvBOOSTPickleGaugeAllowance,
  ] = useState(0);
  const [yvBOOSTPickleJarAllowance, setYvBOOSTPickleJarAllowance] = useState(0);
  useEffect(() => {
    const getBalance = async () => {
      if (pickleContractsData && pickleContractsData.pickleJarContract) {
        try {
          const ap = await pickleContractsData.pickleJarContract.methods
            .allowance(account, ZAP_YVECRV_ETH_LP_ADDRESS)
            .call();
          setYvBOOSTPickleJarAllowance(ap);
          console.log('allowwwwap', ap);
        } catch (error) {
          console.log('failbobo', error);
        }
      }
      if (vault.isYVBoost) {
        console.log('PLOP', vault, account);
        try {
          const yvBoostETHContract = new web3.eth.Contract(
            PickleJarAbi2,
            ZAP_YVECRV_ETH_LP_ADDRESS,
          );
          const zapPickleMigrateContract = new web3.eth.Contract(
            ZapPickleMigrateAbi,
            ZAP_YVECRV_ETH_LP_ADDRESS,
          );
          const r = await yvBoostETHContract.methods.balanceOf(account).call();
          const a = await yvBoostETHContract.methods
            .allowance(account, PICKLE_GAUGE_ADDRESS)
            .call();

          console.log('baba', r);
          console.log('allowwww', a);
          setYvBOOSTBalance(r);
          setYvBOOSTPickleGaugeAllowance(a);
        } catch (error) {
          console.log('failbaba', error);
        }
      }
    };
    try {
      getBalance();
    } catch (error) {
      console.log('failbaba2', error);
    }
  }, [yvBOOSTBalance]);

  const migratePickleGaugeCall = async () => {
    console.log('pjjjjjjjjjjjjjjjjjjjar', pickleContractsData);
    const zapPickleMigrateContract = new web3.eth.Contract(
      ZapPickleMigrateAbi,
      ZAP_YVECRV_ETH_LP_ADDRESS,
    );
    const yvBoostETHContract = new web3.eth.Contract(
      PickleJarAbi2,
      ZAP_YVECRV_ETH_LP_ADDRESS,
    );
    const gweiPiclke = new BigNumber(pickleDepositAmount).times(10 ** 18);
    dispatch(
      migratePickleGauge({
        pickleDepositAmount: pickleDepositAmount,
        zapPickleMigrateContract: zapPickleMigrateContract,
        tokenContract: pickleContractsData.pickleJarContract,
      }),
    );
  };

  const exitOldPickleGaugeCall = () => {
    const oldPickleGaugeContract = new web3.eth.Contract(
      OldPickleGaugeAbi,
      OLD_PICKLE_GAUGE_ADDRESS,
    );

    dispatch(
      exitOldPickleGauge({ oldPickleGaugeContract: oldPickleGaugeContract }),
    );
  };
  const unstakeMasterChef = () => {
    const unstakeParams = {
      vaultContract: pickleContractsData.masterChefContract,
      withdrawalAmount: pickleUnstakeGweiAmount,
      decimals: pickleContractsData.decimals,
      pureEthereum,
      unstakePickle: true,
    };
    console.log(`Withdrawing:`, withdrawalGweiAmount);
    console.log(`Withdrawing contract:`, vaultContract);
    console.log('unstakeParams', unstakeParams);
    dispatch(withdrawFromVault(unstakeParams));
  };
  const withdraw = () => {
    console.log(`Withdrawing:`, withdrawalGweiAmount);
    console.log(`Withdrawing contract:`, vaultContract);

    if (
      selectedWithdrawToken.address.toLowerCase() ===
      vault.token.address.toLowerCase()
    ) {
      dispatch(
        withdrawFromVault({
          vaultContract,
          withdrawalAmount: withdrawalGweiAmount,
          decimals,
          pureEthereum,
        }),
      );
    } else {
      dispatch(
        zapOut({
          web3,
          slippagePercentage: DEFAULT_SLIPPAGE,
          vaultContract,
          withdrawalAmount: withdrawalGweiAmount,
          decimals,
          selectedWithdrawToken,
          pureEthereum,
        }),
      );
    }
  };

  const withdrawAll = () => {
    dispatch(
      withdrawAllFromVault({
        vaultContract,
        pureEthereum,
      }),
    );
  };

  const zap = () => {
    dispatch(
      zapPickle({
        zapPickleContract: pickleContractsData.zapPickleContract,
        tokenContract: pickleContractsData.crvContract,
        depositAmount: depositGweiAmount,
        pureEthereum: selectedPickleTokenType.value === 'eth',
      }),
    );
  };

  const depositPickleFarm = async () => {
    const yvBoostETHContract = new web3.eth.Contract(
      PickleJarAbi2,
      ZAP_YVECRV_ETH_LP_ADDRESS,
    );
    const pickleGaugeContract = new web3.eth.Contract(
      PickleGaugeAbi,
      PICKLE_GAUGE_ADDRESS,
    );

    const payload = {
      vaultContract: pickleGaugeContract,
      tokenContract: yvBoostETHContract,
      depositAmount: pickleDepositGweiAmount,
      allowance: yvBOOSTPickleGaugeAllowance,
    };

    console.log('paypay', payload);
    dispatch(depositPickleSLPInFarm(payload));
  };

  const deposit = () => {
    console.log(`Depositing:`, depositGweiAmount);
    dispatch(
      depositToVault({
        vaultContract,
        tokenContract,
        depositAmount: depositGweiAmount,
        decimals,
        pureEthereum,
      }),
    );
  };

  const zapperZap = () => {
    dispatch(
      zapIn({
        web3,
        poolAddress: zapperVaultData.address,
        sellTokenAddress: sellToken.address,
        sellAmount: depositGweiAmount,
        slippagePercentage: DEFAULT_SLIPPAGE,
      }),
    );
  };

  const zapperZapYvBoostEthLP = () => {
    let address = null;
    if (sellToken && sellToken.address) {
      address = sellToken.address;
    } else if (selectedSellToken && selectedSellToken.address) {
      address = selectedSellToken.address;
    } else if (token && token.address) {
      address = token.address;
    }
    if (address) {
      const payload = {
        web3,
        poolAddress: ZAP_YVECRV_ETH_LP_ADDRESS.toLowerCase(),
        sellTokenAddress: address,
        sellAmount: depositGweiAmount,
        slippagePercentage: DEFAULT_SLIPPAGE,
        protocol: 'pickle',
      };
      console.log('PAYLOADdd', payload);
      dispatch(zapIn(payload));
    }
  };

  let vaultControlsWrapper;

  if (vaultIsPickle && !vault.isYVBoost) {
    let maxAmount = 0;
    let stakedMaxAmount = 0;
    stakedMaxAmount = pickleContractsData.pickleMasterChefDepositedRaw;
    maxAmount = pickleContractsData.pickleMasterChefDepositedRaw;
    const customWalletBalance =
      walletBalance > oldPickleGaugeBalance
        ? walletBalance
        : oldPickleGaugeBalance;
    const useOldPickleGauge = walletBalance < oldPickleGaugeBalance;
    const pickleDescriptions = [
      {
        balance: pickleContractsData.pickleMasterChefDeposited,
        main: '1. You have to unstake your LP Tokens',
        sub: 'Available Pickle SLP: ',
        buttonLabel: 'Unstake',
        maxAmount: pickleContractsData.pickleMasterChefDepositedRaw,
        amount: pickleUnstakeAmount,
        amountSetter: setPickleUnstakeAmount,
        gweiAmountSetter: setPickleUnstakeGweiAmount,
        buttonFunction: useOldPickleGauge
          ? exitOldPickleGaugeCall
          : unstakeMasterChef,
        useOldPickleGauge: useOldPickleGauge,
      },
      {
        balance: walletBalance,
        main:
          '2. Then approve and migrate from yveCRV-ETH LP into yvBOOST-ETH LP to enjoy 🍣 and 🥒 rewards',
        sub: 'Available SLP: ',
        buttonLabel: yvBOOSTPickleJarAllowance > 0 ? 'Migrate' : 'Approve',
        maxAmount: new BigNumber(walletBalance).times(10 ** 18),
        amount: pickleDepositAmount,
        amountSetter: setPickleDepositAmount,
        gweiAmountSetter: setPickleDepositGweiAmount,
        buttonFunction: migratePickleGaugeCall,
      },
      {
        balance: 0,
        main:
          '3. Last step! After the previous transaction completes, approve and stake your Pickle LPs using the box below',
        sub: 'Available Pickle SLP: ',
        buttonLabel: 'Approve and Stake',
        buttonLabel: yvBOOSTPickleGaugeAllowance > 0 ? 'Stake' : 'Approve',
        maxAmount: customWalletBalance,
        amount: pickleDepositAmount,
        amountSetter: setPickleDepositAmount,
        gweiAmountSetter: setPickleDepositGweiAmount,
        buttonFunction: depositPickleFarm,
      },
    ];
    const pickleNote =
      'Note: If you want to claim PICKLE 🥒 rewards or withdraw yout yvBOOST-ETH SLP, please, use UI at';
    const pickleNoteLink = 'https://app.pickle.finance/farms';
    vaultControlsWrapper = (
      <Wrapper>
        <Box display="flex" flexDirection="column" width={1}>
          {pickleDescriptions.map((description) => (
            <>
              <Label fontSize={16}>{description.main}</Label>
              <PickleControl>
                <Grid xs={12} md={6}>
                  <Balance
                    amount={description.balance}
                    prefix={description.sub}
                  />
                  <ActionGroup
                    direction={isScreenMd ? 'row' : 'column'}
                    alignItems="center"
                  >
                    {description.useOldPickleGauge ? null : (
                      <Box width={1}>
                        <AmountField
                          amount={description.amount}
                          amountSetter={description.amountSetter}
                          gweiAmountSetter={description.gweiAmountSetter}
                          maxAmount={description.maxAmount}
                          decimals={decimals}
                          placeholder={'Amount'}
                        />
                      </Box>
                    )}
                    <Box ml={isScreenMd ? 5 : 0} width={isScreenMd ? '30%' : 1}>
                      <ActionButton
                        className="action-button dark"
                        disabled={
                          description &&
                          description.amount > 0 &&
                          new BigNumber(description.amount).times(10 ** 18) >
                            new BigNumber(description.maxAmount)
                        }
                        handler={description.buttonFunction}
                        text={description.buttonLabel}
                        title={description.buttonLabel}
                        showTooltip
                        tooltipText={
                          depositsDisabled ||
                          'Connect your wallet to deposit into vault'
                        }
                      />
                    </Box>
                  </ActionGroup>
                </Grid>
              </PickleControl>
            </>
          ))}
          <Label fontSize={16}> {pickleNote} </Label>
          <a href={pickleNoteLink}> {pickleNoteLink} </a>
        </Box>
      </Wrapper>
    );
  } else if (vault.isYVBoost) {
    vaultControlsWrapper = (
      <Wrapper>
        <Box display="flex" flexDirection="column" width={1}>
          <ActionGroup direction={isScreenMd ? 'row' : 'column'}>
            <Box display="flex" flexDirection="column">
              <Balance
                amount={sellToken ? sellToken.balance : walletBalance}
                prefix={`Available ${
                  selectedSellToken ? selectedSellToken.label : sellToken.symbol
                }: `}
              />
              <Box
                display="flex"
                flexDirection={isScreenMd ? 'row' : 'column'}
                alignItems="center"
                width={1}
              >
                <Box
                  center
                  mr={isScreenMd ? 5 : 0}
                  width={isScreenMd ? '179px' : '100%'}
                  minWidth={179}
                >
                  <SelectField
                    defaultValue={selectedSellToken}
                    onChange={(value) => {
                      setDepositAmount(0);
                      setSelectedSellToken(value);
                    }}
                    flexGrow={1}
                    options={supportedTokenOptions}
                  />
                </Box>
                <ButtonGroup width={1}>
                  <Box width={isScreenMd ? '185px' : '100%'}>
                    <AmountField
                      amount={depositAmount}
                      amountSetter={setDepositAmount}
                      gweiAmountSetter={setDepositGweiAmount}
                      maxAmount={
                        sellToken ? sellToken.balanceRaw : tokenBalance
                      }
                      decimals={sellToken ? sellToken.decimals : decimals}
                    />
                  </Box>
                  <Box width={isScreenMd ? '130px' : '100%'} ml={5}>
                    <ActionButton
                      className="action-button dark"
                      disabled={!!depositsDisabled}
                      handler={() => zapperZapYvBoostEthLP()}
                      text={
                        (tokenAllowance !== undefined &&
                          tokenAllowance !== '0') ||
                        pureEthereum > 0 ||
                        'Deposit'
                      }
                      title="Deposit into vault"
                      showTooltip
                      tooltipText={
                        depositsDisabled ||
                        'Connect your wallet to deposit into vault'
                      }
                    />
                  </Box>
                </ButtonGroup>
              </Box>
              {zapperError &&
                zapperError.poolAddress === vaultAddress.toLowerCase() && (
                  <StyledErrorMessage>{zapperError.message}</StyledErrorMessage>
                )}
            </Box>
          </ActionGroup>

          <ActionGroup direction={isScreenMd ? 'row' : 'column'}>
            <Grid container spacing={1}>
              <Grid item xs={12} md={9}>
                <Box>
                  <Balance
                    amount={new BigNumber(yvBOOSTBalance)
                      .dividedBy(10 ** 18)
                      .toFixed(2)}
                    prefix="Vault balance: "
                  />
                </Box>{' '}
                <Box>
                  <AmountField
                    amount={pickleDepositAmount}
                    amountSetter={setPickleDepositAmount}
                    gweiAmountSetter={setPickleDepositGweiAmount}
                    maxAmount={yvBOOSTBalance}
                    decimals={18}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={2}>
                <ButtonGroup width={1} style={{ marginTop: '15px' }}>
                  <Box>
                    <ActionButton
                      className="action-button dark"
                      disabled={yvBOOSTBalance === 0}
                      handler={() => depositPickleFarm()}
                      text={
                        !yvBOOSTPickleGaugeAllowance ||
                        yvBOOSTPickleGaugeAllowance === 0 ||
                        yvBOOSTPickleGaugeAllowance === '0'
                          ? 'Approve'
                          : 'Deposit'
                      }
                      title="Deposit into vault"
                      showTooltip
                      tooltipText={
                        depositsDisabled ||
                        'Connect your wallet to deposit into vault'
                      }
                    />
                  </Box>
                </ButtonGroup>
              </Grid>
            </Grid>
          </ActionGroup>
        </Box>
      </Wrapper>
    );
  } else if (vaultIsBackscratcher) {
    const depositHasBeenApproved =
      (tokenAllowance !== undefined && tokenAllowance !== '0') ||
      pureEthereum > 0;
    vaultControlsWrapper = (
      <Wrapper>
        <Box display="flex" flexDirection="column" width={1}>
          <Balance amount={walletBalance} prefix="Available CRV: " />
          <ActionGroup
            direction={isScreenMd ? 'row' : 'column'}
            alignItems="center"
          >
            <Box width={1}>
              <AmountField
                amount={depositAmount}
                amountSetter={setDepositAmount}
                gweiAmountSetter={setDepositGweiAmount}
                maxAmount={tokenBalance}
                decimals={decimals}
                placeholder="Amount"
              />
            </Box>
            <Box ml={isScreenMd ? 5 : 0} width={isScreenMd ? '30%' : 1}>
              <ActionButton
                className="action-button dark"
                disabled={
                  !vaultContract || !tokenContract || !!depositsDisabled
                }
                handler={deposit}
                text={depositHasBeenApproved ? 'Deposit' : 'Approve'}
                title="Deposit into vault"
                showTooltipWhenDisabled
                disabledTooltipText={
                  depositsDisabled ||
                  'Connect your wallet to deposit into vault'
                }
                showTooltipWhenEnabled={!depositHasBeenApproved}
                enabledTooltipText={approvalExplainer}
              />
            </Box>
          </ActionGroup>
          <BackscratcherClaim
            isScreenMd={isScreenMd}
            vaultAddress={vaultAddress}
          />
        </Box>
      </Wrapper>
    );
  } else if (vaultIsYvBoost) {
    vaultControlsWrapper = (
      <Wrapper>
        <Box display="flex" flexDirection="column" width={1}>
          <ActionGroup direction={isScreenMd ? 'row' : 'column'}>
            <Box display="flex" flexDirection="column">
              <Balance
                amount={
                  isZappable && sellToken ? sellToken.balance : walletBalance
                }
                prefix={`Available ${
                  selectedSellToken ? selectedSellToken.label : sellToken.symbol
                }: `}
              />
              <Box
                display="flex"
                flexDirection={isScreenMd ? 'row' : 'column'}
                alignItems="center"
                width={1}
              >
                <Box
                  center
                  mr={isScreenMd ? 5 : 0}
                  width={isScreenMd ? '179px' : '100%'}
                  minWidth={179}
                >
                  <SelectField
                    defaultValue={selectedSellToken}
                    onChange={(value) => {
                      setDepositAmount(0);
                      setSelectedSellToken(value);
                    }}
                    flexGrow={1}
                    options={supportedTokenOptions}
                  />
                </Box>
                <ButtonGroup width={1}>
                  <Box width={isScreenMd ? '185px' : '100%'}>
                    <AmountField
                      amount={depositAmount}
                      amountSetter={setDepositAmount}
                      gweiAmountSetter={setDepositGweiAmount}
                      maxAmount={
                        isZappable && sellToken
                          ? sellToken.balanceRaw
                          : tokenBalance
                      }
                      decimals={
                        isZappable && sellToken ? sellToken.decimals : decimals
                      }
                    />
                  </Box>
                  <Box width={isScreenMd ? '130px' : '100%'} ml={5}>
                    <ActionButton
                      className="action-button dark"
                      disabled={
                        !yvBoostContract || !tokenContract || !!depositsDisabled
                      }
                      handler={() => (willZapIn ? zapperZap() : deposit())}
                      text={
                        (tokenAllowance !== undefined &&
                          tokenAllowance !== '0') ||
                        pureEthereum > 0 ||
                        willZapIn
                          ? 'Deposit'
                          : 'Approve'
                      }
                      title="Deposit into vault"
                      showTooltip
                      tooltipText={
                        depositsDisabled ||
                        'Connect your wallet to deposit into vault'
                      }
                    />
                  </Box>
                </ButtonGroup>
              </Box>
              {zapperError &&
                zapperError.poolAddress === vaultAddress.toLowerCase() && (
                  <StyledErrorMessage>{zapperError.message}</StyledErrorMessage>
                )}
            </Box>
          </ActionGroup>

          <ActionGroup direction={isScreenMd ? 'row' : 'column'}>
            <Box display="flex" flexDirection="column">
              <Box>
                <Balance amount={vaultBalance} prefix="Vault balance: " />
              </Box>
              <Box
                display="flex"
                flexDirection={isScreenMd ? 'row' : 'column'}
                alignItems="center"
                width={1}
              >
                <Box
                  center
                  mr={isScreenMd ? 5 : 0}
                  width={isScreenMd ? '185px' : '100%'}
                  minWidth={185}
                >
                  <AmountField
                    amount={withdrawalAmount}
                    amountSetter={setWithdrawalAmount}
                    gweiAmountSetter={setWithdrawalGweiAmount}
                    maxAmount={vaultBalanceOf}
                    decimals={decimals}
                  />
                </Box>
                <ButtonGroup width={1}>
                  <Box
                    center
                    mr={5}
                    width={isScreenMd ? '185px' : '100%'}
                    minWidth={150}
                  >
                    <SelectField
                      defaultValue={withdrawTokens[0]}
                      value={selectedWithdrawToken}
                      options={withdrawTokens}
                      onChange={(newValue) => {
                        setSelectedWithdrawToken(newValue);
                        console.log(
                          'selectedWithdrawToken',
                          selectedWithdrawToken,
                          newValue,
                        );
                      }}
                    />
                  </Box>
                  <Box width={isScreenMd ? '130px' : '100%'}>
                    <ActionButton
                      className="action-button dark"
                      disabled={!vaultContract || !tokenContract}
                      handler={withdraw}
                      text="Withdraw"
                      title="Withdraw from vault"
                      showTooltip
                      tooltipText="Connect your wallet to withdraw from vault"
                    />
                  </Box>
                </ButtonGroup>
              </Box>
            </Box>
          </ActionGroup>
        </Box>
      </Wrapper>
    );
  } else {
    const depositHasBeenApproved =
      (tokenAllowance !== undefined && tokenAllowance !== '0') ||
      pureEthereum > 0 ||
      willZapIn;
    vaultControlsWrapper = (
      <Wrapper>
        <Box
          display="flex"
          flexDirection={isScreenMd ? 'row' : 'column'}
          width={1}
        >
          <ActionGroup
            direction={isScreenMd ? 'row' : 'column'}
            ml={isScreenMd ? '60px' : '0px'}
          >
            <Box display="flex" flexDirection="column">
              <Balance
                amount={
                  isZappable && sellToken ? sellToken.balance : walletBalance
                }
                prefix="Available: "
                decimalPlaces={balanceDecimalPlacesCount}
              />
              <Box
                display="flex"
                flexDirection={isScreenMd ? 'row' : 'column'}
                alignItems="center"
                width={1}
              >
                <Box
                  center
                  mr={isScreenMd ? 5 : 0}
                  width={isScreenMd ? '185px' : '100%'}
                  minWidth={185}
                >
                  <SelectField
                    defaultValue={selectedSellToken}
                    onChange={(value) => {
                      setDepositAmount(0);
                      setSelectedSellToken(value);
                    }}
                    options={
                      isZappable ? supportedTokenOptions : [selectedSellToken]
                    }
                  />
                </Box>
                <ButtonGroup width={1}>
                  <Box width={isScreenMd ? '185px' : '100%'}>
                    <AmountField
                      amount={depositAmount}
                      amountSetter={setDepositAmount}
                      gweiAmountSetter={setDepositGweiAmount}
                      maxAmount={
                        isZappable && sellToken
                          ? sellToken.balanceRaw
                          : tokenBalance
                      }
                      decimals={
                        isZappable && sellToken ? sellToken.decimals : decimals
                      }
                    />
                  </Box>
                  <Box width={isScreenMd ? '130px' : '100%'} ml={5}>
                    <ActionButton
                      disabled={
                        !vaultContract || !tokenContract || !!depositsDisabled
                      }
                      handler={() => (willZapIn ? zapperZap() : deposit())}
                      text={depositHasBeenApproved ? 'Deposit' : 'Approve'}
                      title="Deposit into vault"
                      showTooltipWhenDisabled
                      disabledTooltipText={
                        depositsDisabled ||
                        'Connect your wallet to deposit into vault'
                      }
                      showTooltipWhenEnabled={!depositHasBeenApproved}
                      enabledTooltipText={approvalExplainer}
                    />
                  </Box>
                </ButtonGroup>
              </Box>
              {zapperError &&
                zapperError.poolAddress === vaultAddress.toLowerCase() && (
                  <StyledErrorMessage>{zapperError.message}</StyledErrorMessage>
                )}
            </Box>
          </ActionGroup>

          <ActionGroup
            ml={isScreenMd ? '60px' : '0px'}
            direction={isScreenMd ? 'row' : 'column'}
          >
            <Box display="flex" flexDirection="column">
              <Box>
                <Balance
                  amount={vaultBalance}
                  prefix="Vault balance: "
                  decimalPlaces={balanceDecimalPlacesCount}
                />
              </Box>
              <Box
                display="flex"
                flexDirection={isScreenMd ? 'row' : 'column'}
                alignItems="center"
                width={1}
              >
                <Box
                  center
                  mr={isScreenMd ? 5 : 0}
                  width={isScreenMd ? '185px' : '100%'}
                  minWidth={185}
                >
                  <AmountField
                    amount={withdrawalAmount}
                    amountSetter={setWithdrawalAmount}
                    gweiAmountSetter={setWithdrawalGweiAmount}
                    maxAmount={vaultBalanceOf}
                    decimals={decimals}
                  />
                </Box>
                <ButtonGroup width={1}>
                  <Box
                    center
                    mr={5}
                    width={isScreenMd ? '185px' : '100%'}
                    minWidth={150}
                  >
                    <SelectField
                      defaultValue={withdrawTokens[0]}
                      value={selectedWithdrawToken}
                      options={withdrawTokens}
                      onChange={(newValue) => {
                        setSelectedWithdrawToken(newValue);
                        console.log(
                          'selectedWithdrawToken',
                          selectedWithdrawToken,
                          newValue,
                        );
                      }}
                    />
                  </Box>
                  <Box width={isScreenMd ? '130px' : '100%'}>
                    <ActionButton
                      className="action-button bold outline"
                      disabled={!vaultContract || !tokenContract}
                      handler={withdraw}
                      text="Withdraw"
                      title="Withdraw from vault"
                      showTooltipWhenDisabled
                      disabledTooltipText="Connect your wallet to withdraw from vault"
                    />
                  </Box>
                </ButtonGroup>
              </Box>
            </Box>
          </ActionGroup>
        </Box>
      </Wrapper>
    );
  }

  if (isMigratable) {
    vaultControlsWrapper = (
      <Wrapper>
        <Box
          width={isScreenMd ? '160px' : '100%'}
          ml={isScreenMd ? '60px' : '0px'}
        >
          <MigrateVault vaultAddress={vaultAddress} />
        </Box>
        <Box width={isScreenMd ? '160px' : '100%'} ml={5}>
          <ActionButton
            className="action-button dark"
            disabled={!vaultContract || !tokenContract}
            handler={withdrawAll}
            text="Withdraw All"
            title="Withdraw balance from vault"
            showTooltipWhenDisabled
            disabledTooltipText="Connect your wallet to withdraw from vault"
            outlined={1}
          />
        </Box>
      </Wrapper>
    );
  }

  return vaultControlsWrapper;
}

function SelectField({ defaultValue, options, onChange }) {
  return (
    <StyledRoundedSelect
      defaultValue={defaultValue}
      options={options}
      onChange={onChange}
    />
  );
}

function AmountField({
  amount,
  amountSetter,
  gweiAmountSetter,
  maxAmount,
  decimals,
  placeholder,
}) {
  return (
    <StyledRoundedInput
      value={amount}
      right={
        <MaxButton
          maxAmount={maxAmount}
          amountSetter={amountSetter}
          gweiAmountSetter={gweiAmountSetter}
          decimals={decimals}
        />
      }
      placeholder={placeholder}
      onChange={(evt) => {
        console.log('MAXAMOUT shti', maxAmount);
        console.log('MAXAMOUT value shti', evt.target.value);
        console.log('MAXAMOUT value shti decimals', decimals);
        console.log(
          'MAXAMOUT value normalized shti',
          getNormalizedAmount(maxAmount, decimals),
        );
        amountSetter(evt.target.value);

        if (evt.target.value) {
          const gweiAmount = new BigNumber(evt.target.value)
            .multipliedBy(10 ** decimals)
            .toFixed(0);

          gweiAmountSetter(gweiAmount);
        } else {
          gweiAmountSetter(0);
        }
      }}
      maxValue={getNormalizedAmount(maxAmount, decimals)}
    />
  );
}

function MaxButton({ maxAmount, amountSetter, gweiAmountSetter, decimals }) {
  return (
    <MaxWrapper
      onClick={() => {
        const normalizedAmount = new BigNumber(maxAmount)
          .dividedBy(10 ** decimals)
          .toFixed(2);

        amountSetter(normalizedAmount);
        gweiAmountSetter(maxAmount);
      }}
    >
      Max
    </MaxWrapper>
  );
}

function Balance({ amount, prefix, decimalPlaces = 2 }) {
  return (
    <div>
      {prefix}
      {new BigNumber(amount).toFixed(decimalPlaces)}
    </div>
  );
}

function ActionButton({
  disabled,
  className,
  handler,
  title,
  text,
  disabledTooltipText,
  enabledTooltipText,
  showTooltipWhenDisabled,
  showTooltipWhenEnabled,
  outlined,
}) {
  return (
    <ButtonFilled
      disabled={disabled}
      className={className}
      onClick={() => handler()}
      color="primary"
      title={title}
      disabledTooltipText={disabledTooltipText}
      showTooltipWhenDisabled={showTooltipWhenDisabled}
      outlined={outlined}
      showTooltipWhenEnabled={showTooltipWhenEnabled}
      enabledTooltipText={enabledTooltipText}
    >
      {text}
    </ButtonFilled>
  );
}
