import React, { Fragment, useState } from 'react'
import styled from 'styled-components'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Head from 'next/head'
import IconButton from '@material-ui/core/IconButton'
import TextField from '@material-ui/core/TextField'
import SearchIcon from '@material-ui/icons/Search'
import AccountCircle from '@material-ui/icons/AccountCircle'
import InputAdornment from '@material-ui/core/InputAdornment'
import { themeColor } from '../style/helpers'
import MainMenu from '../components/MainMenu'
import Typography from '@material-ui/core/Typography'

import ClickAwayListener from '@material-ui/core/ClickAwayListener'
import Grow from '@material-ui/core/Grow'
import Paper from '@material-ui/core/Paper'
import Popper from '@material-ui/core/Popper'
import MenuItem from '@material-ui/core/MenuItem'
import MenuList from '@material-ui/core/MenuList'

const SearchField = styled(TextField)`
    flex-grow: 1;
    max-width: 600px;
    &>div{
        
        padding-right: 10px;
        padding-left: 10px;
        &:before {
            border-bottom-color: ${themeColor('primary.contrastText')} !important;
            border-bottom-width: 1px !important;
        }
        &:after {
            border-bottom-color: ${themeColor('primary.contrastText')} !important;
        }
        &>input {
            color: white;
        }
        & svg {
            color:white !important;
        }
        
    }
`
const Content = styled.div`
padding: 10px 30px;
`

const Page = ({ onSearch, title, children, label }) => {
  const [userMenu, setUserMenu] = useState()
  const anchorRef = React.useRef(null)

  return (

    <>
      <Head>
        <title>{title}</title>
      </Head>
      <main>
        <AppBar position='static' color='primary'>
          <Toolbar style={{ justifyContent: 'space-between' }}>
            <MainMenu />

            <If condition={label}>
              <Typography variant='h4' color='inherit'>{label}</Typography>
            </If>
            <If condition={!label}>
              <SearchField
                onChange={evt => onSearch(evt.target.value)}
                autoFocus
                id='search'
                type='search'
                margin='normal'
                inputProps={{ autoComplete: 'off' }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </If>
            <IconButton ref={anchorRef} color='inherit' aria-label='Menu' onClick={() => setUserMenu(!userMenu)}>
              <AccountCircle />
            </IconButton>
            <Popper open={!!userMenu} anchorEl={anchorRef.current} role={undefined} transition disablePortal>
              {({ TransitionProps, placement }) => (
                <Grow
                  {...TransitionProps}
                  style={{ transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom' }}
                >
                  <Paper>
                    <ClickAwayListener onClickAway={() => setUserMenu(false)}>
                      <MenuList autoFocusItem={userMenu} id='menu-list-grow'>
                        <MenuItem onClick={() => { location.href = '/logout' }}>Logout</MenuItem>
                      </MenuList>
                    </ClickAwayListener>
                  </Paper>
                </Grow>
              )}
            </Popper>

          </Toolbar>
        </AppBar>
        <Content>
          {children}
        </Content>
      </main>
    </>
  )
}

export default Page
