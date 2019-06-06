import {Injectable} from '@angular/core';
import {AddressBookService} from './address-book.service';
import {ApiService} from "./api.service";

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

  constructor(
      private addressBookService: AddressBookService,
      private apiService: ApiService,
  ) { }

  // Take the private label and public label -- supplied explicitly so bg API call is not hidden --
  // and combines the two (or take the one existing)
  getNiceLabel(account: string, accountComment: string|null): AccountLabels|null {
    if (!account || !account.length) return null;
    const addressBookLabel = this.addressBookService.getAccountName(account);
    // none
    if (!accountComment && !addressBookLabel) return null;
    // at least one exists
    let nice = '';
    let full = '';
    if (accountComment) {
      nice = this.shortenLabelString(accountComment);
      full = accountComment;
    }
    if (addressBookLabel) {
      if (nice) nice = nice + ' ';
      if (full) full = full + ', ';
      nice = nice + '(' + this.shortenLabelString(addressBookLabel) + ')';
      full = full + addressBookLabel;
    }
    return {
      public: accountComment,
      private: addressBookLabel,
      nice: nice,
      full: full,
    };
  }

  shortenLabelString(label: string|null): string|null {
    if (!label) return null;
    const maxlen = 12;
    if (label.length <= maxlen) return label;
    return label.substr(0, maxlen-1-2) + "..." + label.substr(label.length - 2, 2);
  }
}
