import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ChatService } from '../services/chat.services';
import { HttpClient } from '@angular/common/http';
import { marked } from 'marked';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
declare global {
  interface Window {
    Tawk_API?: any;
  }
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {

  public messages:any = [{ role: 'assistant', content: 'Hi! How can I help you?' }];

  //mainUrl:any = 'http://localhost:3000/chat';
  checkoutUrl:any = 'https://blvd-chatbot.ostlive.com/checkout';
  mainUrl:any = ' https://middleware.ostlive.com/chat';

  showBotChat = true;
  showHumanChat = false;

  isLoading = false;

  userInput = '';
  mode: 'bot' | 'agent' = 'bot'; // 👈 track current mode

  isChatOpen = false;

  //for last ui

  chatMessages: any[] = [];

  isMsgSend:boolean =false;

  showCheckoutIframe:boolean = false;
  safeCheckoutUrl?: SafeResourceUrl;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  constructor(
    private chatService: ChatService,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {

    window.addEventListener('message', (event) => {
      console.log("dsfsdfm >> ",event)
      if (event.data?.source === 'checkout-iframe') {
        if (event.data.type === 'CARD_TOKENIZED') {
          this.sendTokanizeToken(event.data.token);
          console.log('✅ Token received from checkout:', event.data.token);
          this.showCheckoutIframe = false; // Close iframe
        } else if (event.data.type === 'ERROR') {
          console.error('❌ Error from checkout:', event.data.error);
        }
      }
    });

  }

  sendTokanizeToken(data: any) {
    this.http.post(this.mainUrl + '/receive-token', { token: data })
      .subscribe({
        next: (res: any) => {
          console.log("sendTokanizeToken >> ", res);
  
          // Push backend reply to chat UI
          if (res?.reply?.content) {
            this.chatMessages.push({ role: 'assistant', content: res.reply.content });
          } else if (res?.response) {
            this.chatMessages.push({ role: 'assistant', content: res.response });
          }
  
          this.scrollToBottom(); // optional: scroll chat to bottom
        },
        error: (err) => {
          console.error("sendTokanizeToken failed >>", err);
        }
      });
  }

  /**for basic ui start*/

  async sendMessage() {
    if(!this.isMsgSend){
      this.isMsgSend = true;
      const message = this.userInput.trim();
      console.log("message >> ",message)
      if (!message) return;
      this.chatMessages.push({ role: 'user', content: message });
      this.userInput = '';
      this.isLoading = true;
      console.log("mode >> ",this.mode);

      if (this.mode === 'bot') {
        await this.handleBotMessage(message);
        this.isMsgSend = false;
      } else {
        this.handleHumanMessage(message);
        this.isMsgSend = false;
      }
    }
  }

  ngAfterViewChecked() {
    this.scrollToBottom(); // 👈 will scroll every time view updates
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop =
        this.messagesContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.warn('Scroll error:', err);
    }
  }


  private async handleBotMessage(message: string) {
    try {
      const response: any = await this.http.post(
       // 'http://localhost:5678/webhook/ca7ad99c-d1cd-4237-b95d-5182c70a7d14/chat',
       this.mainUrl,
        { chatInput: message }
      ).toPromise();

      console.log('Bot response:', response);
      this.isLoading = false;
      let userRole = response.reply;

      // Check if backend says "agent"
      if (userRole.role === 'humanAgent') {
        this.chatMessages.push({ role: 'user', content: 'Connecting you to a human agent...' });// initialize chat
        this.mode = 'agent';
      } else {
        this.chatMessages.push({ role: 'assistant', content: userRole.content , button:userRole.frontendAction});
      }

      this.scrollToBottom();
    } catch (error) {
      this.isLoading = false;
      console.error('Error:', error);
      this.chatMessages.push({ role: 'bot', content: 'Error connecting to bot.' });
    }
  }


  goToCheckout(url:any){
    this.showCheckoutIframe = true;
    this.checkoutUrl = url; //for dynamic
   // this.checkoutUrl = this.checkoutUrl+'?email=tes2t@gmail.com&amount=50' //for static
    this.safeCheckoutUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.checkoutUrl);
  }

  onIframeLoad(){
    console.log("onnnn loadddd");
  }

  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
  }

  private handleHumanMessage(message: string) {
    console.log("window >> ",window)
    if (window.Tawk_API && window.Tawk_API.addEvent) {
      // window.Tawk_API.addMessageToChat({
      //   text: message,
      //   type: 'visitor'
      // });

      console.log("innnn")
      window.Tawk_API.addEvent('chat-message', { text: message });

    } else {
      console.warn('Tawk_API not ready');
    }
  }

  getContent(data:any){
    return marked(data);
  }

 }
