import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notification = new BehaviorSubject<{message: string, show: boolean}>({message: '', show: false});
  public notification$ = this.notification.asObservable();

  showNotification(message: string): void {
    this.notification.next({message: message, show: true});
    
    // Masquer la notification après 1 seconde
    setTimeout(() => {
      this.notification.next({message: '', show: false});
    }, 1000);
  }
}
