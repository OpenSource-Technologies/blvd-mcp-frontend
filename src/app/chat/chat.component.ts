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

  public messages: any = [{ role: 'assistant', content: 'Hi! How can I help you?' }];

  // mainUrl: string = 'http://localhost:3000/chat';
  // checkoutUrl: string = 'https://blvd-chatbot.ostlive.com/checkout';

  mainUrl:any = 'http://localhost:3000/chat';
  checkoutUrl:any = 'https://blvd-chatbot.ostlive.com/checkout';
  //mainUrl:any = ' https://middleware.ostlive.com/chat';

  showBotChat = true;
  showHumanChat = false;

  isLoading = false;
  userInput = '';
  mode: 'bot' | 'agent' = 'bot';
  isChatOpen = false;

  chatMessages: any[] = [];
  isMsgSend: boolean = false;

  showCheckoutIframe: boolean = false;
  safeCheckoutUrl?: SafeResourceUrl;

  sessionId!: string;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  constructor(
    private chatService: ChatService,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // Generate a new session ID on every page load
    this.sessionId = this.generateSessionId();

    // Listen for messages from checkout iframe
    window.addEventListener('message', (event) => {
      if (event.data?.source === 'checkout-iframe') {


        if (event.data.type === 'CARD_TOKENIZED') {
          if(event.data.token !="back"){
            this.sendTokanizeToken(event.data.token);
            console.log('✅ Token received from checkout:', event.data.token);
          }
          
          this.showCheckoutIframe = false; // Close iframe
          if (event.data.type === 'CARD_TOKENIZED' && event.data.token !== "back") {
            this.sendTokanizeToken(event.data.token);
            this.showCheckoutIframe = false;
          } else if (event.data.type === 'ERROR') {
            console.error('❌ Error from checkout:', event.data.error);
          }
        }
      }
    });
  }

  /** Generate a fresh session ID */
  private generateSessionId(): string {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2);
  }

  /** Send token to backend and push bot reply */
  sendTokanizeToken(token: string) {
    this.http.post(this.mainUrl + '/receive-token', { token, sessionId: this.sessionId })
      .subscribe({
        next: (res: any) => {
          if (res?.reply?.content) {
            this.chatMessages.push({ role: 'assistant', content: res.reply.content });
          } else if (res?.response) {
            this.chatMessages.push({ role: 'assistant', content: res.response });
          }
          this.scrollToBottom();
        },
        error: (err) => console.error("sendTokanizeToken failed >>", err)
      });
  }

  /** Send user message */
  async sendMessage() {
    if (this.isMsgSend) return;
    this.isMsgSend = true;

    const message = this.userInput.trim();
    if (!message) return;

    this.chatMessages.push({ role: 'user', content: message });
    this.userInput = '';
    this.isLoading = true;

    if (this.mode === 'bot') {
      await this.handleBotMessage(message);
    } else {
      this.handleHumanMessage(message);
    }

    this.isMsgSend = false;
  }

  /** Scroll chat container to bottom */
  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop =
        this.messagesContainer.nativeElement.scrollHeight;
    } catch (err) {
      console.warn('Scroll error:', err);
    }
  }

  /** Handle bot messages */
  private async handleBotMessage(message: string) {
    try {
      const response: any = await this.http.post(this.mainUrl, {
        chatInput: message,
        sessionId: this.sessionId
      }).toPromise();

      this.isLoading = false;
      const userRole = response.reply;

      if (userRole.role === 'humanAgent') {
        this.chatMessages.push({ role: 'user', content: 'Connecting you to a human agent...' });
        this.mode = 'agent';
      } else {
        this.chatMessages.push({ role: 'assistant', content: userRole.content, button: userRole.frontendAction });
      }

      this.scrollToBottom();
    } catch (error) {
      this.isLoading = false;
      console.error('Error:', error);
      this.chatMessages.push({ role: 'bot', content: 'Error connecting to bot.' });
    }
  }

  /** Open checkout iframe */
  goToCheckout(url: string) {
    this.showCheckoutIframe = true;
    this.checkoutUrl = url;
    this.safeCheckoutUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.checkoutUrl);
  }

  onIframeLoad() {
    console.log("Iframe loaded");
  }

  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
  }

  /** Send human message via Tawk API */
  private handleHumanMessage(message: string) {
    if (window.Tawk_API && window.Tawk_API.addEvent) {
      window.Tawk_API.addEvent('chat-message', { text: message });
    } else {
      console.warn('Tawk_API not ready');
    }
  }

  /** Render markdown content */
  getContent(data: any) {
    return marked(data);
  }

}
