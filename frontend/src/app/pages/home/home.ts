import { Component, OnInit, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ModulesService, AppModule } from '../../services/modules.service';

interface ColorTokens {
  iconBg: string;
  iconColor: string;
  btnBg: string;
}

const COLORS: Record<string, ColorTokens> = {
  purple: { iconBg: '#ebe7f6', iconColor: '#7c5cbf', btnBg: '#4c3f91' },
  green:  { iconBg: '#d4edda', iconColor: '#2d7a4f', btnBg: '#1a5c3a' },
  rose:   { iconBg: '#f5e6ea', iconColor: '#a05070', btnBg: '#7c4a5a' },
  blue:   { iconBg: '#dbeafe', iconColor: '#2563eb', btnBg: '#1e4480' },
  teal:   { iconBg: '#d1fae5', iconColor: '#0f766e', btnBg: '#1a6b5a' },
};

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  private router = inject(Router);
  private modulesService = inject(ModulesService);

  greeting = signal('');
  subtitle = signal('');
  modules = signal<AppModule[]>([]);

  ngOnInit() {
    this.setGreeting();
    this.loadModules();
  }

  private setGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      this.greeting.set('Good morning, Hans.');
    } else if (hour >= 12 && hour < 19) {
      this.greeting.set('Good afternoon, Hans.');
    } else {
      this.greeting.set('Good evening, Hans.');
    }
    this.subtitle.set("Your ecosystem is in harmony. Select a gateway to continue your journey through the day's rituals.");
  }

  private loadModules() {
    this.modulesService.getModules().subscribe(({ modules }) => {
      this.modules.set(modules);
    });
  }

  navigate(route: string) {
    this.router.navigate([route]);
  }

  tokens(color: string): ColorTokens {
    return COLORS[color] ?? COLORS['blue'];
  }
}
