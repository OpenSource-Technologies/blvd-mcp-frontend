import { Component, OnInit } from '@angular/core';
import { ChatService } from '../services/chat.services';
import { HttpClient } from '@angular/common/http';

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
  //public userInput = '';
  //chatMessages: { sender: string, text: string }[] = [];
  //userInput: string = '';

  showBotChat = true;
  showHumanChat = false;

  isLoading = false;



  chatMessages: { sender: string, text: string }[] = [
    { sender: 'bot', text: 'Hi! How can I help you?' }
  ];
  userInput = '';
  mode: 'bot' | 'agent' = 'bot'; // 👈 track current mode

  isChatOpen = false;

  constructor(
    private chatService: ChatService,
    private http: HttpClient
  ) { }

  ngOnInit(): void {

    // if (window.Tawk_API) {
    //   console.log("✅ Tawk_API is ready");
    //   console.log("window.Tawk_API >> ",window.Tawk_API);
    //  // clearInterval(checkTawk);

    //   // Example: listen to events
    //   window.Tawk_API.onStatusChange = () => {
    //     console.log("User started chatting with human agent");
    //   };
    // }
  }


  send() {
    const userMsg = { role: 'user', content: this.userInput };
    this.messages.push(userMsg);

    this.chatService.sendMessage(this.userInput).subscribe(res => {
      console.log(res);
      this.messages.push({ role: 'assistant', content: res?.reply?.content ?? res?.response });
      this.userInput = '';
    });
  }





  async sendMessageold() {
    const message = this.userInput.trim();
    if (!message) return;

    this.chatMessages.push({ sender: 'user', text: message });
    this.userInput = '';

    try {
      const response: any = await this.http.post(
        'http://localhost:5678/webhook/ca7ad99c-d1cd-4237-b95d-5182c70a7d14/chat',
        { chatInput: message }
      ).toPromise();

      console.log("response >> ",response);

      if (response.output === 'agent') {
        if (window['Tawk_API']) {
          window['Tawk_API'].maximize();
        } else {
          alert('Connecting to a human agent...');
        }

      } else {
        this.chatMessages.push({ sender: 'bot', text: response.output });
      }
    } catch (error) {
      console.error('Error:', error);
      this.chatMessages.push({ sender: 'bot', text: 'Error connecting to bot.' });
    }
  }

  // async sendMessage() {
  //   const message = this.userInput.trim();
  //   if (!message) return;
  
  //   this.chatMessages.push({ sender: 'user', text: message });
  //   this.userInput = '';
  
  //   try {
  //     const response: any = await this.http.post(
  //       'http://localhost:5678/webhook/ca7ad99c-d1cd-4237-b95d-5182c70a7d14/chat',
  //       { chatInput: message }
  //     ).toPromise();
  
  //     console.log("response >> ", response);
  

  //     this.loadTawkInlineChat();
  //     // if (response.output === 'agent') {
  //     //   this.showBotChat = false;
  //     //   this.showHumanChat = true;
  //     //   // Optional: scroll to bottom
  //     //   setTimeout(() => {
  //     //     document.getElementById('tawkChatFrame')?.scrollIntoView({ behavior: 'smooth' });
  //     //   }, 300);
  //     // } else {
  //     //   this.chatMessages.push({ sender: 'bot', text: response.output });
  //     // }
  //   } catch (error) {
  //     console.error('Error:', error);
  //     this.chatMessages.push({ sender: 'bot', text: 'Error connecting to bot.' });
  //   }
  // }


  // loadTawkInlineChat() {
  //   this.showHumanChat = true;

  //   // Wait for container to render
  //   setTimeout(() => {
  //     window.Tawk_API = window.Tawk_API || {};
  //    // window.Tawk_LoadStart = new Date();

  //     const s1 = document.createElement('script');
  //     s1.async = true;
  //     s1.src = 'https://embed.tawk.to/61f6641a9bd1f31184da0b21/default';
  //     s1.charset = 'UTF-8';
  //     s1.setAttribute('crossorigin', '*');
  //     document.getElementById('tawkChatFrame')?.appendChild(s1);
  //     document.getElementById('tawkChatFrame')?.scrollIntoView({ behavior: 'smooth' });

  //     window.Tawk_API.onPrechatSubmit = () => {
  //       console.log("User started chatting with human agent");
  //     };
  //   }, 200);
  // }


  // openTawkChat() {
  //   if (window.Tawk_API) {
  //     window.Tawk_API.maximize();
  //   } else {
  //     alert("Tawk.to not loaded yet!");
  //   }
  // }



  async sendMessage() {
    const message = this.userInput.trim();
    console.log("message >> ",message)
    if (!message) return;
    this.chatMessages.push({ sender: 'user', text: message });
    this.userInput = '';
    this.isLoading = true;

    if (this.mode === 'bot') {
      await this.handleBotMessage(message);
    } else {
      this.handleHumanMessage(message);
    }
  }

  private async handleBotMessage(message: string) {
    try {
      const response: any = await this.http.post(
        'http://localhost:5678/webhook/ca7ad99c-d1cd-4237-b95d-5182c70a7d14/chat',
        { chatInput: message }
      ).toPromise();

      console.log('Bot response:', response);
      this.isLoading = false;

      // Check if backend says "agent"
      if (response.output === 'agent') {
        this.chatMessages.push({ sender: 'user', text: 'Connecting you to a human agent...' });
        this.initTawkInline(); // initialize chat
        this.mode = 'agent';
      } else {
        this.chatMessages.push({ sender: 'agent', text: response.output });
      }
    } catch (error) {
      this.isLoading = false;
      console.error('Error:', error);
      this.chatMessages.push({ sender: 'bot', text: 'Error connecting to bot.' });
    }
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

  private initTawkInline() {

    alert("send message to agent");
    // if (window.Tawk_API) return; // already loaded

    // window.Tawk_API = window.Tawk_API || {};
    // window.Tawk_API.visitor = { name: 'Chatbot User' };

    // const s1 = document.createElement('script');
    // s1.async = true;
    // s1.src = 'https://embed.tawk.to/61f6641a9bd1f31184da0b21/default';
    // s1.charset = 'UTF-8';
    // s1.setAttribute('crossorigin', '*');
    // document.body.appendChild(s1);

    // // Listen for agent replies
    // window.Tawk_API.onLoad = () => {
    //   console.log('✅ Tawk loaded');
    // };

    // window.Tawk_API.onChatMessageVisitor = (message: any) => {
    //   this.chatMessages.push({ sender: 'agent', text: message.text });
    // };

    // window.Tawk_API.onChatMessageAgent = (message: any) => {
    //   this.chatMessages.push({ sender: 'agent', text: message.text });
    // };

    // window.Tawk_API.onChatEnded = () => {
    //   this.mode = 'bot';
    //   this.chatMessages.push({
    //     sender: 'bot',
    //     text: 'The agent has ended the chat. How else can I help?'
    //   });
    // };
  }
}
