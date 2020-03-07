import { Login, Logout, Refresh, CodeGrant } from '../actions/auth.actions';
import { State, Selector, StateContext, Action } from '@ngxs/store';
import { AuthService } from '../services/auth.service';
import { tap } from 'rxjs/operators';
import { JwtHelperService } from '@auth0/angular-jwt/';
/**
 * The session / user info object model
 * @export user session properties
 */
export class AuthStateModel {
  access_token?: string;
  refresh_token?: string;
  expiration?: string;
  preferred_username?: string;
  name?: string;
  groups?: string[];
  user_roles?: string[];
}
/**
 * Defaults to an empty object
 * @export
 */
@State<AuthStateModel>({
  name: 'auth',
  defaults: {}
})
export class AuthState {
  constructor(private authService: AuthService) {}
  /**
   * Retrieves the current user's JWT
   * @param AuthStateModel state
   * @returns the users JWT
   */
  @Selector()
  static token(state: AuthStateModel) {
    return state.access_token;
  }
  /**
   * For displaying the user info on the banner
   * @param AuthStateModel state
   * @returns full name and username for display
   */
  @Selector()
  static isExpired(state: AuthStateModel) {
    let expired = true;
    const nowUTC = new Date().getTime();
    const expiration = parseInt(state.expiration, 10) * 1000;
    if (!isNaN(expiration) && expiration > nowUTC) {
      expired = false;
    }
    return expired;
  }
  @Selector()
  static userDetails(state: AuthStateModel) {
    return {
      username: state.preferred_username,
      name: state.name
    };
  }
  /**
   * Returns the refresh token
   * @param AuthStateModel state
   * @returns the refresh token
   */
  @Selector()
  static refreshToken(state: AuthStateModel) {
    return state.refresh_token;
  }
  @Selector()
  static userRoles(state: AuthStateModel) {
    return state.user_roles;
  }
  /**
   * Decodes the token received after login and passes the token, name and username into storage
   * @param StateContext<AuthStateModel> { patchState }
   * @param Login username, password, grant_type, client_id
   * @returns name and username
   */
  @Action(Login)
  Login(
    { patchState }: StateContext<AuthStateModel>,
    { username, password, grant_type, client_id }: Login
  ) {
    const helper = new JwtHelperService();
    return this.authService
      .login(username, password, grant_type, client_id)
      .pipe(
        tap(result => {
          const decodeToken = helper.decodeToken(result.access_token);
          patchState({
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            name: decodeToken.name,
            preferred_username: decodeToken.preferred_username,
            expiration: decodeToken.exp,
            user_roles: decodeToken.user.roles
          });
        })
      );
  }
  /**
   * Decodes the token received after refresh auth workflow and passes the token, name and username into storage
   * @param StateContext<AuthStateModel> { patchState }
   * @param Refresh username, password, grant_type, client_id
   * @returns new jwt
   */
  @Action(Refresh)
  Refresh(
    { patchState }: StateContext<AuthStateModel>,
    { refresh_token, grant_type, client_id, client_secret }: Refresh
  ) {
    const helper = new JwtHelperService();
    return this.authService
      .refreshToken(refresh_token, grant_type, client_id, client_secret)
      .pipe(
        tap(result => {
          const decodeToken = helper.decodeToken(result.access_token);
          patchState({
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            name: decodeToken.name,
            preferred_username: decodeToken.preferred_username,
            expiration: decodeToken.exp,
            user_roles: decodeToken.user.roles
          });
        })
      );
  }
  /**
   * Gets the current state and removes session info from the store
   * @param StateContext<AuthStateModel> { setState, getState }
   * @returns returns empty pointer
   */
  @Action(Logout)
  logout({ setState, getState }: StateContext<AuthStateModel>) {
    const { access_token } = getState();
    return this.authService.logout().pipe(
      tap(_ => {
        setState({});
      })
    );
  }

  @Action(CodeGrant)
  CodeGrant(
    { patchState }: StateContext<AuthStateModel>,
    {
      grant_type,
      client_id,
      client_secret,
      redirect_uri,
      code,
      scope
    }: CodeGrant
  ) {
    const helper = new JwtHelperService();
    return this.authService
      .codeGrant(
        grant_type,
        client_id,
        client_secret,
        redirect_uri,
        code,
        scope
      )
      .pipe(
        tap(result => {
          const decodeToken = helper.decodeToken(result.access_token);
          patchState({
            access_token: result.access_token,
            refresh_token: result.refresh_token,
            name: decodeToken.name,
            preferred_username: decodeToken.preferred_username,
            expiration: decodeToken.exp,
            user_roles: decodeToken.user.roles
          });
        })
      );
  }
}
