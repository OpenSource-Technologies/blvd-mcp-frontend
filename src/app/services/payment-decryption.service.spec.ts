import { TestBed } from '@angular/core/testing';

import { PaymentDecryptionService } from './payment-decryption.service';

describe('PaymentDecryptionService', () => {
  let service: PaymentDecryptionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PaymentDecryptionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
