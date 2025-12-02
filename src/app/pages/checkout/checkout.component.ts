import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
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
  checkoutForm!: FormGroup;
  userInfo: any;
  cartDetailsSub!: Subscription;
  isTokenExpired:boolean = false;
  usedTokens:any;
  

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.userInfo = params;
      this.usedTokens = JSON.parse(localStorage.getItem("sessionToken") ?? '[]');

      if (!this.userInfo.token) {
        this.isTokenExpired = true;
      }else
      if (this.usedTokens.includes(this.userInfo.token)) {
        this.isTokenExpired = true;
      }else{

         let newTokens = [...this.usedTokens, this.userInfo.token];
         localStorage.setItem("sessionToken", JSON.stringify(newTokens));

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
          email: [this.userInfo.email],
          cardNumber: ['', [Validators.required]],
          expiryDate: ['', [Validators.required]],
          cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
          postal_code: ['', [Validators.required, Validators.pattern(/^\d{4,10}$/)]],
        });
      }
    

    
    });
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
        } else {
          console.error('Token not found in response');
        }
      },
      error: (err) => {
        console.error('Tokenization failed:', err);
        alert("please enter your valid payment details.")
        // window.parent.postMessage(
        //   {
        //     source: 'checkout-iframe',
        //     type: 'ERROR',
        //     error: err.message || 'Tokenization failed',
        //   },
        //   '*'
        // );
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
  
    // Basic card number validation (Luhn or length check)
    const numericValue = value.replace(/\s/g, '');
  
    const isValid = numericValue.length >= 16; // You can replace with Luhn if needed
  
    if (!isValid) {
      this.checkoutForm.get('cardNumber')?.setErrors({ invalidCard: true });
    } else {
      this.checkoutForm.get('cardNumber')?.setErrors(null);
    }
  }
  

  /** Format expiry date as MM/YY */
  // formatExpiry(event: any) {
  //   let input = event.target.value.replace(/\D/g, ''); // remove non-digits

  //   // Prevent month > 12 while typing
  //   if (input.length >= 2) {
  //     const month = parseInt(input.substring(0, 2), 10);
  //     if (month > 12) {
  //       input = '12' + input.substring(2); // cap month at 12
  //     }
  //   }

  //   if (input.length > 2) {
  //     input = input.substring(0, 2) + '/' + input.substring(2, 4);
  //   }

  //   event.target.value = input;
  //   this.checkoutForm.get('expiryDate')?.setValue(input, { emitEvent: false });
  // }

  formatExpiry(event: any) {
    let input = event.target.value.replace(/\D/g, ''); // Remove non-digits
  
    // Prevent month > 12
    if (input.length >= 2) {
      const month = parseInt(input.substring(0, 2), 10);
      if (month > 12) {
        input = '12' + input.substring(2);
      }
    }

    // Add slash
    if (input.length > 2) {
      input = input.substring(0, 2) + '/' + input.substring(2, 4);
    }
  
    event.target.value = input;
    this.checkoutForm.get('expiryDate')?.setValue(input, { emitEvent: false });
  
    // ---------------------------
    // FUTURE YEAR VALIDATION
    // ---------------------------
    if (input.length === 5) {
      const [mm, yy] = input.split('/').map(Number);
  
      const currentYear = new Date().getFullYear() % 100;  // YY format
      const currentMonth = new Date().getMonth() + 1;
  
      let isValid = false;
  
      if (yy > currentYear) {
        isValid = true;
      } else if (yy === currentYear && mm >= currentMonth) {
        isValid = true;
      }
  
      if (!isValid) {
        this.checkoutForm.get('expiryDate')?.setErrors({ expired: true });
      } else {
        this.checkoutForm.get('expiryDate')?.setErrors(null);
      }
    }else{
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

  backTo(){
    window.parent.postMessage(
      {
        source: 'checkout-iframe',
        type: 'CARD_TOKENIZED',
        token: "back",

      },
      '*' // 👈 or replace '*' with your chatbot domain for security
    );
  }

}
