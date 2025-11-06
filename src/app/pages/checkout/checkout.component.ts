import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { messages } from 'src/app/provider/validationformat';
import { environment } from 'src/environments/environment';

const PAYMENT_API_BASE_URL = environment.PAYMENT_API_BASE_URL;

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
  checkoutForm: FormGroup;
  userInfo: any;
  cartDetailsSub!: Subscription;
  

  constructor(private fb: FormBuilder, private http: HttpClient) {
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
      cardNumber: ['', [Validators.required]],
      expiryDate: ['', [Validators.required]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
      postal_code: ['', [Validators.required, Validators.pattern(/^\d{4,10}$/)]],
    });
  }

  ngOnInit(): void {
    this.userInfo = history?.state;
    console.log('userInfo >> ', this.userInfo);
  }

  checkout(): void {
    if (this.checkoutForm.invalid) {
      this.markAllControlsTouched(this.checkoutForm);
      return;
    }

    this.tokenizeCard(this.checkoutForm.value);
  }

  tokenizeCard(card: any): void {
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
        console.log('Tokenize response:', res);

        if (res?.token) {
          // ✅ Send token back to parent chatbot
          window.parent.postMessage(
            {
              source: 'checkout-iframe',
              type: 'CARD_TOKENIZED',
              token: res.token,
            },
            '*' // 👈 or replace '*' with your chatbot domain for security
          );

          alert('Payment token sent to chatbot!');
        } else {
          console.error('Token not found in response');
        }
      },
      error: (err) => {
        console.error('Tokenization failed:', err);
        window.parent.postMessage(
          {
            source: 'checkout-iframe',
            type: 'ERROR',
            error: err.message || 'Tokenization failed',
          },
          '*'
        );
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
    let input = event.target.value.replace(/\D/g, '');
    input = input.match(/.{1,4}/g)?.join(' ') || '';
    event.target.value = input;
  }


  formatExpiryDate(event: any): void {
    let input = event.target.value.replace(/\D/g, ''); // remove non-digits

    // Prevent month > 12 while typing
    if (input.length >= 2) {
      const month = parseInt(input.substring(0, 2), 10);
      if (month > 12) {
        input = '12' + input.substring(2); // cap month at 12
      }
    }

    if (input.length > 2) {
      input = input.substring(0, 2) + '/' + input.substring(2, 4);
    }

    event.target.value = input;
    this.checkoutForm.get('expiryDate')?.setValue(input, { emitEvent: false });
  }
  

}
