
import styled from 'styled-components'

const MidAlign = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100vh;
    flex-direction: ${({ column }) => column ? 'column' : 'row'};
`

export default MidAlign
