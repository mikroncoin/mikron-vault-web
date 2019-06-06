import { TestBed, inject } from '@angular/core/testing';

import { AccountLabelService } from './account-label.service';

describe('AccountLabelService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AccountLabelService]
    });
  });

  it('should be created', inject([AccountLabelService], (service: AccountLabelService) => {
    expect(service).toBeTruthy();
  }));
});
