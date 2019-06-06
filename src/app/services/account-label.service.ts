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
  getLabels(account: string, accountComment: string|null): AccountLabels|null {
    let labels: AccountLabels = {public: accountComment, private: null, nice: null, full: null};
    if (!account || !account.length) return labels;
    labels.private = this.addressBookService.getAccountName(account);
    // none
    if (!labels.public && !labels.private) return labels;
    // at least one exists
    labels.nice = '';
    labels.full = '';
    if (labels.public) {
      labels.nice = this.shortenLabelString(labels.public);
      labels.full = labels.public;
    }
    if (labels.private) {
      if (labels.nice) labels.nice = labels.nice + ' ';
      if (labels.full) labels.full = labels.full + ', ';
      labels.nice = labels.nice + '(' + this.shortenLabelString(labels.private) + ')';
      labels.full = labels.full + labels.private;
    }
    return labels;
  }

  shortenLabelString(label: string|null): string|null {
    if (!label) return null;
    const maxlen = 12;
    if (label.length <= maxlen) return label;
    return label.substr(0, maxlen-1-2) + "..." + label.substr(label.length - 2, 2);
  }
}
