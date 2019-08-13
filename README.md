# es-fetch-interceptor
Wrapper & interceptors for browser's native `fetch`, inspired by Axios.  
With es-fetch-interceptor you can add interceptors, for `global` use and/or for `instances`, which intercept fetch requests.     
It does not monkeypatch fetch because this can interfere with other libraries/tools.  

## Prerequisites
- Make sure you have either `fetch` support or a fetch polyfill.  
- Support for `Proxy` or a polyfill.

## Adding interceptors
### Global
To add a global interceptor, one which will be invoked at every request, you can do the following:  

#### Example:  
Note that you can chain global interceptors just by adding a new one.  
```js
import { fetchInterceptor } from 'es-fetch-interceptor';

// Request interceptor middleware:
fetchInterceptor.interceptors.request.use((req, next, reject) => {
  // do something useful with the request:
  next({ ...req, headers: { ...req.headers,  myHeader: 'mycustom-header' } });
});
// Response interceptor middleware:
fetchInterceptor.interceptors.response.use((res, next, reject) => {
  // do something useful with the response:
  next(res);
});
// Error interceptor middleware:
fetchInterceptor.interceptors.error.use((error, next) => {
  // do something useful with the error:
  next(error);
});
// Add another (global) request interceptor:
fetchInterceptor.interceptors.request.use((req, next, reject) => {
  // do something useful with the request:
  next({ ...req, headers: { ...req.headers,  anotherHeader: 'another-header' } });
});
```
Note that it is not required to provide all of `request`, `response` & `error`. Pick at least one of them to make your interceptor active.  

### Usage
You can now make use of the interceptor middleware anywhere in your codebase.  
Each interceptor you defined earlier, will be called.  

#### Example:    
```js
import { createFetch } from 'es-fetch-interceptor';
const fetch = createFetch();
...  
await fetch('/someApi', {
  ...properties here...
});
```

Note that we just called `createFetch` to get an 'instance' of a fetch wrapper that will be created.   
When called like this, without any arguments, it means that we are using only global interceptors, if any provided.  
Below, when defining instance interceptors, we'll see more.  

### Instance
Instance interceptor middleware can run completely isolated from any global interceptor middleware.  
To add your instance interceptors, you can use the `createFetch` function combined with the `createInstanceInterceptors` function.  Also, it is possible to combine the instance middleware with any provided global interceptor middleware.   
Therefore you can use the `combineInterceptors` function.  

#### Examples:

This example combines global interceptors with custom interceptors.  
```js
import { createFetch, combineInterceptors, createInstanceInterceptors } from 'es-fetch-interceptor';
const fetch = createFetch(combineInterceptors(createInstanceInterceptors(
  { 
    request: (req, next, reject) => {
      // do something useful with the request
      next(req);
    },
    response: (res, next, reject) => {
      // do something useful with the response
      next(res);
    },
  }
)));
```

This example uses only custom interceptors, which means any provided global interceptor will be bypassed.  

```js
import { createFetch, combineInterceptors, createInstanceInterceptors } from 'es-fetch-interceptor';
const fetch = createFetch(createInstanceInterceptors(
  { 
    request: (req, next, reject) => {
      // do something useful with the request
      next(req);
    },
    response: (res, next, reject) => {
      // do something useful with the response
      next(res);
    },
    error: (error, next, reject) => {
      // Do something with the error:
      next(error);
    }
  }
));
```

### Usage
Same as above. Just use fetch as you normally would.    


## Interceptor function anatomy
Each interceptor handler or function gets three arguments: 
1. the request | response | error object, you can use for custom processing like adding headers or altering a response,
2. the `next` function to call the next interceptor in the chain,
3. a reject function, to reject/cancel the request or response processing.  
Calling the reject function, will trigger the `catch` in your fetch call.  
Any error interceptor middleware won't be called because error interceptors only act upon request/response fetch errors.  

The request object is the request [init object](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax) used in the fetch call.  
The response object is the [response object](https://developer.mozilla.org/en-US/docs/Web/API/Response) used in the fetch call.  
The error object is a custom object which consists of:
- url,
- status,
- statusText,
- the request object.


#### Example:

```js
import { createFetch, combineInterceptors, createInstanceInterceptors } from 'es-fetch-interceptor';
const fetch = createFetch(combineInterceptors(createInstanceInterceptors(
  { 
    request: (req, next, reject) => {
      // If some condition:
      reject('some reason');
    },
    // This one won't be called, because we rejected earlier.
    response: (res, next, reject) => {
      // Do something useful with the response:
      next(res);
    },
    // This one won't be called, because we rejected earlier.
    error: (error, next, reject) => {
      // Do something useful with the error:
      next(error);
    }
  }
)));
```

```js
const myResponse = await fetch('/myApi', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({...
    }),
  }).catch(error => {
    // Here we catch the error thrown in an interceptor
  });
```


## Tips
* Do not forget to call `next(request|response|error)` in each interceptor function.  

## Ejecting interceptors
To remove all (global) interceptors, call `fetchInterceptor.interceptors.clearAll()`.  
You can also remove individual interceptors:  
Each call to either 
- `fetchInterceptor.interceptors.request.use`
- `fetchInterceptor.interceptors.response.use`
- `fetchInterceptor.interceptors.error.use`  

returns a function which, once called, will remove the interceptor.  
