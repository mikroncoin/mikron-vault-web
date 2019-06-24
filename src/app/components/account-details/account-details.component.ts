import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, ActivatedRouteSnapshot, ChildActivationEnd, Router} from "@angular/router";
import {AddressBookService} from "../../services/address-book.service";
import {ApiService} from "../../services/api.service";
import {NotificationService} from "../../services/notification.service";
import {WalletService} from "../../services/wallet.service";
import {BlockService} from "../../services/block.service";
import {AppSettingsService} from "../../services/app-settings.service";
import {PriceService} from "../../services/price.service";
import {UtilService} from "../../services/util.service";
import * as QRCode from 'qrcode';
import BigNumber from "bignumber.js";
import {RepresentativeService} from "../../services/representative.service";
import {BehaviorSubject} from "rxjs/BehaviorSubject";
import {AccountLabelService, AccountLabels} from "../../services/account-label.service";
import {LanguageService} from '../../services/language.service';

@Component({
  selector: 'app-account-details',
  templateUrl: './account-details.component.html',
  styleUrls: ['./account-details.component.css']
})
export class AccountDetailsComponent implements OnInit, OnDestroy {
  unitMikron = 10000000000;

  accountHistoryNonfiltered: any[] = [];
  accountHistory: any[] = [];
  pendingBlocks = [];
  pageSize = 25;
  maxPageSize = 200;
  qrIntegrations = this.settings.qrIntegrations;

  repLabel: any = '';
  accountLabels: AccountLabels|null = null;
  account: any = {};
  accountID: string = '';

  walletAccount = null;

  showEditAddressBook = false;
  publicLabelEdit = '';
  privateLabelEdit = '';
  showEditRepresentative = false;
  representativeModel = '';
  representativeResults$ = new BehaviorSubject([]);
  showRepresentatives = false;
  representativeListMatch = '';
  isNaN = isNaN;

  qrCodeImage = null;
  qrCodeText = null;

  routerSub = null;
  priceSub = null;

  constructor(
    private router: ActivatedRoute,
    private route: Router,
    private addressBook: AddressBookService,
    private api: ApiService,
    private price: PriceService,
    private repService: RepresentativeService,
    private notificationService: NotificationService,
    private walletService: WalletService,
    private util: UtilService,
    public settings: AppSettingsService,
    private block: BlockService,
    private accountLabelService: AccountLabelService,
    private languageService: LanguageService,
  ) { }

  async ngOnInit() {
    this.routerSub = this.route.events.subscribe(event => {
      if (event instanceof ChildActivationEnd) {
        this.loadAccountDetails(); // Reload the state when navigating to itself from the transactions page
      }
    });
    this.priceSub = this.price.lastPrice$.subscribe(event => {
      this.account.balanceFiat = this.util.unit.antToMikron(this.account.balance || 0).times(this.price.price.lastPrice).toNumber();
      this.account.pendingFiat = this.util.unit.antToMikron(this.account.pending || 0).times(this.price.price.lastPrice).toNumber();
    });

    this.accountLabelService.publicLabelChanged$.subscribe(accounts => {
      this.loadAccountDetails();
    });
    this.accountLabelService.privateLabelChanged$.subscribe(accounts => {
      this.loadAccountDetails();
    });

    await this.loadAccountDetails();
  }

  async loadAccountDetails() {
    this.pendingBlocks = [];
    this.accountID = this.router.snapshot.params.account;
    this.account = await this.api.accountInfo(this.accountID);
    this.accountLabels = this.accountLabelService.getLabels(this.accountID, this.account.comment);
    this.resetEditLabel();
    this.walletAccount = this.walletService.getWalletAccount(this.accountID);

    const knownRepresentative = this.repService.getRepresentative(this.account.representative);
    this.repLabel = knownRepresentative ? knownRepresentative.name : null;

    // If there is a pending balance, or the account is not opened yet, load pending transactions
    if ((!this.account.error && this.account.pending > 0) || this.account.error) {
      const pending = await this.api.pending(this.accountID, 25);
      if (pending && pending.blocks) {
        for (let block in pending.blocks) {
          if (!pending.blocks.hasOwnProperty(block)) continue;
          this.pendingBlocks.push({
            account: pending.blocks[block].source,
            amount: pending.blocks[block].amount,
            date: pending.blocks[block].block_time * 1000,
            addressBookName: this.addressBook.getAccountName(pending.blocks[block].source) || null,
            hash: block,
          });
        }
      }
    }

    // If the account doesnt exist, set the pending balance manually
    if (this.account.error) {
      const pendingRaw = this.pendingBlocks.reduce((prev: BigNumber, current: any) => prev.plus(new BigNumber(current.amount)), new BigNumber(0));
      this.account.pending = pendingRaw;
    }

    // Set fiat values?
    this.account.balanceRaw = new BigNumber(this.account.balance || 0).mod(this.unitMikron);
    this.account.pendingRaw = new BigNumber(this.account.pending || 0).mod(this.unitMikron);
    this.account.balanceFiat = this.util.unit.antToMikron(this.account.balance || 0).times(this.price.price.lastPrice).toNumber();
    this.account.pendingFiat = this.util.unit.antToMikron(this.account.pending || 0).times(this.price.price.lastPrice).toNumber();
    await this.getAccountHistory(this.accountID);

    await this.generateQR();
  }

