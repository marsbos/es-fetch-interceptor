// compose the handlers from left to right:
const pipe = (...fns) => {
  return async (initialValue) => {
    const result = await fns.reduce(async (prev, curr) => {
      let _results = initialValue || {};
      if (prev instanceof Promise) {
        _results = await prev;
      } else if (typeof prev === 'function') {
        _results = await prev();
      }
      return curr(_results);
    }, initialValue);
    return result;
  };
};
// create 'middleware' functions from each handler:
const createMiddlewareFromFuncs = (...fns) => {
  const funcs = fns.map((fn) => {
    return createMiddlewareFunc(fn);
  });
  return pipe(...funcs);
};
// transform handler into a 'middleware' function:
const createMiddlewareFunc = (fn) => {
  return function(args) {
    return new Promise((resolve, reject) => {
      const _resolve = (requestOrResponseOrError) => {
        resolve(requestOrResponseOrError);
      };
      fn(args, _resolve, reject);
    });
  };
};

/**
 * Run the fetch request with interceptor-middlewares.
 * @param {*} middlewares 
 */
const applyInterceptors = (middlewares) => async (
  originalFetch,
  url,
  requestInfo = {}
) => {
  const requestMiddleware = middlewares.request.create();
  const responseMiddleware = middlewares.response.create();
  const errorMiddleware = middlewares.error.create();

  const reqInfo = await requestMiddleware(requestInfo);
  const response = await originalFetch
    .apply(undefined, [
      url,
      reqInfo,
    ])
    .then((res) => {
      if (res && (res.ok || res.status === 200)) {
        return responseMiddleware(res);
      }
      return Promise.reject({ status: res.status, statusText: res.statusText });
    }).catch(async ({ status, statusText } = {}) => {
      const customError = await errorMiddleware({ url, status, statusText, request: reqInfo });
      return Promise.reject(customError);
    });
  return response;
};

const middlewareHandler = (obj) => {
  return {
    ...obj,
    ...{
      _handlers: [],
      add: function(...handler) {
        if (!handler || handler && !handler.filter(h => h!== undefined).length) {
          return;
        }
        this._handlers = [...this._handlers, ...handler];
        const unregister = function() {
          this._handlers = this._handlers.filter((handler) => handler !== handler);
        }.bind(this);
        return unregister;
      },
      clear: function() {
        this._handlers = [];
      },
      get: function() {
        return this._handlers;
      },
      hasInterceptors: function() {
        return this.get().length?true:false;
      },
      create: function() {
        if (this._handlers.length) {
          return createMiddlewareFromFuncs(...this._handlers);
        }
        return createMiddlewareFromFuncs((obj, next)=>{
          next(obj);
        });
      },
    },
  };
};

const interceptors = () => {
  return {
    response: middlewareHandler({}),
    request: middlewareHandler({}),
    error: middlewareHandler({}),
  };
};

/**
 * Add interceptors for requests, responses and/or errors.
 */
const fetchInterceptor = (() => {
  const globals = interceptors();
  return {
    interceptors: {
      ejectAll: function() {
        globals.request.clear();
        globals.response.clear();
        globals.error.clear();
      },
      request: {
        use(requestHandler) {
          return globals.request.add(requestHandler);
        },
      },
      response: {
        use(responseHandler) {
          return globals.response.add(responseHandler);
        },
      },
      error: {
        use(errorHandler) {
          return globals.error.add(errorHandler);
        },
      },
    },
    get() {
      return globals;
    }
  };
})();

/**
 * Create custom instance middleware interceptors
 */
const createInstanceInterceptors = ({ request, response, error } = {}) => {
  const ref = interceptors();
  ref.request.add(request);
  ref.response.add(response);
  ref.error.add(error);
  return ref;
};

/**
 * Merge the instance middleware interceptors with global interceptor middleware
 * @param {*} instanceMiddleware 
 */
const combineInterceptors = instanceMiddleware => {
  const globReqInterceptorHandlers = {...fetchInterceptor.get().request };
  if (instanceMiddleware.request.hasInterceptors()) {
      globReqInterceptorHandlers.add(...instanceMiddleware.request.get());
  }
  const globResInterceptorHandlers = {...fetchInterceptor.get().response };
  if (instanceMiddleware.response.hasInterceptors()) {
    globResInterceptorHandlers.add(...instanceMiddleware.response.get());
  }
  const globErrInterceptorHandlers = {...fetchInterceptor.get().error };
  if (instanceMiddleware.error.hasInterceptors()) {
    globErrInterceptorHandlers.add(...instanceMiddleware.error.get());
  }
  return {
    request: globReqInterceptorHandlers,
    response: globResInterceptorHandlers,
    error: globErrInterceptorHandlers,
  }
};

/**
 * Create an instance of the fetch wrapper, with optional custom instance middleware.  
 * When no custom instance middleware provided, it takes the global interceptor middleware.
 */
const createFetch = ((global) => {
  return instanceMiddleware => {
    const applyFetch = applyInterceptors(instanceMiddleware || fetchInterceptor.get());
    if (global['Proxy']) {
      return new Proxy(global.fetch, {
        async apply(target, thisArg, args) {
          return applyFetch(target, ...args);
        },
      });
    }
  }
})(window);

export { fetchInterceptor, createFetch, createInstanceInterceptors, combineInterceptors };
