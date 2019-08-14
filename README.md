# es-fetch-interceptor
Wrapper & interceptors for browser's native `fetch`, inspired by Axios.  

## Prerequisites
- Make sure you have either `fetch` support or a fetch polyfill.  
- Support for `Proxy` or a polyfill.

## General
With es-fetch-interceptor you can register interceptors for requests, responses & errors.  
Each of (global) request, response and error can be chained with multiple interceptors.  
It does not monkeypatch fetch, but instead it uses a wrapper instance you can use to do your fetch requests.  
This means you have total freedom in the kind of fetch you'll want to do, because sometimes it makes no sense to use interceptors. In that case, just use the native fetch or whatever other tool you prefer.  

## Fetch wrapper instance
The `createFetch` function creates a wrapper instance for the native fetch. It makes your interceptors active.  
With this function you can also decide which interceptors you want to use.

## Global interceptors
Interceptors that need to be called on each fetch request, can be registered anytime, anywhere in your codebase. 
If you want to use multiple interceptors for the same intent (request, response and/or error), just add one. All interceptors belonging to the same 'group' will be chained and are called in the same order they were registered.

Note that it is not required to provide all of `request`, `response` & `error`. Pick at least one of them to make your global interceptor active. 

## Instance interceptors
If you want certain interceptors to be called for specific fetch requests, you can register so called 'instance' interceptors. Instance interceptors differ from global interceptors in terms of scope. Global interceptors are called each request while instance interceptors are only called if they were registered for that specific fetch instance.  

## Interceptor function anatomy
An interceptor function expects three arguments: 
1. the `request | response | error` object, you can use for custom processing like adding headers, altering a response or logging errors,
2. the `next` function to call the next interceptor in the chain (it completes the chain/process internally if all interceptors are called),
3. a `reject` function, to reject/cancel the request or response processing.  
Calling the reject function, will trigger the `catch` in your client fetch call.  
Any error interceptor middleware won't be called because error interceptors only act upon request/response fetch errors.  

The request object is the request [init object](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax) used in the fetch call.  
The response object is the [response object](https://developer.mozilla.org/en-US/docs/Web/API/Response) used in the fetch call.  
The error object is a custom object which consists of:
- url,
- status,
- statusText,
- the request object.


## Examples
### Global interceptors only

app.js
```js
import { fetchInterceptor } from 'es-fetch-interceptor';
// Register request interceptor middleware:
fetchInterceptor.interceptors.request.use((req, next, reject) => {
  console.log('Global request interceptor');
  next({ ...req, headers: { ...req.headers,  myHeader: 'mycustom-header' } });
});
```
users.js
```js
import { createFetch } from 'es-fetch-interceptor';
const fetch = createFetch();
...  
await fetch('/users', {
  ...properties here...
});
```
This will log 
```
Global request interceptor
```

### Global & instance interceptors combined
app.js
```js
import { fetchInterceptor } from 'es-fetch-interceptor';
// Register request interceptor middleware:
fetchInterceptor.interceptors.request.use((req, next, reject) => {
  console.log('Global request interceptor');
  next({ ...req, headers: { ...req.headers,  myHeader: 'mycustom-header' } });
});
// Register response interceptor middleware:
fetchInterceptor.interceptors.response.use((res, next, reject) => {
  console.log('Global response interceptor #1');
  next(res);
});
// Register response interceptor middleware:
fetchInterceptor.interceptors.response.use((res, next, reject) => {
  console.log('Global response interceptor #2');
  next(res);
});
```
users.js
```js
import { createFetch, combineInterceptors, createInstanceInterceptors } from 'es-fetch-interceptor';
const fetch = createFetch(combineInterceptors(createInstanceInterceptors(
  { 
    request: (req, next, reject) => {
      console.log('Instance request interceptor');
      next(req);
    },
    response: (res, next, reject)=>{
      console.log('Instance response interceptor');
      next(res);
    },
  }
)));
await fetch('/users', {
  ...properties here...
});
```

This will log
```
Global request interceptor
Instance request interceptor
Global response interceptor #1
Global response interceptor #2
Instance response interceptor
```

### Instance interceptors only
app.js
```js
import { fetchInterceptor } from 'es-fetch-interceptor';
// Register request interceptor middleware:
fetchInterceptor.interceptors.request.use((req, next, reject) => {
  console.log('Global request interceptor');
  next({ ...req, headers: { ...req.headers,  myHeader: 'mycustom-header' } });
});
```
users.js
```js
import { createFetch, createInstanceInterceptors } from 'es-fetch-interceptor';
const fetch = createFetch(createInstanceInterceptors(
  { 
    request: (req, next, reject) => {
      console.log('Instance request interceptor');
      next(req);
    },
    response: (res, next, reject)=>{
      console.log('Instance response interceptor');
      next(res);
    },
  }
));
await fetch('/users', {
  ...properties here...
});
```

This will log
```
Instance request interceptor
Instance response interceptor
```

## Error handling
Any error occurred during the fetch request, can be intercepted. 

### Example - Global & instance interceptors combined
app.js
```js
import { fetchInterceptor } from 'es-fetch-interceptor';
...
// Register error interceptor middleware:
fetchInterceptor.interceptors.error.use((error, next, reject) => {
  console.log('Global error interceptor #1');
  next(res);
});
```
users.js
```js
import { createFetch, combineInterceptors, createInstanceInterceptors } from 'es-fetch-interceptor';
const fetch = createFetch(combineInterceptors(createInstanceInterceptors(
  { 
    request: (req, next, reject) => {
      console.log('Instance request interceptor');
      next(req);
    },
    error: (error, next, reject)=>{
      console.log('Instance error interceptor');
      next(error);
    },
  }
)));
await fetch('/users', {
  ...properties here...
});
```

This will log
```
Global error interceptor #1
Instance error interceptor
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