  // Generate the QR code image, depending on the QR integration style
  async generateQR() {
    const style = this.settings.settings.qrIntegration;
    if (style == 0) {
      this.qrCodeImage = null;
      this.qrCodeText = null;
      return;
    }
    this.qrCodeText = '?'
    switch (style) {
      default:
      case 1: this.qrCodeText = this.accountID; break;
      case 2: this.qrCodeText = this.prepareSendToUrl(this.accountID); break;
    }
    const qrCode = await QRCode.toDataURL(this.qrCodeText);
    this.qrCodeImage = qrCode;
  }

  // Prepare send-to URL, to our send route with account
  prepareSendToUrl(account: string): string {
    const urlStr = this.settings.getServerApiBaseUrl() + 'send?to=' + account;
    return urlStr;
  }

  async updateQrIntegration(newIntValue) {
    // save to here, and to settings
    this.settings.settings.qrIntegration = newIntValue;
    this.settings.saveAppSettings();
    // regenerate QR code
    this.generateQR();
  }

  ngOnDestroy() {
    if (this.routerSub) {
      this.routerSub.unsubscribe();
    }
    if (this.priceSub) {
      this.priceSub.unsubscribe();
    }
  }

  async getAccountHistory(account, resetPage = true) {
    if (resetPage) {
      this.pageSize = 25;
    }
    const history = await this.api.accountHistory(account, this.pageSize, true);
    let additionalBlocksInfo = [];

    if (history && history.history && Array.isArray(history.history)) {
      this.accountHistoryNonfiltered = history.history.map(h => {
        // prepare date
        h.date = h.block_time * 1000;
        if (h.type && h.type === 'state' && h.link) {
          // For Open and receive blocks, we need to look up block info to get originating account
          if (h.subtype === 'open' || h.subtype === 'receive' || h.subtype === 'open_receive') {
            additionalBlocksInfo.push({ hash: h.hash, link: h.link });
          } else {  // send or other
            h.hist_account = this.util.account.getPublicAccountID(this.util.hex.toUint8(h.link));
          }
        } else {
          // no link
          h.hist_account = h.account;
        }
        return h;
      });

      // Filter out comment blocks
      // Filter out change blocks (now that we are using the raw output)
      this.accountHistory = this.accountHistoryNonfiltered.filter(h =>
        h.type !== 'undefined' &&
        !(h.type === 'state' && h.subtype === undefined) &&
        h.type !== 'comment' &&
        h.type !== 'change' &&
        h.subtype !== 'change');

      if (additionalBlocksInfo.length) {
        const blocksInfo = await this.api.blocksInfo(additionalBlocksInfo.map(b => b.link));
        for (let block in blocksInfo.blocks) {
          if (!blocksInfo.blocks.hasOwnProperty(block)) continue;

          const matchingBlock = additionalBlocksInfo.find(a => a.link === block);
          if (!matchingBlock) continue;
          const accountInHistory = this.accountHistory.find(h => h.hash === matchingBlock.hash);
          if (!accountInHistory) continue;

          const blockData = blocksInfo.blocks[block];

          accountInHistory.hist_account = blockData.block_account;
        }
      }

      // Retrieve comments for accounts that appear in history, deduplicate
      const histAccs = Array.from(new Set(this.accountHistory.map(h => h.hist_account)));
      const accountsInfos = await this.api.accountsInfos(histAccs);
      if (accountsInfos && accountsInfos.infos) {
        // fill in labels
        this.accountHistory.forEach(h => h.accountLabels = this.accountLabelService.getLabels(h.hist_account, accountsInfos.infos[h.hist_account].comment));
      }
    } else {
      this.accountHistory = [];
    }
  }

