import tw, { styled } from 'twin.macro';
import React, { memo } from 'react';
import { compose } from 'redux';
import { useSelector } from 'react-redux';
import AnimatedNumber from 'components/AnimatedNumber';
import BigNumber from 'bignumber.js';
import { abbreviateNumber } from 'utils/string';
import { selectDevMode } from 'containers/DevMode/selectors';
import { selectContractData } from 'containers/App/selectors';
import { getContractType } from 'utils/contracts';
import TokenIcon from 'components/TokenIcon';

const IconAndName = tw.div`flex items-center`;

const StyledTokenIcon = styled(TokenIcon)`
  width: 40px;
  margin-right: 20px;
`;

const IconName = styled.div`
  overflow: hidden;
  padding-right: 10px;
  text-overflow: ellipsis;
`;

const A = styled.a`
  display: inline-grid;
`;

const truncateApy = apy => {
  if (!apy) {
    return 'N/A';
  }
  const truncatedApy = apy && apy.toFixed(2);
  const apyStr = `${truncatedApy}%`;
  return apyStr;
};

const LinkWrap = props => {
  const { devMode, children, address } = props;
  if (!devMode) {
    return <span>{children}</span>;
  }
  return (
    <A
      href={`https://etherscan.io/address/${address}`}
      target="_blank"
      onClick={evt => evt.stopPropagation()}
    >
      {children}
    </A>
  );
};

const Earning = ({ type, value }) => (
  <div>
    <span>{value}</span>
    <div tw="flex space-x-2 items-center justify-center">
      <span>{type}</span>
      <div tw="text-white w-5 h-5 flex items-center justify-center">
        <svg
          tw="cursor-pointer"
          width="16"
          height="17"
          viewBox="0 0 16 17"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g opacity="0.5">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M8 2C4.41015 2 1.5 4.91015 1.5 8.5C1.5 12.0899 4.41015 15 8 15C11.5899 15 14.5 12.0899 14.5 8.5C14.5 4.91015 11.5899 2 8 2ZM0 8.5C0 4.08172 3.58172 0.5 8 0.5C12.4183 0.5 16 4.08172 16 8.5C16 12.9183 12.4183 16.5 8 16.5C3.58172 16.5 0 12.9183 0 8.5ZM6.5 8.25C6.5 7.83579 6.83579 7.5 7.25 7.5H8.25C8.66421 7.5 9 7.83579 9 8.25V11H9.25C9.66421 11 10 11.3358 10 11.75C10 12.1642 9.66421 12.5 9.25 12.5H7.25C6.83579 12.5 6.5 12.1642 6.5 11.75C6.5 11.3358 6.83579 11 7.25 11H7.5V9H7.25C6.83579 9 6.5 8.66421 6.5 8.25ZM8 6.5C8.55229 6.5 9 6.05228 9 5.5C9 4.94772 8.55229 4.5 8 4.5C7.44772 4.5 7 4.94772 7 5.5C7 6.05228 7.44772 6.5 8 6.5Z"
              fill="white"
            />
          </g>
        </svg>
      </div>
    </div>
  </div>
);

const MoreInfoLink = ({ href }) => (
  <a
    href={href}
    tw="flex justify-center items-center self-end text-white bg-yearn-blue rounded-sm p-1"
  >
    <svg
      width="20"
      height="20"
      viewBox="0 0 17 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.0332 18.3334C8.0332 18.8857 8.48092 19.3334 9.0332 19.3334C9.58549 19.3334 10.0332 18.8857 10.0332 18.3334V1.66671C10.0332 1.11442 9.58549 0.666708 9.0332 0.666708C8.48092 0.666708 8.0332 1.11442 8.0332 1.66671V18.3334ZM15.0332 19.3334C14.4809 19.3334 14.0332 18.8857 14.0332 18.3334V7.00004C14.0332 6.44776 14.4809 6.00004 15.0332 6.00004C15.5855 6.00004 16.0332 6.44776 16.0332 7.00004V18.3334C16.0332 18.5986 15.9278 18.8529 15.7403 19.0405C15.5528 19.228 15.2984 19.3334 15.0332 19.3334ZM2.0332 18.3334L2.0332 9.66671C2.0332 9.11442 2.48092 8.66671 3.0332 8.66671C3.58549 8.66671 4.0332 9.11442 4.0332 9.66671L4.0332 18.3334C4.0332 18.8857 3.58549 19.3334 3.0332 19.3334C2.48092 19.3334 2.0332 18.8857 2.0332 18.3334Z"
        fill="white"
      />
    </svg>
  </a>
);

