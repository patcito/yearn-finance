import React from 'react';
import styled from 'styled-components';
import Accordion from 'react-bootstrap/Accordion';
import TokenIcon from 'components/TokenIcon';
import BigNumber from 'bignumber.js';
// import VaultsHeaderDev from 'components/VaultsHeaderDev';
import {
  selectVaults,
  selectContracts,
  selectContractsFlat,
} from 'containers/App/selectors';
// import { selectDevMode } from 'containers/DevMode/selectors';
import { useSelector } from 'react-redux';
import { useShowDevVaults } from 'containers/Vaults/hooks';
import Table from 'components/Table';
import IconButton from 'components/IconButton';
import InfoCard from 'components/InfoCard';
import { currencyTransform } from 'utils/string';
import VaultButton from 'components/VaultButton';

const Cards = styled.div`
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3,1fr);
  grid-column-gap: 16px;
  margin-bottom: 32px;
}
`;

const Buttons = styled.div`
  display: inline-flex;
  grid-gap: 12px;
`;

const Wrapper = styled.div`
  width: 1088px;
  margin: 0 auto;
`;

const StyledTokenIcon = styled(TokenIcon)`
  width: 30px;
  margin-right: 20px;
`;

const IconName = styled.div`
  overflow: hidden;
  padding-right: 10px;
  text-overflow: ellipsis;
`;

const IconAndName = styled.div`
  display: flex;
  align-items: center;
`;

const Vaults = () => {
  // const devMode = useSelector(selectDevMode());
  const showDevVaults = useShowDevVaults();

  let columnHeader;
  // if (false) {
  //   columnHeader = <VaultsHeaderDev />;
  // }

  return (
    <Wrapper>
      {columnHeader}
      <Accordion>
        <VaultsWrapper showDevVaults={showDevVaults} />
      </Accordion>
    </Wrapper>
  );
};

const tokenTransform = (val, asset) => {
  const { vaultAlias, displayName, apy, tokenAddress, address, token } = asset;
  if (!token.address) {
    console.log('xxx', asset);
  }
  return (
    <IconAndName>
      <StyledTokenIcon address={token.address} />
      <IconName>{displayName || address}</IconName>
    </IconAndName>
  );
};

const apyTransform = apyObj => {
  const apyTruncated = parseFloat(apyObj.oneMonthSample).toFixed(2);
  let displayApy = 'N/A';
  if (apyTruncated !== 'NaN') {
    displayApy = `${apyTruncated}%`;
  }
  return displayApy;
};

// const earnedTransform = (statistics, vault) => {
//   const { earnings = 0 } = statistics;
//   const earningsNormalized = new BigNumber(earnings)
//     .dividedBy(10 ** vault.decimals)
//     .toFixed(2);
//   return currencyTransform(earningsNormalized);
// };

const tokenBalanceTransform = (tokenBalanceOf, vault) => {
  const tokenBalanceOfNormalized = new BigNumber(tokenBalanceOf)
    .dividedBy(10 ** vault.decimals)
    .toFixed(4);
  const displayBalance =
    tokenBalanceOfNormalized === 'NaN' ? '-' : tokenBalanceOfNormalized;

  return displayBalance;
};

const depositedTransform = depositedNormalized => {
  const displayDeposited =
    depositedNormalized === 'NaN' ? '-' : depositedNormalized;
  return displayDeposited;
};

