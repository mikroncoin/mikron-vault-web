import { Injectable } from '@angular/core';
import * as Rx from 'rxjs';

type NotificationType = 'info'|'success'|'warning'|'error';

@Injectable()
export class NotificationService {

  notifications$ = new Rx.BehaviorSubject(null);
  removeNotification$ = new Rx.BehaviorSubject(null);

  constructor() { }

  // This provides an entry point for all components to send notifications.
  // It exposes an observable that the actual component uses to grab new notifications

  sendNotification(type: NotificationType, messageTranslated: string, messageKey: string, options = {}) {
    this.notifications$.next({ type, messageTranslated, messageKey, options });
  }

  removeNotification(identifier: string) {
    this.removeNotification$.next(identifier);
  }

  sendInfoKey(messageKey: string, options = {}) {
    this.sendNotification('info', '', messageKey, options);
  }
  sendSuccessKey(messageKey: string, options = {}) {
    this.sendNotification('success', '', messageKey, options);
  }
  // This is special case, when message is given already translated/prepared, not translated in the html template.  Not recommended.
  sendSuccessTranslated(messageTranslated: string, options = {}) {
    this.sendNotification('success', messageTranslated, '', options);
  }
  sendWarningKey(messageKey: string, options = {}) {
    this.sendNotification('warning', '', messageKey, options);
  }
  // This is special case, when message is given already translated/prepared, not translated in the html template.  Not recommended.
  sendWarningTranslated(messageTranslated: string, options = {}) {
    this.sendNotification('warning', messageTranslated, '', options);
  }
  sendErrorKey(messageKey: string, options = {}) {
    this.sendNotification('error', '', messageKey, options);
  }
  // This is special case, when message is given already translated/prepared, not translated in the html template.  Not recommended.
  sendErrorTranslated(messageTranslated: string, options = {}) {
    this.sendNotification('error', messageTranslated, '', options);
  }
}
