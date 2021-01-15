import React, { useEffect } from 'react';
import {
  selectContractsByTag,
  selectAllContracts,
  selectTokenAllowance,
} from 'containers/App/selectors';
import {
  selectBorrowStats,
  selectCollateralEnabled,
} from 'containers/Cream/selectors';
import erc20Abi from 'abi/erc20.json';
import styled from 'styled-components';
import { useInjectSaga } from 'utils/injectSaga';
import TokenIcon from 'components/TokenIcon';
import Table from 'components/Table';
import { getSupplyData, getBorrowData } from 'utils/cream';
import { useModal } from 'containers/ModalProvider/hooks';
import IconButton from 'components/IconButton';
import { useSelector, useDispatch } from 'react-redux';
import InfoCard from 'components/InfoCard';
import { BigNumber } from 'bignumber.js';
import { useAccount, useWeb3 } from 'containers/ConnectionProvider/hooks';
import ButtonFilled from 'components/ButtonFilled';
import { flattenData } from 'utils/contracts';
import saga from './saga';
import { initializeCream, creamEnterMarkets, approveTxSpend } from './actions';

const MAX_UINT256 = new BigNumber(2)
  .pow(256)
  .minus(1)
  .toFixed(0);

const Wrapper = styled.div`
  margin: 0 auto;
  max-width: 1088px;
`;