const VaultsWrapper = () => {
  const vaults = useSelector(selectVaults('vaults'));
  const vaultsContractData = useSelector(selectContractsFlat('vaults'));
  const tokensContractData = useSelector(selectContractsFlat('tokens'));

  const vaultActionsTransform = (val, row) => {
    let withdrawButton;
    let depositButton;
    if (row.depositedNormalized > 0) {
      withdrawButton = <VaultButton vault={row} buttonType="withdraw" />;
    }
    console.log('al!!!', row);
    if (row.allowance > 0) {
      depositButton = <VaultButton vault={row} buttonType="deposit" />;
    } else {
      depositButton = <VaultButton vault={row} buttonType="approve" />;
    }
    return (
      <Buttons>
        {withdrawButton}
        {depositButton}
        <IconButton iconType="stats">Stats</IconButton>
      </Buttons>
    );
  };

  const mergeVaultsData = vault => {
    const apiVaultAddress = vault.address;
    const vaultContractData =
      _.find(
        vaultsContractData,
        vaultContract => vaultContract.address === apiVaultAddress,
      ) || {};

    const mergedVault = vault;

    const tokenContractData =
      _.find(
        tokensContractData,
        tokenContract => tokenContract.address === vault.token.address,
      ) || {};

    const tokenBalanceOf = _.get(tokenContractData, 'balanceOf');
    const deposited = _.get(vaultContractData, 'balanceOf');
    const depositedNormalized = new BigNumber(deposited)
      .dividedBy(10 ** vault.decimals)
      .toFixed(4);

    mergedVault.tokenBalanceOf = tokenBalanceOf;
    console.log('xc', vaultContractData);
    mergedVault.allowance = tokenContractData.allowance;
    mergedVault.balanceOf = vaultContractData.balanceOf;
    mergedVault.apiVersion = vaultContractData.apiVersion || null;
    mergedVault.depositedNormalized = depositedNormalized;
    return mergedVault;
  };
  const mergedVaultsData = _.orderBy(
    _.map(vaults, mergeVaultsData),
    'apiVersion',
    'depositedNormalized',
    ['desc', 'desc'],
  );

  const filterYourVaults = vault => _.get(vault, 'balanceOf') > 0;
  const yourVaults = _.filter(mergedVaultsData, filterYourVaults);

  const yourVaultsAddresses = _.map(yourVaults, vault => vault.address);

  const filterNotYourVaults = vault =>
    !_.includes(yourVaultsAddresses, vault.address);

  const otherVaults = _.filter(mergedVaultsData, filterNotYourVaults);

  const v2Vaults = _.filter(otherVaults, vault => vault.type === 'v2');
  const v2VaultsSorted = _.orderBy(v2Vaults, 'tokenBalanceOf', 'desc');

  const v1Vaults = _.filter(otherVaults, vault => vault.type === 'v1');
  const v1VaultsSorted = _.orderBy(v1Vaults, 'tokenBalanceOf', 'desc');

  const versionTransform = val => (val ? 'v2' : 'v1');

  const yourVaultsTable = {
    title: 'Your vaults',
    columns: [
      {
        key: 'tokenIconAndName',
        alias: 'Asset',
        transform: tokenTransform,
      },
      { key: 'apy', alias: 'ROI', transform: apyTransform },
      {
        key: 'tokenBalanceOf',
        alias: 'Balance',
        transform: tokenBalanceTransform,
      },
      {
        key: 'depositedNormalized',
        alias: 'deposited',
        transform: depositedTransform,
      },
      { key: 'actions', alias: '', transform: vaultActionsTransform },
    ],
    rows: yourVaults,
  };

  const v2VaultsTable = {
    title: 'V2 vaults',
    columns: [
      {
        key: 'tokenIconAndName',
        alias: 'Asset',
        transform: tokenTransform,
      },
      { key: 'apy', alias: 'ROI', transform: apyTransform },
      {
        key: 'tokenBalanceOf',
        alias: 'Balance',
        transform: tokenBalanceTransform,
      },
      {
        key: 'depositedNormalized',
        alias: 'deposited',
        transform: depositedTransform,
      },
      { key: 'actions', alias: '', transform: vaultActionsTransform },
    ],
    rows: v2VaultsSorted,
  };

  const v1VaultsTable = {
    title: 'V1 vaults',
    columns: [
      {
        key: 'tokenIconAndName',
        alias: 'Asset',
        transform: tokenTransform,
      },
      { key: 'apy', alias: 'ROI', transform: apyTransform },
      {
        key: 'tokenBalanceOf',
        alias: 'Balance',
        transform: tokenBalanceTransform,
      },
      {
        key: 'depositedNormalized',
        alias: 'deposited',
        transform: depositedTransform,
      },
      { key: 'actions', alias: '', transform: vaultActionsTransform },
    ],
    rows: v1VaultsSorted,
  };

  return (
    <React.Fragment>
      <Cards>
        <InfoCard label="Unique Users" value="3344234" />
        <InfoCard
          label="Your Earnings"
          value="1233"
          formatter={currencyTransform}
        />
        <InfoCard
          label="TVL"
          value="493342132.53193647"
          formatter={currencyTransform}
        />
      </Cards>
      <Table data={yourVaultsTable} />
      <Table data={v2VaultsTable} />
      <Table data={v1VaultsTable} />
    </React.Fragment>
  );
};

Vaults.whyDidYouRender = true;
export default Vaults;
