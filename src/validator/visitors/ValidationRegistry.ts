import { FlowElement } from '../elements/FlowElement';
import { ValidationStrategy } from './strategies/ValidationStrategy';
import { ScreenValidationStrategy } from './strategies/ScreenValidationStrategy';
import { AssignmentValidationStrategy } from './strategies/AssignmentValidationStrategy';
import { DecisionValidationStrategy } from './strategies/DecisionValidationStrategy';
import { LoopValidationStrategy } from './strategies/LoopValidationStrategy';

export class ValidationRegistry {
  private strategies: ValidationStrategy[];

  constructor(
    strategies: ValidationStrategy[] = [
      new ScreenValidationStrategy(),
      new AssignmentValidationStrategy(),
      new DecisionValidationStrategy(),
      new LoopValidationStrategy(),
    ],
  ) {
    this.strategies = strategies;
  }

  public canHandle(element: FlowElement): boolean {
    return this.strategies.some((strategy) => strategy.canHandle(element));
  }

  public getStrategy(element: FlowElement): ValidationStrategy | undefined {
    return this.strategies.find((strategy) => strategy.canHandle(element));
  }

  public register(strategy: ValidationStrategy): void {
    this.strategies.push(strategy);
  }

  public getStrategies(): ValidationStrategy[] {
    return [...this.strategies];
  }
}
