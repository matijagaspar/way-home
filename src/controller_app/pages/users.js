import React, { useEffect, useMemo, useState, useCallback } from 'react'

import Page from '../components/Page'

import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'

import Button from '@material-ui/core/Button'
import IconButton from '@material-ui/core/IconButton'
import AddIcon from '@material-ui/icons/Add'
import Chip from '@material-ui/core/Chip'
import styled from 'styled-components'
import { stringToRGB, readableColor } from '../style/helpers'

import Dialog from '@material-ui/core/Dialog'
import DeleteIcon from '@material-ui/icons/Delete'
import DialogActions from '@material-ui/core/DialogActions'
import DialogContent from '@material-ui/core/DialogContent'
import DialogContentText from '@material-ui/core/DialogContentText'
import DialogTitle from '@material-ui/core/DialogTitle'
import TextField from '@material-ui/core/TextField'
import Autocomplete from '@material-ui/lab/Autocomplete'
import Grid from '@material-ui/core/Grid'
import Fab from '@material-ui/core/Fab'
import { flatPluck } from '../lib/array-utils'
const GroupChip = styled(Chip)`
    background-color: ${p => stringToRGB(p.label)} !important;
    color: ${p => readableColor(stringToRGB(p.label))} !important;
    margin: 2px;
`

// const _AddButton = props=>
// const AddButton = styled

const EditUsersDialog = ({ users, editing, onClose, onSave }) => {
  // const [ currentGroups, setCurrentGroups ] = useState([])
  const [email, setEmail] = useState('')
  const [groups, setGroups] = useState([])
  const [title, setTitle] = useState('New')

  useEffect(() => {
    if (editing) {
      setEmail(editing.email || '')
      setGroups(editing.groups || [])
      setTitle(editing.email ? 'Edit' : 'New')
    }
  }, [editing])

  const [validationErrors, setValidationErrors] = useState({})

  const existingGroups = useMemo(() => flatPluck('groups', users).filter(v => !groups.includes(v)), [users, groups])
  const attemptSave = async () => {
    const errors = {}
    if (!email) {
      errors.email = 'Email is required'
    }
    if (!flatPluck('email', users).includes(email) && (editing || {}).email === email) {
      errors.email = 'User already exists'
    }
    setValidationErrors(errors)
    if (Object.keys(errors).length === 0) {
      // todo loader
      await onSave({ email, groups })
    }
  }

  return (
    <Dialog
      fullWidth
      open={!!editing}
      onClose={onClose}
      aria-labelledby='form-dialog-title'
      style={{ minWidth: '400px' }}
    >
      <DialogTitle id='form-dialog-title'>{title} User</DialogTitle>
      <DialogContent>
        <DialogContentText />
        <TextField
          autoFocus
          margin='dense'
          id='email-input'
          name='email'
          label='Email Address'
          value={email}
          onChange={e => setEmail(e.target.value)}
          type='email'
          fullWidth
          disabled={title !== 'New'}
          required={title === 'New'}
          error={!!validationErrors.email}
          helperText={validationErrors.email}
        />
        <div style={{ height: '30px' }} />
        <Autocomplete
          multiple
          options={existingGroups}
          value={groups}
          renderOption={v => <GroupChip key={`o-${v}`} label={v} />}
          freeSolo
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <GroupChip key={option} label={option} {...getTagProps({ index })} />
            ))}
          onChange={(event, newValue) => {
            setGroups(newValue)
          }}
          renderInput={(params) => (
            <TextField {...params} label='Groups' placeholder='Groups' helperText={validationErrors.groups || (groups.includes('admin') ? 'This user is an admin' : '')} />
          )}
        />

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color='primary'>
          Cancel
        </Button>
        <Button onClick={attemptSave} color='primary'>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export async function getServerSideProps ({ res }) {
  if (res && res.locals && res.locals.api) {
    const users = await res.locals.api.getUsers()

    return { props: { users } }
  }
  return { props: { users: [] } }
}

const Users = props => {
  const [users, setUsers] = useState(props.users)
  const [editing, setEditing] = useState(null)
  const [deleteAlert, setDeleteAlert] = useState()

  // fetch apps
  const getUsers = useCallback(() => {
    fetch('/api/getUsers', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(users => {
        setUsers(users)
      }).catch(() => {
        // do nothing
      })
  }, [])

  // re-fetch apps
  useEffect(() => {
    if (!users.length) {
      getUsers()
    }
    const appFetchinterval = setInterval(() => {
      getUsers()
    }, 30000)

    return () => clearInterval(appFetchinterval)
  }, [])

  const saveUser = async ({ email, groups }) => {
    // better validation?
    if (!email || !groups) {
      return
    }
    const res = await fetch('/api/setUser', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, groups }),
    })
    const users = await res.json()
    setUsers(users)
    setEditing(null)
  }

  const handleOpen = (email, groups) => () => {
    setEditing({ email, groups })
  }

  const deleteUser = async (email) => {
    setDeleteAlert(null)
    const res = await fetch('/api/deleteUser', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })
    const users = await res.json()
    setUsers(users)
    setDeleteAlert(null)
  }

  return (
    <Page title='Way Home - Users' label='Users'>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Groups</TableCell>
                <TableCell style={{ width: '20px' }}>Delete</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>

              <For each='user' of={users}>
                <TableRow
                  key={user.email}
                  hover
                >
                  <TableCell
                    onClick={handleOpen(user.email, user.groups)}
                    component='th' scope='row' style={{ maxWidth: '300px', cursor: 'pointer' }}
                  >
                    {user.email}
                  </TableCell>
                  <TableCell>{(user.groups || []).map(g => <GroupChip key={g} label={g} />)}</TableCell>
                  <TableCell>
                    <IconButton aria-label='delete' onClick={() => setDeleteAlert(user.email)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              </For>
            </TableBody>
          </Table>
        </Grid>
        <Grid container item justify='flex-end'>
          <Fab color='primary' aria-label='add' onClick={() => setEditing({})}>
            <AddIcon />
          </Fab>
        </Grid>
      </Grid>
      <EditUsersDialog editing={editing} users={users} onClose={() => setEditing(null)} onSave={saveUser} />
      <Dialog
        open={!!deleteAlert}
        onClose={() => setDeleteAlert(null)}
      >
        <DialogTitle>Delete?</DialogTitle>
        <DialogContent>
          <DialogContentText id='alert-dialog-description'>
            Are you sure you want to delete {deleteAlert}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAlert(null)} color='primary'>
            Nope
          </Button>
          <Button onClick={() => deleteUser(deleteAlert)} color='primary' autoFocus>
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  )
}

// whatwg-fetch
export default Users
