import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatService {
  constructor(private http: HttpClient) {}

  sendMessage(message: any):Observable<any> {
    let sessionId = '101'; 
    //let data = {message:message,sessionId:sessionId};

    let data = {message:message,threadId:'thread_snngCcvW7DHLTAeVr4ybFwIw'};

    return this.http.post<any>('http://localhost:3000/chat',data);
  }
}
