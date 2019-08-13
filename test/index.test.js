import { fetchInterceptor, createFetch, combineInterceptors, createInstanceInterceptors } from '../src/index.js';

describe('es-fetch-interceptor', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(() => {
      var p = new Promise((resolve, reject) => {
        resolve({
          status: 200,
        });
      });
      return p;
    });
  });

  afterEach(() => {
    fetchInterceptor.interceptors.ejectAll();
  });

  it('can register global interceptors', async () => {
    let reqInterceptorCalled = false;
    let resInterceptorCalled = false;
    fetchInterceptor.interceptors.request.use((req, next) => {
      reqInterceptorCalled = true;
      next(req);
    });
    fetchInterceptor.interceptors.response.use((res, next) => {
      resInterceptorCalled = true;
      next(res);
    });
    const fetch = createFetch();
    await expect(fetch('http://www/google.com')).resolves.toEqual({ status: 200 });
    expect(reqInterceptorCalled).toBe(true);
    expect(resInterceptorCalled).toBe(true);
  });

  it('can unregister global interceptors', async () => {
    let reqInterceptorCalled = false;
    let resInterceptorCalled = false;
    const unregisterReqInterceptor = fetchInterceptor.interceptors.request.use((req, next) => {
      reqInterceptorCalled = true;
      next(req);
    });
    fetchInterceptor.interceptors.response.use((res, next) => {
      resInterceptorCalled = true;
      next(res);
    });
    const fetch = createFetch();
    unregisterReqInterceptor();
    await expect(fetch('http://www/google.com')).resolves.toEqual({ status: 200 });
    expect(reqInterceptorCalled).toBe(false);
    expect(resInterceptorCalled).toBe(true);
  });

  it('can register chained global interceptors', async () => {
    let reqInterceptorCalled = false;
    let reqInterceptorCalled2 = false;
    let resInterceptorCalled = false;
    let resInterceptorCalled2 = false;
    let resInterceptorCalled3 = false;
    fetchInterceptor.interceptors.request.use((req, next) => {
      reqInterceptorCalled = true;
      next(req);
    });
    fetchInterceptor.interceptors.request.use((req, next) => {
      reqInterceptorCalled2 = true;
      next(req);
    });
    fetchInterceptor.interceptors.response.use((res, next) => {
      resInterceptorCalled = true;
      next(res);
    });
    fetchInterceptor.interceptors.response.use((res, next) => {
      resInterceptorCalled2 = true;
      next(res);
    });
    fetchInterceptor.interceptors.response.use((res, next) => {
      resInterceptorCalled3 = true;
      next(res);
    });
    const fetch = createFetch();
    await expect(fetch('http://www/google.com')).resolves.toEqual({ status: 200 });
    expect(reqInterceptorCalled).toBe(true);
    expect(reqInterceptorCalled2).toBe(true);
    expect(resInterceptorCalled).toBe(true);
    expect(resInterceptorCalled2).toBe(true);
    expect(resInterceptorCalled3).toBe(true);
  });

  it('can register instance-only interceptors', async () => {
    let instanceReqInterceptorCalled = false;
    let reqInterceptorCalled = false;
    fetchInterceptor.interceptors.request.use((req, next) => {
      reqInterceptorCalled = true;
      next(req);
    });
    const fetch = createFetch(
      createInstanceInterceptors({
        request: (req, next) => {
          instanceReqInterceptorCalled = true;
          next(req);
        },
      })
    );
    await expect(fetch('http://www/google.com')).resolves.toEqual({ status: 200 });
    expect(instanceReqInterceptorCalled).toBe(true);
    expect(reqInterceptorCalled).toBe(false);
  });

  it('can combine instance-only interceptors & global interceptors', async () => {
    let instanceReqInterceptorCalled = false;
    let reqInterceptorCalled = false;
    fetchInterceptor.interceptors.request.use((req, next) => {
      reqInterceptorCalled = true;
      next(req);
    });
    const fetch = createFetch(
      combineInterceptors(
        createInstanceInterceptors({
          request: (req, next) => {
            instanceReqInterceptorCalled = true;
            next(req);
          },
        })
      )
    );
    await expect(fetch('http://www/google.com')).resolves.toEqual({ status: 200 });
    expect(instanceReqInterceptorCalled).toBe(true);
    expect(reqInterceptorCalled).toBe(true);
  });

  it('can reject requests', async () => {
    let instanceReqInterceptorCalled = false;
    fetchInterceptor.interceptors.request.use((req, next, reject) => {
      reject('rejected');
    });
    const fetch = createFetch(
      combineInterceptors(
        createInstanceInterceptors({
          request: (req, next) => {
            instanceReqInterceptorCalled = true;
            next(req);
          },
        })
      )
    );
    await expect(fetch('http://www/google.com')).rejects.toMatch('rejected');
    expect(instanceReqInterceptorCalled).toBe(false);
  });

  it('can intercept request errors', async () => {
    global.fetch = jest.fn().mockImplementation(() => {
      var p = new Promise((resolve, reject) => {
        reject('rejected');
      });
      return p;
    });
    let instanceReqInterceptorCalled = false;
    let instanceErrorInterceptorCalled = false;
    fetchInterceptor.interceptors.request.use((req, next, reject) => {
      next(req);
    });
    const fetch = createFetch(
      combineInterceptors(
        createInstanceInterceptors({
          request: (req, next) => {
            instanceReqInterceptorCalled = true;
            next(req);
          },
          error: (error, next) => {
            instanceErrorInterceptorCalled = true;
            next(error);
          },
        })
      )
    );
    await expect(fetch('http://www/google.com', { method: 'POST' })).rejects.toEqual({"request": {"method": "POST"}, "status": undefined, "statusText": undefined, "url": "http://www/google.com"});
    expect(instanceReqInterceptorCalled).toBe(true);
    expect(instanceErrorInterceptorCalled).toBe(true);
  });
});
