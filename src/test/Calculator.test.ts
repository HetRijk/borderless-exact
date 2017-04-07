import Calculator from '../main/';
import * as Assert from 'assert';

// Define constant test values here
const TEST_VALUE = 'TEST';

describe('Calculator', () => {
  let calculator: Calculator;

  beforeEach(() => {
    // Do some prep work here
    calculator = new Calculator();
  });

  afterEach(() => {
    // Do some clean up here
  });

  describe('#Add', () => {
    it('should add a positive value', () => {
      const expected = 1;
      const actual = calculator.Add(1).GetValue();

      Assert.equal(actual, expected);
    });

    it('should add a negative value', () => {
      const expected = -1;
      const actual = calculator.Add(-1).GetValue();

      Assert.equal(actual, expected);
    });

    it('should add +0', () => {
      calculator = new Calculator(42);
      const expected = 42;
      const actual = calculator.Add(0).GetValue();

      Assert.equal(actual, expected);
    });

    it('should add -0', () => {
      calculator = new Calculator(42);
      const expected = 42;
      const actual = calculator.Add(-0).GetValue();

      Assert.equal(actual, expected);
    });
  });

  describe('#Subtract', () => {
    it('should subtract a positive value', () => {
      const expected = -1;
      const actual = calculator.Subtract(1).GetValue();

      Assert.equal(actual, expected);
    });

    it('should subtract a negative value', () => {
      const expected = 1;
      const actual = calculator.Subtract(-1).GetValue();

      Assert.equal(actual, expected);
    });

    it('should subtract +0', () => {
      const expected = 0;
      const actual = calculator.Subtract(0).GetValue();

      Assert.equal(actual, expected);
    });

    it('should subtract -0', () => {
      const expected = 0;
      const actual = calculator.Subtract(-0).GetValue();

      Assert.equal(actual, expected);
    });
  });

  describe('#Divide', () => {
    it('should divide by a positive value', () => {
      calculator.Add(2);

      const expected = 1;
      const actual = calculator.Divide(2).GetValue();

      Assert.equal(actual, expected);
    });

    it('should divide by a negative value', () => {
      calculator.Add(2);

      const expected = -1;
      const actual = calculator.Divide(-2).GetValue();

      Assert.equal(actual, expected);
    });

    it('should not divide by +0', () => {
      Assert.throws(() => { calculator.Divide(+0); }, 'DivideByZeroException');

    });

    it('should not divide by -0', () => {
      const func = calculator.Divide.bind(calculator, -0);

      Assert.throws(func, 'DivideByZeroException');
    });
  });

  describe('#Multiply', () => {
    // Too lazy to implement
  });

  describe('#combo-breaker', () => {
    it('should do everything', () => {
      const expected = 3;
      const initial = Math.random();

      calculator = new Calculator(initial);
      const actual = calculator
        .Multiply(2)
        .Add(6)
        .Divide(2)
        .Subtract(initial)
        .GetValue();

      Assert.equal(actual, expected);
    });
  });
});
