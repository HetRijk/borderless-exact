import { ICalculator } from '../interfaces/';

export default class Calculator implements ICalculator {
  private _value: number = 0;

  public constructor(value: number = 0) {
    this._value = value;
  }

  public Add(value: number): Calculator {
    this._value += value;

    return this;
  }

  public Subtract(value: number): Calculator {
    this._value -= value;

    return this;
  }

  public Divide(value: number): Calculator {
    if (value === 0) {
      throw new Error('DivideByZeroException');
    }

    this._value /= value;

    return this;
  }

  public Multiply(value: number): Calculator {
    this._value *= value;

    return this;
  }

  public GetValue(): number {
    return this._value;
  }
}
