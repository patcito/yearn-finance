import React from 'react';
import IconButton from 'components/IconButton';
import BigNumber from 'bignumber.js';
import {
  useContract,
  useContractData,
  useDrizzle,
} from 'containers/DrizzleProvider/hooks';
import { useSelector } from 'react-redux';
import { selectContractData } from 'containers/App/selectors';
import { useModal } from 'containers/ModalProvider/hooks';

const MAX_UINT256 = new BigNumber(2)
  .pow(256)
  .minus(1)
  .toFixed(0);

export default function VaultButton({ buttonType, vault }) {
  const {
    address,
    decimals,
    token: { address: tokenAddress },
  } = vault;
  const drizzle = useDrizzle();
  const { openModal } = useModal();
  const vaultContract = useContract(address);
  const tokenContractAddress = tokenAddress;
  const tokenContract =
    tokenContractAddress && drizzle.findContractByAddress(tokenContractAddress);

  const token = useSelector(selectContractData(tokenContractAddress));
  const vaultData = useSelector(selectContractData(address));

  if (!vault) {
    return <div />;
  }

  const writeMethods = _.get(drizzle, `contracts.${address}.writeMethods`, []);

  const tokenBalanceOf = token.balanceOf;

  const tokenMetadata = {
    displayFields: [{ name: 'Token balance', value: tokenBalanceOf, decimals }],
  };

  const vaultMetadata = {
    displayFields: [
      { name: 'Vault balance', value: vaultData.balanceOf, decimals },
    ],
  };

  console.log('actually', address);

  const argConfig = {
    approve: {
      _value: {
        defaultValue: MAX_UINT256,
        configurable: true,
      },
      _spender: {
        defaultValue: address,
      },
    },
    deposit: {
      metadata: tokenMetadata,
      _amount: {
        defaultValue: tokenBalanceOf,
        max: tokenBalanceOf,
        decimals,
      },
    },
    withdraw: {
      metadata: vaultMetadata,
      _shares: {
        max: vaultData.balanceOf,
        defaultValue: vaultData.balanceOf,
        decimals,
      },
    },
  };

  const openTransactionModal = (method, contract, contractData) => {
    const { inputs, name: methodName } = method;
    const inputArgs = _.get(argConfig, methodName);
    const modalArgs = {
      methodName,
      inputs,
      inputArgs,
      address,
      contract,
      contractData: vault,
    };
    openModal('transaction', modalArgs);
  };

  let iconType;
  let text;
  let writeMethod;
  let contract;
  let contractData;
  if (buttonType === 'deposit') {
    iconType = 'arrowDownAlt';
    text = 'Deposit';
    contract = vaultContract;
    contractData = vault;
    writeMethod = _.find(writeMethods, { name: 'deposit' });
  } else if (buttonType === 'withdraw') {
    iconType = 'arrowUpAlt';
    text = 'Withdraw';
    contract = vaultContract;
    contractData = vault;
    writeMethod = _.find(writeMethods, { name: 'withdraw' });
  } else if (buttonType === 'approve') {
    iconType = 'arrowUpAlt';
    text = 'Approve';
    if (!tokenContract) {
      return null;
    }
    contract = tokenContract;
    contractData = token;
    writeMethod = _.find(tokenContract.abi, { name: 'approve' });
  }

  return (
    <IconButton
      onClick={() => {
        openTransactionModal(writeMethod, contract, contractData);
      }}
      iconType={iconType}
    >
      {text}
    </IconButton>
  );
}
