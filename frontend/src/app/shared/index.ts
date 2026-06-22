// Pipes
import { CurrencyFormatPipe } from './pipes/currency-format.pipe';
import { RelativeDatePipe } from './pipes/relative-date.pipe';
// Directives
import { ClickOutsideDirective } from './directives/click-outside.directive';
import { AppearDirective } from './directives/appear.directive';
// Components
import { ButtonComponent } from './components/button/button';
import { CardComponent } from './components/card/card';
import { InputComponent } from './components/input/input';
import { ModalComponent } from './components/modal/modal';
import { BadgeComponent } from './components/badge/badge';
import { SkeletonComponent } from './components/skeleton/skeleton';
import { EmptyStateComponent } from './components/empty-state/empty-state';
import { ToastComponent } from './components/toast/toast';
import { ToggleComponent } from './components/toggle/toggle';
import { IconComponent } from './components/icon/icon';
import { ProgressBarComponent } from './components/progress-bar/progress-bar';

export const sharedPipes = [CurrencyFormatPipe, RelativeDatePipe];
export const sharedDirectives = [ClickOutsideDirective, AppearDirective];
export const sharedComponents = [
  ButtonComponent, CardComponent, InputComponent, ModalComponent,
  BadgeComponent, SkeletonComponent, EmptyStateComponent, ToastComponent,
  ToggleComponent, IconComponent, ProgressBarComponent,
];
export const sharedImports = [...sharedPipes, ...sharedDirectives, ...sharedComponents];
