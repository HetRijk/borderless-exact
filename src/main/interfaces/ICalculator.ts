interface ICalculator {
  Add(value: number): ICalculator;
  Subtract(value: number): ICalculator;
  Divide(value: number): ICalculator;
  Multiply(value: number): ICalculator;
  GetValue(): number;
}

export default ICalculator;
