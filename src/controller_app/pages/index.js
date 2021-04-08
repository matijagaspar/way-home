import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import Typography from '@material-ui/core/Typography'
import debounce from 'lodash.debounce'
import Fuse from 'fuse.js'
import Page from '../components/Page'
import { Flipper, Flipped, spring } from 'react-flip-toolkit'

import { themeColor, stringToRGB, breakpoint, transparentize } from '../style/helpers'

const AppLogo = styled.div`
    background-image: url('${p => p.icon || '/static/screen.svg'}');
    background-size: 75%;
    
    background-repeat: no-repeat;
    background-position: center; 
    background-color:#ddd;
    width:200px;
    
    height:160px;
    @media ${breakpoint.lt('sm')} {
        width:140px;
        height:112px;
    }

`

const AppDesc = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    height:40px;
    padding-left: 10px;
    padding-right: 10px;

    @media ${breakpoint.lt('sm')} {
        height:30px;
    padding-left: 5px;
    padding-right: 5px;
    }

`

const _AppTile = ({ className, agent, app_name, app_link, icon, ...rest }) => (
  <div className={className} onClick={() => window.open(app_link, '_blank')} {...rest}>
    <AppLogo icon={icon} />
    <AppDesc>
      <div>
        <Typography variant='caption'>
          {agent}
        </Typography>
        <Typography variant='body1'>
          {app_name}
        </Typography>
      </div>

    </AppDesc>
  </div>
)

const AppTile = styled(_AppTile)`
    ${AppLogo} {
        background-color: ${({ agent, color }) => color || stringToRGB(agent, 0.5)};
    }
    
    margin: 10px;
    
    border-radius: 3px;
    overflow: hidden;
    cursor: pointer;
    border-radius: 5px;
    box-shadow: 1px 1px 3px rgba(0,0,0,.35);
    transition: box-shadow 0.3s ease;
    //themeColor
    &:hover {
        box-shadow: 1px 1px 3px rgba(0,0,0,.35), 0px 0px 7px 4px ${p => transparentize(0.6, themeColor('primary')(p))};
    }

    @media ${breakpoint.lt('sm')} {
        margin: 5px;
        border-radius: 2px;
        & p {
            font-size: 13px !important;
        }
    }
`
// V1
// 3px 3px 7px 4px ${ p => transparentize(0.6, themeColor('secondary')(p)) }

// transition: box-shadow 0.3s ease, transform 0.3s ease;
// &:hover {
//     box-shadow: 3px 3px 5px 2px rgba(0,0,0,.15);
//     transform: translate3d(-3px,-3px,0);
// }

// v2
// box-shadow: 0 1px 2px rgba(0,0,0,.15);
// transition: box-shadow 0.3s ease, transform 0.3s;
// //themeColor
// &:hover {
//     box-shadow: 0 1px 2px rgba(0,0,0,.15), 3px 3px 7px 4px ${ p => transparentize(0.6, themeColor('secondary')(p)) };
//     transform: translate3d(-3px,-3px,0);
// }
const onElementAppear = (el, index) =>
  spring({
    onUpdate: val => {
      el.style.opacity = val
    },
    delay: index * 100,
  })

const AppContainer = styled(Flipper)`
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
`

export async function getServerSideProps ({ req, res }) {
  if (res && res.locals && res.locals.agentRegistry) {
    const apps = await res.locals.agentRegistry.getAuthorizedApps(req.url, req.headers)
    return { props: { apps: JSON.parse(JSON.stringify(apps)) } } // have to supidly strip undefined...
  }
  return { props: { apps: [] } }
}

const Index = props => {
  const [currentApps, setCurrentApps] = useState(props.apps)
  const [filteredApps, setFilteredApps] = useState(props.apps)
  const [searchString, setSearchString] = useState('')

  // fetch apps
  const getAuthorizedApps = useCallback(() => {
    fetch('/api/getAuthorizedApps', { credentials: 'include', redirect: 'error' })
      .then(res => res.json())
      .then(apps => {
        setCurrentApps(apps)
      }).catch(() => {
        // do nothing
        // TODO: reddirect to login if conditions are met
      })
  }, [])

  // re-fetch apps
  useEffect(() => {
    if (!currentApps.length) {
      getAuthorizedApps()
    }
    const appFetchinterval = setInterval(() => {
      getAuthorizedApps()
    }, 30000)

    return () => clearInterval(appFetchinterval)
  }, [])

  // debounce search
  const onSearchApps = useCallback(debounce(value => {
    setSearchString(value)
  }, 100), [])

  // apply search on apps
  useEffect(
    () => {
      if (searchString && searchString.length > 2) {
        const fusedApps = new Fuse(currentApps, { keys: ['agent', 'name'], minMatchCharLength: 2 })
        const filteredApps = fusedApps.search(searchString)
        setFilteredApps(filteredApps.map(i => i.item ? i.item : i))
      } else {
        setFilteredApps(currentApps)
      }
    },
    [currentApps, searchString],
  )

  return (
    <Page title='Way Home' onSearch={onSearchApps}>
      <AppContainer flipKey={filteredApps.map(({ agent, app_id }) => `${agent}-${app_id}`).join(',')}>
        <For each='app' of={filteredApps}>
          <Flipped onAppear={onElementAppear} key={`${app.agent}-${app.app_id}`} flipId={`${app.agent}-${app.app_id}`}>
            <AppTile agent={app.agent} color={app.color} icon={app.icon} app_name={app.name} app_link={app.app_url} />
          </Flipped>
        </For>
      </AppContainer>
    </Page>
  )
}

export default Index
