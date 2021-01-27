import React, { useState, useEffect } from 'react';

import { Typography, Switch, Button } from '@material-ui/core'
import { withStyles } from '@material-ui/core/styles';
import { withTheme } from '@material-ui/core/styles';

import WbSunnyOutlinedIcon from '@material-ui/icons/WbSunnyOutlined';
import Brightness2Icon from '@material-ui/icons/Brightness2';

import Unlock from '../unlock'

import stores from '../../stores'
import { formatAddress } from '../../utils'

import classes from './header.module.css'

const StyledSwitch = withStyles((theme) => ({
  root: {
    width: 58,
    height: 32,
    padding: 0,
    margin: theme.spacing(1),
  },
  switchBase: {
    padding: 1,
    '&$checked': {
      transform: 'translateX(28px)',
      color: '#212529',
      '& + $track': {
        backgroundColor: '#ffffff',
        opacity: 1,
      },
    },
    '&$focusVisible $thumb': {
      color: '#ffffff',
      border: '6px solid #fff',
    }
  },
  thumb: {
    width: 24,
    height: 24,
  },
  track: {
    borderRadius: 32 / 2,
    border: `1px solid #212529`,
    backgroundColor: '#212529',
    opacity: 1,
    transition: theme.transitions.create(['background-color', 'border']),
  },
  checked: {},
  focusVisible: {},
}))(({ classes, ...props }) => {
  return (
    <Switch
      focusVisibleClassName={classes.focusVisible}
      disableRipple
      classes={{
        root: classes.root,
        switchBase: classes.switchBase,
        thumb: classes.thumb,
        track: classes.track,
        checked: classes.checked,
      }}
      {...props}
    />
  );
});

function Header(props) {

  const account = stores.accountStore.getStore('account')

  const [ darkMode, setDarkMode ] = useState(props.theme.palette.type === 'dark' ? true : false);
  const [ unlockOpen, setUnlockOpen ] = useState(false);

  const handleToggleChange = (event, val) => {
    setDarkMode(val)
    props.changeTheme(val)
  }

  const onAddressClicked = () => {
    setUnlockOpen(true)
  }

  const closoeUnlock = () => {
    setUnlockOpen(false)
  }

  useEffect(function() {
    const localStorageDarkMode = window.localStorage.getItem('yearn.finance-dark-mode')
    setDarkMode(localStorageDarkMode ? localStorageDarkMode === 'dark' : false)
  },[]);

  return (
    <div className={ classes.headerContainer }>
      { props.backClicked && (
        <div className={ classes.backButton }>
          <Button
            color='secondary'
            variant='contained'
            onClick={ props.backClicked }
            >
            <Typography variant='h5'>Back</Typography>
          </Button>
        </div>
      )}
      <div className={ classes.themeSelectContainer }>
        <StyledSwitch
          icon={ <Brightness2Icon className={ classes.switchIcon }/> }
          checkedIcon={ <WbSunnyOutlinedIcon className={ classes.switchIcon }/> }
          checked={ darkMode }
          onChange={ handleToggleChange }
        />
      </div>
      <Button
        disableElevation
        className={ classes.accountButton }
        variant='contained'
        color='secondary'
        onClick={ onAddressClicked }
        >
        <div className={ `${classes.accountIcon} ${classes.metamask}` }></div>
        <Typography variant='h5'>{ account ? formatAddress(account.address) : 'Connect Wallet' }</Typography>
      </Button>

      { unlockOpen && (
        <Unlock modalOpen={ unlockOpen } closeModal={ closoeUnlock } />
      )}
    </div>
  )
}

export default withTheme(Header)