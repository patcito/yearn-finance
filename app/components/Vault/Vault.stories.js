import React from 'react';

import { Vault } from '.';
import { Vault as NewVault } from './NewVault';

export default {
  title: 'V2/Vault',
  component: Vault,
};

const Template = args => <Vault {...args} />;

export const Default = Template.bind();
Default.args = {
  vault: {
    symbolAlias: 'yUSD',
    tokenAddress: '0xb27c012b36e79decb305fd1e512ba90eb035a6fa',
    tokenSymbolAlias: 'yUSD',
    decimals: 18,
    token: '0xb27c012b36e79decb305fd1e512ba90eb035a6fa',
    name: 'yUSD',
    totalAssets: 10000000000000,
    balance: 10000000000,
    balanceOf: 100000000000,
    address: '0xb27c012b36e79decb305fd1e512ba90eb035a6fa',
  },
  showDevVaults: true,
  active: true,
};

const NewTemplate = args => <NewVault {...args} />;
export const NewDefault = NewTemplate.bind();
NewDefault.args = {
  vault: {
    symbolAlias: 'yUSD',
    tokenAddress: '0xb27c012b36e79decb305fd1e512ba90eb035a6fa',
    tokenSymbolAlias: 'yUSD',
    decimals: 18,
    token: '0xb27c012b36e79decb305fd1e512ba90eb035a6fa',
    name: 'yUSD',
    totalAssets: 10000000000000,
    balance: 10000000000,
    balanceOf: 100000000000,
    address: '0xb27c012b36e79decb305fd1e512ba90eb035a6fa',
  },
  showDevVaults: true,
  active: true,
};