const IconAndName = styled.div`
  display: flex;
  align-items: center;
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

const tokenTransform = asset => {
  const { address, symbol } = asset;
  return (
    <IconAndName>
      <StyledTokenIcon address={asset.address} />
      <IconName>{symbol[0].value || address}</IconName>
    </IconAndName>
  );
};

const percentTransform = val => `${val}%`;

// const tokenSymbolTransform = (val, row) =>
//   `${val} ${row.asset.symbol[0].value}`;

// const dollarTransform = val => `$${val}`;

export default function Cream() {
  useInjectSaga({ key: 'cream', saga });
  const dispatch = useDispatch();
  const web3 = useWeb3();
  const account = useAccount();

  const initialize = () => {
    dispatch(initializeCream());
  };
  useEffect(initialize, []);
  const selectCollateralEnabledData = useSelector(selectCollateralEnabled());
  const creamCTokens = useSelector(selectContractsByTag('creamCTokens'));

  const creamCTokenAddresses = _.map(creamCTokens, token =>
    _.get(token, 'address'),
  );
  const allContracts = useSelector(selectAllContracts());
  const borrowLimitStats = useSelector(selectBorrowStats);
  const { openModal } = useModal();

  const supplyData = getSupplyData({
    creamCTokenAddresses,
    allContracts,
    borrowLimitStats,
  });

  const supplyDataSorted = _.orderBy(supplyData, 'supplied', 'desc');

  const borrowData = getBorrowData({
    creamCTokenAddresses,
    allContracts,
    borrowLimitStats,
  });

  const borrowDataSorted = _.orderBy(borrowData, 'borrowed', 'desc');
  const borrowedData = _.filter(borrowDataSorted, data => data.borrowed > 0);

  const suppliedData = _.filter(supplyDataSorted, data => data.supplied > 0);

  const supplyRowClickHandler = row => {
    openModal('cream', row);
  };

  const borrowRowClickHandler = row => {
    openModal('cream', row);
  };

  const borrowActionsTransform = (val, row) => {
    let withdrawButton;
    if (row.borrowed > 0) {
      withdrawButton = <IconButton iconType="arrowUpAlt">Repay</IconButton>;
    }
    return (
      <Buttons>
        {withdrawButton}
        <IconButton iconType="arrowDownAlt">Borrow</IconButton>
      </Buttons>
    );
  };

  const approveToken = async (tokenContractAddress, creamCTokenAddress) => {
    dispatch(approveTxSpend(tokenContractAddress, creamCTokenAddress));
  };

  const allActionsTransform = (_rowValue, rowData) => {
    const creamCTokenAddress = _.get(rowData, 'creamCTokenAddress');
    const token = _.get(rowData, 'asset');
    const tokenContractAddress = _.get(token, 'address');
    const allowances = _.get(token, 'allowance');
    const tokenAllowanceObject = _.find(allowances, allowance =>
      _.includes(allowance.args, creamCTokenAddress),
    );
    const tokenAllowance = _.get(tokenAllowanceObject, 'value');
    const crTokenAllowedToSpendToken = tokenAllowance > 0;
    const marketEntered = selectCollateralEnabledData.includes(
      creamCTokenAddress,
    );

    let enableCollateral;

    if (marketEntered) {
      if (crTokenAllowedToSpendToken) {
        enableCollateral = <div>Approved and Ready!</div>;
      } else {
        enableCollateral = (
          <ButtonFilled
            variant="contained"
            color="primary"
            onClick={() =>
              approveToken(tokenContractAddress, creamCTokenAddress)
            }
          >
            Approve Token
          </ButtonFilled>
        );
      }
    } else {
      enableCollateral = (
        <ButtonFilled
          variant="contained"
          color="primary"
          onClick={() => {
            if (marketEntered) {
              // TODO: Exit Market, meh
              return;
            }
            dispatch(creamEnterMarkets(web3, creamCTokenAddress));
          }}
        >
          Enter Market/Enable
        </ButtonFilled>
      );
    }

    return (
      <Buttons>
        <IconButton
          iconType="arrowUpAlt"
          onClick={() => supplyRowClickHandler(rowData)}
        >
          Supply
        </IconButton>
        <IconButton
          iconType="arrowDownAlt"
          onClick={() => borrowRowClickHandler(rowData)}
        >
          Borrow
        </IconButton>
        {enableCollateral}
      </Buttons>
    );
  };

  const supplyActionsTransform = (val, row) => {
    let withdrawButton;
    if (row.supplied > 0) {
      withdrawButton = (
        <IconButton iconType="arrowDownAlt">Withdraw</IconButton>
      );
    }
    return (
      <Buttons>
        {withdrawButton}
        <IconButton iconType="arrowUpAlt">Supply</IconButton>
      </Buttons>
    );
  };

  const supplyTable = {
    title: 'Assets Supplied - $8.00',
    rowClickHandler: supplyRowClickHandler,
    columns: [
      { key: 'asset', transform: tokenTransform },
      {
        key: 'supplied',
      },
      {
        key: 'wallet',
        alias: 'balance',
      },
      {
        key: 'apy',
        transform: percentTransform,
      },
      {
        key: 'actions',
        alias: '',
        transform: supplyActionsTransform,
      },
    ],
    rows: suppliedData,
  };

  const borrowTable = {
    title: 'Assets Borrowed - $2.00',
    columns: [
      { key: 'asset', transform: tokenTransform },
      {
        key: 'borrowed',
      },
      {
        key: 'wallet',
        alias: 'Balance',
      },
      {
        key: 'apy',
        transform: percentTransform,
      },
      {
        key: 'actions',
        alias: '',
        transform: borrowActionsTransform,
      },
    ],
    rows: borrowedData,
  };

  const allAssetsTable = {
    title: 'All Assets',
    columns: [
      { key: 'asset', transform: tokenTransform },
      {
        key: 'wallet',
        alias: 'Balance',
      },
      {
        key: 'supplyApy',
        transform: percentTransform,
      },
      {
        key: 'borrowApy',
        transform: percentTransform,
      },
      {
        key: 'actions',
        alias: '',
        transform: allActionsTransform,
      },
    ],
    rows: borrowDataSorted,
  };

  console.log('borw', borrowDataSorted);

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });

  const dollarFormatter = val => formatter.format(val);
  const percentageFormatter = val => `${parseInt(val, 10).toFixed(0)}%`;

  return (
    <Wrapper>
      <Cards>
        <InfoCard
          label="Supply Balance"
          value="3"
          formatter={dollarFormatter}
        />
        <InfoCard
          label="Borrow Balance"
          value="3"
          formatter={dollarFormatter}
        />
        <InfoCard
          label="BorrowUtilzation Ratio"
          value="3"
          formatter={percentageFormatter}
        />
      </Cards>
      <Table data={supplyTable} />
      <Table data={borrowTable} />
      <Table data={allAssetsTable} />
    </Wrapper>
  );
}
// Cream.whyDidYouRender = true;
// export default Cream;