  async loadMore() {
    if (this.pageSize <= this.maxPageSize) {
      this.pageSize += 25;
      await this.getAccountHistory(this.accountID, false);
    }
  }

  async saveRepresentative() {
    if (this.walletService.walletIsLocked()) return this.notificationService.sendWarningKey('wallet-widget.warning-wallet-locked');
    if (!this.walletAccount) return;
    const repAccount = this.representativeModel;

    const valid = await this.api.validateAccountNumber(repAccount);
    if (!valid || valid.valid !== '1') return this.notificationService.sendWarningKey('accdetc.warning-account-id');

    try {
      const changed = await this.block.generateChange(this.walletAccount, repAccount, this.walletService.isLedgerWallet());
      if (!changed) {
        this.notificationService.sendErrorKey('accdetc.error-rep-change');
        return;
      }
    } catch (err) {
      this.notificationService.sendErrorTranslated(err.message);
      return;
    }

    // Reload some states, we are successful
    this.representativeModel = '';
    this.showEditRepresentative = false;

    const accountInfo = await this.api.accountInfo(this.accountID);
    this.account = accountInfo;
    const newRep = this.repService.getRepresentative(repAccount);
    this.repLabel = newRep ? newRep.name : '';

    this.notificationService.sendSuccessKey('accdetc.success-rep-change');
  }

  async savePublicLabel() {
    // discard empty, invalid comment string
    const comment = this.publicLabelEdit.trim();
    if (!comment || comment.length <= 0 || comment.length > 160) {
      return this.notificationService.sendErrorKey('labelserv.error-invalid-comment');
    }

    // account must be own account from the wallet
    if (!this.walletAccount) {
      return this.notificationService.sendErrorKey('labelserv.error-not-own');
    }

    // wallet must be unlocked
    if (this.walletService.walletIsLocked()) return this.notificationService.sendWarningKey('wallet-widget.warning-wallet-locked');

    // confirmation
    const UIkit = window['UIkit'];
    try {
      await UIkit.modal.confirm(
        '<p style="text-align: center;">' +
        this.languageService.getTran('labelserv.confirm-public-label-save') +
        '<br><b>' +
        this.languageService.getTran('labelserv.confirm') +
        '</b></p>');
    } catch (err) {
      return;
    }

    // save
    const saveRes = await this.accountLabelService.saveAccountComment(this.walletAccount, comment, this.walletService.isLedgerWallet());
    if (saveRes) {
      this.showEditAddressBook = false;
      this.accountLabels.public = comment;
    }
  }

  async savePrivateLabel() {
    const addressBookLabel = this.privateLabelEdit.trim();
    const saveRes = this.accountLabelService.saveAddressBookEntry(this.accountID, addressBookLabel, this.accountLabels.private);
    if (saveRes) {
      // success
      this.showEditAddressBook = false;
      this.accountLabels.private = addressBookLabel;
    }
  }

  resetEditLabel() {
    this.showEditAddressBook = false;
    this.publicLabelEdit = this.accountLabels.public || '';
    this.privateLabelEdit = this.accountLabels.private || '';
  }

  searchRepresentatives() {
    this.showRepresentatives = true;
    const search = this.representativeModel || '';
    const representatives = this.repService.getSortedRepresentatives();

    const matches = representatives
      .filter(a => a.name.toLowerCase().indexOf(search.toLowerCase()) !== -1)
      .slice(0, 5);

    this.representativeResults$.next(matches);
  }

  selectRepresentative(rep) {
    this.showRepresentatives = false;
    this.representativeModel = rep;
    this.searchRepresentatives();
    this.validateRepresentative();
  }

  validateRepresentative() {
    setTimeout(() => this.showRepresentatives = false, 400);
    this.representativeModel = this.representativeModel.replace(/ /g, '');
    const rep = this.repService.getRepresentative(this.representativeModel);

    if (rep) {
      this.representativeListMatch = rep.name;
    } else {
      this.representativeListMatch = '';
    }
  }

  copied() {
    this.notificationService.sendSuccessKey('copy-success');
  }

}
