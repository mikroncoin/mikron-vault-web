import {Injectable} from '@angular/core';
import {AddressBookService} from './address-book.service';
import {ApiService} from "./api.service";
import {LanguageService} from './language.service';
import {BlockService} from './block.service';
import {WalletAccount} from './wallet.service';
import {NotificationService} from './notification.service';
import {BehaviorSubject} from 'rxjs';

/**
 * Handles public label -- account comment from blockchain/node -- and private label -- account label from address book
 */

export interface AccountLabels {
  public: string|null; // public lablel, account comment
  private: string|null; // private label, address book label
  full: string|null; // full string containing both, suitable for hint
  nice: string|null; // nice printable
}

@Injectable()
export class AccountLabelService {

  // notifications for public/private label change
  publicLabelChanged$ = new BehaviorSubject([]);
  privateLabelChanged$ = new BehaviorSubject([]);

  constructor(
      private addressBookService: AddressBookService,
      private apiService: ApiService,
      private languageService: LanguageService,
      private blockService: BlockService,
      private notificationService: NotificationService,
  ) {
    this.addressBookService.addressBook$.subscribe(newAddressBook => {
      // forward change event from addressBook
      this.privateLabelChanged$.next([null]);
    })
  }

  // Take the private label and public label -- supplied explicitly so bg API call is not hidden --
  // and combines the two (or take the one existing)
  getLabels(account: string, accountComment: string|null): AccountLabels|null {
    let labels: AccountLabels = {public: accountComment, private: null, nice: null, full: null};
    if (!account || !account.length) return labels;
    labels.private = this.addressBookService.getAccountName(account);
    // none
    if (!labels.public && !labels.private) return labels;
    if (labels.public && labels.private) {
      // both exist
      labels.nice = this.shortenLabelString(labels.public) + ' (' + this.shortenLabelString(labels.private) + ')';
      labels.full =
        this.languageService.getTran('public-label') + ': ' +
        labels.public + ', ' +
        this.languageService.getTran('private-label') + ': ' +
        labels.private;
      return labels;
    }
    if (labels.public && !labels.private) {
      labels.nice = this.shortenLabelString(labels.public);
      labels.full = labels.public + ' (' + this.languageService.getTran('public-label') + ')';
      return labels;
    }
    if (!labels.public && labels.private) {
      labels.nice = '(' + this.shortenLabelString(labels.private) + ')';
      labels.full = labels.private + ' (' + this.languageService.getTran('private-label') + ')';
      return labels;
    }
    return labels;
  }

  shortenLabelString(label: string|null): string|null {
    if (!label) return null;
    const maxlen = 12;
    if (label.length <= maxlen) return label;
    return label.substr(0, maxlen-1-2) + "..." + label.substr(label.length - 2, 2);
  }

  async saveAddressBookEntry(accountID, newLabel: string, oldLabel: string|null): Promise<boolean> {
    if (!newLabel) {
      // Check for deleting an entry in the address book
      if (oldLabel) {
        this.addressBookService.deleteAddress(oldLabel);
        this.notificationService.sendSuccessKey('accdetc.success-addr-remove');
      }
      this.privateLabelChanged$.next([accountID]);
      return true;
    }

    try {
      await this.addressBookService.saveAddress(accountID, newLabel);
    } catch (err) {
      this.notificationService.sendErrorTranslated(err.message);
      return false;
    }

    this.privateLabelChanged$.next([accountID]);
    this.notificationService.sendSuccessKey('accdetc.success-addr-saved');
    return true;
  }

  async saveAccountComment(walletAccount: WalletAccount, comment: string, isLedgerWallet: boolean): Promise<boolean> {
    try {
      const newHash = await this.blockService.generateComment(walletAccount, comment, isLedgerWallet);
      if (!newHash) {
        if (!isLedgerWallet) {
          this.notificationService.sendErrorKey('labelserv.error-comment-block');
        }
        return false;
      }
    } catch (err) {
      this.notificationService.sendErrorTranslated(this.languageService.getTran('labelserv.error-comment-block') + ` -- ${err.message}`);
      return false;
    }
    this.publicLabelChanged$.next([walletAccount.id]);
    this.notificationService.sendSuccessKey('labelserv.success-comment-block');
    return true;
  }
}
