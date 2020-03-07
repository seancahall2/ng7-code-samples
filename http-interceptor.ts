import {
  HttpSentEvent,
  HttpHeaderResponse,
  HttpProgressEvent,
  HttpHandler,
  HttpInterceptor,
  HttpUserEvent,
  HttpRequest,
  HttpResponse,
  HttpErrorResponse
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { filter, take, switchMap, catchError, finalize } from 'rxjs/operators';
import { Store } from '@ngxs/store';
import { AuthService } from './services/auth.service';
import { Refresh } from './actions/auth.actions';
import { NotificationsService } from './services/notification.service';
import { EnvironmentService } from '../environment.service';

/**
 * Global interceptor that appends the JWT to all API calls with two exceptions, login and refresh token request
 */
@Injectable()
export class FanHttpInterceptor implements HttpInterceptor {
  constructor(
    private _store: Store,
    private authService: AuthService,
    private notificationService: NotificationsService,
    private environmentService: EnvironmentService
  ) {}
  isRefreshingToken: boolean = false;
  tokenSubject: BehaviorSubject<string> = new BehaviorSubject<string>(null);

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<
    | HttpSentEvent
    | HttpHeaderResponse
    | HttpProgressEvent
    | HttpResponse<any>
    | HttpUserEvent<any>
    | any
  > {
    // exempt some paths from token workflow
    const skip = 'token';
    if (req.url.search(skip) !== -1) {
      return next.handle(req);
    }

    return next
      .handle(
        this.addTokenToRequest(
          req,
          this._store.selectSnapshot(state => state.auth.access_token)
        )
      )
      .pipe(
        catchError(err => {
          if (err instanceof HttpErrorResponse) {
            switch ((<HttpErrorResponse>err).status) {
              // refresh token expired
              case 401:
                return this.handle401Error(req, next);
              // access token expired / invalid
              case 400:
                this.notificationService.showError(err.name, err);
                break;
              //   return <any>this.authService.logout();
              case 403:
                this.notificationService.showError(err.name, err);
                break;
              case 404:
                this.notificationService.showError(err.name, err);
                break;
              case 500:
                this.notificationService.showError(err.name, err);
                break;
              case 501:
                this.notificationService.showError(err.name, err);
                break;
              case 503:
                this.notificationService.showError(err.name, err);
                break;
              case 504:
                this.notificationService.showError(err.name, err);
                break;
            }
          } else {
            return throwError(err);
          }
        })
      );
  }

  addTokenToRequest(req: HttpRequest<any>, token: string): HttpRequest<any> {
    return req.clone({
      setHeaders: {
        authorization: 'Bearer ' + token
      }
    });
  }
  // refresh token sequence
  handle401Error(req: HttpRequest<any>, next: HttpHandler) {
    if (!this.isRefreshingToken) {
      this.isRefreshingToken = true;
      /** Reset here so that any queued requests wait until the token
       comes back from the refreshToken call. */
      this.tokenSubject.next(null);
      return this._store
        .dispatch(
          new Refresh(
            this._store.selectSnapshot(state => state.auth.refresh_token),
            'refresh_token',
            'fan-casemanager-client-v1',
            this.environmentService.clientSecret
          )
        )
        .pipe(
          switchMap(response => {
            if (response) {
              this.tokenSubject.next(response.auth.access_token);
              return next.handle(
                this.addTokenToRequest(req, response.auth.access_token)
              );
            }
            return <any>this.authService.logout();
          }),
          catchError(err => {
            return <any>this.authService.logout();
          }),
          finalize(() => {
            this.isRefreshingToken = false;
          })
        );
    } else {
      this.isRefreshingToken = false;
      return this.tokenSubject.pipe(
        filter(token => token != null),
        take(1),
        switchMap(token => {
          return next.handle(this.addTokenToRequest(req, token));
        })
      );
    }
  }
}
