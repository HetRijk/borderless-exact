export class Storage<T> {
  private readonly storage: any = {};

  public findById(id: string, cb: (err, user: T) => any ) {
    const x = this.storage[id] as T;
    let err: Error | undefined;
    if (!x) {
      err = new Error(`did not find user by id ${id}.`);
    }
    return cb(err, x);
  }

  public findByIdPromise(id: string) {
    return new Promise<T>((resolve, reject) => {
      this.findById(id, (err, user) => {
        if (err) {
          reject(err);
        } else {
          resolve(user);
        }
      });
    });
  }

  public findOrCreate(id: string, data: T, cb: (err, user: T ) => any ) {
    let x = this.storage[id];
    if (!x) {
      this.storage[id] = data;
      x = data;
    }
    return cb(undefined, x);
  }

  public updateById(id: string, data: Partial<T>, cb: (err, user: T) => any) {
    const x = this.storage[id] as T;
    let err: Error | undefined;
    if (!x) {
      err = new Error(`did not find user by id ${id}.`);
    }
    Object.assign(x, data);
    this.storage[id] = x;
    return cb(err, x);
  }

  public updateByIdPromise(id: string, data: Partial<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.updateById(id, data, (err, user) => {
        if (err) {
          reject(err);
        } else {
          resolve(user);
        }
      });
    });
  }

  public dropById(id: string) {
    delete this.storage.id;
  }
}
