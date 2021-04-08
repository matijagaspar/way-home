import get from 'just-safe-get'
import WebError from './WebError'
export function authenticate (req, res) {

}

export function authorize (groups, err_message) {
  return req => {
    const db_user_groups = new Set(get(req, 'session.passport.user.groups'))
    const group_match = groups ? groups.find(x => db_user_groups.has(x)) : false
    if (!group_match) {
      throw new WebError(403, err_message || 'No access to resource')
    }
  }
}
