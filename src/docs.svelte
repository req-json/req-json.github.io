<script>
import Showcase from './components/showcase.svelte';

const showcases = [
  [
    {
      title: 'Installation',
    },
    {
      title: 'NPM',
      code: 'npm install req-json --save',
      height: 28,
    },
    {
      description: 'ES modules for Webpack 2+ or Rollup',
      code: 'import ReqJSON from \'req-json\';',
      height: 28,
    },
    {
      description: 'CommonJS for Webpack 1 or Browserify',
      code: 'const ReqJSON = require(\'req-json\');',
      height: 28,
    },
    {
      title: 'Browser',
      description: 'Direct <code>&lt;script&gt;</code> include',
      // eslint-disable-next-line no-useless-concat
      code: '<' + 'script src="https://cdn.jsdelivr.net/npm/req-json@2">' + '<' + '/script>',
      height: 28,
    },
    {
      title: 'Wechat mini program (weapp)',
      description: 'It also supports wechat mini program (weapp).',
      code: 'const ReqJSON = require(\'req-json/dist/req-json.wx\');',
      height: 28,
    },
    {
      description: 'or just <a href=https://cdn.jsdelivr.net/npm/req-json@2/dist/req-json.wx.js target=_blank>download</a> and copy to your project.',
    },
  ],
  {
    title: 'Basic Usage',
    code: `const reqJSON = new ReqJSON();

reqJSON.get('/api/item/:id', 1)
  .then(res => console.log(res));`,
    mock: `XHRMock.get('/api/item/1', {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    hello: 'world',
    date: new Date()
  }),
});`,
  },
  {
    title: 'Shorthand methods',
    code: `const reqJSON = new ReqJSON();

const item = await reqJSON.get('/api/item/:id', { id: 1 });
console.log('client get', item);

const res = await reqJSON.post('/api/item/:id', item);
console.log('client post', res);`,
    mock: `XHRMock.get('/api/item/1', {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 1,
    date: new Date(),
  }),
});

XHRMock.post('/api/item/1', (req, res) => {
  console.info('server receive', JSON.parse(req.body()));
  return res
    .header('Content-Type', 'application/json')
    .body(JSON.stringify({
      updateAt: new Date(),
    }));
});`,
  },
  {
    title: 'RESTful API',
    code: `const reqJSON = new ReqJSON();
const resource = reqJSON.resource('/api/item/:id');

const item = await resource.get({ id: 1 });
console.log('client get', item);

const res = await resource.post(item);
console.log('client post', res);`,
    mock: `XHRMock.get('/api/item/1', {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 1,
    date: new Date(),
  }),
});

XHRMock.post('/api/item/1', (req, res) => {
  console.info('server receive', JSON.parse(req.body()));
  return res
    .header('Content-Type', 'application/json')
    .body(JSON.stringify({
      updateAt: new Date(),
    }));
});`,
  },
  {
    title: 'Methods',
    description: 'Supports GET POST PUT DELETE methods.',
    code: `const reqJSON = new ReqJSON();
const resource = reqJSON.resource('/api/item/:id');

const id = 1;
let item;
console.log({
  get: item = await resource.get(id),
  post: await resource.post(item),
  put: await resource.put(item),
  delete: await resource.delete(id),
});`,
    mock: `const mock = (method, body) => XHRMock[method]('/api/item/1', {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

[ 'get', 'delete' ].forEach(method => mock(method, {
  id: 1,
  date: new Date(),
}));

[ 'post', 'put' ].forEach(method => mock(method, {
  updateAt: new Date(),
}));`,
  },
  [
    {
      title: 'Options',
      description: 'Customized request headers for single request.',
      code: `const reqJSON = new ReqJSON();

console.warn(await reqJSON.get('/api/item/:id', 1));

console.log(await reqJSON.get('/api/item/:id', 1, {
  headers: {
    Authorization: 'abc'
  }
}));`,
      mock: `XHRMock.get('/api/item/1', (req, res) =>
  req.header('Authorization') == 'abc'
    ? res
      .header('Content-Type', 'application/json')
      .body(JSON.stringify({
        updateAt: new Date(),
      }))
    : res
      .status(401)
      .body('Unauthorized')
);`,
    },
    {
      description: 'Or for resource defination.',
      code: `const reqJSON = new ReqJSON();

const resource = reqJSON.resource('/api/item/:id', {
  headers: {
    Authorization: 'abc'
  }
})

console.log(await resource.get(1));`,
      mock: `XHRMock.get('/api/item/1', (req, res) =>
  req.header('Authorization') == 'abc'
    ? res
      .header('Content-Type', 'application/json')
      .body(JSON.stringify({
        updateAt: new Date(),
      }))
    : res
      .status(401)
      .body('Unauthorized')
);`,
    },
  ],
  {
    title: 'Middlewares',
    description: 'Supports koa-like middlewares',
    code: `const reqJSON = new ReqJSON();

reqJSON.use(async(context, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(\`\${context.method} \${context.url} \${ms}ms\`);
});

await reqJSON.get('/api/item/:id', 1);`,
    mock: `XHRMock.get('/api/item/1', (req, res) => new Promise(resolve =>
  setTimeout(() => resolve(res), 100)
));`,
  },
  {
    title: 'Context',
    description: 'Context contains these attributes:',
    code: `/**
 * The path to use for the request, with parameters defined.
 */
path: string

/**
 * The HTTP method to use for the request (e.g. "POST", "GET", "PUT", "DELETE").
 */
method: string

/**
 * The URL to which the request is sent.
 */
url: string

/**
 * The data to be sent.
 */
data: any

/**
 * The options to use for the request.
 */
options: object

/**
 * The HTTP status of the response. Only available when the request completes.
 */
status?: number

/**
 * The parsed response. Only available when the request completes.
 */
response?: string | object

/**
 * The request headers before the request is sent, the response headers when the request completes.
 */
headers: object

/**
 * Alias to \`headers\`
 */
header: object

/**
 * The original XMLHttpRequest object.
 */
xhr: XMLHttpRequest`,
  },
  [
    {
      title: 'Examples',
      description: 'Reject when status 4xx or 5xx',
      code: `const reqJSON = new ReqJSON();

reqJSON.use(async(context, next) => {
  await next();
  if (context.status >= 400) {
    throw new Error(context.response);
  }
});

await reqJSON.post('/api/item/:id', 1);`,
      mock: `XHRMock.post('/api/item/1', (req, res) =>
  req.header('Authorization') == 'abc'
    ? res
      .header('Content-Type', 'application/json')
      .body(JSON.stringify({
        updateAt: new Date(),
      }))
    : res
      .status(401)
      .body('Unauthorized')
);`,
    },
    {
      description: 'Set request headers and get response headers',
      code: `const reqJSON = new ReqJSON();

reqJSON.use(async(context, next) => {
  // set request headers
  context.headers = {
    'If-None-Match': 'abcdefg'
  };
  await next();
  // get response headers
  console.log(context.status, context.headers.etag);
});

await reqJSON.post('/api/item/:id', 1);`,
      mock: `XHRMock.post('/api/item/1', (req, res) =>
  req.header('If-None-Match') != 'abcdefg'
    ? res
      .status(200)
      .header('Content-Type', 'application/json')
      .header('Etag', 'abcdefg')
      .body(JSON.stringify({
        updateAt: new Date(),
      }))
    : res
      .status(304)
      .header('Etag', 'abcdefg')
);`,
    },
  ],
];
</script>

{#each showcases as sections}
  <Showcase {sections}></Showcase>
{/each}
