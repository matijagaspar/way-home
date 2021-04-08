import React, { Fragment } from 'react'
import Drawer from '@material-ui/core/Drawer'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import ListItemText from '@material-ui/core/ListItemText'
import Divider from '@material-ui/core/Divider'
import IconButton from '@material-ui/core/IconButton'
import MenuIcon from '@material-ui/icons/Menu'
import MemoryIcon from '@material-ui/icons/Memory'
import GroupIcon from '@material-ui/icons/Group'
import PersonIcon from '@material-ui/icons/Person'
import ViewModuleIcon from '@material-ui/icons/ViewModule'
import Link from 'next/link'

class MainMenu extends React.Component {
  state = {
    drawerOpen: false,
  };

  toggleDrawer = (drawerOpen) => () => {
    this.setState({
      drawerOpen,
    })
  };

  render () {
    //   const { classes } = this.props

    //   const sideList = (
    //       <div className={ classes.list }>

    //       </div>
    //   )

    return (
      <>
        <IconButton color='inherit' aria-label='Menu' onClick={this.toggleDrawer(true)}>
          <MenuIcon />
        </IconButton>
        <Drawer open={this.state.drawerOpen} onClose={this.toggleDrawer(false)}>
          <div
            tabIndex={0}
            role='button'
            onClick={this.toggleDrawer(false)}
            onKeyDown={this.toggleDrawer(false)}
          >
            <List>
              <Link href='/'>
                <ListItem button style={{ paddingRight: '32px' }}>
                  <ListItemIcon>
                    <ViewModuleIcon />
                  </ListItemIcon>
                  <ListItemText>
                    Apps
                  </ListItemText>
                </ListItem>
              </Link>
              <Link href='/users'>
                <ListItem button style={{ paddingRight: '32px' }}>
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText>
                    Users
                  </ListItemText>
                </ListItem>
              </Link>

            </List>
          </div>
        </Drawer>
      </>
    )
  }
}
/*
 <ListItem button>
                              <ListItemIcon>
                                  <GroupIcon />
                              </ListItemIcon>
                              <ListItemText>
                                  Groups
                              </ListItemText>
                          </ListItem>
                          <ListItem button>
                              <ListItemIcon>
                                  <MemoryIcon />
                              </ListItemIcon>
                              <ListItemText>
                                  Agents
                              </ListItemText>
                          </ListItem>
                          */
MainMenu.propTypes = {
  // classes: PropTypes.object.isRequired,
}

export default MainMenu