const VaultComponent = props => {
  const { vault } = props;
  const vaultContractData = useSelector(selectContractData(vault.address));
  _.merge(vault, vaultContractData);
  const {
    symbolAlias,
    tokenAddress,
    tokenSymbolAlias,
    decimals,
    token,
    name,
    totalAssets,
    balance,
    balanceOf,
    address,
  } = vault;

  const devMode = useSelector(selectDevMode());
  const tokenContractAddress = tokenAddress || token;
  const tokenContractData = useSelector(
    selectContractData(tokenContractAddress),
  );

  const tokenBalance = _.get(tokenContractData, 'balanceOf');
  const tokenSymbol = tokenSymbolAlias || _.get(tokenContractData, 'symbol');
  const vaultName = symbolAlias || tokenSymbol || name;

  const apyOneMonthSample = _.get(vault, 'apy.apyOneMonthSample');
  const apy = truncateApy(apyOneMonthSample);
  const tokenBalanceOf = new BigNumber(tokenBalance)
    .dividedBy(10 ** decimals)
    .toFixed();
  const vaultBalanceOf = new BigNumber(balanceOf)
    .dividedBy(10 ** decimals)
    .toFixed();
  let vaultAssets = balance || totalAssets;
  vaultAssets = new BigNumber(vaultAssets).dividedBy(10 ** decimals).toFixed(0);
  vaultAssets = vaultAssets === 'NaN' ? '-' : abbreviateNumber(vaultAssets);
  const contractType = getContractType(vault);

  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div tw="shadow-md">
      <div tw="w-full border-t flex-wrap">
        <input
          tw="absolute opacity-0"
          id="tab-single-one"
          type="checkbox"
          name="tabs2"
          onChange={() => setIsOpen(!isOpen)}
        />
        <label
          tw="flex px-5 py-2 cursor-pointer bg-yearn-blue rounded-lg flex-wrap"
          css={[
            isOpen &&
              tw`ring-gray-100 ring-opacity-50 rounded-bl-none rounded-br-none`,
          ]}
          htmlFor="tab-single-one"
        >
          <div tw="flex flex-row flex-wrap font-black text-xl text-white justify-between items-center w-full">
            <IconAndName>
              <LinkWrap devMode={devMode} address={address}>
                <StyledTokenIcon address={tokenContractAddress} />
              </LinkWrap>
              <LinkWrap devMode={devMode} address={address}>
                <IconName devMode={devMode}>{vaultName || address}</IconName>
              </LinkWrap>
            </IconAndName>
            <span>{contractType}</span>
            <div tw="flex space-x-1">
              <AnimatedNumber value={tokenBalanceOf} />
              <LinkWrap devMode={devMode} address={tokenAddress}>
                {tokenSymbol}
              </LinkWrap>
            </div>
            <AnimatedNumber value={vaultBalanceOf} />
            <span>{vaultAssets}</span>
            <span>{apy}</span>
            {/* <span>Available to deposit</span> */}
            {/* arrow down */}
            <div
              tw="w-5 h-5 text-white transform transition-all ease-in duration-200"
              css={[isOpen && tw`rotate-180`]}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </label>
        <div
          css={[
            tw`
              leading-normal max-h-0 transition transform ease-out 
              flex-wrap
              duration-200 divide-yearn-blue divide-y-2 rounded-md rounded-tl-none rounded-tr-none
            `,
            isOpen && tw`max-h-full`,
          ]}
        >
          <div tw="bg-yearn-blueDark px-5 py-4 text-white font-bold flex justify-between flex-wrap">
            <span>Vault infos:</span>
            <span>???</span>
            <span>???</span>
            <MoreInfoLink href="/more-info" />
          </div>
          <div tw="flex flex-wrap justify-between px-5 py-4 bg-yearn-blueDark text-white">
            <span>Earnings:</span>
            <Earning type="Historical Earnings" value="2.156" />
            <Earning type="Projected Earnings" value="2.156" />
            <Earning type="Available to Withdraw" value="2.156" />
          </div>
          <div tw="bg-yearn-blueDark px-5 py-4 text-white font-bold flex justify-end space-x-4">
            <button
              type="button"
              tw="bg-yearn-blue px-4 py-2 text-white rounded-md w-36 text-sm"
            >
              Deposit
            </button>
            <button
              type="button"
              tw="bg-yearn-blue px-4 py-2 text-white rounded-md w-36 text-sm"
            >
              Withdraw
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // return (
  //   <React.Fragment>
  //     <Card className={active && 'active'}>
  //       <Accordion.Toggle as={Card.Header} variant="link" eventKey={address}>
  //         {vaultTop}
  //         <StyledArrow src={Arrow} alt="arrow" expanded={active} />
  //       </Accordion.Toggle>
  //       <Accordion.Collapse eventKey={address}>
  //         <Card.Body>
  //           {vaultBottom}
  //           <Card.Footer className={active && 'active'}>
  //             <Footer>
  //               <VaultButtons
  //                 vault={vault}
  //                 token={tokenContractData}
  //                 showDevVaults={showDevVaults}
  //               />
  //             </Footer>
  //           </Card.Footer>
  //         </Card.Body>
  //       </Accordion.Collapse>
  //     </Card>
  //   </React.Fragment>
  // );
};

VaultComponent.whyDidYouRender = true;
const Vault = compose(memo)(VaultComponent);
export default Vault;
export { Vault };
