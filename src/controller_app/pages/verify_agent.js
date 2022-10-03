import React from 'react'
import _MidAlign from '../components/MidAlign'
import applyWrappers from '../lib/applyWrappers'
import Paper from '@material-ui/core/Paper'
import DoneIcon from '@material-ui/icons/Done'
import Typography from '@material-ui/core/Typography'
import styled from 'styled-components'
import { withRouter } from 'next/router'
import { stringToRGB } from '../style/helpers'

const MidAlign = styled(_MidAlign)`
& a {
        color: ${({ theme }) => theme.typography.body1.color};
    }
`
const Container = styled(Paper)`
    padding: ${({ theme }) => theme.spacing.unit * 3}px !important;
    border-radius: 5px !important;
    
`

const SuccessBox = styled.div`
    display: flex;
    justify-content: center;

    & span {
        color: green !important;
    }
    svg {
        color: green;
        height: 20px;
        width: 20px;
        margin-right: ${({ theme }) => theme.spacing.unit}px;
    }
`

const VerifiedMessage = styled(Typography)`
    text-align: center;
    font-size: 0.8em !important;
    padding-top: 10px;
    & > span {
        padding: 0 2px;
        font-family: monospace;
        font-size: 1.2em;
        font-weight: bold;
    }
`

class VerifyAgent extends React.PureComponent {
  static getInitialProps ({ res }) {
    const { verified_agent } = res.locals
    return { verified_agent }
  }

  render () {
    const { verified_agent } = this.props

    // const calcColor = 'black'//stringToRGB(verified_agent, 0.5)
    // const rcolor = readableColor(calcColor)

    // const agentColor = rcolor === '#fff' ? calcColor : transparentize(0.3, rcolor)

    // const agentBgColor = rcolor !== '#fff' ? calcColor : transparentize(0.90, 'black')

    const agentColor = 'rgba(0, 0, 0, 0.65)'
    const agentBgColor = stringToRGB(verified_agent, 0.3)
    return (
      <MidAlign column>

        <Container elevation={4}>
          <SuccessBox>
            <DoneIcon />
            <Typography variant='title' style={{ color: 'green' }}>Success</Typography>
          </SuccessBox>
          <VerifiedMessage variant='caption'>Agent <span style={{ backgroundColor: agentBgColor, color: agentColor }}>{verified_agent}</span> verified</VerifiedMessage>
        </Container>
        <a
          href='/' onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            this.props.router.replace('/')
            return false
          }}
        >
          Go to apps
        </a>
      </MidAlign>
    )
  }
}// <Typography><span> { this.props.verified_agent }</span> verified </Typography>
/* `$ verified!` }
                    <Typography variant='headline' component='h3'>
                    Agent <span style={{ color: 'red' }}>{this.props.verified_agent}</span> verified
                    </Typography>
                    */

export default applyWrappers(withRouter)(VerifyAgent)
