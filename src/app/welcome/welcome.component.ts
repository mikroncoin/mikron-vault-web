import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from "@angular/router";
import { WalletService } from "../services/wallet.service";
import { LanguageService } from "../services/language.service";

// for using Instascan library (from instascan.min.js)
declare var Instascan: any;

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit {

  donationAccount = `xrb_318syypnqcgdouy3p3ekckwmnmmyk5z3dpyq48phzndrmmspyqdqjymoo8hj`;

  wallet = this.walletService.wallet;
  isConfigured = this.walletService.isConfigured;

  scanner = null;
  activeCameraId = null;
  cameras = [];
  //scans = [];

  constructor(
    private activatedRoute: ActivatedRoute,
    private walletService: WalletService,
    private languageService: LanguageService) { }

  async ngOnInit() {
    let self = this;
    let videoElem = document.getElementById('instascan');
    this.scanner = new Instascan.Scanner({ video: videoElem, scanPeriod: 5 });
    this.scanner.addListener('scan', function (content, image) {
      console.log('SCAN', content);
      self.scans.unshift({ date: +(Date.now()), content: content });
    });
  
    let cameras1 = await Instascan.Camera.getCameras();
    console.log('cameras1', cameras1.length);
    if (cameras1.length <= 0) {
      console.error('No cameras found.');
    } else {
      this.cameras = cameras1;
      console.log('cameras[0].id', this.cameras[0].id);
      this.selectCamera(this.cameras[0]);
    }
  }

  async selectCamera(camera: any) {
    console.log('selectCamera', camera.id);
    this.activeCameraId = camera.id;
    console.log('scanner starting');
    await this.scanner.start(camera);
    console.log("camera started", camera.id);
  }
}
