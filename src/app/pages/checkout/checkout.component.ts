import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { messages } from 'src/app/provider/validationformat';
import { PayloadDecryptionService } from 'src/app/services/payment-decryption.service';
import { environment } from 'src/environments/environment';

const PAYMENT_API_BASE_URL = environment.PAYMENT_API_BASE_URL;

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss'],
})
export class CheckoutComponent implements OnInit {
  checkoutForm: FormGroup;        // no ! — always initialized in constructor
  userInfo: any;
  cartDetailsSub!: Subscription;
  isTokenExpired  = false;
  isDecrypting    = true;         // hides form until decryption resolves
  usedTokens: any;
  isLoading       = false;
  paymentAlreadyComplete: any = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private payloadDecryptionService: PayloadDecryptionService,
  ) {
    // Build the form immediately so the template never receives undefined,
    // even before async decryption completes. Email is patched in after decryption.
    this.checkoutForm = this.fb.group({
      cardName: [
        '',
        [
          Validators.required,
          Validators.pattern(messages.validation.nameRegex),
          Validators.minLength(3),
          Validators.maxLength(25),
        ],
      ],
      email:       [''],
      cardNumber:  ['', [Validators.required]],
      expiryDate:  ['', [Validators.required]],
      cvv:         ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
      postal_code: ['', [Validators.required, Validators.pattern(/^\d{4,10}$/)]],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(async (params) => {
      
      const encryptedData = params['data'];
      console.log('[checkout] Encrypted data param:', encryptedData);

      if (!encryptedData) {
        console.error('[checkout] Missing encrypted data param');
        this.isTokenExpired = true;
        this.isDecrypting   = false;
        return;
      }

      try {
        this.userInfo = await this.payloadDecryptionService.decryptToken(encryptedData);
        console.log('[checkout] Decrypted userInfo:', this.userInfo);
      } catch (err) {
        console.error('[checkout] Failed to decrypt payload:', err);
        this.isTokenExpired = true;
        this.isDecrypting   = false;
        return;
      }

      // Patch email now that we have it from the decrypted payload
      this.checkoutForm.patchValue({ email: this.userInfo.email });
      this.isDecrypting = false;

      // Check if payment was already completed for this session
      if (this.userInfo.userId && this.userInfo.threadId) {
        
        // const statusUrl =
        //   `http://localhost:3030/payment-status` +
        //   `?userId=${encodeURIComponent(this.userInfo.userId)}` +
        //   `&threadId=${encodeURIComponent(this.userInfo.threadId)}`;


        // const statusUrl =
        //   `https://lg-chatbot.ostwork.com/api-token/payment-status` +
        //   `?userId=${encodeURIComponent(this.userInfo.userId)}` +
        //   `&threadId=${encodeURIComponent(this.userInfo.threadId)}`;

        const statusUrl =
          `${environment.BACKEND_URL}/payment-status` +
          `?userId=${encodeURIComponent(this.userInfo.userId)}` +
          `&threadId=${encodeURIComponent(this.userInfo.threadId)}`;

        this.http.get<{ success: boolean; paymentComplete: boolean }>(statusUrl).subscribe({
          next: (res) => {
            if (res.paymentComplete) {
              this.paymentAlreadyComplete = true;
            }
          },
          error: (err) => console.warn('[checkout] Could not check payment status:', err),
        });
      }

      this.usedTokens = JSON.parse(localStorage.getItem('sessionToken') ?? '[]');
      const newTokens = [...this.usedTokens, this.userInfo.token];
      localStorage.setItem('sessionToken', JSON.stringify(newTokens));
    });
  }

  tokenizeCard(card: any): void {
    this.isLoading = true;
    const tokenize_url = `${PAYMENT_API_BASE_URL}/cards/tokenize`;
    const payload = {
      card: {
        name: card.cardName,
        number: card.cardNumber,
        cvv: card.cvv,
        exp_month: parseInt(card.expiryDate.substring(0, 2)),
        exp_year: parseInt(card.expiryDate.substring(3, 7)),
        address_postal_code: card.postal_code,
      },
    };

    this.http.post(tokenize_url, payload).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        console.log('Tokenize response:', res);
        if (res?.token) {
          this.sendTokanizeToken(res.token);
          window.parent.postMessage(
            { source: 'checkout-iframe', type: 'CARD_TOKENIZED', token: res.token },
            '*'
          );
        } else {
          console.error('Token not found in response');
        }
      },
      error: (err) => {
        console.error('Tokenization failed:', err);
        this.isLoading = false;
        alert('Please enter your valid payment details.');
      },
    });
  }

  sendTokanizeToken(token: string) {
    this.isLoading = true;
    
     // this.http.post('https://lg-chatbot.ostwork.com/api-token/receive-token', { 
       // this.http.post('http://localhost:3030/api-token/receive-token', { 
        this.http.post(`${environment.BACKEND_URL}/receive-token`, {
      token,
      sessionId: this.userInfo.threadId,
      uuid: this.userInfo.userId,
    }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        console.log('res', res);
        const targetWindow = window.opener || window.parent;
        targetWindow.postMessage(
          { type: 'PAYMENT_COMPLETE', success: true, threadId: this.userInfo.threadId },
          '*'
        );
        setTimeout(() => {
          if (window.opener) {
            window.close();
          } else {
            window.close();
            setTimeout(() => {
             
              // window.location.href = `https://chat-agent.ostwork.com?threadId=${this.userInfo.threadId}`;
              //  window.location.href = `http://localhost:3000?threadId=${this.userInfo.threadId}`;
              window.location.href = `${environment.CHAT_AGENT_URL}?threadId=${this.userInfo.threadId}`;
    
            }, 500);
          }
        }, 1000);
      },
      error: (err) => {
        console.error('sendTokanizeToken failed >>', err);
        this.isLoading = false;
      },
    });
  }

  markAllControlsTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach((field) => {
      const control = formGroup.get(field);
      if (control instanceof FormControl) {
        control.markAsTouched({ onlySelf: true });
      } else if (control instanceof FormGroup) {
        this.markAllControlsTouched(control);
      }
    });
  }

  formatCardNumber(event: any) {
    let value = event.target.value.replace(/\D/g, '');
    value = value.match(/.{1,4}/g)?.join(' ') ?? value;
    event.target.value = value.trim();
    this.checkoutForm.patchValue({ cardNumber: value }, { emitEvent: false });
    const numericValue = value.replace(/\s/g, '');
    if (numericValue.length < 16) {
      this.checkoutForm.get('cardNumber')?.setErrors({ invalidCard: true });
    } else {
      this.checkoutForm.get('cardNumber')?.setErrors(null);
    }
  }

  formatExpiry(event: any) {
    let input = event.target.value.replace(/\D/g, '');
    if (input.length >= 2) {
      const month = parseInt(input.substring(0, 2), 10);
      if (month > 12) input = '12' + input.substring(2);
    }
    if (input.length > 2) {
      input = input.substring(0, 2) + '/' + input.substring(2, 4);
    }
    event.target.value = input;
    this.checkoutForm.get('expiryDate')?.setValue(input, { emitEvent: false });
    if (input.length === 5) {
      const [mm, yy] = input.split('/').map(Number);
      const currentYear  = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      const isValid = yy > currentYear || (yy === currentYear && mm >= currentMonth);
      this.checkoutForm.get('expiryDate')?.setErrors(isValid ? null : { expired: true });
    } else {
      this.checkoutForm.get('expiryDate')?.setErrors({ expired: true });
    }
  }

  onSubmit() {
    if (this.checkoutForm.invalid) {
      this.markAllControlsTouched(this.checkoutForm);
      return;
    }
    this.tokenizeCard(this.checkoutForm.value);
  }

  backTo() {
    window.parent.postMessage(
      { source: 'checkout-iframe', type: 'CARD_TOKENIZED', token: 'back' },
      '*'
    );
  }
}

